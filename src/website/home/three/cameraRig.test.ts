import { describe, expect, it } from 'vitest';
import { hermite } from './cameraRig';

describe('cinematic path continuity', () => {
  const times = [0, 0.7, 2.1, 3.4, 5, 5.45, 8];
  const values = [16, 16, 16, 38, 44, 40, 22.9];
  it('keeps unequal-duration lens transitions inside their endpoints', () => {
    for (let i = 0; i < times.length - 1; i++) {
      for (let step = 0; step <= 100; step++) {
        const sample = hermite(times, values, times[i] + (times[i + 1] - times[i]) * step / 100);
        expect(sample).toBeGreaterThanOrEqual(Math.min(values[i], values[i + 1]) - 1e-10);
        expect(sample).toBeLessThanOrEqual(Math.max(values[i], values[i + 1]) + 1e-10);
      }
    }
  });
  it('has matching incoming and outgoing velocity at every join', () => {
    const epsilon = 1e-5;
    for (const t of times.slice(1, -1)) {
      const left = (hermite(times, values, t) - hermite(times, values, t - epsilon)) / epsilon;
      const right = (hermite(times, values, t + epsilon) - hermite(times, values, t)) / epsilon;
      expect(Math.abs(left - right)).toBeLessThan(0.005);
    }
  });
  it('preserves the paper hold and exact final framing', () => {
    expect(hermite(times, values, 1.2)).toBe(16);
    expect(hermite(times, values, 8)).toBe(22.9);
    expect(hermite(times, values, 100)).toBe(22.9);
  });
});
