import { get, put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseSurveyResponse } from '../src/website/lib/surveys.js';

const MAX_BODY_BYTES = 2048;

function hasSameOrigin(req: VercelRequest): boolean {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const { origin, host } = req.headers;
  if (!origin) return true;
  if (typeof origin !== 'string') return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ status: 'method_not_allowed' });
  }
  if (!hasSameOrigin(req)) return res.status(403).json({ status: 'forbidden' });
  if (String(req.headers['content-type']).split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return res.status(415).json({ status: 'unsupported_media_type' });
  }
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
    return res.status(413).json({ status: 'payload_too_large' });
  }

  let body: unknown = req.body;
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) return res.status(413).json({ status: 'payload_too_large' });
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ status: 'invalid' });
    }
  }

  const response = parseSurveyResponse(body);
  if (!response) return res.status(422).json({ status: 'invalid' });

  const folder = process.env.VERCEL_ENV === 'production' ? 'responses' : 'preview-responses';
  const pathname = `${folder}/${response.surveyId}/${response.submissionId}.json`;
  try {
    await put(pathname, JSON.stringify({ ...response, receivedAt: new Date().toISOString() }), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/json',
      abortSignal: AbortSignal.timeout(8000),
    });
    return res.status(201).json({ status: 'saved' });
  } catch {
    // If the response was written before a retry or timeout, acknowledge the same submission.
    try {
      const previous = await get(pathname, {
        access: 'private', useCache: false, abortSignal: AbortSignal.timeout(4000),
      });
      if (previous?.statusCode === 200) {
        const saved = await new Response(previous.stream).json();
        const { receivedAt: _receivedAt, ...previousResponse } = saved;
        if (JSON.stringify(previousResponse) === JSON.stringify(response)) {
          return res.status(200).json({ status: 'saved' });
        }
        return res.status(409).json({ status: 'conflict' });
      }
    } catch {
      // A storage issue must remain retryable without ever logging answers.
    }
    return res.status(503).json({ status: 'unavailable' });
  }
}
