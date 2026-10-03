#!/usr/bin/env node
/**
 * 批量生成内测码 → CSV（一人一码、用一次）。流程见 docs/website-beta-invite-design.md。
 *
 *   node scripts/invite-codes.mjs --count 50
 *   node scripts/invite-codes.mjs --count 20 --note "10 月第一批"
 *
 * 只在本地生成、不联网。生成的码就是登录凭据：CSV 不要发到群里、不要提交进仓库（invite-codes-*.csv 已被 gitignore）。
 * 发出去之前要先把码录进服务端（或由服务端生成），否则主程序认不出来。
 */
import { writeFileSync } from 'node:fs';
import { generateInviteCode } from '../src/website/auth/inviteCode.ts';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]);
  return pairs;
}, []));

const count = Number(args.count ?? 10);
const now = new Date().toISOString();
const codes = new Set();
while (codes.size < count) codes.add(generateInviteCode());

const header = ['code', 'email', 'status', 'created_at', 'sent_at', 'redeemed_at', 'note'];
const escape = (value) => (/[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value));
const rows = [...codes].map((code) => [code, '', 'unsent', now, '', '', args.note ?? '']);
const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n') + '\n';

const out = args.out ?? `invite-codes-${now.slice(0, 10)}.csv`;
writeFileSync(out, csv);
console.log(`${count} 个内测码 → ${out}`);
