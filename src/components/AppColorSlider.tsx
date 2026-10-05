/** 调色面板的数值滑杆（AppColorGrade 面板与按需加载的色轮共用） */
export function AppColorSlider({
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
