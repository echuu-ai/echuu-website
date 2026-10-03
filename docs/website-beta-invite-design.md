# 内测码：申请 → 邮件发码 → 输入进入主程序

2026-10-03 定（Cory：不要做复杂的邀请码 / 推荐体系，就是内测码）。前提沿用 [`docs/reviews/2026-09-29-invitation-access.md`](reviews/2026-09-29-invitation-access.md)：**内测码是登录凭据**，只能在服务端校验、兑换、建会话；官网静态托管不能自己判定码对不对。

## 1. 流程

1. 官网「参与内测」填邮箱 + 密码 → 服务端记一条申请（`VITE_BETA_ACCOUNT_ENDPOINT`，已有前端）。
2. 我们挑人通过 → 服务端给这个邮箱生成**一个**内测码，发邮件（模板 `emails/beta-invitation.zh.html`）。
3. 用户在官网「登录」输入内测码 → 服务端兑换（一码一人、只能用一次）→ 跳进主程序（`VITE_INVITE_REDEEM_ENDPOINT`，已有前端）。

没有渠道码、推荐码、奖励。要统计就看申请表和兑换记录。

## 2. 码的格式（已落地）

`ECHU-XXXX-XXXX-C`（[`src/website/auth/inviteCode.ts`](../src/website/auth/inviteCode.ts)）：8 位随机（去掉易混的 I L O U）+ 1 位校验位。用户抄错一位、两位写反，官网当场提示，不打到服务端；大小写、空格、连字符随便写。

早期手动发码可以先用 [`scripts/invite-codes.mjs`](../scripts/invite-codes.mjs) 生成一批（CSV：code / email / status / 发送时间 / 兑换时间），但码必须先录进服务端，主程序才认。

## 3. 后端要做的（两条接口 + 一封邮件）

- `POST /beta/waitlist {email, password, locale}` → `{status:"pending_invitation"}`
- `POST /beta/redeem {code}` → `{status:"redeemed", redirect_url}`；码只存哈希；兑换要限流（每 IP / 每码）。
- 通过申请时生成码并发邮件；可撤销、可设过期。

## 4. 邮箱：echuu.ai（Wix 买的域名）

现状（2026-10-03 查）：域名解析在 GoDaddy 的 nameserver（`ns31/32.domaincontrol.com`，Wix 买的域名常见情况），`echuu.ai` 指向一个 Wix 站点；**没有任何 MX / TXT 记录**，所以现在还收不了、也发不了 @echuu.ai 的邮件。

推荐做法（不转移域名，全在 Wix 后台的 DNS 记录里加）：

1. **收信 / 日常邮箱**（如 `hello@echuu.ai`、`cory@echuu.ai`）：开 Google Workspace（Wix 后台可以直接买，也可以在 Google 买再把 MX 加到 Wix）。不想付月费可以用 Zoho Mail 的免费档。
2. **发内测码**（如 `beta@echuu.ai`）：用事务邮件服务（推荐 Resend，接口简单、免费额度够内测用；也可以 Postmark / Amazon SES）。在服务里添加域名，它会给几条 TXT（SPF、DKIM）和一条 MX，原样加到 Wix 的 DNS 记录里；再加一条 DMARC TXT（`_dmarc` → `v=DMARC1; p=none; rua=mailto:你的邮箱`）。建议用子域名发信（如 `send.echuu.ai`），不影响主域的收信。
3. 后端发码时用 `beta@echuu.ai` 作发件人，回复地址设成 `hello@echuu.ai`。

以后官网不放在 Wix 了，可以考虑把 DNS 托管搬到 Cloudflare（免费、改记录快，自带免费的邮件转发）；那时要先把现有记录照抄过去。域名能不能转出、何时能转出以 Wix 后台为准。

## 5. 待定

1. 后端谁来做（两条接口 + 发信）。
2. 用 Google Workspace 还是 Zoho 收信；发信服务选哪家。
3. 内测码要不要设有效期（建议 30 天）。
