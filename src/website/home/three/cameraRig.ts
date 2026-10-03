import * as THREE from 'three';

/**
 * 开场相机（参照 igloo.inc 的线上源码结构）：
 *
 *   基础层：分镜关键帧之间用三次 Hermite 曲线插值（Catmull-Rom 切线），经过关键帧时速度连续——
 *           镜头不会「到点减速停下再起步」。相邻两帧数值相同即为 hold（切线为 0）。
 *   附加层：以注视点为中心的球面指针视差 + 注视点正弦噪声抖动 + 指针速度带来的滚转，
 *           全部用帧率无关的 lerpFPS 跟随（igloo：系数 0.02–0.035，约半秒）。
 *           「活力」系数 life 从 0 爬到 1：镜头在大运动里不被鼠标打扰，落定后才活过来。
 */

/** igloo 的 lerpFPS：系数按 60 fps 定义，任何帧率下跟随速度一致 */
export function lerpFPS(from: number, to: number, coef: number, delta: number) {
  const k = 1 - Math.pow(1 - coef, Math.max(0, delta) * 60);
  return from + (to - from) * k;
}

/**
 * 一维三次 Hermite：times 递增，values 与之等长；切线取 Catmull-Rom（非均匀时间）。
 * 首尾切线为 0；相邻两个值相等的段（hold）切线也强制为 0。
 */
export function hermite(times: number[], values: number[], t: number): number {
  const n = times.length;
  if (t <= times[0]) return values[0];
  if (t >= times[n - 1]) return values[n - 1];
  let i = 0;
  while (i < n - 2 && t >= times[i + 1]) i += 1;
  const t0 = times[i];
  const t1 = times[i + 1];
  const p0 = values[i];
  const p1 = values[i + 1];
  const tangent = (k: number) => {
    if (k <= 0 || k >= n - 1) return 0;
    // hold 的两端不带速度进出
    if (values[k] === values[k - 1] || values[k] === values[k + 1]) return 0;
    return (values[k + 1] - values[k - 1]) / (times[k + 1] - times[k - 1]);
  };
  const h = t1 - t0;
  const s = (t - t0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * tangent(i)
    + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * tangent(i + 1);
}

/** igloo 的 sineNoise1：几个不相关的正弦叠加，-1–1 之间的平滑噪声 */
function sineNoise(a: number, b: number, c: number) {
  return (Math.sin(a * 1.13 + c) + Math.sin(b * 0.87 - c * 1.31) + Math.sin((a + b) * 0.41 + c * 0.73)) / 3;
}

export type CinematicLayerOptions = {
  /** 指针视差：机位绕注视点的球面偏移（rad，横 / 竖） */
  parallax: [number, number];
  /** 注视点抖动幅度（rad）与速度 */
  shake: number;
  shakeSpeed: number;
  /** 指针横向速度 → 滚转（rad / 归一化速度） */
  roll: number;
  /** 跟随系数（lerpFPS，60 fps 基准） */
  follow: number;
};

export const IGLOO_LAYER: CinematicLayerOptions = { parallax: [0.07, 0.025], shake: 0.012, shakeSpeed: 0.35, roll: 0.04, follow: 0.03 };

export class CinematicLayer {
  private theta = 0;
  private phi = 0;
  private rollValue = 0;
  private lastPointerX = 0;
  private time = 0;
  private readonly offset = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();

  constructor(private readonly options: CinematicLayerOptions = IGLOO_LAYER) {}

  /**
   * 在基础机位上叠附加层，直接写入相机。
   * pointer：-1–1 的指针位置；life：0–1 的活力（0 = 只有基础层）。
   */
  apply(camera: THREE.PerspectiveCamera, position: THREE.Vector3, target: THREE.Vector3, pointer: THREE.Vector2, life: number, delta: number, upHint?: THREE.Vector3) {
    const o = this.options;
    this.time += delta;
    const velocity = delta > 0 ? (pointer.x - this.lastPointerX) / Math.max(delta, 1 / 240) : 0;
    this.lastPointerX = pointer.x;
    this.theta = lerpFPS(this.theta, pointer.x * o.parallax[0] * life, o.follow, delta);
    this.phi = lerpFPS(this.phi, -pointer.y * o.parallax[1] * life, o.follow, delta);
    this.rollValue = lerpFPS(this.rollValue, THREE.MathUtils.clamp(velocity * 0.1, -1, 1) * o.roll * life, o.follow, delta);

    // 机位绕注视点做球面偏移（视差），注视点再叠一点手持抖动
    this.forward.copy(target).sub(position);
    const distance = this.forward.length() || 1;
    this.forward.divideScalar(distance);
    this.right.crossVectors(this.forward, THREE.Object3D.DEFAULT_UP).normalize();
    if (this.right.lengthSq() < 1e-6) this.right.set(1, 0, 0);
    this.up.crossVectors(this.right, this.forward).normalize();
    this.offset.copy(position).sub(target)
      .applyAxisAngle(this.up, this.theta)
      .applyAxisAngle(this.right, this.phi);
    camera.position.copy(target).add(this.offset);

    // 手持抖动也乘活力（igloo 乘 touchAmount）：交接帧、大运动时画面是稳的
    const shakeX = sineNoise(12.23, 3.44, -3.234 + this.time * o.shakeSpeed) * o.shake * life;
    const shakeY = sineNoise(-2.45, 4.789, 7.343 + this.time * o.shakeSpeed) * o.shake * life;
    this.forward.copy(target).sub(camera.position)
      .applyAxisAngle(this.right, shakeY)
      .applyAxisAngle(this.up, shakeX);
    // 正俯视时「上」没有定义（lookAt 会让画面打转）：越接近垂直越改用 upHint（头的方向）当画面上方
    const steep = upHint ? THREE.MathUtils.smoothstep(Math.abs(this.forward.y) / (this.forward.length() || 1), 0.7, 0.93) : 0;
    camera.up.copy(THREE.Object3D.DEFAULT_UP).multiplyScalar(1 - steep);
    if (upHint && steep > 0) camera.up.addScaledVector(upHint, steep).normalize();
    camera.lookAt(this.forward.add(camera.position));
    const rollShake = sineNoise(23.434, -1.565, 8.454 + this.time * o.shakeSpeed) * o.shake * 0.5 * life;
    camera.rotateZ(this.rollValue + rollShake);
  }
}
