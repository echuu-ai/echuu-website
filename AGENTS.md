# Echuu 官网

这是独立官网仓库，入口 `src/main.tsx`，内容在 `src/website/`。先读 README.md、docs/MIGRATION.md 与 docs/website/OPEN_ITEMS.md。

- 日常使用 dev；推送前整合远端更新，保留协作者工作，不 force push。
- 不依赖原 nextjs-vtuber-mocap 检出目录；不能用绝对本机路径或链接到原仓库的 symlink 修依赖。
- 修改资源时同步 docs/dependency-assets.json，保留来源与验证证据。
- 保留四语、prefers-reduced-motion、3D 参数与静态降级。每帧数据使用 refs / 复用 Three.js 对象。
- 验证：npm run check:assets、npm test、npm run build，并对页面交互做浏览器检查。
- 上线与仓库推送分开；已知待确认项不写成发布验收通过。

## 排版硬性规定（违反即返工）

- **禁止孤字**：任何一行都不能只剩一个词，或「一个字 + 标点」，也不能有只含标点的行。`src/website/lib/orphanGuard.ts` 会自动粘住每段末尾（中日韩末尾 3 个字、拉丁末尾 2 个词；文字块按显示方式找，`<br>` 前后各算一段）；文字里的小标签必须是 `display: inline`（inline-block / inline-flex 粘不住）。改文案、改版式后在 dev 控制台跑 `window.__findOrphans()`，**四语 × 1440 / 1024 / 390** 都要返回空数组。
- **按钮文字永远一行**，四语 × 1440 / 390 检查（见 docs/website-ui-spec.md §3）。
- **对齐 12 列栅格**（≥ 1024px）：首页内容区 min(1360px, 100% − 32px)，栏间距 32px；子页面纸面占第 2–11 列、内容第 3–10 列。新区块先定占哪几列，不用 `padding-inline: 2%` 之类的内缩微调（见 §2.5）。
- **间距用 4 的倍数**（2px 细缝除外），**触屏点击区域 ≥ 44px**（见 docs/website-ui-spec.md §2）。
- **字体两种**：标题蒲瓜纤云宋，正文 42dot 精简版 + 系统中日韩字体；不引入新字体，不依赖 Google Fonts。
