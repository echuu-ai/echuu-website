import { describe, expect, it } from 'vitest';
import {
  OPENING,
  OPENING_TOTAL,
  createOpeningClock,
  markOpeningReady,
  openingStarted,
  openingTime,
  phaseAt,
  replayOpening,
  skipOpening,
  startOpeningClock,
  windowOpenProgress,
} from './openingTimeline';

describe('openingTimeline', () => {
  it('maps time to phases in order', () => {
    expect(phaseAt(0, false)).toBe('loading');
    expect(phaseAt(0, true, false)).toBe('draw');
    expect(phaseAt(0, true)).toBe('wake');
    expect(phaseAt(OPENING.wakeEnd, true)).toBe('fold');
    expect(phaseAt(OPENING.openStart, true)).toBe('open');
    expect(phaseAt(OPENING.openEnd, true)).toBe('hero');
    expect(phaseAt(999, true)).toBe('hero');
  });

  it('keeps the window opening and hero lock exactly where they were', () => {
    expect(OPENING.openStart).toBe(9.6);
    expect(OPENING.openEnd).toBe(15.8);
    expect(windowOpenProgress(OPENING.openStart - 0.1)).toBe(0);
    expect(windowOpenProgress(OPENING.openStart + OPENING.windowOpenSeconds)).toBe(1);
    const mid = windowOpenProgress(OPENING.openStart + OPENING.windowOpenSeconds / 2);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });

  it('holds at t=0 while the user draws, then runs from the wake moment', () => {
    const clock = createOpeningClock();
    markOpeningReady(clock);
    expect(openingStarted(clock)).toBe(false);
    expect(openingTime(clock, 50_000)).toBe(0);
    startOpeningClock(clock, 60_000);
    expect(openingStarted(clock)).toBe(true);
    expect(openingTime(clock, 62_500)).toBeCloseTo(2.5);
  });

  it('skips from the drawing straight to the hero and replays from wake', () => {
    const clock = createOpeningClock();
    markOpeningReady(clock);
    skipOpening(clock, 3500);
    expect(openingTime(clock, 3500)).toBeCloseTo(OPENING_TOTAL);
    expect(phaseAt(openingTime(clock, 3500), clock.ready, openingStarted(clock))).toBe('hero');
    replayOpening(clock, 9000);
    expect(openingTime(clock, 9000)).toBe(0);
  });
});
