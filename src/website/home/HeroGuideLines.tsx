import { memo, useEffect, useRef, useState } from 'react';

/**
 * 首页构图辅助线（参考 Shopify Editions Winter '26 的 davinci-lines）。
 * 黄金分割竖线 / 横线、中线、对角线与两段大圆弧，0.5px 白色细线，固定在视口上。
 * 每一屏显示其中一组：当前所在区块决定 data-active；第一次到达某一屏时那组线先亮后暗（line-fade）。
 * 首屏出现时依次描出来（pathLength=1 + stroke-dashoffset）。纯装饰，不可交互。
 */

const PHI = (1 + Math.sqrt(5)) / 2;
const MINOR = 1 / (PHI * PHI); // 0.382

/** 区块顺序：0 首屏，之后依次是首页各区块与页脚 */
const SCENES = ['.hv-hero', '#intro', '#steps', '#feature', '#modes', '#creators', '#blog', '#beta'];

type Line = { groups: number[]; dashed?: boolean } & ({ d: string } | { cx: number; cy: number; r: number });

function buildLines(w: number, h: number): Line[] {
  const x1 = w * MINOR;
  const x2 = w * (1 - MINOR);
  const y1 = h * MINOR;
  const y2 = h * (1 - MINOR);
  return [
    { d: `M${w / 2} 0V${h}`, dashed: true, groups: [0, 2, 4, 7] },
    { d: `M0 ${h / 2}H${w}`, dashed: true, groups: [0, 3, 6, 7] },
    { d: `M${x1} 0V${h}`, groups: [0, 1, 6] },
    { d: `M${x2} 0V${h}`, groups: [0, 1, 5] },
    { d: `M0 ${y1}H${w}`, groups: [0, 1, 3, 6] },
    { d: `M0 ${y2}H${w}`, groups: [0, 1, 3, 5] },
    { d: `M0 0L${w} ${h}`, groups: [2, 4] },
    { d: `M${w} 0L0 ${h}`, groups: [2, 4] },
    // 两段大圆弧：一段托住左下的标题区，一段绕过右上的角色
    { cx: x1, cy: y2, r: h * MINOR, groups: [0, 3, 7] },
    { cx: x2, cy: y1, r: h * (1 - MINOR), groups: [0, 4, 5, 7] },
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

/** 视口里占比最大的区块 → data-active；直接写 DOM 属性，不触发 React 重渲染 */
function useActiveScene(svgRef: React.RefObject<SVGSVGElement>) {
  useEffect(() => {
    const svg = svgRef.current;
    const scenes = SCENES.map((selector, index) => ({ index, el: document.querySelector(selector) }))
      .filter((scene): scene is { index: number; el: Element } => !!scene.el);
    const targets = scenes.map((scene) => scene.el);
    if (!svg || !targets.length || typeof IntersectionObserver === 'undefined') return;
    const ratios = new Map<Element, number>();
    const shown = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
        let best = -1;
        let bestRatio = 0;
        targets.forEach((target, index) => {
          const ratio = ratios.get(target) ?? 0;
          if (ratio > bestRatio) { bestRatio = ratio; best = index; }
        });
        if (best < 0) return;
        const index = scenes[best].index;
        if (svg.dataset.active === String(index)) return;
        svg.dataset.active = String(index);
        // 第一次到达这一屏才高亮一次
        svg.dataset.animating = shown.has(index) ? '' : String(index);
        shown.add(index);
      },
      { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9] },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [svgRef]);
}

export const HeroGuideLines = memo(function HeroGuideLines() {
  const { w, h } = useViewport();
  const svgRef = useRef<SVGSVGElement>(null);
  useActiveScene(svgRef);
  const lines = buildLines(w, h);
  return (
    <svg ref={svgRef} className="hv-guides" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-active="0">
      {lines.map((line, i) => {
        const common = {
          pathLength: 1,
          'data-groups': line.groups.join(' '),
          'data-dashed': line.dashed || undefined,
          style: { '--i': i } as React.CSSProperties,
        };
        return 'd' in line
          ? <path key={i} d={line.d} {...common} />
          : <circle key={i} cx={line.cx} cy={line.cy} r={line.r} {...common} />;
      })}
    </svg>
  );
});
