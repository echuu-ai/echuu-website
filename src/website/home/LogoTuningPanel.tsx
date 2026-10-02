import { useState } from 'react';
import { TUNE_PANEL_CSS } from './tunePanelStyles';
import { LOGO_DEFAULTS, LOGO_TONE_RANGES, resetLogoTuning, setLogoTuning, useLogoTuning, type LogoTone, type LogoTuning } from './logoTuning';

/** 上次截图对比里的「方案 A 压深一档」，标语再深一些 */
const PRESET_A: LogoTuning = {
  mark: { deepen: 1.15, blueShift: 0.9, saturate: 1.35, brightness: 1, opacity: 1 },
  tagline: { deepen: 2, blueShift: 1, saturate: 1.5, brightness: 1, opacity: 1 },
  shadow: 0.2,
};

/**
 * 开发用：首屏 logo 调色面板。只在 dev 且地址带 ?tune=logo 时挂载。
 * 字母 / 外环和标语分开调；拖动即时生效并存在本机，「复制数值」发给开发写回默认值。
 */
export default function LogoTuningPanel() {
  const tuning = useLogoTuning();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const updateTone = (part: 'mark' | 'tagline', key: keyof LogoTone, value: number) =>
    setLogoTuning({ ...tuning, [part]: { ...tuning[part], [key]: value } });
  const copy = async () => {
    const text = JSON.stringify(tuning, null, 2);
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('复制下面的数值', text); }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const section = (part: 'mark' | 'tagline', title: string) => (
    <>
      <p className="seam-tune__section">{title}</p>
      {(Object.keys(LOGO_TONE_RANGES) as (keyof LogoTone)[]).map((key) => {
        const r = LOGO_TONE_RANGES[key];
        const value = tuning[part][key];
        return (
          <label key={key} className="seam-tune__row">
            <span className="seam-tune__label" data-changed={value !== LOGO_DEFAULTS[part][key] || undefined}>{r.label}</span>
            <input type="range" min={r.min} max={r.max} step={r.step} value={value} onChange={(e) => updateTone(part, key, Number(e.target.value))} />
            <input type="number" className="seam-tune__num" min={r.min} max={r.max} step={r.step} value={value} onChange={(e) => updateTone(part, key, Number(e.target.value))} />
          </label>
        );
      })}
    </>
  );

  return (
    <div className="seam-tune seam-tune--compact" data-lenis-prevent>
      <button type="button" className="seam-tune__head" onClick={() => setOpen((v) => !v)}>
        Logo 调色 {open ? '−' : '+'}
      </button>
      {open && (
        <>
          {section('mark', '字母 · 外环')}
          {section('tagline', '标语「你的OC出道舞台」')}
          <p className="seam-tune__section">整体</p>
          <label className="seam-tune__row">
            <span className="seam-tune__label" data-changed={tuning.shadow !== LOGO_DEFAULTS.shadow || undefined}>深蓝投影</span>
            <input type="range" min={0} max={0.8} step={0.01} value={tuning.shadow} onChange={(e) => setLogoTuning({ ...tuning, shadow: Number(e.target.value) })} />
            <input type="number" className="seam-tune__num" min={0} max={0.8} step={0.01} value={tuning.shadow} onChange={(e) => setLogoTuning({ ...tuning, shadow: Number(e.target.value) })} />
          </label>
          <p className="seam-tune__hint">「压深中间调」把浅蓝压深，白色高光保持不变；「偏蓝」让压深后更偏饱和蓝而不是发灰。</p>
          <div className="seam-tune__actions">
            <button type="button" onClick={() => setLogoTuning(PRESET_A)}>套用方案 A</button>
            <button type="button" onClick={resetLogoTuning}>恢复原图</button>
            <button type="button" onClick={copy}>{copied ? '已复制' : '复制数值'}</button>
          </div>
        </>
      )}
      <style>{TUNE_PANEL_CSS}</style>
    </div>
  );
}
