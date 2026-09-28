import { useSyncExternalStore } from 'react';
export const DEFAULT_CURSOR_SETTINGS = {
  rainbow: false, colorA: '#0f00e0', colorB: '#53f3ff', colorC: '#ff7300', opacity: 1, width: 1,
  lifetime: 1.5, bloom: .22, sparkles: 1, daring: 1,
};
export type CursorSettings = typeof DEFAULT_CURSOR_SETTINGS;
const KEY = 'echuu.cursor-settings.v1';
export function sanitizeCursorSettings(value: Partial<CursorSettings>): CursorSettings {
  const result = { ...DEFAULT_CURSOR_SETTINGS };
  for (const key of ['colorA', 'colorB', 'colorC'] as const) if (typeof value[key] === 'string' && /^#[0-9a-f]{6}$/i.test(value[key]!)) result[key] = value[key]!;
  if (typeof value.rainbow === 'boolean') result.rainbow = value.rainbow;
  const ranges = { opacity: [0, 1], width: [.3, 3], lifetime: [.4, 3], bloom: [0, 1.2], sparkles: [0, 1], daring: [0, 1] } as const;
  for (const key of Object.keys(ranges) as (keyof typeof ranges)[]) {
    const v = value[key];
    if (typeof v === 'number' && Number.isFinite(v)) result[key] = Math.max(ranges[key][0], Math.min(ranges[key][1], v));
  }
  return result;
}
let settings = { ...DEFAULT_CURSOR_SETTINGS };
try {
  settings = sanitizeCursorSettings(JSON.parse(localStorage.getItem(KEY) || '{}') ?? {});
  // Apply the approved palette once while keeping all motion / glow settings and future edits.
  if (localStorage.getItem('echuu.cursor-palette.v2') !== '1') {
    settings = { ...settings, rainbow: false, colorA: DEFAULT_CURSOR_SETTINGS.colorA, colorB: DEFAULT_CURSOR_SETTINGS.colorB, colorC: DEFAULT_CURSOR_SETTINGS.colorC };
    localStorage.setItem(KEY, JSON.stringify(settings));
    localStorage.setItem('echuu.cursor-palette.v2', '1');
  }
} catch { /* Keep defaults when storage is unavailable. */ }
const listeners = new Set<() => void>();
export const getCursorSettings = () => settings;
export function setCursorSettings(patch: Partial<CursorSettings>) {
  settings = sanitizeCursorSettings({ ...settings, ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Settings still work for this session. */ }
  listeners.forEach(listener => listener());
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const useCursorSettings = () => useSyncExternalStore(subscribe, getCursorSettings, getCursorSettings);
