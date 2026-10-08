# 内测码后端实现规格（交给后端/扣扣直接照做）

配套前端已就绪，本文档只定**服务端**。前端契约见
[`src/website/auth/api.ts`](../src/website/auth/api.ts)、
[`src/website/auth/inviteCode.ts`](../src/website/auth/inviteCode.ts)、
流程设计见 [`website-beta-invite-design.md`](website-beta-invite-design.md)。

**铁律**：内测码 = 登录凭据。官网是静态托管，**不能**判定码是否有效；有效性、是否用过、属于谁，全部只能服务端判定。码在库里**只存哈希**，不存明文。

---

## 0. 两条接口总览（前端已在调用，契约不能改字段名）

| 接口 | 前端 env | 方法/体 | 成功响应 |
|---|---|---|---|
| 候补申请 | `VITE_BETA_ACCOUNT_ENDPOINT` | `POST {email, password, locale}` | `{"status":"pending_invitation"}` |
| 兑换码 | `VITE_INVITE_REDEEM_ENDPOINT` | `POST {code}` | `{"status":"redeemed","redirect_url":"https://echuu.live/..."}` |

前端 `fetch` 用 `credentials:'omit'`、`cache:'no-store'`、`redirect:'error'`。接口必须 HTTPS。CORS 允许来源 `https://www.echuu.ai`（上线正式站）；本地联调时也放行 `http://localhost:5180`。

### HTTP 状态 → 前端错误映射（务必按这个返回，否则用户看到的提示不对）

前端 [`api.ts`](../src/website/auth/api.ts) 的 `post()` 这样翻译：

| 你返回的状态 | 前端表现 |
|---|---|
| `429` | `rate`（请求太频繁，稍后再试） |
| `400 / 401 / 403 / 410` | `invalid`（码无效 / 已用 / 过期 —— 统一提示，不区分） |
| 其它非 2xx | `failed`（失败，请重试） |
| 2xx 但字段不对 | `failed` |

**反枚举**：码不存在 / 已用 / 过期 / 未分配，一律返回同一类错误（建议 `410`），响应体不透露具体是哪种，错误信息不含「此码不存在」这类可被探测的措辞。

---

## 1. 数据模型（建议 Postgres）

```sql
-- 候补申请（官网填邮箱+密码）
waitlist(
  id            uuid pk,
  email         citext unique not null,
  password_hash text not null,          -- argon2id / bcrypt，绝不存明文
  locale        text not null,          -- zh/en/ja/ko
  status        text not null default 'pending',  -- pending|invited|active|rejected
  created_at    timestamptz not null default now(),
  invited_at    timestamptz,
  invite_code_id uuid references invite_codes(id)
)

-- 内测码（一码一人、用一次）
invite_codes(
  id            uuid pk,
  code_hash     text unique not null,   -- sha256(hex) of 规范化后的 9 位码，只存哈希
  status        text not null default 'unused',   -- unused|redeemed|revoked
  assigned_email citext,                -- 审批通过时绑定到某邮箱；null=未分配
  batch_note    text,
  created_at    timestamptz not null default now(),
  assigned_at   timestamptz,
  sent_at       timestamptz,
  expires_at    timestamptz,            -- 建议发码后 30 天
  redeemed_at   timestamptz,
  redeemed_ip   inet,
  redeemed_ua   text
)
```

码的**规范化与校验位**算法与前端一致，直接移植 [`inviteCode.ts`](../src/website/auth/inviteCode.ts) 的 `normalizeInviteCode` + 校验位（Crockford Base32 去 I/L/O/U，8 位主体 + 1 位 mod37 校验）。入库前先规范化再 `sha256`。

---

## 2. `POST /beta/waitlist` 候补申请

**请求**：`{ email, password, locale }`

**逻辑**：
1. 服务端**重新校验**：email 合法；password 长度 ≥ 12（与前端 `minLength` 一致），建议查弱密码；locale ∈ {zh,en,ja,ko}。不合法 → `400`。
2. `password_hash = argon2id(password)`。
3. upsert waitlist（email 唯一）。**幂等**：邮箱已存在也返回成功，不透露「该邮箱已申请」（防枚举）。
4. 限流：按 IP（如 5 次/小时）+ 全局。超限 → `429`。
5. 成功 → `200 {"status":"pending_invitation"}`。

> 不发任何「提交成功即可登录」的假象；这步只是进候补池。

---

## 3. `POST /beta/redeem` 兑换码（核心）

**请求**：`{ code }`（用户输入，可能带空格/连字符/大小写）

**逻辑（必须原子、单次使用）**：
1. `normalizeInviteCode(code)` → 本地校验位检查。格式/校验位错 → `410`（当作 invalid，不打库也行）。
2. `code_hash = sha256(normalized)`。
3. **原子**认领（防并发双花）：
   ```sql
   UPDATE invite_codes
      SET status='redeemed', redeemed_at=now(), redeemed_ip=$ip, redeemed_ua=$ua
    WHERE code_hash=$hash
      AND status='unused'
      AND (expires_at IS NULL OR expires_at > now())
   RETURNING id, assigned_email;
   ```
   无行返回（不存在/已用/过期）→ `410`。
4. 激活该码绑定的账号：`waitlist.status='active'`（按 `assigned_email`）。
5. **签发进入主程序的一次性票据**（见 §4）→ 组装 `redirect_url`。
6. 成功 → `200 {"status":"redeemed","redirect_url":"<见 §4>"}`。

**限流**：按 IP（如 10 次/10 分钟）+ 全局兑换速率。超限 → `429`。
（码空间约 40bit，暴力几乎不可能，但仍需限流防刷。）

**撤销/过期**：`status='revoked'` 或 `expires_at` 已过的码，兑换一律失败。可随时撤销。

---

## 4. 进入主程序的交接（⚠️ 唯一需要和 echuu.live 对齐的点）

兑换成功后要把用户「带进」主程序 echuu.live。官网与产品是**不同域名**，跨域 Cookie 不可靠，所以用**一次性票据**交接：

- `redirect_url = https://echuu.live/auth/invite-callback?ticket=<一次性签名票据>`
- 票据建议：短时效 JWT（≤120s）、**单次使用**、绑定 `assigned_email`/account id，签名密钥后端与产品端共享。
- 产品端 `/auth/invite-callback` 校验票据 → 建立产品会话 → 跳转到产品首页。

**前端已强约束**：[`api.ts`](../src/website/auth/api.ts) 的 `validateProductRedirect` 要求 `redirect_url` 的 origin **必须等于** `https://echuu.live`（`VITE_PRODUCT_ORIGIN`），且 https、无账号密码。所以 `redirect_url` 只能指向该域名，否则前端拒绝跳转。

> 👉 **扣扣需确认**：echuu.live 是否已有（或愿意加）`/auth/invite-callback?ticket=` 这个入口？如果主程序后端和本接口是**同一套服务**，也可以直接在该服务里建产品会话、`redirect_url` 指向产品首页即可——二选一，由产品架构定。这是唯一的架构决策点，其余都已定。

---

## 5. 审批 → 发码 → 发信

1. 运营在后台挑选 `waitlist.status='pending'` 的人通过。
2. 取一个 `unused` 且未分配的码（或现场生成），`assigned_email=该邮箱`、`assigned_at=now()`、`expires_at=now()+30d`、`waitlist.status='invited'`。
3. 发邮件（模板 [`emails/beta-invitation.zh.html`](../emails) 已有），正文含**明文码**（库里只有哈希，明文只在这一刻发出）。发件 `beta@send.echuu.ai`，回复 `hello@echuu.ai`。
4. 记 `sent_at`。
5. 邮件服务推荐 **Resend**（免费额度够内测）；域名 DNS（SPF/DKIM/DMARC）加到 GoDaddy，见设计文档 §4。

早期可用 [`scripts/invite-codes.mjs`](../scripts/invite-codes.mjs) 本地批量生成 CSV，但**码必须先入库（存哈希）** 服务端才认。

---

## 6. 已定的默认值（扣扣可按需微调）

- 码有效期：**发码后 30 天**。
- 密码哈希：**argon2id**。
- 兑换限流：IP 10 次/10 分钟；候补 IP 5 次/小时。
- 错误一律不区分「不存在/已用/过期」，统一 `410`（防枚举）。
- 一次性票据：JWT ≤120s、单次、绑定账号。

## 7. 待扣扣确认/落地

1. §4 的产品交接方式（独立票据 vs 同服务直接建会话）。
2. 后端技术栈与托管（建议和主程序同栈，减少一处运维）。
3. 邮件服务最终选型（Resend / Postmark / SES）与 DNS 落地。
