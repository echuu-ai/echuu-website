import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Sparkles } from 'lucide-react';
import { SHARED_VRM_LOOK_PRESET } from '../../lib/vrmLookPreset';

export type VrmLookSettings = {
  ambientColor: string;
  keyColor: string;
  fillColor: string;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomSmoothing: number;
  /** Defined only by surfaces that support a camera depth-of-field pass. */
  dofEnabled?: boolean;
  dofFocalLength?: number;
  dofBokehScale?: number;
};

export const DEFAULT_VRM_LOOK_SETTINGS: VrmLookSettings = {
  ambientColor: SHARED_VRM_LOOK_PRESET.lightColors.ambient,
  keyColor: SHARED_VRM_LOOK_PRESET.lightColors.key,
  fillColor: SHARED_VRM_LOOK_PRESET.lightColors.fill,
  bloomIntensity: SHARED_VRM_LOOK_PRESET.bloom.intensity,
  bloomThreshold: SHARED_VRM_LOOK_PRESET.bloom.luminanceThreshold,
  bloomSmoothing: SHARED_VRM_LOOK_PRESET.bloom.luminanceSmoothing,
};

export function loadVrmLookSettings(storageKey: string, defaults: VrmLookSettings = DEFAULT_VRM_LOOK_SETTINGS): VrmLookSettings {
  if (typeof window === 'undefined') return { ...defaults };
  try {
    return {
      ...defaults,
      ...JSON.parse(window.localStorage.getItem(storageKey) ?? '{}'),
    };
  } catch {
    return { ...defaults };
  }
}

type Props = {
  title: string;
  open: boolean;
  value: VrmLookSettings;
  onToggle: () => void;
  onChange: (value: VrmLookSettings) => void;
  showToggle?: boolean;
  defaultValue?: VrmLookSettings;
};

export function VrmLookPanel({ title, open, value, onToggle, onChange, showToggle = true, defaultValue = DEFAULT_VRM_LOOK_SETTINGS }: Props) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const style: CSSProperties | undefined = position ? { left: position.left, top: position.top, right: 'auto' } : undefined;

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, input')) return;
    const panel = event.currentTarget.closest('.vrm-look-panel') as HTMLElement | null;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragRef.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    const move = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setPosition({
        left: Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, drag.left + moveEvent.clientX - drag.x)),
        top: Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, drag.top + moveEvent.clientY - drag.y)),
      });
    };
    const stop = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const update = <K extends keyof VrmLookSettings>(key: K, next: VrmLookSettings[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <aside className={`vrm-look-panel${open ? ' is-open' : ''}`} style={style}>
      {showToggle ? (
        <button className="vrm-look-panel__toggle" type="button" onClick={onToggle} aria-expanded={open}>
          <Sparkles size={15} /> Look
        </button>
      ) : null}
      {open ? (
        <div className="vrm-look-panel__body">
          <header onPointerDown={startDrag}>
            <div><small>VRM / DEBUG</small><strong>{title}</strong></div>
            <button type="button" onClick={onToggle} aria-label="Close VRM look panel">×</button>
          </header>
          <fieldset>
            <legend>Lighting</legend>
            {([
              ['ambientColor', '环境光'],
              ['keyColor', '主光'],
              ['fillColor', '补光'],
            ] as const).map(([key, label]) => (
              <label className="vrm-look-panel__color" key={key}>
                <span>{label}</span>
                <input type="color" value={value[key]} onChange={(event) => update(key, event.currentTarget.value)} />
                <output>{value[key].toUpperCase()}</output>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Bloom</legend>
            {([
              ['bloomIntensity', '强度', 0, 3, 0.05],
              ['bloomThreshold', '阈值', 0, 1, 0.01],
              ['bloomSmoothing', '柔化', 0, 1, 0.01],
            ] as const).map(([key, label, min, max, step]) => (
              <label className="vrm-look-panel__range" key={key}>
                <span>{label}</span>
                <input type="range" min={min} max={max} step={step} value={value[key]} onChange={(event) => update(key, Number(event.currentTarget.value))} />
                <output>{value[key].toFixed(2)}</output>
              </label>
            ))}
          </fieldset>
          {value.dofEnabled !== undefined ? (
            <fieldset>
              <legend>景深 / Depth of Field</legend>
              <label className="vrm-look-panel__range">
                <span>启用</span>
                <input
                  type="checkbox"
                  checked={value.dofEnabled}
                  onChange={(event) => update('dofEnabled', event.currentTarget.checked)}
                />
              </label>
              {([
                ['dofFocalLength', '焦点宽度', 0, 0.1, 0.001],
                ['dofBokehScale', '背景虚化', 0, 4, 0.05],
              ] as const).map(([key, label, min, max, step]) => (
                <label className="vrm-look-panel__range" key={key}>
                  <span>{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    disabled={!value.dofEnabled}
                    value={value[key] ?? 0}
                    onChange={(event) => update(key, Number(event.currentTarget.value))}
                  />
                  <output>{(value[key] ?? 0).toFixed(3)}</output>
                </label>
              ))}
            </fieldset>
          ) : null}
          <footer>
            <span>实时预览 · 自动保存</span>
            <button type="button" onClick={() => onChange({ ...defaultValue })}>恢复默认</button>
          </footer>
        </div>
      ) : null}
    </aside>
  );
}
