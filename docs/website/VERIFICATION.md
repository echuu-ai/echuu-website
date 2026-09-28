# 验证记录

> 2026-09-18 增补：首屏已从静态品牌图层升级为 3D（复用产品的 HDR 天空与角色剪影），
> 字体改为复用 app 的 `--font-brand-title`。新增验证见 §2.5。

日期：2026-09-17。环境：macOS、Node v24.4.1、Chrome（headless，puppeteer-core 驱动）。
被测对象：并入 `echuu-ux-r3f-vite` 后的 `npm run build` 产物，经 `vite preview` 在
`http://localhost:5190/website/{locale}` 提供。

> 本文记录两轮验证：独立仓库阶段，以及并入产品仓库之后的复验。以并入后的结果为准。

---

## 1. 状态总表

四种状态分别报告：

| 项 | 本地实现 | 服务已接通 | 验证通过 | 已发布 |
|---|---|---|---|---|
| 首页 11 个区块（四语） | ✅ | — | ✅ | ❌ |
| 五个子页 + 内部 moodboard | ✅ | — | ✅ | ❌ |
| 四语切换 / 深链接 / SEO head | ✅ | — | ✅ | ❌ |
| 介绍视频（点击加载 YouTube） | ✅ | ✅ 第三方公开链接 | ✅ | ❌ |
| 内测申请 | ✅ 邮件流程 | ❌ 无报名接口 | ✅ | ❌ |
| 意见箱 | ✅ 邮件 + 复制 | ❌ 无收件接口 | ✅ | ❌ |
| 创作者合作 | ✅ 邮件流程 | ❌ | ✅ | ❌ |
| 涂鸦画布（本地） | ✅ | — 仅本浏览器 | ✅ | ❌ |
| 涂鸦公开投稿 | ❌ 未实现 | ❌ | — | ❌ |
| Gallery 真实作品 | ⚠️ 仅 1 条已公开视频 | — | ✅ | ❌ |
| 条款文件 | ✅ 原样提供 | — | ✅ | ❌ 含草案项 |
| canonical / hreflang | ✅ 已实现 | ❌ 域名未确认，因此不输出 | ✅ | ❌ |

**整体：本地实现完成、外部服务未接通、验证通过、未发布。**

## 2. 并入产品仓库后的复验（22 项，1 项为已知既有行为）

脚本：`scripts/website/verify.mjs`（`npm run website:verify`，需先 `npm run preview`）。

| 结果 | 检查项 |
|---|---|
| PASS | 四语 × 7 页深链接：HTTP 200、`html.lang`、`data-locale`、title（28 个组合） |
| PASS | 无横向溢出：390 / 768 / 1440 px × 四语（12 组） |
| PASS | `/website` 不带语言时按 app 既有检测补齐并改写地址 |
| PASS | 语言切换保留当前子页（`/website/en/journal` → `/website/ja/journal`） |
| PASS | 站内导航为 SPA，不整页刷新 |
| PASS | `prefers-reduced-motion` 下内容全部可见 |
| PASS | 涂鸦可绘制、可导出 PNG |
| PASS | **产品 app `/` 仍能挂载**，无控制台错误 |
| PASS | **官网样式未泄漏到产品 app**（app 页面上无 `.echuu-website`） |
| 既有行为 | 页面加载 `fonts.googleapis.com` 与 `analysis.e.echuu.live`，来自 app 的 `index.html` 与 `initAnalytics()`，`/blog`、`/about` 同样如此。官网本身没有新增追踪脚本。**这是新增的对外数据流，需团队确认是否保留**，见 OPEN_ITEMS。 |

另单独确认：滚到页面底部为止**不加载任何 YouTube 资源**，只有点击播放按钮后才请求 `youtube-nocookie.com`。

### 并入过程中发现并修掉的问题

1. **品牌 tagline 掉成无衬线、主按钮文字消失。** 把官网 CSS 收敛到 `.echuu-website` 时，`h1` 和 `a` 加了前缀后优先级反而压过 `.hero__tagline` 和 `.btn--primary`（按钮是 `<a>`，被链接色盖成与底色同色）。改为给官网全部选择器统一加同一层前缀。
2. **站内导航整页刷新。** `src/lib/pageTransition.ts` 的 `navigateWithTransition` 有一张硬编码站点路由白名单，`/website` 不在其中。已加入。
3. **中文页 Gallery 与短记录显示英文。** locale 代码从 `zh-CN` 对齐成 app 的 `zh` 后，`data/media.ts` 与 `data/journal.ts` 里的 `'zh-CN'` 键查不到，回落英文。已改键名，四语复验通过。
4. **生成的 robots.txt 没挡 moodboard。** 已在 `scripts/generate-seo-pages.mjs` 补上 `/website/{locale}/moodboard` 与 `/website/internal/`。

## 2.5 首屏 3D 与字体复用验证（16 项，0 失败，2026-09-18）

| 结果 | 检查项 | 实测 |
|---|---|---|
| PASS | 桌面挂载 3D 舞台，文字与 CTA 仍可用 | — |
| PASS | 桌面加载 HDR 与角色 | HDR 547 KB，模型 8 547 KB |
| PASS | **移动端（390px）不挂 3D** | HDR 0 KB，模型 0 KB |
| PASS | 移动端文字与 CTA 可用 | — |
| PASS | **`prefers-reduced-motion: reduce` 不挂 3D** | HDR 0 KB，模型 0 KB |
| PASS | reduce motion 文字与 CTA 可用 | — |
| PASS | zh 标题字体 | PingFang SC（蒲瓜子集缺字，保留例外） |
| PASS | ja 标题字体 | Shippori Mincho（app 的 @font-face） |
| PASS | en 标题字体 | PP Editorial New |
| PASS | ko 标题字体 | Maru Buri |
| PASS | 四语 tagline 都用英文品牌字体，不套 CJK | PP Editorial New ×4 |
| PASS | 产品 app `/` 未受影响 | 0 控制台错误 |

首屏顺序实测：页面打开 0.9 秒时 tagline 与 CTA 已可交互，3D 之后才开始拉资源。

### 3D 接入过程中修掉的问题

1. **角色完全不显示。** 三个原因叠在一起：`tone="light"` 渲染的是白色剪影，在亮天空上等于隐形；容器只有 560×635，把斜角相机下的空翻姿势框到了画面外；`LoadingSky` 的画布是 `alpha: false`（不透明），没有显式层级时盖住了角色。逐一排查后改成 `tone="dark"`、容器 66% 宽占满 hero 高、给天空与角色显式 `z-index`。
2. **`AssetLoadBoundary` 会静默吞掉加载错误**（只上报到正在 401 的统计），排查时没有任何控制台线索，靠逐层量 DOM 与网络才定位。这不是本次引入的，但值得知道。
3. **HDR 太大。** 产品默认那张是 65.5 MB。写了 `scripts/website/downsample-hdr.py`（纯 Python 的 Radiance HDR 读写，含 RLE 解码），把 9.3 MB 版本降到 682×341、0.89 MB。

### WebKit（Safari）专项修复，2026-09-18

Cory 在 Safari 打开时报 `Error: useAppColorGrade must be used within AppColorGradeProvider`，
Chrome 上完全复现不了。原因链：

`isWebKitColorGradeEngine()` 只在 `navigator.vendor` 含 `Apple Computer` 时为真 →
`LoadingSky` 据此挂载 `EffectComposer` → 里面有 `AppColorGradeLutPass` → 它要求
`AppColorGradeProvider`，而官网分支挂在 provider 外面。

两处修复：

1. `src/main.tsx` 的官网分支用 `AppColorGradeProvider` 包起来，与既有的 `LiveReplayStage` 分支同样处理。
2. 修完不崩了，但 WebKit 的 LUT 把蓝白天空压成紫色，而 Chromium 走的是 CSS filter stack、官网没有挂那层，导致**两个浏览器颜色不一致**。给 `LoadingSky` 加了 `colorGrade` 开关（默认 `true`，产品行为不变），官网传 `false`。

验证方式：Chrome 里用 `evaluateOnNewDocument` 覆写 `navigator.vendor` 为 `Apple Computer, Inc.` 复现 WebKit 分支。修复后两条路径均无崩溃、无页面错误，天空同为蓝白。另确认产品 `/` 在同一伪装下仍正常挂载、`.shared-sky-grade-stack` 仍在，调色未被削弱。

> 教训：官网跑在产品的 `main.tsx` 里，就会继承产品所有按浏览器分叉的代码路径。只在 Chrome 验证不够。

### 已知未解决

首屏模型 8.5 MB 偏重。`LandingHeroVrm` 渲染的是纯色剪影，模型里 21 张贴图下载了但完全没用上。做一份只留几何与骨骼的剪影专用 VRM 应该能大幅缩小，见 OPEN_ITEMS H1。

## 3. 独立仓库阶段的自动化检查（25 项，0 失败）

脚本同上（当时在 `http://localhost:5180`）。

| 结果 | 检查项 |
|---|---|
| PASS | 四语 × 7 页深链接刷新：HTTP 200、`html.lang` 正确、title 非空（28 个组合） |
| PASS | 无横向溢出：390 / 768 / 1440 px × 四语，`scrollWidth - innerWidth = 0`（12 组） |
| PASS | 移动端所有可交互元素 ≥ 44×44 CSS px |
| PASS | 默认不向第三方发任何请求（滚到页面底部为止） |
| PASS | 点击播放后才加载 `youtube-nocookie` |
| PASS | `prefers-reduced-motion: reduce` 下所有 `.reveal` 内容 opacity = 1 |
| PASS | Gallery modal：打开、焦点进入弹窗、Escape 关闭 |
| PASS | 第一个 Tab 焦点落在「跳到主要内容」 |
| PASS | 涂鸦可绘制、可导出 PNG、可保存到本浏览器并给出状态 |
| PASS | 未保存时离开页面触发 beforeunload 提示 |
| PASS | moodboard 为 `noindex, nofollow`；首页无 robots 限制 |
| PASS | 语言切换保留当前子页（`/en/journal` → `/ja/journal`） |

## 4. 对比度实测（WCAG AA）

正文需 4.5:1，≥24px 大字需 3:1。均在实际渲染背景上取色计算。

| 元素 | 字号 | 对比度 | 需要 | 结果 |
|---|---|---|---|---|
| Hero 品牌 tagline | 92px | 13.76:1 | 3 | PASS |
| Hero 品类说明（AI VTuber） | 27.4px | 13.76:1 | 3 | PASS |
| Hero 用途说明 | 17px | 6.05:1 | 4.5 | PASS |
| Hero 状态行 | 14px | 4.84:1 | 4.5 | PASS |
| 区块说明 | 17px | 6.05:1 | 4.5 | PASS |
| 导航链接 | 15px | 6.29:1 | 4.5 | PASS |
| Feature 正文 | 15px | 6.29:1 | 4.5 | PASS |
| 短记录 meta | 15px | 6.29:1 | 4.5 | PASS |
| 区块脚注 | 15px | 4.84:1 | 4.5 | PASS |
| 主按钮（白字/深蓝底） | 15px | 7.81:1 | 4.5 | PASS |

> 修正记录：初测 `--ink-faint` 为 `#6b83a8`，在天空底上只有 **3.71:1**，不达标。已改为 `#5a7093`（白底 5.03:1、页面底 4.84:1）。

## 5. 体积实测

| 项 | 实测 | 目标 | 结果 |
|---|---|---|---|
| 官网 chunk（并入后，未压缩） | **133 KB**，独立 chunk，**不进产品主包** | — | — |
| 首屏 JS（独立仓库阶段，gzip） | 81.7 KB（vendor 53.0 + app 28.7） | ≤ 200 KB | PASS |

> 并入后官网通过 `import('./website')` 懒加载，访问 `/website` 不会拉产品主包里的 3D 依赖；
> 但页面仍会加载 app 的全局 chrome（`BlendCursor` 的 WebGL 画布、Google Fonts）。
> 若要严格恢复独立仓库时的首屏预算，需要为 `/website` 单独裁掉这部分，见 OPEN_ITEMS。
| CSS（gzip） | 5.5 KB | — | — |
| 首屏图片合计 | **~292 KB**（天空 281 KB + 天光 2.8 KB + 三个环 3.6 KB + mark 0.6 KB + 装饰 1.0 KB） | ≤ 500 KB | PASS |

字体按语言加载，不计入首屏：Inter 626 KB（ttf，建议转 woff2）、PP Editorial New 58 KB；
Shippori Mincho 3.3 MB **只在 ja** 触发、Maru Buri 466 KB **只在 ko** 触发，都用 `unicode-range` + `font-display: swap`，不阻塞文字显示。

## 6. 文案约束实测

| 检查 | 结果 |
|---|---|
| 禁用词（赋能/重塑/革新/一站式/无限可能/下一代/生态闭环/解锁无限潜能/妈咪） | 0 处 |
| 独立 `OC` 缩写、`オリキャラ`、`자캐` | 0 处 |
| 过度承诺（永久记忆/永不 OOC/完美理解/有意识/代替画师/收益保证/全自动代运营/无限商用） | 0 处 |
| `Original Character` 出现 | 25 处 |
| `AI VTuber` 出现 | 8 处 |
| 首页自写中文营销正文 | **607 字**（目标 ≤ 700） |

## 7. 构建与类型

```
npx tsc -b --force     → 0 error
npm run build          → 成功
npm run audit:assets   → 检查 20 个文件，缺失 0 个
npm run build:release  → 按设计失败，列出 4 项待确认（条款、域名、字体授权、素材冲突）
```

四语字典通过类型强制同构：缺 key 或数组长度不一致会在 `tsc` 阶段报错。

## 8. 真实浏览器目视检查

已用 Chrome 截图逐屏查看：

- 1440px 英文首页：tagline 两行不换词、品类说明与两个 CTA 均在首屏内。
- 390px 中文首页：tagline 两行、品类说明完整、CTA 全宽、无截断。
- 1280px 英文整页（8009px 高）：11 个区块顺序与内容正确，页脚四组 + 社交。

**本轮修掉的真实问题：**

1. Hero tagline 在 1440px 下被挤成 5 行、CTA 掉出首屏 → 改为两行不换词并放宽容器。
2. `figma-1146-sky.png` 外层是浅灰底（`#dfe0e4`）不是透明，叠加后出现明显灰色方块 → 用洪水填充 + 最大连通域 + 内部补洞生成透明底版本。
3. `angel-deco.png` / `wing-deco.png` 是黑底白线（产品内用混合模式），直接放到白底页面变成黑灰方块 → 用亮度转 alpha 并重上品牌蓝，按 35px 原生尺寸使用。
4. Gallery 待取得条目的来源说明只有中文，在日英韩页面泄漏 → 补齐四语。
5. `--ink-faint` 对比度不足 → 见 §3。
6. 页脚与内联链接命中区域不足 44px → 见 §2。

## 9. 没有验证的部分

- **Notion 原文未读到**：WebFetch 对该页面返回空内容（JS 渲染）。素材与状态依据任务书记录与本地仓库，见 `docs/source-audit.md`。
- **介绍视频内容未逐帧确认**：只验证了点击后播放器正常加载。
- **真机触控**：只做了 Chrome 视口模拟，没有在真实手机上测试。
- **屏幕阅读器**：只检查了语义结构、`aria-*`、焦点顺序，没有跑 VoiceOver/NVDA 实测。
- **四语母语审校**：未进行。
- **产品 app 回归**：已确认 `/` 能正常挂载、无控制台错误、官网样式无泄漏。但**没有**跑产品 app 的完整功能回归（登录、开播、VRM、LiveKit）。本次对 app 的改动只有三处：`src/main.tsx` 加 `/website` 分支、`src/lib/pageTransition.ts` 白名单加 `/website`、`scripts/generate-seo-pages.mjs` 的 robots 规则。
- **`npm test`**：本次未运行仓库既有测试套件。
