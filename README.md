# Echuu 官网

从 `echuu-ai/nextjs-vtuber-mocap` 的官网首页 v2 与当前本地改动中提取的独立 Vite / React / TypeScript 项目。包含四语首页、3D 开场、纸飞机交互、gallery / creators / journal / feedback / doodle / moodboard。

## 启动

需要 Node.js 22.12+（本次使用 24.4.1）。

```sh
npm ci
npm run dev
```

打开 http://localhost:5180/website/zh 。访问根路径自动进入官网。保留 `/website/{zh,en,ja,ko}` 深链接，避免原有官网链接失效。

```sh
npm run check:assets
npm test
npm run build
npm run preview
```

## 独立性与依赖

- 不需要父目录、原产品仓库、后端、S3 凭据或 Git 子模块。
- `public/` 包含官网模型、开场动作、HDR、纸飞机、图片、字体与条款；完整清单及 SHA-256 在 `docs/dependency-assets.json`。
- `src/website/` 是官网内容；其余 `src/` 是官网需要的共享运行时代码快照。HDR 天空已从大型直播间组件独立提取为 `src/components/three/WebsiteHdrSky.tsx`，保留原渲染逻辑。
- 3D 开场相机、灯光、景深、表情仍读取 `src/website/home/heroScene.json`。
- YouTube 视频嵌入、Google Fonts 样式与社交/Notion 链接仍是外部服务，需要网络。它们不是原仓库依赖，也不宣称离线可用。
- 报名/反馈接口未配置时保持邮件或本地降级。可选配置见 `.env.example`；未迁移任何 `.env`、密钥或本机账号。
- `docs/website/` 保存历史设计、素材和发布待办，里面提及“并入产品仓库”的内容是迁移前记录；当前结构以本 README 与 `docs/MIGRATION.md` 为准。

## 协作与部署

日常协作分支为 `dev`。提交/推送前整合其远端更新，不强制推送。
生产构建输出 `dist/`，静态托管需将不存在的页面路径回退到 `index.html`；资源文件按真实路径服务。本仓库带 `vercel.json` 作为静态 SPA 配置，但本次未部署。

公开发布仍需处理 `docs/website/OPEN_ITEMS.md` 已记录的素材/字体与产品范围待确认项。创建组织私有仓库不表示公开发布已批准。


## GitHub Pages 临时预览

源码仓库保持私有；组织套餐不支持私有仓库 Pages，因此临时预览使用公开的 `echuu-ai/echuu-website-preview`，仅发布构建产物。

```sh
npm run build -- --base=/echuu-website-preview/
node scripts/prepare-pages.mjs
```

`prepare-pages.mjs` 为四语页面生成静态入口，支持刷新和深链接。将 `dist/` 内容发布到预览仓库 main 根目录（推送前先同步该仓库远端）。本地开发仍使用 `/website/zh`；预览路径为 `/echuu-website-preview/website/zh/`。

## 博客、团队与语言切换（2026-09-30）

- 博客：`src/website/data/blog.ts` 维护四语文章（中文为源文，日/英/韩为执行初稿）；列表 `/website/{locale}/blog`，文章 `/website/{locale}/blog/{slug}`，首页新增「创作日志」区块（最近三篇）。路由第三段 slug 只对 blog 开放。
- 团队：`src/website/data/team.ts` 与 Notion 媒体资料包「团队」段落对齐（最后更新 2026.8.28），另加技术顾问张佳鹏（zjp / shadow，前 Vast 算法工程师）；页面 `/website/{locale}/team`。他的 GitHub 地址待补。
- 语言：首屏页头新增一行「中 · 日 · EN · 한」切换（`LangInline`），保留当前子页与文章；子页面继续用 `LangSwitch`。四语路由本身未变。
- 原「创作日志」子页改称「短记录」（journal），避免与博客重名。

## 邀请码与内测申请（2026-09-29）

首页登录/内测入口使用居中玻璃弹窗。服务端尚未提供，默认展示准备中并禁用提交。待确认部署契约后配置 `VITE_INVITE_REDEEM_ENDPOINT` 与 `VITE_BETA_ACCOUNT_ENDPOINT`；不要将邀请码或发信密钥放进前端。`VITE_PRODUCT_ORIGIN` 未设置时，开发默认 `http://localhost:5173`，生产沿用 `https://echuu.app`。契约与状态见 `docs/reviews/2026-09-29-invitation-access.md`；可定制中文邀请函在 `emails/beta-invitation.zh.html`。
