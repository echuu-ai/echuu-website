// POST /api/redeem  {code}  →  {status:"redeemed", redirect_url}
// 与前端 src/website/auth/api.ts 契约一致：和官网同源，无 CORS。
// 错误用 HTTP 状态：410=无效/已用/过期（前端显示 invalid）、429=限流、503=未配置、500=失败。
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildRedirectUrl, configured, findCode, isWellFormed, markRedeemed, normalizeCode } from './_lib';

// 尽力而为的限流：无状态函数下每实例内存，不保证全局，但能挡住单实例暴刷。
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 10;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ status: 'method_not_allowed' });
  if (!configured()) return res.status(503).json({ status: 'unavailable' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return res.status(429).json({ status: 'rate' });

  let code = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    code = String(body.code || '');
  } catch {
    return res.status(400).json({ status: 'invalid' });
  }

  if (!isWellFormed(code)) return res.status(410).json({ status: 'invalid' });

  try {
    const found = await findCode(normalizeCode(code));
    // 不存在 / 已用 / 撤销 / 过期：统一 410，不区分，防枚举
    if (!found) return res.status(410).json({ status: 'invalid' });
    if (found.status !== 'unused' && found.status !== 'sent') return res.status(410).json({ status: 'invalid' });
    if (found.expires) {
      const exp = Date.parse(found.expires);
      if (Number.isFinite(exp) && exp < Date.now()) return res.status(410).json({ status: 'invalid' });
    }
    await markRedeemed(found.row, ip);
    return res.status(200).json({ status: 'redeemed', redirect_url: buildRedirectUrl(found.email) });
  } catch {
    return res.status(500).json({ status: 'failed' });
  }
}
