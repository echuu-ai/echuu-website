# 内测码 × Google Sheet 设计（小团队版 · 待扣扣 review）

> 目标:内测码用一张 **Google Sheet** 当后台(Cory 手动审批、发码、看状态),官网输入码能校验并进主程序。**尽量不养服务器、不改动已就绪的前端契约**。
> 这是对 [`website-beta-invite-backend-spec.md`](website-beta-invite-backend-spec.md)(完整 DB 版)的**轻量替代**,内测阶段用这版;以后量大了再升级到 DB 版。
> 相关现成件:前端 [`auth/AccessDialog.tsx`](../src/website/auth/AccessDialog.tsx) / [`auth/api.ts`](../src/website/auth/api.ts) / [`auth/inviteCode.ts`](../src/website/auth/inviteCode.ts)、码生成脚本 [`scripts/invite-codes.mjs`](../scripts/invite-codes.mjs)。

## 0. 全流程(小团队手动审批)

1. 访客点官网「参与内测」→ 目前没接口 → 邮件申请,**同时发到 `cory@echuu.ai` + `cory958014884@gmail.com`**(已配好,见 `config/site.ts` 的 `CONTACT_RECIPIENTS`)。
2. Cory 在邮箱看到申请 → 决定通过 → 在 **Google Sheet** 加一行码(或用 `scripts/invite-codes.mjs` 批量生成后粘进去),填上对方邮箱、有效期 → 用 `cory@echuu.ai` 把码发给对方。
3. 对方在官网「登录」输入码 → 前端调 `VITE_INVITE_REDEEM_ENDPOINT` → 后端查 Sheet、校验、标记已用 → 返回 `redirect_url` 跳进主程序。

> 候补申请这步**先不做自动化**(邮件够用)。要省事也可换成一个 Google Form(回复自动进 Sheet),但非必需。

## 1. Google Sheet 结构

一张表,主要用 `Codes` 这个 tab:

| 列 | 含义 |
|---|---|
| `code` | 内测码(ECHU-XXXX-XXXX-C,`inviteCode.ts` 生成) |
| `assigned_email` | 发给谁(审批时填) |
| `status` | `unused` / `sent` / `redeemed` / `revoked` |
| `created_at` / `sent_at` / `redeemed_at` | 时间戳 |
| `expires_at` | 建议发码后 30 天 |
| `redeemed_ip` | 兑换来源(后端写) |
| `note` | 批次 / 备注 |

> 内测量小,码可先存明文(方便 Cory 在表里肉眼核对);要更稳就存 `sha256(code)`,两种后端都支持,review 时定。

## 2. 兑换后端:两种实现(推荐 A)

前端 [`api.ts`](../src/website/auth/api.ts) 现有契约:`POST {code}` → `{status:"redeemed", redirect_url}`,用 `Content-Type: application/json`、`credentials:'omit'`、`redirect:'error'`;`redirect_url` 的 origin **必须等于** `https://echuu.live`(`validateProductRedirect` 强校验)。

### ✅ 方案 A(推荐):Vercel Serverless Function + Google Sheets API

官网本来就部署在 Vercel。加一个函数 `api/redeem.ts`,**和官网同源**(`https://www.echuu.ai/api/redeem`)→ **没有任何 CORS 问题,前端一字不用改**。

- 函数用 **Google Sheets API + 服务账号(service account)** 读写那张 Sheet。
- 把 Sheet 共享给服务账号邮箱(Editor)。
- 密钥放 **Vercel 环境变量(服务端,不带 `VITE_` 前缀)**:`GOOGLE_SA_EMAIL`、`GOOGLE_SA_PRIVATE_KEY`、`BETA_SHEET_ID`、`PRODUCT_TICKET_SECRET`。
- 前端 env 指向它:`VITE_INVITE_REDEEM_ENDPOINT=https://www.echuu.ai/api/redeem`。
- ⚠️ `vercel.json` 现有 catch-all `{"src":"/.*","status":404,...}` 会吃掉 `/api/*`,需在它**前面**加一条放行:`{"src":"/api/(.*)","dest":"/api/$1"}`(review 时确认)。

函数逻辑:
1. `normalizeInviteCode(code)` + 本地校验位(移植 `inviteCode.ts`),错 → `410`。
2. 读 Sheet 找该 code:不存在/已用/过期/revoked → `410`(统一,不区分,防枚举)。
3. 标记 `status=redeemed`、写 `redeemed_at`/`redeemed_ip`。Sheets 无事务,用「先读 status 再条件写」+ 可接受的小概率并发(内测量级足够);要更严就加一列锁。
4. 签发一次性票据 → `redirect_url = https://echuu.live/auth/invite-callback?ticket=<JWT ≤120s, 单次>`(见 §3)。
5. 返回 `200 {"status":"redeemed","redirect_url":...}`。
6. 限流:按 IP(如 10 次/10 分钟),超限 `429`。

### 方案 B(不想加函数):Google Apps Script Web App

Apps Script 直接绑 Sheet,`doPost` 当接口。**但有 CORS 坑,前端要改**:
- Apps Script 不处理预检:前端得把 `Content-Type` 改成 `text/plain`(简单请求、不触发预检),后端 `JSON.parse(e.postData.contents)`。
- Apps Script `/exec` 会 302 到 `googleusercontent.com`(那层才带 `Access-Control-Allow-Origin: *`),所以前端 `redirect:'error'` 必须改成 `redirect:'follow'`。
- 没有真正的服务端密钥保护、限流弱。
→ 省了 Vercel 函数,但要动 `api.ts` 且稳健性差。**小团队也更推荐 A**(前端零改动、同源、可放密钥)。

## 3. 进主程序的交接(唯一要和 echuu.live 对齐)

兑换成功后把用户带进 echuu.live。官网与产品**不同域**,用**一次性签名票据**:
- `redirect_url = https://echuu.live/auth/invite-callback?ticket=<JWT>`,票据 ≤120s、单次、绑定 `assigned_email`,签名密钥两端共享(`PRODUCT_TICKET_SECRET`)。
- 产品端 `/auth/invite-callback` 校验票据 → 建会话 → 进首页。
- 若兑换后端和主程序是**同一套服务**,也可直接建会话、`redirect_url` 指向产品首页。

👉 **这是唯一需要扣扣跟产品端确认的点**,其余都已定。

## 4. 临时密码 / 账号

内测阶段兑换 = 验证身份后直接进产品;**不在 Sheet 里存任何密码**。产品端的账号/密码由主程序自己管(票据带过去的是身份,不是密码)。

## 5. 安全小结(内测量级可接受)

- 码 40bit 随机,暴力不可行;仍加 IP 限流。
- 服务账号密钥只在 Vercel 服务端,绝不进前端 / 不带 `VITE_`。
- 错误统一 `410`,不透露码是「不存在/已用/过期」。
- Sheet 只给服务账号 + 团队核心成员访问,别公开分享。

## 6. 待扣扣 review / 落地清单

1. 选方案 A(Vercel 函数,推荐)还是 B(Apps Script)。
2. §3 产品交接:独立票据 vs 同服务建会话(需产品端加 `/auth/invite-callback` 或等价入口)。
3. 码存明文还是哈希。
4. 方案 A 的 `vercel.json` `/api` 放行 + 四个服务端环境变量。
5. 候补申请是否要从「邮件」升级成 Google Form / 写 Sheet(非必需)。
