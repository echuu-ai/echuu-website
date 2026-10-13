/** 开发用调节面板的一行：滑块 + 数字框；changed 时标签高亮 */
export function TuneRow({ label, value, min, max, step, changed, onChange }: {
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
