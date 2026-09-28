import { describe, expect, it } from 'vitest';
import { AnimationMixer, AnimationClip, NumberKeyframeTrack, Object3D, LoopOnce } from 'three';
import { MOTION_KEYS, motionTime, motionWeight, portraitPullback } from './openingMotion';

describe('absolute opening animation', () => {
  it('preserves total weight across all transitions, including skip and replay', () => {
    for (const t of [0, 3.4, 3.7, 4.3, 9.59, 9.6, 13.2, 13.35, 14.6, 14.9, 15.8, 100]) {
      expect(MOTION_KEYS.reduce((sum, key) => sum + motionWeight(key, t), 0)).toBeCloseTo(1);
    }
  });
  it('produces the same Three.js pose at 60fps, 10fps, direct seek and replay', () => {
    function sample(times: number[]) {
      const root = new Object3D();
      const mixer = new AnimationMixer(root);
      const actions = MOTION_KEYS.map((key, i) => {
        const clip = new AnimationClip(key, 4, [new NumberKeyframeTrack('.position[x]', [0, 4], [i, i + 4])]);
        const action = mixer.clipAction(clip).setLoop(LoopOnce, 1).play();
        action.paused = true;
        return action;
      });
      for (const t of times) {
        actions.forEach((action, i) => {
          action.time = motionTime(MOTION_KEYS[i], t, 4);
          action.setEffectiveWeight(motionWeight(MOTION_KEYS[i], t));
        });
        mixer.update(0);
      }
      return root.position.x;
    }
    for (const end of [3.8, 8.5, 13.4, 14.9, 15.8]) {
      const direct = sample([end]);
      expect(sample(Array.from({length: Math.ceil(end * 60)}, (_, i) => i / 60).concat(end))).toBeCloseTo(direct);
      expect(sample(Array.from({length: Math.ceil(end * 10)}, (_, i) => i / 10).concat(end))).toBeCloseTo(direct);
      expect(sample([16, 0, end])).toBeCloseTo(direct);
    }
  });
  it('arrives continuously at the final pose instead of jumping on skip', () => {
    expect(motionTime('targetLock', 15.8, 4)).toBeCloseTo(4);
    expect(4 - motionTime('targetLock', 15.799, 4)).toBeLessThan(0.004);
    expect(motionTime('targetLock', 99, 4)).toBe(4);
  });
  it('keeps desktop framing and only pulls back after the first-person sequence', () => {
    expect(portraitPullback(1440 / 1030, 20)).toBe(0);
    expect(portraitPullback(390 / 844, 9)).toBe(0);
    expect(portraitPullback(390 / 844, 20)).toBeGreaterThan(1);
    expect(Number.isFinite(portraitPullback(0, 20))).toBe(true);
  });
});
