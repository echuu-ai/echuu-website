# 内测注册接入 · 2026-11-01

采用已定规则：1,000 个内测名额，仅前 300 位获得 3,800 星碎。公开邀请链接 `/website/{locale}?access=signup&ref=…` 打开注册；一次提交后服务端发码，官网自动兑换并通过产品 `/auth/invite-callback` 交接到主 App 首页（`/#landing/home`）。Galatea 由用户从主 App 的角色生成入口主动进入。手工兑码保留为兜底，已有账号链接直接进入产品密码登录。

Vercel 服务端必须配置 `BETA_PLATFORM_API_BASE=https://api.echuu.live/api/v1` 和与平台一致的 `BETA_WEBSITE_API_KEY`。浏览器默认 `/api/redeem?action=register`、`/api/redeem`，无配置时明确失败，不伪造注册成功。`VITE_PRODUCT_ORIGIN` 必须与平台 `BETA_PRODUCT_ORIGIN` 一致；默认 `https://echuu.live`。

上线依赖平台钱包分支 `codex/shards-wallet-p0`、迁移 `bb78c2258731`、BETA_PUBLIC_ENABLED=true、legacy/hybrid 密码模式，以及产品 `/auth/invite-callback` 页面。平台 logto-only 时此链路关闭，需同身份 OIDC 集成；不能只发布官网便宣布可用。

推荐首触保留 7 天，注册成功后清理；服务端最终固定归属，不可用客户端请求覆盖。二维码仅含公开推荐码，登录码和交接票据不进分析。GA 页面地址清除 query/hash，初始 referrer 只传 origin。公开内测序号、QR 与 PNG 在主产品邀请卡生成。

原 Google Sheet 兑码逻辑被真实平台 BFF 取代。若线上已发有效旧码，必须先审计/导入资格映射再切换；本次未读取或迁移生产表格。部署前确保平台接口已就绪、专用密钥配置齐全，并在真实域名走通注册→兑码→会话→钱包。

验证：49 项测试、资产检查、生产构建；隔离官网 5181→API 8003→产品 5174 真实注册/兑换/3800 赠额和推荐计数通过。四语注册规则已检查；物理手机、正式域名与生产分析入库待验收。仅交付 dev，不代表正式发布。
