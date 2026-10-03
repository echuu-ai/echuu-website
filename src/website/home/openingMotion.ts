import { OPENING_MOTION as M, OPENING_TOTAL, smoothstep } from './openingTimeline';

export type MotionKey = 'sleep' | 'standUp' | 'intro' | 'introEnd' | 'targetLock';
export const MOTION_KEYS: MotionKey[] = ['sleep', 'standUp', 'intro', 'introEnd', 'targetLock'];
const START = { sleep: 0, standUp: M.standStart, intro: M.introStart, introEnd: M.introEndStart, targetLock: M.lockStart };

/** Absolute sampling keeps clips, IK and the camera synchronized after slow frames, seeks and replay. */
export function motionWeight(key: MotionKey, t: number, lockBlend = 0.6): number {
  // 睡姿 → Stand Up 第一帧是从侧卧转到仰躺，过渡放长一点，像翻身醒来
  const stand = smoothstep(M.standStart, M.standStart + 1.2, t);
  const end = smoothstep(M.introEndStart, M.introEndStart + 0.35, t);
  const lock = smoothstep(M.lockStart, M.lockStart + Math.max(0.001, lockBlend), t);
  if (t < M.introStart) return key === 'sleep' ? 1 - stand : key === 'standUp' ? stand : 0;
  if (key === 'intro') return 1 - end;
  if (key === 'introEnd') return end * (1 - lock);
  return key === 'targetLock' ? lock : 0;
}

export function motionTime(key: MotionKey, t: number, duration: number, lockSpeed = 1): number {
  if (duration <= 0) return 0;
  const elapsed = Math.max(0, t - START[key]);
  if (key === 'sleep') return (elapsed + 1.5) % duration;
  if (key === 'targetLock') {
    // Arrive at the final pose continuously; skipping uses exactly the same pose.
    const speed = Math.max(0.001, lockSpeed);
    const offset = Math.max(0, duration - (OPENING_TOTAL - M.lockStart) * speed);
    return Math.min(duration, offset + elapsed * speed);
  }
  // standUp / intro / introEnd play once and hold their last frame.
  return Math.min(duration, elapsed);
}

/** Preserve horizontal subject coverage on portrait screens, without altering the desktop camera. */
export function portraitPullback(aspect: number, t: number): number {
  return (Math.min(2.6, Math.max(1, 1.2 / Math.max(0.3, aspect))) - 1)
    * smoothstep(M.introEndStart, OPENING_TOTAL, t);
}
