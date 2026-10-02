/** 开发用调节面板（?tune=seam / ?tune=logo）共用的样式 */
export const TUNE_PANEL_CSS = `
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
        .seam-tune--compact { width: 264px; }
        .seam-tune--compact .seam-tune__row { grid-template-columns: 64px 1fr 52px; margin: 3px 0; }
        .seam-tune--compact .seam-tune__label { grid-column: auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .seam-tune--compact .seam-tune__num { width: 52px; }
        .seam-tune--compact .seam-tune__actions { flex-wrap: wrap; }
        .seam-tune__section { margin: 12px 0 2px; font-weight: 600; color: #cfe6ff; }
        .seam-tune__hint { margin: 8px 0; opacity: 0.6; }
        .seam-tune__actions { display: flex; gap: 8px; justify-content: flex-end; }
      `;
