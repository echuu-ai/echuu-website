import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { openingTime, OPENING_TOTAL, smoothstep, type OpeningClock } from '../openingTimeline';

/** Camera-facing silver-blue cross, anchored to the posed index fingertip. */
export const FingertipGlint = memo(function FingertipGlint({ vrm, clock }: { vrm: VRM; clock: OpeningClock }) {
  const element = useRef<HTMLDivElement | null>(null);
  const { gl } = useThree();
  useEffect(() => {
    const node = document.createElement('div');
    node.className = 'hv-fingertip-glint';
    node.setAttribute('aria-hidden', 'true');
    node.innerHTML = '<svg viewBox="0 0 100 100" width="100" height="100"><path d="M50 0 L54 44 L100 50 L54 54 L50 100 L46 54 L0 50 L46 44 Z" fill="#d6f5ff"/><path d="M50 17 L52 47 L83 50 L52 52 L50 83 L48 52 L17 50 L48 48 Z" fill="white"/></svg>';
    gl.domElement.parentElement?.appendChild(node);
    element.current = node;
    return () => { node.remove(); element.current = null; };
  }, [gl]);
  const distal = useMemo(() => vrm.humanoid.getRawBoneNode('rightIndexDistal'), [vrm]);
  const intermediate = useMemo(() => vrm.humanoid.getRawBoneNode('rightIndexIntermediate'), [vrm]);
  const pool = useMemo(() => ({ tip: new THREE.Vector3(), joint: new THREE.Vector3(), direction: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), view: new THREE.Vector3() }), []);
  useFrame(({ camera, size }) => {
    const node = element.current;
    if (!node) return;
    const t = openingTime(clock, performance.now()) - OPENING_TOTAL;
    const visible = clock.ready && !!distal && !!intermediate && t > 0 && t < .75;
    node.style.display = visible ? 'block' : 'none';
    if (!visible || !distal || !intermediate) return;
    // Continue the last finger segment, avoiding a screen-size-specific landing point.
    distal.getWorldPosition(pool.tip);
    intermediate.getWorldPosition(pool.joint);
    pool.direction.copy(pool.tip).sub(pool.joint);
    pool.tip.addScaledVector(pool.direction, .7);
    pool.view.copy(pool.tip).applyMatrix4(camera.matrixWorldInverse);
    if (pool.view.z >= 0) { node.style.display = 'none'; return; }
    const persp = camera as THREE.PerspectiveCamera;
    const fovHeight = persp.view?.enabled ? size.height * persp.view.fullHeight / persp.view.height : size.height;
    const unitsPerPixel = 2 * -pool.view.z * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) / fovHeight;
    const arrive = smoothstep(0, .32, t);
    pool.right.setFromMatrixColumn(camera.matrixWorld, 0);
    pool.up.setFromMatrixColumn(camera.matrixWorld, 1);
    pool.view.copy(pool.tip)
      .addScaledVector(pool.right, -95 * (1-arrive) * unitsPerPixel)
      .addScaledVector(pool.up, (42 * (1-arrive) + Math.sin(arrive*Math.PI)*12) * unitsPerPixel);
    pool.view.project(camera);
    const flash = smoothstep(.23,.34,t)*(1-smoothstep(.36,.75,t));
    const x = (pool.view.x + 1) * size.width / 2;
    const y = (1 - pool.view.y) * size.height / 2;
    node.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${.42 + flash*.32})`;
    node.style.opacity = String(smoothstep(0,.08,t)*(1-smoothstep(.4,.75,t)));
  });
  return null;
});
