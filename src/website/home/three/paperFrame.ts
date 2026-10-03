import * as THREE from 'three';
import { PAPER_BODY_ANCHOR, PAPER_TILT_DEG } from '../DrawWingsPaper';
import type { GroundResult } from './openingGround';

/**
 * 开场那张纸在 3D 里的摆放（PaperSheet3D 与铅笔稿采样共用，保证两边一模一样）。
 * 纸面朝上铺在地上，图片上方朝着角色头的方向；角色身体中心落在纸面 PAPER_BODY_ANCHOR 处。
 */

/** 纸宽（米）：身长约 1.4 m 的躺姿占纸面长边一半出头，头顶留给手写提示语、脚下不出画 */
export const PAPER_WIDTH = 1.95;
export const PAPER_RATIO = 1652 / 1200;
export const PAPER_HEIGHT = PAPER_WIDTH * PAPER_RATIO;
const PAPER_TILT = THREE.MathUtils.degToRad(PAPER_TILT_DEG);

export type PaperPlacement = {
  /** 纸面 group 的位置与朝向（PaperSheet3D 直接用） */
  groupPosition: THREE.Vector3;
  groupQuaternion: THREE.Quaternion;
  /** 纸面 mesh 相对 group 的偏移（纸面本地坐标，y 朝图片上方） */
  meshOffset: THREE.Vector2;
  /** 纸面中心（世界坐标）与图片的右 / 上方向（世界单位向量） */
  center: THREE.Vector3;
  right: THREE.Vector3;
  up: THREE.Vector3;
};

export function paperPlacement(pose: GroundResult): PaperPlacement {
  // 俯视时绕 Z 的正方向在画面上是顺时针，与 CSS rotate 相反，所以倾角取反
  const heading = Math.atan2(-pose.headDir.x, -pose.headDir.z);
  const groupPosition = new THREE.Vector3(pose.center.x, 0.004, pose.center.z);
  const groupQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, heading - PAPER_TILT, 'XYZ'));
  // 身体中心放到纸面 PAPER_BODY_ANCHOR：纸面中心相对它的偏移
  const meshOffset = new THREE.Vector2(
    -(PAPER_BODY_ANCHOR.cx - 0.5) * PAPER_WIDTH,
    (PAPER_BODY_ANCHOR.cy - 0.5) * PAPER_HEIGHT,
  );
  const center = new THREE.Vector3(meshOffset.x, meshOffset.y, 0).applyQuaternion(groupQuaternion).add(groupPosition);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(groupQuaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(groupQuaternion);
  return { groupPosition, groupQuaternion, meshOffset, center, right, up };
}
