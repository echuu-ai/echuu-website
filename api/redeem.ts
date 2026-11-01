import type { VercelRequest, VercelResponse } from '@vercel/node';

/** 官网与平台共用账号、名额和账本；不再把表格标记当作产品登录。 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ status: 'method_not_allowed' });
  const base = process.env.BETA_PLATFORM_API_BASE?.replace(/\/$/, '');
  const key = process.env.BETA_WEBSITE_API_KEY;
  // 必须显式指向已迁移的平台，避免把官网密码发送到猜测的服务。
  if (!base || !key) return res.status(503).json({ status: 'unavailable' });
  try {
    const origin = new URL(base);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash) {
      return res.status(503).json({ status: 'unavailable' });
    }
    const action = req.query.action === 'register' ? 'register' : 'redeem';
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object') return res.status(400).json({ status: 'invalid' });
    const payload = action === 'register'
      ? { email: body.email, password: body.password, locale: body.locale, referral_code: body.referral_code }
      : { code: body.code };
    const upstream = await fetch(`${base}/beta/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-beta-website-key': key,
        'x-beta-client-ip': String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(12000), redirect: 'error', cache: 'no-store',
    });
    if (!upstream.ok) {
      const status = [400, 401, 403, 409, 410, 422, 429, 503].includes(upstream.status) ? upstream.status : 502;
      return res.status(status).json({ status: status === 409 ? 'full' : 'failed' });
    }
    return res.status(200).json(await upstream.json());
  } catch {
    return res.status(502).json({ status: 'failed' });
  }
}
