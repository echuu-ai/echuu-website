/**
 * 官网开场时间线（纯函数 + 一个共享时钟）。
 *
 * 分镜（Figma Opening-animation-01「Draw the wings to wake it up」+ 原 03/04 开窗定格）：
 *  draw ：黑场里的笔记本纸，纸上是 corynorootbone 的铅笔稿；用户给它补上翅膀
 *         （不计时：画够并停笔后唤醒；3D 模型与动作在后台加载）
 *  wake ：铅笔稿物化成 3D（igloo 物化特效），Stand Up 从纸上站起来；镜头从俯视纸面转到正面
 *  fold ：纸折成纸飞机飞向手机窗，窗口与蓝框回到画面中
 *  open ：窗口放大到全屏，镜头从后方环绕（PET_INTRO → PET_INTRO_END → spot_target_locked）
 *  hero ：spot_target_locked 定格，首屏 UI 浮现
 *
 * open / hero 两段与旧版完全一致。draw 阶段时钟未启动（t 恒为 0）；
 * 画好翅膀那一刻 startOpeningClock，之后的秒数都是绝对值。
 * DOM 与 3D 都只读同一个时钟，不通过 React state 逐帧同步。
 */
export type OpeningPhase = 'loading' | 'draw' | 'wake' | 'fold' | 'open' | 'hero';

export const OPENING = {
  /** wake 内：Stand Up 开始（前面留给物化特效把铅笔稿变成 3D） */
  standStart: 1.3,
  wakeEnd: 6.4,
  /** fold 内：手机窗、蓝框和纸飞机出现 */
  windowBack: 8.0,
  /** 从这里开始与旧版一致（旧 povEnd） */
  openStart: 9.6,
  /** 窗口从手机窗放大到全屏所需秒数（CSS 过渡与 3D 相机同步） */
  windowOpenSeconds: 1.6,
  openEnd: 15.8,
} as const;

export const OPENING_TOTAL = OPENING.openEnd;

/** 3D 动作切换点（秒）；introStart 起与旧版完全一致 */
export const OPENING_MOTION = {
  standStart: OPENING.standStart,
  introStart: OPENING.openStart,
  introEndStart: 13.2,
  lockStart: 14.6,
} as const;

export function phaseAt(t: number, ready: boolean, started = true): OpeningPhase {
  if (!ready) return 'loading';
  if (!started) return 'draw';
  if (t < OPENING.wakeEnd) return 'wake';
  if (t < OPENING.openStart) return 'fold';
  if (t < OPENING.openEnd) return 'open';
  return 'hero';
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - edge0) / Math.max(edge1 - edge0, 1e-6)));
  return u * u * (3 - 2 * u);
}

/** 0 = 手机窗；1 = 全屏 */
export function windowOpenProgress(t: number): number {
  return smoothstep(OPENING.openStart, OPENING.openStart + OPENING.windowOpenSeconds, t);
}

export type OpeningClock = {
  startedAt: number;
  ready: boolean;
  /** 跳过或重播时的时间偏移（秒） */
  offset: number;
};

export function createOpeningClock(): OpeningClock {
  return { startedAt: 0, ready: false, offset: 0 };
}

/** 模型与动作就绪（draw 阶段可以结束了）；时钟仍未启动 */
export function markOpeningReady(clock: OpeningClock) {
  clock.ready = true;
}

export function openingStarted(clock: OpeningClock): boolean {
  return clock.startedAt > 0;
}

export function startOpeningClock(clock: OpeningClock, now: number) {
  clock.ready = true;
  clock.startedAt = now;
  clock.offset = 0;
}

export function openingTime(clock: OpeningClock, now: number): number {
  if (!clock.ready || clock.startedAt <= 0) return 0;
  return (now - clock.startedAt) / 1000 + clock.offset;
}

/** 直接跳到定格（draw 阶段跳过时先把时钟启动） */
export function skipOpening(clock: OpeningClock, now: number) {
  if (!clock.ready) return;
  if (clock.startedAt <= 0) clock.startedAt = now;
  clock.offset += OPENING_TOTAL - openingTime(clock, now);
}

export function replayOpening(clock: OpeningClock, now: number) {
  clock.startedAt = now;
  clock.offset = 0;
}
