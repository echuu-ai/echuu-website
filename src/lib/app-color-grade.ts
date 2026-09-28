export const APP_COLOR_GRADE_FILTER_ID = 'app-color-grade-filter';
export const APP_COLOR_GRADE_UNDO_FILTER_ID = 'app-color-grade-undo-filter';
export const APP_COLOR_GRADE_STORAGE_KEY = 'oshi-stage-app-color-grade';
export const APP_COLOR_GRADE_EXPORT_TARGET = 'oshi-stage-app-color-grade';
/**
 * The postprocessing effect accepts values above the library's common 1–3
 * examples. Step 3 deliberately exposes a stronger creative range so a wide
 * focus band can still produce an unmistakable background blur.
 */
export const ONBOARDING_STEP3_DOF_BOKEH_MAX = 24;

/** Reference-image calibration (2026-09-19), derived from the earlier blue curves.
 * Keep endpoints neutral and avoid channel clipping in shadows/highlights. */
export const DEFAULT_APP_COLOR = {
  brightness: 0.97,
  contrast: 1.08,
  saturation: 1.3,
  hue: 0,
  liftX: 0,
  liftY: 0,
  liftStrength: 0,
  gammaX: 0,
  gammaY: 0,
  gammaStrength: 0,
  gainX: 0,
  gainY: 0,
  gainStrength: 0,
  // Step 2 stays sharp: depth of field only ramps in on the way to Step 3.
  // The focal length and focus offset below still feed the keyframe lerp.
  onboardingStep2DofEnabled: false,
  onboardingStep2DofFocalLength: 0.035,
  onboardingStep2DofBokehScale: 1.2,
  // Shifts the focal plane along the camera sight line, away from the focus bone.
  onboardingStep2DofFocusOffset: 0,
  onboardingStep3DofEnabled: true,
  onboardingStep3DofFocusDistance: 0.012,
  onboardingStep3DofFocalLength: 0.035,
  onboardingStep3DofBokehScale: 1.2,
  onboardingStep3DofFocusOffset: 0,
  curveEnabled: true,
  curveMaster: 1,
  curveR: 1,
  curveG: 1,
  curveB: 1,
  curveA: 1,
  curvePointsMaster: [0, 0.18, 0.4, 0.75, 1],
  curvePointsR: [0, 0.21, 0.43, 0.75, 1],
  curvePointsG: [0, 0.25, 0.5, 0.75, 1],
  curvePointsB: [0, 0.32, 0.57, 0.82, 1],
} as const;

export type AppColorGradeState = {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  liftX: number;
  liftY: number;
  liftStrength: number;
  gammaX: number;
  gammaY: number;
  gammaStrength: number;
  gainX: number;
  gainY: number;
  gainStrength: number;
  onboardingStep2DofEnabled: boolean;
  onboardingStep2DofFocalLength: number;
  onboardingStep2DofBokehScale: number;
  onboardingStep2DofFocusOffset: number;
  onboardingStep3DofEnabled: boolean;
  onboardingStep3DofFocusDistance: number;
  onboardingStep3DofFocalLength: number;
  onboardingStep3DofBokehScale: number;
  onboardingStep3DofFocusOffset: number;
  curveEnabled: boolean;
  curveMaster: number;
  curveR: number;
  curveG: number;
  curveB: number;
  curveA: number;
  curvePointsMaster: number[];
  curvePointsR: number[];
  curvePointsG: number[];
  curvePointsB: number[];
};

export function clampColorGradeValue(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function sampleColorGradeCurve(points: number[], t: number) {
  const safe = points.length >= 2 ? points : [0, 1];
  const position = clampColorGradeValue(t) * (safe.length - 1);
  const left = Math.floor(position);
  const right = Math.min(safe.length - 1, left + 1);
  const localT = position - left;
  return clampColorGradeValue(safe[left] + (safe[right] - safe[left]) * localT);
}

function applyColorGradeCurve(points: number[], t: number, amount = 1) {
  const sampled = sampleColorGradeCurve(points, t);
  return clampColorGradeValue(t + (sampled - t) * amount);
}

export function buildColorGradeCurveTable(value: AppColorGradeState, points: number[], amount: number) {
  return Array.from({ length: 33 }, (_, index) => {
    const t = index / 32;
    if (!value.curveEnabled) return t.toFixed(4);
    const master = applyColorGradeCurve(value.curvePointsMaster, t, value.curveMaster);
    const channel = applyColorGradeCurve(points, t, amount);
    return clampColorGradeValue(master + (channel - t)).toFixed(4);
  }).join(' ');
}

export function buildColorGradeAlphaTable(value: AppColorGradeState) {
  return Array.from({ length: 33 }, (_, index) => {
    const t = index / 32;
    if (!value.curveEnabled) return t.toFixed(4);
    return clampColorGradeValue(0.5 + (t - 0.5) * value.curveA).toFixed(4);
  }).join(' ');
}

export function deriveColorGradeCss(value: AppColorGradeState) {
  return {
    brightness: clampColorGradeValue(value.brightness + value.liftStrength * 0.08, 0.45, 1.65),
    contrast: clampColorGradeValue(value.contrast + value.gammaStrength * 0.08, 0.45, 1.75),
    saturation: clampColorGradeValue(value.saturation + value.gainStrength * 0.12, 0.35, 2),
    hue: value.hue,
  };
}

/**
 * Safari resolves `url(#id)` against the full href, including hash routes
 * (`#loading/start`). The fragment then misses the SVG filter and WebKit
 * drops the entire `filter` chain. Point at pathname + search only.
 */
export function sameDocumentFilterUrl(filterId: string) {
  if (typeof window === 'undefined' || !window.location?.pathname) {
    return `url(#${filterId})`;
  }
  return `url(${window.location.pathname}${window.location.search}#${filterId})`;
}

/** Chromium/Firefox resolve an inline SVG filter reliably from a bare fragment. */
export function inlineFilterUrl(filterId: string) {
  return `url(#${filterId})`;
}

export function colorGradeToneFilterCss(value: AppColorGradeState) {
  const color = deriveColorGradeCss(value);
  return `brightness(${color.brightness.toFixed(3)}) contrast(${color.contrast.toFixed(3)}) saturate(${color.saturation.toFixed(3)}) hue-rotate(${color.hue.toFixed(1)}deg)`;
}

/** Safari / iOS WebKit does not apply SVG `feComponentTransfer` via CSS `filter`. */
export function isWebKitColorGradeEngine() {
  if (typeof navigator === 'undefined') return false;
  return /Apple Computer/.test(navigator.vendor) || /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function colorGradeLutFilterCss(
  filterUrl = inlineFilterUrl(APP_COLOR_GRADE_FILTER_ID),
) {
  if (isWebKitColorGradeEngine()) return 'none';
  return filterUrl;
}

export function colorGradeFilterCss(
  value: AppColorGradeState,
  filterUrl = inlineFilterUrl(APP_COLOR_GRADE_FILTER_ID),
) {
  return `${filterUrl} ${colorGradeToneFilterCss(value)}`;
}

/** Invert a monotonic feComponentTransfer table so a child can undo the parent LUT. */
export function invertColorGradeTableValues(tableValues: string): string {
  const ys = tableValues
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((value) => Number.isFinite(value));
  if (ys.length < 2) return tableValues;

  const last = ys.length - 1;
  const inv: number[] = [];
  for (let j = 0; j <= last; j += 1) {
    const target = j / last;
    let x = target;
    for (let i = 0; i < last; i += 1) {
      const y0 = ys[i];
      const y1 = ys[i + 1];
      const lo = Math.min(y0, y1);
      const hi = Math.max(y0, y1);
      const inSegment = target >= lo - 1e-6 && target <= hi + 1e-6;
      if (!inSegment && i < last - 1) continue;
      const span = y1 - y0;
      const t = Math.abs(span) < 1e-6 ? 0 : (target - y0) / span;
      x = (i + Math.min(1, Math.max(0, t))) / last;
      if (inSegment) break;
    }
    inv.push(clampColorGradeValue(x));
  }
  return inv.map((value) => value.toFixed(4)).join(' ');
}

/**
 * Child-first inverse of `colorGradeFilterCss`.
 * Parent applies curves → brightness → contrast → saturate → hue,
 * so the child undoes hue → saturate → contrast → brightness → curves.
 */
export function colorGradeUndoToneFilterCss(value: AppColorGradeState) {
  const color = deriveColorGradeCss(value);
  const brightness = color.brightness > 0.01 ? 1 / color.brightness : 1;
  const contrast = color.contrast > 0.01 ? 1 / color.contrast : 1;
  const saturation = color.saturation > 0.01 ? 1 / color.saturation : 1;
  return `hue-rotate(${(-color.hue).toFixed(1)}deg) saturate(${saturation.toFixed(3)}) contrast(${contrast.toFixed(3)}) brightness(${brightness.toFixed(3)})`;
}

export function colorGradeUndoFilterCss(
  value: AppColorGradeState,
  undoUrl = inlineFilterUrl(APP_COLOR_GRADE_UNDO_FILTER_ID),
) {
  return `${colorGradeUndoToneFilterCss(value)} ${undoUrl}`;
}

/**
 * Compensate the page-level grade around a canvas that already applies the
 * complete grade in WebGL. WebKit's parent stack contains only the tone
 * functions because its curve LUT already lives in the canvas composer.
 */
export function colorGradeWebglCompensationFilterCss(value: AppColorGradeState) {
  return isWebKitColorGradeEngine()
    ? colorGradeUndoToneFilterCss(value)
    : colorGradeUndoFilterCss(value);
}

export function buildColorGradeExport(value: AppColorGradeState) {
  const curveTransfer = {
    r: buildColorGradeCurveTable(value, value.curvePointsR, value.curveR),
    g: buildColorGradeCurveTable(value, value.curvePointsG, value.curveG),
    b: buildColorGradeCurveTable(value, value.curvePointsB, value.curveB),
    a: buildColorGradeAlphaTable(value),
  };

  return {
    version: 1,
    target: APP_COLOR_GRADE_EXPORT_TARGET,
    cssFilter: colorGradeFilterCss(value),
    curveTransfer,
    color: value,
  };
}

function normalizeAppColorGradeState(value: unknown): AppColorGradeState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AppColorGradeState>;
  if (
    typeof candidate.brightness !== 'number'
    || typeof candidate.contrast !== 'number'
    || !Array.isArray(candidate.curvePointsMaster)
  ) {
    return null;
  }

  return {
    ...DEFAULT_APP_COLOR,
    ...candidate,
    curvePointsMaster: [...candidate.curvePointsMaster],
    curvePointsR: Array.isArray(candidate.curvePointsR)
      ? [...candidate.curvePointsR]
      : [...DEFAULT_APP_COLOR.curvePointsR],
    curvePointsG: Array.isArray(candidate.curvePointsG)
      ? [...candidate.curvePointsG]
      : [...DEFAULT_APP_COLOR.curvePointsG],
    curvePointsB: Array.isArray(candidate.curvePointsB)
      ? [...candidate.curvePointsB]
      : [...DEFAULT_APP_COLOR.curvePointsB],
  };
}

export function loadStoredAppColorGrade(): AppColorGradeState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(APP_COLOR_GRADE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { color?: unknown } | unknown;
    if (parsed && typeof parsed === 'object' && 'color' in parsed) {
      return normalizeAppColorGradeState(parsed.color);
    }
    return normalizeAppColorGradeState(parsed);
  } catch {
    return null;
  }
}

export function saveStoredAppColorGrade(value: AppColorGradeState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    APP_COLOR_GRADE_STORAGE_KEY,
    JSON.stringify(buildColorGradeExport(value)),
  );
}

export function colorGradeWheelXYToHex(x: number, y: number) {
  const angle = Math.atan2(y, x);
  const hue = ((angle * 180) / Math.PI + 360) % 360;
  const saturation = clampColorGradeValue(Math.sqrt(x * x + y * y), 0, 1);
  const chroma = saturation;
  const hueSegment = (hue % 360) / 60;
  const xChroma = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  const [r1, g1, b1] =
    hueSegment < 1 ? [chroma, xChroma, 0] :
    hueSegment < 2 ? [xChroma, chroma, 0] :
    hueSegment < 3 ? [0, chroma, xChroma] :
    hueSegment < 4 ? [0, xChroma, chroma] :
    hueSegment < 5 ? [xChroma, 0, chroma] :
    [chroma, 0, xChroma];
  const m = 1 - chroma;
  const [r, g, b] = [r1 + m, g1 + m, b1 + m];
  return `#${[r, g, b].map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function colorGradeHexToWheelXY(hex: string) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  const saturation = max === 0 ? 0 : delta / max;
  const radians = ((hue + 360) % 360) * Math.PI / 180;
  return [Math.cos(radians) * saturation, Math.sin(radians) * saturation] as const;
}
