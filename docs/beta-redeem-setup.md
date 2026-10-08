# 内测码兑换：一次性配置清单（Cory 操作）

兑换逻辑已经做好了:Vercel 函数 [`api/redeem.ts`](../api/redeem.ts) + [`api/_lib.ts`](../api/_lib.ts),和官网同源、无 CORS、前端零改动。
你只需配好下面 4 步,兑换就能跑。Sheet 已确定:`1xGpZ_7AVomTEf67T0xGDt5BpD2Wz2JNdQ9yOUKAbUac`。

## 1. 建 Codes 表(在你的 Google Sheet 里)

1. 把一个工作表标签改名为 **`Codes`**(大小写一致)。
2. 把发给你的 `codes-seed.tsv`(表头 + 20 个码)**粘到 A1**。列顺序:
   `code | assigned_email | status | created_at | sent_at | expires_at | redeemed_at | redeemed_ip | note`
3. 以后要更多码,用 `node scripts/invite-codes.mjs --count 50` 生成后把 code 列贴进来,status 填 `unused`。

## 2. 建服务账号(Google Cloud,一次性)

1. [console.cloud.google.com](https://console.cloud.google.com) → 新建项目(或用现有)。
2. 搜索并**启用 “Google Sheets API”**。
3. 「IAM 和管理 → 服务账号」→ 创建服务账号 → 起个名(如 echuu-beta)→ 完成。
4. 点进该服务账号 → 「密钥 / Keys」→ 添加密钥 → **创建新密钥 → JSON** → 下载那个 JSON 文件。
5. 记下服务账号邮箱,形如 `echuu-beta@xxx.iam.gserviceaccount.com`。

## 3. 把 Sheet 共享给服务账号

打开你的 Sheet → 右上「共享」→ 把上面那个**服务账号邮箱**加进去,权限 **编辑者 / Editor** → 完成。
(否则函数没权限读写表。)

## 4. Vercel 环境变量(官网项目 → Settings → Environment Variables,Production)

| 变量 | 值 | 作用域 |
|---|---|---|
| `BETA_SHEET_ID` | `1xGpZ_7AVomTEf67T0xGDt5BpD2Wz2JNdQ9yOUKAbUac` | Production |
| `GOOGLE_SA_EMAIL` | 服务账号邮箱(第 2 步) | Production |
| `GOOGLE_SA_PRIVATE_KEY` | JSON 里 `"private_key"` 的值,**连同里面的 `\n` 一起原样粘贴** | Production |
| `PRODUCT_ORIGIN` | `https://echuu.live` | Production |
| `VITE_INVITE_REDEEM_ENDPOINT` | `/api/redeem` | Production(构建期变量) |
| `BETA_TICKET_SECRET` | 先留空 | — |

设完**重新部署**(`VITE_` 是构建期变量,必须重新部署才生效)。

> `GOOGLE_SA_PRIVATE_KEY` 是私钥、机密,只放 Vercel 服务端,别进仓库、别带 `VITE_` 前缀、别外发。

## 5. 发码流程(日常)

1. 有人申请(邮件到 cory@echuu.ai + gmail)→ 你决定通过。
2. 在 Codes 表挑一个 `unused` 的码,填 `assigned_email`(对方邮箱),想设有效期就填 `expires_at`(ISO 或日期,留空=永不过期)。
3. 用 `cory@echuu.ai` 把码发给对方;可把该行 `status` 改成 `sent`、填 `sent_at`。
4. 对方在官网「登录」输入码即可。

## 6. 验证

部署后到 www.echuu.ai → 打开「登录」→ 输入一个表里的码:
- 成功 → 跳到 `https://echuu.live/?beta=1`,且该行 `status` 变 `redeemed`、`redeemed_at`/`redeemed_ip` 被写入。
- 无效/已用/过期 → 前端提示无效(函数统一返回 410)。

## 以后交给扣扣的部分(产品端会话)

现在兑换成功只是把人跳到 `echuu.live/?beta=1`(过渡)。等产品端就绪:
1. 设 `BETA_TICKET_SECRET`(官网 Vercel)+ 产品端用同一密钥。
2. 产品端加 `/auth/invite-callback?ticket=`,校验票据(HS256、≤120s、单次)后建会话。
函数已经预留:一旦设了 `BETA_TICKET_SECRET`,`redirect_url` 自动带上签名票据,产品端照 [`website-beta-invite-sheet-design.md`](website-beta-invite-sheet-design.md) §3 接即可。
