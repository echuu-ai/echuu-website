import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import { WEBSITE_SKY_HDR } from '../../sky';

/**
 * 「礼物投掷」卡片里的 3D 礼物：直播间同一批礼物模型（public/website/gifts3d，gltf-transform 压到 512 贴图 + meshopt）。
 * 每个礼物轻轻上下浮动、慢慢转；背后各有一块偏左下的淡黄色剪影（设计稿里的贴纸底色）。
 * 只在卡片进入视口时由 FeatureSection 挂载（滚动带里会有两份卡片），出视口就卸载、换回静态图。
 */

const BASE = import.meta.env.BASE_URL;
const gift = (name: string) => `${BASE}website/gifts3d/${name}.glb`;

/**
 * 摆位与设计稿的静态拼图一致：饭团左上、信封右上、包子右、可颂压在下面。
 * tilt = 固定的 3/4 朝向（往镜头倾，让正面 / 顶面露出来，一眼看出是什么）；只在这个朝向附近轻轻左右摆，不整圈转（转到侧面就认不出来了）。
 */
const GIFTS = [
  { url: gift('white-pebble'), pos: [-0.62, 0.42, 0], size: 0.9, tilt: [0.55, -0.45, 0.12], sway: 0.28, phase: 0 },
  { url: gift('sealed-envelope'), pos: [0.5, 0.62, -0.2], size: 1.0, tilt: [1.05, 0.2, -0.32], sway: 0.18, phase: 1.3 },
  { url: gift('baozi'), pos: [0.62, -0.12, 0.1], size: 0.86, tilt: [0.75, 0.3, 0], sway: 0.3, phase: 2.1 },
  { url: gift('golden-croissant'), pos: [-0.2, -0.56, 0.3], size: 1.12, tilt: [0.62, 0.15, -0.18], sway: 0.22, phase: 3.4 },
] as const;
/** 食物要暖：材质压一点暖色、减少天空的冷色反射 */
const WARM_TINT = new THREE.Color('#ffe6cc');
/** 淡黄剪影：往左下错开、略放大，放在礼物后面 */
const SHADOW_OFFSET = new THREE.Vector3(-0.08, -0.07, -0.4);
const SHADOW_COLOR = '#fff3a6';

function Gift({ url, pos, size, tilt, sway, phase }: (typeof GIFTS)[number]) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const turnModel = useRef<THREE.Group>(null);
  const turnShadow = useRef<THREE.Group>(null);
  const { model, silhouette } = useMemo(() => {
    const model = scene.clone(true);
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = (mesh.material as THREE.MeshStandardMaterial).clone();
      material.color?.multiply(WARM_TINT);
      material.envMapIntensity = 0.45;
      mesh.material = material;
    });
    // 统一大小：包围盒最长边 = size，居中
    const box = new THREE.Box3().setFromObject(model);
    const dims = box.getSize(new THREE.Vector3());
    const scale = size / Math.max(dims.x, dims.y, dims.z, 1e-6);
    model.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-scale));
    model.scale.setScalar(scale);
    const flat = new THREE.MeshBasicMaterial({ color: SHADOW_COLOR, toneMapped: false });
    const silhouette = model.clone(true);
    silhouette.traverse((child) => { const mesh = child as THREE.Mesh; if (mesh.isMesh) mesh.material = flat; });
    return { model, silhouette };
  }, [scene, size]);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g || !turnModel.current || !turnShadow.current) return;
    const t = clock.elapsedTime + phase;
    // 外层只上下浮动；转动分别加在礼物和剪影自己身上，剪影的左下错位不跟着转
    g.position.set(pos[0], pos[1] + Math.sin(t * 1.1) * 0.05, pos[2]);
    turnModel.current.rotation.set(tilt[0] + Math.sin(t * 0.7) * 0.06, tilt[1] + Math.sin(t * 0.5) * sway, tilt[2] + Math.sin(t * 0.9) * 0.05);
    turnShadow.current.rotation.copy(turnModel.current.rotation);
  });
  return (
    <group ref={group}>
      <group position={SHADOW_OFFSET} scale={1.08}><group ref={turnShadow}><primitive object={silhouette} /></group></group>
      <group ref={turnModel}><primitive object={model} /></group>
    </group>
  );
}

/** active=false：卡片在视口外，停掉渲染循环（画布保留最后一帧，回到视口不用重建） */
export default function Gifts3D({ active = true }: { active?: boolean }) {
  return (
    <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ fov: 30, position: [0, 0, 4.2] }}>
      <Suspense fallback={null}>
        <Environment files={`${BASE}${WEBSITE_SKY_HDR}`} />
        {GIFTS.map((g) => <Gift key={g.url} {...g} />)}
      </Suspense>
      {/* 暖色主光 + 暖色天光：食物看起来是热的、好吃的 */}
      <hemisphereLight args={['#fff1dc', '#f2b98a', 0.9]} />
      <directionalLight position={[2, 3, 4]} intensity={1.6} color="#ffd6a3" />
    </Canvas>
  );
}
