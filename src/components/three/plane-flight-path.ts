import * as THREE from 'three';

/** Author the route in the camera's visible frame, retaining real world depth and occlusion. */
class FramedFlightCurve extends THREE.Curve<THREE.Vector3> {
  private sample = new THREE.Vector3();
  constructor(private path: THREE.CatmullRomCurve3, private inverseProjection: THREE.Matrix4, private world: THREE.Matrix4, private perspective: boolean) { super(); }
  getPoint(t: number, output = new THREE.Vector3()) {
    this.path.getPoint(t, this.sample);
    const depth = this.sample.z;
    output.set(this.sample.x, this.sample.y, 0).applyMatrix4(this.inverseProjection);
    if (this.perspective) output.multiplyScalar(depth / -output.z);
    output.z = -depth;
    return output.applyMatrix4(this.world);
  }
}

/** Randomness is bounded in screen space, so narrow / closely framed scenes retain the plane. */
export function createPlaneFlightPath(start: THREE.Vector3, center: THREE.Vector3, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, radius: number, daring: number, random = Math.random, aim: { x: number; y: number } = { x: 0, y: 0 }) {
  camera.updateMatrixWorld();
  const startView = start.clone().applyMatrix4(camera.matrixWorldInverse);
  const centerView = center.clone().applyMatrix4(camera.matrixWorldInverse);
  const centerNdc = center.clone().project(camera);
  const startNdc = start.clone().project(camera);
  const distance = Math.max(camera.near * 8, -centerView.z);
  const side = random() < .5 ? -1 : 1;
  const cx = THREE.MathUtils.clamp(centerNdc.x, -.22, .22) * side;
  const cy = THREE.MathUtils.clamp(centerNdc.y, -.2, .2);
  const reach = .46 + random() * .12;
  const lift = (.27 + random() * .15) * (random() < .5 ? -1 : 1);
  const close = Math.max(camera.near * 1.6, distance * (.24 - daring * .20));
  const behindCharacter = distance + Math.min(radius * .65, distance * .2);
  const v = (x: number, y: number, depth: number) => new THREE.Vector3(x * side, y, depth);
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(startNdc.x, startNdc.y, Math.max(camera.near * 2, -startView.z)),
    v(cx + reach, cy, distance), v(cx + .1, cy + lift, behindCharacter),
    v(cx - reach, cy, distance), v(-.32, -.12, distance * .6),
    // Aim close to the audience, then sweep sideways through a small hairpin.
    // The closest point has lateral momentum; depth never abruptly reverses on the spot.
    new THREE.Vector3(aim.x - .025 * side, aim.y, close * 2.8),
    new THREE.Vector3(aim.x, aim.y, close),
    v(1.04, .16, close * 1.2), v(.67, .3, close * 2.1),
    v(cx + reach, cy + lift * .65, distance * .85),
    v(cx - .15, cy + lift * .25, distance),
  ], false, 'centripetal');
  const curve = new FramedFlightCurve(path, camera.projectionMatrixInverse.clone(), camera.matrixWorld.clone(), !(camera instanceof THREE.OrthographicCamera));
  curve.arcLengthDivisions = 900;
  curve.updateArcLengths();
  return { curve, duration: 6500 + random() * 600, side };
}
