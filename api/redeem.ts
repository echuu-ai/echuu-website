// POST /api/redeem  {code}  →  {status:"redeemed", redirect_url}
// 与前端 src/website/auth/api.ts 契约一致：和官网同源，无 CORS。
// 单文件函数：Vercel 单独打包每个 /api 文件，拆 helper 会 "Cannot find module"，故全部内联。
// 错误用 HTTP 状态：410=无效/已用/过期（前端显示 invalid）、429=限流、503=未配置、500=失败。
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { JWT } from 'google-auth-library';
import crypto from 'node:crypto';

const SHEET_ID = process.env.BETA_SHEET_ID || '';
const SA_EMAIL = process.env.GOOGLE_SA_EMAIL || '';
const SA_KEY = (process.env.GOOGLE_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const PRODUCT_ORIGIN = (process.env.PRODUCT_ORIGIN || 'https://echuu.live').replace(/\/+$/, '');
const TICKET_SECRET = process.env.BETA_TICKET_SECRET || '';
const TAB = 'Codes';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';

// ---- 内测码规范化 + 校验位（与 src/website/auth/inviteCode.ts 一致）----
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CHECK_ALPHABET = `${ALPHABET}*~$=U`;
const PREFIX = 'ECHU';
function normalizeCode(input: string): string {
  let s = String(input || '').toUpperCase().replace(/[\s\-_]/g, '');
  if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length);
  return s.slice(0, -1).replace(/O/g, '0').replace(/[IL]/g, '1') + s.slice(-1);
}
function checkSymbol(body: string): string {
  let v = 0;
  for (const ch of body) v = (v * 32 + ALPHABET.indexOf(ch)) % 37;
  return CHECK_ALPHABET[v];
}
function isWellFormed(input: string): boolean {
  const s = normalizeCode(input);
  if (s.length !== 9) return false;
  const body = s.slice(0, 8);
  if ([...body].some((ch) => !ALPHABET.includes(ch))) return false;
  return checkSymbol(body) === s[8];
}

function configured(): boolean {
  return Boolean(SHEET_ID && SA_EMAIL && SA_KEY);
}

let cachedAuth: JWT | null = null;
function client(): JWT {
  if (!cachedAuth) cachedAuth = new JWT({ email: SA_EMAIL, key: SA_KEY, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return cachedAuth;
}

type CodeRow = { row: number; email: string; status: string; expires: string };
async function findCode(normalized: string): Promise<CodeRow | null> {
  const res = await client().request<{ values?: string[][] }>({ url: `${API}/${SHEET_ID}/values/${TAB}!A2:I?majorDimension=ROWS` });
  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r[0] && normalizeCode(r[0]) === normalized) {
      return { row: i + 2, email: r[1] || '', status: (r[2] || '').trim().toLowerCase(), expires: r[5] || '' };
    }
  }
  return null;
}

async function markRedeemed(row: number, ip: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await client().request({
    method: 'POST',
    url: `${API}/${SHEET_ID}/values:batchUpdate`,
    data: {
      valueInputOption: 'RAW',
      data: [
        { range: `${TAB}!C${row}`, values: [['redeemed']] },
        { range: `${TAB}!G${row}:H${row}`, values: [[nowIso, ip]] },
      ],
    },
  });
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function buildRedirectUrl(email: string): string {
  if (!TICKET_SECRET) return `${PRODUCT_ORIGIN}/?beta=1`;
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: email, iat: now, exp: now + 120, jti: crypto.randomUUID() }));
  const sig = b64url(crypto.createHmac('sha256', TICKET_SECRET).update(`${header}.${payload}`).digest());
  return `${PRODUCT_ORIGIN}/auth/invite-callback?ticket=${header}.${payload}.${sig}`;
}

const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 10;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const found = await findCode(normalizeCode(code));
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
