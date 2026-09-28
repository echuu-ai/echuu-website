import * as THREE from 'three';

// 解析法双骨 IK（肩-肘-腕），复刻 VMagicMirror 手部 IK 的核心解法。
// 每帧调用，禁止分配：全部临时对象取模块级池。
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpT = new THREE.Vector3();
const tmpAB = new THREE.Vector3();
const tmpBA = new THREE.Vector3();
const tmpBC = new THREE.Vector3();
const tmpCA = new THREE.Vector3();
const tmpTA = new THREE.Vector3();
const tmpAxis0 = new THREE.Vector3();
const tmpAxis1 = new THREE.Vector3();
const tmpAxisLocal = new THREE.Vector3();
const tmpPole = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpWorldQuat = new THREE.Quaternion();

const EPS = 1e-6;

function angleBetween(u: THREE.Vector3, v: THREE.Vector3): number {
  const d = u.dot(v) / Math.max(u.length() * v.length(), EPS);
  return Math.acos(THREE.MathUtils.clamp(d, -1, 1));
}

/** 把世界系旋转（axis/angle）作用到节点的局部四元数上。 */
function rotateLocalAboutWorldAxis(
  node: THREE.Object3D,
  worldAxis: THREE.Vector3,
  angle: number,
) {
  if (Math.abs(angle) < EPS || worldAxis.lengthSq() < EPS) return;
  const parent = node.parent;
  if (parent) {
    parent.getWorldQuaternion(tmpWorldQuat).invert();
    tmpAxisLocal.copy(worldAxis).applyQuaternion(tmpWorldQuat).normalize();
  } else {
    tmpAxisLocal.copy(worldAxis).normalize();
  }
  tmpQ.setFromAxisAngle(tmpAxisLocal, angle);
  node.quaternion.premultiply(tmpQ);
}

export type TwoBoneIkChain = {
  root: THREE.Object3D; // upperArm
  mid: THREE.Object3D; // lowerArm
  tip: THREE.Object3D; // hand
};

/**
 * 让 tip 到达 target（世界系），肘部弯向 pole（世界系提示点）。
 * 直接修改 root/mid 的 quaternion；调用后世界矩阵已更新。
 */
export function solveTwoBoneIk(
  chain: TwoBoneIkChain,
  target: THREE.Vector3,
  pole: THREE.Vector3,
): void {
  const { root, mid, tip } = chain;
  root.updateWorldMatrix(true, true);
  root.getWorldPosition(tmpA);
  mid.getWorldPosition(tmpB);
  tip.getWorldPosition(tmpC);
  tmpT.copy(target);

  const lab = tmpA.distanceTo(tmpB);
  const lcb = tmpB.distanceTo(tmpC);
  const lat = THREE.MathUtils.clamp(tmpA.distanceTo(tmpT), EPS, lab + lcb - EPS);

  tmpCA.copy(tmpC).sub(tmpA);
  tmpAB.copy(tmpB).sub(tmpA);
  tmpBA.copy(tmpA).sub(tmpB);
  tmpBC.copy(tmpC).sub(tmpB);
  tmpTA.copy(tmpT).sub(tmpA);

  // 当前/目标内角（余弦定理）
  const acAb0 = angleBetween(tmpCA, tmpAB);
  const acAb1 = Math.acos(
    THREE.MathUtils.clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1),
  );
  const baBc0 = angleBetween(tmpBA, tmpBC);
  const baBc1 = Math.acos(
    THREE.MathUtils.clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1),
  );

  // 弯曲轴：优先用 pole 定义；退化（共线）时用目标方向叉积
  tmpPole.copy(pole).sub(tmpA);
  tmpAxis0.copy(tmpCA).cross(tmpPole);
  if (tmpAxis0.lengthSq() < EPS) tmpAxis0.copy(tmpCA).cross(tmpTA);
  if (tmpAxis0.lengthSq() < EPS) tmpAxis0.set(0, 0, 1);
  tmpAxis0.normalize();

  // 1) 肘部弯曲量调整  2) 肩部补偿
  rotateLocalAboutWorldAxis(mid, tmpAxis0, baBc1 - baBc0);
  rotateLocalAboutWorldAxis(root, tmpAxis0, acAb1 - acAb0);
  root.updateWorldMatrix(true, true);

  // 3) 整体旋向目标：把 (c-a) 转到 (t-a)
  root.getWorldPosition(tmpA);
  tmpCA.copy(tip.getWorldPosition(tmpC)).sub(tmpA);
  tmpTA.copy(tmpT).sub(tmpA);
  const swing = angleBetween(tmpCA, tmpTA);
  tmpAxis1.copy(tmpCA).cross(tmpTA);
  if (tmpAxis1.lengthSq() > EPS && swing > EPS) {
    tmpAxis1.normalize();
    rotateLocalAboutWorldAxis(root, tmpAxis1, swing);
  }
  root.updateWorldMatrix(true, true);
}
