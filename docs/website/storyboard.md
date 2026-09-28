# 网页分镜 S01–S10（实现对照）

总原则：文字与操作先可用，动效只提供节奏。页面自然滚动到底，**不劫持滚轮、不强制翻页、不等待 3D 才显示按钮**。
所有入场动效都有 `prefers-reduced-motion` 路径（`src/website/styles/global.css` 的 `.reveal` 规则）。

| 镜头 | 实现位置 | 桌面构图 | 触发 / 时长 | 移动端 | reduce motion |
|---|---|---|---|---|---|
| S01 初见 | `src/website/sections/Hero.tsx` + `components/HeroStage3D.tsx` | **3D 舞台**：产品的 HDR 天空 + 产品的角色剪影，文字落在左侧浅玻璃面板上 | 文字与 CTA **先可用**；3D 在首屏绘制完成后（`requestIdleCallback`，上限 2.2s）才开始加载，加载失败或 WebGL 丢失静默回到静态图层 | **不挂 3D**，保留静态天空色块；装饰隐藏，tagline 分两行不缩字，CTA 全宽 | **不挂 3D**，完全静止 |
| S02 看到表演 | `src/website/sections/VideoSection.tsx` | 16:9 视频框居中，上下只有标题与状态标签 | 入视口淡入 0.42s；**点击播放才加载 youtube-nocookie 播放器**，默认不向第三方发请求 | 同版式，宽度自适应 | 不淡入，不自动播放 |
| S03 我也能做 | `src/website/sections/StepsSection.tsx` | 左侧三步可点击列表，右侧对应图位 | 点击步骤按钮切换，无 pin、无滚动劫持、无必需手势 | 纵向堆叠，图位移到下方 | 无过渡 |
| S04 人设进入表演 | `src/website/sections/FeaturesSection.tsx` | 三张实例卡，第三张带「预研演示」标签 | 卡片依次淡入，间隔 60ms | 单列 | 全部静态显示 |
| S05 未来模式 | `src/website/sections/ModesSection.tsx` | 三张模式海报，状态标签醒目 | hover/focus 上抬 4px，0.18s；**制作中不做假播放**，只链接到内测联系区 | 单列，hover 位移关闭 | 无位移 |
| S06 角色展架 | `src/website/sections/GallerySection.tsx` | 自适应网格；**署名与状态始终可见，不靠 hover** | 点击打开 modal；Escape 关闭、焦点陷阱、关闭后焦点回到原按钮 | 单列 | 无入场动画 |
| S07 创作者 | `src/website/sections/CreatorsSection.tsx` | 左宣言右作品位，浅底 | 0.42s 轻入场 | 纵向，无横向溢出 | 直接显示 |
| S08 信任与日志 | `src/website/sections/TrustSection.tsx`、`JournalSection.tsx` | 三句透明说明 + 两条真实短记录 | 无叙事动画，只有链接状态反馈 | 全宽易读 | 同左 |
| S09 邀请 | `src/website/sections/ApplySection.tsx` | 标题、内测入口、真实邮箱与复制按钮 | 按钮 hover 0.15s；结果用文字状态（`aria-live`），无庆祝动画 | 输入区不被固定导航遮挡 | 无动画 |
| S10 留一笔 | `src/website/sections/CornersSection.tsx` → `src/website/pages/DoodlePage.tsx` | 页脚上方两个小入口 | **用户点击「开始画」后才初始化画布**；画布用 `touch-action: none` 只在画布内接管手势，不拦整页滚动 | 提供文字留言替代入口（邮箱） | 无动画 |

## 技术选择说明

- **没有引入 GSAP / ScrollTrigger**。本版分镜只有淡入、hover 与步骤切换，用 CSS 过渡加一个 `IntersectionObserver`（`src/website/components/Reveal.tsx`）即可，符合「不要为简单动画增加多套新依赖」。若后续要做 S03 的滚动分段编排，再按 `web-motion-stack` 的 `gsap-motion` 接入。
- **首屏 3D 复用产品既有实现**，没有另写一套：
  - 天空 = `src/components/LoadingWorld.tsx` 的 `LoadingSky`，本次给它加了可选的 `hdrPath`，官网传 `website/sky-1k.hdr`（0.89 MB），产品仍用默认的 65.5 MB 版本，行为不变。
  - 角色 = `src/components/LandingHeroVrm.tsx`，`variant="home"` `tone="dark"`，与产品首页三椭圆里用的是同一个组件、同一个模型、同一段动作。它渲染的是**剪影**（`applyLayerEffect` 的 `silhouette-black`），不是带贴图的角色。
- **仍然没有**把直播、麦克风、摄像头、登录与 LiveKit 链路搬进官网；**页面不申请任何设备权限**。
- 3D 只在桌面且未开启 reduced-motion 时挂载，窄屏（< 860px）与 `prefers-reduced-motion: reduce` 一律走静态图层，实测不下载 HDR 与模型。
- 不可见的视频不工作：未点击播放前 iframe 根本不存在。
- 涂鸦画布在离开页面时随组件卸载；不做后台循环。
