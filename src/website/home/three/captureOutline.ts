import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { PAPER_HEIGHT, PAPER_RATIO, PAPER_WIDTH, type PaperPlacement } from './paperFrame';
import { drawStrokes, traceStrokes, type SketchStroke } from '../sketchStrokes';

/** 只留最大的一块（翅膀模型在俯视下会碎成几片，引导只要那一片大的） */
function largestComponent(mask: Uint8Array): Uint8Array {
  const label = new Int32Array(mask.length).fill(-1);
  let best = -1;
  let bestSize = 0;
  const queue = new Int32Array(mask.length);
  let id = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || label[start] >= 0) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    label[start] = id;
    while (head < tail) {
      const index = queue[head++];
      const x = index % MASK_WIDTH;
      const y = (index / MASK_WIDTH) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MASK_WIDTH || ny >= MASK_HEIGHT) continue;
        const next = ny * MASK_WIDTH + nx;
        if (!mask[next] || label[next] >= 0) continue;
        label[next] = id;
        queue[tail++] = next;
      }
    }
    if (tail > bestSize) { bestSize = tail; best = id; }
    id += 1;
  }
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) if (label[i] === best) out[i] = 1;
  return out;
}

/**
 * 画翅膀引导：用真实右翼那一块的位置、方向和大小（主轴分析），画一片「一眼看得出是翅膀」的造型——
 * 前缘一道饱满的弧，后缘四片圆头羽毛的扇贝边，里面三道羽轴。蓝色铅笔点线 + 很淡的面。
 * 翅根取离右肩最近的那一端，前缘朝向头的一侧（醒来后真实羽翼长在同一个地方）。
 */
function drawWingGuide(ctx: CanvasRenderingContext2D, wing: Uint8Array, refs: { head: readonly [number, number]; shoulder: readonly [number, number] }) {
  let n = 0; let mx = 0; let my = 0;
  for (let i = 0; i < wing.length; i += 1) if (wing[i]) { mx += i % MASK_WIDTH; my += (i / MASK_WIDTH) | 0; n += 1; }
  if (n < 30) return;
  mx /= n; my /= n;
  let sxx = 0; let syy = 0; let sxy = 0;
  for (let i = 0; i < wing.length; i += 1) {
    if (!wing[i]) continue;
    const dx = (i % MASK_WIDTH) - mx;
    const dy = ((i / MASK_WIDTH) | 0) - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let ux = Math.cos(angle); let uy = Math.sin(angle);
  // 主轴方向上的范围；翅根 = 离右肩近的一端
  let lo = Infinity; let hi = -Infinity; let wlo = Infinity; let whi = -Infinity;
  for (let i = 0; i < wing.length; i += 1) {
    if (!wing[i]) continue;
    const dx = (i % MASK_WIDTH) - mx;
    const dy = ((i / MASK_WIDTH) | 0) - my;
    const a = dx * ux + dy * uy;
    const b = -dx * uy + dy * ux;
    lo = Math.min(lo, a); hi = Math.max(hi, a); wlo = Math.min(wlo, b); whi = Math.max(whi, b);
  }
  const endA = [mx + ux * lo, my + uy * lo];
  const endB = [mx + ux * hi, my + uy * hi];
  const dA = Math.hypot(endA[0] - refs.shoulder[0], endA[1] - refs.shoulder[1]);
  const dB = Math.hypot(endB[0] - refs.shoulder[0], endB[1] - refs.shoulder[1]);
  let root = endA;
  if (dB < dA) { root = endB; ux = -ux; uy = -uy; }
  const length = hi - lo;
  const span = Math.max(whi - wlo, length * 0.34);
  // 前缘朝头：垂直方向取指向头的一侧
  let vx = -uy; let vy = ux;
  if ((refs.head[0] - root[0]) * vx + (refs.head[1] - root[1]) * vy < 0) { vx = -vx; vy = -vy; }

  const sx = PAPER_TEXTURE_WIDTH / MASK_WIDTH;
  const sy = PAPER_TEXTURE_HEIGHT / MASK_HEIGHT;
  /** 翅膀本地坐标（u 沿翅根→翅尖 0–1，v 朝前缘为正，单位 = 翅宽）→ 贴图像素 */
  const at = (u: number, v: number): [number, number] => [
    (root[0] + ux * u * length + vx * v * span) * sx,
    (root[1] + uy * u * length + vy * v * span) * sy,
  ];
  // 造型：前缘从翅根饱满地鼓起到翅尖；后缘四片羽毛，越靠近翅尖越长
  const outline: Array<[number, number]> = [];
  const push = (u: number, v: number) => outline.push(at(u, v));
  for (let k = 0; k <= 24; k += 1) {
    const u = k / 24;
    push(u, 0.22 + 0.42 * Math.sin(Math.PI * Math.min(1, u * 0.92)) * (1 - u * 0.35) - 0.2 * u * u);
  }
  const feathers = [
    { u0: 1.0, u1: 0.74, depth: 0.5 },
    { u0: 0.74, u1: 0.52, depth: 0.46 },
    { u0: 0.52, u1: 0.32, depth: 0.4 },
    { u0: 0.32, u1: 0.06, depth: 0.32 },
  ];
  for (const f of feathers) {
    for (let k = 1; k <= 10; k += 1) {
      const s = k / 10;
      const u = f.u0 + (f.u1 - f.u0) * s;
      // 每片羽毛是一个圆头：中间最深
      push(u, -0.05 - f.depth * Math.sin(Math.PI * s) * (0.55 + 0.45 * u));
    }
  }
  push(0, 0.02);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(114, 196, 250, 0.13)';
  ctx.fill();
  // 蓝色铅笔点线（像老师先用蓝笔点好的范围）
  ctx.setLineDash([2.2, 6.5]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(58, 146, 220, 0.9)';
  ctx.stroke();
  // 三道羽轴：从翅根附近散开到每片羽毛
  ctx.setLineDash([1.6, 7]);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(58, 146, 220, 0.55)';
  for (const f of feathers.slice(0, 3)) {
    const um = (f.u0 + f.u1) / 2;
    const [ax, ay] = at(0.08, 0.05);
    const [cx, cy] = at(um * 0.6, 0.1);
    const [bx, by] = at(um, -0.05 - f.depth * 0.6);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 从 3D 睡姿生成纸上的铅笔稿：正交相机贴着纸面往下拍角色剪影（不含翅膀——翅膀留给观众画），
 * 剪影边缘串成笔画（sketchStrokes）。这样纸上的线和 3D 角色在 wake 那一刻严丝合缝。
 * 再单独拍一次翅膀，只留角色右侧那片：它就是「画翅膀」的引导，和醒来后真实的羽翼完全对齐。
 */

/** 纸面贴图尺寸（与 PaperSheet3D 的画布一致） */
export const PAPER_TEXTURE_WIDTH = 880;
export const PAPER_TEXTURE_HEIGHT = Math.round(PAPER_TEXTURE_WIDTH * PAPER_RATIO);

export type SketchOutline = {
  /** 身体轮廓的笔画（纸面图片坐标 0–1），DOM 纸按它一笔一笔写出来 */
  strokes: SketchStroke[];
  /** 画好整幅轮廓的贴图（3D 纸面用） */
  canvas: HTMLCanvasElement;
  /** 右侧翅膀的引导（与纸面同尺寸，透明底） */
  guide: HTMLCanvasElement;
};

/** 剪影采样分辨率（比贴图低一些，边缘再放大画，线条自带一点铅笔的毛糙） */
const MASK_WIDTH = 560;
const MASK_HEIGHT = Math.round(MASK_WIDTH * PAPER_RATIO);

type MaskSelect = (mesh: THREE.Mesh) => boolean;

/** 只渲染被选中的网格，返回 alpha 剪影（图片坐标：自上而下） */
function renderMask(gl: THREE.WebGLRenderer, vrm: VRM, camera: THREE.Camera, select: MaskSelect): Uint8Array {
  const swapped: Array<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[]; visible: boolean }> = [];
  const silhouettes: THREE.Material[] = [];
  vrm.scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const original = mesh.material;
    const first = (Array.isArray(original) ? original[0] : original) as THREE.Material & { map?: THREE.Texture | null };
    swapped.push({ mesh, material: original, visible: mesh.visible });
    if (!first?.name || !select(mesh)) { mesh.visible = false; return; }
    // 白色剪影，保留贴图 alpha（发丝、羽毛不会变成方块）
    const silhouette = new THREE.MeshBasicMaterial({ color: 0xffffff, map: first.map ?? null, alphaTest: first.map ? 0.5 : 0, side: THREE.DoubleSide });
    silhouettes.push(silhouette);
    mesh.material = silhouette;
  });
  const target = new THREE.WebGLRenderTarget(MASK_WIDTH, MASK_HEIGHT);
  const previousTarget = gl.getRenderTarget();
  const previousClear = gl.getClearColor(new THREE.Color());
  const previousAlpha = gl.getClearAlpha();
  const sceneVisible = vrm.scene.visible;
  vrm.scene.visible = true;
  gl.setRenderTarget(target);
  gl.setClearColor(0x000000, 0);
  gl.clear(true, true, true);
  gl.render(vrm.scene, camera);
  const pixels = new Uint8Array(MASK_WIDTH * MASK_HEIGHT * 4);
  gl.readRenderTargetPixels(target, 0, 0, MASK_WIDTH, MASK_HEIGHT, pixels);
  gl.setRenderTarget(previousTarget);
  gl.setClearColor(previousClear, previousAlpha);
  vrm.scene.visible = sceneVisible;
  target.dispose();
  for (const { mesh, material, visible } of swapped) { mesh.material = material; mesh.visible = visible; }
  for (const material of silhouettes) material.dispose();
  // readPixels 的行自下而上，翻成图片坐标
  const mask = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  for (let y = 0; y < MASK_HEIGHT; y += 1) {
    for (let x = 0; x < MASK_WIDTH; x += 1) mask[y * MASK_WIDTH + x] = pixels[((MASK_HEIGHT - 1 - y) * MASK_WIDTH + x) * 4 + 3] > 8 ? 1 : 0;
  }
  return mask;
}

function edgesOf(mask: Uint8Array) {
  const edge = new Uint8Array(mask.length);
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < MASK_WIDTH && y < MASK_HEIGHT ? mask[y * MASK_WIDTH + x] : 0);
  for (let y = 0; y < MASK_HEIGHT; y += 1) {
    for (let x = 0; x < MASK_WIDTH; x += 1) {
      if (!at(x, y)) continue;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) edge[y * MASK_WIDTH + x] = 1;
    }
  }
  return edge;
}

export function captureSleepOutline(gl: THREE.WebGLRenderer, vrm: VRM, paper: PaperPlacement): SketchOutline {
  // 正交相机：视野正好是整张纸，画面上方 = 图片上方
  const camera = new THREE.OrthographicCamera(-PAPER_WIDTH / 2, PAPER_WIDTH / 2, PAPER_HEIGHT / 2, -PAPER_HEIGHT / 2, 0.01, 20);
  const normal = new THREE.Vector3().crossVectors(paper.right, paper.up).normalize();
  camera.position.copy(paper.center).addScaledVector(normal, 8);
  camera.up.copy(paper.up);
  camera.lookAt(paper.center);
  camera.updateMatrixWorld(true);

  // 身体轮廓 → 笔画 → 整幅贴图
  const body = renderMask(gl, vrm, camera, (mesh) => mesh.name !== 'wings');
  const strokes = traceStrokes(edgesOf(body), MASK_WIDTH, MASK_HEIGHT);
  const canvas = document.createElement('canvas');
  canvas.width = PAPER_TEXTURE_WIDTH;
  canvas.height = PAPER_TEXTURE_HEIGHT;
  drawStrokes(canvas.getContext('2d')!, strokes, 1);

  // 翅膀引导：只留脊柱线右侧（角色右肩那一侧）那片
  const toMask = (name: VRMHumanBoneName) => {
    const node = vrm.humanoid.getNormalizedBoneNode(name);
    const point = node ? node.getWorldPosition(new THREE.Vector3()) : paper.center.clone();
    point.project(camera);
    return [((point.x + 1) / 2) * MASK_WIDTH, ((1 - point.y) / 2) * MASK_HEIGHT] as const;
  };
  const [hx, hy] = toMask('head');
  const [kx, ky] = toMask('hips');
  const [rx, ry] = toMask('rightUpperArm');
  const sideOf = (x: number, y: number) => Math.sign((hx - kx) * (y - ky) - (hy - ky) * (x - kx));
  const rightSide = sideOf(rx, ry) || 1;
  const wings = renderMask(gl, vrm, camera, (mesh) => mesh.name === 'wings');
  for (let y = 0; y < MASK_HEIGHT; y += 1) {
    for (let x = 0; x < MASK_WIDTH; x += 1) if (wings[y * MASK_WIDTH + x] && sideOf(x, y) !== rightSide) wings[y * MASK_WIDTH + x] = 0;
  }
  const guide = document.createElement('canvas');
  guide.width = PAPER_TEXTURE_WIDTH;
  guide.height = PAPER_TEXTURE_HEIGHT;
  drawWingGuide(guide.getContext('2d')!, largestComponent(wings), { head: [hx, hy], shoulder: [rx, ry] });
  return { strokes, canvas, guide };
}
