# 内测注册接入 · 2026-11-01

采用已定规则：1,000 个内测名额，仅前 300 位获得 3,800 星碎。公开邀请链接 `/website/{locale}?access=signup&ref=…` 打开注册；一次提交后服务端发码，官网自动兑换并通过产品 `/auth/invite-callback` 交接到主 App 首页（`/#landing/home`）。Galatea 由用户从主 App 的角色生成入口主动进入。手工兑码保留为兜底，已有账号链接直接进入产品密码登录。

Vercel 服务端必须配置 `BETA_PLATFORM_API_BASE=https://api.echuu.live/api/v1` 和与平台一致的 `BETA_WEBSITE_API_KEY`。浏览器默认 `/api/redeem?action=register`、`/api/redeem`，无配置时明确失败，不伪造注册成功。`VITE_PRODUCT_ORIGIN` 必须与平台 `BETA_PRODUCT_ORIGIN` 一致；默认 `https://echuu.live`。

上线依赖平台钱包分支 `codex/shards-wallet-p0`、迁移 `bb78c2258731`、BETA_PUBLIC_ENABLED=true、legacy/hybrid 密码模式，以及产品 `/auth/invite-callback` 页面。平台 logto-only 时此链路关闭，需同身份 OIDC 集成；不能只发布官网便宣布可用。

推荐首触保留 7 天，注册成功后清理；服务端最终固定归属，不可用客户端请求覆盖。二维码仅含公开推荐码，登录码和交接票据不进分析。GA 页面地址清除 query/hash，初始 referrer 只传 origin。公开内测序号、QR 与 PNG 在主产品邀请卡生成。

原 Google Sheet 兑码逻辑被真实平台 BFF 取代。若线上已发有效旧码，必须先审计/导入资格映射再切换；本次未读取或迁移生产表格。部署前确保平台接口已就绪、专用密钥配置齐全，并在真实域名走通注册→兑码→会话→钱包。

验证：49 项测试、资产检查、生产构建；隔离官网 5181→API 8003→产品 5174 真实注册/兑换/3800 赠额和推荐计数通过。四语注册规则已检查；物理手机、正式域名与生产分析入库待验收。仅交付 dev，不代表正式发布。

## 2026-11-01 · 1,000 人之后的候补名单

官网打开注册入口时调用同源 `GET /api/redeem?action=availability`，转发平台 `GET /api/v1/beta/availability`。只接受 `capacity=1000` 且 `issued` 与 `status=open/full` 一致的响应；接口错误显示准备中与重试，不冒充满额。

- 有名额：邮箱、密码注册，自动兑换本人内测码并进入主 App。前 300 位仍为 3,800 星碎，第 301–1,000 位无赠额。
- 满额：四语言面板切为只填联系邮箱的 Join the waitlist。注册时恰好满额（409）也切换，保留邮箱、清除密码，等用户主动提交候补。
- `POST /api/redeem?action=waitlist` 仅转发邮箱、语言和公开推荐码，不转发密码或任意附加字段。平台提交成功后才显示成功。
- 平台 `beta_waitlist` 按规范化邮箱唯一保存，记录首次语言、有效邀请人、创建时间和联系同意版本；并发重试幂等，不创建账号、内测号、钱包或欢迎邮件。
- 已有账号／内测码的登录入口始终保留。通知下一批开放时间尚需运营发起，不会因为加入候补立即发出欢迎邮件或承诺名额。
- 新增 `waitlist_viewed/completed/failed` 事件；成功事件代表提交获确认，唯一候补人数以数据库去重记录为准，不把邮箱、邀请码放进埋点。

### 发布依赖

平台须包含迁移 `32fcda42961e` 与 `/beta/availability`、`/beta/waitlist`，并沿用现有注册／兑换／exchange 与邮件 worker 配置。官网服务端配置 `BETA_PLATFORM_API_BASE` 和与平台一致的 `BETA_WEBSITE_API_KEY`。不增加客户端密钥。

实施时生产检查：`api.echuu.live` 的 OpenAPI 尚无 beta/wallet 路径；官网注册空载荷返回 503 unavailable，尚不能标记生产闭环通过。后端发布入口及官网生产环境变量权限待提供。

验证：官网 54 项测试、146 项资产校验和生产构建通过；后端相关 19 项及全量钱包 141 项回归通过。实际浏览器通过本地代理调用隔离 PostgreSQL，候补提交后回读 1 条记录。四语言 × 390/1024/1440 共 12 组浏览器检查零溢出、零孤字，按钮单行；证据见 docs/reviews/2026-11-01-waitlist/。
