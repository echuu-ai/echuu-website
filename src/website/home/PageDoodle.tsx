import { useEffect, useRef } from 'react';

/**
 * 首页涂鸦：开场结束后，在没有文字、没有按钮的地方按住拖动，就能用「白色铅笔」随手画。
 * 和开场的铅笔稿同一种手感：一道主线 + 一道错开的浅石墨线，静止时轻轻「沸腾」（line boil）。
 * - 笔画记在页面坐标里，跟着页面一起滚动；每一笔约 8 秒后慢慢淡掉，页面不会越画越乱；
 * - 只在桌面精确指针（鼠标 / 笔）上启用，触屏要用来滚动；
 * - 拖不到 5 px 算点击，链接、按钮、选字照常；画完那一下的 click 会被吞掉（不触发纸飞机光标的点击飞行）；
 * - 别针 / 钥匙挂饰可以拖动，弹窗里也不画。
 */

type Point = { x: number; y: number };
type Stroke = { points: Point[]; born: number; done: boolean };

const LIFE_MS = 8000;
const FADE_MS = 1600;
const START_DISTANCE = 5;
/** 这些地方不起笔：可交互的、文字、弹窗、可拖的 3D 挂饰 */
const BLOCKED = [
  'a', 'button', 'input', 'textarea', 'select', 'label', 'summary', '[role="button"]', '[role="link"]', '[contenteditable]',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'figcaption', 'mark', 'span', 'dd', 'dt',
  '[role="dialog"]', '.hv-cta', '.hv-opening', '.hv-charm-stage', '[data-no-doodle]',
].join(',');

export function PageDoodle() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boilRef = useRef<SVGFETurbulenceElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !window.matchMedia?.('(pointer: fine)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const strokes: Stroke[] = [];
    let pending: { id: number; x: number; y: number } | null = null;
    let active: Stroke | null = null;
    let swallowClick = false;
    let raf = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      schedule();
    };

    const allowedTarget = (target: EventTarget | null) => {
      const el = target as Element | null;
      if (!el || !(el instanceof Element)) return false;
      if (document.documentElement.classList.contains('hv-lock')) return false;
      if (el.closest(BLOCKED)) return false;
      // 画布里只有首屏 3D 舞台可以画（挂饰画布要拿来拖动）
      if (el instanceof HTMLCanvasElement && !el.closest('.hv-stage')) return false;
      return true;
    };

    const draw = (now: number) => {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, -window.scrollX * dpr, -window.scrollY * dpr);
      ctx.clearRect(window.scrollX, window.scrollY, window.innerWidth, window.innerHeight);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = strokes.length - 1; i >= 0; i -= 1) {
        const stroke = strokes[i];
        const age = stroke.done ? now - stroke.born : 0;
        if (age > LIFE_MS) { strokes.splice(i, 1); continue; }
        const alpha = 1 - Math.max(0, (age - (LIFE_MS - FADE_MS)) / FADE_MS);
        const pts = stroke.points;
        if (pts.length < 2) continue;
        for (const pass of [0, 1]) {
          ctx.beginPath();
          const shift = pass === 0 ? 0 : 1.1;
          ctx.moveTo(pts[0].x + shift, pts[0].y + shift * 0.6);
          for (let k = 1; k < pts.length; k += 1) {
            // 手的轻微不稳（不是波浪）：沿笔画的低频摆动
            const sway = Math.sin(k * 0.23 + i) * 0.35;
            ctx.lineTo(pts[k].x + shift + sway, pts[k].y + shift * 0.6 - sway * 0.6);
          }
          if (pass === 0) {
            // 白线在浅色天空上要读得出来：一圈很淡的深蓝阴影托底
            ctx.shadowColor = `rgba(16, 52, 104, ${0.45 * alpha})`;
            ctx.shadowBlur = 4;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 3.2;
          } else {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * alpha})`;
            ctx.lineWidth = 1.6;
          }
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
      if (strokes.length) schedule();
    };
    function schedule() {
      if (!raf) raf = requestAnimationFrame(draw);
    }

    const pagePoint = (event: PointerEvent): Point => ({ x: event.clientX + window.scrollX, y: event.clientY + window.scrollY });

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
      if (!allowedTarget(event.target)) return;
      pending = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onMove = (event: PointerEvent) => {
      if (pending && event.pointerId === pending.id && !active) {
        if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) < START_DISTANCE) return;
        active = { points: [{ x: pending.x + window.scrollX, y: pending.y + window.scrollY }], born: 0, done: false };
        strokes.push(active);
        document.documentElement.classList.add('hv-doodling');
        window.getSelection()?.removeAllRanges();
      }
      if (!active) return;
      const p = pagePoint(event);
      const last = active.points[active.points.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
      active.points.push(p);
      schedule();
    };
    const onUp = () => {
      if (active) {
        active.done = true;
        active.born = performance.now();
        active = null;
        swallowClick = true;
        document.documentElement.classList.remove('hv-doodling');
        schedule();
      }
      pending = null;
    };
    // 画完那一下松手会触发 click：吞掉，不触发纸飞机光标的点击飞行或别的点击效果
    const onClick = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.stopPropagation();
      event.preventDefault();
    };
    const onDragStart = (event: DragEvent) => { if (pending || active) event.preventDefault(); };
    const onScroll = () => { if (strokes.length) schedule(); };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('dragstart', onDragStart, true);
    window.addEventListener('scroll', onScroll, { passive: true });

    // line boil：每秒换 8 次噪声种子
    let seed = 1;
    const boil = reduced ? 0 : window.setInterval(() => {
      seed = (seed % 3) + 1;
      boilRef.current?.setAttribute('seed', String(seed));
    }, 125);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(boil);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('dragstart', onDragStart, true);
      window.removeEventListener('scroll', onScroll);
      document.documentElement.classList.remove('hv-doodling');
    };
  }, []);

  return (
    <>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id="hv-page-boil" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence ref={boilRef} type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={1} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <canvas ref={canvasRef} className="hv-doodle" aria-hidden="true" />
    </>
  );
}
