#!/usr/bin/env node
/**
 * 批量生成内测邀请码 → CSV（直接导入 Google Sheet「Codes」页）。设计见 docs/website-beta-invite-design.md。
 *
 *   node scripts/invite-codes.mjs --count 50 --kind single --channel xiaohongshu --batch 2026-10-xhs-01
 *   node scripts/invite-codes.mjs --count 1 --kind campaign --max-uses 200 --channel kol --owner "@某某" --expires 2026-11-30
 *   node scripts/invite-codes.mjs --count 3 --kind referral --owner user_123            # 给内测用户的 3 个推荐码
 *
 * 只在本地生成、不联网。生成的码就是登录凭据：CSV 不要发到群里、不要提交进仓库（invite-codes-*.csv 已被 gitignore）。
 * 正式上线后由服务端生成并入库，这个脚本只用于手动发放的早期批次；导入表格后要同步到服务端（见设计文档第 5 节）。
 */
import { writeFileSync } from 'node:fs';
import { generateInviteCode } from '../src/website/auth/inviteCode.ts';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]);
  return pairs;
}, []));

const count = Number(args.count ?? 10);
const kind = args.kind ?? 'single';
if (!['single', 'campaign', 'referral'].includes(kind)) throw new Error('--kind 只能是 single / campaign / referral');
const maxUses = kind === 'campaign' ? Number(args['max-uses'] ?? 100) : 1;
const now = new Date().toISOString();
const batch = args.batch ?? `${now.slice(0, 10)}-${kind}`;

const codes = new Set();
while (codes.size < count) codes.add(generateInviteCode());

const header = ['code', 'kind', 'channel', 'batch', 'owner', 'max_uses', 'uses', 'expires_at', 'status', 'created_at', 'issued_to', 'issued_at', 'note'];
const escape = (value) => (/[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value));
const rows = [...codes].map((code) => [code, kind, args.channel ?? '', batch, args.owner ?? '', maxUses, 0, args.expires ?? '', 'unissued', now, '', '', args.note ?? '']);
const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n') + '\n';

const out = args.out ?? `invite-codes-${batch}.csv`;
writeFileSync(out, csv);
console.log(`${count} 个 ${kind} 码 → ${out}（batch ${batch}）`);
