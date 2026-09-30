# OPEN ITEMS — 需要团队补齐或决定的事项

日期：2026-09-17。官网首版已完成本地实现；以下事项**不在本次执行范围**或需要团队确认。
每项标注：谁来定 / 拦不拦发布。

---

## A. 发布闸门会拦截的项（`npm run website:gate` 失败）

| # | 事项 | 现状 | 需要 |
|---|---|---|---|
| A1 | 用户协议定稿 | `terms.html` 仍含草案与占位项 | 法务/团队定稿后把 `src/website/config/site.ts` 的 `LEGAL_FINALIZED` 改为 `true` |
| A2 | 正式域名 | 未确认。资料中出现过多个域名，本次不替团队选 | 确定后设 `VITE_SITE_ORIGIN`，canonical 与 hreflang 才会输出 |
| A3 | 品牌英文字体授权 | PP Editorial New 本地只有个人使用 EULA | 取得商业授权后设 `VITE_BRAND_FONT_LICENSED=1`，或换成有明确许可的英文衬线字体 |
| A4 | CoryNoRootBone 权利冲突 | 文件内嵌 meta 显示第三方作者、禁止商用与再分发，与条款 4.4 冲突 | 核实实际授权文件；决定更正条款还是更换素材。详见 `docs/website/source-audit.md` §3.1 |

## B. 素材

| # | 事项 | 现状 | 需要 |
|---|---|---|---|
| B1 | Notion GIF P01–P06 | 未取得（页面 JS 渲染，WebFetch 返回空） | 由团队导出原文件并附来源页面、作者、许可；放入 `public/` 后更新 `docs/website/asset-manifest.json` |
| B2 | 三步开播的三张真实界面 | 显示「待取得素材」 | 取得 onboarding 截图或短片（需遮挡个人信息） |
| B3 | Features 三张配图 | 同上 | 人设输入→输出、话题→故事、弹幕/礼物→回应各一张 |
| B4 | Gallery 作品 | 只有已公开的介绍视频一条 | 需要可公开展示且已取得展示同意的作品；展示同意要与内测申请分开征集 |
| B5 | 画师作品 | 创作者区显示「待取得素材」 | 需要一张已授权的真实画师作品与署名 |
| B6 | 预研录制的角色授权 | 未确认，5 帧只在内部 moodboard | 确认作者与授权后才能对外使用 |
| B7 | 图片格式 | 本机没有 WebP 编码器，首屏天空图为 880px PNG（300KB） | 转 WebP/AVIF 可再减约 60%，建议在有编码器的环境处理 |
| B8 | 中文标题字体 | 蒲瓜子集缺字（599 字形） | 从原字体重新取子集并确认授权；当前用系统中文字体栈 |
| B9 | Maru Buri 许可 | 未附许可文件 | 核实韩文标题字体商用条款 |
| B10 | Shippori Mincho 体积 | 3.3MB（仅 ja 触发下载） | 建议取子集 |

## C. 服务与表单

| # | 事项 | 现状 | 需要 |
|---|---|---|---|
| C1 | 内测报名接口 | **没有接通**。全站 CTA 为邮件申请，不显示假成功 | 提供已验证的接口地址后设 `VITE_BETA_SIGNUP_ENDPOINT`，只改配置即可切换全站 CTA |
| C2 | 意见箱收件 | **没有接通**。只提供打开邮件客户端与复制 | 同上，设 `VITE_FEEDBACK_ENDPOINT` |
| C3 | 涂鸦公开投稿 | **没有接通**。只有本地画布与导出 | 需要真实存储、授权选择、审核、举报/删除流程后再开放 |
| C4 | 商务邮箱差异 | `siteChrome.ts` 为 `cory@anngel.live`；Notion 另列 `cory958014884@gmail.com` | 确认对外统一使用哪一个；当前官网只用前者，后者仅在配置里留记录 |

## D. 本地化

| # | 事项 | 现状 | 需要 |
|---|---|---|---|
| D1 | 母语审校 | 日/英/韩为**执行初稿，未审校** | 各语言母语审校；术语表见 `docs/website/copy-deck.md` |
| D2 | 法律文件译本 | 只有中文原文 | 官网已按「源文语言 + 无审定译本」如实说明，不生成假的 hreflang 对应页。需要译本时应另存为标明未审定的审阅稿 |
| D3 | 短记录译文 | 中英来自主仓库，日韩为本次初稿 | 审校 |

## E. 部署与域名

| # | 事项 | 现状 | 需要 |
|---|---|---|---|
| E1 | 生产域名与根路径映射 | 站点 base 为 `/website/`，可挂在现有域名下而不占用 `/` | 团队决定域名与反向代理/重写规则 |
| E2 | 三个条款文件的线上路径 | 本仓库内为 `/website/legal/*.html` | 若要保持 `/legal/*.html`，需在部署层加重写规则 |
| E3 | 部署方式 | 本次**没有部署**，也没有配置任何第三方账号 | 由团队决定（静态托管即可，`npm run build` 产出 `dist/`） |
| E4 | 分析/追踪 | 本次**没有新增**任何追踪或广告脚本 | 若要加入，需另行评估隐私政策与披露文案 |

## F. 明确不在本次范围

- 重做直播 app、后台系统或完整社区。
- 介绍视频精剪成片（剪辑表见 `docs/website/video-cut.md`，未产出成片）。
- 真实 VRM / 3D 在官网首屏运行（首版为静态品牌图层）。
- 产品 app 的完整功能回归（登录、开播、VRM、LiveKit）。
- 仓库既有测试套件（本次未运行 `npm test`）。
- 任何提交、推送或部署。

## G. 并入产品仓库后新增的决定项（2026-09-17）

官网从独立仓库并入 `echuu-ux-r3f-vite` 之后，继承了 app 的一些全局行为。
这些都是**既有行为**，不是官网新加的脚本，但官网是新的对外表面，需要团队确认是否保留。

| # | 事项 | 现状 | 需要决定 |
|---|---|---|---|
| G1 | 访问统计 | `src/main.tsx` 的 `initAnalytics()` 在所有路由前无条件执行，官网页面会向 `analysis.e.echuu.live/api/track` 发请求 | 官网是否保留统计。保留的话需要在隐私政策里覆盖这条数据流；不保留就把 `initAnalytics()` 移到非官网分支 |
| G2 | Google Fonts | `index.html` 里有 `fonts.googleapis.com` 的样式表，所有页面都会请求 | 官网是否接受这个第三方请求。要去掉需改 `index.html` 或对官网单独处理 |
| G3 | BlendCursor | app 的自定义光标（一个 WebGL canvas）会盖在官网上 | 营销页是否要自定义光标。要关掉需在 `renderRoot` 里对官网分支跳过 |
| G4 | 首屏预算 | 独立仓库时官网首屏 gzip 81.7 KB、零第三方请求；并入后官网 chunk 仍独立（133 KB 未压缩），但多了上面三项 | 是否要为 `/website` 单独裁掉 app 全局 chrome，把预算恢复到并入前 |
| G5 | 共享导航白名单 | 已在 `src/lib/pageTransition.ts` 把 `/website` 加进 SPA 路由白名单 | 这是对共享文件的改动，需 review |
| G6 | 语言代码 | 任务书写 `/website/zh-CN/`，实现按 app 对齐用 `/website/zh`；`html.lang` 与 hreflang 仍输出 `zh-CN` | 确认以 app 为准 |
| G7 | 独立仓库去留 | `CoryLee1/echuu-website`（private）仍在，内容已并入本仓库 | 归档还是删除 |
| G8 | 3D 复用 | **已实现**。首屏接了 `LoadingSky`（官网专用 0.89 MB HDR）与 `LandingHeroVrm`（剪影）。仅桌面、仅首屏绘制后加载 | 见下面 H 节的体积与授权问题 |


## H. 首屏 3D 的代价与待办（2026-09-18）

桌面首屏接入 3D 后的实测传输量：

| 资源 | 传输 | 说明 |
|---|---|---|
| `website/sky-1k.hdr` | 547 KB | 由 `HDR_IntoTheClouds.hdr`（9.3 MB）四倍降采样而来，脚本 `scripts/website/downsample-hdr.py`。产品直播间默认那张是 65.5 MB，官网没有用 |
| `assets/charactermodel/naked.vrm` | 8 547 KB | 文件本体 15 MB |
| 官网 JS | 约 1.37 MB | 含 three / R3F / drei，按需加载，不进产品主包 |

移动端与 `prefers-reduced-motion: reduce` 下实测 **HDR 与模型都为 0 KB**，只有静态图层。

| # | 事项 | 现状 | 需要 |
|---|---|---|---|
| H1 | **角色模型可以瘦一大截** | `LandingHeroVrm` 把模型渲染成纯色剪影（`applyLayerEffect` 的 `silhouette-black`），但 `naked.vrm` 里有 **21 张贴图**，这些字节下载了却完全没用上 | 出一份只留几何与骨骼、去掉贴图与材质的剪影专用 VRM。粗估能把 15 MB 降到 1–2 MB 量级，需实测 |
| H2 | 角色姿势 | 定格在前空翻中段（`VARIANT_CONFIG.home.freezeProgress = 0.42`），读起来是在云里翻腾 | 确认这个姿势适合官网首屏；要换需给 `LandingHeroVrm` 加一个 freeze 参数，属共享组件改动 |
| H3 | 模型授权 | 用的是 `naked.vrm`，内嵌 meta 为 pixiv VRoid Project、`commercialUsage: personalNonProfit`、`avatarPermission: onlyAuthor` | **这是官网首屏最显眼的元素，公开发布前必须解决**。产品登录页已经在用同一模型，等于问题已经存在，不是官网新引入；但官网会放大它 |
| H4 | 中文标题字体 | 已改为复用 app 的 `--font-brand-title`，但中文是唯一例外：蒲瓜纤云宋只有 599 字形，盖不住本站文案，仍走系统字体 | 重新取子集后删掉 `global.css` 里的 zh 例外 |
| H6 | 官网不套产品影调分级 | `LoadingSky` 新增 `colorGrade` 开关，官网传 `false`，保持蓝白品牌色且跨浏览器一致 | 确认这是想要的：官网与产品 app 的影调会有差异 |
| H7 | 跨浏览器验证 | 已覆盖 Chromium 与伪装的 WebKit 路径；真机 Safari / iOS Safari 未测 | 发布前在真实 Safari 与 iOS 上过一遍 |
| H5 | HDR 画质 | 682×341，肉眼看够用，放大或换构图可能不够 | 需要更高画质时调 `downsample-hdr.py` 的倍数，权衡体积 |


## I. 首页 v2（2026-09-28）新增待办

| # | 事项 | 现状 | 需要 |
|---|---|---|---|
| I1 | 开场标题字体 | Figma 用 KyivType Sans，仓库无授权文件，回退 PP Editorial New / Noto Serif SC | 取得授权后加 @font-face |
| I2 | 中文标题字体 | 蒲瓜纤云宋子集缺 83 个所需字形，改用 Google Fonts 的 Noto Serif SC 300 | 重新取子集或确认接受 Noto Serif SC；同时确认 42dot Sans / Agu Display 的 Google Fonts 请求 |
| I3 | 开场模型 | 使用 `assets/loading/corynorootbone.loading.vrm`（31 MB，与产品 loading 共用），首屏桌面会下载；A4 的权利冲突同样适用 | 确认授权；可考虑再压一份官网专用版 |
| I4 | 社交图标 | CTA 条上的小红书 / bilibili / QQ / Discord 只有图标没有真实地址，按装饰处理，只有 X 可点 | 提供真实地址 |
| I5 | 「注册」按钮 | 指向产品 `/#landing/sign-up` | 确认官网与产品域名关系后调整 |
| I6 | 日 / 英 / 韩文案 | `src/website/i18n/home.ts` 为执行初稿 | 母语审校 |
| I7 | 真机验证 | 只在内嵌 Chromium 验证桌面与 375×812 | 真实 Safari / iOS / Android 过一遍，尤其开场窗口 FLIP 与 backdrop-filter |

## 2026-09-30 条款审阅更新（优先于上述历史条款状态）

已补四语用户协议、隐私政策、独立未成年人说明与AI披露；清理未核实承诺和预览子路径死链。LEGAL_FINALIZED仍为false。运营主体登记资料、年龄准入、后端数据地图、供应商/跨境/保存删除及素材权利仍须确认，详见 [条款审阅记录](../legal/2026-09-30-review.md)。本次只更新本地审阅稿，未部署或推送。

同日更新：Anngel LLC及公开注册代理地址、16+门槛已由Cory提供；S3两桶为us-east-2且无生命周期过期规则，素材桶有版本保留。详见[实查报告](../legal/2026-09-30-storage-and-age-audit.md)。公司注册州、生产数据库、备份、完整删除与供应商控制台设置仍待核查。

同日竞品对照：用户协议扩展为四语13节，增加原则不退款、取消续费区分、平台许可、第三方风险、按法律限制的责任上限提案与企业索赔责任。仍为本地审阅稿；正式收费前必须实现结账前提示/必要同意、版本留存、取消/退款和失败任务纠正。见[竞品对照与发布缺口](../legal/2026-09-30-comparative-terms-review.md)。验证：109项资产校验、14项测试、TypeScript及Vite构建通过；浏览器中文退款锚点及英语切换通过。构建仍有既有大包提示，未部署。

地区适配：用户协议第14节和隐私第11节已同步四语中日美补充；地区规则不由语言决定，日本轻过失免责、中国跨境及美国州隐私权按条件适用。日本特商法表记所需负责人/电话、各地实际同意/退出/续费提醒流程仍需补齐。详见[地区适配记录](../legal/2026-09-30-regional-adaptation.md)。109资产、14测试及构建通过，中文条款与日文隐私浏览器展示通过；仅本地审阅稿，未发布。

2026-09-30范围更正（优先于以上收费待办）：当前仅免费内测，四语已移除购买/订阅/不退款规则和地区付费细节，暂不开展收费材料工作。知识产权、反滥用及有限责任保护保留；隐私/跨境/未成年人义务仍需落实。历史收费研究仅供以后开启商业化时参考。见[免费内测范围](../legal/2026-09-30-free-beta-scope.md)。

OCM参考后收紧承诺：移除专门导出机会保证，明确无固定运行/修复/客服SLA、无绝对安全或全部恢复保证；供应商训练保留仍以实际合同配置核查为准。保留法定通知、请求期限和有限授权，不变更免费内测范围。见[参考记录](../legal/2026-09-30-ocm-reference.md)。
