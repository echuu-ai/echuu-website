import { createPlaneFlightPath } from './plane-flight-path';
import { timelineTime } from '../../lib/plane-timeline';
import { planeTimelinePreview } from '../../lib/scene-cursor-flight';
import { getCursorSettings } from '../../lib/cursor-settings';
import { createPlaneSparkles } from './plane-sparkles';
import { memo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { publicUrl } from '../../lib/publicUrl';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { registerSceneFlightHost, sceneCursorFlight as bridge, target } from '../../lib/scene-cursor-flight';

const COUNT = 90;


/** Lives in the avatar's own scene: aircraft and wing trails share its depth buffer. */
export const ScenePaperPlane = memo(function ScenePaperPlane({ avatar }: { avatar?: THREE.Object3D }) {
  const { scene, camera, gl, invalidate } = useThree();
  const reduced = usePrefersReducedMotion();
  const tick = useRef<(now: number, dt: number) => void>(() => {});
  useFrame((_, dt) => tick.current(performance.now(), Math.min(dt, 0.05)));
  useEffect(() => {
    if (reduced) return;
    let disposed = false;
    let ready = false;
    let started = 0;
    let returningAt = 0;
    let returnMs = 1200;
    let flightPath: ReturnType<typeof createPlaneFlightPath>;
    let sceneEntered = false;
    let lastSample = 0;
    let sampleCount = 0;
    let fade = 0;
    let lastEditorTime = -1;
    let throwReleased = false;
    const throwOrigin = new THREE.Vector3();
    const catchOrigin = new THREE.Vector3();
    let catching = false;
    const root = new THREE.Group();
    root.visible = false;
    scene.add(root);
    const plane = new THREE.Group();
    root.add(plane);
    const sparkles = createPlaneSparkles(root);
    const trailSparkles = createPlaneSparkles(root);
    const trailGlint = new THREE.Vector3();
    const cameraLocal = new THREE.Vector3();
    const position = new THREE.Vector3();
    const previous = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const start = new THREE.Vector3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    const front = new THREE.Vector3();
    const destination = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const ndc = new THREE.Vector3();
    const rayOrigin = new THREE.Vector3();
    const rayDirection = new THREE.Vector3();
    const ray = new THREE.Ray();
    const screenPlane = new THREE.Plane();
    const from = new THREE.Vector3();
    const control = new THREE.Vector3();
    const control2 = new THREE.Vector3();
    const noseAxis = new THREE.Vector3(-1, 0, 0);
    const rollQuaternion = new THREE.Quaternion();
    const targetQuaternion = new THREE.Quaternion();
    const facing = new THREE.Vector3();
    const wing = new THREE.Vector3();
    const endpoint = new THREE.Vector3();
    const older = new THREE.Vector3();
    const trailSide = new THREE.Vector3();
    const bounds = new THREE.Box3();
    let radius = 0.7;
    let planeScale = 0.08;
    const subjectBounds = new THREE.Box3();
    const findSubject = () => {
      bounds.makeEmpty();
      if (avatar) bounds.setFromObject(avatar);
      else scene.traverseVisible(node => {
        if (node instanceof THREE.SkinnedMesh) { subjectBounds.setFromObject(node); bounds.union(subjectBounds); }
      });
      return !bounds.isEmpty();
    };
    // Zero-size markers recover the canvas affine transform, including the tilted hero oval.
    const container = gl.domElement.parentElement!;
    const markers = [[0, 0], [100, 0], [0, 100]].map(([x, y]) => {
      const marker = document.createElement('i');
      marker.style.cssText = `position:absolute;left:${x}%;top:${y}%;width:0;height:0;pointer-events:none;visibility:hidden`;
      container.appendChild(marker);
      return marker;
    });
    let ox = 0, oy = 0, ax = 1, ay = 0, bx = 0, by = 1;
    const readMapping = () => {
      const a = markers[0].getBoundingClientRect();
      const b = markers[1].getBoundingClientRect();
      const c = markers[2].getBoundingClientRect();
      ox = a.x; oy = a.y; ax = b.x - ox; ay = b.y - oy; bx = c.x - ox; by = c.y - oy;
    };
    const screenToWorld = (x: number, y: number, output: THREE.Vector3) => {
      const determinant = ax * by - ay * bx;
      if (Math.abs(determinant) < 1) return output.copy(center);
      const px = x - ox, py = y - oy;
      ndc.set(2 * (px * by - py * bx) / determinant - 1, 1 - 2 * (py * ax - px * ay) / determinant, 0.5);
      ndc.unproject(camera);
      if (camera instanceof THREE.OrthographicCamera) {
        rayOrigin.copy(ndc); camera.getWorldDirection(rayDirection);
      } else {
        camera.getWorldPosition(rayOrigin);
        rayDirection.copy(ndc).sub(rayOrigin).normalize();
      }
      ray.set(rayOrigin, rayDirection);
      screenPlane.setFromNormalAndCoplanarPoint(front, destination.copy(center).addScaledVector(front, radius));
      ray.intersectPlane(screenPlane, output);
      return output;
    };
    const studio = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(studio, 0.03);
    studio.dispose(); pmrem.dispose();
    const metal = new THREE.MeshPhysicalMaterial({ color: '#e4edfa', metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.1, envMap: env.texture, envMapIntensity: 1.5 });
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(COUNT * 4 * 3);
    const uvs = new Float32Array(COUNT * 4 * 2);
    const indices: number[] = [];
    const history = new Float32Array(COUNT * 2 * 3);
    for (let side = 0; side < 2; side++) for (let i = 0; i < COUNT; i++) {
      const index = side * COUNT * 2 + i * 2;
      uvs.set([0, i / (COUNT - 1), 1, i / (COUNT - 1)], index * 2);
      if (i < COUNT - 1) indices.push(index, index + 1, index + 2, index + 1, index + 3, index + 2);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    const trailMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { opacity: { value: 0 }, colorA: { value: new THREE.Color() }, colorB: { value: new THREE.Color() }, colorC: { value: new THREE.Color() }, rainbow: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float opacity; uniform vec3 colorA; uniform vec3 colorB; uniform vec3 colorC; uniform float rainbow;
        void main(){
          float edge=sin(vUv.x*3.14159265);
          float strands=pow(.5+.5*cos(vUv.x*18.8496),5.);
          vec3 spectrum=.5+.5*cos(6.2831853*(vec3(0.,.33,.67)+vUv.x*.85+vUv.y*.16));
          vec3 palette=vUv.x<.5 ? mix(colorA,colorB,vUv.x*2.) : mix(colorB,colorC,(vUv.x-.5)*2.);
          spectrum=mix(palette,spectrum,rainbow);
          vec3 color=mix(spectrum,vec3(1.),.12+strands*.16);
          float a=(.26*edge+.78*strands*edge)*pow(1.-vUv.y,1.25)*opacity;
          gl_FragColor=vec4(color*1.15,a);
        }`,
    });
    const trail = new THREE.Mesh(geometry, trailMaterial);
    trail.frustumCulled = false;
    trail.renderOrder = 5;
    root.add(trail);
    let model: THREE.Object3D | undefined;
    const disposeModel = (object: THREE.Object3D) => object.traverse(node => {
      if (node instanceof THREE.Mesh) node.geometry.dispose();
    });
    new GLTFLoader().loadAsync(publicUrl('assets/cursor/crystal-arrow.glb')).then(gltf => {
      const oldMaterials = new Set<THREE.Material>();
      gltf.scene.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return;
        (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => oldMaterials.add(m));
        node.material = metal;
      });
      oldMaterials.forEach(m => m.dispose());
      if (disposed) { disposeModel(gltf.scene); return; }
      model = gltf.scene;
      // Raw geometry nose points -X. Place its tip at the group's origin.
      model.position.set(.95, -.11, 0);
      plane.add(model);
      ready = true;
    }).catch(() => { ready = false; });
    const cancel = () => { bridge.active = false; bridge.inside = false; root.visible = false; fade = 0; sampleCount = 0; sparkles.clear(); trailSparkles.clear(); };
    const unregister = registerSceneFlightHost({
      cancel,
      score: (x, y) => {
        const rect = gl.domElement.getBoundingClientRect();
        if (planeTimelinePreview.current?.canvas === gl.domElement && gl.domElement.isConnected && rect.width > 2 && rect.height > 2) return -1;
        if (!gl.domElement.isConnected || rect.width < 2 || rect.height < 2 || rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth || !gl.domElement.checkVisibility()) return Infinity;
        const dx = Math.max(rect.left - x, 0, x - rect.right);
        const dy = Math.max(rect.top - y, 0, y - rect.bottom);
        return Math.hypot(dx, dy) + (findSubject() ? 0 : 10000);
      },
      start: (x, y) => {
        if (!ready || !gl.domElement.isConnected || document.hidden) return false;
        readMapping();
        if (Math.abs(ax * by - ay * bx) < 100) return false;
        if (findSubject()) { bounds.getCenter(center); bounds.getSize(size); }
        else { camera.getWorldDirection(front); center.copy(camera.position).addScaledVector(front, 2); size.set(1, 1, 1); }
        radius = THREE.MathUtils.clamp(Math.max(size.x, size.y, size.z) * 0.64, 0.5, 1);
        camera.getWorldPosition(front); front.sub(center).normalize();
        right.set(1, 0, 0).applyQuaternion(camera.quaternion); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        const perspective = camera as THREE.PerspectiveCamera;
        planeScale = 30 * 2 * camera.position.distanceTo(center) * Math.tan(THREE.MathUtils.degToRad(perspective.fov || 18) / 2)
          / Math.max(1, Math.hypot(bx, by)) / 1.9;
        if (camera instanceof THREE.OrthographicCamera) planeScale = 30 * (camera.top - camera.bottom) / camera.zoom / Math.max(1, Math.hypot(bx, by)) / 1.9;
        plane.scale.setScalar(planeScale);
        screenToWorld(x, y, start); position.copy(start); previous.copy(start);
        // Aim at the browser's center, accounting for the canvas offset / rotated hero layout.
        const determinant = ax * by - ay * bx;
        const px = innerWidth * .5 - ox, py = innerHeight * .5 - oy;
        const aim = {
          x: THREE.MathUtils.clamp(2 * (px * by - py * bx) / determinant - 1, -.65, .65),
          y: THREE.MathUtils.clamp(1 - 2 * (py * ax - px * ay) / determinant, -.65, .65),
        };
        const editor = planeTimelinePreview.current?.canvas === gl.domElement ? planeTimelinePreview.current : null;
        flightPath = createPlaneFlightPath(start, center, camera, radius, getCursorSettings().daring, editor ? () => .62 : Math.random, editor ? { x: 0, y: 0 } : aim);
        if (editor) {
          flightPath.duration = editor.flightDuration * 1000;
          let minDistance = Infinity, closest = 0;
          for (let i = 1; i <= 200; i++) {
            flightPath.curve.getPointAt(i / 200, projected);
            const d = projected.distanceToSquared(camera.position);
            if (d < minDistance) { minDistance = d; closest = i / 200; }
          }
          editor.markers.camera = closest * editor.flightDuration;
          editor.markers.avatar = editor.flightDuration;
          for (let i = Math.ceil(closest * 200) + 1; i <= 200; i++) {
            flightPath.curve.getPointAt(i / 200, projected);
            if (projected.distanceTo(center) < radius * 1.35) { editor.markers.avatar = i / 200 * editor.flightDuration; break; }
          }
          lastEditorTime = -1; throwReleased = false;
        }
        sceneEntered = false; velocity.set(0, 0, 0);
        target.x = x; target.y = y;
        bridge.canvas = gl.domElement; bridge.nearAvatar = false;
        started = performance.now(); returningAt = 0; sampleCount = 0; lastSample = 0; fade = 1;
        root.visible = true; plane.visible = true; invalidate();
        return true;
      },
    });
    const beginReturn = (now: number) => {
      returningAt = now; from.copy(position);
      bridge.returning = true;
      screenToWorld(target.x, target.y, destination);
      returnMs = THREE.MathUtils.clamp(position.distanceTo(destination) / Math.max(velocity.length(), .5) * 1500, 1100, 2400);
      control.copy(position).addScaledVector(velocity, returnMs / 3000);
    };
    tick.current = (now, dt) => {
      const editor = planeTimelinePreview.current?.canvas === gl.domElement && flightPath ? planeTimelinePreview.current : null;
      if (editor) root.visible = true;
      if (!root.visible) return;
      invalidate();
      readMapping();
      const settings = getCursorSettings();
      if (bridge.active || editor) {
        // Follow parallax / orbit controls while preserving the world-space flight center.
        camera.getWorldPosition(front); front.sub(center).normalize();
        right.set(1, 0, 0).applyQuaternion(camera.quaternion); up.set(0, 1, 0).applyQuaternion(camera.quaternion);
        const editorTime = editor ? timelineTime(editor) : 0;
        const age = editor ? Math.min(editorTime, editor.flightDuration) * 1000 : now - started;
        bridge.orbitProgress = Math.min(1, age / flightPath.duration);
        cameraLocal.copy(position).applyMatrix4(camera.matrixWorldInverse);
        const safeReturn = cameraLocal.z < -Math.max(camera.near * 3, radius * .4);
        if (!editor && !returningAt && (age >= flightPath.duration || (!bridge.held && safeReturn))) beginReturn(now);
        previous.copy(position);
        if (returningAt) {
          const t = Math.min(1, (now - returningAt) / returnMs), u = 1 - t;
          screenToWorld(target.x, target.y, destination);
          control2.copy(destination);
          position.copy(from).multiplyScalar(u ** 3).addScaledVector(control, 3 * u * u * t)
            .addScaledVector(control2, 3 * u * t * t).addScaledVector(destination, t ** 3);
          if (t >= 1) { bridge.active = false; bridge.inside = false; bridge.orbitProgress = 1; plane.visible = false; }
        } else {
          flightPath.curve.getPointAt(Math.min(1, age / flightPath.duration), position);
        }
        if (editor) {
          if (editorTime < lastEditorTime || Math.abs(editorTime - lastEditorTime) > .25) { sampleCount = 0; sparkles.clear(); trailSparkles.clear(); throwReleased = false; catching = false; }
          lastEditorTime = editorTime;
          const grab = editor.cues.find(c => c.id === 'catch' && c.enabled);
          const launch = editor.cues.find(c => c.id === 'throw' && c.enabled);
          const releaseAt = launch ? launch.start + Math.max(0, launch.release - launch.trim) / launch.rate : Infinity;
          if (grab && editor.handValid && editorTime >= grab.start && editorTime < releaseAt) {
            if (!catching) { catchOrigin.copy(previous); catching = true; }
            const blend = THREE.MathUtils.smoothstep(editorTime - grab.start, 0, Math.min(.35, grab.duration));
            position.copy(catchOrigin).lerp(endpoint.set(editor.hand.x, editor.hand.y, editor.hand.z), blend);
            throwOrigin.copy(position); throwReleased = false;
          } else if (launch && editor.handValid && editorTime >= releaseAt) {
            if (!throwReleased || (!editor.playing && editor.releaseHandValid)) { const hand = editor.playing ? editor.hand : editor.releaseHandValid ? editor.releaseHand : editor.hand; throwOrigin.set(hand.x, hand.y, hand.z); throwReleased = true; }
            const t = THREE.MathUtils.clamp((editorTime - releaseAt) / 1.1, 0, 1);
            position.copy(throwOrigin).lerp(endpoint.copy(camera.position).addScaledVector(right, .12), t);
            position.addScaledVector(up, Math.sin(t * Math.PI) * .18);
          }
          editor.plane.x = position.x; editor.plane.y = position.y; editor.plane.z = position.z;
        }
        velocity.copy(position).sub(previous).divideScalar(Math.max(dt, .001));
        if (velocity.lengthSq() > .00001) {
          tangent.copy(velocity).normalize(); targetQuaternion.setFromUnitVectors(noseAxis, tangent);
          rollQuaternion.setFromAxisAngle(tangent, returningAt ? 0 : Math.sin((now - started) / 900) * .18);
          targetQuaternion.premultiply(rollQuaternion);
          plane.quaternion.rotateTowards(targetQuaternion, dt * (returningAt ? 1.3 : 3.5));
        }
        plane.position.copy(position);
        bridge.nearAvatar = position.distanceTo(center) < radius * 2.8;
        bridge.relativeHeight = (position.y - center.y) / radius;
        cameraLocal.copy(position).applyMatrix4(camera.matrixWorldInverse);
        const inFront = cameraLocal.z < -camera.near;
        if (inFront) {
          projected.copy(position).project(camera);
          const u = (projected.x + 1) / 2, v = (1 - projected.y) / 2;
          const inCanvas = u >= .02 && u <= .98 && v >= .02 && v <= .98;
          if (inCanvas) sceneEntered = true;
          bridge.x = ox + ax * u + bx * v; bridge.y = oy + ay * u + by * v;
          bridge.inside = bridge.active && (inCanvas || (sceneEntered && !returningAt));
          facing.copy(noseAxis).applyQuaternion(plane.quaternion);
          projected.copy(position).addScaledVector(facing, .02).project(camera);
          bridge.heading = Math.atan2(oy + ay * (projected.x + 1) / 2 + by * (1 - projected.y) / 2 - bridge.y,
            ox + ax * (projected.x + 1) / 2 + bx * (1 - projected.y) / 2 - bridge.x) * 180 / Math.PI + 135;
        } else {
          // Never mirror the behind-camera projection into a phantom DOM cursor.
          bridge.inside = bridge.active;
        }
        const launchCue = editor?.cues.find(c => c.id === 'throw' && c.enabled);
        const previewEnd = launchCue ? launchCue.start + Math.max(0, launchCue.release - launchCue.trim) / launchCue.rate + 1.1 : (editor?.flightDuration ?? 7) + .5;
        plane.visible = editor ? !editor.solo && editorTime < previewEnd : bridge.active && bridge.inside;
        if (editor) bridge.inside = false;
        if (now - lastSample >= settings.lifetime * 1000 / COUNT) {
          lastSample = now;
          history.copyWithin(6, 0, history.length - 6);
          for (let side = 0; side < 2; side++) {
            wing.set(1.72, 0, side ? .62 : -.62).multiplyScalar(planeScale).applyQuaternion(plane.quaternion).add(position);
            history[side * 3] = wing.x; history[side * 3 + 1] = wing.y; history[side * 3 + 2] = wing.z;
          }
          sampleCount = Math.min(COUNT, sampleCount + 1);
        }
      } else {
        fade = Math.max(0, fade - dt / settings.lifetime);
        if (fade === 0) { root.visible = false; return; }
      }
      sparkles.update(now, dt, position, bridge.active ? Math.min(1, .3 + velocity.length() / 4) * settings.sparkles : 0, planeScale * .95, camera);
      if (sampleCount > 8) {
        const sample = 4 + Math.floor((.5 + .5 * Math.sin(now * .0037)) * (sampleCount - 8));
        trailGlint.fromArray(history, sample * 6 + (Math.floor(now / 190) % 2) * 3);
        trailSparkles.update(now, dt, trailGlint, fade * settings.sparkles * settings.opacity * .75, planeScale * .8, camera);
      }
      trailMaterial.uniforms.opacity.value = fade * settings.opacity;
      trailMaterial.uniforms.colorA.value.set(settings.colorA);
      trailMaterial.uniforms.colorB.value.set(settings.colorB);
      trailMaterial.uniforms.colorC.value.set(settings.colorC);
      trailMaterial.uniforms.rainbow.value = settings.rainbow ? 1 : 0;
      for (let side = 0; side < 2; side++) for (let i = 0; i < COUNT; i++) {
        const sample = Math.min(i, Math.max(0, sampleCount - 1));
        endpoint.fromArray(history, sample * 6 + side * 3);
        const age = i / (COUNT - 1);
        older.fromArray(history, Math.min(sample + 1, Math.max(0, sampleCount - 1)) * 6 + side * 3);
        trailSide.copy(endpoint).sub(older).cross(front);
        if (trailSide.lengthSq() < .000001) trailSide.copy(right);
        else trailSide.normalize();
        endpoint.addScaledVector(up, age * age * .055);
        const width = settings.width * planeScale * (.25 + 1.2 * age);
        const index = (side * COUNT * 2 + i * 2) * 3;
        vertices[index] = endpoint.x - trailSide.x * width; vertices[index + 1] = endpoint.y - trailSide.y * width; vertices[index + 2] = endpoint.z - trailSide.z * width;
        vertices[index + 3] = endpoint.x + trailSide.x * width; vertices[index + 4] = endpoint.y + trailSide.y * width; vertices[index + 5] = endpoint.z + trailSide.z * width;
      }
      geometry.attributes.position.needsUpdate = true;
    };
    return () => {
      disposed = true; tick.current = () => {}; unregister(); scene.remove(root);
      markers.forEach(marker => marker.remove());
      if (model) disposeModel(model);
      sparkles.dispose(); trailSparkles.dispose(); metal.dispose(); env.dispose(); geometry.dispose(); trailMaterial.dispose();
    };
  }, [avatar, camera, gl, invalidate, reduced, scene]);
  return null;
});
