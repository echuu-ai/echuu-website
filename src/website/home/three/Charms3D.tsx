import { Suspense, memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { AppColorGradeLutPass } from '../../../components/ColorGradeLutPass';
import { cursorDepth, registerCursorProxyHost } from '../../../lib/cursorDepth';
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
// 中性偏暖的银：之前的 #f2f5fa 偏蓝，再叠上全站调色会更蓝
const BASE_TINT: Partial<Record<ModelName, string>> = { pin: '#f7f3ee' };

/**
 * 小天使：动漫风格（参照首屏角色的 MToon）。两段明暗（暗面只压一点点）、冷色边缘光、细描边。
 * 卡通材质不吃环境贴图，用自发光把整体亮度托回来。
 */
const TOON_GRADIENT = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([224, 224, 224, 255, 255, 255, 255, 255]), 2, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

function toonify(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => { if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh); });
  for (const mesh of meshes) {
    const source = mesh.material as THREE.MeshStandardMaterial;
    const toon = new THREE.MeshToonMaterial({
      map: source.map,
      gradientMap: TOON_GRADIENT,
      emissive: new THREE.Color('#ffffff'),
      emissiveMap: source.map,
      emissiveIntensity: 0.55,
    });
    toon.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        gl_FragColor.rgb += rim * vec3(0.72, 0.88, 1.0) * 0.4;`);
    };
    mesh.material = toon;
    // 反面外扩的描边壳
    const outline = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: '#8b95ad', side: THREE.BackSide }));
    (outline.material as THREE.MeshBasicMaterial).onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normalize(normal) * 0.0045;');
    };
    outline.castShadow = false;
    mesh.add(outline);
  }
}

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
    if (name === 'angel') toonify(root);
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
// --- 闪光点：在模型表面随机取点挂四芒星，跟着模型一起动，轮流闪 ---------------------------

const glintMaterialCache = new WeakMap<THREE.Texture, THREE.SpriteMaterial>();

/** 在 object 的网格顶点里随机取 count 个点，挂上四芒星精灵；返回每帧调用的更新函数 */
function attachGlints(object: THREE.Object3D, texture: THREE.Texture, count: number, size: number, seed: number) {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const meshes: THREE.Mesh[] = [];
  object.traverse((child) => { if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh); });
  if (!meshes.length) return () => {};
  let base = glintMaterialCache.get(texture);
  if (!base) {
    base = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: new THREE.Color('#fff6e8') });
    glintMaterialCache.set(texture, base);
  }
  object.updateMatrixWorld(true);
  const sprites: Array<{ sprite: THREE.Sprite; phase: number; speed: number }> = [];
  const local = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const mesh = meshes[Math.floor(rand() * meshes.length)];
    const position = mesh.geometry.getAttribute('position');
    local.fromBufferAttribute(position, Math.floor(rand() * position.count));
    const sprite = new THREE.Sprite(base.clone());
    sprite.position.copy(local);
    sprite.renderOrder = 20;
    // 精灵挂在网格下，网格自身的缩放会把尺寸一起缩掉，这里按网格世界缩放反算
    const scale = new THREE.Vector3();
    mesh.getWorldScale(scale);
    sprite.userData.size = size / Math.max(scale.x, 1e-4);
    sprite.scale.setScalar(0);
    mesh.add(sprite);
    sprites.push({ sprite, phase: rand() * Math.PI * 2, speed: 0.6 + rand() * 0.9 });
  }
  return (time: number, boost = 0) => {
    for (const g of sprites) {
      // sin^12：大部分时间暗着，偶尔一闪
      const wave = Math.max(0, Math.sin(time * g.speed + g.phase));
      const k = Math.min(1, wave ** 12 + boost);
      g.sprite.scale.setScalar(g.sprite.userData.size * (0.35 + k * 0.85));
      (g.sprite.material as THREE.SpriteMaterial).opacity = k;
      g.sprite.material.rotation = time * 0.4 + g.phase;
    }
  };
}

function useGlints(object: THREE.Object3D, count: number, size: number, seed: number) {
  const texture = useStarTexture();
  const update = useMemo(() => attachGlints(object, texture, count, size, seed), [object, texture, count, size, seed]);
  return update;
}

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

/**
 * 弹簧摆：吊坠是挂在弹簧末端的质点（别针平面内的 x、y 偏移），另有一个出平面的摆角 phi。
 * dragging 时有一个强弹簧把它拉向鼠标；松手后靠重力、弹簧与阻尼回弹。
 */
type Swing = { x: number; y: number; vx: number; vy: number; phi: number; nu: number; tx: number; ty: number; dragging: boolean };

const Charm = memo(function Charm({ spec, swing, index }: { spec: (typeof CHARMS)[number]; swing: Swing; index: number }) {
  const model = useModel(spec.name);
  const pivot = useRef<THREE.Group>(null);
  const twinkle = useGlints(model, 4, 0.26, 11 + index * 7);
  const chain = useRef<THREE.Group>(null);
  const charm = useRef<THREE.Group>(null);
  const rest = spec.chain + spec.half;
  useFrame(({ clock }) => {
    // 晃得越厉害闪得越多
    twinkle(clock.elapsedTime, Math.min(0.6, Math.hypot(swing.vx, swing.vy) * 0.35 + Math.abs(swing.nu) * 0.2));
    const g = pivot.current;
    if (!g || !chain.current || !charm.current) return;
    const length = Math.hypot(swing.x, swing.y);
    g.rotation.z = Math.atan2(swing.x, -swing.y);
    g.rotation.x = swing.phi;
    // 链子跟着伸缩：链长 = 总长 - 吊坠半高
    chain.current.scale.y = Math.max(0.4, (length - spec.half) / spec.chain);
    charm.current.position.y = -length;
  });
  return (
    <group ref={pivot} position={[spec.hook[0], spec.hook[1], spec.depth]}>
      <group ref={chain}><Chain length={spec.chain} /></group>
      <group ref={charm} position={[0, -rest, 0]}>
        <group
          position={[0, 0, 0]}
          scale={spec.scale}
          onPointerDown={(event) => {
            event.stopPropagation();
            (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
            swing.dragging = true;
            document.documentElement.classList.add('hv-charm-dragging');
          }}
        >
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
});

function Brooch() {
  const pin = useModel('pin');
  const pinTwinkle = useGlints(pin, 7, 0.17, 3);
  const tilt = useRef<THREE.Group>(null);
  const swings = useMemo<Swing[]>(() => CHARMS.map((spec) => ({ x: 0, y: -(spec.chain + spec.half), vx: 0, vy: 0, phi: 0, nu: 0, tx: 0, ty: 0, dragging: false })), []);
  const inner = useRef<THREE.Group>(null);
  const ray = useMemo(() => ({ caster: new THREE.Raycaster(), plane: new THREE.Plane(), ndc: new THREE.Vector2(), hit: new THREE.Vector3(), normal: new THREE.Vector3(), point: new THREE.Vector3() }), []);
  // 松手：任何地方抬起都算
  useEffect(() => {
    const release = () => {
      swings.forEach((w) => { w.dragging = false; });
      document.documentElement.classList.remove('hv-charm-dragging');
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      release();
    };
  }, [swings]);
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
    pinTwinkle(s.time);

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
    const group = inner.current;
    const anyDragging = swings.some((w) => w.dragging);
    if (anyDragging && group) {
      // 鼠标射线与别针平面求交，换成别针局部坐标
      ray.ndc.set((p.x / size.width) * 2 - 1, -(p.y / size.height) * 2 + 1);
      ray.caster.setFromCamera(ray.ndc, camera);
      group.updateMatrixWorld();
      ray.normal.set(0, 0, 1).transformDirection(group.matrixWorld);
      ray.point.setFromMatrixPosition(group.matrixWorld);
      ray.plane.setFromNormalAndCoplanarPoint(ray.normal, ray.point);
      if (ray.caster.ray.intersectPlane(ray.plane, ray.hit)) group.worldToLocal(ray.hit);
    }
    // 子步积分：拖拽时弹簧很硬，单步会不稳
    const steps = 3;
    const h = dt / steps;
    CHARMS.forEach((spec, i) => {
      const w = swings[i];
      const rest = spec.chain + spec.half;
      // 鼠标快速划过吊坠：按划动速度拨一下
      tmp.set(spec.hook[0] + w.x, spec.hook[1] + w.y + BROOCH_OFFSET_Y, 0).applyEuler(new THREE.Euler(s.rx, s.ry, 0)).project(camera);
      const sx = (tmp.x * 0.5 + 0.5) * size.width;
      const sy = (1 - (tmp.y * 0.5 + 0.5)) * size.height;
      const radius = spec.half * 2 * (size.height / 2.6) * 0.75;
      // 别针倾斜的惯性 + 微风
      let kickX = (-s.wy * 0.6 + Math.sin(s.time * (0.9 + i * 0.23) + i) * 0.04) * dt;
      let kickY = 0;
      let fPhi = s.wx * 1.2 + scrollPush;
      if (!w.dragging && Math.hypot(p.x - sx, p.y - sy) < radius && performance.now() - p.t < 80) {
        // 拨动是一次性的速度冲量（单位/秒），划得快也只是轻轻一荡
        kickX += THREE.MathUtils.clamp(p.vx, -2500, 2500) * 0.0006;
        kickY -= THREE.MathUtils.clamp(p.vy, -2500, 2500) * 0.0003;
        fPhi += THREE.MathUtils.clamp(p.vy, -2500, 2500) * 0.006;
      }
      if (w.dragging) {
        w.tx = ray.hit.x - spec.hook[0];
        w.ty = ray.hit.y - spec.hook[1];
        // 最多拉到原长的 2.4 倍
        const len = Math.hypot(w.tx, w.ty);
        const max = rest * 2.4;
        if (len > max) { w.tx *= max / len; w.ty *= max / len; }
      }
      for (let n = 0; n < steps; n++) {
        const len = Math.max(1e-4, Math.hypot(w.x, w.y));
        // 弹簧：沿链方向，越拉越紧。自然长度扣掉重力下垂，静止时刚好是原长
        const k = spec.stiffness * 2.2;
        const gravity = 9.8 * 0.35;
        const stretch = len - (rest - gravity / k);
        let ax = (-k * stretch * w.x) / len;
        let ay = (-k * stretch * w.y) / len - gravity;
        if (w.dragging) {
          ax += (w.tx - w.x) * 140;
          ay += (w.ty - w.y) * 140;
        }
        const damping = w.dragging ? 14 : 1.4;
        w.vx += (ax - damping * w.vx) * h + kickX;
        w.vy += (ay - damping * w.vy) * h + kickY;
        w.x += w.vx * h;
        w.y += w.vy * h;
        kickX = 0; kickY = 0;
      }
      w.nu += (-spec.stiffness * Math.sin(w.phi) - 1.5 * w.nu + fPhi) * dt;
      w.phi = THREE.MathUtils.clamp(w.phi + w.nu * dt, -0.7, 0.7);
    });
  });

  return (
    <group ref={tilt}>
      <group ref={inner} position={[0, BROOCH_OFFSET_Y, 0]}>
        <group scale={PIN_SCALE}>
          <primitive object={pin} />
        </group>
        {CHARMS.map((spec, i) => (
          <Charm key={spec.name} spec={spec} swing={swings[i]} index={i} />
        ))}
      </group>
    </group>
  );
}

function ShadowCatcher({ color, z }: { color: string; z: number }) {
  return (
    <mesh position={[0, 0, z]} receiveShadow>
      <planeGeometry args={[8, 8]} />
      <shadowMaterial color={color} opacity={0.3} transparent />
    </mesh>
  );
}

function KeyLight({ position }: { position: [number, number, number] }) {
  return (
    <directionalLight
      position={position}
      color="#fff0dc"
      intensity={1.6}
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
        camera={{ fov: 30, position: [0, 0, 4.7], near: 0.1, far: 20 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <RoomEnv />
        <ambientLight intensity={0.25} />
        <KeyLight position={[1.8, 2.6, 3.2]} />
        <Suspense fallback={null}>
          <Brooch />
          <ReadySignal onReady={onReady} />
          <CursorProxy depth={-0.28} />
        </Suspense>
        {/* 蓝色阴影；别针在浅色底上不加 Bloom（高反射金属会整块泛白），闪光点本身是叠加发光 */}
        <ShadowCatcher color="#6f9fd0" z={-0.32} />
        <Sparkle bloom={false} />
      </Canvas>
    </div>
  );
}

/** 金属高光与闪光点泛出辉光。透明画布按预乘 alpha 合成，辉光会以叠加光透到页面上 */
/**
 * 后期：与首屏主场景同一条调色链（线性色调映射 + 全站 LUT 调色），饰物和角色色调一致；
 * bloom 为 false 时只调色（别针在浅色卡片上加辉光会整块泛白）。
 */
function Sparkle({ bloom = true, threshold = 0.72, intensity = 0.9 }: { bloom?: boolean; threshold?: number; intensity?: number }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <>
        {bloom ? <Bloom mipmapBlur intensity={intensity} luminanceThreshold={threshold} luminanceSmoothing={0.12} radius={0.55} /> : null}
        <ToneMapping mode={ToneMappingMode.LINEAR} />
        <AppColorGradeLutPass forceWebGl includeTone />
      </>
    </EffectComposer>
  );
}

// --- 光标代理：纸飞机进入画布时，由场景里的这架飞机接管，和模型共用深度 -----------------

const CURSOR_MODEL = publicUrl('assets/cursor/crystal-arrow.glb');
/** 光标飞机在屏幕上的尺寸（与 paper-plane-cursor-renderer 的 28px 一致） */
const CURSOR_PX = 28;

/** depth = 飞机所在的 z（场景坐标），放在模型后面，模型按真实轮廓挡住它 */
function CursorProxy({ depth }: { depth: number }) {
  const { gl, camera, size } = useThree();
  const gltf = useGLTF(CURSOR_MODEL);
  const holder = useRef<THREE.Group>(null);
  const plane = useMemo(() => {
    // 与 2D 光标同样的展示角度：先绕 X 0.34π、再绕 Z -π/4；机头落在 pivot 原点
    const model = gltf.scene.clone(true);
    const material = new THREE.MeshStandardMaterial({ color: '#eef2f7', metalness: 1, roughness: 0.18, envMapIntensity: 1.8 });
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry = mesh.geometry.clone();
      mesh.geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI * 0.34));
      mesh.geometry.applyMatrix4(new THREE.Matrix4().makeRotationZ(-Math.PI / 4));
      mesh.material = material;
      mesh.castShadow = false;
    });
    const bounds = new THREE.Box3().setFromObject(model);
    const extent = bounds.getSize(new THREE.Vector3());
    const unit = 1 / Math.max(extent.x, extent.y);
    const nose = new THREE.Vector3(-0.95, 0.11, 0)
      .applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI * 0.34)
      .applyAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 4);
    model.position.copy(nose).multiplyScalar(-unit);
    model.scale.setScalar(unit);
    const pivot = new THREE.Group();
    pivot.add(model);
    return pivot;
  }, [gltf]);
  useEffect(() => registerCursorProxyHost(gl.domElement), [gl]);
  const tmp = useMemo(() => ({ ray: new THREE.Raycaster(), ndc: new THREE.Vector2(), plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), -depth), hit: new THREE.Vector3() }), [depth]);
  useFrame(() => {
    const g = holder.current;
    if (!g) return;
    const active = cursorDepth.proxyHost === gl.domElement;
    g.visible = active;
    if (!active) return;
    const rect = gl.domElement.getBoundingClientRect();
    tmp.ndc.set(((cursorDepth.x - rect.left) / rect.width) * 2 - 1, -((cursorDepth.y - rect.top) / rect.height) * 2 + 1);
    tmp.ray.setFromCamera(tmp.ndc, camera);
    if (!tmp.ray.ray.intersectPlane(tmp.plane, tmp.hit)) return;
    g.position.copy(tmp.hit);
    const persp = camera as THREE.PerspectiveCamera;
    const distance = persp.position.z - depth;
    const worldPerPx = (2 * distance * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2))) / size.height;
    g.scale.setScalar(CURSOR_PX * worldPerPx);
    g.rotation.set(0, 0, -cursorDepth.heading * Math.PI / 180);
  });
  return <group ref={holder} visible={false}><primitive object={plane} /></group>;
}

// --- 钥匙 -------------------------------------------------------------------------

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const segment = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

/** 四芒星闪光贴图（画布生成） */
function useStarTexture() {
  return useMemo(() => {
    // 纯十字光：只留极小的核心，没有圆形光晕（缩小时不会变成圆斑）
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    g.globalCompositeOperation = 'lighter';
    g.filter = 'blur(1.5px)';
    const core = g.createRadialGradient(128, 128, 0, 128, 128, 14);
    core.addColorStop(0, 'rgba(255,255,255,0.9)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = core;
    g.fillRect(100, 100, 56, 56);
    // 两道光芒：中间亮、两端细尖并渐隐
    for (const vertical of [false, true]) {
      const ray = vertical ? g.createLinearGradient(128, 0, 128, 256) : g.createLinearGradient(0, 128, 256, 128);
      ray.addColorStop(0, 'rgba(255,255,255,0)');
      ray.addColorStop(0.5, 'rgba(255,255,255,1)');
      ray.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = ray;
      g.beginPath();
      if (vertical) { g.moveTo(128, 0); g.lineTo(132, 128); g.lineTo(128, 256); g.lineTo(124, 128); }
      else { g.moveTo(0, 128); g.lineTo(128, 132); g.lineTo(256, 128); g.lineTo(128, 124); }
      g.closePath();
      g.fill();
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
  const leftTwinkle = useGlints(left, 6, 0.09, 5);
  const rightTwinkle = useGlints(right, 6, 0.09, 9);
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
    const keyScale = (size.height * 0.74) * pxToWorld; // 钥匙高 ≈ 画布高 74%
    const joinedY = worldH / 2 - keyScale / 2 - 0.04 * worldH;
    // 打开后两把钥匙分在标题两侧
    const openX = Math.min(size.width * 0.29, 470) * pxToWorld;
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
    leftTwinkle(s.time, s.flash);
    rightTwinkle(s.time + 1.3, s.flash);
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
          <CursorProxy depth={-0.4} />
        </Suspense>
        <ShadowCatcher color="#2f6aa8" z={-0.6} />
        <Sparkle />
      </Canvas>
    </div>
  );
}

/** 进入视口前预取模型，避免首帧等待 */
export function preloadCharmModels() {
  for (const name of MODELS) useGLTF.preload(MODEL(name), false, true);
}
