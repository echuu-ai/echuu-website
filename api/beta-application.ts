import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';

const recipients = ['cory@echuu.ai', 'cory958014884@gmail.com'];
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;
// A bounded warm-instance throttle; provider idempotency also deduplicates retries.
// This is not a substitute for a deployment-wide WAF rate limit.
const attempts = new Map<string, { count: number; until: number }>();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ status: 'method_not_allowed' });
  const origin = req.headers.origin;
  const allowed = new Set(['https://www.echuu.ai', 'https://echuu.ai']);
  if (process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:5180'); allowed.add('http://127.0.0.1:5180');
  }
  if (typeof origin !== 'string' || !allowed.has(origin) || !/^application\/json(?:;|$)/i.test(String(req.headers['content-type']))) {
    return res.status(403).json({ status: 'invalid' });
  }
  let body: Record<string, unknown>;
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw) > 12000) return res.status(413).json({ status: 'invalid' });
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid');
  } catch { return res.status(400).json({ status: 'invalid' }); }
  if (body.website) return res.status(400).json({ status: 'invalid' });
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const character = body.character === undefined ? '' : typeof body.character === 'string' ? body.character.trim() : null;
  const portfolio = body.portfolio === undefined ? '' : typeof body.portfolio === 'string' ? body.portfolio.trim() : null;
  const locale = body.locale;
  const referral = body.referral_code;
  if (!emailPattern.test(email) || email.length > 254 || character === null || character.length > 1000
    || portfolio === null || portfolio.length > 500 || typeof locale !== 'string' || !['zh', 'en', 'ja', 'ko'].includes(locale)
    || (referral !== undefined && (typeof referral !== 'string' || !/^[A-Za-z0-9_-]{8,32}$/.test(referral)))) {
    return res.status(400).json({ status: 'invalid' });
  }
  if (portfolio) {
    try {
      const url = new URL(portfolio);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid');
    } catch { return res.status(400).json({ status: 'invalid' }); }
  }
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BETA_APPLICATION_FROM?.trim() || 'hello@echuu.ai';
  if (!key || !emailPattern.test(from)) return res.status(503).json({ status: 'unavailable' });
  const now = Date.now();
  for (const [ip, value] of attempts) if (value.until <= now) attempts.delete(ip);
  const ip = hash(String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim());
  const previous = attempts.get(ip);
  if ((previous?.count ?? 0) >= 5 || (!previous && attempts.size >= 10000)) {
    res.setHeader('Retry-After', '600');
    return res.status(429).json({ status: 'rate' });
  }
  attempts.set(ip, { count: (previous?.count ?? 0) + 1, until: previous?.until ?? now + 600000 });
  const payload = {
    from: `Echuu <${from}>`, to: recipients, reply_to: email,
    subject: '[Echuu] 新的 Beta 申请',
    text: `联系邮箱：${email}\n\n角色简介：\n${character || '未填写'}\n\n作品链接：${portfolio || '未填写'}\n\n语言：${locale}\n邀请来源：${referral || '官网直接访问'}\n\n此邮件仅收集申请，尚未创建账号、发放内测名额或星碎。`,
    tags: [{ name: 'category', value: 'beta_application' }],
  };
  try {
    const upstream = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `beta-application/${hash(JSON.stringify(payload))}` },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!upstream.ok) return res.status(upstream.status === 429 ? 429 : 502).json({ status: 'failed' });
    const result = await upstream.json();
    if (typeof result.id !== 'string' || !result.id) return res.status(502).json({ status: 'failed' });
    return res.status(200).json({ status: 'submitted' });
  } catch { return res.status(502).json({ status: 'failed' }); }
}
