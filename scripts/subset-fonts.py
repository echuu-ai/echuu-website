"""官网用到的中日韩字体取子集（照 subset-pugua.py 的办法）：只保留网站文案里出现过的字。

完整字体放在 fonts-src/（不对外提供），子集输出到 public/fonts/subset/*.woff2；
同时更新 src/styles/ui-typography.css 里对应 @font-face 的地址（带 ?v= 内容版本号，浏览器不会用旧缓存），
以及 docs/dependency-assets.json 的大小与 sha256。

字集 = 文案目录（src/website 下的 i18n、data、auth、components、home、pages）里出现的字符 ∪ ASCII ∪ 常用标点
       ∪ 日文字体额外保留全部假名（约 200 个，便宜，避免新文案缺假名）。代码注释不扫。
加了新文案后重跑：python3 scripts/subset-fonts.py
"""
import hashlib
import json
import pathlib
import re

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'fonts-src'
OUT = ROOT / 'public/fonts/subset'
CSS = ROOT / 'src/styles/ui-typography.css'
MANIFEST = ROOT / 'docs/dependency-assets.json'

KANA = [chr(c) for c in list(range(0x3040, 0x30A0)) + list(range(0x30A0, 0x3100)) + list(range(0x31F0, 0x3200))]
# (完整字体, 子集输出名, CSS 里原来的地址, 是否加全套假名)
FONTS = [
    ('inter-regular.ttf', 'inter-regular', '/fonts/inter-regular.ttf', False),
    ('inter-bold.ttf', 'inter-bold', '/fonts/inter-bold.ttf', False),
    ('shippori-mincho-bold.woff2', 'shippori-mincho-bold', '/fonts/shippori-mincho-bold.woff2', True),
    ('notosansjp-bold.ttf', 'notosansjp-bold', '/fonts/notosansjp-bold.ttf', True),
    ('maru-buri-light.woff2', 'maru-buri-light', '/fonts/maru-buri-light.woff2', False),
    ('maru-buri-semibold.woff2', 'maru-buri-semibold', '/fonts/maru-buri-semibold.woff2', False),
    ('zen-maru-gothic/ZenMaruGothic-Light.ttf', 'zen-maru-gothic-light', '/fonts/zen-maru-gothic/ZenMaruGothic-Light.ttf', True),
    ('zen-maru-gothic/ZenMaruGothic-Regular.ttf', 'zen-maru-gothic-regular', '/fonts/zen-maru-gothic/ZenMaruGothic-Regular.ttf', True),
    ('zen-maru-gothic/ZenMaruGothic-Medium.ttf', 'zen-maru-gothic-medium', '/fonts/zen-maru-gothic/ZenMaruGothic-Medium.ttf', True),
    ('zen-maru-gothic/ZenMaruGothic-Bold.ttf', 'zen-maru-gothic-bold', '/fonts/zen-maru-gothic/ZenMaruGothic-Bold.ttf', True),
]

pattern = re.compile(r'[ -~　-ヿ㐀-鿿가-힯＀-￯“”‘’—–…·«»]')
comment = re.compile(r'/\*.*?\*/|//[^\n]*', re.S)
chars = set(chr(c) for c in range(0x20, 0x7F))
for folder in ('i18n', 'data', 'auth', 'components', 'home', 'pages'):
    for path in (ROOT / 'src/website' / folder).rglob('*'):
        if path.suffix in {'.ts', '.tsx', '.json'} and '.test.' not in path.name:
            chars.update(pattern.findall(comment.sub('', path.read_text(encoding='utf-8', errors='ignore'))))

OUT.mkdir(parents=True, exist_ok=True)
css = CSS.read_text(encoding='utf-8')
entries = json.loads(MANIFEST.read_text(encoding='utf-8'))
for source, name, old_url, kana in FONTS:
    font = TTFont(str(SRC / source))
    available = font.getBestCmap()
    keep = sorted(c for c in (chars | set(KANA) if kana else chars) if ord(c) in available)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=''.join(keep))
    subsetter.subset(font)
    font.flavor = 'woff2'
    out = OUT / f'{name}.woff2'
    font.save(str(out))
    data = out.read_bytes()
    version = hashlib.sha256(data).hexdigest()[:10]
    new_url = f'/fonts/subset/{name}.woff2?v={version}'
    # 原地址（首次）或旧版本号（重跑）→ 新地址；format 一并改成 woff2
    css = re.sub(rf"url\('({re.escape(old_url)}|/fonts/subset/{re.escape(name)}\.woff2(\?v=[0-9a-f]+)?)'\) format\('[a-z0-9]+'\)",
                 f"url('{new_url}') format('woff2')", css)
    rel = f'fonts/subset/{name}.woff2'
    entries = [e for e in entries if e['path'] not in (rel, old_url.lstrip('/'))]
    entries.append({'path': rel, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                    'source': f'Subset of fonts-src/{source} to the website copy ({len(keep)} glyphs) by scripts/subset-fonts.py'})
    print(f'{name}: {len(keep)} glyphs, {(SRC / source).stat().st_size // 1024} KB → {len(data) // 1024} KB')

CSS.write_text(css, encoding='utf-8')
MANIFEST.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
