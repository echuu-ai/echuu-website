import { useState } from 'react';
import { TUNE_PANEL_CSS } from './tunePanelStyles';
import { TuneTabs } from './TuneTabs';
import { SEAM_DEFAULTS, SEAM_RANGES, resetSeamTuning, seamTuning, setSeamTuning, type SeamTuning } from './three/seamTuning';

/**
 * 开发用：首屏撕纸切口的调节面板。只在 dev 且地址带 ?tune=seam 时挂载。
 * 拖动即时生效并存在本机 localStorage；「复制数值」把当前参数复制出来，发给开发写回默认值。
 */
export default function SeamTuningPanel() {
  const [values, setValues] = useState<SeamTuning>({ ...seamTuning });
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const update = (key: keyof SeamTuning, value: number) => {
    setSeamTuning({ [key]: value });
    setValues({ ...seamTuning });
  };
  const reset = () => {
    resetSeamTuning();
    setValues({ ...seamTuning });
  };
  const copy = async () => {
    const text = JSON.stringify(seamTuning, null, 2);
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('复制下面的数值', text); }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="seam-tune" data-lenis-prevent>
      <TuneTabs active="seam" />
      <button type="button" className="seam-tune__head" onClick={() => setOpen((v) => !v)}>
        切口调节 {open ? '−' : '+'}
      </button>
      {open && (
        <>
          {(Object.keys(SEAM_RANGES) as (keyof SeamTuning)[]).map((key) => {
            const r = SEAM_RANGES[key];
            const changed = values[key] !== SEAM_DEFAULTS[key];
            return (
              <label key={key} className="seam-tune__row">
                <span className="seam-tune__label" data-changed={changed || undefined}>{r.label}</span>
                <input type="range" min={r.min} max={r.max} step={r.step} value={values[key]}
                  onChange={(e) => update(key, Number(e.target.value))} />
                <input type="number" className="seam-tune__num" min={r.min} max={r.max} step={r.step} value={values[key]}
                  onChange={(e) => update(key, Number(e.target.value))} />
              </label>
            );
          })}
          <p className="seam-tune__hint">首屏满屏都是 3D，切口藏在首屏下面那段「画布超出首屏」里，往下滚才看到。切口只往上撕：0 = 最低点贴着画布底边。撕口露进首屏就调大超出高度或调小三个起伏。</p>
          <div className="seam-tune__actions">
            <button type="button" onClick={reset}>恢复默认</button>
            <button type="button" onClick={copy}>{copied ? '已复制' : '复制数值'}</button>
          </div>
        </>
      )}
      <style>{TUNE_PANEL_CSS}</style>
    </div>
  );
}
