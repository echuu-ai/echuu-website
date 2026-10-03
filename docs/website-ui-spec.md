# 官网 UI 规范（首页 `.hv`）

令牌定义在 `src/website/styles/home.css` 的 `.echuu-website .hv { … }` 开头。**新样式只用令牌，不写裸 px 字号**；需要新层级先在这里补一行再用。

## 1. 字号层级

| 令牌 | 值 | 用在 |
|---|---|---|
| `--t-display` | clamp(32px, 4.4vw, 64px) | 区块大标题 `.hv-h2`、Beta 标题、菜单大字 |
| `--t-h1` | clamp(24px, 3vw, 44px) | Intro kicker、功能卡标题、创作者宣言 |
| `--t-h2` | clamp(19px, 1.8vw, 26px) | 卡片标题（博客 / 步骤 / 模式卡）、页脚分栏标题 |
| `--t-lede` | clamp(16px, 1.65vw, 24px) | 区块导语、步骤正文、Slogan |
| `--t-body` | clamp(15px, 1.3vw, 19px) | 普通正文、页脚链接 |
| `--t-small` | 14px | 卡片摘要、页脚底栏 |
| `--t-meta` | 13px | 胶囊标签、「阅读全文」、跳过开场 |
| `--t-caption` | 12px | 顶栏、引用、语言、重播 |
| `--t-label` | 11px | 英文小标签（全大写，字距放宽） |
| `--t-numeral` | clamp(22px, 2.2vw, 32px) | 序号 01 / 02 / 03 |
| `--t-button` | clamp(15px, 1.15vw, 17px) | 常规按钮 |
| `--t-button-lg` | clamp(17px, 1.45vw, 21px) | 区块主行动按钮组（创作者区） |

规则：
- 一个区块最多三级：标题（display）→ 导语（lede）→ 正文 / 卡片。不要在同一区块再自造中间字号。
- 字号随视口用 clamp 一条写完；**不要在媒体查询里再覆盖字号**，只调排版（对齐、栅格、间距）。
- 标题和导语 `text-wrap: balance`，正文 `text-wrap: pretty`：最后一行不许只剩一两个字。导语要换成两行写死时，用两个 `.hv-lede__line` span，别用 `<br>`（`<br>` 两侧不会均衡折行）。
- 品牌 Slogan 用蒲瓜千韵宋，**同色描边**（不用白描边）；改了文字要重新跑 `scripts/subset-pugua.py` 并更新 `docs/dependency-assets.json` 的 sha256。

## 2. 间距

| 令牌 | 值 |
|---|---|
| `--sp-1 … --sp-8` | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px |
| `--section-y` | clamp(64px, 8vw, 120px)：区块上下内边距 |
| `--card-pad` | clamp(20px, 2.2vw, 32px)：卡片内边距 |

卡片内部元素间距用 `--sp-3`（12px）；组与组之间用 `--sp-5`/`--sp-6`。

## 3. 按钮

| 级别 | 高度 | 字号 | 用在 |
|---|---|---|---|
| sm | `--btn-h-sm` 36px | `--t-meta` | 胶囊、底栏内小按钮 |
| md（默认） | `--btn-h-md` 44px | `--t-button` | 「全部文章」「申请内测」等 |
| lg | `--btn-h-lg` 52px | `--t-button` / `--t-button-lg` | 液态玻璃主按钮、区块主行动 |

- 左右内边距 `--btn-pad-x`（24px）；一组纵向按钮等宽（取最长的那个，`width: max-content` + `align-items: stretch`）。
- 状态：hover 只提亮 / 轻微上浮，focus-visible 必须有可见描边，disabled 降透明度且不响应 hover。
- 动效遵守 `prefers-reduced-motion`。

### 硬性规定：按钮文字永远一行

**按钮文字禁止折成两行。** `home.css` 末尾的规则对所有按钮统一 `white-space: nowrap`。文字放不下时：
1. 先改文案（更短的说法），
2. 再放宽按钮组宽度，
3. 绝不允许靠换行解决。

改完用 scratchpad 里的检查脚本（量按钮内文字节点的行数，桌面 1440 与手机 390 两档）确认 `wrapped buttons: none`。四种语言（zh / en / ja / ko）都要过。

## 4. 图标

统一用 `lucide-react`，`strokeWidth` 1.6，颜色跟随 `currentColor`。模式卡头像：杂谈回 `MessagesSquare`、观影回 `Clapperboard`、歌回 `MicVocal`。
