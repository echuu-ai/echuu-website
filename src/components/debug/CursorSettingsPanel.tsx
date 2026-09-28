import { startSceneCursorFlight } from '../../lib/scene-cursor-flight';
import { useEffect, useState } from 'react';
import { DEFAULT_CURSOR_SETTINGS, setCursorSettings, useCursorSettings } from '../../lib/cursor-settings';
import { DEBUG_UI_ENABLED } from '../../lib/debug/debugUi';
import './CursorSettingsPanel.css';

export default function CursorSettingsPanel() {
  const [open, setOpen] = useState(false);
  const settings = useCursorSettings();
  useEffect(() => {
    if (!DEBUG_UI_ENABLED) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      if (event.altKey && event.code === 'KeyP') { event.preventDefault(); setOpen(value => !value); }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!DEBUG_UI_ENABLED) return null;
  return <div className="cursor-settings">
    <button className="cursor-settings__toggle" aria-expanded={open} aria-controls="cursor-settings-panel" onClick={() => setOpen(!open)}>✧ 光标</button>
    {open && <section id="cursor-settings-panel" className="cursor-settings__panel" aria-label="纸飞机光标设置">
      <header><strong>纸飞机 · 光与航线</strong><button aria-label="关闭光标设置" onClick={() => setOpen(false)}>×</button></header>
      <label>拖尾配色<select value={settings.rainbow ? 'rainbow' : 'custom'} onChange={event => setCursorSettings({ rainbow: event.target.value === 'rainbow' })}><option value="rainbow">虹彩</option><option value="custom">自定义三色</option></select></label>
      <div className="cursor-settings__colors">{(['colorA', 'colorB', 'colorC'] as const).map((key, i) => <label key={key}>颜色 {i + 1}<input type="color" value={settings[key]} onChange={event => setCursorSettings({ [key]: event.target.value, rainbow: false })} /></label>)}</div>
      {([
        ['opacity', '拖尾透明度', 0, 1, .05], ['width', '拖尾宽度', .3, 3, .1],
        ['lifetime', '消散时间（秒）', .4, 3, .1], ['bloom', '普通光标 Bloom', 0, 1.2, .02],
        ['sparkles', '十字星芒', 0, 1, .05], ['daring', '冲屏幅度', 0, 1, .05],
      ] as const).map(([key, label, min, max, step]) => <label key={key}>{label}<output>{settings[key].toFixed(2)}</output><input aria-label={label} type="range" min={min} max={max} step={step} value={settings[key]} onChange={event => setCursorSettings({ [key]: Number(event.target.value) })} /></label>)}
      <p>长按飞行，松手回航。设置自动保存在本机。场景内 Bloom 跟随场景灯光。</p>
      <footer><button onClick={() => { if (startSceneCursorFlight(innerWidth * .5, innerHeight * .45)) setOpen(false); }}>试飞</button><button onClick={() => setCursorSettings(DEFAULT_CURSOR_SETTINGS)}>恢复默认</button><span>⌥ / Alt + P</span></footer>
    </section>}
  </div>;
}
