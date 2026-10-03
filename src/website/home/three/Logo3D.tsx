import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { WEBSITE_SKY_HDR } from '../../sky';

/**
 * 首屏 logo 的 3D 试验版（?logo=3d 打开）：纯图 logo 描成矢量轮廓（public/website/logo3d/logo-shapes.json），
 * 挤出成带倒角的实体；正面和侧面都贴原图颜色（logo-texture.png，颜色向外扩过一圈，倒角不出黑边），
 * 全金属 + 清漆，反射官网天空 HDR。慢慢摆动，鼠标轻微带动倾角；减少动态效果时静止。
 */

type ShapeData = { width: number; height: number; shapes: Array<{ outer: number[][]; holes: number[][][] }> };

const BASE = import.meta.env.BASE_URL;
const SHAPES_URL = `${BASE}website/logo3d/logo-shapes.json`;
const TEXTURE_URL = `${BASE}website/logo3d/logo-texture.png`;
/** 挤出深度与倒角（单位：原图像素） */
const DEPTH = 34;
const BEVEL = { thickness: 7, size: 3.2, segments: 4 };

function buildGeometry(data: ShapeData) {
  const { width: w, height: h } = data;
  const toVec = ([x, y]: number[]) => new THREE.Vector2(x - w / 2, h / 2 - y);
  const shapes = data.shapes.map((s) => {
    const shape = new THREE.Shape(s.outer.map(toVec));
    shape.holes = s.holes.map((hole) => new THREE.Path(hole.map(toVec)));
    return shape;
  });
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL.thickness, bevelSize: BEVEL.size, bevelSegments: BEVEL.segments, curveSegments: 4,
  });
  geometry.translate(0, 0, -DEPTH / 2);
  // UV 按正面投影：正面与侧面都取原图对应位置的颜色
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w;
    uv[i * 2 + 1] = (pos.getY(i) + h / 2) / h;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  const s = 2 / h;
  geometry.scale(s, s, s);
  return geometry;
}

function LogoMesh({ reduced }: { reduced: boolean }) {
  const [data, setData] = useState<ShapeData | null>(null);
  const texture = useLoader(THREE.TextureLoader, TEXTURE_URL);
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    let alive = true;
    fetch(SHAPES_URL).then((r) => r.json()).then((d) => { if (alive) setData(d); }).catch(() => {});
    const onMove = (e: PointerEvent) => { pointer.current.x = e.clientX / window.innerWidth - 0.5; pointer.current.y = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { alive = false; window.removeEventListener('pointermove', onMove); };
  }, []);
  const geometry = useMemo(() => (data ? buildGeometry(data) : null), [data]);
  const material = useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return new THREE.MeshPhysicalMaterial({
      // color 压暗原图颜色：亮天空反射下仍是原 logo 的深浅蓝，而不是一片发白
      map: texture, color: new THREE.Color('#6f9fe8'), metalness: 1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.15,
    });
  }, [texture]);
  useEffect(() => () => { geometry?.dispose(); }, [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const targetY = reduced ? -0.22 : Math.sin(t * 0.45) * 0.38 + pointer.current.x * 0.35;
    const targetX = reduced ? 0.08 : Math.sin(t * 0.31) * 0.08 + pointer.current.y * 0.2;
    const k = 1 - Math.exp(-delta * 4);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
  });
  if (!geometry) return null;
  return (
    <group ref={group}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}

export default function Logo3D({ label }: { label: string }) {
  const [reduced] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  return (
    <div className="hv-title__logo hv-title__logo--3d" role="img" aria-label={label}>
      <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} camera={{ fov: 26, position: [0, 0, 5.7] }}>
        <Suspense fallback={null}>
          <Environment files={`${BASE}${WEBSITE_SKY_HDR}`} />
          <LogoMesh reduced={reduced} />
        </Suspense>
        <directionalLight position={[2, 3, 4]} intensity={0.6} />
      </Canvas>
    </div>
  );
}
