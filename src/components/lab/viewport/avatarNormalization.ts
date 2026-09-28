import { VRMUtils, type VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import type { VrmBounds } from '../domain/types';

export type AvatarNormalization = {
  offset: [number, number, number];
  groundY: number;
  footCenter: [number, number, number];
  bounds: VrmBounds;
  normalizedFacing: '+Z';
};

type OffsetInput = {
  min: [number, number, number];
  max: [number, number, number];
  footCenter?: [number, number, number] | null;
};

const FACING_NORMALIZED_KEY = '__oshiFacingNormalized';

export function ensureCanonicalVrmFacing(vrm: VRM): void {
  if (vrm.scene.userData[FACING_NORMALIZED_KEY]) return;
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.userData[FACING_NORMALIZED_KEY] = true;
}

export function computeAvatarNormalizationOffset(input: OffsetInput): [number, number, number] {
  const center = input.footCenter ?? [
    (input.min[0] + input.max[0]) / 2,
    input.min[1],
    (input.min[2] + input.max[2]) / 2,
  ];
  return [-center[0], -input.min[1], -center[2]];
}

export function getDefaultActorPositionX(existingActorCount: number): number {
  if (existingActorCount === 0) return 0;
  const step = Math.ceil(existingActorCount / 2) * 1.1;
  return existingActorCount % 2 === 1 ? step : -step;
}

function computeLocalBounds(root: THREE.Object3D): VrmBounds {
  root.updateWorldMatrix(true, true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const relativeMatrix = new THREE.Matrix4();
  const box = new THREE.Box3();
  const meshBox = new THREE.Box3();

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    relativeMatrix.multiplyMatrices(inverseRoot, mesh.matrixWorld);
    meshBox.copy(mesh.geometry.boundingBox).applyMatrix4(relativeMatrix);
    box.union(meshBox);
  });

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return {
    center: [center.x, center.y, center.z],
    size: [size.x, size.y, size.z],
    min: [box.min.x, box.min.y, box.min.z],
    max: [box.max.x, box.max.y, box.max.z],
  };
}

function computeFootCenter(vrm: VRM): [number, number, number] | null {
  const leftFoot = vrm.humanoid?.getNormalizedBoneNode('leftFoot');
  const rightFoot = vrm.humanoid?.getNormalizedBoneNode('rightFoot');
  if (!leftFoot || !rightFoot) return null;

  vrm.scene.updateWorldMatrix(true, true);
  const inverseRoot = new THREE.Matrix4().copy(vrm.scene.matrixWorld).invert();
  const left = leftFoot.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseRoot);
  const right = rightFoot.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseRoot);
  return [
    (left.x + right.x) / 2,
    Math.min(left.y, right.y),
    (left.z + right.z) / 2,
  ];
}

export function computeAvatarNormalization(vrm: VRM): AvatarNormalization {
  ensureCanonicalVrmFacing(vrm);
  const bounds = computeLocalBounds(vrm.scene);
  const measuredFootCenter = computeFootCenter(vrm);
  const offset = computeAvatarNormalizationOffset({
    min: bounds.min,
    max: bounds.max,
    footCenter: measuredFootCenter,
  });
  const footCenter: [number, number, number] = measuredFootCenter ?? [
    (bounds.min[0] + bounds.max[0]) / 2,
    bounds.min[1],
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  return {
    offset,
    groundY: bounds.min[1],
    footCenter,
    bounds,
    normalizedFacing: '+Z',
  };
}
