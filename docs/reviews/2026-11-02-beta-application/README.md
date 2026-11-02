> 已被 Cory 后续确认的「用户名、邮箱、密码＋选填邀请码」注册流程取代。本文仅保留历史测试记录，不再是上线方案；参见 [最新验收](../2026-11-02-beta-registration/README.md)。

# 官网三字段内测申请 · 2026-11-02

- 目标：独立官网 echuu-ai/echuu-website；source baseline origin/dev `a17b740`。
- 页面：`/website/{zh,en,ja,ko}?access=signup`。
- 参考：Cory 的官网玻璃弹窗截图，standard 模式；保留现有字体/面板，改为可滚动三字段申请表。
- 范围：联系邮箱必填、角色简介和作品链接选填，发到既定运营两个邮箱；不创建账号、不占名额、不发星碎。
- 与后端关系：这是官网 Vercel 独立收集接口，不依赖 `api.echuu.live` 尚未发布的注册服务。正式审核、发号、登录、钱包仍是平台待办。

## 已验证

- 64 项 Vitest 通过（含 API 参数过滤、同源限制、错误返回、Resend 幂等、进程内限频，及弹窗未就绪/失败/重试/成功/兑换）。
- `npm run build` TypeScript + Vite 通过；既有 Three.js 大包提醒保留。
- `npm run check:assets`：146 项通过。
- 本地真实 HTTP server 调用实际 handler → Resend：200 submitted。再次提交 200 且 provider mail ID 相同，没有重复邮件。
- 测试发件人为 hello@echuu.ai，固定收件人为 cory@echuu.ai、cory958014884@gmail.com；正文标记“接口验收，不是用户申请”。
- 已覆盖公开邀请码兑换和主 App 密码登录出口；三字段表单没有密码控件。

## 未通过或未验证

- 官网 Vercel 环境变量读取与写入均返回 403；本机 CLI 无该团队权限。生产 `RESEND_API_KEY` 尚未确认配置，不能宣称官网自动收件可用。
- 系统 Chrome 自动化未连接。遵照 Cory“先完成代码和接口测试”，未用其他浏览器冒充系统 Chrome 验收；四语 390/1024/1440 实际截图、孤字检查、按钮 hover/focus 与手机真机待验收。
- 当前为运营邮箱留存，未接平台候补数据库或审核后台，未完成正式账号激活。未测试生产分析入库。
- 幂等去重有 24 小时窗口，限流只覆盖单进程；推广前需配置部署级别限流。

- Resend 发送确认 ID：`01a19bdd-0be1-7652-b501-c2b11b840924`。查询投递状态返回 401，当前 key 无读取权限；只能确认服务接受，无法声称两个邮箱均已投递或进入收件箱。
- 幂等行为参照 [Resend 官方文档](https://resend.com/docs/dashboard/emails/idempotency-keys)。
