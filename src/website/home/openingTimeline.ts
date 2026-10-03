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

/** 角色从铅笔稿里显形（主体前沿 0.3–1.8 s）后睡一小会儿再醒：睡姿与铅笔稿重合的那一刻要看得见 */
const STAND_START = 2.3;
/** Stand Up 约 6 s，站稳后留一个英雄停顿（导演流程 1-5），之后纸才飘起来 */
const WAKE_END = STAND_START + 6.3;
/**
 * 第二幕（纸飞机）5.4 s，节奏放慢：
 *   纸从地上慢慢飘到她面前，镜头同时从正面绕到她右肩后（rise）；
 *   过肩镜头里纸一折一折慢慢折成纸飞机（fold，四拍各 0.6 s）；
 *   纸飞机越过她往前飞进窗口（fly），镜头已在她身后，直接接开窗。
 * open / hero 段内部的时长与旧版（9.6–15.8 s）完全一致，只是整体后移。
 */
const ACT2 = { riseStart: 0.3, foldStart: 1.8, flyStart: 4.2, length: 5.4 } as const;
const OPEN_START = WAKE_END + ACT2.length;

/** 第二幕的绝对时间（纸、镜头、音效共用） */
export const OPENING_ACT2 = {
  riseStart: WAKE_END + ACT2.riseStart,
  foldStart: WAKE_END + ACT2.foldStart,
  flyStart: WAKE_END + ACT2.flyStart,
} as const;

export const OPENING = {
  /** wake 内：Stand Up 开始 */
  standStart: STAND_START,
  wakeEnd: WAKE_END,
  /** fold 内：最后一折时手机窗与蓝框从黑暗里亮起来，纸飞机起飞就有了目标 */
  windowBack: WAKE_END + 3.6,
  openStart: OPEN_START,
  /** 窗口从手机窗放大到全屏所需秒数（CSS 过渡与 3D 相机同步） */
  windowOpenSeconds: 1.6,
  openEnd: OPEN_START + 6.2,
} as const;

export const OPENING_TOTAL = OPENING.openEnd;
/** 20.2s authored sequence plays in ~15.5s; hero idle stays at normal speed. */
export const OPENING_RATE = 1.3;

/** 3D 动作切换点（秒）；introStart 之后的间隔与旧版一致（+3.6 s INTRO_END，+5.0 s target_locked） */
export const OPENING_MOTION = {
  standStart: OPENING.standStart,
  introStart: OPENING.openStart,
  introEndStart: OPEN_START + 3.6,
  lockStart: OPEN_START + 5.0,
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
  const elapsed = (now - clock.startedAt) / 1000 + clock.offset;
  const duration = OPENING_TOTAL / OPENING_RATE;
  return elapsed <= duration ? elapsed * OPENING_RATE : OPENING_TOTAL + elapsed - duration;
}

/** 直接跳到定格（draw 阶段跳过时先把时钟启动） */
export function skipOpening(clock: OpeningClock, now: number) {
  if (!clock.ready) return;
  if (clock.startedAt <= 0) clock.startedAt = now;
  clock.startedAt = now;
  clock.offset = OPENING_TOTAL / OPENING_RATE;
}

export function replayOpening(clock: OpeningClock, now: number) {
  clock.startedAt = now;
  clock.offset = 0;
}
