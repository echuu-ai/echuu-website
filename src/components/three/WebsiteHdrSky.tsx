import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { RGBELoader } from 'three-stdlib';
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js';
const LIVE_HDR_SKY_RADIUS = 50;
const LIVE_HDR_PROBE_CUBE_SIZE = 64;
type LiveHdrSettings = {
  rotationRad: number;
  environmentIntensity: number;
  backgroundIntensity: number;
  fogDensity: number;
};


function applyHdrTextureDefaults(texture: THREE.Texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  if ('colorSpace' in texture) {
    texture.colorSpace = THREE.LinearSRGBColorSpace;
  }
}

export function LiveRotatableHdrSky({
  url,
  hdrRotationYDeg,
  environmentIntensity,
  backgroundIntensity,
  fogDensity,
}: {
  url: string;
  hdrRotationYDeg: number;
  environmentIntensity: number;
  backgroundIntensity: number;
  fogDensity: number;
}) {
  const texture = useLoader(RGBELoader, url);
  const { gl, scene } = useThree();
  const pmremRef = useRef<PMREMGenerator | null>(null);
  const envTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const probeRef = useRef<THREE.LightProbe | null>(null);
  const fogRef = useRef<THREE.FogExp2 | null>(null);
  const skyRef = useRef<THREE.Mesh>(null);
  const settingsRef = useRef<LiveHdrSettings>({
    rotationRad: THREE.MathUtils.degToRad(hdrRotationYDeg),
    environmentIntensity,
    backgroundIntensity,
    fogDensity,
  });
  settingsRef.current = {
    rotationRad: THREE.MathUtils.degToRad(hdrRotationYDeg),
    environmentIntensity,
    backgroundIntensity,
    fogDensity,
  };

  useLayoutEffect(() => {
    applyHdrTextureDefaults(texture);
  }, [texture]);

  useLayoutEffect(() => {
    pmremRef.current = new PMREMGenerator(gl);
    pmremRef.current.compileEquirectangularShader();
    scene.background = null;

    // MToon 走 getLightProbeIrradiance，不认 scene.environment，所以角色的环境光
    // 必须靠球谐 LightProbe 注入；FogExp2 给角色和天空之间补一层空气透视。
    const probe = new THREE.LightProbe();
    probe.intensity = environmentIntensity;
    scene.add(probe);
    probeRef.current = probe;

    const fog = new THREE.FogExp2(0xffffff, fogDensity);
    fogRef.current = fog;
    scene.fog = fog;

    return () => {
      envTargetRef.current?.dispose();
      envTargetRef.current = null;
      pmremRef.current?.dispose();
      pmremRef.current = null;
      scene.environment = null;
      scene.remove(probe);
      probeRef.current = null;
      fogRef.current = null;
      scene.fog = null;
    };
    // 只在挂载/卸载时建立，强度和密度由下面的 effect 持续同步。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene]);

  const rebuildEnvironmentMap = useCallback((rotationRad: number, envIntensity: number) => {
    const pmrem = pmremRef.current;
    if (!pmrem) return;

    envTargetRef.current?.dispose();
    envTargetRef.current = null;

    const rotated = texture.clone();
    applyHdrTextureDefaults(rotated);
    rotated.rotation = rotationRad;
    rotated.center.set(0.5, 0.5);
    rotated.needsUpdate = true;

    envTargetRef.current = pmrem.fromEquirectangular(rotated);
    scene.environment = envTargetRef.current.texture;

    rotated.dispose();

    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if ('envMapIntensity' in material && material.envMapIntensity !== undefined) {
          material.envMapIntensity = envIntensity;
          material.needsUpdate = true;
        }
      }
    });
  }, [scene, texture]);

  const rebuildLightProbe = useCallback((rotationRad: number) => {
    // Cube render + GPU readback is the expensive half of HDR initialization.
    // Keep it out of the same frame as PMREM generation and live-room mounting.
    const probe = probeRef.current;
    if (probe) {
      const cubeTarget = new THREE.WebGLCubeRenderTarget(LIVE_HDR_PROBE_CUBE_SIZE, { type: THREE.HalfFloatType });
      const cubeCamera = new THREE.CubeCamera(0.1, LIVE_HDR_SKY_RADIUS * 2, cubeTarget);
      const probeScene = new THREE.Scene();
      const probeGeometry = new THREE.SphereGeometry(LIVE_HDR_SKY_RADIUS, 32, 16);
      const probeMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
      const probeSky = new THREE.Mesh(probeGeometry, probeMaterial);
      probeSky.rotation.y = rotationRad;
      probeScene.add(probeSky);
      cubeCamera.update(gl, probeScene);

      const generated = LightProbeGenerator.fromCubeRenderTarget(gl, cubeTarget);
      probe.sh.copy(generated.sh);

      // 球谐的直流项就是平均辐照，拿它当雾色，雾就自动跟着 HDR 的色调走。
      const dc = generated.sh.coefficients[0];
      const fog = fogRef.current;
      if (fog) {
        const peak = Math.max(dc.x, dc.y, dc.z, 1e-4);
        fog.color.setRGB(dc.x / peak, dc.y / peak, dc.z / peak);
      }

      probeGeometry.dispose();
      probeMaterial.dispose();
      cubeTarget.dispose();
    }
  }, [gl, scene, texture]);

  useEffect(() => {
    const { rotationRad, environmentIntensity: envIntensity } = settingsRef.current;
    let probeHandle: number | null = null;
    let probeUsesIdleCallback = false;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const timer = window.setTimeout(() => {
      rebuildEnvironmentMap(rotationRad, envIntensity);
      if (idleWindow.requestIdleCallback) {
        probeUsesIdleCallback = true;
        probeHandle = idleWindow.requestIdleCallback(() => rebuildLightProbe(rotationRad), { timeout: 600 });
      } else {
        probeHandle = window.setTimeout(() => rebuildLightProbe(rotationRad), 120);
      }
    }, 60);
    return () => {
      window.clearTimeout(timer);
      if (probeHandle === null) return;
      if (probeUsesIdleCallback) idleWindow.cancelIdleCallback?.(probeHandle);
      else window.clearTimeout(probeHandle);
    };
  }, [hdrRotationYDeg, environmentIntensity, rebuildEnvironmentMap, rebuildLightProbe]);

  useFrame(({ camera }) => {
    const { rotationRad, backgroundIntensity: bgIntensity, environmentIntensity: envIntensity, fogDensity: density } = settingsRef.current;
    if (skyRef.current) {
      skyRef.current.rotation.y = rotationRad;
      // 天空球跟着相机走，orbit 拉远也不会穿出去。
      skyRef.current.position.copy(camera.position);
    }
    const material = skyRef.current?.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.color.setScalar(bgIntensity);
    }
    if (probeRef.current) {
      probeRef.current.intensity = envIntensity;
    }
    if (fogRef.current) {
      fogRef.current.density = density;
    }
  });

  return (
    <mesh ref={skyRef} frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[LIVE_HDR_SKY_RADIUS, 64, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        toneMapped
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}
