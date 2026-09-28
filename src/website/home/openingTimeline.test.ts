import { describe, expect, it } from 'vitest';
import {
  OPENING,
  OPENING_TOTAL,
  createOpeningClock,
  mirrorOutlineOpacity,
  openingTime,
  phaseAt,
  reachWeight,
  replayOpening,
  skipOpening,
  startOpeningClock,
  windowOpenProgress,
} from './openingTimeline';

describe('openingTimeline', () => {
  it('maps time to phases in order', () => {
    expect(phaseAt(0, false)).toBe('loading');
    expect(phaseAt(0, true)).toBe('sleep');
    expect(phaseAt(OPENING.sleepEnd, true)).toBe('liedown');
    expect(phaseAt(OPENING.lieEnd, true)).toBe('pov');
    expect(phaseAt(OPENING.povEnd, true)).toBe('open');
    expect(phaseAt(OPENING.openEnd, true)).toBe('hero');
    expect(phaseAt(999, true)).toBe('hero');
  });

  it('opens the window right after the pov shot', () => {
    expect(windowOpenProgress(OPENING.povEnd - 0.1)).toBe(0);
    expect(windowOpenProgress(OPENING.povEnd + OPENING.windowOpenSeconds)).toBe(1);
    const mid = windowOpenProgress(OPENING.povEnd + OPENING.windowOpenSeconds / 2);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });

  it('raises the hand only inside the pov shot', () => {
    expect(reachWeight(OPENING.lieEnd)).toBe(0);
    expect(reachWeight(8.5)).toBe(1);
    expect(reachWeight(OPENING.povEnd + 1)).toBe(0);
    expect(mirrorOutlineOpacity(8.5)).toBe(1);
    expect(mirrorOutlineOpacity(OPENING.povEnd + 1)).toBe(0);
  });

  it('clock starts at ready, skips to the end and replays', () => {
    const clock = createOpeningClock();
    expect(openingTime(clock, 5000)).toBe(0);
    startOpeningClock(clock, 1000);
    expect(openingTime(clock, 3500)).toBeCloseTo(2.5);
    skipOpening(clock, 3500);
    expect(openingTime(clock, 3500)).toBeCloseTo(OPENING_TOTAL);
    expect(phaseAt(openingTime(clock, 3500), clock.ready)).toBe('hero');
    replayOpening(clock, 9000);
    expect(openingTime(clock, 9000)).toBe(0);
  });
});
