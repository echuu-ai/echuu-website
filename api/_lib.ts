// 内测码兑换的服务端工具：Google Sheets 读写 + 码校验 + 产品票据。
// 仅在 Vercel Serverless 运行，密钥走服务端环境变量（不带 VITE_）。
import { JWT } from 'google-auth-library';
import crypto from 'node:crypto';

const SHEET_ID = process.env.BETA_SHEET_ID || '';
const SA_EMAIL = process.env.GOOGLE_SA_EMAIL || '';
const SA_KEY = (process.env.GOOGLE_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n');
export const PRODUCT_ORIGIN = (process.env.PRODUCT_ORIGIN || 'https://echuu.live').replace(/\/+$/, '');
const TICKET_SECRET = process.env.BETA_TICKET_SECRET || '';
const TAB = 'Codes';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';

// ---- 内测码规范化 + 校验位（与 src/website/auth/inviteCode.ts 一致，服务端自带一份避免跨界 import）----
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CHECK_ALPHABET = `${ALPHABET}*~$=U`;
const PREFIX = 'ECHU';

export function normalizeCode(input: string): string {
  let s = String(input || '').toUpperCase().replace(/[\s\-_]/g, '');
  if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length);
  const body = s.slice(0, -1).replace(/O/g, '0').replace(/[IL]/g, '1');
  return body + s.slice(-1);
}
function checkSymbol(body: string): string {
  let v = 0;
  for (const ch of body) v = (v * 32 + ALPHABET.indexOf(ch)) % 37;
  return CHECK_ALPHABET[v];
}
export function isWellFormed(input: string): boolean {
  const s = normalizeCode(input);
  if (s.length !== 9) return false;
  const body = s.slice(0, 8);
  if ([...body].some((ch) => !ALPHABET.includes(ch))) return false;
  return checkSymbol(body) === s[8];
}

export function configured(): boolean {
  return Boolean(SHEET_ID && SA_EMAIL && SA_KEY);
}

let cachedAuth: JWT | null = null;
async function token(): Promise<string> {
  if (!cachedAuth) {
    cachedAuth = new JWT({ email: SA_EMAIL, key: SA_KEY, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  }
  const t = await cachedAuth.getAccessToken();
  if (!t.token) throw new Error('no access token');
  return t.token;
}

export type CodeRow = { row: number; email: string; status: string; expires: string };

/** 在 Codes!A2:I 里按规范化后的码找行；列序见 docs/beta-redeem-setup.md。 */
export async function findCode(normalized: string): Promise<CodeRow | null> {
  const t = await token();
  const res = await fetch(`${API}/${SHEET_ID}/values/${TAB}!A2:I?majorDimension=ROWS`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok) throw new Error(`sheets read ${res.status}`);
  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values || [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r[0] && normalizeCode(r[0]) === normalized) {
      return { row: i + 2, email: r[1] || '', status: (r[2] || '').trim().toLowerCase(), expires: r[5] || '' };
    }
  }
  return null;
}

/** 标记该行为已兑换，写入时间与来源 IP（C 列 status、G/H 列）。 */
export async function markRedeemed(row: number, ip: string): Promise<void> {
  const t = await token();
  const nowIso = new Date().toISOString();
  const res = await fetch(`${API}/${SHEET_ID}/values:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        { range: `${TAB}!C${row}`, values: [['redeemed']] },
        { range: `${TAB}!G${row}:H${row}`, values: [[nowIso, ip]] },
      ],
    }),
  });
  if (!res.ok) throw new Error(`sheets update ${res.status}`);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 进主程序的目标地址。前端 validateProductRedirect 要求 origin === PRODUCT_ORIGIN。
 * 配了 BETA_TICKET_SECRET 就带一次性票据（≤120s），产品端以后校验票据建会话；
 * 没配就先跳产品首页（扣扣接产品端前的过渡）。
 */
export function buildRedirectUrl(email: string): string {
  if (!TICKET_SECRET) return `${PRODUCT_ORIGIN}/?beta=1`;
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: email, iat: now, exp: now + 120, jti: crypto.randomUUID() }));
  const sig = b64url(crypto.createHmac('sha256', TICKET_SECRET).update(`${header}.${payload}`).digest());
  return `${PRODUCT_ORIGIN}/auth/invite-callback?ticket=${header}.${payload}.${sig}`;
}
