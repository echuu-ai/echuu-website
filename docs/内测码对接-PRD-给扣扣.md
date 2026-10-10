# 内测码对接 PRD(给扣扣)

## 一句话现状

官网侧的内测码兑换**已经做完并上线跑通了**:用户在官网 www.echuu.ai 输入内测码 → 官网后端校验通过 → 把用户带到产品站 `echuu.live`。
现在兑换成功后只是跳到 `echuu.live/?beta=1`(过渡态,产品端还不知道这人是谁);**就差产品端"收到人、建登录态"这一环,需要你来接。**

## 需要你配合的(就两步)

### 第 1 步:商定一个共享密钥 `BETA_TICKET_SECRET`

- 由你或我生成一串随机长字符串(32 位以上),**两边用同一个**。
- 官网侧:我在官网 Vercel 环境变量里填这个 `BETA_TICKET_SECRET`。
- 产品侧:你在产品后端环境变量里填**同一个值**。
- 一旦官网配了这个密钥,跳转 URL 会**自动**从 `echuu.live/?beta=1` 变成带票据的:
  ```
  https://echuu.live/auth/invite-callback?ticket=<xxx.yyy.zzz>
  ```

### 第 2 步:产品端做一个 `/auth/invite-callback` 接收页/接口

收到 `?ticket=` 后,**校验票据 → 建立登录态 → 跳进产品主界面**。

票据就是一个标准 **JWT(HS256 签名)**,你用任何 JWT 库(jsonwebtoken / jose 等)都能验,逻辑:

1. 用共享密钥 `BETA_TICKET_SECRET` 验签(算法固定 `HS256`)。
2. 校验 `exp`:**有效期只有 120 秒**,过期拒绝。
3. 校验 `jti`:**单次使用**——把用过的 jti 存起来(Redis/DB 均可),重复出现就拒绝(防重放)。
4. 取 `sub` = 这个用户绑定的邮箱(发码时填的 assigned_email,可能为空)。
5. 全部通过 → 给这个用户建会话 / 发你们自己的登录 token → 跳产品主页。
6. 任一步失败 → 跳回一个「链接无效或已过期,请重新兑换」的提示页。

票据 payload 长这样(解出来给你看结构,不用死记):
```json
{ "sub": "someone@example.com", "iat": 1699999999, "exp": 1700000119, "jti": "一次性随机串" }
```

> 要点:HS256、exp 120 秒、jti 单次。密钥只在两边服务端,别进前端、别进仓库。
> 如果你们产品端账号体系用邮箱做主键,`sub` 就是现成的绑定依据;如果 sub 为空(发码时没填邮箱),就按"匿名内测用户"建号即可。

## 内测码本身:生成与发放形式(你了解即可,不用你做)

这块官网侧已经全包了,列清楚方便你对齐认知:

- **码形态**:`ECHU-XXXX-XXXX-X`,Crockford Base32 编码 + 1 位校验位(用户抄错一位,官网前端当场就能识别报错,不打到后端)。
- **一人一码、用一次**:兑换成功后该码立即作废。
- **后台**:Google Sheet(cory@echuu.ai 名下)的 `Codes` 表,一行一个码,记录状态/绑定邮箱/有效期/兑换时间/兑换 IP。
- **发放**:Cory 在 Sheet 里挑一个 unused 的码 → 填对方邮箱 → 发给对方。对方在官网输码即兑换。
- **你不需要生成或管理码**,也不需要碰这个 Sheet;你只负责**收到带票据的跳转**之后的事。

## 验收标准(对接完成的判定)

1. Cory 发一个真实内测码 → 在官网输码 → 浏览器落到 `echuu.live/auth/invite-callback?ticket=...`。
2. 产品端验签通过 → 用户**直接处于已登录状态**,进入产品主界面,无需二次登录。
3. 同一个票据链接**第二次打开失效**(jti 单次)。
4. 把系统时间或等 >120 秒后再打开同一链接 → **失效**(exp 过期)。

## 参考(需要细节时看)

- 官网侧实现:`api/redeem.ts`(单文件 Vercel 函数)。
- 票据生成逻辑:`api/redeem.ts` 里的 `buildRedirectUrl()`。
- 更早的完整设计:[website-beta-invite-sheet-design.md](website-beta-invite-sheet-design.md) §3、[website-beta-invite-backend-spec.md](website-beta-invite-backend-spec.md)。
