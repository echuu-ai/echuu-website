import { describe, expect, it } from 'vitest';
import { debutEnvelope, DEBUT_SECONDS } from './debutHighlight';
describe('debut highlight', () => {
  it('is absent before the hero settles and after the release', () => {
    for (const t of [-10, 0, DEBUT_SECONDS, 60]) expect(debutEnvelope(t)).toBe(0);
  });
  it('rises once then settles without looping or exceeding the light budget', () => {
    expect(debutEnvelope(0.2)).toBeLessThan(debutEnvelope(0.32));
    expect(debutEnvelope(0.34)).toBe(1);
    expect(debutEnvelope(0.4)).toBeGreaterThan(debutEnvelope(0.65));
    for (let t=0;t<4;t+=0.05) { expect(debutEnvelope(t)).toBeGreaterThanOrEqual(0); expect(debutEnvelope(t)).toBeLessThanOrEqual(1); }
  });
});
