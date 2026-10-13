# 官网 UI 规范（首页 `.hv`）

令牌定义在 `src/website/styles/home.css` 的 `.echuu-website .hv { … }` 开头。**新样式只用令牌，不写裸 px 字号**；需要新层级先在这里补一行再用。

## 1. 字号层级

| 令牌 | 值 | 用在 |
|---|---|---|
| `--t-display` | clamp(32px, 4.4vw, 64px) | 区块大标题 `.hv-h2`、Beta 标题、菜单大字 |
| `--t-h1` | clamp(24px, 3vw, 44px) | Intro kicker、功能卡标题、创作者宣言 |
| `--t-h2` | clamp(19px, 1.8vw, 26px) | 卡片标题（博客 / 步骤 / 模式卡）、页脚分栏标题 |
| `--t-lede` | clamp(16px, 1.25vw, 19px) | 区块导语、Slogan |
| `--t-body` | clamp(15px, 1.1vw, 16px) | 普通正文（含步骤、内测、简介正文）、页脚链接 |
| `--t-small` | 14px | 卡片摘要、页脚底栏 |
| `--t-meta` | 13px | 胶囊标签、「阅读全文」、跳过开场 |
| `--t-caption` | 12px | 顶栏、引用、语言、重播 |
| `--t-label` | 12px | 英文小标签（全大写，字距放宽） |

行高与字距（2026-10-13，详见 `docs/reviews/2026-10-13-typography-audit.md`）：
- 带 1pt 白描边的标题字距不低于 -0.03em（描边让字向外多出约 0.7px，收太紧白边会粘）；中文展示标题行高 ≥ 1.1。
- 导语行高 1.5、字距 -0.01em；正文行高 1.75、字距 0；按钮、导航、小字字距 0。
- 负字距只给巨型字（页脚 183px 那行 -0.1em）。
| `--t-numeral` | clamp(22px, 2.2vw, 32px) | 序号 01 / 02 / 03 |
| `--t-button` | 15px | 常规按钮（按钮实际走 `--btn-fs`，见 §3） |
| `--t-button-lg` | 16px | 已不再用于按钮，保留给旧引用 |

规则：
- 一个区块最多三级：标题（display）→ 导语（lede）→ 正文 / 卡片。不要在同一区块再自造中间字号。
- 字号随视口用 clamp 一条写完；**不要在媒体查询里再覆盖字号**，只调排版（对齐、栅格、间距）。
- 标题和导语 `text-wrap: balance`，正文 `text-wrap: pretty`：最后一行不许只剩一两个字。导语要换成两行写死时，用两个 `.hv-lede__line` span，别用 `<br>`（`<br>` 两侧不会均衡折行）。
- 品牌 Slogan 用蒲瓜千韵宋，**同色描边**（不用白描边）；改了文字要重新跑 `scripts/subset-pugua.py` 并更新 `docs/dependency-assets.json` 的 sha256。

## 2. 间距

| 令牌 | 值 |
|---|---|
| `--sp-1 … --sp-8` | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px |
| `--section-y` | clamp(72px, 10vw, 144px)：区块上下内边距（桌面端「三步」「直播间体验」「直播模式」也统一用它） |
| `--card-pad` | clamp(20px, 2.2vw, 32px)：卡片内边距 |

卡片内部元素间距用 `--sp-3`（12px）；组与组之间用 `--sp-5`/`--sp-6`。

## 3. 按钮

2026-10-13 起全站一套（实现在 `home.css` 末尾「按钮规范」块，token 定义在 `.echuu-website` 上，底部 CTA 条在 `.hv` 外也能拿到）。

| 级别 | 高度 | 左右内边距 | 字号 | 用在 |
|---|---|---|---|---|
| sm | `--btn-h-sm` 36px | `--btn-pad-sm` 16px | `--btn-fs-sm` 13px | 标签胶囊（如何获取 VRM 模型） |
| md | `--btn-h-md` 44px | `--btn-pad-md` 20px | `--btn-fs` 15px | 页头登录、底栏参与内测、全部文章、子页面小按钮 |
| lg | `--btn-h-lg` 52px | `--btn-pad-lg` 24px | `--btn-fs` 15px | 区块主行动、玻璃按钮、子页面主次按钮、弹窗主按钮 |

统一项（不许单独改）：

- **圆角** `--btn-radius` 12px。只有标签胶囊用 999px。表单里的分类单选、输入框跟按钮同一个 12px。
- **字重** 400；**字距** 0。
- **颜色按底色反转**，两种底用同一对颜色互换（深字色 `--btn-ink` = `#0a2435`）：

| 底色 | 主按钮 | 次按钮 |
|---|---|---|
| 天空 / 深色（首页、底栏、弹窗） | 白底深字 | 玻璃：白 14% + 1px 白线 55%，顶部一道内高光，无外投影 |
| 浅色纸面（子页面 `.subpage-sheet`） | 深底白字（`.btn--primary`） | 透明 + 1px 深色线 24%（`.btn--ghost` / `.btn--quiet`） |

- 页头「登录」保留 Figma 青色，作首屏唯一的重点色，只统一形状。
- 状态：hover 只提亮底色，不上浮、不加阴影；focus-visible 必须有可见描边；disabled 透明度 .5 且不响应 hover。
- 一组纵向按钮等宽（取最长的那个，`width: max-content` + `align-items: stretch`）。
- 动效遵守 `prefers-reduced-motion`。

### 硬性规定：按钮文字永远一行

**按钮文字禁止折成两行。** `home.css` 末尾的规则对所有按钮统一 `white-space: nowrap`。文字放不下时：
1. 先改文案（更短的说法），
2. 再放宽按钮组宽度，
3. 绝不允许靠换行解决。

改完用 scratchpad 里的检查脚本（量按钮内文字节点的行数，桌面 1440 与手机 390 两档）确认 `wrapped buttons: none`。四种语言（zh / en / ja / ko）都要过。

## 4. 图标

统一用 `lucide-react`，`strokeWidth` 1.6，颜色跟随 `currentColor`。模式卡头像：杂谈回 `MessagesSquare`、观影回 `Clapperboard`、歌回 `MicVocal`。
