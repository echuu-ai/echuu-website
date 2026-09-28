import { isSceneExpression, type SceneExpression } from './scene-expression';
import { isSceneLighting, type SceneLighting } from './scene-lighting';
export type Vec3 = [number, number, number];
export type SceneClip = { id: string; motionId: string; duration: number; blend: number; speed: number };
export type SceneGaze = { mode: 'forward' | 'camera' | 'target' | 'direction'; target: Vec3; yaw: number; pitch: number };
export type SceneActor = { gaze?: SceneGaze; expression?: SceneExpression; glassesHidden?: boolean; id: string; modelId: string; name: string; position: Vec3; rotation: Vec3; scale: number; framingHeight?: number; clips: SceneClip[] };
export type SceneCamera = { roll?: number; position: Vec3; target: Vec3; fov: number; dofEnabled?: boolean; focusMode?: 'target' | 'manual'; focusDistance?: number; focusRange?: number; blur?: number; easing?: 'smooth' | 'linear' | 'cut' };
export type CameraKey = SceneCamera & { id: string; time: number };
export type SceneProject = { cameras?: { id: string; name: string; camera: SceneCamera; keys: CameraKey[] }[]; activeCameraId?: string; version: 1; lighting?: SceneLighting; actors: SceneActor[]; camera: SceneCamera; keys: CameraKey[]; duration: number; skyRotation: number; grid: boolean };
export const DEFAULT_CAMERA: SceneCamera = { position: [0, 1.4, 4.5], target: [0, 0.9, 0], fov: 35 };
export const newClip = (motionId = 'idle'): SceneClip => ({ id: crypto.randomUUID(), motionId, duration: 4, blend: 0.6, speed: 1 });
export const newActor = (modelId = 'cory', index = 0): SceneActor => ({ id: crypto.randomUUID(), modelId, name: `Actor ${index + 1}`, position: [index * 1.2, 0, 0], rotation: [0, 0, 0], scale: 1, clips: [newClip()] });
export const newProject = (): SceneProject => ({ version: 1, actors: [newActor()], camera: structuredClone(DEFAULT_CAMERA), keys: [], duration: 12, skyRotation: 0, grid: true });
// Sequential clips overlap by the incoming blend, bounded to avoid three-way overlaps.
export function clipLayout(clips: SceneClip[]) {
  let end = 0;
  return clips.map((clip, index) => {
    const overlap = index ? Math.min(clip.blend, clip.duration / 2, clips[index - 1].duration / 2) : 0;
    const start = end - overlap;
    end = start + clip.duration;
    return { ...clip, start, end, overlap };
  });
}
export function clipWeight(layout: ReturnType<typeof clipLayout>, index: number, time: number) {
  const clip = layout[index];
  if (time < clip.start || time >= clip.end) return 0;
  const incoming = clip.overlap ? Math.min(1, (time - clip.start) / clip.overlap) : 1;
  const next = layout[index + 1];
  const outgoing = next?.overlap ? Math.min(1, (clip.end - time) / next.overlap) : 1;
  return Math.max(0, Math.min(incoming, outgoing));
}
export function parseProject(text: string): SceneProject {
  const p = JSON.parse(text);
  const number = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const vector = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every(n => number(n, -1000, 1000));
  const camera = (v: any) => v && vector(v.position) && vector(v.target) && number(v.fov, 5, 110)
    && (v.roll === undefined || number(v.roll, -Math.PI * 2, Math.PI * 2))
    && (v.dofEnabled === undefined || typeof v.dofEnabled === 'boolean')
    && (v.focusMode === undefined || ['target', 'manual'].includes(v.focusMode))
    && (v.focusDistance === undefined || number(v.focusDistance, .05, 200))
    && (v.focusRange === undefined || number(v.focusRange, .01, 20))
    && (v.blur === undefined || number(v.blur, 0, 8))
    && (v.easing === undefined || ['smooth', 'linear', 'cut'].includes(v.easing));
  const ids = new Set<string>();
  const id = (v: unknown) => typeof v === 'string' && v.length > 0 && !ids.has(v) && !!ids.add(v);
  if (p?.version !== 1 || !Array.isArray(p.actors) || p.actors.length > 12 || !camera(p.camera) || !number(p.duration, 1, 120) || !number(p.skyRotation, -360, 360) || typeof p.grid !== 'boolean' || !Array.isArray(p.keys) || p.keys.length > 100) throw Error('场景格式无效');
  if (p.cameras !== undefined) {
    if (!Array.isArray(p.cameras) || p.cameras.length < 1 || p.cameras.length > 12) throw Error('相机列表无效');
    const cameraIds = new Set<string>();
    for (const c of p.cameras) {
      if (!c || typeof c.id !== 'string' || !c.id || cameraIds.has(c.id) || typeof c.name !== 'string' || !camera(c.camera) || !Array.isArray(c.keys) || c.keys.length > 100) throw Error('相机数据无效');
      cameraIds.add(c.id);
      const keyIds = new Set<string>();
      for (const k of c.keys) { if (!k || typeof k.id !== 'string' || !k.id || keyIds.has(k.id) || !camera(k) || !number(k.time, 0, p.duration)) throw Error('相机轨道无效'); keyIds.add(k.id); }
    }
    if (!cameraIds.has(p.activeCameraId)) throw Error('当前相机无效');
  } else if (p.activeCameraId !== undefined) throw Error('缺少相机列表');
  if (p.lighting !== undefined && !isSceneLighting(p.lighting)) throw Error('灯光数据无效');
  for (const a of p.actors) {
    if (!a || !id(a.id) || typeof a.modelId !== 'string' || typeof a.name !== 'string' || !vector(a.position) || !vector(a.rotation) || !number(a.scale, .05, 10) || (a.framingHeight !== undefined && !number(a.framingHeight, .01, 100)) || !Array.isArray(a.clips) || a.clips.length > 100) throw Error('角色数据无效');
    if (a.gaze !== undefined && (!a.gaze || !['forward', 'camera', 'target', 'direction'].includes(a.gaze.mode) || !vector(a.gaze.target) || !number(a.gaze.yaw, -45, 45) || !number(a.gaze.pitch, -45, 45))) throw Error('视线数据无效');
    if (a.expression !== undefined && !isSceneExpression(a.expression)) throw Error('表情数据无效');
    if (a.glassesHidden !== undefined && typeof a.glassesHidden !== 'boolean') throw Error('眼镜开关无效');
    for (const c of a.clips) if (!c || !id(c.id) || typeof c.motionId !== 'string' || !number(c.duration, .2, 60) || !number(c.blend, 0, 10) || !number(c.speed, .1, 4)) throw Error('动作数据无效');
  }
  for (const k of p.keys) if (!k || !id(k.id) || !camera(k) || !number(k.time, 0, p.duration)) throw Error('机位数据无效');
  return p;
}
