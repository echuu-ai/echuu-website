import { smoothstep } from './openingTimeline';

export const DEBUT_SECONDS = .75;
/** One rise and a longer release, measured from the settled hero frame. */
export function debutEnvelope(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= DEBUT_SECONDS) return 0;
  return smoothstep(0.15, 0.32, elapsed) * (1 - smoothstep(0.36, DEBUT_SECONDS, elapsed));
}
