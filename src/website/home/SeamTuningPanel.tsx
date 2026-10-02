import { useState } from 'react';
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
          <p className="seam-tune__hint">高度 0 = 首屏最底边。滚动页面可以看到抬起和色散。</p>
          <div className="seam-tune__actions">
            <button type="button" onClick={reset}>恢复默认</button>
            <button type="button" onClick={copy}>{copied ? '已复制' : '复制数值'}</button>
          </div>
        </>
      )}
      <style>{`
        .seam-tune { position: fixed; top: 16px; right: 16px; z-index: 2147483000; width: 320px; max-height: calc(100vh - 32px); overflow: auto;
          padding: 10px 12px; border-radius: 12px; background: rgba(18, 24, 38, 0.86); color: #eef3ff; backdrop-filter: blur(12px);
          font: 12px/1.4 system-ui, -apple-system, sans-serif; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25); cursor: auto; }
        .seam-tune * { cursor: auto; }
        .seam-tune button { cursor: pointer; font: inherit; color: inherit; background: rgba(255,255,255,0.12); border: 0; border-radius: 6px; padding: 5px 10px; }
        .seam-tune button:hover { background: rgba(255,255,255,0.2); }
        .seam-tune__head { width: 100%; text-align: left; font-weight: 600 !important; background: transparent !important; padding: 2px 0 6px !important; }
        .seam-tune__row { display: grid; grid-template-columns: 1fr 64px; gap: 2px 8px; margin: 6px 0; align-items: center; }
        .seam-tune__label { grid-column: 1 / -1; opacity: 0.8; }
        .seam-tune__label[data-changed] { opacity: 1; color: #9fd0ff; }
        .seam-tune input[type=range] { width: 100%; accent-color: #9fd0ff; }
        .seam-tune__num { width: 64px; padding: 2px 4px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.25); color: inherit; font: inherit; }
        .seam-tune__hint { margin: 8px 0; opacity: 0.6; }
        .seam-tune__actions { display: flex; gap: 8px; justify-content: flex-end; }
      `}</style>
    </div>
  );
}
