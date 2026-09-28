# 四语文案表与术语表

状态：**执行初稿。日/英/韩未经母语审校**（见 `docs/website/OPEN_ITEMS.md` D1）。
简体中文是信息基准稿。四语表达相同事实与功能状态，采用自然的当地表达，不逐字硬译。

实现位置：`src/website/i18n/zh-CN.ts`（基准）、`ja.ts`、`en.ts`、`ko.ts`。
类型上四语 key 与数组长度必须一致，缺 key 会在 `tsc` 阶段报错。

---

## 1. Hero

| 内容 | 简体中文 | 日本語 | English | 한국어 |
|---|---|---|---|---|
| 品牌 tagline | `To recreate life out of live` | 同左（原样保留英文） | 同左 | 同左 |
| 品类说明 | 为 Original Character 打造的 AI VTuber 平台 | Original Character のための AI VTuber プラットフォーム | An AI VTuber platform for your Original Character | Original Character를 위한 AI VTuber 플랫폼 |
| 用途 | 设定角色、选好话题，让 TA 讲故事，和观众互动。 | キャラクターを設定して、話題を選ぶ。物語を語り、視聴者と交流する配信へ。 | Define your character, choose a topic, and let them tell stories and interact with viewers. | 캐릭터를 설정하고 주제를 골라 보세요. 이야기를 들려주고 시청자와 소통하는 방송이 시작됩니다. |
| 主 CTA（有接口时） | 申请内测 | クローズドベータに申し込む | Join the beta waitlist | 비공개 베타 신청 |
| 主 CTA（当前，邮件流程） | 邮件申请内测 | メールでベータ参加を申し込む | Apply for the beta by email | 이메일로 베타 신청 |
| 次 CTA | 看演示 | デモを見る | Watch the demo | 데모 보기 |
| 状态 | 内测中，功能持续更新。 | クローズドベータ版。機能は順次更新中です。 | In closed beta. Features are still evolving. | 비공개 베타 진행 중. 기능은 계속 업데이트됩니다. |

## 2. 核心术语

| 中文 | 日本語 | English | 한국어 |
|---|---|---|---|
| Original Character（原创角色） | オリジナルキャラクター | Original Character | 오리지널 캐릭터 |
| 杂谈回 | 雑談配信 | Chat & stories | 토크 방송 |
| 观影回 | 動画リアクション配信 | Video reactions | 영상 리액션 방송 |
| 歌回 | 歌配信 | Singing streams | 노래 방송 |
| 制作中 | 開発中 | In development | 개발 중 |
| 内测演示 | ベータ版デモ | Beta demo | 베타 데모 |
| 本地预研演示 | ローカル環境の試作デモ | Local prototype demo | 로컬 프로토타입 데모 |
| 创作者合作 | クリエイターとの協業 | Creator partnerships | 크리에이터 협업 |
| AI 内容披露 | AI 生成コンテンツについて | AI content disclosure | AI 생성 콘텐츠 안내 |
| 待取得素材 | 素材は取得待ち | Material pending | 자료 확보 예정 |

**对外统一使用 `Original Character` 与 `AI VTuber`。**
不使用 `OC`、`オリキャラ`、`자캐` 等圈内缩写替代首屏完整名称。后续正文可自然使用「角色 / キャラクター / character / 캐릭터」。

## 3. AI 与角色权利（三句摘要）

必须与最终采用的条款一致。第三句同时约束本官网的素材选择和申请流程。

| # | 简体中文 | English |
|---|---|---|
| 1 | AI 参与表演：角色的对话、语音等表演内容可能由 AI 生成。 | AI takes part in the performance: dialogue, voice, and other performance content may be AI generated. |
| 2 | 角色权利不转移：你对原创角色和素材保留原有权利；第三方素材遵循各自授权。 | Rights do not transfer: you keep your existing rights to your Original Character and assets. Third-party assets follow their own licences. |
| 3 | 展示另征同意：申请内测或上传角色，不等于同意被官网展示。 | Showcasing needs separate consent: applying for the beta or uploading a character is not consent to be featured on this site. |

日韩文见 `src/website/i18n/ja.ts`、`ko.ts` 的 `trust` 段。

> 注意：Notion 存在广泛商用许可表述。本站**没有**把它压缩成「所有输出绝对归你、任意商用」；第三方模型、声音、音乐的授权边界在条款中保留。

## 4. 文案硬约束（本次遵守情况）

| 约束 | 遵守情况 |
|---|---|
| 对外不写 `OC` | ✅ 全站零出现 |
| 首屏正文最多两行 | ✅ 品类说明一行 + 用途一句 |
| 中文区块标题 ≤ 14 字 | ✅ 最长「下一位登场的，是你的 Original Character。」为申请区标题，含专有名词，按规则不缩写 |
| 首页自写营销正文 ≤ 700 汉字 | ✅ 实测 607 字（只计标题、说明、条目正文、宣言、脚注；不含导航、署名、按钮、标签、表单、法律全文） |
| 不用「赋能／重塑／革新／一站式／无限可能／下一代／生态闭环／解锁无限潜能」 | ✅ 全站零出现 |
| 不声称角色有真实意识、不说 AI 代替画师、不承诺永不 OOC/永久记忆 | ✅ |
| 不重复解释同一卖点 | ✅ 技术名词（VRM）只在三步区脚注出现一次 |

## 5. 排版检查要点

- 英文允许自然换行；日文 `line-break: strict` 避免行首标点；韩文 `word-break: keep-all` 保留词间空格。
- 中文字数限制**不套用**其他语言；不为塞下译文缩字号。
- 品牌 tagline 在四语下都使用英文品牌字体规则，不套用 CJK 字体（`.hero__tagline` 固定 `--font-brand` 并带 `lang="en"`）。
- 每种语言分别在 390px 与 1440px 检查（结果见 `docs/website/VERIFICATION.md`）。
