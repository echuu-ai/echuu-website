import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { createEdgeNoise } from './edgeNoise';

/**
 * 鼠标划过角色时的「结霜」扩散（按 igloo.inc 冰块悬停的 mouseFrost 移植）。
 *
 * igloo：每个冰块一张 512² 波纹缓冲，按射线命中的 uv1 把鼠标轨迹「点」进去，
 * 每帧向四邻取最大值扩散、按噪声贴图漂移、乘 0.985 衰减；R = 结霜程度，G = 这一帧新长出的边缘。
 *
 * 这里改为屏幕空间：蒙皮角色几万面，逐帧射线检测太贵；首屏镜头基本静止，
 * 在屏幕空间扩散、只在角色像素上着色，观感一致。是否「摸到」角色用骨骼胶囊投影判断。
 */

const SIM_WIDTH = 512;

const SIM_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const SIM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tBuffer;
uniform sampler2D tNoise;
uniform vec2 uResolution;
uniform vec2 uSplatCoords;
uniform vec2 uSplatPrevCoords;
uniform float uSplatRadius;

// 点到线段的距离（像素空间，横竖同比例）
float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
float cubicIn(float t) { return t * t * t; }

void main() {
  vec2 invResolution = 1.0 / uResolution;
  vec2 uv = vUv;

  // igloo：按噪声贴图漂移（这里用两次错位采样的 fbm 组成向量）
  vec2 advect = vec2(texture2D(tNoise, vUv * 3.0).r, texture2D(tNoise, vUv * 3.0 + 0.37).r) * 2.0 - 1.0;
  uv += advect * invResolution;

  // igloo：波形传播——取四邻最大值
  float l = texture2D(tBuffer, uv - vec2(invResolution.x, 0.0)).r;
  float r = texture2D(tBuffer, uv + vec2(invResolution.x, 0.0)).r;
  float t = texture2D(tBuffer, uv + vec2(0.0, invResolution.y)).r;
  float b = texture2D(tBuffer, uv - vec2(0.0, invResolution.y)).r;
  float nextVal = max(max(max(l, r), t), b);

  // igloo：鼠标轨迹按线段点进去，半径随速度
  float radius = 0.05 * smoothstep(0.1, 1.0, uSplatRadius) * uResolution.y;
  float d = segmentDistance(vUv * uResolution, uSplatPrevCoords * uResolution, uSplatCoords * uResolution);
  nextVal += cubicIn(clamp(1.0 - d / max(radius, 1e-3), 0.0, 1.0));

  // igloo：衰减与上限
  nextVal = min(nextVal * 0.985, 1.0);
  float rim = nextVal - texture2D(tBuffer, uv).r;
  gl_FragColor = vec4(nextVal, rim, 0.0, 1.0);
}`;

const power4Out = (t: number) => 1 - (1 - t) ** 4;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export class FrostSim {
  texture: THREE.Texture;
  /** 0–1，igloo 用它驱动冰晶循环音的音量 */
  soundVelocity = 0;

  private targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private current = 0;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private noise = createEdgeNoise();
  private splat = new THREE.Vector2();
  private last = new THREE.Vector2();
  private lastMoveTime = 0;
  private lastRenderTime = 0;
  private targetVelocity = 0;
  private velocity = 0;
  private hoverStarted = false;
  /** 最后一次有输入的时间；静止几秒后缓冲已衰减到 0，就停止逐帧更新 */
  private lastActiveTime = -Infinity;

  constructor() {
    const height = Math.round(SIM_WIDTH * 9 / 16);
    const options = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.targets = [new THREE.WebGLRenderTarget(SIM_WIDTH, height, options), new THREE.WebGLRenderTarget(SIM_WIDTH, height, options)];
    this.texture = this.targets[0].texture;
    this.material = new THREE.ShaderMaterial({
      vertexShader: SIM_VERTEX,
      fragmentShader: SIM_FRAGMENT,
      uniforms: {
        tBuffer: { value: null },
        tNoise: { value: this.noise },
        uResolution: { value: new THREE.Vector2(SIM_WIDTH, height) },
        uSplatCoords: { value: new THREE.Vector2() },
        uSplatPrevCoords: { value: new THREE.Vector2() },
        uSplatRadius: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }

  /** 画布宽高比变了就按比例重建缓冲高度，保持扩散是圆形 */
  resize(aspect: number) {
    const height = Math.max(64, Math.round(SIM_WIDTH / Math.max(0.3, aspect)));
    if (this.targets[0].height === height) return;
    for (const target of this.targets) target.setSize(SIM_WIDTH, height);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(SIM_WIDTH, height);
  }

  /** 指针进入角色（igloo 的 onMouseHover） */
  hoverStart() {
    this.hoverStarted = true;
  }

  /** 指针在角色上移动（igloo 的 onMouseMove），uv 为画布 0–1 坐标 */
  move(uv: THREE.Vector2, now: number) {
    this.splat.copy(uv);
    this.lastActiveTime = now;
  }

  /** 是否还需要在材质上采样（缓冲衰减完就关掉） */
  isActive(now: number) {
    return now - this.lastActiveTime < 6;
  }

  update(renderer: THREE.WebGLRenderer, now: number) {
    // igloo：最多约 66Hz 更新一次
    if (now - this.lastRenderTime < 0.015) return;
    this.lastRenderTime = now;
    let distance = this.splat.distanceTo(this.last);
    const sinceMove = now - this.lastMoveTime;
    if (distance > 0) this.lastMoveTime = now;
    if (sinceMove > 0.15 || this.hoverStarted || distance > 0.3) {
      this.last.copy(this.splat);
      this.targetVelocity = 0;
      this.soundVelocity = 0;
      distance = 0;
    }
    this.hoverStarted = false;
    this.targetVelocity = clamp01((this.targetVelocity + distance * 6) * 0.88);
    this.velocity += (power4Out(this.targetVelocity) - this.velocity) * 0.1;
    this.soundVelocity = clamp01((this.soundVelocity + distance * 4) * 0.98);

    const u = this.material.uniforms;
    (u.uSplatCoords.value as THREE.Vector2).copy(this.splat);
    (u.uSplatPrevCoords.value as THREE.Vector2).copy(this.last);
    u.uSplatRadius.value = this.velocity;
    this.last.copy(this.splat);

    const read = this.targets[this.current];
    const write = this.targets[1 - this.current];
    u.tBuffer.value = read.texture;
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(write);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previous);
    this.current = 1 - this.current;
    this.texture = write.texture;
  }

  dispose() {
    for (const target of this.targets) target.dispose();
    this.material.dispose();
    this.noise.dispose();
  }
}

// --- 指针是否在角色上：骨骼胶囊投影到屏幕 ------------------------------------------

type Capsule = [VRMHumanBoneName, VRMHumanBoneName, number];
/** [起点骨骼, 终点骨骼, 半径（米）] */
const CAPSULES: Capsule[] = [
  ['hips', 'spine', 0.17], ['spine', 'chest', 0.17], ['chest', 'neck', 0.16], ['neck', 'head', 0.08], ['head', 'head', 0.14],
  ['leftUpperArm', 'leftLowerArm', 0.07], ['leftLowerArm', 'leftHand', 0.06], ['leftHand', 'leftHand', 0.08],
  ['rightUpperArm', 'rightLowerArm', 0.07], ['rightLowerArm', 'rightHand', 0.06], ['rightHand', 'rightHand', 0.08],
  ['leftUpperLeg', 'leftLowerLeg', 0.09], ['leftLowerLeg', 'leftFoot', 0.07],
  ['rightUpperLeg', 'rightLowerLeg', 0.09], ['rightLowerLeg', 'rightFoot', 0.07],
];

const pa = new THREE.Vector3();
const pb = new THREE.Vector3();
const offset = new THREE.Vector3();

/** pointer 为画布像素坐标（左上原点），size 为画布 CSS 尺寸 */
export function pointerOnAvatar(vrm: VRM, camera: THREE.PerspectiveCamera, pointer: THREE.Vector2, size: { width: number; height: number }) {
  const humanoid = vrm.humanoid;
  if (!humanoid) return false;
  const pxPerUnitAt = (depth: number) => size.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * Math.max(depth, 1e-3));
  for (const [from, to, radius] of CAPSULES) {
    const a = humanoid.getRawBoneNode(from);
    const b = humanoid.getRawBoneNode(to);
    if (!a || !b) continue;
    a.getWorldPosition(pa);
    b.getWorldPosition(pb);
    // 头部胶囊的圆心往上提半个头
    if (from === 'head' && to === 'head') { pa.y += 0.08; pb.copy(pa); }
    const depth = offset.copy(pa).add(pb).multiplyScalar(0.5).applyMatrix4(camera.matrixWorldInverse).z * -1;
    if (depth <= 0) continue;
    pa.project(camera);
    pb.project(camera);
    const ax = (pa.x * 0.5 + 0.5) * size.width;
    const ay = (1 - (pa.y * 0.5 + 0.5)) * size.height;
    const bx = (pb.x * 0.5 + 0.5) * size.width;
    const by = (1 - (pb.y * 0.5 + 0.5)) * size.height;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const h = len2 > 0 ? clamp01(((pointer.x - ax) * dx + (pointer.y - ay) * dy) / len2) : 0;
    const distance = Math.hypot(pointer.x - (ax + dx * h), pointer.y - (ay + dy * h));
    if (distance < radius * pxPerUnitAt(depth)) return true;
  }
  return false;
}
