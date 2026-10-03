import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { PAPER_HEIGHT, PAPER_RATIO, PAPER_WIDTH, type PaperPlacement } from './paperFrame';
import { drawStrokes, traceStrokes, type SketchStroke } from '../sketchStrokes';

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
  const wingEdge = edgesOf(wings);
  const guide = document.createElement('canvas');
  guide.width = PAPER_TEXTURE_WIDTH;
  guide.height = PAPER_TEXTURE_HEIGHT;
  const g = guide.getContext('2d')!;
  const sx = PAPER_TEXTURE_WIDTH / MASK_WIDTH;
  const sy = PAPER_TEXTURE_HEIGHT / MASK_HEIGHT;
  // 淡蓝的面 + 虚线点出来的边：像老师用蓝笔先描好的范围
  g.fillStyle = 'rgba(114, 196, 250, 0.16)';
  for (let y = 0; y < MASK_HEIGHT; y += 1) {
    for (let x = 0; x < MASK_WIDTH; x += 1) if (wings[y * MASK_WIDTH + x]) g.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
  }
  g.fillStyle = 'rgba(66, 156, 225, 0.9)';
  const wingStrokes = traceStrokes(wingEdge, MASK_WIDTH, MASK_HEIGHT);
  for (const stroke of wingStrokes) {
    for (let i = 0; i < stroke.length; i += 2) {
      if ((i / 2) % 4 >= 2) continue;
      g.beginPath();
      g.arc(stroke[i] * PAPER_TEXTURE_WIDTH, stroke[i + 1] * PAPER_TEXTURE_HEIGHT, 1.8, 0, Math.PI * 2);
      g.fill();
    }
  }
  return { strokes, canvas, guide };
}
