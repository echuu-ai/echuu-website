# Motion Pack Attribution

VRMA 动作包托管在 S3（`nextjs-vtuber-assets`，`animations/vrma/` 前缀），
注册表见 `src/data/vrmaRemotePacks.ts`。

## fm-pack-01 — 8 个短动作

- 作者：へすい / rerofumi (@rerofumi)
- 授权：**CC0 1.0（公有领域）** —— 可改、可再分发、不要求署名
- 原包：`fm_vrma_motion_pack_01.zip`

## vroid-pack — 7 个动作

- 版权：**pixiv Inc. / VRoid Project**
- 原包：`VRMA_MotionPack.zip`
- 商用**必须**展示以下署名之一：
  - `Animation credits to pixiv Inc.'s VRoid Project`
  - `キャラクターアニメーション: ピクシブ株式会社 VRoidプロジェクト`

### 一个需要留意的条款

原始条款的「禁止事项」里包含：

> Distributing these motions or their alterations without permission in a way
> that can be rigged or extracted.

当前这 7 个文件放在公开可读的 S3 上（永久 URL、任何人可直接下载），严格讲落在
这条描述内。此风险在上传前已提出，由项目方知情后决定按公开托管处理。

若之后要收紧，做法是把 `animations/vrma/vroid-pack/` 下的对象改为私有，由后端
签发短期预签名 URL（FastAPI 侧已有 `S3_PRESIGNED_DOWNLOAD_EXPIRES_SECONDS`
配置）。届时只需改 `vrmaRemotePacks.ts` 里这一个包的 URL 解析方式。

其它禁止事项（宗教/政治用途、贬损第三方、色情或显著暴力内容等）同样适用，见原包
`Readme_VRMA_MotionPack_EN.txt`。

## oror pose packs — 108 个 pose（Unity 源文件）

- 来源：`Oror_MensposeFullset`（`Oror_Aluepose` / `Oror_Komanopose` / `Oror_Minasepose` 三个 unitypackage）
- S3：`animations/unity-anim/oror/`，清单 `animations/unity-anim/oror/manifest.json`
- 原始格式：Unity Mecanim humanoid muscle clip（`.anim`），单帧静态 pose，S3 上留档
- **已烘成 VRMA**：`animations/vrma/oror/`，108 个，52 根 humanoid 骨骼（含手指），
  这是 motion lab 实际加载的版本；注册表 `src/data/ororPoses.ts`

### 授权状态：未确认

三个 unitypackage 里没有附带任何 readme 或利用規約。Oror 的 pose 包是 BOOTH 付费商品，
这类通常禁止再分发；当前这 108 个文件放在公开可读的 S3 上（永久 URL、任何人可下载）。

**这一点在上传前已提出，由项目方决定按公开托管处理。** 请在正式发布前核对购买页条款；
若禁止再分发，把 `animations/unity-anim/oror/` 下的对象改为私有并走后端预签名。
