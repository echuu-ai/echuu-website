# 来源核对（source audit）

日期：2026-09-17。范围：Echuu 官网首版。
本文把**已核对的事实**和**未证实项**分开。未证实项不进入对外文案。

---

## 1. 已核对的事实

| 事项 | 证据 | 采用口径 |
|---|---|---|
| 产品定位 | 主仓库 `src/data/siteChrome.ts`：`TURN YOUR ORIGINAL CHARACTER INTO AI VTUBER`、`AI VTUBER LIVE STREAMING PLATFORM` | 面向 Original Character 的 AI VTuber 创作与直播平台 |
| 品牌 tagline | 同上：`TO RECREATE LIFE OUT OF LIVE` | 首屏大字号 H1，原样保留英文 |
| 蓝白配色 | `docs/project/VERSION_LOG.md` 2026-09-17「三椭圆恢复共享连续色场」等多条：`#FFFFFF / #6EC9F7 / #C7E9FF` | 官网品牌锚点色 |
| 联系邮箱 | `src/data/siteChrome.ts` → `contactEmail: 'cory@anngel.live'` | 官网默认联系邮箱 |
| X 账号 | 任务书记录 `https://x.com/Echuu_AIVTUBING` | 页脚唯一社交项 |
| Discord / 微信群 | `siteChrome.ts` 只有文案标签，**没有真实邀请链接** | 页脚不列出，不造邀请链接 |
| 本地预研录制 | `~/Desktop/Echuu-预研完整演示-主题-弹幕-礼物-MVP.mp4`，ffprobe：384.016 秒、1108x720、h264 | 与版本记录「6 分 24 秒」一致；标为**本地预研演示** |
| 预研内容 | 已抽帧查看：角色在天空舞台、「剧本生成中」、「剧本预览」、聊天面板与字幕 | 弹幕/礼物影响剧情有本地实录，**无云端生产验收** |
| 短记录主题 | 主仓库 `src/website/components/BlogPage.tsx` 三条中英短段落 | 以「短记录」呈现，保留来源 |
| 条款文件 | `public/legal/` 三个 HTML 文件存在且可访问 | 按原样提供，保留草案状态 |
| 字体资源 | 主仓库 `public/fonts/`，`manifest.json` 一律标 `local-font-asset` | 除 Inter、Shippori Mincho（附 OFL）外，许可均未核实 |

---

## 2. 未证实 / 未取得

| 事项 | 情况 | 处理 |
|---|---|---|
| Notion Beta 文档正文 | WebFetch 返回空内容（页面为 JS 渲染 SPA） | **未读到远端内容**。文案与素材索引依据任务书记录和本地仓库，不冒称已读 Notion |
| Notion GIF 素材 P01–P06 | 同上，未取得文件 | 三步开播、Features、Gallery 相应位置显示「待取得素材」，不生成假缩略图 |
| 介绍视频 `qvF5M1orvcU` | 链接来自任务书；未能在本会话内播放确认内容 | 作为已公开链接嵌入（点击才加载），状态标「内测演示」 |
| 215 人候补、价格、发布日期、平台 Logo 墙 | 无证据 | 全站不出现 |
| 观影回 / 歌回 | 任务书记录 Notion 标「制作中」 | 显示「制作中」，不提供假体验入口 |
| 母语审校 | 未进行 | 四语文案标为执行初稿（见 `docs/website/OPEN_ITEMS.md`） |

---

## 3. 需要团队处理的冲突（重要）

### 3.1 CoryNoRootBone 的作者与授权与条款表述冲突

现行用户协议 4.4 条写：

> 除 CoryNoRootBone（Echuu 主张拥有的唯一预置角色模型）外，Echuu 不拥有服务中展示、预置或用于演示的其他角色模型。

但 `public/assets/charactermodel/corynorootbone.vrm` 文件内嵌的 VRM0 meta 是：

```
title                : 冬藏
author               : 一方亦行QQ897682512
licenseName          : Redistribution_Prohibited
allowedUserName      : ExplicitlyLicensedPerson
commercialUssageName : Disallow
```

文件本身声明第三方作者、禁止再分发、禁止商用。这与「Echuu 主张拥有」不一致。

**本次处理**：不把该角色用于官网品牌展示；`docs/website/asset-manifest.json` 标 `rightsStatus: conflict`、`productStatus: blocked`；发布闸门会拦截。需要团队核实实际授权文件后再决定条款或素材哪一侧需要更正。

### 3.2 其他预置模型不可用于官网营销

9 个 VRoid 样例模型内嵌 meta 均为 `commercialUsage: personalNonProfit`、`avatarPermission: onlyAuthor`，多数 `modification: prohibited`、`creditNotation: required`。官网属商业宣传用途，因此**没有任何本地 VRM 被用于官网展示**。

### 3.3 预研录制画面的角色授权未确认

本地预研视频中的角色模型作者未确认。抽取的 5 帧只放进**内部 moodboard**（noindex），不进入对外页面。

### 3.4 中文标题字体缺字

`pugua-qianyun-song.woff2` 是子集，实测只含 **599 个字形**。本站中文标题文案中缺失的字包括：

```
三 两 做 儿 功 只 呢 哪 属 志 披 摸 测 涂 申 研 讲 谁 露 顺 鱼 鸦
以及部分拉丁字母与全角标点（。，？）
```

因此中文标题暂用系统中文字体栈，不套用会大量回退的子集字体。需从原字体重新取子集并确认授权。

---

## 4. 本次没有做的事

- 没有提交或推送主仓库 `nextjs-vtuber-mocap`；其未提交工作区保持原样。
- 没有调用任何业务接口，没有改变平台或 AI 引擎的接入与部署状态。
- 没有配置第三方账号、域名、分析或收费服务。
- 没有把任何内容对外发布。
