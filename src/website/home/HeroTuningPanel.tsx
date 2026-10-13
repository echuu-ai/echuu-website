import { useEffect, useState } from 'react';
import { TUNE_PANEL_CSS } from './tunePanelStyles';
import { TuneTabs } from './TuneTabs';
import { TuneRow } from './TuneRow';
import { HERO_DEFAULTS, HERO_RANGES, heroReadout, resetHeroTuning, setHeroTuning, useHeroTuning, type HeroTuning } from './three/heroTuning';

type NumericKey = keyof typeof HERO_RANGES;

/**
 * 开发用：首屏定格镜头与微风面板。只在 dev 且地址带 ?tune=hero 时挂载。
 * 焦点每帧锁在两眼中点，「焦点前后」在此基础上沿视线微调；勾「显示焦点」会在焦点处画一个品红小点。
 * 调好后点「复制数值」发给开发，相机高度 / 景深写回 heroScene.json，风写进 heroTuning 默认值。
 */
export default function HeroTuningPanel() {
  const tune = useHeroTuning();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [readout, setReadout] = useState({ ...heroReadout });

  useEffect(() => {
    const id = window.setInterval(() => setReadout({ ...heroReadout }), 250);
    return () => window.clearInterval(id);
  }, []);

  const row = (key: NumericKey) => (
    <TuneRow key={key} {...HERO_RANGES[key]} value={tune[key]} changed={tune[key] !== HERO_DEFAULTS[key]}
      onChange={(value) => setHeroTuning({ ...tune, [key]: value })} />
  );
  const toggle = (key: 'dof' | 'showFocus', label: string) => (
    <label className="seam-tune__row">
      <span className="seam-tune__label" data-changed={tune[key] !== HERO_DEFAULTS[key] || undefined}>{label}</span>
      <input type="checkbox" checked={tune[key]} onChange={(e) => setHeroTuning({ ...tune, [key]: e.target.checked } as HeroTuning)} />
    </label>
  );
  const copy = async () => {
    const { dof: _dof, showFocus: _showFocus, ...values } = tune;
    const text = JSON.stringify(values, null, 2);
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('复制下面的数值', text); }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="seam-tune seam-tune--compact" data-lenis-prevent>
      <TuneTabs active="hero" />
      <button type="button" className="seam-tune__head" onClick={() => setOpen((v) => !v)}>
        镜头 / 风 {open ? '−' : '+'}
      </button>
      {open && (
        <>
          <p className="seam-tune__section">定格镜头（注视点不动）</p>
          {row('camY')}
          <p className="seam-tune__section">景深（焦点锁两眼中点）</p>
          {toggle('dof', '景深开关')}
          {toggle('showFocus', '显示焦点')}
          {row('focusOffset')}
          {row('focusRange')}
          {row('blur')}
          <p className="seam-tune__hint">
            相机→焦点 {readout.camToFocus.toFixed(3)} m · 相机→眼睛 {readout.camToEyes.toFixed(3)} m
          </p>
          <p className="seam-tune__section">微风（头发、衣摆）</p>
          {row('wind')}
          {row('windDir')}
          {row('turbulence')}
          <p className="seam-tune__hint">脸发虚先关景深对比：关了还虚就不是对焦问题（可能是掉帧降了分辨率）。</p>
          <div className="seam-tune__actions">
            <button type="button" onClick={resetHeroTuning}>恢复默认</button>
            <button type="button" onClick={copy}>{copied ? '已复制' : '复制数值'}</button>
          </div>
        </>
      )}
      <style>{TUNE_PANEL_CSS}</style>
    </div>
  );
}
