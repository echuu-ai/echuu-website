---
name: de-ai-ui
description: 去掉网页 UI 的「AI 味」。用于官网 / 落地页 / 营销页的设计审查与实现：字体、层级、间距、配色、组件、动效、文案与选库。基于对 metalab.com、ravalabs.com 等站点的实测参数，不是主观印象。触发词：AI 味、太像模板、像 AI 生成、不够高级、参考 Awwwards / Metalab / Rava、做一版更克制的、字体层级、间距节奏。
---

# 去 AI 味（de-AI UI）

「AI 味」不是某个元素，而是**一组默认值同时出现**：默认字体、默认圆角、默认阴影、默认三栏、默认渐变、默认文案。好网站好在每个默认值都被一个**具体决定**替换掉了，而且决定的数量很少。本 skill 给出可检测的坏模式、实测的好参数、一套预算制的工作流，以及选库建议。

先审计再改；改完在浏览器里量，不凭感觉宣布「更高级了」。

## 1. 先认出「AI 味」——检测清单

出现 ≥ 4 条就是 AI 味。逐条对照当前页面，写进审计记录。

| # | 模式 | 为什么像 AI |
|---|---|---|
| 1 | Inter / Poppins / Montserrat 通吃全站，标题 700、正文 400 | 生成式 UI 的默认字体与字重组合 |
| 2 | 紫蓝渐变、渐变文字、发光按钮、渐变描边 | 2023 起 AI 产品页的通用皮肤 |
| 3 | 玻璃拟态卡片成片（半透明白 + blur + 内发光 + 1px 白描边） | 视觉噪音高、信息密度低，一眼模板 |
| 4 | 每个区块同一结构：眉题 → H2 → 一句说明 → 三张等高卡 | 「结构循环」是最强的 AI 信号 |
| 5 | 图标放在圆形 / 圆角方形色底里，一行三个 | 无品牌信息的占位图形 |
| 6 | 星星 ✦ / 火花 / 彩色光球 / 网格背景 / 噪点同时出现 | 装饰之间没有叙事关系 |
| 7 | 所有东西居中，所有卡片等高、等圆角、等阴影 | 没有视觉主次，没有节奏 |
| 8 | `rounded-2xl shadow-xl` 到处用；圆角 8 / 12 / 16 / 20 / 24 混用 | 圆角族过多说明没有 token |
| 9 | 文字 text-shadow、卡片外发光、hover 上浮 + 放大 | 装饰性动效，不传达状态 |
| 10 | 「Trusted by」logo 条、「✨ New」胶囊、Unlock / Empower / Seamless 这类文案 | 内容也是模板 |
| 11 | 一屏内 ≥ 3 种字体或 ≥ 5 种字号 | 层级靠堆字号，而不是靠留白与字重 |
| 12 | 间距全是 16 / 24 / 32，区块之间 64px | 没有大留白，页面像表单 |
| 13 | 整页两三种品牌色平均分布 | 没有一个「只出现一次」的重点色 |
| 14 | emoji 做列表符号、做标题前缀 | 聊天式输出的残留 |

## 2. 好网站为什么好——实测参数

2026-09-30 在 1440×900 用浏览器读取计算样式。数值可以直接当预算用。

### metalab.com（Next.js + Lenis）

| 项 | 实测 |
|---|---|
| 色 | 底 `#000`，字 `#fff`，唯一灰 `#bababa`（胶囊底用它的 20% 透明） |
| 展示字体 | PP Eiko（衬线），88px，**字重 240**，字距 -1.76px（-0.02em），行高 1.0 |
| 正文 / UI 字体 | Basis Grotesque Pro，12px / 350 用于导航与标签，16px / 400 用于说明 |
| 页头 | 高约 40px：左「Menu」胶囊，中品牌字，右当地时间 + 一个方块。不是通栏 bar |
| 首屏 | 一个 3D 雕塑占满；随后一句话「We make / interfaces」两行右移错位，右上角三行说明 |
| 内容即导航 | 客户名做成一列小胶囊贴左侧，是内容也是导航 |
| 按钮 | 16px，padding 0 16px，圆角 50px，底 `rgba(186,186,186,.2)`，无描边无阴影 |
| 装饰 | 无渐变、无玻璃、无星星；留白 > 60% |
| 动效 | Lenis 平滑滚动 + 位移；没有 hover 放大 |

### ravalabs.com（Framer + Lenis）

| 项 | 实测 |
|---|---|
| 色 | 底 `#fff`，字 `#000`，灰 `#f5f5f5 / #fafafa / #f2f2f2 / #111`，蓝 `#12a7ff` 只在 10% 透明的一处 |
| 字体 | Suisse Intl（Book 450 / Regular 400），PP Neue Montreal；首屏字标另用 ARK-ES 300 |
| 字号 | 正文 **12–14.4px**，说明 16–18px，H1 只有 23.4–27px；靠字距 -1.2px 与大留白取得气质 |
| 页头 | 一个居中小胶囊（「Work」+ 圆点） |
| 布局 | 真实摄影 + 设备实拍两列错落；数据用大数字 + `[方括号小标]`；内容宽 850–960px |
| 按钮 | 12px，padding 12px 16px，圆角 16px，底 `#f2f2f2`，字 `#0000ee`（默认链接蓝，故意的） |
| 圆角 | 12 / 16 / 20，胶囊 9998px |
| 区块间距 | 60 / 40 / 30 / 20px 级差，靠内容块自身留白 |

### 两站共同点（= 规则）

1. **一套色**：一黑一白一灰，重点色全站出现一次。
2. **两种字体**：一个展示字体 + 一个正文字体。展示字体用**轻字重、负字距、大字号**；正文偏小（12–16px）。
3. **页头是一个小对象**（胶囊 / 品牌字 / 时间），不是通栏。
4. **内容即装饰**：客户名、数字、真实截图、真实摄影。没有星星、火花、渐变球。
5. **每屏一句话**；一屏内不超过两种字号。
6. **明确栅格 + 有意错位**：标题两行右移、图片两列高低错开，是决定不是随机。
7. **平滑滚动 + 少量位移**，不做 hover 放大、发光、弹跳。

## 3. 各维度的可执行规则

### 字体

- 预算：展示 1 + 正文 1（CJK 各语言可各配 1 个正文，但同屏只出现 2 种）。
- 展示字体：衬线或有性格的无衬线，字重 200–400，字距 -0.02 ～ -0.05em，行高 0.95–1.05。
- 正文：中性无衬线，14–16px（中文 ≥ 15px），行高 1.5–1.6，字距 0 ～ -0.01em。
- 小字（导航、标签、页脚）：12–13px，字重 350–450，行高 1.2，字距 -0.01em。
- 不用：Inter 当全站默认、Poppins、标题 700 + 正文 400 的组合、文字描边（品牌规定的除外）、text-shadow。
- 优先商用字体：PP Eiko / PP Neue Montreal / PP Editorial New（Pangram Pangram）、Suisse Intl、Basis Grotesque、ABC Diatype、Söhne、GT America。免费可用：Instrument Serif、Fraunces、Newsreader（衬线）；Switzer、General Sans、Satoshi（Fontshare）、Geist、42dot Sans（无衬线）。CJK：Noto Serif SC 300、蒲瓜纤云宋、Shippori Mincho、Zen Kaku Gothic、Pretendard、Maru Buri。

### 层级

- 一屏最多 3 级：展示标题 / 说明 / 小字。相邻级字号比 ≥ 2.5×（例如 72 / 18 / 12），而不是 40 / 28 / 20 / 16。
- 层级靠**字号差 + 字重差 + 留白**，不靠颜色和阴影。
- 眉题（eyebrow）删掉或改成内容（编号、日期、客户名、章节号 `I / II`）。

### 间距

- 区块内 8pt 栅格；区块之间用**大留白**：120–200px（桌面），64–96px（移动）。
- 每屏留白 ≥ 50%。宽内容容器 1200–1440px，阅读容器 640–850px。
- 允许非对称：左对齐标题 + 右对齐说明；两列高低错开；标题第二行右移一个栅格。
- 间距只用 4 档：`s 8 / m 24 / l 64 / xl 160`（按项目缩放），不出现 20 / 28 / 36 之类的中间值。

### 配色

- 纸、墨、一个灰、一个重点色。重点色在首屏之外最多再出现一次。
- 深色页只用 `#000` / `#fff` 与一个灰；浅色页 `#fff` / `#000` 与 `#f5f5f5` 级的灰。
- 渐变只允许作为**内容**（真实 3D、天空、照片），不做 UI 底。

### 组件

- 按钮：一种圆角（胶囊或 12–16px），纯色底或 1px 线，无渐变、无阴影、无发光；hover 只变底色。
- 卡片：能不用就不用。要用就纯色面 + 1px 线，或无边框只靠留白分组。
- 圆角 token 三档：`12 / 20 / 999`。
- 图标：线性、1.5px、单色，不放色底圆里。
- 导航：小对象（胶囊、品牌字），或把内容列表当导航。

### 图像

- 真实截图、真实摄影、单色 3D。截图放进真实设备或直接裁切，不加「浮起来」的投影。
- 一屏最多一个装饰主角。

### 动效

- Lenis 平滑滚动 + 进入视口时 12–24px 位移与淡入（0.4–0.6s，`cubic-bezier(.22,.61,.36,1)`）。
- 首屏可以有一个大动效（3D、字标粒子），之后不再叠加。
- 不做：hover 放大 + 上浮 + 发光三连、无限旋转的光球、每张卡都 stagger。
- 必须支持 `prefers-reduced-motion`。

### 文案

- 短句、具体名词、真实数字（有来源才写）。
- 删除 Unlock / Empower / Seamless / Next-gen / Revolutionize；删除 emoji。
- 每屏一句主话；说明不超过 2 行。

## 4. 库与组件库——哪些用，怎么用才不像模板

| 需求 | 好站在用 | 建议 | 注意 |
|---|---|---|---|
| 框架 | Next.js（Metalab）、Framer（Rava）、Astro、Webflow | 项目现有栈 | 框架不决定味道 |
| 平滑滚动 | **Lenis**（两站都用） | `lenis` + 滚动位移 | 别和 CSS `scroll-behavior: smooth` 同时开 |
| 动效 | GSAP + ScrollTrigger、Motion | 见 `gsap-motion` / `motion-react-ui` skill | 只做位移与透明度 |
| 3D | R3F / three | 见 `r3f-web-motion` | 3D 是内容，不是背景装饰 |
| 无样式组件 | Radix / React Aria / Base UI | 任选，全部自己定样式 | 不要带默认主题 |
| shadcn/ui | 常被 AI 页面直接使用 | 可用作 primitives，但要**重写 tokens**：`--radius`、字体、去掉 `shadow-sm`、`bg-card`、`text-muted-foreground` 的默认灰 | 直接用默认样式 = AI 味 |
| Tailwind | 常见 | 用自定义 tokens；禁用默认 `shadow-*`、`bg-gradient-*`、默认调色板 | 出现 `from-purple-500 to-blue-500` 直接判负 |
| 字体托管 | 自托管 woff2 | 子集化，`font-display: swap` | Google Fonts 只用于确认可用的字体 |
| 图标 | Lucide / Phosphor（线性） | 1.5px，单色 | 不放在色底里 |

## 5. 工作流

1. **审计**：在 1440 与 390 宽度各截一张整页图；在浏览器控制台跑下面的脚本，把结果写进 `docs/reviews/<date>-ui-audit.md`，对照第 1 节逐条打勾。
2. **定预算**：写出本页的 tokens：2 种字体、≤ 5 个字号、3 档圆角、4 档间距、纸 / 墨 / 灰 / 1 重点色。写不出来说明还没做决定。
3. **逐屏重写**：每屏只留一句话 + 一个内容主角；删掉眉题、等高卡、色底图标；把渐变与玻璃改成纯色面或去掉。
4. **验证**：再截图对比；跑一次第 1 节清单，命中 ≤ 1 条才算过。移动端检查无横向溢出、正文 ≥ 15px（中文）。
5. **记录**：把 tokens 与决定写进项目文档，后续页面沿用，不再各自发明。

审计脚本（在目标页面控制台执行）：

```js
(() => {
  const cs = (e) => getComputedStyle(e);
  const fonts = new Set(), sizes = new Set(), radii = new Set(), bgs = new Set();
  document.querySelectorAll('h1,h2,h3,p,a,button,span,li').forEach((e) => {
    const c = cs(e); fonts.add(c.fontFamily.split(',')[0] + ' ' + c.fontWeight); sizes.add(c.fontSize);
  });
  document.querySelectorAll('a,button,div,section').forEach((e) => {
    const c = cs(e); if (c.borderRadius !== '0px') radii.add(c.borderRadius);
    if (c.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs.add(c.backgroundColor);
    if (c.backgroundImage.includes('gradient')) bgs.add('GRADIENT');
    if (c.backdropFilter && c.backdropFilter !== 'none') bgs.add('GLASS');
    if (c.textShadow && c.textShadow !== 'none') bgs.add('TEXT-SHADOW');
  });
  return { fonts: [...fonts], sizes: [...sizes].sort((a, b) => parseFloat(a) - parseFloat(b)), radii: [...radii], backgrounds: [...bgs] };
})();
```

判读：`fonts` > 4 项、`sizes` > 6 项、`radii` > 3 项、`backgrounds` 含 GRADIENT / GLASS / TEXT-SHADOW，都要在预算里解释，解释不了就删。

## 6. 在 Echuu 官网上的对应

设计稿（Figma「Echuu-Website」）本身有明确的品牌决定：蒲瓜纤云宋标题 + 42dot Sans 正文、蓝白天空、首屏黑场开场、少量金属装饰。去 AI 味不是推翻设计稿，而是把**设计稿没画的默认值**去掉：

- 玻璃卡只保留设计稿明确画了的（首屏 CTA 条、内测按钮）；简介、三步、功能、模式、博客改为纯色面 + 1px 线或无卡片排版。
- 装饰：开场黑场里的剑 / 翅膀 / 飞马 / 纸飞机保留；正文区每屏最多一个装饰主角，星星只留在功能卡。
- 字体：正文与 UI 统一 42dot Sans；模式卡去掉 Inter；Agu Display 只用于那个「3」。
- 字号：说明文字 15–16px、字距 -0.02em；标题保持大、行高 1.0。
- 圆角收敛为 12 / 20 / 999；页脚链接 12–13px、行高 2，列标题不加粗。
- 文字阴影已全部去除；蒲瓜纤云宋 1pt 白描边是设计稿要求，保留。

实测对照与逐项建议：`echuu-official-website/docs/reviews/2026-09-30-reference-crawl-metalab-ravalabs.md`。

## 7. 不要做的事

- 不把黑底、12px 正文、字标粒子化直接搬到有自己设计稿的项目上。
- 不用「更高级」「更精致」这类词汇报成果；报 tokens 数量、清单命中数、截图。
- 不因为好站用了 Framer / Webflow 就换框架。
- 不在设计稿明确画了某元素的地方以「去 AI 味」为由删掉它；先问。
