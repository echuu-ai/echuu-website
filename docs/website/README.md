# Echuu 官网（并入产品仓库后的结构）

官网挂在产品前端 `echuu-ux-r3f-vite` 内，路径 `/website/{locale}/…`，与 `/` 的直播产品入口互不影响。
最初做在独立仓库 `CoryLee1/echuu-website`，2026-09-17 按 Cory 要求并入本仓库以复用现成内容。

## 跑起来

```bash
npm run dev          # http://localhost:5174/website/zh
npm run build
npm run preview      # http://localhost:4173/website/zh
```

四语路径：`/website/zh`、`/website/ja`、`/website/en`、`/website/ko`。
访问 `/website` 会按 app 既有的语言检测补齐语言并改写地址，不做 IP 跳转。

> 语言代码跟 app 对齐用 `zh`（任务书里写的是 `zh-CN`）。
> `html.lang` 仍由 app 的 i18n store 输出 `zh-CN`，SEO 的 hreflang 也用 `zh-CN`。

## 首页 v2（2026-09-28）

首页按 Figma「ECHUU-V1-UX / Echuu-Website」（节点 2038:1044）重做，代码在 `src/website/home/`：

| 文件 | 内容 |
|---|---|
| `HomeV2.tsx` | 首页装配；自带页头页脚，不再用旧版 `SiteHeader` / `SiteFooter`（子页面仍用） |
| `OpeningHero.tsx` | 开场覆盖层（手机窗 / 标题 / 装饰 / 跳过）+ 首屏 UI（页头、竖排菜单、Logo、CTA 条、汉堡菜单） |
| `three/OpeningStage3D.tsx` | corynorootbone 3D 开场：HDR 天空、动作交叉淡入、骨骼锚定的相机关键帧、第一人称抬手 IK、剪影切换；用 `FlightCanvas` 挂载，纸飞机光标可飞入 |
| `openingTimeline.ts` | 分镜时间线纯函数与共享时钟（有单测） |
| `HomeSections.tsx` / `HomeFooter.tsx` | 简介、三步、直播间体验、直播模式、创作者、内测与页脚 |
| `useHomeDict.ts` + `../i18n/home.ts` | 首页四语文案（zh 基准） |
| `../styles/home.css` | 全部 `.hv-*` 样式，≤ 1023px 竖排菜单收进汉堡，≤ 900px 单列 |

素材：`public/website/figma/`，由 Figma 图片填充与矢量导出并压缩（WebP / SVG，约 1.7 MB）。

开场分镜：睡眠剪影（PET_SLEEPING）→ 躺卧（spot_lie_down_1）→ 第一人称仰望 + 抬手触碰镜中轮廓 → 窗口放大、后方环绕（PET_INTRO → PET_INTRO_END）→ spot_target_locked 定格。
窄屏 / 无 WebGL / 无 hover 用四张 Figma 定帧走同一时间线；`prefers-reduced-motion` 直接定格。

开发调试参数（仅 DEV）：`?ophold=<秒>` 冻结时间线、`?opfx=0` 关闭剪影、`?opcam=x,y,z,lx,ly,lz,fov` 覆盖相机偏移、`?opsky=<弧度>` 旋转 HDR；`window.__hvOpening` 输出当前骨骼世界坐标。
注意：内嵌浏览器面板隐藏时 rAF 被节流，模型加载与 3D 循环会停住，截图前先把标签页置前。

## 代码位置

| 位置 | 内容 |
|---|---|
| `src/website/index.tsx` | 官网根组件，被 `src/main.tsx` 按 `/website` 前缀**懒加载**，不进主包 |
| `src/website/router.ts` | 最小路由，复用 app 的 `SITE_NAVIGATE_EVENT` 与 `navigateWithTransition`，没有引入 react-router |
| `src/website/i18n/` | 官网四语字典，与 `src/i18n/site.ts` 分开维护，共用同一套 locale 代码 |
| `src/website/assets.ts` | 素材入口。多数直接引用 app 既有 `public/`，只有派生素材在 `public/website/` |
| `src/website/sections/` | 首页 S01–S10 区块 |
| `src/website/pages/` | gallery / creators / journal / feedback / doodle / moodboard |
| `src/website/styles/` | 全部选择器带 `.echuu-website` 前缀，不污染产品 app |

## 复用了 app 的什么

- **locale 状态**：`src/hooks/use-i18n.ts` 的 `useI18nStore`，语言切换两边同步。
- **语言名**：`src/i18n/site.ts` 的 `siteLocaleOptions`。
- **导航**：`src/lib/pageTransition.ts`（已把 `/website` 加进 SPA 路由白名单）。
- **素材**：Figma 天空/轨道环/品牌 mark、礼物图标、三个条款 HTML、全部字体，都是直接引用，没有复制。

## 派生素材（只有这几个是新增的）

`public/website/` 共 516 KB：

| 文件 | 为什么要重做 |
|---|---|
| `sky-blob.png` | 原 `figma-1146-sky.png` 外层是浅灰底 `#dfe0e4` 不是透明，叠在页面上是个灰方块。做了洪水填充抠底、最大连通域去噪、内部补洞。 |
| `angel-deco.png` / `wing-deco.png` | 原图是黑底白线（产品里靠混合模式显示），直接放白底页面会变黑块。用亮度转 alpha 并重上品牌蓝。 |
| `internal/*.jpg` | 预研录像抽帧，**仅内部 moodboard**，授权未核实。 |

## 校验命令

```bash
npm run website:assets   # 核对素材清单里的文件是否存在
npm run website:gate     # 发布闸门：条款/域名/字体授权/素材冲突未确认时退出非 0
npm run website:verify   # 浏览器自动化（需先起 preview，脚本内地址为 :5190）
```

## 交接文档

| 文件 | 内容 |
|---|---|
| `source-audit.md` | 已核对事实 / 未证实项 / **三处权利冲突** |
| `OPEN_ITEMS.md` | 需要团队补齐或决定的事项 |
| `copy-deck.md` | 四语文案表与术语表 |
| `storyboard.md` | 网页分镜 S01–S10 实现对照 |
| `video-cut.md` | 介绍视频剪辑表（未产出成片） |
| `VERIFICATION.md` | 验证记录 |
| `asset-manifest.json` | 素材清单与权利状态 |
| `CLAUDE_WEBSITE_PROMPT_ZH.md` | 原始任务书（历史文件，未随实现改写） |

## 当前状态

**本地实现完成、外部服务未接通、验证通过、未发布。**
