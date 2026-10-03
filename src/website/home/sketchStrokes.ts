/**
 * 铅笔稿的笔画：把剪影边缘像素串成一条条笔画（像手画的线），再带着涂鸦抖动画出来。
 * DOM 纸按进度一笔一笔「写」出来；3D 纸面贴图一次画完。两边用同一个随机种子，线条完全一样。
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

/**
 * 画笔画：progress 0–1 按总长度逐笔写出；抖动是确定性的（同样的笔画在 DOM 与 3D 上一模一样）。
 * 每笔两道：一道主线，一道错位的浅线，像铅笔来回描过的涂鸦感。
 */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: SketchStroke[], progress = 1) {
  const { width: w, height: h } = ctx.canvas;
  const unit = w / 880;
  const lengths = strokes.map((stroke) => strokeLength(stroke, w, h));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let budget = total * Math.min(1, Math.max(0, progress));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokes.forEach((stroke, index) => {
    if (budget <= 0) return;
    // 涂鸦抖动：慢的大摆动 + 快的小抖，第二道线错开相位，像来回描了两遍
    const wobble = (i: number, pass: number) => (Math.sin(i * 0.37 + index * 1.7 + pass * 2.3) * 1.8 + Math.sin(i * 2.3 + index + pass) * 0.8) * unit;
    for (const pass of [0, 1]) {
      let left = budget;
      ctx.beginPath();
      ctx.strokeStyle = pass === 0 ? 'rgba(70, 70, 78, 0.78)' : 'rgba(70, 70, 78, 0.28)';
      ctx.lineWidth = (pass === 0 ? 1.7 : 1.1) * unit;
      const shift = pass === 0 ? 0 : 2.4 * unit;
      ctx.moveTo(stroke[0] * w + wobble(0, pass) + shift, stroke[1] * h + wobble(1, pass) + shift * 0.6);
      for (let i = 2; i < stroke.length; i += 2) {
        const segment = Math.hypot((stroke[i] - stroke[i - 2]) * w, (stroke[i + 1] - stroke[i - 1]) * h);
        if (left <= 0) break;
        const u = Math.min(1, left / Math.max(segment, 1e-6));
        const x = (stroke[i - 2] + (stroke[i] - stroke[i - 2]) * u) * w;
        const y = (stroke[i - 1] + (stroke[i + 1] - stroke[i - 1]) * u) * h;
        ctx.lineTo(x + wobble(i, pass) + shift, y + wobble(i + 1, pass) + shift * 0.6);
        left -= segment;
      }
      ctx.stroke();
    }
    budget -= lengths[index];
  });
}
