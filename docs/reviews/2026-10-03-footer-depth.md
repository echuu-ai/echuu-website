# 页脚色彩与响应式对齐

参考：用户本轮附图与 Figma SbqimktgOKSM7cnvWGs8hk / 2038:1044，实时 get_design_context 含截图；页脚背景节点2038:1048/1049。Standard 对齐，非逐像素复刻。范围为辅助线和底部色彩/翅膀响应式，保留当前四语内容、FAQ与博客。

原稿两层渐变包含#006BCE、#264ECE、#000。之前实现单层浅天空蓝、按整个footer高度拉伸，加上翅膀降饱和/透明度导致发灰。现共享主体末端色为#006BCE；页脚从浓蓝沉入黑，渐变距离clamp(680px,68vw,980px)，不会因手机链接纵向重排而拉长。沿用原有本地footer-wings.webp及webm/mov动态资源，恢复opacity .94、去额外去饱和，模糊降到2–5px。桌面翅膀上限1084px与设计素材宽度对齐；手机110vw居中裁切，取消通用max-width限制，避免定位尺寸与实际缩放不一致。

辅助线常态stroke alpha .26→.10，入场flash .75→.22；路径结构和reduced-motion不变。

验证：类型检查/Vite构建、138资源校验、diff空白检查通过。1440×1000和390×844浏览器检查；手机scrollWidth=390，翅膀429px由footer裁切，无水平滚动，标题两行和链接两列。截图footer-desktop.png/footer-mobile.png（同日期前缀）。原有大chunk提示保留，未做真机验证或修改Figma文件。未提交/推送/部署。
