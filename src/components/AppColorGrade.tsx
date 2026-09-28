import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import * as ColorWheel from 'react-hsv-ring';
import {
  APP_COLOR_GRADE_FILTER_ID,
  APP_COLOR_GRADE_UNDO_FILTER_ID,
  isWebKitColorGradeEngine,
  buildColorGradeAlphaTable,
  buildColorGradeCurveTable,
  buildColorGradeExport,
  clampColorGradeValue,
  colorGradeFilterCss,
  colorGradeLutFilterCss,
  colorGradeToneFilterCss,
  colorGradeUndoFilterCss,
  colorGradeWebglCompensationFilterCss,
  invertColorGradeTableValues,
  sameDocumentFilterUrl,
  colorGradeHexToWheelXY,
  colorGradeWheelXYToHex,
  DEFAULT_APP_COLOR,
  deriveColorGradeCss,
  loadStoredAppColorGrade,
  ONBOARDING_STEP3_DOF_BOKEH_MAX,
  saveStoredAppColorGrade,
  sampleColorGradeCurve,
  type AppColorGradeState,
} from '../lib/app-color-grade';
import { DEBUG_UI_ENABLED } from '../lib/debug/debugUi';

type AppColorGradeContextValue = {
  color: AppColorGradeState;
  setColor: (next: AppColorGradeState) => void;
  resetColor: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  filterCss: string;
  lutFilterCss: string;
  toneFilterCss: string;
  cssVars: CSSProperties;
  webglCompensationFilterCss: string;
};

const AppColorGradeContext = createContext<AppColorGradeContextValue | null>(null);

export function useAppColorGrade() {
  const context = useContext(AppColorGradeContext);
  if (!context) {
    throw new Error('useAppColorGrade must be used within AppColorGradeProvider');
  }
  return context;
}

function createDefaultColorState(): AppColorGradeState {
  return {
    ...DEFAULT_APP_COLOR,
    curvePointsMaster: [...DEFAULT_APP_COLOR.curvePointsMaster],
    curvePointsR: [...DEFAULT_APP_COLOR.curvePointsR],
    curvePointsG: [...DEFAULT_APP_COLOR.curvePointsG],
    curvePointsB: [...DEFAULT_APP_COLOR.curvePointsB],
  };
}

function AppColorGradeFilter({ value }: { value: AppColorGradeState }) {
  const tables = useMemo(() => ({
    r: buildColorGradeCurveTable(value, value.curvePointsR, value.curveR),
    g: buildColorGradeCurveTable(value, value.curvePointsG, value.curveG),
    b: buildColorGradeCurveTable(value, value.curvePointsB, value.curveB),
    a: buildColorGradeAlphaTable(value),
  }), [value]);

  const undoTables = useMemo(() => ({
    r: invertColorGradeTableValues(tables.r),
    g: invertColorGradeTableValues(tables.g),
    b: invertColorGradeTableValues(tables.b),
    a: invertColorGradeTableValues(tables.a),
  }), [tables]);

  return (
    <svg
      className="app-color-grade-svg"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id={APP_COLOR_GRADE_FILTER_ID}
          x="0"
          y="0"
          width="1"
          height="1"
          filterUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feComponentTransfer>
            <feFuncR type="table" tableValues={tables.r} />
            <feFuncG type="table" tableValues={tables.g} />
            <feFuncB type="table" tableValues={tables.b} />
            <feFuncA type="table" tableValues={tables.a} />
          </feComponentTransfer>
        </filter>
        <filter
          id={APP_COLOR_GRADE_UNDO_FILTER_ID}
          x="0"
          y="0"
          width="1"
          height="1"
          filterUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feComponentTransfer>
            <feFuncR type="table" tableValues={undoTables.r} />
            <feFuncG type="table" tableValues={undoTables.g} />
            <feFuncB type="table" tableValues={undoTables.b} />
            <feFuncA type="table" tableValues={undoTables.a} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}

function AppColorSlider({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  return (
    <label className="app-color-slider">
      <span>
        {label}
        <b>{value.toFixed(step >= 1 ? 0 : 2)}{suffix}</b>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function AppColorWheel({
  label,
  x,
  y,
  strength,
  onChangeXY,
  onChangeStrength,
  onReset,
}: {
  label: string;
  x: number;
  y: number;
  strength: number;
  onChangeXY: (x: number, y: number) => void;
  onChangeStrength: (value: number) => void;
  onReset: () => void;
}) {
  const [wheelHex, setWheelHex] = useState(() => colorGradeWheelXYToHex(x, y));
  useEffect(() => {
    setWheelHex(colorGradeWheelXYToHex(x, y));
  }, [x, y]);

  const handleWheelChange = useCallback((nextHex: string) => {
    setWheelHex(nextHex);
    const [nextX, nextY] = colorGradeHexToWheelXY(nextHex);
    onChangeXY(nextX, nextY);
  }, [onChangeXY]);

  return (
    <div className="app-color-wheel-card">
      <div className="app-color-wheel-card__head">
        <span>{label}</span>
        <button type="button" onClick={onReset}>Reset</button>
      </div>
      <ColorWheel.Root value={wheelHex} onValueChange={handleWheelChange}>
        <ColorWheel.Wheel size={86} ringWidth={12} className="app-hsv-wheel">
          <ColorWheel.HueRing />
          <ColorWheel.HueThumb />
          <ColorWheel.Area />
          <ColorWheel.AreaThumb />
        </ColorWheel.Wheel>
      </ColorWheel.Root>
      <div className="app-color-wheel-card__chip">
        <span style={{ backgroundColor: wheelHex }} />
        <code>{wheelHex.toUpperCase()}</code>
      </div>
      <AppColorSlider label="Strength" value={strength} min={-1} max={1} step={0.01} onChange={onChangeStrength} />
    </div>
  );
}

function AppCurveEditor({
  label,
  color,
  points,
  onChange,
  onReset,
}: {
  label: string;
  color: string;
  points: number[];
  onChange: (next: number[]) => void;
  onReset: () => void;
}) {
  const safePoints = points.length >= 2 ? points : [0, 0.25, 0.5, 0.75, 1];
  const pointCount = safePoints.length;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const updateFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clampColorGradeValue((event.clientX - rect.left) / rect.width);
    const y = clampColorGradeValue((event.clientY - rect.top) / rect.height);
    const index = Math.round(x * (pointCount - 1));
    const next = [...safePoints];
    next[index] = clampColorGradeValue(1 - y);
    setActiveIndex(index);
    onChange(next);
  };

  const sampledPolyline = Array.from({ length: 49 }, (_, sampleIndex) => {
    const t = sampleIndex / 48;
    return `${t * 100},${(1 - sampleColorGradeCurve(safePoints, t)) * 100}`;
  }).join(' ');

  const anchorPolyline = safePoints
    .map((value, idx) => `${(idx / (pointCount - 1)) * 100},${(1 - clampColorGradeValue(value)) * 100}`)
    .join(' ');

  return (
    <div className="app-curve-editor">
      <div className="app-curve-editor__head">
        <span style={{ color }}>{label}</span>
        <button type="button" onClick={onReset}>Reset</button>
      </div>
      <svg
        className="app-curve-editor__canvas"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) updateFromPointer(event);
        }}
        onPointerUp={() => setActiveIndex(null)}
        aria-label={`${label} curve editor`}
        role="img"
      >
        {[0, 25, 50, 75, 100].map((position) => (
          <g key={`${label}-${position}`}>
            <line x1="0" y1={position} x2="100" y2={position} />
            <line x1={position} y1="0" x2={position} y2="100" />
          </g>
        ))}
        <line className="app-curve-editor__diagonal" x1="0" y1="100" x2="100" y2="0" />
        <polyline className="app-curve-editor__anchors" points={anchorPolyline} />
        <polyline className="app-curve-editor__curve" points={sampledPolyline} style={{ stroke: color }} />
        {safePoints.map((value, idx) => (
          <circle
            key={`${label}-point-${idx}`}
            cx={(idx / (pointCount - 1)) * 100}
            cy={(1 - clampColorGradeValue(value)) * 100}
            r={activeIndex === idx ? 3.4 : 2.6}
            style={{ fill: color }}
          />
        ))}
      </svg>
    </div>
  );
}

function AppColorTuner({
  value,
  onChange,
  onReset,
  onClose,
}: {
  value: AppColorGradeState;
  onChange: (next: AppColorGradeState) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const exportJson = useMemo(
    () => JSON.stringify(buildColorGradeExport(value), null, 2),
    [value],
  );

  const update = (key: keyof AppColorGradeState, next: number | boolean | number[]) => {
    onChange({ ...value, [key]: next });
  };

  const updateWheel = (prefix: 'lift' | 'gamma' | 'gain', x: number, y: number) => {
    onChange({
      ...value,
      [`${prefix}X`]: x,
      [`${prefix}Y`]: y,
    });
  };

  const copyJson = () => {
    void navigator.clipboard?.writeText(exportJson);
  };

  const downloadJson = () => {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'oshi-stage-app-color-grade.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="app-color-tuner" aria-label="App color grade tuner">
      <div className="app-color-tuner__head">
        <div>
          <b>App Color Grade</b>
          <span>Global look · wheels · curves · JSON export</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close app color grade tuner">×</button>
      </div>
      <div className="app-color-tuner__section">
        <AppColorSlider label="Brightness" value={value.brightness} min={0.65} max={1.35} step={0.01} onChange={(next) => update('brightness', next)} />
        <AppColorSlider label="Contrast" value={value.contrast} min={0.75} max={1.45} step={0.01} onChange={(next) => update('contrast', next)} />
        <AppColorSlider label="Saturation" value={value.saturation} min={0.6} max={1.65} step={0.01} onChange={(next) => update('saturation', next)} />
        <AppColorSlider label="Hue" value={value.hue} min={-40} max={40} step={1} suffix="deg" onChange={(next) => update('hue', next)} />
      </div>
      <div className="app-color-tuner__section app-color-tuner__section--camera">
        <div className="app-color-tuner__section-title">
          <b>Onboarding · Depth of Field</b>
          <span>Step 1 stays crisp. Persona and Topic keep the avatar's face in focus against the in-scene HDR sky.</span>
        </div>
        <label className="app-color-toggle app-color-toggle--inline">
          <input
            type="checkbox"
            checked={value.onboardingStep3DofEnabled}
            onChange={(event: ChangeEvent<HTMLInputElement>) => update('onboardingStep3DofEnabled', event.target.checked)}
          />
          Depth of field enabled
        </label>
        <AppColorSlider
          label="Focus Width"
          value={value.onboardingStep3DofFocalLength}
          min={0}
          max={1}
          step={0.005}
          onChange={(next) => update('onboardingStep3DofFocalLength', next)}
        />
        <AppColorSlider
          label="Blur / Bokeh"
          value={value.onboardingStep3DofBokehScale}
          min={0}
          max={ONBOARDING_STEP3_DOF_BOKEH_MAX}
          step={0.05}
          onChange={(next) => update('onboardingStep3DofBokehScale', next)}
        />
      </div>
      <div className="app-color-wheel-grid">
        <AppColorWheel
          label="Lift"
          x={value.liftX}
          y={value.liftY}
          strength={value.liftStrength}
          onChangeXY={(x, y) => updateWheel('lift', x, y)}
          onChangeStrength={(next) => update('liftStrength', next)}
          onReset={() => onChange({ ...value, liftX: 0, liftY: 0, liftStrength: 0 })}
        />
        <AppColorWheel
          label="Gamma"
          x={value.gammaX}
          y={value.gammaY}
          strength={value.gammaStrength}
          onChangeXY={(x, y) => updateWheel('gamma', x, y)}
          onChangeStrength={(next) => update('gammaStrength', next)}
          onReset={() => onChange({ ...value, gammaX: 0, gammaY: 0, gammaStrength: 0 })}
        />
        <AppColorWheel
          label="Gain"
          x={value.gainX}
          y={value.gainY}
          strength={value.gainStrength}
          onChangeXY={(x, y) => updateWheel('gain', x, y)}
          onChangeStrength={(next) => update('gainStrength', next)}
          onReset={() => onChange({ ...value, gainX: 0, gainY: 0, gainStrength: 0 })}
        />
      </div>
      <label className="app-color-toggle">
        <input type="checkbox" checked={value.curveEnabled} onChange={(event: ChangeEvent<HTMLInputElement>) => update('curveEnabled', event.target.checked)} />
        Curves enabled
      </label>
      <div className="app-color-tuner__section app-color-tuner__section--compact">
        <AppColorSlider label="Master Curve" value={value.curveMaster} min={0.5} max={1.5} step={0.01} onChange={(next) => update('curveMaster', next)} />
        <AppColorSlider label="Red Curve" value={value.curveR} min={0.5} max={1.5} step={0.01} onChange={(next) => update('curveR', next)} />
        <AppColorSlider label="Green Curve" value={value.curveG} min={0.5} max={1.5} step={0.01} onChange={(next) => update('curveG', next)} />
        <AppColorSlider label="Blue Curve" value={value.curveB} min={0.5} max={1.5} step={0.01} onChange={(next) => update('curveB', next)} />
        <AppColorSlider label="Alpha Curve" value={value.curveA} min={0.5} max={1.5} step={0.01} onChange={(next) => update('curveA', next)} />
      </div>
      <div className="app-curve-grid">
        <AppCurveEditor label="Master" color="#8bffea" points={value.curvePointsMaster} onChange={(next) => update('curvePointsMaster', next)} onReset={() => update('curvePointsMaster', [...DEFAULT_APP_COLOR.curvePointsMaster])} />
        <AppCurveEditor label="Red" color="#ff7a7a" points={value.curvePointsR} onChange={(next) => update('curvePointsR', next)} onReset={() => update('curvePointsR', [...DEFAULT_APP_COLOR.curvePointsR])} />
        <AppCurveEditor label="Green" color="#8effa7" points={value.curvePointsG} onChange={(next) => update('curvePointsG', next)} onReset={() => update('curvePointsG', [...DEFAULT_APP_COLOR.curvePointsG])} />
        <AppCurveEditor label="Blue" color="#8bbcff" points={value.curvePointsB} onChange={(next) => update('curvePointsB', next)} onReset={() => update('curvePointsB', [...DEFAULT_APP_COLOR.curvePointsB])} />
      </div>
      <div className="app-color-export">
        <div>
          <button type="button" onClick={copyJson}>Copy JSON</button>
          <button type="button" onClick={downloadJson}>Download</button>
          <button type="button" onClick={onReset}>Reset</button>
        </div>
        <textarea value={exportJson} readOnly rows={5} aria-label="App color grade JSON export" />
      </div>
    </aside>
  );
}

/** Safari ignores CSS `filter: url(#svg)` on HTML. SVG elements still accept it. */
export function SafariColorGradeHtml({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!isWebKitColorGradeEngine()) {
    return className ? <div className={className}>{children}</div> : children;
  }

  return (
    <svg
      className={`app-color-grade-html-lut${className ? ` ${className}` : ''}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <foreignObject
        x="0"
        y="0"
        width="100%"
        height="100%"
        filter={sameDocumentFilterUrl(APP_COLOR_GRADE_FILTER_ID)}
      >
        <div className="app-color-grade-html-lut__content">
          {children}
        </div>
      </foreignObject>
    </svg>
  );
}

export function AppColorGradeStack({
  children,
  className = '',
  enabled = true,
}: {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
}) {
  const { lutFilterCss, toneFilterCss, cssVars } = useAppColorGrade();

  return (
    <div className={`app-grade-stack${className ? ` ${className}` : ''}`}>
      <div className="app-grade-stack__lut" style={{ filter: enabled ? lutFilterCss : 'none' }}>
        <div className="app-grade-stack__tone" style={{ ...cssVars, filter: enabled ? toneFilterCss : 'none' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AppColorGradeProvider({ children }: { children: ReactNode }) {
  const [color, setColorState] = useState<AppColorGradeState>(() => loadStoredAppColorGrade() ?? createDefaultColorState());
  const [panelOpen, setPanelOpen] = useState(false);

  const setColor = useCallback((next: AppColorGradeState) => {
    setColorState(next);
    saveStoredAppColorGrade(next);
  }, []);

  const resetColor = useCallback(() => {
    setColor(createDefaultColorState());
  }, [setColor]);

  const togglePanel = useCallback(() => {
    setPanelOpen((current) => !current);
  }, []);

  useEffect(() => {
    if (!DEBUG_UI_ENABLED) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      // On macOS, Option+C produces the character "ç", so match the physical
      // key as well as the character to keep the shortcut layout-independent.
      if (event.altKey && (event.code === 'KeyC' || event.key.toLowerCase() === 'c')) {
        event.preventDefault();
        togglePanel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePanel]);

  const filteredColor = useMemo(() => deriveColorGradeCss(color), [color]);
  const filterCss = useMemo(() => colorGradeFilterCss(color), [color]);
  const lutFilterCss = useMemo(() => colorGradeLutFilterCss(), []);
  const toneFilterCss = useMemo(() => colorGradeToneFilterCss(color), [color]);
  const undoFilterCss = useMemo(() => colorGradeUndoFilterCss(color), [color]);
  const webglCompensationFilterCss = useMemo(() => colorGradeWebglCompensationFilterCss(color), [color]);
  const cssVars = useMemo(() => ({
    '--app-color-brightness': filteredColor.brightness,
    '--app-color-contrast': filteredColor.contrast,
    '--app-color-saturation': filteredColor.saturation,
    '--app-color-hue': `${filteredColor.hue}deg`,
    '--app-color-undo-filter': undoFilterCss,
  } as CSSProperties), [filteredColor, undoFilterCss]);

  const contextValue = useMemo<AppColorGradeContextValue>(() => ({
    color,
    setColor,
    resetColor,
    panelOpen,
    setPanelOpen,
    togglePanel,
    filterCss,
    lutFilterCss,
    toneFilterCss,
    cssVars,
    webglCompensationFilterCss,
  }), [color, cssVars, filterCss, lutFilterCss, panelOpen, resetColor, setColor, togglePanel, toneFilterCss, webglCompensationFilterCss]);

  return (
    <AppColorGradeContext.Provider value={contextValue}>
      <AppColorGradeFilter value={color} />
      {children}
      {DEBUG_UI_ENABLED && panelOpen ? (
        <AppColorTuner
          value={color}
          onChange={setColor}
          onReset={resetColor}
          onClose={() => setPanelOpen(false)}
        />
      ) : null}
    </AppColorGradeContext.Provider>
  );
}
