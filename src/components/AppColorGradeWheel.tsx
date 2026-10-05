import { useCallback, useEffect, useState } from 'react';
import * as ColorWheel from 'react-hsv-ring';
import { colorGradeHexToWheelXY, colorGradeWheelXYToHex } from '../lib/app-color-grade';
import { AppColorSlider } from './AppColorSlider';

/**
 * 调色面板里的 Lift / Gamma / Gain 色轮。react-hsv-ring 只有这里用，单独成块：
 * 面板打开时才下载（AppColorGrade.tsx 里 React.lazy），不进主入口块。
 */
export default function AppColorWheel({
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
