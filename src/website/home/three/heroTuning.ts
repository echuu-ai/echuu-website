import { useSyncExternalStore } from 'react';
import heroSceneJson from '../heroScene.json';

/**
 * 首屏定格镜头与微风。开发环境由 HeroTuningPanel（?tune=hero）实时修改并存进 localStorage；
 * 正式构建只用 HERO_DEFAULTS。镜头的默认值取自场景文件 heroScene.json，调好后把数值写回场景文件。
 */
export type HeroTuning = {
  /** 定格相机高度（m）；注视点不动，抬高 = 俯拍 */
  camY: number;
  /** 焦点相对两眼中点沿视线前后移（m）：负 = 往镜头，正 = 往后脑勺 */
  focusOffset: number;
  /** 清晰范围（m） */
  focusRange: number;
  /** 虚化强度 */
  blur: number;
  /** 景深开关：关掉对比，判断画面发虚是不是景深造成的 */
  dof: boolean;
  /** 在焦点处画一个小标记 */
  showFocus: boolean;
  /** 风力（叠加在头发、衣摆弹簧骨骼的重力上） */
  wind: number;
  /** 风向（世界水平方位角，度；0 = +Z） */
  windDir: number;
  /** 紊动：各节骨骼错开相位的抖动比例 */
  turbulence: number;
};

const camera = heroSceneJson.camera;

export const HERO_DEFAULTS: HeroTuning = {
  camY: camera.position[1],
  // 2026-10-13 Cory 在面板里调定：焦点比两眼中点往镜头前移 5.5cm（落在镜框 / 鼻梁上）
  focusOffset: -0.055,
  focusRange: camera.focusRange,
  blur: camera.blur,
  dof: true,
  showFocus: false,
  wind: 0.07,
  windDir: 0,
  turbulence: 0.67,
};

type NumericKey = Exclude<keyof HeroTuning, 'dof' | 'showFocus'>;

export const HERO_RANGES: Record<NumericKey, { min: number; max: number; step: number; label: string }> = {
  camY: { min: 1.2, max: 2, step: 0.01, label: '相机高度' },
  focusOffset: { min: -0.3, max: 0.3, step: 0.005, label: '焦点前后' },
  focusRange: { min: 0.02, max: 1, step: 0.01, label: '清晰范围' },
  blur: { min: 0, max: 12, step: 0.1, label: '虚化强度' },
  wind: { min: 0, max: 1, step: 0.01, label: '风力' },
  windDir: { min: 0, max: 360, step: 1, label: '风向' },
  turbulence: { min: 0, max: 1, step: 0.01, label: '紊动' },
};

/** 每帧写入的读数，只给面板显示 */
export const heroReadout = { camToFocus: 0, camToEyes: 0, camera: [0, 0, 0] as number[] };

const STORAGE_KEY = 'echuu-hero-tuning';

function load(): HeroTuning {
  if (!import.meta.env.DEV || typeof window === 'undefined') return { ...HERO_DEFAULTS };
  try {
    return { ...HERO_DEFAULTS, ...(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<HeroTuning>) };
  } catch {
    return { ...HERO_DEFAULTS };
  }
}

let current = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

/** 渲染循环里直接读，不经过 React */
export function getHeroTuning() {
  return current;
}

export function setHeroTuning(next: HeroTuning) {
  current = { ...next };
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* ignore */ }
  emit();
}

export function resetHeroTuning() {
  current = { ...HERO_DEFAULTS };
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  emit();
}

export function useHeroTuning() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    () => current,
    () => current,
  );
}
