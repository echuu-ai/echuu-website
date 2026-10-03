/**
 * 内测邀请码格式（设计见 docs/website-beta-invite-design.md）：ECHU-XXXX-XXXX-C
 * - 主体 8 位 Crockford Base32（去掉 I L O U，大小写不敏感），约 40 bit 随机；
 * - 最后 1 位校验位（mod 37）：抄错一位、相邻两位换位都能在本地发现，不用打到服务端；
 * - 输入时容错：空格 / 连字符随便写，O→0、I/L→1（Crockford 的约定）。
 * 这里只做格式与校验位检查——码是否有效、是否已用、属于谁，只有服务端能判断。
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** 校验位多 5 个符号（Crockford 规范的 * ~ $ = U），总共 37 个 */
const CHECK_ALPHABET = `${ALPHABET}*~$=U`;
export const INVITE_PREFIX = 'ECHU';

/** 规范化：去掉前缀、空白与连字符，大写，按 Crockford 映射易混字符 */
export function normalizeInviteCode(input: string) {
  let s = input.toUpperCase().replace(/[\s\-_]/g, '');
  if (s.startsWith(INVITE_PREFIX)) s = s.slice(INVITE_PREFIX.length);
  const body = s.slice(0, -1).replace(/O/g, '0').replace(/[IL]/g, '1');
  return body + s.slice(-1);
}

function checkSymbol(body: string) {
  let value = 0;
  for (const ch of body) value = (value * 32 + ALPHABET.indexOf(ch)) % 37;
  return CHECK_ALPHABET[value];
}

/** 本地格式检查：8 位主体 + 正确的校验位 */
export function isWellFormedInviteCode(input: string) {
  const s = normalizeInviteCode(input);
  if (s.length !== 9) return false;
  const body = s.slice(0, 8);
  if ([...body].some((ch) => !ALPHABET.includes(ch))) return false;
  return checkSymbol(body) === s[8];
}

/** 展示 / 发放用的标准写法：ECHU-XXXX-XXXX-C */
export function formatInviteCode(input: string) {
  const s = normalizeInviteCode(input);
  return `${INVITE_PREFIX}-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

/** 生成一个新码（需要密码学随机数：浏览器 / Node 18+ 的 crypto.getRandomValues） */
export function generateInviteCode(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)) {
  const bytes = random(new Uint8Array(8));
  const body = [...bytes].map((b) => ALPHABET[b & 31]).join('');
  return formatInviteCode(body + checkSymbol(body));
}
