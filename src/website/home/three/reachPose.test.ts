import { expect, it } from 'vitest';
import { Bone, Object3D, Vector3 } from 'three';
import { solveTwoBoneIk } from '../../../lib/reaction/twoBoneIk';
import { createReachPose } from './reachPose';

it('does not accumulate IK on a held animation pose, and restores the arm when the reach ends', () => {
  const skeleton = new Object3D();
  const root = new Bone(), mid = new Bone(), tip = new Bone();
  skeleton.add(root); root.add(mid); mid.add(tip);
  mid.position.set(0.3, 0, 0); tip.position.set(0.25, 0, 0);
  const initialRoot = root.quaternion.clone(), initialMid = mid.quaternion.clone();
  const pose = createReachPose(root, mid);
  const target = new Vector3(0.25, 0.35, 0.15), pole = new Vector3(0, 0, 1);
  function frame() {
    pose.restore(); // The mixer deliberately leaves the unchanged track untouched.
    pose.capture();
    solveTwoBoneIk({root, mid, tip}, target, pole);
    pose.blend(0.7);
    skeleton.updateMatrixWorld(true);
    return tip.getWorldPosition(new Vector3());
  }
  const first = frame();
  for (let i = 0; i < 600; i++) expect(frame().distanceTo(first)).toBeLessThan(1e-10);
  pose.restore();
  expect(root.quaternion.angleTo(initialRoot)).toBeLessThan(1e-7);
  expect(mid.quaternion.angleTo(initialMid)).toBeLessThan(1e-7);
});
