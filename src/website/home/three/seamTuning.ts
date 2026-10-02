/**
 * 首屏撕纸切口的可调参数（SkyEdgeEffect 每帧读取）。
 * 开发环境里由 SeamTuningPanel 实时修改，并存在 localStorage；正式构建只用 DEFAULTS。
 */

export type SeamTuning = {
  /** 静止时切口平均高度：首屏高度的百分比（0 = 最底边） */
  restPct: number;
  /** 滚动时最多再抬起多少：首屏高度的百分比 */
  liftPct: number;
  /** 大波浪起伏幅度 */
  swell: number;
  /** 中等纹理幅度 */
  grain: number;
  /** 细碎纸纤维锯齿幅度 */
  fiber: number;
  /** 切口上方提亮 */
  rim: number;
  /** 亮线宽度（越大越粗） */
  lineWidth: number;
  /** 亮线亮度 */
  lineAlpha: number;
  /** 切口上方彩边带高度（首屏比例） */
  bandHeight: number;
  /** 静止时彩边强度 */
  bandAmount: number;
  /** 滚动时全画面色散强度 */
  sceneCA: number;
};

export const SEAM_DEFAULTS: SeamTuning = {
  restPct: 1.6,
  liftPct: 3,
  swell: 0.04,
  grain: 1,
  fiber: 1,
  rim: 0.2,
  lineWidth: 0.004,
  lineAlpha: 1,
  bandHeight: 0.22,
  bandAmount: 1.1,
  sceneCA: 4,
};

export const SEAM_RANGES: Record<keyof SeamTuning, { min: number; max: number; step: number; label: string }> = {
  restPct: { min: -1, max: 8, step: 0.1, label: '静止高度（首屏 %）' },
  liftPct: { min: 0, max: 10, step: 0.1, label: '滚动抬起（首屏 %）' },
  swell: { min: 0, max: 0.15, step: 0.005, label: '大波浪起伏' },
  grain: { min: 0, max: 3, step: 0.05, label: '中等纹理' },
  fiber: { min: 0, max: 3, step: 0.05, label: '纸纤维锯齿' },
  rim: { min: 0, max: 1, step: 0.02, label: '切口上方提亮' },
  lineWidth: { min: 0, max: 0.02, step: 0.0005, label: '亮线宽度' },
  lineAlpha: { min: 0, max: 1, step: 0.05, label: '亮线亮度' },
  bandHeight: { min: 0, max: 0.6, step: 0.01, label: '彩边带高度' },
  bandAmount: { min: 0, max: 3, step: 0.05, label: '静止彩边强度' },
  sceneCA: { min: 0, max: 12, step: 0.1, label: '滚动色散强度' },
};

const STORAGE_KEY = 'echuu-seam-tuning';

function load(): SeamTuning {
  if (!import.meta.env.DEV) return { ...SEAM_DEFAULTS };
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SeamTuning>;
    return { ...SEAM_DEFAULTS, ...saved };
  } catch {
    return { ...SEAM_DEFAULTS };
  }
}

/** 当前生效的参数（可变对象，着色器每帧读） */
export const seamTuning: SeamTuning = load();

export function setSeamTuning(patch: Partial<SeamTuning>) {
  Object.assign(seamTuning, patch);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seamTuning)); } catch { /* ignore */ }
}

export function resetSeamTuning() {
  Object.assign(seamTuning, SEAM_DEFAULTS);
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** 首屏百分比 → 着色器里的切口进度（0.0833 对应最底边；阈值 = y / 1.2 + 1/12） */
export const pctToProgress = (pct: number) => 1 / 12 + pct / 100 / 1.2;
