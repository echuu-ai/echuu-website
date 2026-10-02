"""重新生成官网用的蒲瓜纤云宋子集（public/fonts/pugua-qianyun-song-home.woff2）。

字集 = 现有子集的全部字形 ∪ 文案目录（src/website/i18n、src/website/data）里出现的汉字、假名、谚文与 ASCII。
代码注释不扫，避免把用不到的字打进去。
只增不减，加了新文案后重跑一次即可，不会把旧页面用到的字删掉。

用法：python3 scripts/subset-pugua.py "/path/to/蒲瓜纤云宋 商用免费.ttf"
完整字体（约 19 MB）不进仓库；跑完记得更新 docs/dependency-assets.json 的 sha256。
"""
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/fonts/pugua-qianyun-song-home.woff2'
full_path = sys.argv[1] if len(sys.argv) > 1 else str(pathlib.Path.home() / 'Library/Fonts/蒲瓜纤云宋 商用免费.ttf')

chars = set(chr(c) for c in TTFont(str(OUT)).getBestCmap()) if OUT.exists() else set()
pattern = re.compile(r'[ -~　-ヿ㐀-鿿가-힯＀-￯“”‘’—…·]')
comment = re.compile(r'/\*.*?\*/|//[^\n]*', re.S)
for folder in ('src/website/i18n', 'src/website/data'):
    for path in (ROOT / folder).rglob('*'):
        if path.suffix in {'.ts', '.tsx', '.json'}:
            text = comment.sub('', path.read_text(encoding='utf-8', errors='ignore'))
            chars.update(pattern.findall(text))

font = TTFont(full_path)
available = font.getBestCmap()
keep = sorted(c for c in chars if ord(c) in available)
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
options.name_IDs = ['*']
options.notdef_outline = True
subsetter = subset.Subsetter(options)
subsetter.populate(text=''.join(keep))
subsetter.subset(font)
font.flavor = 'woff2'
font.save(str(OUT))
print(f'{len(keep)} glyphs → {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)')
