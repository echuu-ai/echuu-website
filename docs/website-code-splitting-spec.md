# 官网代码拆分与首屏加载 —— 执行说明书

2026-10-05 · 写给执行者（Fable）。目标：**不改任何视觉与交互**，只改「什么时候下载 / 执行哪段代码」，让手机首屏更快出现、更快可交互。
仓库：`echuu-ai/echuu-website`，分支 `dev`（Vercel 从 `dev` 自动部署正式站 https://www.echuu.ai）。

---

## 0. 先读这些，再动手

- 本文的每个任务都是**独立的一次提交**。一个任务做完、验证全过、提交推送之后，再开始下一个。验证不过就回退这个任务，不要叠着改。
- **禁止改动**（这些都是用户逐项确认过的，改了就是事故）：
  - 开场的时间轴、镜头、动作、表情、光、音效（`src/website/home/openingTimeline.ts`、`three/OpeningStage3D.tsx` 里的 `CAMERA_KEYS` / `WAKE_FACE` / `SkyEdgeEffect` 参数、`lib/openingSound.ts`）；
  - 开场模型 `corynorootbone.loading.vrm`（**不要压缩、不要转格式**，用户明确要求保留精度）、预烘焙动作 `assets/animation/baked/*.clip.bin`；
  - 字体子集与字体栈（`scripts/subset-*.py`、`src/styles/ui-typography.css` 的 `--echuu-sans`）；
  - 法律文件 `public/legal/*`；文案 `src/website/i18n/*`；
  - 「按钮文字永远一行」规则；开场**没有**跳过 / 重播按钮（只有 Esc）；声音默认开。
- 不要升级依赖版本，不要换打包工具，不要改 `vite.config.ts` 的 `base` / `assetsDir`。
- 每次提交信息结尾加 `Co-Authored-By` 行（按会话规定）。

## 1. 基线（2026-10-05，线上 https://www.echuu.ai/website/en，Lighthouse 12 手机模拟）

| 指标 | 数值 |
|---|---|
| Performance | **38** |
| FCP | 3.6 s |
| **LCP** | **13.0 s**（LCP 元素 = 开场纸张 `img.hv-paper__sheet`；其中 **Load Delay 10.1 s**，即图片很晚才开始下载） |
| TBT | 440 ms |
| TTI | 13.1 s |
| 页面总重 | 17.1 MB（12.7 MB 是开场模型，**不在本次范围**） |
| JS 执行（bootup） | 3.8 s：`index-*.js` 2.0 s、`react-three-fiber` 1.8 s |
| 渲染阻塞 | `index-*.css` 1.0 s、Google Fonts CSS 1.7 s |

主入口块 `index-*.js`：1437 KB（min）/ 427 KB（gzip），首页一打开就下载并执行。成分（未压缩源码）：

| 成分 | 大小 | 谁带进来的 |
|---|---|---|
| `three` | 1240 KB | **`OpeningHero.tsx` 第 6 行 `import { useProgress } from '@react-three/drei'`** → drei `core/Progress.js` 引 `DefaultLoadingManager from 'three'` |
| `motion-dom` + `framer-motion` | 454 KB | `src/website/auth/AccessDialog.tsx`（`motion/react`） |
| `react-hsv-ring` | 235 KB | `src/components/AppColorGrade.tsx` 第 13 行（调色面板的色轮，**只在开发 / 面板打开时用**） |
| `@liquidglassjs/core` | 107 KB | `home/BlogSection.tsx`、`home/AnswersSection.tsx`、`pages/TeamPage.tsx` |
| 子页面 | 若干 | `pages/*.tsx`（Doodle、Moodboard、Feedback……）全部静态打进主块 |

## 2. 测量工具（每个任务前后都要跑）

```sh
# 1) 带 sourcemap 构建到临时目录，看每个块的成分
npx vite build --sourcemap --outDir /tmp/echuu-bundle --emptyOutDir
python3 scripts/analyze-bundle.py /tmp/echuu-bundle            # 人读
python3 scripts/analyze-bundle.py /tmp/echuu-bundle --json > /tmp/after.json   # 改前改后各存一份对比
python3 scripts/analyze-bundle.py /tmp/echuu-bundle --who three  # 主块里谁 import 了 three（应为空）

# 2) 常规检查（全部必须通过）
npx tsc --noEmit -p . && npx vitest run && npm run build && node scripts/check-assets.mjs

# 3) Lighthouse（本地生产构建；手机模拟；跑 3 次取中位数）
npm run build && npx vite preview --port 5190 &
npx -y lighthouse@12 http://localhost:5190/website/en --quiet --chrome-flags="--headless=new" --output=json --output-path=/tmp/lh.json
```

## 3. 回归检查清单（每个任务提交前都要逐项过）

在 `npm run dev`（http://localhost:5180）与生产构建两边都要看：

1. **开场**（`/website/zh`、`/website/en`）：黑场 → 纸张与铅笔轮廓写出 → 画翅膀引导出现 → 沿引导描一笔 → 约 0.5 s 后苏醒 → 翻身站起 → 纸在她身前折成纸飞机 → 飞进窗口 → 开窗（对面世界亮起、轻微色散）→ 首屏 3D 角色 + logo 出场动画（字母逐个出现 + 扫光）。控制台无报错。
2. **开场模式降级**：Chrome 加 `--disable-webgl` 打开 → 直接进首屏静态图，不出现任何旧开场元素（标题、剑、飞马）。系统开「减少动态效果」→ 直接首屏。
3. **首屏交互**：鼠标划过角色有冰晶扩散 + 轻声；纸飞机光标长按起飞；`?logo=3d` 金属 logo；`?logo=static` 平面 logo。
4. **弹窗**：「登录」（内测码）、「参与内测」（邮箱密码）、底部栏微信 / QQ 群、三步出道里「如何获取 VRM 模型」。打开速度不能明显变慢（首次打开 < 300 ms 可感知延迟）；Esc 关闭；焦点回到触发按钮。
5. **滚动区块**：功能卡片（动捕视频循环、3D 礼物、点礼物卡炸礼物）、钥匙合拢→打开、三张直播模式卡、剪影视频播一次、博客、问答、页脚（白 logo、翅膀循环）。
6. **子页面**：`/website/zh/team`、`/blog`、`/blog/<任一篇>`、`/journal`、`/feedback`、`/doodle`（开始画）、`/creators`、`/gallery`、`/moodboard`；语言切换保留当前页。
7. **手机宽度**（390×844）：同上 1、4、5，钥匙不出屏，按钮不折行。
8. **声音**：默认开；底部栏喇叭切换正常。

## 4. 任务（按顺序做）

### T1　主块去掉 three.js（预期收益最大、改动最小）

- **原因**：`OpeningHero.tsx` 用 `useProgress`（drei）只是为了 `useStrokeProgress` → 旧开场的蓝色描边进度条 `svg.hv-opening__stroke`。旧开场已删除，3D 模式下这个描边被 CSS 隐藏（`.hv-hero--3d .hv-opening__stroke`），进度值实际无用。
- **做法**：删除 `import { useProgress } from '@react-three/drei'`、`useStrokeProgress` 函数与 `stroke` 变量、`<svg className="hv-opening__stroke">` 整段；`data-loaded={stroke >= 1}` 改为 `data-loaded={ready}`。不要在主块里新引任何 `three` / `@react-three/*` 的东西。
- **验收**：`analyze-bundle.py --who three` 无输出；`index` 块里没有 `pkg:three`、`pkg:@react-three/*`；回归清单 1–3 全过（特别是开窗时窗口位置与 `data-loaded` 相关 CSS 无变化——先 `grep -n "data-loaded" src/website/styles/*.css` 确认用法）。
- **预期**：主块 min 约 −600 KB、gzip 约 −150 KB；three 移到已有的 `OpeningStage3D` / `react-three-fiber` 块（这部分开场本来就要下载，总量不变，但不再阻塞主块执行）。

### T2　开场纸张图片提前下载（直接解决 LCP 的 10 s Load Delay）

- **原因**：LCP 元素是纸张图 `website/figma/opening-paper/sketch-body.webp`，它要等主块执行完、判定 3D 模式后才被 React 渲染出来。
- **做法**：在 `index.html` 里已有的那段首页判定脚本（`echuu-dark-boot` 那段，只在首页路径生效）里，同样只在首页路径时 `document.head.appendChild` 一个 `<link rel="preload" as="image" href="…sketch-body.webp" fetchpriority="high">`。地址要带部署 base（`%BASE_URL%` 在 index.html 中由 Vite 替换；预览站 base 是 `/echuu-website-preview/`）。**子页面不要预载**。
- **验收**：Lighthouse 的 LCP breakdown 里 Load Delay < 1.5 s；子页面网络面板里没有这张图；预览站（`npm run build -- --base=/echuu-website-preview/`）地址正确。

### T3　Google Fonts 样式表不阻塞渲染

- **原因**：`index.html` 的 Google Fonts `<link rel="stylesheet">` 阻塞首屏 1.7 s；这三个字体（42dot Sans 韩文、Agu Display 一处标题、Noto Serif SC 宋体回落）首屏都不是必需的。
- **做法**：改成 `<link rel="preload" as="style" href="…" onload="this.onload=null;this.rel='stylesheet'">` + `<noscript><link rel="stylesheet" href="…"></noscript>`；保留现有 `preconnect`。**不要改 URL 里的字体列表**。
- **验收**：Lighthouse「Eliminate render-blocking resources」里不再有 fonts.googleapis.com；韩文页 42dot、首页 Agu Display 标题仍然正确显示（用 DevTools → Rendered Fonts 核对）。

### T4　调色色轮（react-hsv-ring）按需加载

- **原因**：`AppColorGrade.tsx` 顶部静态 `import * as ColorWheel from 'react-hsv-ring'`，但色轮只出现在调色面板里（面板在 `panelOpen` 时才渲染，正式站一般不打开）。
- **做法**：把用到 `ColorWheel` 的那个组件（约第 200–212 行所在组件）移到新文件 `src/components/AppColorGradeWheel.tsx`，在 `AppColorGrade.tsx` 里 `React.lazy` 引入，`<Suspense fallback={null}>` 包住。**`AppColorGradeProvider` 及 LUT 调色逻辑保持在主块不动**（首屏调色要用）。
- **验收**：`index` 块无 `pkg:react-hsv-ring`；开发环境打开调色面板，色轮正常、拖动正常；首屏画面颜色与改前截图一致。

### T5　内测 / 登录弹窗按需加载（带走 motion 动效库）

- **原因**：`AccessDialog.tsx` 用 `motion/react` 做入场动画，连带 `motion-dom` + `framer-motion` 约 450 KB 进主块；弹窗只有用户点击后才需要。
- **做法**：`HomeV2.tsx` 里 `AccessDialog` 改为 `React.lazy`；**在 `accessMode` 为 null 时不渲染它**（现在是常驻渲染 + `open` 控制，需改成首次打开时才挂载，挂载后保留以免重复加载）。首屏进入 `hero` 阶段后用 `requestIdleCallback`（无则 `setTimeout 1500`）预取 `import('../auth/AccessDialog')`，保证点击时已在缓存。焦点返回逻辑（`returnFocusRef`）保持不变。
- **验收**：`index` 块无 `pkg:motion-dom`、`pkg:framer-motion`（若别处仍静态用到 motion，先 `grep -rn "motion/react\|framer-motion" src` 列出并在说明里写明，不要硬拆）；回归清单 4 全过：首次点击「登录」「参与内测」能立刻打开、有入场动画、Esc 关闭、焦点回到按钮；减少动态效果时无动画。

### T6　子页面按路由懒加载

- **原因**：`src/website/pages/*.tsx` 全部静态进主块，首页用不到。
- **做法**：在路由分发处（`src/website/index.tsx` 或其路由组件，先确认）把除首页外的页面改 `React.lazy`，`Suspense` 的 fallback 用与子页面背景一致的空容器（不要出现闪白、不要出现旧加载文字）。`SubpageChrome` / `TeamChrome` 外壳可以留在主块。
- **验收**：首页 `index` 块不含 `src:src/website/pages/*`（`MoodboardPage`、`DoodlePage`、`FeedbackPage` 等）；回归清单 6 全过，子页面直接打开（刷新）与站内跳转都正常，无闪白；`scripts/prepare-pages.mjs` 生成的静态入口仍能打开。

### T7（可选，做完 T1–T6 再评估）液态玻璃按需加载

- `@liquidglassjs/*`（约 116 KB）只在博客、问答、团队页的卡片上。可以把用到它的卡片组件改成进入视口前 300 px 再 `import()`，加载前用现有 CSS 的毛玻璃样式占位（外观必须一致，截图对比）。如果占位与真实效果有可见跳变，**放弃这个任务**。

## 5. 每个任务的提交格式

```
perf(website): <任务一句话>

<原因：哪个文件把什么带进了主块>
<做法>
Bundle: index <改前> → <改后> KB min / <改前> → <改后> KB gz（scripts/analyze-bundle.py）
Lighthouse mobile（中位数）: Perf <a> → <b>, LCP <a> → <b>, TBT <a> → <b>
Regression checklist §3: all passed

Co-Authored-By: …
```

推送前：`git fetch` 确认不落后于 `origin/dev`；推送后 Vercel 自动部署，打开 https://www.echuu.ai/website/zh 再过一遍回归清单第 1 项。

## 6. 完成标准

- 主入口块 gzip ≤ 200 KB（基线 427 KB）；
- Lighthouse 手机（本地生产构建，中位数）：Performance ≥ 60，LCP ≤ 4 s，TBT ≤ 300 ms；
- 回归清单全部通过，视觉与交互零变化。

做不到的项如实写在最后一次提交说明里，附测量数字，不要为了凑数字改动「禁止改动」里的任何东西。
