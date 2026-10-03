/**
 * 铅笔稿的笔画：剪影描成闭合轮廓（traceContours），再按「人拿铅笔沿着轮廓描」的方式画出来：
 *   - 长轮廓拆成一段段短笔（每段 40–70 个点，段与段稍有重叠），每段起落笔各有一点出头（overshoot）；
 *   - 线条本身只有很轻的低频摆动，不做大幅的波浪；
 *   - 下笔的轻重（透明度 / 粗细）沿笔画缓慢变化，再叠一道错开半个像素的浅线，像石墨的颗粒。
 * 静止时的「涂鸦抖动」（line boil）不在这里做：DOM 上用 SVG 位移滤镜每秒换 8 次种子（DrawWingsPaper）。
 * DOM 纸按进度一笔一笔写出；3D 纸面贴图一次画完。同样的输入画出来完全一样。
 */

/** 一条笔画：纸面图片坐标（0–1）的点列 [x0, y0, x1, y1, …] */
export type SketchStroke = number[];

/**
 * 剪影 → 闭合轮廓（marching squares）：每个像素格按四角内外查表连线，再把线段首尾相接成闭合环。
 * 和逐像素贪心走边不同，这里不会漏掉任何一段边（脚底、头顶的细节都在），每条轮廓都是首尾闭合的。
 * 太短的环（< 24 px，噪点）丢掉；点列每 3 个取 1 个并做一次环形平滑。
 */
export function traceContours(mask: Uint8Array, width: number, height: number): SketchStroke[] {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] ? 1 : 0);
  const W2 = width + 2;
  // 边的编号：水平边 (x,y)-(x+1,y) 为偶数，竖直边 (x,y)-(x,y+1) 为奇数（坐标整体 +1 留出外圈）
  const hId = (x: number, y: number) => ((y + 1) * W2 + (x + 1)) * 2;
  const vId = (x: number, y: number) => ((y + 1) * W2 + (x + 1)) * 2 + 1;
  const point = (id: number): [number, number] => {
    const cell = id >> 1;
    const x = (cell % W2) - 1;
    const y = Math.floor(cell / W2) - 1;
    return id & 1 ? [x, y + 0.5] : [x + 0.5, y];
  };
  const links = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    (links.get(a) ?? links.set(a, []).get(a)!).push(b);
    (links.get(b) ?? links.set(b, []).get(b)!).push(a);
  };
  for (let y = -1; y < height; y += 1) {
    for (let x = -1; x < width; x += 1) {
      const tl = at(x, y); const tr = at(x + 1, y); const br = at(x + 1, y + 1); const bl = at(x, y + 1);
      const c = tl * 8 + tr * 4 + br * 2 + bl;
      if (c === 0 || c === 15) continue;
      // 格子的四条边：上、右、下、左
      const T = hId(x, y); const R = vId(x + 1, y); const B = hId(x, y + 1); const L = vId(x, y);
      switch (c) {
        case 1: case 14: link(L, B); break;
        case 2: case 13: link(B, R); break;
        case 3: case 12: link(L, R); break;
        case 4: case 11: link(T, R); break;
        case 6: case 9: link(T, B); break;
        case 7: case 8: link(L, T); break;
        case 5: link(L, T); link(B, R); break;
        case 10: link(T, R); link(L, B); break;
        default: break;
      }
    }
  }
  const used = new Set<number>();
  const strokes: SketchStroke[] = [];
  for (const start of links.keys()) {
    if (used.has(start)) continue;
    const loop: Array<[number, number]> = [];
    let prev = -1;
    let cur = start;
    while (!used.has(cur)) {
      used.add(cur);
      loop.push(point(cur));
      const next = (links.get(cur) ?? []).find((n) => n !== prev && !used.has(n));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    if (loop.length < 24) continue;
    const n = loop.length;
    const stroke: SketchStroke = [];
    for (let i = 0; i < n; i += 3) {
      const a = loop[(i - 3 + n) % n]; const b = loop[i]; const d = loop[(i + 3) % n];
      stroke.push((a[0] + b[0] * 2 + d[0]) / 4 / width, (a[1] + b[1] * 2 + d[1]) / 4 / height);
    }
    // 闭合：回到第一个点
    stroke.push(stroke[0], stroke[1]);
    strokes.push(stroke);
  }
  return strokes;
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
  // 总长按「拆成短笔之后」的长度算：短笔之间互相重叠 2 个点，直接用轮廓长度当预算会在最后几笔用光，轮廓收不了口
  const pieceLength = (stroke: SketchStroke, from: number, to: number) => {
    let length = 0;
    for (let i = from + 1; i <= to; i += 1) length += Math.hypot((stroke[i * 2] - stroke[i * 2 - 2]) * w, (stroke[i * 2 + 1] - stroke[i * 2 - 1]) * h);
    return length;
  };
  const total = strokes.reduce((sum, stroke, index) => sum + splitIntoPencilStrokes(stroke.length / 2, index)
    .reduce((acc, [from, to]) => acc + pieceLength(stroke, from, to), 0), 0);
  let budget = progress >= 1 ? Infinity : total * Math.max(0, progress);
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
      budget -= pieceLength(stroke, from, to);
    }
  });
}
