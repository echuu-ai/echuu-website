import { useState } from 'react';
import { TUNE_PANEL_CSS } from './tunePanelStyles';
import { TuneTabs } from './TuneTabs';
import { useAppColorGrade } from '../../components/AppColorGrade';
import { DEFAULT_APP_COLOR, type AppColorGradeState } from '../../lib/app-color-grade';
import { SCENE_DEFAULTS, SCENE_RANGES, resetSceneTuning, setSceneTuning, useSceneTuning, type SceneTuning } from './three/sceneTuning';

type NumericGradeKey = 'brightness' | 'contrast' | 'saturation' | 'hue' | 'curveMaster' | 'curveR' | 'curveG' | 'curveB';

const GRADE_RANGES: Record<NumericGradeKey, { min: number; max: number; step: number; label: string }> = {
  brightness: { min: 0.65, max: 1.35, step: 0.01, label: '亮度' },
  contrast: { min: 0.75, max: 1.45, step: 0.01, label: '对比度' },
  saturation: { min: 0.6, max: 1.65, step: 0.01, label: '饱和度' },
  hue: { min: -40, max: 40, step: 1, label: '色相' },
  curveMaster: { min: 0, max: 2, step: 0.02, label: '总曲线' },
  curveR: { min: 0, max: 2, step: 0.02, label: '红曲线' },
  curveG: { min: 0, max: 2, step: 0.02, label: '绿曲线' },
  curveB: { min: 0, max: 2, step: 0.02, label: '蓝曲线' },
};

function Row({ label, value, min, max, step, changed, onChange }: {
  label: string; value: number; min: number; max: number; step: number; changed: boolean; onChange: (value: number) => void;
}) {
  return (
    <label className="seam-tune__row">
      <span className="seam-tune__label" data-changed={changed || undefined}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <input type="number" className="seam-tune__num" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/**
 * 开发用：首屏 3D 场景调色面板。只在 dev 且地址带 ?tune=grade 时挂载。
 * 调色部分改的是全站共用的 3D 调色（首屏和别针 / 钥匙挂饰都会跟着变）；场景光只影响首屏。
 */
export default function SceneGradePanel() {
  const { color, setColor, resetColor } = useAppColorGrade();
  const scene = useSceneTuning();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const grade = (key: NumericGradeKey) => {
    const r = GRADE_RANGES[key];
    return (
      <Row key={key} {...r} value={color[key]} changed={color[key] !== DEFAULT_APP_COLOR[key]}
        onChange={(value) => setColor({ ...color, [key]: value } as AppColorGradeState)} />
    );
  };
  const light = (key: keyof SceneTuning) => {
    const r = SCENE_RANGES[key];
    return (
      <Row key={key} {...r} value={scene[key]} changed={scene[key] !== SCENE_DEFAULTS[key]}
        onChange={(value) => setSceneTuning({ ...scene, [key]: value })} />
    );
  };
  const copy = async () => {
    const picked = Object.fromEntries((Object.keys(GRADE_RANGES) as NumericGradeKey[]).map((key) => [key, color[key]]));
    const text = JSON.stringify({ grade: { ...picked, curveEnabled: color.curveEnabled }, scene }, null, 2);
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('复制下面的数值', text); }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="seam-tune seam-tune--compact" data-lenis-prevent>
      <TuneTabs active="grade" />
      <button type="button" className="seam-tune__head" onClick={() => setOpen((v) => !v)}>
        3D 调色 {open ? '−' : '+'}
      </button>
      {open && (
        <>
          <p className="seam-tune__section">调色</p>
          {(['brightness', 'contrast', 'saturation', 'hue'] as const).map(grade)}
          <p className="seam-tune__section">曲线（偏蓝主要来自蓝曲线）</p>
          <label className="seam-tune__row">
            <span className="seam-tune__label">启用曲线</span>
            <input type="checkbox" checked={color.curveEnabled} onChange={(e) => setColor({ ...color, curveEnabled: e.target.checked })} />
          </label>
          {(['curveMaster', 'curveR', 'curveG', 'curveB'] as const).map(grade)}
          <p className="seam-tune__section">场景光（只影响首屏）</p>
          {(Object.keys(SCENE_RANGES) as (keyof SceneTuning)[]).map(light)}
          <p className="seam-tune__hint">调色和挂饰共用，滚到别针 / 钥匙那屏可以一起看平衡。</p>
          <div className="seam-tune__actions">
            <button type="button" onClick={() => { resetColor(); resetSceneTuning(); }}>恢复默认</button>
            <button type="button" onClick={copy}>{copied ? '已复制' : '复制数值'}</button>
          </div>
        </>
      )}
      <style>{TUNE_PANEL_CSS}</style>
    </div>
  );
}
