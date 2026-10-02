import { useSyncExternalStore } from 'react';

/**
 * 首屏 3D 场景光的倍率（乘在场景文件 / 直播间预设的数值上，1 = 原样）。
 * 开发环境由 SceneGradePanel（?tune=grade）实时修改并存进 localStorage；正式构建只用 SCENE_DEFAULTS。
 */
export type SceneTuning = {
  /** 环境光（HDR 照明强度） */
  env: number;
  /** 天空背景亮度 */
  sky: number;
  /** 泛光强度 */
  bloom: number;
  /** 泛光阈值：越低越多地方发光 */
  bloomThreshold: number;
};

export const SCENE_DEFAULTS: SceneTuning = { env: 1, sky: 1, bloom: 1, bloomThreshold: 1 };

export const SCENE_RANGES: Record<keyof SceneTuning, { min: number; max: number; step: number; label: string }> = {
  env: { min: 0, max: 3, step: 0.02, label: '环境光' },
  sky: { min: 0, max: 3, step: 0.02, label: '天空亮度' },
  bloom: { min: 0, max: 3, step: 0.02, label: '泛光强度' },
  bloomThreshold: { min: 0.2, max: 2, step: 0.02, label: '泛光阈值' },
};

const STORAGE_KEY = 'echuu-scene-tuning';

function load(): SceneTuning {
  if (!import.meta.env.DEV || typeof window === 'undefined') return { ...SCENE_DEFAULTS };
  try {
    return { ...SCENE_DEFAULTS, ...(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SceneTuning>) };
  } catch {
    return { ...SCENE_DEFAULTS };
  }
}

let current = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function setSceneTuning(next: SceneTuning) {
  current = { ...next };
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* ignore */ }
  emit();
}

export function resetSceneTuning() {
  current = { ...SCENE_DEFAULTS };
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  emit();
}

export function useSceneTuning() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    () => current,
    () => current,
  );
}
