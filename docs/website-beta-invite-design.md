# 内测邀请码：生成、记录、发放与推荐（设计稿）

2026-10-03。前提沿用 [`docs/reviews/2026-09-29-invitation-access.md`](reviews/2026-09-29-invitation-access.md)：**邀请码是登录凭据**，校验、兑换、建会话只能在服务端做；官网静态托管不能自己判定一个码是否有效。本文是方案，标「已落地」的部分已经在仓库里，其余等后端（api.echuu.live）与 Koko 确认。

## 1. 目标

- 好记录：每个码从哪来、发给了谁、谁用了、带来了谁，一张表看清楚。
- 好发放：私发、群发、KOL、活动都能用，不用每次找工程师。
- 能推荐：内测用户可以邀请朋友，推荐关系可追踪、可奖励、防刷。
- 安全：码不可猜、可撤销、可过期；泄露一个不影响其他。

## 2. 码的格式（已落地）

`ECHU-XXXX-XXXX-C`，实现见 [`src/website/auth/inviteCode.ts`](../src/website/auth/inviteCode.ts)，测试 `inviteCode.test.ts`。

- 主体 8 位 Crockford Base32（去掉 I / L / O / U），约 40 bit 随机，`crypto.getRandomValues` 生成。
- 最后 1 位是 mod 37 校验位：抄错一位、相邻两位换位**全部**能在本地发现。
- 输入容错：大小写、空格、连字符随便写，`O→0`、`I/L→1`。
- 官网弹窗先在本地查格式与校验位，抄错直接提示「好像抄错了一位」，不打到服务端；通过后把**规范化的 9 位**（不含 `ECHU`、不含连字符）发给兑换接口——服务端按这个形式存与比对。
- 40 bit 只防「猜」不防「刷」：服务端必须限流（见第 7 节）。

## 3. 三种码

| 类型 | 用途 | 使用次数 | 归属 |
|---|---|---|---|
| `single` 个人码 | 审核通过的申请、私发、邮件 | 1 | 发给谁记在 `issued_to` |
| `campaign` 渠道码 | 小红书 / 社群 / KOL / 活动 | `max_uses`（如 200），可设过期、可暂停 | `channel` + `owner`（如 KOL 账号） |
| `referral` 推荐码 | 已激活的内测用户邀请朋友 | 每个 1 次，每人默认 3 个 | `owner` = 推荐人用户 ID |

渠道码方便但风险高（截图一传就是公开码）：只给可信渠道、设上限和过期，看到异常增长立即暂停。

## 4. 发放流程

1. **官网申请 → 审核 → 发码**（主流程）：官网「参与内测」提交邮箱 → 进 Waitlist → 运营在表里勾「批准」→ 服务端生成 `single` 码并发邀请邮件（模板 `emails/beta-invitation.zh.html`）。
2. **渠道**：运营用脚本或后台批量生成 `campaign` 码，配 `?ref=<channel>` 链接投放；每个渠道单独一个码，转化可以分开统计。
3. **推荐**：用户激活后在主程序「邀请好友」里看到自己的 3 个推荐码 / 链接 `…/website/zh?invite=ECHU-XXXX-XXXX-C`。官网读到 `?invite=` 时自动打开邀请码弹窗并预填（**待做**，前端改动很小）。被邀请人兑换时记录推荐关系；推荐人在被邀请人**完成首次开播**后才得奖励（防刷），并可再获得新的推荐码。

## 5. Google Sheet：运营台账，不是数据源

数据源在服务端数据库（码只存 `sha256(code + pepper)`、状态、次数）；Sheet 是给运营看和操作的镜像。

| 页签 | 主要列 |
|---|---|
| Codes | code（未发放时可见，发放后只留后 4 位）· kind · channel · batch · owner · max_uses · uses · expires_at · status（unissued / issued / redeemed / exhausted / revoked）· created_at · issued_to · issued_at · note |
| Waitlist | email · locale · source(ref) · applied_at · 批准（勾选框）· code_last4 · invited_at |
| Redemptions | code_last4 · kind · channel · referrer · user_id · redeemed_at · activated_at（首次开播） |
| Referrals | referrer · 已发码数 · 已兑换 · 已激活 · 奖励状态 |
| Dashboard | 每个渠道：发放 → 兑换 → 激活 → 7 日留存（公式汇总上面几页） |

同步方式（推荐 A）：

- **A. 服务端推送**：兑换 / 申请 / 激活时，后端用 Google 服务账号（Sheets API）追加一行。实时、权限集中在后端。
- **B. Apps Script 拉取**：表格里每 5 分钟调用后台只读接口刷新。不碰后端代码，但有延迟。

运营操作（批准 Waitlist、生成一批渠道码、撤销）用 Apps Script 按钮调用后台管理接口；管理令牌放在 Script Properties，不写在表格里。

**现在就能用（已落地）**：后端上线前，可以用 [`scripts/invite-codes.mjs`](../scripts/invite-codes.mjs) 本地批量生成 CSV，直接导入 Codes 页做发放计划（`invite-codes-*.csv` 已 gitignore，CSV 本身就是凭据，不要发群里）。但**在服务端能兑换之前，这些码还不能登录**——导入后要一次性同步进数据库。

## 6. 需要的后端接口

| 接口 | 说明 |
|---|---|
| `POST /beta/redeem {code}` | 已在前端契约里（`VITE_INVITE_REDEEM_ENDPOINT`）：原子兑换，返回主程序一次性会话交换地址 |
| `POST /beta/waitlist {email, password, locale, ref?}` | 已在前端契约里（`VITE_BETA_ACCOUNT_ENDPOINT`），加 `ref` 记来源 |
| `POST /admin/invites/mint {kind, count, channel, batch, max_uses, expires_at, owner}` | 管理端生成，返回明文码一次（之后只存哈希） |
| `POST /admin/invites/{id}/revoke`、`…/pause` | 撤销 / 暂停 |
| `GET /me/referrals` | 主程序「邀请好友」页：我的推荐码与进度 |

## 7. 安全与防刷

- 兑换限流：每 IP、每设备、每码各自限速；连续失败加冷却。
- 码可撤销、可过期；渠道码有上限与暂停开关；没有万能码。
- 推荐奖励只在被邀请人激活后结算；同一邮箱 / 设备不重复计；每人推荐上限。
- Sheet 只给运营账号；发放后的码只显示后 4 位；导出 CSV 用完即删。
- 审计日志：谁生成、谁撤销、何时兑换。

## 8. 待确认（Cory / Koko）

1. 推荐奖励给什么（更多推荐名额？专属装扮？优先体验新功能？）——决定是否需要奖励发放逻辑。
2. 每人推荐码数量（默认 3）与是否随激活人数增加。
3. 是否开放 `campaign` 多次码，给哪些渠道。
4. 后端由谁实现、邮件服务商与发件域名。
5. Sheet 由谁维护、需要哪些人可见。
