# Echuu 官网

这是独立官网仓库，入口 `src/main.tsx`，内容在 `src/website/`。先读 README.md、docs/MIGRATION.md 与 docs/website/OPEN_ITEMS.md。

- 日常使用 dev；推送前整合远端更新，保留协作者工作，不 force push。
- 不依赖原 nextjs-vtuber-mocap 检出目录；不能用绝对本机路径或链接到原仓库的 symlink 修依赖。
- 修改资源时同步 docs/dependency-assets.json，保留来源与验证证据。
- 保留四语、prefers-reduced-motion、3D 参数与静态降级。每帧数据使用 refs / 复用 Three.js 对象。
- 验证：npm run check:assets、npm test、npm run build，并对页面交互做浏览器检查。
- 上线与仓库推送分开；已知待确认项不写成发布验收通过。
