import * as THREE from 'three';
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { MotionKey } from '../openingMotion';

/**
 * 开场动作的接地与对齐（加载烘焙后跑一次）。
 *
 * - Mixamo 的 Stand Up 带一个约 +0.86 m 的根节点高度：按「最后一帧脚底 = 定格姿势脚底」整体下移。
 * - PET_SLEEPING 是桌宠在窗口上沿睡觉（离地约 0.5 m，头朝 −X），而 Stand Up 第一帧躺在地上、头朝 −Z：
 *   把睡姿绕 Y 转到同一朝向、平移到同一位置并落到同一高度，两段之间的 0.7 s 交叉淡入才不会转身、下坠。
 *
 * 只改 hips 的 position / quaternion 轨道（其余骨骼都是相对旋转），时间轴不动。
 * 返回躺姿的身体中心与头的方向，纸面按它摆放。
 */
export type GroundResult = {
  /** 睡姿（wake 开头观众看到的躺姿）的身体中心：头与双脚的中点，贴地 */
  center: THREE.Vector3;
  /** 睡姿头的方向（水平单位向量） */
  headDir: THREE.Vector3;
  /** 3D 纸面中心（PaperSheet3D 第一帧写入），开场第一镜对准它 */
  paper?: THREE.Vector3;
  /** DOM 纸在视口里的高度占比（唤醒那一刻量），3D 第一镜按它定距离，两张纸大小一致 */
  paperFill?: number;
  /** DOM 纸中心相对视口中心的像素偏移（右、下为正） */
  paperShift?: THREE.Vector2;
  /** 从睡姿拍出的铅笔稿与画翅膀引导（captureOutline） */
  sketch?: import('./captureOutline').SketchOutline;
};

const LOW_BONES: VRMHumanBoneName[] = ['hips', 'head', 'chest', 'leftFoot', 'rightFoot', 'leftHand', 'rightHand', 'leftLowerLeg', 'rightLowerLeg'];

export function groundOpeningClips(
  vrm: VRM,
  mixer: THREE.AnimationMixer,
  actions: Partial<Record<MotionKey, THREE.AnimationAction>>,
  sleepTime: number,
): GroundResult | null {
  const hips = vrm.humanoid.getNormalizedBoneNode('hips');
  const parent = hips?.parent;
  const stand = actions.standUp;
  const sleep = actions.sleep;
  const lock = actions.targetLock;
  if (!hips || !parent || !stand || !sleep || !lock) return null;

  const world = new THREE.Vector3();
  const bone = (name: VRMHumanBoneName) => {
    const node = vrm.humanoid.getNormalizedBoneNode(name);
    return node ? node.getWorldPosition(new THREE.Vector3()) : null;
  };
  const pose = (action: THREE.AnimationAction, time: number) => {
    for (const other of Object.values(actions)) {
      if (!other) continue;
      other.enabled = true;
      other.setEffectiveWeight(other === action ? 1 : 0);
    }
    action.time = time;
    mixer.update(0);
    vrm.scene.updateMatrixWorld(true);
  };
  const lowest = () => Math.min(...LOW_BONES.map((name) => bone(name)?.y ?? Infinity));
  const feetY = () => Math.min(bone('leftFoot')?.y ?? Infinity, bone('rightFoot')?.y ?? Infinity);

  const track = (clip: THREE.AnimationClip, prop: 'position' | 'quaternion') =>
    clip.tracks.find((t) => t.name === `${hips.name}.${prop}`)
    ?? (prop === 'position' ? clip.tracks.find((t) => t.name.endsWith('.position')) : undefined);

  /** 世界空间的位移 → hips 父节点本地空间的位移（父节点可能被 rotateVRM0 转了 180°、也可能有缩放） */
  const toLocalDelta = (delta: THREE.Vector3) => {
    const a = parent.worldToLocal(world.set(0, 0, 0).clone());
    const b = parent.worldToLocal(delta.clone());
    return b.sub(a);
  };
  const shift = (clip: THREE.AnimationClip, worldDelta: THREE.Vector3) => {
    const pos = track(clip, 'position');
    if (!pos) return false;
    const d = toLocalDelta(worldDelta);
    for (let i = 0; i < pos.values.length; i += 3) {
      pos.values[i] += d.x;
      pos.values[i + 1] += d.y;
      pos.values[i + 2] += d.z;
    }
    return true;
  };

  // 1. Stand Up 落地：最后一帧的脚底对齐定格姿势的脚底
  pose(lock, lock.getClip().duration);
  const groundFeet = feetY();
  const standDuration = stand.getClip().duration;
  pose(stand, standDuration);
  shift(stand.getClip(), new THREE.Vector3(0, groundFeet - feetY(), 0));

  // 2. Stand Up 第一帧的躺姿：中心、朝向、最低点
  pose(stand, 0);
  const head = bone('head')!;
  const feet = bone('leftFoot')!.add(bone('rightFoot')!).multiplyScalar(0.5);
  const standHips = bone('hips')!;
  const standLow = lowest();
  const headDir = head.clone().sub(feet).setY(0).normalize();
  const center = head.clone().add(feet).multiplyScalar(0.5).setY(0);

  // 3. 睡姿转到同一朝向：绕 Y 旋转 hips（旋转与 VRM0 的 180° 父节点同轴，可以直接在本地空间乘）
  pose(sleep, sleepTime);
  const sleepHead = bone('head')!;
  const sleepFeet = bone('leftFoot')!.add(bone('rightFoot')!).multiplyScalar(0.5);
  const sleepDir = sleepHead.clone().sub(sleepFeet).setY(0).normalize();
  const angle = Math.atan2(sleepDir.x, sleepDir.z) - Math.atan2(headDir.x, headDir.z);
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
  const sleepClip = sleep.getClip();
  const quat = track(sleepClip, 'quaternion');
  const pos = track(sleepClip, 'position');
  if (quat && pos) {
    const q = new THREE.Quaternion();
    for (let i = 0; i < quat.values.length; i += 4) {
      q.fromArray(quat.values, i).premultiply(turn).toArray(quat.values, i);
    }
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.values.length; i += 3) {
      p.fromArray(pos.values, i).applyQuaternion(turn).toArray(pos.values, i);
    }
  }

  // 4. 睡姿平移到躺姿的位置、落到同一高度
  pose(sleep, sleepTime);
  const sleepHips = bone('hips')!;
  const move = new THREE.Vector3(standHips.x - sleepHips.x, standLow - lowest(), standHips.z - sleepHips.z);
  shift(sleepClip, move);

  // 5. 纸面对准观众实际看到的睡姿（不是 Stand Up 第一帧）：身体中心与头的方向
  pose(sleep, sleepTime);
  const restHead = bone('head')!;
  const restFeet = bone('leftFoot')!.add(bone('rightFoot')!).multiplyScalar(0.5);
  center.copy(restHead).add(restFeet).multiplyScalar(0.5).setY(0);
  headDir.copy(restHead).sub(restFeet).setY(0).normalize();

  for (const action of Object.values(actions)) action?.setEffectiveWeight(0);
  return { center, headDir };
}
