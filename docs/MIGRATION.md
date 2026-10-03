# 官网独立仓库迁移 · 2026-09-28

## 来源与边界

- 来源：echuu-ai/nextjs-vtuber-mocap，dev / f03c4b3，加上 Cory 当天本地未提交的官网 v2 与共享渲染/光标改动。
- 目标：echuu-ai/echuu-website，private，日常分支 dev。
- 轨道：integration（官网独立化）。没有平台 REST、agent REST/WS 或 LiveKit 接入；官网可独立启动。原工作区与旧 CoryLee1/echuu-website 备份保留。
- 从官网挂载入口按静态、动态和 type imports 追踪源码闭包，迁入 95 个源码文件；按本地资源引用迁入 106 个文件，85,700,000 字节左右。所有本地运行资源都在 public，不链接原检出目录。
- 大型 StreamVrmAvatar 模块只保留所需的相机类型；HDR 天空函数及依赖提取到 WebsiteHdrSky，原实现和常量保留。未复制直播间、后台、编辑器应用入口。
- 保留原四语深链接、纸飞机、真实 3D、静态/减少动态降级、景深、Bloom、调色、相机与表情参数。保留 YouTube、Google Fonts、Notion 与社交外链。
- 注册原来指向同站产品路由，改为 VITE_PRODUCT_ORIGIN（默认 https://echuu.live）；官网根路径进入 /website，再按语言状态补齐。
- 修正独立 shell 缺少调色 SVG 隐藏样式造成的顶部空白；修正 moodboard 历史截帧路径，使用既有 PROTOTYPE_FRAME。

## 安装与验证

- Node 24.4.1。npm 11.4.2 的 peer resolver 在 vitest 依赖解析时出现 edgesOut null；使用固定的原项目已安装版本，并通过仓库 .npmrc 的 legacy-peer-deps 保持 npm ci 可复现。
- 干净 npm ci：通过，274 packages；无需父仓库 node_modules。
- npm run check:assets：106 个资源 SHA-256 校验通过。
- npm test：4 项 openingTimeline 测试通过。
- npm run build：TypeScript 与生产构建通过；Three.js / VRM 分包仍有超过 500 KB 的既有体积提示。
- Dev 5180：真实 3D 成功播放至 targetLock；VRM、HDR、5 段 VRMA、纸飞机 GLB 从独立服务成功加载；截图与原版对照，修复 SVG 空白后 hero top=0。
- Production preview 5181：四语 × 7 页共 28 个深链接通过；另验证 YouTube iframe 地址、产品注册链接、390px 无横向溢出、根路径重定向，共 32 项通过。详见 browser-verification.json。四语页面矩阵使用 prefers-reduced-motion，真实 3D 另在 dev 验证。
- 页面异常为 0、本地 HTTP 4xx/5xx 为 0、完成加载的破图为 0；YouTube iframe 请求在测试切换页面时中止，未将其计为播放成功。
- 没有测试真机 Safari/iOS、外部报名/反馈 API、YouTube 完整播放；npm 报告两个 moderate 依赖问题，迁移没有自动做破坏性升级。

## 发布状态

仅组织私有仓库与本地运行；没有部署、切换域名或发布生产。素材/字体与产品范围的既有待确认事项见 docs/website/OPEN_ITEMS.md；Koko review、Cory/小徐发布确认仍待确认。

后续官网开发以本仓库为入口。旧仓库暂保留官网副本作为回滚来源，尚未删除或改它的生产路由。
