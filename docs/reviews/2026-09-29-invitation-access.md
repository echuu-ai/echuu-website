# 官网邀请码入口 — 2026-09-29

轨道 integration；独立官网 dev + 未提交工作。平台基线 https://api.echuu.live/api/v1。用户确认当前没有邀请码或发信接口；本次不调用旧 users/signup 冒充完整邀请码流程。现有后端 signup 还有 require_legacy_password_flow 限制。

## 已实现

首页「登录」→邀请码弹窗；顶部/页脚「参与内测」→邮箱密码弹窗。Radix Dialog 管理 portal、模态焦点、Escape 与遮罩关闭；Motion 入场且支持 reduced-motion；CSS 玻璃高光、折射感渐变与 backdrop blur，无 React 官方 liquid glass 组件的虚假声明。四语文案，输入验证、显示密码、请求中状态、15 秒超时、取消与错误提示。口令只保存在组件内存，关闭清空，不写 localStorage、URL、分析日志。

本地默认主程序 http://localhost:5173（lsof 已确认 PID 64770 工作目录为主前端；5174 另有同目录进程）。生产仍使用现有 PRODUCT_ORIGIN=https://echuu.app，正式地址未新确认。不在浏览器内保存正确邀请码或实现客户端放行。

## 待后端实现的建议契约（不是现有 API）

环境变量 VITE_BETA_ACCOUNT_ENDPOINT：POST JSON {email,password,locale} → 202 {status:"pending_invitation"}。服务端校验密码、哈希存储、邮箱验证/去重/限流，并记录待邀请账号。不得返回密码；密码不入邮件。前端只在该明确状态显示申请已收到，不宣称邮件已发出。

VITE_INVITE_REDEEM_ENDPOINT：POST JSON {code} → 200 {status:"redeemed",redirect_url}。服务端将高熵、短期、单次邀请码与账号绑定，原子兑换，返回主程序白名单 origin 的短时一次性会话交换地址。无效/过期 400/401/403/410，限流 429。禁止共享万能码；代码作为登录凭据处理。前端验证重定向 origin/protocol/credentials，但这不能替代服务端校验。

主程序还需实现接收一次性交换凭据的回调与服务端 session 建立；跨域 localStorage 不共享，直接跳转不等于已登录。建议在 URL fragment 传一次性凭据，兑换后立即清理，禁止长期 access_token/query 参数。正式 callback 路径由后端与主程序共同确认后配置，不虚构已存在的回调。

未配置时显示「内测入口正在准备中」并禁用提交。不能在仅静态 GitHub Pages 托管上安全校验邀请码、存储密码或发送邮件；需要平台服务部署、CORS 允许官网来源。

## 邀请邮件

emails/beta-invitation.zh.html 是可定制中文模板。变量 display_name、invite_code、expires_at、website_login_url 由服务端转义后填充；URL 必须由可信配置产生。主题建议「{{display_name}}，你的 Echuu 舞台已准备好 ✦」。支持普通邮件客户端的 table 和内联 CSS，不依赖 backdrop-filter。未配置发件域名、发件账号或邮件服务，未发送真实邮件。后台批准邀请时生成邀请码并排队发送，保留失败重试与撤销能力。

状态：前端实现；真实邀请码校验/账号创建/主程序会话交接/邮件投递均未实现未验收，待后端接入。源码未推送。

验证：12 项测试、107 个资源校验、TypeScript/Vite 构建通过。内嵌浏览器真实 3D 背景上验证邀请码弹窗、切换邮箱密码表单、输入测试数据及 Escape 关闭；截图 /tmp/echuu-invite-dialog.png、/tmp/echuu-beta-dialog.png。尚无真实服务端成功用例。

静态预览已发布：e180821a850f15ac04efa26b7039636218517cfe，GitHub Actions 36451525711 成功。仅发布前端，服务端配置为空，注册/兑换按钮禁用。最后浏览器确认关闭后焦点返回「参与内测」，重新打开邮箱与密码为空。
