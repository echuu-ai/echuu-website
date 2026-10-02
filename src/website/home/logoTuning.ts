import { useSyncExternalStore } from 'react';

/**
 * 首屏 logo 的调色参数：字母 / 外环部分和底下的标语（「你的OC出道舞台」）各一套。
 * 用 SVG 滤镜实现（LogoToneFilters），开发环境由 LogoTuningPanel（?tune=logo）实时修改并存进 localStorage；
 * 正式构建只用 LOGO_DEFAULTS，调好后把「复制数值」的结果写回这里。
 */

export type LogoTone = {
  /** 压深中间调：>1 变深，最亮的白色高光不受影响（gamma 指数） */
  deepen: number;
  /** 偏蓝：额外压暗红、绿通道，让中间调更偏饱和蓝 */
  blueShift: number;
  /** 饱和度 */
  saturate: number;
  /** 整体亮度（乘法） */
  brightness: number;
  /** 不透明度 */
  opacity: number;
};

export type LogoTuning = { mark: LogoTone; tagline: LogoTone; shadow: number };

const IDENTITY: LogoTone = { deepen: 1, blueShift: 0, saturate: 1, brightness: 1, opacity: 1 };

export const LOGO_DEFAULTS: LogoTuning = {
  mark: { ...IDENTITY },
  tagline: { ...IDENTITY },
  /** 原有的深蓝投影强度（0 = 关） */
  shadow: 0.2,
};

export const LOGO_TONE_RANGES: Record<keyof LogoTone, { min: number; max: number; step: number; label: string }> = {
  deepen: { min: 0.5, max: 4, step: 0.05, label: '压深中间调' },
  blueShift: { min: 0, max: 1, step: 0.02, label: '偏蓝' },
  saturate: { min: 0, max: 3, step: 0.05, label: '饱和度' },
  brightness: { min: 0.3, max: 1.5, step: 0.01, label: '亮度' },
  opacity: { min: 0, max: 1, step: 0.01, label: '不透明度' },
};

/** 标语在 logo 图里的位置（808×620 的 logo 图，按带标语的 logo-pugua 版量出来的；现在的深色版没有标语，这块是空的） */
export const TAGLINE_CLIP = { top: 77.5, right: 6.5, bottom: 7, left: 39 };

const STORAGE_KEY = 'echuu-logo-tuning';
const clone = (t: LogoTuning): LogoTuning => ({ mark: { ...t.mark }, tagline: { ...t.tagline }, shadow: t.shadow });

function load(): LogoTuning {
  if (!import.meta.env.DEV || typeof window === 'undefined') return clone(LOGO_DEFAULTS);
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<LogoTuning>;
    return {
      mark: { ...LOGO_DEFAULTS.mark, ...saved.mark },
      tagline: { ...LOGO_DEFAULTS.tagline, ...saved.tagline },
      shadow: saved.shadow ?? LOGO_DEFAULTS.shadow,
    };
  } catch {
    return clone(LOGO_DEFAULTS);
  }
}

let current = load();
const listeners = new Set<() => void>();

export function setLogoTuning(next: LogoTuning) {
  current = clone(next);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}

export function resetLogoTuning() {
  current = clone(LOGO_DEFAULTS);
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}

export function useLogoTuning() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    () => current,
    () => current,
  );
}

/** 标语的调色和字母部分一样时不用单独叠一层 */
export const toneEquals = (a: LogoTone, b: LogoTone) =>
  (Object.keys(a) as (keyof LogoTone)[]).every((key) => a[key] === b[key]);
