import { useEffect, useRef } from 'react';
import { HOME_ASSETS } from '../assets';

/**
 * 首页天空底的水波纹：鼠标 / 手指划过时，天空像一层水面被拨动、折射。
 *
 * 做法（和 jQuery ripples / Webflow 水波示例同一套）：
 * - 半分辨率的高度场在两张浮点纹理之间来回迭代波动方程（ping-pong），指针经过的地方往里“滴水”；
 * - 画面这层是固定在视口的画布，按 `.hv::before` 同样的映射（框外扩 28px、宽 143%、高 100%、居中、
 *   叠 50% 天蓝）重画那张天空图，只是采样坐标被水面法线推开一点，于是看起来是天空本身在起波纹。
 * - 只画在 `.hv-body` 范围内（开场和页脚不动），上沿渐隐接回 CSS 天空，没有接缝。
 * - 没有 WebGL2 / 浮点渲染目标、或系统要求减少动态时不挂，CSS 天空照常显示。
 * - 水面静下来、页面也没在滚时停帧，不白耗电。
 */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// 波动方程一步：r = 高度，g = 速度
const STEP = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 o;
void main() {
  vec4 s = texture(uState, vUv);
  float avg = (
    texture(uState, vUv - vec2(uTexel.x, 0.0)).r +
    texture(uState, vUv + vec2(uTexel.x, 0.0)).r +
    texture(uState, vUv - vec2(0.0, uTexel.y)).r +
    texture(uState, vUv + vec2(0.0, uTexel.y)).r) * 0.25;
  s.g += (avg - s.r) * 2.0;
  s.g *= 0.994;
  s.r += s.g;
  s.r *= 0.998;
  o = s;
}`;

// 滴一滴水：在 uCenter 附近按余弦衰减压下高度
const DROP = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uStrength;
uniform float uAspect;
in vec2 vUv;
out vec4 o;
void main() {
  vec4 s = texture(uState, vUv);
  vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
  float k = max(0.0, 1.0 - length(d) / uRadius);
  k = 0.5 - cos(k * 3.14159265) * 0.5;
  s.r += k * uStrength;
  o = s;
}`;

// 画天空：同 .hv::before 的映射，采样坐标被水面法线推开
const RENDER = `#version 300 es
precision highp float;
uniform sampler2D uSky;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uView;      // 视口 CSS 尺寸
uniform vec4 uSkyBox;    // .hv::before 盒子：left, top, width, height（视口 CSS 坐标）
uniform vec4 uClip;      // .hv-body：top, bottom（视口 CSS 坐标）, 上沿渐隐高度, -
uniform float uPerturb;
uniform float uGain;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uView;
  float a = smoothstep(uClip.x, uClip.x + uClip.z, px.y) * step(px.y, uClip.y);
  if (a <= 0.0) { o = vec4(0.0); return; }

  float hl = texture(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float hd = texture(uState, vUv - vec2(0.0, uTexel.y)).r;
  float hu = texture(uState, vUv + vec2(0.0, uTexel.y)).r;
  // 屏幕坐标系下的水面坡度（x 右、y 下）
  vec2 g = vec2(hl - hr, hu - hd) * uGain;

  vec2 p = px + g * uPerturb;
  vec2 b = (p - uSkyBox.xy) / uSkyBox.zw;
  vec2 uv = vec2(0.5 + (b.x - 0.5) / 1.43, b.y);
  vec3 sky = texture(uSky, clamp(uv, 0.0, 1.0)).rgb;
  vec3 col = mix(sky, vec3(62.0, 191.0, 255.0) / 255.0, 0.5);

  // 只靠折射读出水面，不加任何明暗 / 高光（加了会出黑影、像塑料）
  o = vec4(col * a, a);
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const prog = gl.createProgram()!;
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader');
    gl.attachShader(prog, sh);
  }
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  const u = (name: string) => gl.getUniformLocation(prog, name);
  return { prog, u };
}

/** 天空图本来就被 CSS 模糊 14px，这里缩成小图再糊一下，线性采样放大后效果一致，也省显存 */
function loadSky(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const w = 320;
      const h = Math.max(64, Math.round((w * img.naturalHeight) / img.naturalWidth));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.filter = 'blur(1.5px)';
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function WaterRipples() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('ripple') === '0') return;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return;
    gl.getExtension('OES_texture_float_linear');

    const root = canvas.closest('.hv') as HTMLElement | null;
    const body = root?.querySelector('.hv-body') as HTMLElement | null;
    if (!root || !body) return;

    let disposed = false;
    let raf = 0;
    let running = false;
    let idleFrames = 0;
    let lastPointer: { x: number; y: number } | null = null;
    const drops: Array<{ x: number; y: number; r: number; s: number }> = [];

    let step: ReturnType<typeof compile>, drop: ReturnType<typeof compile>, render: ReturnType<typeof compile>;
    try {
      step = compile(gl, VERT, STEP);
      drop = compile(gl, VERT, DROP);
      render = compile(gl, VERT, RENDER);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[WaterRipples] shader failed', err);
      return;
    }

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // 模拟用的两张纹理
    let simW = 0, simH = 0;
    let tex: WebGLTexture[] = [];
    let fbo: WebGLFramebuffer[] = [];
    let cur = 0;
    const makeSim = () => {
      tex.forEach((t) => gl.deleteTexture(t));
      fbo.forEach((f) => gl.deleteFramebuffer(f));
      const vw = window.innerWidth, vh = window.innerHeight;
      const scale = Math.min(0.5, 720 / Math.max(vw, vh));
      simW = Math.max(32, Math.round(vw * scale));
      simH = Math.max(32, Math.round(vh * scale));
      tex = []; fbo = [];
      for (let i = 0; i < 2; i++) {
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, simW, simH, 0, gl.RGBA, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const f = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        tex.push(t); fbo.push(f);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      cur = 0;
    };

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };

    const pass = (p: ReturnType<typeof compile>, set: () => void) => {
      const next = 1 - cur;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[next]);
      gl.viewport(0, 0, simW, simH);
      gl.useProgram(p.prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
      gl.uniform1i(p.u('uState'), 0);
      set();
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      cur = next;
    };

    let skyTex: WebGLTexture | null = null;
    // 坡度放大倍数 / 折射位移（CSS px）；DEV 里可用 window.__ripple.tune 现调
    const tune = { gain: 80, perturb: 34, freeze: false };

    const frame = () => {
      raf = 0;
      if (disposed || !skyTex) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const b = body.getBoundingClientRect();
      const visible = b.bottom > 0 && b.top < vh;

      for (const d of drops.splice(0)) {
        pass(drop, () => {
          gl.uniform2f(drop.u('uCenter'), d.x / vw, 1 - d.y / vh);
          gl.uniform1f(drop.u('uRadius'), d.r / vh);
          gl.uniform1f(drop.u('uStrength'), d.s);
          gl.uniform1f(drop.u('uAspect'), vw / vh);
        });
        idleFrames = 0;
      }
      // 一帧走两步：分辨率高了波传得慢，两步让水圈扩散速度接近真实水面
      if (!tune.freeze) for (let k = 0; k < 2; k++) pass(step, () => gl.uniform2f(step.u('uTexel'), 1 / simW, 1 / simH));

      if (visible) {
        const r = root.getBoundingClientRect();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(render.prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, skyTex);
        gl.uniform1i(render.u('uSky'), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
        gl.uniform1i(render.u('uState'), 1);
        gl.uniform2f(render.u('uTexel'), 1 / simW, 1 / simH);
        gl.uniform2f(render.u('uView'), vw, vh);
        gl.uniform4f(render.u('uSkyBox'), r.left - 28, r.top - 28, r.width + 56, r.height + 56);
        gl.uniform4f(render.u('uClip'), b.top, b.bottom, Math.min(240, vh * 0.3), 0);
        gl.uniform1f(render.u('uPerturb'), tune.perturb);
        gl.uniform1f(render.u('uGain'), tune.gain);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      // 约 6 秒没新水滴，波纹已经衰减干净，停帧；滚动 / 指针 / 尺寸变化会再拉起来
      idleFrames++;
      if (idleFrames < 360) raf = requestAnimationFrame(frame);
      else running = false;
    };

    const wake = () => {
      if (disposed) return;
      if (!running) { running = true; idleFrames = 0; }
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const inBody = (y: number) => {
      const b = body.getBoundingClientRect();
      return y >= b.top && y <= b.bottom;
    };

    const trail = (x: number, y: number) => {
      if (!inBody(y)) { lastPointer = null; return; }
      const prev = lastPointer;
      lastPointer = { x, y };
      // 沿指针轨迹每隔一段滴一滴，快速划过也是连续的一道水痕
      const dist = prev ? Math.hypot(x - prev.x, y - prev.y) : 0;
      const n = prev ? Math.min(6, Math.floor(dist / 24)) : 1;
      for (let i = 1; i <= Math.max(1, n); i++) {
        const t = prev ? i / Math.max(1, n) : 1;
        drops.push({ x: prev ? prev.x + (x - prev.x) * t : x, y: prev ? prev.y + (y - prev.y) * t : y, r: 34, s: 0.03 });
      }
      wake();
    };
    // 手指拖动会变成页面滚动，浏览器随即发 pointercancel、不再给 pointermove；
    // touchmove 在滚动时照样来，所以触屏的水痕走 touchmove
    const onMove = (e: PointerEvent) => { if (e.pointerType !== 'touch') trail(e.clientX, e.clientY); };
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; if (t) trail(t.clientX, t.clientY); };
    const onDown = (e: PointerEvent) => {
      if (!inBody(e.clientY)) return;
      drops.push({ x: e.clientX, y: e.clientY, r: 80, s: 0.22 });
      wake();
    };
    // 手机滚动时地址栏伸缩也会触发 resize：只有宽度变了才重建水面，不然一滚动水波就被清空
    let simForWidth = window.innerWidth;
    const onResize = () => {
      sizeCanvas();
      if (window.innerWidth !== simForWidth) { simForWidth = window.innerWidth; makeSim(); }
      wake();
    };
    const onScroll = () => wake();
    const onLeave = () => { lastPointer = null; };
    const onTouchEnd = () => { lastPointer = null; };

    sizeCanvas();
    makeSim();

    loadSky(HOME_ASSETS.skyBg).then((img) => {
      if (disposed) return;
      skyTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, skyTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      canvas.dataset.ready = '1';
      wake();
    }).catch(() => { /* 图没加载上就保持 CSS 天空 */ });

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const lost = (e: Event) => { e.preventDefault(); delete canvas.dataset.ready; disposed = true; };
    canvas.addEventListener('webglcontextlost', lost);
    if (import.meta.env.DEV) (window as unknown as { __ripple?: unknown }).__ripple = {
      drop: (x: number, y: number, s = 0.06, r = 40) => { drops.push({ x, y, r, s }); wake(); },
      // 浏览器窗格被隐藏时 rAF 会停，调试时手动推几帧
      tune,
      tick: (n = 1) => { for (let i = 0; i < n; i++) frame(); },
    };

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', lost);
      // 不调 loseContext：StrictMode 会在同一块画布上重挂，丢掉的上下文拿不回来；这里只释放资源
      tex.forEach((t) => gl.deleteTexture(t));
      fbo.forEach((f) => gl.deleteFramebuffer(f));
      if (skyTex) gl.deleteTexture(skyTex);
      gl.deleteBuffer(quad);
      [step, drop, render].forEach((p) => gl.deleteProgram(p.prog));
    };
  }, []);

  return <canvas ref={canvasRef} className="hv-ripples" aria-hidden="true" />;
}
