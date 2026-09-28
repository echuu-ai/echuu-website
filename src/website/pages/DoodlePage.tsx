import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '../locale-context';
import { Head } from '../components/Head';
import { CONTACT_EMAIL } from '../config/site';

const STORAGE_KEY = 'echuu.website.doodle';
const WIDTH = 1200;
const HEIGHT = 720;

/**
 * 涂鸦小角落。真实本地画布：笔色、笔粗、撤销、清空、导出 PNG。
 * 只保存在当前浏览器；没有接通存储与审核前不提供公开投稿。
 * 画布在用户主动打开后才初始化；不拦截整页触控滚动以外的手势。
 */
export function DoodlePage() {
  const { locale, t } = useLocale();
  const [started, setStarted] = useState(false);
  const [color, setColor] = useState('#0d5490');
  const [size, setSize] = useState(6);
  const [status, setStatus] = useState('');
  const [dirty, setDirty] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);

  const paintBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }, []);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    paintBackground(ctx);
    ctxRef.current = ctx;

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const image = new Image();
        image.onload = () => {
          ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
          setStatus(t.doodlePage.restored);
        };
        image.src = saved;
      }
    } catch {
      /* 隐私模式下读取失败：当作空画布，不报错阻断 */
    }
  }, [started, paintBackground, t.doodlePage.restored]);

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function pushHistory() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    historyRef.current.push(ctx.getImageData(0, 0, WIDTH, HEIGHT));
    if (historyRef.current.length > 25) historyRef.current.shift();
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    pushHistory();
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = pointerPosition(event);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    setDirty(true);
    setStatus(t.doodlePage.unsaved);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { x, y } = pointerPosition(event);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* 指针已释放 */
    }
    ctxRef.current?.closePath();
  }

  function undo() {
    const ctx = ctxRef.current;
    const previous = historyRef.current.pop();
    if (!ctx || !previous) return;
    ctx.putImageData(previous, 0, 0);
    setDirty(true);
    setStatus(t.doodlePage.unsaved);
  }

  function clear() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    pushHistory();
    paintBackground(ctx);
    setDirty(true);
    setStatus(t.doodlePage.unsaved);
  }

  function saveLocal() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, canvas.toDataURL('image/png'));
      setDirty(false);
      setStatus(t.doodlePage.saved);
    } catch {
      setStatus(t.doodlePage.unsaved);
    }
  }

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'echuu-doodle.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // 刷新前提醒尚未本地保存
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  return (
    <>
      <Head
        locale={locale}
        htmlLang={t.htmlLang}
        title={t.meta.doodle.title}
        description={t.meta.doodle.description}
        path="doodle"
      />
      <div className="shell page-head">
        <h1>{t.doodlePage.title}</h1>
        <p>{t.doodlePage.lede}</p>
      </div>

      <section className="section section--tight">
        <div className="shell">
          <div className="notice" style={{ marginBottom: 18 }}>
            <span>{t.doodlePage.localOnly}</span>
            <span>{t.doodlePage.noPublicWall}</span>
          </div>

          {!started ? (
            <p>
              <button type="button" className="btn btn--primary" onClick={() => setStarted(true)}>
                {t.doodlePage.start}
              </button>
            </p>
          ) : (
            <>
              <div className="doodle-toolbar">
                <label>
                  {t.doodlePage.color}
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    aria-label={t.doodlePage.color}
                  />
                </label>
                <label>
                  {t.doodlePage.size}
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                    aria-label={t.doodlePage.size}
                  />
                  <span aria-hidden="true">{size}</span>
                </label>
                <button type="button" className="btn btn--quiet btn--small" onClick={undo}>
                  {t.doodlePage.undo}
                </button>
                <button type="button" className="btn btn--quiet btn--small" onClick={clear}>
                  {t.doodlePage.clear}
                </button>
                <button type="button" className="btn btn--ghost btn--small" onClick={saveLocal}>
                  {t.doodlePage.saveLocal}
                </button>
                <button type="button" className="btn btn--primary btn--small" onClick={exportPng}>
                  {t.doodlePage.export}
                </button>
              </div>

              <div className="doodle-canvas-wrap">
                <canvas
                  ref={canvasRef}
                  className="doodle-canvas"
                  aria-label={t.doodlePage.canvasLabel}
                  role="img"
                  style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
              </div>

              <p className="status-line" aria-live="polite" style={{ marginTop: 12 }}>
                {status}
              </p>
            </>
          )}

          <p className="section__foot">
            {t.doodlePage.textAlternative}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </section>
    </>
  );
}
