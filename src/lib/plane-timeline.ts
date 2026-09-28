import { MOTION_CLIPS } from '../data/motionLibrary';
import { publicUrl } from './publicUrl';
import type { AnimationItem } from '../components/lab/domain/types';

export type PlaneCueKind = 'look' | 'dodge' | 'jump' | 'catch' | 'throw';
export type PlaneTestState = 'idle' | 'throw' | 'sequence';
/** Build a rehearsal from the user's chosen clips without overwriting their authored timeline. */
export function rehearsalCues(cues: PlaneCue[], state: PlaneTestState): PlaneCue[] {
  return cues.map(c => {
    if (c.id === 'look') return { ...c, enabled: true, start: 0, duration: state === 'idle' ? 30 : 12 };
    if (c.id === 'catch') return { ...c, enabled: state !== 'idle', start: state === 'sequence' ? 5.65 : 0, duration: .85 };
    if (c.id === 'throw') return { ...c, enabled: state !== 'idle', start: state === 'sequence' ? 6.35 : .7 };
    return { ...c, enabled: false };
  });
}
export function rehearsalEnd(cues: PlaneCue[]) {
  let end = 0;
  for (const cue of cues) if (cue.enabled && cue.id !== 'look') end = Math.max(end, cue.start + cue.duration);
  return end + .7;
}
export type PlaneCue = { id: PlaneCueKind; label: string; enabled: boolean; start: number; duration: number; rate: number; trim: number; motion: string; release: number };
export const THROW_MOTION: AnimationItem = { id: 'plane/throw-object', name: 'Throw Object · Mixamo', url: publicUrl('assets/animation/plane-interaction/throw-object.fbx') };
export const PLANE_MOTIONS: AnimationItem[] = [THROW_MOTION, ...MOTION_CLIPS.filter(c => c.usable).map(c => ({ id: c.id, name: c.name, url: c.url ?? publicUrl(c.file) }))];
export const planeMotion = (id: string) => PLANE_MOTIONS.find(m => m.id === id);
export const defaultPlaneCues = (): PlaneCue[] => [
  { id: 'look', label: '注意 · 脸看向飞机', enabled: true, start: 0, duration: 7, rate: 1, trim: 0, motion: '', release: 0 },
  { id: 'dodge', label: '躲避 · 小幅后仰', enabled: false, start: 5.4, duration: .55, rate: 1, trim: 0, motion: '', release: 0 },
  { id: 'jump', label: '回应 · 跳跃', enabled: false, start: 5.9, duration: 2.4, rate: 1.5, trim: 0, motion: 'vroid/resources-animations-female-jump01', release: 0 },
  { id: 'catch', label: '接住 · 右手 IK（试验）', enabled: true, start: 5.65, duration: .85, rate: 1, trim: 0, motion: '', release: 0 },
  { id: 'throw', label: '投掷 · Throw Object', enabled: true, start: 6.35, duration: 3.94, rate: 1.5, trim: 0, motion: THROW_MOTION.id, release: 2.8 },
];
export const cueContains = (cue: PlaneCue, time: number) => cue.enabled && time >= cue.start && time < cue.start + cue.duration;
export function bodyCueAt(cues: PlaneCue[], time: number, solo: PlaneCueKind | null = null) {
  let result: PlaneCue | undefined;
  for (const cue of cues) if (cue.motion && (!solo || cue.id === solo) && cueContains(cue, time) && (!result || cue.start > result.start)) result = cue;
  return result;
}
export const cueSourceTime = (cue: PlaneCue, time: number) => cue.trim + Math.max(0, time - cue.start) * cue.rate;
export function timelineEnd(cues: PlaneCue[]) { let end = 9; for (const cue of cues) end = Math.max(end, cue.start + cue.duration); return end; }

/** The editor and WebGL read one clock. No per-frame React updates. */
export type PlaneTimeline = {
  cues: PlaneCue[]; time: number; epoch: number; playing: boolean; canvas: HTMLCanvasElement | null;
  loaded: string; error: string; solo: PlaneCueKind | null;
  plane: { x: number; y: number; z: number }; hand: { x: number; y: number; z: number }; handValid: boolean;
  releaseHand: { x: number; y: number; z: number }; releaseHandValid: boolean;
  markers: { camera: number; avatar: number }; flightDuration: number;
  interactive?: boolean; testState?: PlaneTestState;
};
export const makePlaneTimeline = (cues: PlaneCue[]): PlaneTimeline => ({ cues, time: 0, epoch: 0, playing: false, canvas: null, loaded: '', error: '', solo: null, plane: { x: 0, y: 0, z: 0 }, hand: { x: 0, y: 0, z: 0 }, handValid: false, releaseHand: { x: 0, y: 0, z: 0 }, releaseHandValid: false, markers: { camera: 4.5, avatar: 5.9 }, flightDuration: 7 });
export function timelineTime(t: PlaneTimeline, now = performance.now()) {
  return Math.min(timelineEnd(t.cues), t.time + (t.playing ? (now - t.epoch) / 1000 : 0));
}
export function seekTimeline(t: PlaneTimeline, seconds: number) {
  t.time = Math.max(0, Math.min(timelineEnd(t.cues), seconds)); t.epoch = performance.now();
}
export function pauseTimeline(t: PlaneTimeline) { seekTimeline(t, timelineTime(t)); t.playing = false; }

const KEY = 'echuu-plane-timeline-v1';
export function readPlaneCues(): PlaneCue[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!Array.isArray(saved)) return defaultPlaneCues();
    return defaultPlaneCues().map(base => {
      const c = saved.find(x => x?.id === base.id);
      if (!c) return base;
      const n = (key: string, min: number, max: number, fallback: number) => Number.isFinite(c[key]) ? Math.min(max, Math.max(min, c[key])) : fallback;
      const focusedEnabled = base.id === 'dodge' || base.id === 'jump' ? false : base.id === 'catch' || base.id === 'throw' ? true : undefined;
      return { ...base, enabled: focusedEnabled ?? (typeof c.enabled === 'boolean' ? c.enabled : base.enabled), motion: c.motion === '' || planeMotion(c.motion) ? c.motion : base.motion,
        start: n('start', 0, 20, base.start), duration: n('duration', .1, 15, base.duration), rate: n('rate', .25, 3, base.rate), trim: n('trim', 0, 30, 0), release: n('release', 0, 30, base.release) };
    });
  } catch { return defaultPlaneCues(); }
}
export function savePlaneCues(cues: PlaneCue[]) { try { localStorage.setItem(KEY, JSON.stringify(cues)); } catch { /* Session editing remains available. */ } }
