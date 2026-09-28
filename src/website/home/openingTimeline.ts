/**
 * 官网开场时间线（纯函数 + 一个共享时钟）。
 *
 * 分镜（对应 Figma Opening-animation-01 → 04）：
 *  sleep   ：黑场里的手机窗，corynorootbone 以剪影躺着（PET_SLEEPING 循环）
 *  liedown ：转到 spot_lie_down_1 躺卧姿态，镜头推向角色头部
 *  pov     ：从躺卧角色仰望天空的第一人称，右手抬起触碰「镜子里的自己」（白色外轮廓）
 *  open    ：窗口完全打开，镜头从后方环绕；动作 PET_INTRO → PET_INTRO_END → spot_target_locked
 *  hero    ：在 spot_target_locked 定格，首屏 UI 浮现
 *
 * DOM 与 3D 都只读同一个时钟，不通过 React state 逐帧同步。
 */
export type OpeningPhase = 'loading' | 'sleep' | 'liedown' | 'pov' | 'open' | 'hero';

export const OPENING = {
  sleepEnd: 3.4,
  lieEnd: 6.4,
  povEnd: 9.6,
  /** 窗口从手机窗放大到全屏所需秒数（CSS 过渡与 3D 相机同步） */
  windowOpenSeconds: 1.6,
  openEnd: 15.8,
} as const;

export const OPENING_TOTAL = OPENING.openEnd;

/** 3D 动作切换点（秒） */
export const OPENING_MOTION = {
  lieStart: OPENING.sleepEnd,
  introStart: OPENING.povEnd,
  introEndStart: 13.2,
  lockStart: 14.6,
  /** 抬手触碰镜子：IK 权重的起止 */
  reachIn: [6.8, 7.7] as const,
  reachOut: [9.05, 9.55] as const,
} as const;

export function phaseAt(t: number, ready: boolean): OpeningPhase {
  if (!ready) return 'loading';
  if (t < OPENING.sleepEnd) return 'sleep';
  if (t < OPENING.lieEnd) return 'liedown';
  if (t < OPENING.povEnd) return 'pov';
  if (t < OPENING.openEnd) return 'open';
  return 'hero';
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - edge0) / Math.max(edge1 - edge0, 1e-6)));
  return u * u * (3 - 2 * u);
}

/** 0 = 手机窗；1 = 全屏 */
export function windowOpenProgress(t: number): number {
  return smoothstep(OPENING.povEnd, OPENING.povEnd + OPENING.windowOpenSeconds, t);
}

/** 抬手触碰的 IK 权重 */
export function reachWeight(t: number): number {
  const [inA, inB] = OPENING_MOTION.reachIn;
  const [outA, outB] = OPENING_MOTION.reachOut;
  return smoothstep(inA, inB, t) * (1 - smoothstep(outA, outB, t));
}

/** 外轮廓（镜中的自己）的不透明度 */
export function mirrorOutlineOpacity(t: number): number {
  return smoothstep(7.0, 7.9, t) * (1 - smoothstep(OPENING.povEnd - 0.2, OPENING.povEnd + 0.5, t));
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

export function startOpeningClock(clock: OpeningClock, now: number) {
  clock.ready = true;
  clock.startedAt = now;
  clock.offset = 0;
}

export function openingTime(clock: OpeningClock, now: number): number {
  if (!clock.ready) return 0;
  return (now - clock.startedAt) / 1000 + clock.offset;
}

/** 直接跳到定格 */
export function skipOpening(clock: OpeningClock, now: number) {
  if (!clock.ready) return;
  clock.offset += OPENING_TOTAL - openingTime(clock, now);
}

export function replayOpening(clock: OpeningClock, now: number) {
  clock.startedAt = now;
  clock.offset = 0;
}
