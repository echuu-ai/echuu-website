import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { PAPER_HEIGHT, PAPER_RATIO, PAPER_WIDTH, type PaperPlacement } from './paperFrame';
import { drawStrokes, traceContours, type SketchStroke } from '../sketchStrokes';

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
 * 画翅膀引导（按 Cory 手绘的样子）：一片卡通小天使翅膀——翅根在右肩胛，前缘一道饱满的弧往上往外长到翅尖，
 * 外缘三片圆滚滚的羽毛往下收回，底边平平地回到翅根。圆点虚线 + 很淡的蓝面 + 翅尖两颗小星星（不画羽轴，保持干净）。
 * 方向与大小按身体算：「上」= 髋→头，「外」= 背离脊柱、朝真实右翼所在的一侧，高约为头到髋的 0.8 倍、宽约 0.85 倍（和手绘稿一样往外伸得开，又不出纸边）。
 */
function drawWingGuide(ctx: CanvasRenderingContext2D, wing: Uint8Array, refs: { head: readonly [number, number]; hips: readonly [number, number]; shoulder: readonly [number, number] }) {
  // 引导那一侧真实翅膀的重心：决定翅膀往哪一侧长
  let n = 0; let mx = 0; let my = 0;
  for (let i = 0; i < wing.length; i += 1) if (wing[i]) { mx += i % MASK_WIDTH; my += (i / MASK_WIDTH) | 0; n += 1; }
  const [hx, hy] = refs.head;
  const [kx, ky] = refs.hips;
  const L = Math.hypot(hx - kx, hy - ky) || 1;
  const upx = (hx - kx) / L;
  const upy = (hy - ky) / L;
  let outx = -upy;
  let outy = upx;
  // 有真实翅膀像素就朝它长；没有就朝画面左边长
  const flip = n > 30 ? (mx / n - kx) * outx + (my / n - ky) * outy < 0 : outx > 0;
  if (flip) { outx = -outx; outy = -outy; }
  // 翅根：肩往外推到背的边缘、再往下一点（肩胛骨），翅膀从背后长出来、不盖住身体
  const rootX = refs.shoulder[0] + outx * L * 0.1 - upx * L * 0.36;
  const rootY = refs.shoulder[1] + outy * L * 0.1 - upy * L * 0.36;
  const W = L * 0.84;
  const H = L * 0.82;
  const sx = PAPER_TEXTURE_WIDTH / MASK_WIDTH;
  const sy = PAPER_TEXTURE_HEIGHT / MASK_HEIGHT;
  /** 翅膀本地坐标（x 朝外、y 朝上，翅根 = 原点）→ 贴图像素 */
  const at = (x: number, y: number): [number, number] => [
    (rootX + outx * x * W + upx * y * H) * sx,
    (rootY + outy * x * W + upy * y * H) * sy,
  ];
  const path = (curves: number[][], start: [number, number]) => {
    ctx.beginPath();
    ctx.moveTo(...at(...start));
    for (const c of curves) ctx.bezierCurveTo(...at(c[0], c[1]), ...at(c[2], c[3]), ...at(c[4], c[5]));
  };
  // 外形：前缘 → 圆翅尖 → 三片圆羽毛 → 平底回到翅根
  const outline = [
    [0.04, 0.46, 0.42, 0.96, 0.94, 1.0],
    [1.06, 1.01, 1.08, 0.86, 0.99, 0.8],
    [1.13, 0.72, 1.06, 0.55, 0.93, 0.57],
    [1.02, 0.45, 0.93, 0.31, 0.79, 0.35],
    [0.85, 0.2, 0.72, 0.1, 0.57, 0.15],
    [0.55, 0.03, 0.42, -0.02, 0.3, 0.03],
    [0.2, 0.04, 0.08, 0.02, 0, 0],
  ];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path(outline, [0, 0]);
  ctx.closePath();
  ctx.fillStyle = 'rgba(130, 200, 255, 0.2)';
  ctx.fill();
  // 圆点虚线：线宽 3.6 + 极短的线段 = 一颗颗小圆点
  ctx.setLineDash([0.1, 9]);
  ctx.lineWidth = 3.8;
  ctx.strokeStyle = 'rgba(58, 146, 226, 0.95)';
  ctx.stroke();
  // 翅尖旁两颗小星星（四角星，实线）
  ctx.setLineDash([]);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = 'rgba(58, 146, 226, 0.85)';
  // 星星在翅尖内侧上方（纸面里面），不出纸边
  for (const [x, y, r] of [[0.62, 1.12, 0.07], [0.42, 1.04, 0.045]] as const) {
    const [cx, cy] = at(x, y);
    const size = r * H * Math.hypot(sx, sy) / Math.SQRT2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size); ctx.quadraticCurveTo(cx, cy, cx + size, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + size); ctx.quadraticCurveTo(cx, cy, cx - size, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - size);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 从 3D 睡姿生成纸上的铅笔稿：正交相机贴着纸面往下拍角色剪影（不含翅膀——翅膀留给观众画），
 * 剪影边缘串成笔画（sketchStrokes）。这样纸上的线和 3D 角色在 wake 那一刻严丝合缝。
 * 再单独拍一次翅膀，只留画面左侧（她背后）那片：它就是「画翅膀」的引导，和醒来后真实的羽翼对齐。
 */

/** 纸面贴图尺寸（与 PaperSheet3D 的画布一致） */
export const PAPER_TEXTURE_WIDTH = 880;
export const PAPER_TEXTURE_HEIGHT = Math.round(PAPER_TEXTURE_WIDTH * PAPER_RATIO);

export type SketchOutline = {
  /** 身体轮廓的笔画（纸面图片坐标 0–1），DOM 纸按它一笔一笔写出来 */
  strokes: SketchStroke[];
  /** 画好整幅轮廓的贴图（3D 纸面用） */
  canvas: HTMLCanvasElement;
  /** 左侧翅膀的引导（与纸面同尺寸，透明底） */
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
  const strokes = traceContours(body, MASK_WIDTH, MASK_HEIGHT);
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
  const sideOf = (x: number, y: number) => Math.sign((hx - kx) * (y - ky) - (hy - ky) * (x - kx));
  // 引导固定在画面左侧（侧睡时就是她背后那一侧）：脊柱线左边那片翅膀
  const keepSide = sideOf(kx - MASK_WIDTH, ky) || 1;
  // 翅根取这一侧的肩；两肩都不在这侧时取离这一侧更近的那个
  const [lx, ly] = toMask('leftUpperArm');
  const [rx0, ry0] = toMask('rightUpperArm');
  const leftOf = (x: number, y: number) => (hx - kx) * (y - ky) - (hy - ky) * (x - kx);
  const [rx, ry] = leftOf(lx, ly) * keepSide > leftOf(rx0, ry0) * keepSide ? [lx, ly] : [rx0, ry0];
  const wings = renderMask(gl, vrm, camera, (mesh) => mesh.name === 'wings');
  for (let y = 0; y < MASK_HEIGHT; y += 1) {
    for (let x = 0; x < MASK_WIDTH; x += 1) if (wings[y * MASK_WIDTH + x] && sideOf(x, y) !== keepSide) wings[y * MASK_WIDTH + x] = 0;
  }
  const guide = document.createElement('canvas');
  guide.width = PAPER_TEXTURE_WIDTH;
  guide.height = PAPER_TEXTURE_HEIGHT;
  drawWingGuide(guide.getContext('2d')!, largestComponent(wings), { head: [hx, hy], hips: [kx, ky], shoulder: [rx, ry] });
  return { strokes, canvas, guide };
}
