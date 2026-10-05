"""打包体积分析：每个 JS 块里各个依赖 / 源文件各占多少（用 sourcemap，统计未压缩源码大小，足以排出谁大）。

用法：
  npx vite build --sourcemap --outDir /tmp/echuu-bundle --emptyOutDir
  python3 scripts/analyze-bundle.py /tmp/echuu-bundle            # 列出所有块与主要成分
  python3 scripts/analyze-bundle.py /tmp/echuu-bundle --json      # 机器可读（对比改动前后）
  python3 scripts/analyze-bundle.py /tmp/echuu-bundle --who three # 主入口块里是谁 import 了 three

主入口块 = index-*.js（首页一打开就下载并执行）。拆分的目标是让它尽量小。
"""
import collections
import glob
import gzip
import json
import os
import re
import sys

root = sys.argv[1] if len(sys.argv) > 1 else '/tmp/echuu-bundle'
as_json = '--json' in sys.argv
who = sys.argv[sys.argv.index('--who') + 1] if '--who' in sys.argv else None
chunks = sorted(glob.glob(os.path.join(root, 'app-build', '*.js')), key=os.path.getsize, reverse=True)
report = {}
for js in chunks:
    name = re.sub(r'-[A-Za-z0-9_-]{8}\.js$', '', os.path.basename(js))
    data = open(js, 'rb').read()
    entry = {'file': os.path.basename(js), 'minKB': len(data) // 1024, 'gzipKB': len(gzip.compress(data, 9)) // 1024, 'parts': {}}
    if os.path.exists(js + '.map'):
        m = json.load(open(js + '.map'))
        sizes = collections.Counter()
        for src, content in zip(m['sources'], m.get('sourcesContent') or []):
            pkg = re.search(r'node_modules/((?:@[^/]+/)?[^/]+)', src)
            key = f'pkg:{pkg.group(1)}' if pkg else 'src:' + src.split('echuu-official-website/')[-1]
            sizes[key] += len(content or '')
            if who and name == 'index' and 'node_modules/' + who + '/' not in src:
                for line in (content or '').splitlines():
                    if re.search(rf"""(import|from|require\().*['"]{re.escape(who)}(/[^'"]*)?['"]""", line):
                        print(f'[who {who}] {src.split("node_modules/")[-1].split("echuu-official-website/")[-1]} | {line.strip()[:100]}')
                        break
        entry['parts'] = {k: v // 1024 for k, v in sizes.most_common(25)}
    report[name] = entry
if as_json:
    print(json.dumps(report, indent=1, ensure_ascii=False))
elif not who:
    for name, e in report.items():
        print(f"{e['minKB']:6d} KB min  {e['gzipKB']:5d} KB gz  {e['file']}")
        if name in ('index', 'OpeningStage3D') or e['minKB'] > 150:
            for k, v in list(e['parts'].items())[:12]:
                print(f'          {v:6d} KB  {k}')
