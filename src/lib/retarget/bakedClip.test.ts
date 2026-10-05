import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { decodeBakedClip, encodeBakedClip } from './bakedClip';

/** 采样整段动作：同一时间点的插值结果必须逐位相同 */
function sample(clip: THREE.AnimationClip, t: number) {
  return clip.tracks.map((track) => {
    const out = new Float32Array(track.getValueSize());
    const interpolant = track.createInterpolant();
    return Array.from(interpolant.evaluate(t).slice(0, out.length));
  });
}

describe('baked clip', () => {
  it('round-trips losslessly, sharing time axes and collapsing constant tracks', () => {
    const times = [0, 1 / 30, 2 / 30, 0.1, 0.5];
    const q = new THREE.Quaternion();
    const spin: number[] = [];
    times.forEach((t) => spin.push(...q.setFromEuler(new THREE.Euler(t * 1.7, t * 0.3, -t)).toArray()));
    const clip = new THREE.AnimationClip('test', 0.5, [
      new THREE.VectorKeyframeTrack('Normalized_hips.position', times, times.flatMap((t) => [t * 0.1, 0.9 - t, Math.sin(t)])),
      new THREE.QuaternionKeyframeTrack('Normalized_spine.quaternion', times, spin),
      new THREE.QuaternionKeyframeTrack('Normalized_leftThumbProximal.quaternion', times, times.flatMap(() => [0.1, 0.2, 0.3, 0.927])),
    ]);
    const decoded = decodeBakedClip(encodeBakedClip(clip));
    expect(decoded.name).toBe('test');
    expect(decoded.duration).toBe(0.5);
    expect(decoded.tracks.map((t) => t.name)).toEqual(clip.tracks.map((t) => t.name));
    // 不变的轨道只剩一帧
    expect(decoded.tracks[2].times.length).toBe(1);
    for (const t of [0, 0.01, 0.05, 0.1, 0.33, 0.5, 0.7]) expect(sample(decoded, t)).toEqual(sample(clip, t));
  });
  it('rejects other files', () => {
    expect(() => decodeBakedClip(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).buffer)).toThrow();
  });
});
