import type { PlaneTimeline } from './plane-timeline';
/** Bridge between the DOM cursor and an available avatar scene; no React frame updates. */
export const planeTimelinePreview = { current: null as PlaneTimeline | null };
export const sceneCursorFlight = { active: false, inside: false, x: 0, y: 0, heading: 0, held: false, session: 0, canvas: null as HTMLCanvasElement | null, nearAvatar: false, relativeHeight: 0, orbitProgress: 0, returning: false };
export type SceneFlightHost = { start: (x: number, y: number) => boolean; cancel: () => void; score?: (x: number, y: number) => number };
const hosts = new Set<SceneFlightHost>();
let activeHost: SceneFlightHost | null = null;
export function registerSceneFlightHost(next: SceneFlightHost) {
  hosts.add(next);
  return () => {
    hosts.delete(next);
    if (activeHost === next) { cancelSceneCursorFlight(); }
  };
}
export function startSceneCursorFlight(x: number, y: number) {
  cancelSceneCursorFlight();
  const candidates = [...hosts].map(host => ({ host, score: host.score?.(x, y) ?? 0 }))
    .filter(item => Number.isFinite(item.score)).sort((a, b) => a.score - b.score);
  for (const { host } of candidates) {
    if (!host.start(x, y)) continue;
    activeHost = host;
    sceneCursorFlight.session += 1;
    sceneCursorFlight.x = x; sceneCursorFlight.y = y; sceneCursorFlight.heading = 0;
    sceneCursorFlight.inside = false; sceneCursorFlight.active = true; sceneCursorFlight.held = true; sceneCursorFlight.orbitProgress = 0; sceneCursorFlight.returning = false;
    return true;
  }
  return false;
}
export function moveSceneCursorTarget(x: number, y: number) { target.x = x; target.y = y; }
export const target = { x: 0, y: 0 };
export function releaseSceneCursorFlight() { sceneCursorFlight.held = false; }
export function cancelSceneCursorFlight() { activeHost?.cancel(); activeHost = null; sceneCursorFlight.active = false; sceneCursorFlight.inside = false; sceneCursorFlight.held = false; sceneCursorFlight.orbitProgress = 0; sceneCursorFlight.returning = false; }
