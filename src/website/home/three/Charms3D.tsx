import { Suspense, memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { publicUrl } from '../../../lib/publicUrl';

/**
 * 首页两处 3D 饰物（模型由 Tripo 图生 3D 生成，见 docs/dependency-assets.json）：
 *   - BroochStage：Echuu 别针。别针固定，三个吊坠挂在程序生成的链环上做带阻尼的双轴摆锤，
 *     鼠标划过吊坠、页面滚动、别针跟随鼠标倾斜都会把吊坠「拨」起来。
 *   - KeysStage：心形双钥匙。滚动驱动：两侧旋转飞入 → 合成一颗心并闪光 → 向两侧打开，露出标题。
 * 两处都只在可见时渲染；首帧画出来之前与降级时，页面上仍显示原图。
 */

const MODEL = (name: string) => publicUrl(`/website/models/charms/${name}.glb`);
const MODELS = ['pin', 'angel', 'brain', 'clapper', 'key_left', 'key_right'] as const;
type ModelName = (typeof MODELS)[number];

/** Tripo 导出的模型正面朝 +X、上方 +Y；转成正面朝镜头（+Z）。大脑是平躺生成的，先立起来 */
const FACE_CAMERA = new THREE.Euler(0, -Math.PI / 2, 0);
const BRAIN_UPRIGHT = new THREE.Euler(0, 0, -Math.PI / 2);

/** 别针本体最需要亮银的观感，反射给得最足 */
const ENV_INTENSITY: Partial<Record<ModelName, number>> = { pin: 2.6 };
/** Tripo 给别针烘的底色偏深灰；金属的反射颜色就是底色，整体乘亮成银色 */
const BASE_TINT: Partial<Record<ModelName, string>> = { pin: '#f2f5fa' };

function useModel(name: ModelName) {
  const gltf = useGLTF(MODEL(name), false, true);
  const env = ENV_INTENSITY[name] ?? 1.7;
  const tint = BASE_TINT[name];
  return useMemo(() => {
    const root = gltf.scene.clone(true);
    if (name === 'brain') {
      const upright = new THREE.Group();
      upright.rotation.copy(BRAIN_UPRIGHT);
      upright.add(root);
      const outer = new THREE.Group();
      outer.rotation.copy(FACE_CAMERA);
      outer.add(upright);
      return withShadows(outer, env);
    }
    const outer = new THREE.Group();
    outer.rotation.copy(FACE_CAMERA);
    outer.add(root);
    if (tint) {
      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = (mesh.material as THREE.MeshStandardMaterial).clone();
        material.map = null;
        material.color.set(tint);
        material.metalness = 1;
        mesh.material = material;
      });
    }
    return withShadows(outer, env);
  }, [gltf, name, env, tint]);
}

/** 打开投影；调亮环境反射（RoomEnvironment 有暗角，高光泽金属会映出发黑的面），镜面金属留一点粗糙度 */
function withShadows(object: THREE.Object3D, envIntensity = 1.7) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (material?.isMeshStandardMaterial) {
      material.envMapIntensity = envIntensity;
      if (material.metalness > 0.5) material.roughness = Math.max(material.roughness, 0.2);
    }
  });
  return object;
}

/** 用 RoomEnvironment 做反射环境，不额外下载 HDR */
function RoomEnv() {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => { scene.environment = null; env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
}

/** 只在可见时跑渲染循环 */
function useInView(ref: RefObject<HTMLElement>, margin = '120px') {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: margin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, margin]);
  return inView;
}

/** 首帧真正画出来后通知外层隐藏原图 */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onReady);
  });
  return null;
}

/** 页面滚动速度（px/s），平滑过 */
function useScrollVelocity() {
  const state = useRef({ last: window.scrollY, velocity: 0 });
  useFrame((_, delta) => {
    const s = state.current;
    const y = window.scrollY;
    const instant = (y - s.last) / Math.max(delta, 1 / 120);
    s.last = y;
    s.velocity += (THREE.MathUtils.clamp(instant, -4000, 4000) - s.velocity) * 0.25;
  });
  return state;
}

/** 窗口指针（画布像素坐标 + 速度） */
function useCanvasPointer() {
  const { gl } = useThree();
  const pointer = useRef({ x: -1e4, y: -1e4, vx: 0, vy: 0, nx: 0, ny: 0, t: 0 });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const p = pointer.current;
      const rect = gl.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const now = performance.now();
      const dt = Math.max(8, now - p.t) / 1000;
      p.vx = (x - p.x) / dt;
      p.vy = (y - p.y) / dt;
      p.x = x; p.y = y; p.t = now;
      p.nx = THREE.MathUtils.clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
      p.ny = THREE.MathUtils.clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [gl]);
  return pointer;
}

// --- 别针 -------------------------------------------------------------------------

/** 挂点（别针局部坐标，按原图像素位置换算）、链长、吊坠缩放、吊坠半高、摆动刚度 */
/** depth：前后错开，有厚度的吊坠摆起来不会互相穿插 */
const CHARMS: Array<{ name: ModelName; hook: [number, number]; chain: number; scale: number; half: number; stiffness: number; depth: number }> = [
  { name: 'angel', hook: [-0.6, -0.597], chain: 0.15, scale: 0.72, half: 0.36, stiffness: 15, depth: 0.16 },
  { name: 'brain', hook: [-0.011, -0.416], chain: 0.37, scale: 0.466, half: 0.224, stiffness: 11, depth: -0.04 },
  { name: 'clapper', hook: [0.5, -0.363], chain: 0.21, scale: 0.53, half: 0.197, stiffness: 13, depth: 0.04 },
];
const PIN_SCALE = 1.608;
/** 整体包围盒（y 从 0.626 到 -1.6）居中 */
const BROOCH_OFFSET_Y = 0.487;

const chainMaterial = new THREE.MeshStandardMaterial({ color: '#e6eaf0', metalness: 1, roughness: 0.22 });
const chainLinkGeometry = new THREE.TorusGeometry(0.02, 0.0055, 8, 18);

function Chain({ length }: { length: number }) {
  const links = Math.max(2, Math.round(length / 0.034));
  const step = length / links;
  return (
    <group>
      {Array.from({ length: links }, (_, i) => (
        <mesh
          key={i}
          geometry={chainLinkGeometry}
          material={chainMaterial}
          position={[0, -(i + 0.5) * step, 0]}
          rotation={[0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2]}
          scale={[1, 1.35, 1]}
          castShadow
        />
      ))}
    </group>
  );
}

type Swing = { theta: number; omega: number; phi: number; nu: number };

const Charm = memo(function Charm({ spec, swing }: { spec: (typeof CHARMS)[number]; swing: Swing }) {
  const model = useModel(spec.name);
  const pivot = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = pivot.current;
    if (!g) return;
    g.rotation.z = swing.theta;
    g.rotation.x = swing.phi;
  });
  return (
    <group ref={pivot} position={[spec.hook[0], spec.hook[1], spec.depth]}>
      <Chain length={spec.chain} />
      <group position={[0, -spec.chain - spec.half, 0]} scale={spec.scale}>
        <primitive object={model} />
      </group>
    </group>
  );
});

function Brooch() {
  const pin = useModel('pin');
  const tilt = useRef<THREE.Group>(null);
  const swings = useMemo<Swing[]>(() => CHARMS.map(() => ({ theta: 0, omega: 0, phi: 0, nu: 0 })), []);
  const scroll = useScrollVelocity();
  const pointer = useCanvasPointer();
  const { camera, size } = useThree();
  const state = useRef({ rx: 0, ry: 0, wx: 0, wy: 0, time: 0 });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const s = state.current;
    s.time += dt;
    const p = pointer.current;

    // 别针整体跟随鼠标微倾，带一点呼吸；倾斜的角速度传给吊坠（惯性）
    const targetRy = p.nx * 0.22 + Math.sin(s.time * 0.6) * 0.04;
    const targetRx = p.ny * 0.12 + Math.sin(s.time * 0.8 + 1) * 0.02;
    const prevRx = s.rx;
    const prevRy = s.ry;
    s.rx += (targetRx - s.rx) * Math.min(1, dt * 3);
    s.ry += (targetRy - s.ry) * Math.min(1, dt * 3);
    s.wx = (s.rx - prevRx) / dt;
    s.wy = (s.ry - prevRy) / dt;
    if (tilt.current) {
      tilt.current.rotation.x = s.rx;
      tilt.current.rotation.y = s.ry;
    }

    const scrollPush = scroll.current.velocity * 0.0016;
    CHARMS.forEach((spec, i) => {
      const w = swings[i];
      // 鼠标划过吊坠：按划动速度拨一下
      tmp.set(spec.hook[0], spec.hook[1] - spec.chain - spec.half, 0);
      tmp.y += BROOCH_OFFSET_Y;
      tmp.applyEuler(new THREE.Euler(s.rx, s.ry, 0)).project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * size.width;
      const sy = (1 - (tmp.y * 0.5 + 0.5)) * size.height;
      const radius = spec.half * 2 * (size.height / 2.6) * 0.75;
      let fTheta = -s.wy * 1.2;
      let fPhi = s.wx * 1.2 + scrollPush;
      if (Math.hypot(p.x - sx, p.y - sy) < radius && performance.now() - p.t < 80) {
        fTheta += THREE.MathUtils.clamp(p.vx, -2500, 2500) * 0.012;
        fPhi += THREE.MathUtils.clamp(p.vy, -2500, 2500) * 0.006;
      }
      // 微风：吊坠永远有一点点晃
      fTheta += Math.sin(s.time * (0.9 + i * 0.23) + i) * 0.08;
      const damping = 1.5;
      w.omega += (-spec.stiffness * Math.sin(w.theta) - damping * w.omega + fTheta) * dt;
      w.nu += (-spec.stiffness * Math.sin(w.phi) - damping * w.nu + fPhi) * dt;
      w.theta = THREE.MathUtils.clamp(w.theta + w.omega * dt, -0.9, 0.9);
      w.phi = THREE.MathUtils.clamp(w.phi + w.nu * dt, -0.7, 0.7);
    });
  });

  return (
    <group ref={tilt}>
      <group position={[0, BROOCH_OFFSET_Y, 0]}>
        <group scale={PIN_SCALE}>
          <primitive object={pin} />
        </group>
        {CHARMS.map((spec, i) => (
          <Charm key={spec.name} spec={spec} swing={swings[i]} />
        ))}
      </group>
    </group>
  );
}

function ShadowCatcher({ color, z }: { color: string; z: number }) {
  return (
    <mesh position={[0, 0, z]} receiveShadow>
      <planeGeometry args={[8, 8]} />
      <shadowMaterial color={color} opacity={0.32} transparent />
    </mesh>
  );
}

function KeyLight({ position }: { position: [number, number, number] }) {
  return (
    <directionalLight
      position={position}
      intensity={1.5}
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-camera-left={-2.5}
      shadow-camera-right={2.5}
      shadow-camera-top={2.5}
      shadow-camera-bottom={-2.5}
      shadow-radius={6}
      shadow-bias={-0.0004}
    />
  );
}

export function BroochStage({ onReady }: { onReady: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host);
  return (
    <div ref={host} className="hv-charm-stage hv-charm-stage--brooch" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        shadows
        frameloop={inView ? 'always' : 'never'}
        camera={{ fov: 30, position: [0, 0, 5.4], near: 0.1, far: 20 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <RoomEnv />
        <ambientLight intensity={0.25} />
        <KeyLight position={[1.8, 2.6, 3.2]} />
        <Suspense fallback={null}>
          <Brooch />
          <ReadySignal onReady={onReady} />
        </Suspense>
        <ShadowCatcher color="#7fb6d6" z={-0.32} />
      </Canvas>
    </div>
  );
}

// --- 钥匙 -------------------------------------------------------------------------

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const segment = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** 四芒星闪光贴图（画布生成） */
function useStarTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(220,240,255,0.55)');
    grad.addColorStop(1, 'rgba(220,240,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    g.globalCompositeOperation = 'lighter';
    for (const [w, h] of [[256, 10], [10, 256]]) {
      const ray = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      ray.addColorStop(0, 'rgba(255,255,255,0.95)');
      ray.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = ray;
      g.fillRect(128 - w / 2, 128 - h / 2, w, h);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Keys({ sectionRef, onReveal }: { sectionRef: RefObject<HTMLElement>; onReveal: (amount: number) => void }) {
  const left = useModel('key_left');
  const right = useModel('key_right');
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);
  const star = useRef<THREE.Sprite>(null);
  const starTexture = useStarTexture();
  const pointer = useCanvasPointer();
  const { size, camera } = useThree();
  const state = useRef({ time: 0, lastReveal: -1, flash: 0, joined: false });
  const emissives = useMemo(() => {
    const list: THREE.MeshStandardMaterial[] = [];
    for (const root of [left, right]) {
      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          const material = (mesh.material as THREE.MeshStandardMaterial).clone();
          material.emissive = new THREE.Color('#dff3ff');
          material.emissiveIntensity = 0;
          mesh.material = material;
          list.push(material);
        }
      });
    }
    return list;
  }, [left, right]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const s = state.current;
    s.time += dt;
    const section = sectionRef.current;
    if (!section || !leftRef.current || !rightRef.current) return;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // 区块顶边从视口底进入到走过 1.1 屏：0 → 1
    const p = clamp01((vh - rect.top) / (vh * 1.1));
    const fly = easeOutCubic(segment(p, 0.0, 0.42));
    const open = easeInOutCubic(segment(p, 0.55, 0.85));

    // 画布像素 → 世界单位（透视相机，在 z=0 平面上）
    const persp = camera as THREE.PerspectiveCamera;
    const worldH = 2 * persp.position.z * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2));
    const pxToWorld = worldH / size.height;
    const keyScale = (size.height * 0.7) * pxToWorld; // 钥匙高 ≈ 画布高 70%
    const joinedY = worldH / 2 - keyScale / 2 - 0.04 * worldH;
    const openX = Math.min(size.width * 0.2, 340) * pxToWorld;
    const halfW = 0.085 * keyScale;

    const idle = Math.sin(s.time * 0.7) * 0.18 * (1 - open * 0.6) + pointer.current.nx * 0.25;
    for (const [ref, side] of [[leftRef, -1], [rightRef, 1]] as const) {
      const g = ref.current!;
      g.scale.setScalar(keyScale);
      // ① 飞入：从两侧外、前方旋转着进来
      const flyX = side * (1 - fly) * worldH * 0.9;
      const flyZ = (1 - fly) * 1.4;
      const spin = side * (1 - fly) * Math.PI * 2.2;
      // ③ 打开：向两侧平移并外倾
      const openShift = side * open * openX;
      g.position.set(side * halfW + flyX + openShift, joinedY + (1 - fly) * 0.35 - open * 0.08 * worldH, flyZ);
      g.rotation.set((1 - fly) * 0.6, spin + idle, side * (1 - fly) * 0.9 + side * open * THREE.MathUtils.degToRad(7));
    }

    // ② 合拢的一瞬：闪光 + 金属泛白
    const joinedNow = fly > 0.985 && open < 0.02;
    if (joinedNow && !s.joined) s.flash = 1;
    s.joined = joinedNow;
    s.flash = Math.max(0, s.flash - dt * 1.6);
    for (const m of emissives) m.emissiveIntensity = s.flash * 0.9;
    if (star.current) {
      const k = s.flash;
      star.current.position.set(0, joinedY + keyScale * 0.32, 0.25);
      star.current.scale.setScalar(keyScale * (0.2 + (1 - k) * 0.9) * (k > 0 ? 1 : 0));
      (star.current.material as THREE.SpriteMaterial).opacity = k;
    }

    // 标题跟着打开浮现
    const reveal = Math.round(open * 100) / 100;
    if (reveal !== s.lastReveal) { s.lastReveal = reveal; onReveal(reveal); }
  });

  return (
    <>
      <group ref={leftRef}><primitive object={left} /></group>
      <group ref={rightRef}><primitive object={right} /></group>
      <sprite ref={star}>
        <spriteMaterial map={starTexture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  );
}

export function KeysStage({ sectionRef, onReady, onReveal }: { sectionRef: RefObject<HTMLElement>; onReady: () => void; onReveal: (amount: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host, '200px');
  return (
    <div ref={host} className="hv-charm-stage hv-charm-stage--keys" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        shadows
        frameloop={inView ? 'always' : 'never'}
        camera={{ fov: 26, position: [0, 0, 6], near: 0.1, far: 30 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <RoomEnv />
        <ambientLight intensity={0.3} />
        <KeyLight position={[2.5, 3.5, 4]} />
        <Suspense fallback={null}>
          <Keys sectionRef={sectionRef} onReveal={onReveal} />
          <ReadySignal onReady={onReady} />
        </Suspense>
        <ShadowCatcher color="#0b4f86" z={-0.6} />
      </Canvas>
    </div>
  );
}

/** 进入视口前预取模型，避免首帧等待 */
export function preloadCharmModels() {
  for (const name of MODELS) useGLTF.preload(MODEL(name), false, true);
}
