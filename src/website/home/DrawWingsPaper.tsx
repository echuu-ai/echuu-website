import { playInteractionSound } from '../lib/interactionSound';
import { useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { HOME_ASSETS } from '../assets';
import { drawStrokes, type SketchStroke } from './sketchStrokes';

/**
 * 开场 draw 阶段：黑场里的笔记本纸 + corynorootbone 铅笔稿（Figma Opening-animation-01）。
 * 用户用「铅笔」给角色补上翅膀；画够并停笔 0.6 秒就算画好，角色随后在 3D 里醒来。
 * 纯 DOM：3D 模型与动作同时在后台加载，所以画画的时间就是加载时间。
 *
 * 纸与提示语的几何来自 Figma（1440×1024 画框）：
 *   纸：762×1049，中心 (737.75, 498.8)，旋转 −10.23°
 *   提示语：左上 (561, 155)，Cedarville Cursive 32px，不随纸旋转
 * 铅笔稿不用 Figma 的手绘线，而是 3D 就绪后从角色睡姿正上方拍出来的剪影边缘（captureOutline），
 * 这样 wake 时 3D 角色和纸上的线完全重合。线稿出来之前先不让画。
 */

/** 角色身体中心落在纸面的哪里（纸面宽 / 高的比例）：纸放大后上下出画，人物放在可见区域中间、手写字在头顶 */
export const PAPER_BODY_ANCHOR = { cx: 0.58, cy: 0.585 } as const;
export const PAPER_TILT_DEG = -10.23;
/** 轮廓「写」出来用多久 */
const WRITE_SECONDS = 2.4;

/**
 * 画好的判定：累计笔迹长度 / 纸宽 ≥ INK_TO_WAKE，松手 IDLE_MS 后醒来。在哪儿画都算。
 * 0.3 ≈ 沿引导的外缘描一笔（翅膀外缘约为纸宽的 0.4）——描个大概就够，不要求涂满。
 */
const INK_TO_WAKE = 0.3;
const IDLE_MS = 450;

type InkState = { drawing: boolean; x: number; y: number; ink: number; done: boolean; timer: number };

const TILT_COS = Math.cos((-PAPER_TILT_DEG * Math.PI) / 180);
const TILT_SIN = Math.sin((-PAPER_TILT_DEG * Math.PI) / 180);

export function DrawWingsPaper({ fading, waiting, artRef, onWake, hint, loadingLabel, sketch, guide, onSheetPainted }: {
  /** wake 开始后置 true：纸淡出，让位给 3D 里的同一张纸 */
  fading: boolean;
  /** 画好了但 3D 还没就绪：提示加载中 */
  waiting: boolean;
  /** 笔迹画布交给 3D 场景，盖到 3D 纸面的贴图上 */
  artRef: MutableRefObject<HTMLCanvasElement | null>;
  onWake: () => void;
  hint: string;
  loadingLabel: string;
  /** 从 3D 睡姿拍出的铅笔稿笔画；没就绪前不能画 */
  sketch: SketchStroke[] | null;
  /** 右侧翅膀的引导图（dataURL），轮廓写完后出现 */
  guide: string | null;
  /** 纸张图已经画到屏幕上（加载完再过两帧；加载失败也算）：之后才开始加载 3D */
  onSheetPainted: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const ink = useRef<InkState>({ drawing: false, x: 0, y: 0, ink: 0, done: false, timer: 0 });
  const [inked, setInked] = useState(false);
  const [touched, setTouched] = useState(false);
  const [written, setWritten] = useState(false);
  const outlineRef = useRef<HTMLCanvasElement | null>(null);

  // 轮廓按笔画一笔一笔写出来（与 3D 纸面同一组笔画、同一种抖动）
  useEffect(() => {
    const canvas = outlineRef.current;
    const board = boardRef.current;
    if (!sketch || !canvas || !board) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(board.offsetWidth * dpr);
    canvas.height = Math.round(board.offsetHeight * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const progress = reduced ? 1 : Math.min(1, (now - start) / (WRITE_SECONDS * 1000));
      // 前快后慢一点，像落笔时的节奏
      const eased = 1 - (1 - progress) ** 1.6;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawStrokes(ctx, sketch, eased);
      if (progress < 1) raf = requestAnimationFrame(frame);
      else setWritten(true);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [sketch]);

  // 手写提示语用 Reenie Beanie（像铅笔随手写的字），只在开场按需加载
  useEffect(() => {
    if (document.querySelector('link[data-hv-pencil-font]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Reenie+Beanie&display=swap';
    link.setAttribute('data-hv-pencil-font', '');
    document.head.appendChild(link);
  }, []);

  // 静止时的涂鸦抖动（line boil）：手绘动画的老办法——每秒换 8 次噪声种子，线条轻轻「沸腾」
  const boilRef = useRef<SVGFETurbulenceElement | null>(null);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let seed = 1;
    const timer = window.setInterval(() => {
      seed = (seed % 3) + 1;
      boilRef.current?.setAttribute('seed', String(seed));
    }, 125);
    return () => window.clearInterval(timer);
  }, []);

  // 画布跟随纸面尺寸（未旋转的本地尺寸）；尺寸变化时保留已画的笔迹
  useEffect(() => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;
    artRef.current = canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const w = Math.max(1, Math.round(board.offsetWidth * dpr));
      const h = Math.max(1, Math.round(board.offsetHeight * dpr));
      if (canvas.width === w && canvas.height === h) return;
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      copy.getContext('2d')?.drawImage(canvas, 0, 0);
      canvas.width = w;
      canvas.height = h;
      if (copy.width > 1) canvas.getContext('2d')?.drawImage(copy, 0, 0, w, h);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(board);
    const state = ink.current;
    return () => {
      observer.disconnect();
      window.clearTimeout(state.timer);
      if (artRef.current === canvas) artRef.current = null;
    };
  }, [artRef]);

  const finishSoon = () => {
    const s = ink.current;
    if (s.done || s.ink < INK_TO_WAKE) return;
    window.clearTimeout(s.timer);
    s.timer = window.setTimeout(() => {
      if (s.done) return;
      s.done = true;
      onWake();
    }, IDLE_MS);
  };

  /** 屏幕坐标 → 纸面本地像素：纸绕中心旋转，所以先减中心、反向旋转、再加回半宽高 */
  const pointAt = (event: ReactPointerEvent) => {
    const canvas = canvasRef.current!;
    const board = boardRef.current!;
    const rect = board.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const lx = dx * TILT_COS - dy * TILT_SIN + board.offsetWidth / 2;
    const ly = dx * TILT_SIN + dy * TILT_COS + board.offsetHeight / 2;
    const scale = canvas.width / Math.max(1, board.offsetWidth);
    return { x: lx * scale, y: ly * scale, scale };
  };

  const onDown = (event: ReactPointerEvent) => {
    event.stopPropagation();
    const s = ink.current;
    if (s.done || !sketch) return;
    const { x, y } = pointAt(event);
    if (!touched) setTouched(true);
    s.drawing = true;
    s.x = x;
    s.y = y;
    window.clearTimeout(s.timer);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onMove = (event: ReactPointerEvent) => {
    const s = ink.current;
    const canvas = canvasRef.current;
    if (!s.drawing || s.done || !canvas) return;
    event.stopPropagation();
    const { x, y, scale } = pointAt(event);
    const dist = Math.hypot(x - s.x, y - s.y);
    if (dist < 1.5) return;
    playInteractionSound('pencil', Math.min(1, dist / 24));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // 铅笔质感：一道主线 + 一道错位的浅线，宽度与深浅随手速微变
    const width = (1.4 + Math.min(2.2, 70 / (dist + 14))) * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#4e4e52';
    ctx.globalAlpha = 0.5 + Math.random() * 0.14;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = width * 2.1;
    ctx.beginPath();
    ctx.moveTo(s.x + width * 0.7, s.y + width * 0.5);
    ctx.lineTo(x + width * 0.7, y + width * 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    s.ink += dist / canvas.width;
    s.x = x;
    s.y = y;
    if (s.ink >= INK_TO_WAKE && !inked) setInked(true);
  };

  const onUp = (event: ReactPointerEvent) => {
    event.stopPropagation();
    ink.current.drawing = false;
    finishSoon();
  };

  return (
    <div className="hv-paper" data-fading={fading || undefined}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <filter id="hv-pencil-boil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence ref={boilRef} type="fractalNoise" baseFrequency="0.04" numOctaves={2} seed={1} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={2.4} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="hv-paper__frame">
        <div className="hv-paper__board" ref={boardRef} style={{ transform: `rotate(${PAPER_TILT_DEG}deg)` }}>
          <img
            className="hv-paper__sheet"
            src={HOME_ASSETS.opening.paperSheet}
            alt=""
            draggable={false}
            onLoad={() => requestAnimationFrame(() => requestAnimationFrame(onSheetPainted))}
            onError={onSheetPainted}
          />
          <canvas className="hv-paper__outline" ref={outlineRef} data-inked={inked || undefined} aria-hidden="true" />
          {guide && written ? (
            <img className="hv-paper__guide" src={guide} alt="" draggable={false} data-state={inked ? 'done' : touched ? 'drawing' : 'idle'} />
          ) : null}
          <canvas
            className="hv-paper__ink"
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onClick={(event) => event.stopPropagation()}
            data-ready={sketch ? true : undefined}
          />
          <p className="hv-paper__hint" lang="en">{hint}</p>
        </div>
      </div>
      {waiting || !sketch ? <p className="hv-paper__loading">{loadingLabel}</p> : null}
    </div>
  );
}
