import { DEFAULT_LIVE_AVATAR_RIG as rig, DEFAULT_LIVE_VRM_LOOK as look, LIVE_AVATAR_RIG_STORAGE_KEY, LIVE_VRM_LOOK_STORAGE_KEY } from '@/data/liveStagePresets';
import type { Vec3 } from './scene-editor';
export type SceneLight = { enabled: boolean; color: string; intensity: number; position: Vec3 };
export type SceneLighting = {
  ambientColor: string; ambientIntensity: number; target: Vec3;
  key: SceneLight; fill: SceneLight; rim: SceneLight;
  environmentIntensity: number; backgroundIntensity: number; fogDensity: number;
};
export function defaultSceneLighting(): SceneLighting {
  return {
    ambientColor: look.ambientColor, ambientIntensity: rig.ambientLightIntensity!, target: [0, 0, 0],
    key: { enabled: true, color: look.keyColor, intensity: rig.keyLightIntensity!, position: [rig.keyLightX!, rig.keyLightY!, rig.keyLightZ!] },
    fill: { enabled: true, color: look.fillColor, intensity: rig.fillLightIntensity!, position: [rig.fillLightX!, rig.fillLightY!, rig.fillLightZ!] },
    rim: { enabled: false, color: '#d4dcff', intensity: 1, position: [0, 2.5, -3] },
    environmentIntensity: rig.hdrEnvironmentIntensity!, backgroundIntensity: rig.hdrBackgroundIntensity!, fogDensity: rig.hdrFogDensity!,
  };
}
export function isSceneLighting(value: unknown): value is SceneLighting {
  if (!value || typeof value !== 'object') return false;
  const v = value as SceneLighting;
  const num = (n: unknown, min: number, max: number) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  const color = (s: unknown) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
  const vec = (a: unknown) => Array.isArray(a) && a.length === 3 && a.every(n => num(n, -1000, 1000));
  const light = (l: SceneLight) => l && typeof l.enabled === 'boolean' && color(l.color) && num(l.intensity, 0, 10) && vec(l.position);
  return color(v.ambientColor) && num(v.ambientIntensity, 0, 5) && vec(v.target)
    && light(v.key) && light(v.fill) && light(v.rim)
    && num(v.environmentIntensity, 0, 5) && num(v.backgroundIntensity, 0, 5) && num(v.fogDensity, 0, .2);
}
/** Snapshot only: never writes to live-room storage. Invalid saved values use the calibrated defaults. */
export function loadSceneLighting(): SceneLighting {
  const defaults = defaultSceneLighting();
  try {
    const savedRig = { ...rig, ...JSON.parse(localStorage.getItem(LIVE_AVATAR_RIG_STORAGE_KEY) ?? '{}') };
    const savedLook = { ...look, ...JSON.parse(localStorage.getItem(LIVE_VRM_LOOK_STORAGE_KEY) ?? '{}') };
    const candidate: SceneLighting = {
      ...defaults,
      ambientColor: savedLook.ambientColor, ambientIntensity: savedRig.ambientLightIntensity,
      key: { ...defaults.key, color: savedLook.keyColor, intensity: savedRig.keyLightIntensity, position: [savedRig.keyLightX, savedRig.keyLightY, savedRig.keyLightZ] },
      fill: { ...defaults.fill, color: savedLook.fillColor, intensity: savedRig.fillLightIntensity, position: [savedRig.fillLightX, savedRig.fillLightY, savedRig.fillLightZ] },
      environmentIntensity: savedRig.hdrEnvironmentIntensity, backgroundIntensity: savedRig.hdrBackgroundIntensity, fogDensity: savedRig.hdrFogDensity,
    };
    return isSceneLighting(candidate) ? candidate : defaults;
  } catch { return defaults; }
}
