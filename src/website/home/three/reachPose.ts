import { Quaternion, type Object3D } from 'three';

/** Keep procedural arm corrections out of the next frame's animation input. */
export function createReachPose(root: Object3D | null, mid: Object3D | null) {
  const rootRotation = new Quaternion();
  const midRotation = new Quaternion();
  let applied = false;
  return {
    restore() {
      if (!applied) return;
      root?.quaternion.copy(rootRotation);
      mid?.quaternion.copy(midRotation);
      applied = false;
    },
    capture() {
      if (!root || !mid) return;
      rootRotation.copy(root.quaternion);
      midRotation.copy(mid.quaternion);
      applied = true;
    },
    blend(weight: number) {
      root?.quaternion.slerp(rootRotation, 1 - weight);
      mid?.quaternion.slerp(midRotation, 1 - weight);
    },
  };
}
