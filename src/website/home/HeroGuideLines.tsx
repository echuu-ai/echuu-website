import { memo, useEffect, useState } from 'react';

/**
 * 首屏构图辅助线（参考 Shopify Editions Winter '26 的 davinci-lines）。
 * 黄金分割竖线 / 横线、中线、对角线与两段大圆弧，0.5px 白色细线，
 * 首屏出现时按顺序描出来（pathLength=1 + stroke-dashoffset）。纯装饰，不可交互。
 */

const PHI = (1 + Math.sqrt(5)) / 2;
const MINOR = 1 / (PHI * PHI); // 0.382

type Line = { d: string; dashed?: boolean } | { cx: number; cy: number; r: number };

function buildLines(w: number, h: number): Line[] {
  const x1 = w * MINOR;
  const x2 = w * (1 - MINOR);
  const y1 = h * MINOR;
  const y2 = h * (1 - MINOR);
  return [
    { d: `M${w / 2} 0V${h}`, dashed: true },
    { d: `M0 ${h / 2}H${w}`, dashed: true },
    { d: `M${x1} 0V${h}` },
    { d: `M${x2} 0V${h}` },
    { d: `M0 ${y1}H${w}` },
    { d: `M0 ${y2}H${w}` },
    { d: `M0 0L${w} ${h}` },
    { d: `M${w} 0L0 ${h}` },
    // 两段大圆弧：一段托住左下的标题区，一段绕过右上的角色
    { cx: x1, cy: y2, r: h * MINOR },
    { cx: x2, cy: y1, r: h * (1 - MINOR) },
  ];
}

function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setSize({ w: window.innerWidth, h: window.innerHeight }));
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);
  return size;
}

export const HeroGuideLines = memo(function HeroGuideLines() {
  const { w, h } = useViewport();
  const lines = buildLines(w, h);
  return (
    <svg className="hv-guides" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {lines.map((line, i) =>
        'd' in line ? (
          <path key={i} d={line.d} pathLength={1} data-dashed={line.dashed || undefined} style={{ '--i': i } as React.CSSProperties} />
        ) : (
          <circle key={i} cx={line.cx} cy={line.cy} r={line.r} pathLength={1} style={{ '--i': i } as React.CSSProperties} />
        ),
      )}
    </svg>
  );
});
