import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

const TABS = [['seam', '切口'], ['logo', 'Logo'], ['grade', '3D 调色'], ['hero', '镜头 / 风']] as const;

/** 各面板共用一个位置：切页签会刷新页面，面板留在拖过去的地方 */
const POS_KEY = 'echuu-tune-panel-pos';

/** 把面板放到 (x, y)，整块留在视口里 */
function place(panel: HTMLElement, x: number, y: number) {
  const left = Math.min(Math.max(0, x), Math.max(0, window.innerWidth - panel.offsetWidth));
  const top = Math.min(Math.max(0, y), Math.max(0, window.innerHeight - 32));
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = 'auto';
}

function savePosition(panel: HTMLElement) {
  const rect = panel.getBoundingClientRect();
  try { window.localStorage.setItem(POS_KEY, JSON.stringify({ x: rect.left, y: rect.top })); } catch { /* ignore */ }
}

/**
 * 开发用调节面板顶部：拖动把手 + 切换按钮。
 * 把手按住拖动整块面板（位置存本机），双击回到右上角；切换按钮改地址里的 ?tune= 后刷新（各面板的数值都存在本机，切换不会丢）。
 */
export function TuneTabs({ active }: { active: (typeof TABS)[number][0] }) {
  const grip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = grip.current?.closest<HTMLElement>('.seam-tune');
    if (!panel) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(POS_KEY) ?? 'null') as { x: number; y: number } | null;
      if (saved) place(panel, saved.x, saved.y);
    } catch { /* ignore */ }
    // 窗口变小时把拖到边上的面板收回视口
    const onResize = () => {
      if (!panel.style.left) return;
      const rect = panel.getBoundingClientRect();
      place(panel, rect.left, rect.top);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = event.currentTarget.closest<HTMLElement>('.seam-tune');
    if (!panel || event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const rect = panel.getBoundingClientRect();
    const dx = event.clientX - rect.left;
    const dy = event.clientY - rect.top;
    handle.setPointerCapture(event.pointerId);
    handle.dataset.dragging = 'true';
    const move = (e: PointerEvent) => place(panel, e.clientX - dx, e.clientY - dy);
    const end = (e: PointerEvent) => {
      if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
      delete handle.dataset.dragging;
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      savePosition(panel);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  const resetPosition = () => {
    const panel = grip.current?.closest<HTMLElement>('.seam-tune');
    if (!panel) return;
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    try { window.localStorage.removeItem(POS_KEY); } catch { /* ignore */ }
  };

  const go = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tune', tab);
    window.location.assign(url.toString());
  };
  return (
    <>
      <div ref={grip} className="seam-tune__grip" title="拖动面板；双击回到右上角" onPointerDown={startDrag} onDoubleClick={resetPosition} />
      <div className="seam-tune__tabs">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" data-active={key === active || undefined} onClick={() => key !== active && go(key)}>{label}</button>
        ))}
      </div>
    </>
  );
}
