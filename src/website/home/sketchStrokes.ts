/**
 * 铅笔稿的笔画：把剪影边缘像素串成一条条笔画，再按「人拿铅笔沿着轮廓描」的方式画出来：
 *   - 长轮廓拆成一段段短笔（每段 40–70 个点，段与段稍有重叠），每段起落笔各有一点出头（overshoot）；
 *   - 线条本身只有很轻的低频摆动，不做大幅的波浪；
 *   - 下笔的轻重（透明度 / 粗细）沿笔画缓慢变化，再叠一道错开半个像素的浅线，像石墨的颗粒。
 * 静止时的「涂鸦抖动」（line boil）不在这里做：DOM 上用 SVG 位移滤镜每秒换 8 次种子（DrawWingsPaper）。
 * DOM 纸按进度一笔一笔写出；3D 纸面贴图一次画完。同样的输入画出来完全一样。
 */

/** 一条笔画：纸面图片坐标（0–1）的点列 [x0, y0, x1, y1, …] */
export type SketchStroke = number[];

/**
 * 边缘像素 → 笔画：从最上面的未访问边缘点出发，每次走到最近的未访问邻点（8 邻域，找不到再看 2 格内），
 * 走不下去就开始新的一笔。太短的碎线丢掉，点列每 3 个取 1 个并做一次平滑。
 */
export function traceStrokes(edge: Uint8Array, width: number, height: number): SketchStroke[] {
  const visited = new Uint8Array(edge.length);
  const strokes: SketchStroke[] = [];
  const near: Array<[number, number]> = [];
  for (let r = 1; r <= 2; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r) near.push([dx, dy]);
    }
  }
  for (let start = 0; start < edge.length; start += 1) {
    if (!edge[start] || visited[start]) continue;
    const points: number[] = [];
    let x = start % width;
    let y = (start / width) | 0;
    for (;;) {
      visited[y * width + x] = 1;
      points.push(x, y);
      let moved = false;
      for (const [dx, dy] of near) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const index = ny * width + nx;
        if (!edge[index] || visited[index]) continue;
        x = nx;
        y = ny;
        moved = true;
        break;
      }
      if (!moved) break;
    }
    if (points.length < 16) continue;
    const stroke: SketchStroke = [];
    for (let i = 0; i < points.length; i += 6) {
      const a = Math.max(0, i - 6);
      const b = Math.min(points.length - 2, i + 6);
      stroke.push((points[a] + points[i] * 2 + points[b]) / 4 / width, (points[a + 1] + points[i + 1] * 2 + points[b + 1]) / 4 / height);
    }
    strokes.push(stroke);
  }
  return strokes;
}

export function strokeLength(stroke: SketchStroke, w: number, h: number) {
  let length = 0;
  for (let i = 2; i < stroke.length; i += 2) length += Math.hypot((stroke[i] - stroke[i - 2]) * w, (stroke[i + 1] - stroke[i - 1]) * h);
  return length;
}

/** 确定性的伪随机（同一笔画每次画都一样） */
function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** 长轮廓拆成短笔：返回 [起点索引, 终点索引]（点索引，含首尾，相邻段重叠 2 个点） */
function splitIntoPencilStrokes(pointCount: number, seed: number): Array<[number, number]> {
  const pieces: Array<[number, number]> = [];
  let start = 0;
  let k = 0;
  while (start < pointCount - 1) {
    const length = 14 + Math.floor(hash(seed * 31 + k) * 12);
    const end = Math.min(pointCount - 1, start + length);
    pieces.push([start, end]);
    if (end >= pointCount - 1) break;
    start = Math.max(start + 1, end - 2);
    k += 1;
  }
  return pieces;
}

/**
 * 画笔画：progress 0–1 按总长度逐笔写出。
 */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: SketchStroke[], progress = 1) {
  const { width: w, height: h } = ctx.canvas;
  const unit = w / 880;
  const total = strokes.reduce((sum, stroke) => sum + strokeLength(stroke, w, h), 0);
  let budget = total * Math.min(1, Math.max(0, progress));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  strokes.forEach((stroke, index) => {
    if (budget <= 0) return;
    const count = stroke.length / 2;
    const px = (i: number) => stroke[i * 2] * w;
    const py = (i: number) => stroke[i * 2 + 1] * h;
    for (const [from, to] of splitIntoPencilStrokes(count, index)) {
      if (budget <= 0) break;
      const seed = index * 97 + from;
      // 这一笔的手：整体错开一点点、轻重不同
      const offX = (hash(seed) - 0.5) * 1.4 * unit;
      const offY = (hash(seed + 1) - 0.5) * 1.4 * unit;
      const weight = 0.55 + hash(seed + 2) * 0.3;
      // 起落笔出头：沿切线方向多画 2–5 个单位
      const over = (2 + hash(seed + 3) * 3) * unit;
      const sx = px(from); const sy = py(from);
      const ex = px(to); const ey = py(to);
      const t0x = px(Math.min(to, from + 1)) - sx; const t0y = py(Math.min(to, from + 1)) - sy;
      const t1x = ex - px(Math.max(from, to - 1)); const t1y = ey - py(Math.max(from, to - 1));
      const n0 = Math.hypot(t0x, t0y) || 1;
      const n1 = Math.hypot(t1x, t1y) || 1;
      for (const pass of [0, 1]) {
        let left = budget;
        const shift = pass === 0 ? 0 : 0.7 * unit;
        ctx.beginPath();
        ctx.lineWidth = (pass === 0 ? 1.25 : 0.8) * unit;
        ctx.strokeStyle = pass === 0 ? `rgba(62, 62, 70, ${0.62 * weight + 0.2})` : `rgba(62, 62, 70, ${0.2 * weight})`;
        ctx.moveTo(sx - (t0x / n0) * over + offX + shift, sy - (t0y / n0) * over + offY + shift * 0.5);
        for (let i = from; i <= to; i += 1) {
          // 只有很轻的低频摆动：手的不稳，而不是波浪
          const sway = Math.sin(i * 0.21 + seed) * 0.45 * unit;
          if (i > from) {
            const segment = Math.hypot(px(i) - px(i - 1), py(i) - py(i - 1));
            if (left <= 0) break;
            left -= segment;
          }
          ctx.lineTo(px(i) + offX + sway + shift, py(i) + offY - sway * 0.6 + shift * 0.5);
        }
        if (left > 0) ctx.lineTo(ex + (t1x / n1) * over + offX + shift, ey + (t1y / n1) * over + offY + shift * 0.5);
        ctx.stroke();
      }
      // 每一短笔写完才扣掉它的长度：进度按笔画顺序一笔一笔走
      let piece = 0;
      for (let i = from + 1; i <= to; i += 1) piece += Math.hypot(px(i) - px(i - 1), py(i) - py(i - 1));
      budget -= piece;
    }
  });
}
