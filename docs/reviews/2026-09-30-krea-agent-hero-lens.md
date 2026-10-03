# Krea Agent 首屏「黑洞输入框」效果拆解（2026-09-30）

来源：https://www.krea.ai/app 首屏（SvelteKit + three.js），在 1440×900 用内嵌浏览器读 DOM / 计算样式，并从 `/_app/.../chunks/Cimjh1Qu.js` 里取出 shader 源码。仅供学习，不复制其素材。

## 结构：三层叠加

```
<section class="relative isolate bg-black overflow-hidden">
  <img  src="agent-starfield-backdrop.webp" class="absolute inset-0 object-cover">   ← 静态星空底图（首帧 / 降级）
  <canvas class="absolute inset-0 transition-opacity motion-reduce:…">               ← WebGL2，three.js，淡入覆盖底图
  <h1>A new era</h1> <p>…</p>
  <div class="relative">                                                              ← 输入框（promptElement）
    <div class="agent-streaks absolute -inset-1 rounded-[36px]" aria-hidden />       ← CSS 轨道光条
    <textarea …>
  </div>
</section>
```

关键点：**形变不是 CSS，是把整片星空先渲染到一张纹理，再用一个全屏 shader 按输入框的矩形做「引力透镜」采样**；输入框自己是普通 DOM，光条是 CSS。

## 第 1 层：星空（three.js Points → RenderTarget）

- 一个 `THREE.Points`，几何上放几千颗星，属性：`position`、`color`（HSL 随机：8% 偏红、1% 偏蓝、其余 0.55 附近的蓝白）、`star = (亮度, 能量, 角度, 长宽比)`。
- 透视相机放在 z ≈ -4900 的位置绕一条大圆缓慢运动（`sin(h)*g`），并按指针位置做微小 rotateX / rotateY 视差（`damp` 平滑）。
- 顶点 shader：按距离算点大小 `diameter = clamp(star.x*1400/distance, 0.45, 3.8)`，`gl_PointSize = diameter*7+5`；`energy` 随距离与时间闪烁（`sin(time*(0.7+star.w)+star.z)`）。
- 片元 shader：每颗星是**旋转 + 拉伸的高斯核**（`mat2(cos,-sin,sin,cos)`，`p *= vec2(inversesqrt(aspect), sqrt(aspect))`），核心 `exp(-dot(p,p)*65)` 加一个偏移的「肩膀」高光，所以近处的星有细长的拖影感。
- `blending: AdditiveBlending`，`depthTest/Write: false`，输出到一张 `WebGLRenderTarget`（`c`），不是直接上屏。

## 第 2 层：透镜后期（全屏 quad + 自定义 fragment）

uniforms：`tDiffuse`（星空纹理）、`resolution`、`box`（输入框中心 xy + 半宽半高 zw，像素）、`radius`（输入框圆角）、`amount`（0→1 的进入进度）、`mass`（hover 时 1→1.35）、`arrival`、`time`、`quiet`（中心静区椭圆）。

```glsl
uniform sampler2D tDiffuse;
uniform vec2 resolution, quiet;
uniform vec4 box;
uniform float radius, amount, mass, arrival, time;
varying vec2 vUv;
void main() {
  // 1. 到圆角矩形的有符号距离（SDF）
  vec2 p = vUv * resolution - box.xy;
  vec2 q = abs(p) - box.zw + radius;
  float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;

  // 2. 点质量透镜方程套在圆角矩形上：source = impact - einstein² / impact
  float horizon  = max(box.w, 24.0);
  float impact   = horizon + max(edge, 0.0);
  float einstein = horizon + 26.0 * mass;
  float source   = impact - einstein * einstein / impact;
  vec2 direction = normalize(p / max(box.zw, vec2(1.0)) + vec2(0.00001));
  vec2 bent      = (box.xy + p * 0.45 + direction * source * 1.8) / resolution;

  // 3. 只在框外 45–115px 的环带里做形变，其余保持原样
  float influence = amount * (1.0 - smoothstep(45.0, 115.0, edge));
  vec2 sampleUv   = mix(vUv, bent, influence);
  vec3 light = texture2D(tDiffuse, clamp(sampleUv, 0.0, 1.0)).rgb;

  // 4. 中心静区压暗（让标题可读）+ 框内压黑
  float clear = 1.0 - smoothstep(0.35, 1.0, length((vUv*2.0-1.0 - vec2(0.0,0.34)) / quiet));
  clear *= mix(1.0, smoothstep(12.0, 48.0, edge), amount);
  light *= pow(1.0 - arrival * clear * 0.98, 2.0);
  light *= mix(1.0, smoothstep(-1.0, 1.0, edge), amount);

  // 5. 事件视界：沿框边缘 ±3px，切向 33 次采样把星光「压」成一圈亮环
  float ring = edge - 0.65;
  float pixel = max(fwidth(edge), 0.001);
  float coverage = clamp((ring+0.25)/pixel+0.5, 0., 1.) - clamp((ring-0.25)/pixel+0.5, 0., 1.);
  if (amount > 0.0 && abs(ring) < 3.0) {
    vec3 compressed = vec3(0.0);
    vec2 tangent = vec2(-direction.y, direction.x);
    for (int i = -16; i <= 16; i++) {
      float weight = exp(-pow(float(i)/9.0, 2.0));
      for (int j = -1; j <= 1; j++) {
        vec2 ray = bent + (tangent*float(i)*7.0 + direction*float(j)*18.0*mass) / resolution;
        compressed += texture2D(tDiffuse, clamp(ray, 0., 1.)).rgb * weight;
      }
    }
    light += amount * (coverage + exp(-abs(ring)/0.6)*0.3) * compressed * 1.8;
  }

  // 6. 框外 20px 内的蓝色光晕，沿环绕角度流动
  float distance = max(edge, 0.0);
  float orbit = atan(direction.y, direction.x) + time * 0.56;
  float flow  = 0.12 + 1.4 * pow(0.5 + 0.32*sin(orbit*2.0) + 0.18*sin(orbit*5.0), 2.0);
  float flare = max(exp(-distance/20.0) - exp(-5.0), 0.0) * 0.035 * flow;
  light += amount * smoothstep(-0.5, 0.5, edge) * vec3(0.5, 0.72, 1.0) * flare;

  gl_FragColor = vec4(light, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```

**为什么看起来像黑洞**：第 2 步是真正的引力透镜公式（点质量：像点距离 = 源距离 − 爱因斯坦半径² / 源距离），只是把「到中心的距离」换成了「到圆角矩形边缘的 SDF 距离」，所以框附近的星被拉向框边、框外一圈被挤成亮环（第 5 步的切向采样让环上出现拉长的光丝），再远处不受影响。`mass` 在 hover 时增大，透镜变强。

### 驱动（每帧 JS）

- `box` 每帧从 `promptElement.getBoundingClientRect()` 换算成画布像素（注意 y 轴翻转：`e.bottom - r.bottom + r.height/2`），`radius` 取输入框的 `border-top-left-radius`；输入框可以随意布局，形变自动跟随。
- 时间线：`p = smootherstep(t, 0.8, 4.4)` 控制相机从远处飞入；`arrival = smootherstep(t, 1.8, 3.2)` 让星空变亮、中心压暗；`amount = smootherstep(t, 2.2, 3.2)` 让透镜从无到有；4.4 s 后进入常态，只剩缓慢漂移与指针视差。
- `ResizeObserver` 同时观察画布与输入框；`document.hidden` 时停循环；`prefers-reduced-motion` 直接跳到终态并停止；`webglcontextlost` 时停用画布，露出底图。
- 渲染顺序：`setRenderTarget(starfield RT) → render(points) → setRenderTarget(null) → 全屏 quad 渲染透镜 shader`。

## 第 3 层：输入框周围的光条（纯 CSS）

```css
.agent-streaks { filter: url(#agent-streak-texture) drop-shadow(0 0 2px #fff) drop-shadow(0 0 9px #75baff); opacity: .65; }
.agent-streaks::before {
  content: ""; position: absolute; inset: 1px; padding: 4px; border-radius: 35px; opacity: .8;
  background: conic-gradient(from var(--agent-glow-angle),
    transparent, #b9dcff80 5deg, #fff 8deg 10deg, #b9dcff30 10.5deg, #fff 11deg 14deg, transparent 15deg 125deg,
    #b9dcff80 136deg, #fff 139deg 141deg, transparent 142deg, #fff 143deg 147deg, transparent 148deg 250deg,
    #fff 254deg 257deg, transparent 258deg);
  /* 只留 4px 的环：内容盒与内边距盒相减 */
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  animation: agent-glow-orbit 8s linear infinite, agent-glow-shimmer 1.37s ease-in-out infinite;
}
@property --agent-glow-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes agent-glow-orbit { to { --agent-glow-angle: 360deg; } }
@keyframes agent-glow-shimmer { 0%,100%{opacity:.8} 13%{opacity:1} 27%{opacity:.72} 41%{opacity:.9} 57%{opacity:.6} 68%{opacity:.84} 83%{opacity:.73} 92%{opacity:.95} }
```

```html
<filter id="agent-streak-texture" x="-10%" y="-30%" width="120%" height="160%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.045 0.5" numOctaves="2" seed="8" result="noise"/>  <!-- 横向低频、纵向高频 = 水平拉丝 -->
  <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" result="distorted"/>
  <feColorMatrix in="noise" type="saturate" values="0" result="grain"/>
  <feComposite in="distorted" in2="grain" operator="arithmetic" k1="1.5" k2="0.35"/>                     <!-- 乘上颗粒，环变成断续的光丝 -->
</filter>
```

要点：conic-gradient 里几段窄白扇区 = 几条光条；`@property` 注册的角度变量让 `conic-gradient(from …)` 可以被 `@keyframes` 动画；mask 相减只留 4px 环；SVG 滤镜的**各向异性噪声**（`0.045 0.5`）把环拉成水平丝状，再叠两层 drop-shadow 做白芯蓝晕。

## 搬到 Echuu 的可行做法

- 我们的官网首屏已经是 R3F。同样的两段式：把现有 HDR 天空 + 角色渲染到 `useFBO` 的 RenderTarget，再用 `<ScreenQuad>` / 全屏 `<mesh>` 跑上面的透镜 shader；`box` 从要「吸」的 DOM 元素（例如内测输入框或开场的手机窗）`getBoundingClientRect()` 换算，`radius` 取它的圆角。
- `@react-three/postprocessing` 也能做：写一个 `Effect` 子类，把上面的 fragment 放进 `mainImage`，uniforms 同名。
- 光条直接复用 CSS，只改颜色为品牌蓝 `#72d5fe`。`@property` 在 Safari 16.4+ 可用；老 Safari 退化为不转动的静态环。
- 性能：透镜 shader 的 33×3 采样只在 `abs(ring) < 3px` 的像素执行，其余像素一次采样；星空 RT 用画布分辨率、dpr 上限 1.5。
- 这套效果和「去 AI 味」不冲突：它是内容（真实 3D + 一个物理公式），不是渐变球。
