/**
 * 纸飞机光标的前后层级（固定层级）：
 *   - 按钮、链接、输入框：永远在飞机下面（飞机压在上面，保证能点）；
 *   - 实心的非交互表面（OCCLUDERS）：在飞机上面，飞机经过时被它们挡住（clip-path 裁掉重叠部分）；
 *   - 注册过的 3D 画布（别针、钥匙）：页面上的飞机隐藏，由画布在场景里画一架飞机，
 *     和模型共用深度缓冲，按模型真实轮廓被遮挡。
 * 光标每帧调用 updateCursorDepth；3D 画布读 cursorDepth 决定是否接管。
 */

export const cursorDepth = {
  x: 0,
  y: 0,
  heading: 0,
  /** 当前接管光标的 3D 画布；null = 页面上的飞机正常显示 */
  proxyHost: null as HTMLCanvasElement | null,
};

const INTERACTIVE = 'a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [contenteditable="true"]';
/** 实心、非交互的表面：飞机从它们背后穿过 */
const OCCLUDERS = '.hv-intro__panel, .hv-steps__shot, .hv-feature__video, .hv-fcard, .hv-mcard__media, .hv-creators__art, .team-card';
/** 光标元素周围多大范围内的表面需要参与裁切（px） */
const REACH = 80;

const hosts = new Set<HTMLCanvasElement>();
export function registerCursorProxyHost(canvas: HTMLCanvasElement) {
  hosts.add(canvas);
  return () => {
    hosts.delete(canvas);
    if (cursorDepth.proxyHost === canvas) cursorDepth.proxyHost = null;
  };
}

let occluders: Element[] = [];
let occludersAt = 0;
function occluderList(now: number) {
  // 页面结构变化不频繁，每秒刷新一次列表即可
  if (now - occludersAt > 1000) {
    occluders = Array.from(document.querySelectorAll(OCCLUDERS));
    occludersAt = now;
  }
  return occluders;
}

function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!k) return `M${x} ${y}h${w}v${h}h${-w}z`;
  return `M${x + k} ${y}h${w - 2 * k}a${k} ${k} 0 0 1 ${k} ${k}v${h - 2 * k}a${k} ${k} 0 0 1 ${-k} ${k}h${-(w - 2 * k)}a${k} ${k} 0 0 1 ${-k} ${-k}v${-(h - 2 * k)}a${k} ${k} 0 0 1 ${k} ${-k}z`;
}

let lastClip = '';
function setClip(el: HTMLElement, clip: string) {
  if (clip === lastClip) return;
  lastClip = clip;
  el.style.clipPath = clip;
}

/**
 * x、y = 飞机尖端的视口坐标；originX、originY = 光标元素左上角的视口坐标。
 * active 为 false（隐藏、飞行中、减少动态效果）时清掉所有层级处理。
 * 返回 true 表示由 3D 画布接管，调用方应把页面上的飞机隐藏。
 */
export function updateCursorDepth(el: HTMLElement, x: number, y: number, originX: number, originY: number, heading: number, active: boolean): boolean {
  cursorDepth.x = x;
  cursorDepth.y = y;
  cursorDepth.heading = heading;
  if (!active) {
    cursorDepth.proxyHost = null;
    setClip(el, '');
    return false;
  }
  const hit = document.elementFromPoint(x, y);
  if (hit?.closest(INTERACTIVE)) {
    cursorDepth.proxyHost = null;
    setClip(el, '');
    return false;
  }

  // 3D 画布接管
  let host: HTMLCanvasElement | null = null;
  for (const canvas of hosts) {
    const r = canvas.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { host = canvas; break; }
  }
  cursorDepth.proxyHost = host;
  if (host) {
    setClip(el, '');
    return true;
  }

  // 实心表面挡在前面：外框减去重叠区域（evenodd）
  let holes = '';
  const now = performance.now();
  for (const node of occluderList(now)) {
    const r = node.getBoundingClientRect();
    if (r.right < x - REACH || r.left > x + REACH || r.bottom < y - REACH || r.top > y + REACH) continue;
    const radius = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
    holes += roundedRect(r.left - originX, r.top - originY, r.width, r.height, radius);
  }
  setClip(el, holes ? `path(evenodd, "M-400 -400h800v800h-800z${holes}")` : '');
  return false;
}
