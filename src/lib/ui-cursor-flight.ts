export type UiFlightPoint = { x: number; y: number };

/** Snapshot the visible UI geometry at launch so pointer movement cannot drag the route. */
export function readUiFlightRoute(x: number, y: number): UiFlightPoint[] | null {
  const surfaces = Array.from(document.querySelectorAll<SVGSVGElement>(
    '.landing-orbital-side .orbital-glass__defs, .hero-middle-oval-stack:not(.landing-orbital-merge-shape) .orbital-glass__defs',
  ));
  if (surfaces.length !== 3 || !document.querySelector('.hero-screen.mode-home.auth-orbital-phase-idle')) return null;
  const width = window.innerWidth, height = window.innerHeight;
  if (width < 640) return null;
  const rings = surfaces.map(svg => ({ svg, rect: svg.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 20 && rect.height > 20 && rect.bottom > 0 && rect.top < height)
    .sort((a, b) => a.rect.left - b.rect.left);
  if (rings.length !== 3) return null;
  if (x > width / 2) rings.reverse();
  const points: UiFlightPoint[] = [{ x, y }];
  rings.forEach(({ svg }, index) => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    // Follow the tilted ellipse, alternating bank direction between neighboring entries.
    const direction = index % 2 ? -1 : 1;
    for (let step = 0; step <= 12; step++) {
      const angle = -Math.PI / 2 + direction * step / 12 * Math.PI * 2;
      const px = 50 + 52 * Math.cos(angle), py = 50 + 52 * Math.sin(angle);
      points.push({
        x: Math.max(28, Math.min(width - 28, matrix.a * px + matrix.c * py + matrix.e)),
        y: Math.max(85, Math.min(height - 55, matrix.b * px + matrix.d * py + matrix.f)),
      });
    }
  });
  points.push({ x, y });
  return points;
}

/** Smooth UI circuit with a continuous tangent across the sampled oval edges. */
export function sampleUiFlightRoute(points: UiFlightPoint[], progress: number): UiFlightPoint {
  const position = Math.max(0, Math.min(1, progress)) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(position));
  const t = position - index;
  const a = points[Math.max(0, index - 1)], b = points[index];
  const c = points[index + 1], d = points[Math.min(points.length - 1, index + 2)];
  const value = (key: 'x' | 'y') => 0.5 * (
    2 * b[key] + (-a[key] + c[key]) * t +
    (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * t * t +
    (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * t * t * t
  );
  return { x: value('x'), y: value('y') };
}
