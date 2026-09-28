import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const assets = JSON.parse(readFileSync(new URL('docs/dependency-assets.json', root)));
let failed = 0;
for (const asset of assets) {
  try {
    const bytes = readFileSync(new URL(`public/${asset.path}`, root));
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw Error('checksum mismatch');
  } catch (error) { console.error(asset.path, error.message); failed++; }
}
console.log(`${assets.length} assets checked; ${failed} missing or changed.`);
process.exitCode = failed ? 1 : 0;
