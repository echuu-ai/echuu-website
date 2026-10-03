import * as THREE from 'three';

/**
 * 角色出场（按 igloo.inc 冰屋出场的源码结构移植）：
 *
 *   ① 线稿：模型自身的线框（igloo 是 igloo_outline.drc 的 LineSegments），加色混合、带 sin(x/y/z) 呼吸闪烁，
 *      从头到脚浮现，2 秒后淡出。这里用共享骨骼的 wireframe 蒙皮网格，跟着动作一起动。
 *   ② 笼子：四周一圈随机直线（igloo_cage.drc），从中心向外按 length(centroid) 冲击波式出现，
 *      每段线随机闪烁，2.1 秒后淡出。
 *   ③ 主体：igloo 的 falloffsmooth 前沿从头扫到脚，前沿以下 discard，
 *      前沿带 `+= 蓝 + 三角纹理 × 13` 的白热发光（配合 bloom）。1.1 秒才开始。
 *
 * 前沿用绑定姿态坐标（几何体 position.y）而不是世界坐标，角色躺着时也沿身体从头扫到脚。
 * 所有材质共用一组 uniform，每帧只改数值。
 */

export type IntroMaterializeUniforms = {
  uIntroProgress: THREE.IUniform<number>;
  uIntroTop: THREE.IUniform<number>;
  uIntroBottom: THREE.IUniform<number>;
  uIntroTime: THREE.IUniform<number>;
  uWireProgress: THREE.IUniform<number>;
  uWireAlpha: THREE.IUniform<number>;
  uCageProgress: THREE.IUniform<number>;
  uCageAlpha: THREE.IUniform<number>;
  /** 开场手机窗（绘制缓冲像素坐标 x0, y0, x1, y1）；uHoleOn = 1 时窗外的出场效果全部裁掉 */
  uHoleRect: THREE.IUniform<THREE.Vector4>;
  uHoleOn: THREE.IUniform<number>;
  /** 悬停结霜（mouseFrost.ts）：屏幕空间缓冲，R = 结霜程度，G = 扩散前沿；uFrostOn = 0 时不采样 */
  uFrostTex: THREE.IUniform<THREE.Texture | null>;
  uFrostOn: THREE.IUniform<number>;
  uFrostResolution: THREE.IUniform<THREE.Vector2>;
};

/** igloo 前沿带宽约为模型高度的 35%（1.5 / 4.35），换算到 1.7m 的角色 */
const BAND = 0.55;
/** igloo 线稿的带宽（2.0 / 3.4） */
const WIRE_BAND = 0.9;
/** 笼子尺寸与冲击波（igloo：半径 20、带宽 5，场景约 4 单位高；按比例缩到角色） */
const CAGE_RADIUS = 3.2;
const CAGE_MARGIN = 0.8;

export function createIntroMaterializeUniforms(): IntroMaterializeUniforms {
  return {
    uIntroProgress: { value: 1 },
    uIntroTop: { value: 1.7 },
    uIntroBottom: { value: 0 },
    uIntroTime: { value: 0 },
    uWireProgress: { value: 1 },
    uWireAlpha: { value: 0 },
    uCageProgress: { value: 1 },
    uCageAlpha: { value: 0 },
    uHoleRect: { value: new THREE.Vector4(0, 0, 1e6, 1e6) },
    uHoleOn: { value: 0 },
    uFrostTex: { value: null },
    uFrostOn: { value: 0 },
    uFrostResolution: { value: new THREE.Vector2(1, 1) },
  };
}

// --- 时间线（秒，相对出场起点），照 igloo 的 introTL ---------------------------

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const sineInOut = (t: number) => -0.5 * (Math.cos(Math.PI * t) - 1);
const power2InOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const power3InOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const power4InOut = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

/** 整段出场结束的时间：之后线稿与笼子隐藏、主体恢复原样 */
export const INTRO_TOTAL_SECONDS = 5.2;

/**
 * quiet：官网「画翅膀唤醒」开场用——不要线框和笼子，只让主体从铅笔稿里显形（0.3 s 起 1.5 s 扫完），
 * 前沿的白热光就像铅笔线被点亮。
 */
export function applyIntroTimeline(u: IntroMaterializeUniforms, seconds: number, quiet = false) {
  const s = Math.max(0, seconds);
  if (quiet) {
    u.uWireProgress.value = 1;
    u.uWireAlpha.value = 0;
    u.uCageProgress.value = 1;
    u.uCageAlpha.value = 0;
    u.uIntroProgress.value = s >= INTRO_TOTAL_SECONDS ? 1 : power3InOut(clamp01((s - 0.3) / 1.5));
    return;
  }
  // ① 线稿：0s 起 2.5s power3.inOut 浮现；2s 起 3s 淡出
  u.uWireProgress.value = power3InOut(clamp01(s / 2.5));
  u.uWireAlpha.value = 1 - power4InOut(clamp01((s - 2) / 3));
  // ② 笼子：0s 起 4s sine.inOut 扩散；0.1s 内亮到 0.4，2.1s 起 3s 淡出
  u.uCageProgress.value = sineInOut(clamp01(s / 4));
  u.uCageAlpha.value = s < 0.1 ? 0.4 * (s / 0.1) : 0.4 * (1 - power2InOut(clamp01((s - 2.1) / 3)));
  // ③ 主体：1.1s 起 2.25s 扫完
  u.uIntroProgress.value = s >= INTRO_TOTAL_SECONDS ? 1 : power3InOut(clamp01((s - 1.1) / 2.25));
}

// --- ③ 主体材质补丁 ------------------------------------------------------------

const HOLE_GLSL = /* glsl */ `
uniform vec4 uHoleRect;
uniform float uHoleOn;
bool introOutsideHole() {
  return uHoleOn > 0.5 && (gl_FragCoord.x < uHoleRect.x || gl_FragCoord.y < uHoleRect.y || gl_FragCoord.x > uHoleRect.z || gl_FragCoord.y > uHoleRect.w);
}
`;

const BODY_VERTEX_DECL = /* glsl */ `
varying vec3 vIntroObj;
`;

const BODY_FRAGMENT_DECL = /* glsl */ `
varying vec3 vIntroObj;
uniform float uIntroProgress;
uniform float uIntroTop;
uniform float uIntroBottom;
uniform sampler2D uFrostTex;
uniform float uFrostOn;
uniform vec2 uFrostResolution;
${HOLE_GLSL}
// igloo 用 triangles_tiling 贴图；这里程序生成三角网格线（0° / 60° / 120° 三组），fwidth 抗锯齿
float introTriangles(vec2 p) {
  vec3 v = vec3(p.y, dot(p, vec2(0.8660254, 0.5)), dot(p, vec2(-0.8660254, 0.5)));
  vec3 d = abs(fract(v) - 0.5);
  vec3 w = fwidth(v) * 1.2;
  vec3 lines = smoothstep(0.5 - w, vec3(0.5), d);
  return max(lines.x, max(lines.y, lines.z));
}
`;

const BODY_FRAGMENT_APPLY = /* glsl */ `
  if (uIntroProgress < 1.0 && !introOutsideHole()) {
    // igloo: introEmissive = 1.0 - falloffsmooth(vPos.y, top, bottom, band, progress)
    float introFront = mix(uIntroTop + ${BAND.toFixed(3)}, uIntroBottom - 0.1, uIntroProgress);
    float introEmissive = 1.0 - smoothstep(introFront - ${BAND.toFixed(3)}, introFront, vIntroObj.y);
    if (introEmissive > 0.9999) discard;
    float introTri = introTriangles(vec2(vIntroObj.x + vIntroObj.z, vIntroObj.y) * 22.0);
    introEmissive += clamp(introEmissive * introTri * 13.0, 0.0, 1.0);
    col += introEmissive * vec3(0.5, 0.7, 1.0);
  }
  // 悬停结霜（igloo：emissive += rim * frostColor；igloo 另有前沿三角网，这里按设计去掉，只留冰色与发光前沿）
  if (uFrostOn > 0.5) {
    vec2 frostData = texture2D(uFrostTex, gl_FragCoord.xy / uFrostResolution).rg;
    float frost = frostData.r;
    float frostRim = max(frostData.g, 0.0);
    vec3 frostColor = vec3(0.62, 0.86, 1.0);
    // 克制一点：冰色只轻轻罩一层，前沿发光减弱
    col = mix(col, col * 0.88 + frostColor * 0.14, frost * 0.4);
    col += frostColor * frostRim * 5.0;
  }
`;

type PatchableMaterial = THREE.Material & {
  userData: {
    introOriginalCompile?: THREE.Material['onBeforeCompile'];
    introOriginalKey?: THREE.Material['customProgramCacheKey'];
  };
};

/**
 * 给角色的所有 MToon 材质接上主体物化。保留材质原有的 onBeforeCompile（MToon 靠它注入 defines）；
 * 找不到注入点的材质原样保留。
 * 原始 hook 记在材质 userData 上：再次调用（dev 热更新、模型缓存复用）时从原始 hook 重新包，
 * 不会把声明重复注入而导致着色器编译失败。
 */
export function patchIntroMaterialize(root: THREE.Object3D, uniforms: IntroMaterializeUniforms) {
  const seen = new Set<THREE.Material>();
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.introWire) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of materials) {
      if (seen.has(raw)) continue;
      seen.add(raw);
      const material = raw as PatchableMaterial;
      material.userData.introOriginalCompile ??= material.onBeforeCompile;
      material.userData.introOriginalKey ??= material.customProgramCacheKey;
      const originalCompile = material.userData.introOriginalCompile;
      const originalKey = material.userData.introOriginalKey;
      material.onBeforeCompile = (shader, renderer) => {
        originalCompile.call(material, shader, renderer);
        const fragmentTarget = '  gl_FragColor = vec4( col, diffuseColor.a );\n  postCorrection();\n}';
        if (!shader.fragmentShader.includes(fragmentTarget) || !shader.vertexShader.includes('#include <begin_vertex>')) return;
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = BODY_VERTEX_DECL + shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n  vIntroObj = position;',
        );
        shader.fragmentShader = BODY_FRAGMENT_DECL + shader.fragmentShader.replace(
          fragmentTarget,
          `${BODY_FRAGMENT_APPLY}\n${fragmentTarget}`,
        );
      };
      material.customProgramCacheKey = () => `${originalKey.call(material)}|introMaterialize`;
      material.needsUpdate = true;
    }
  });
}

/** 绑定姿态（几何体对象空间）的身高范围 */
export function measureBindHeight(root: THREE.Object3D): { top: number; bottom: number } {
  let top = -Infinity;
  let bottom = Infinity;
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || mesh.userData.introWire) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    if (!box) return;
    top = Math.max(top, box.max.y);
    bottom = Math.min(bottom, box.min.y);
  });
  return Number.isFinite(top) && Number.isFinite(bottom) ? { top, bottom } : { top: 1.7, bottom: 0 };
}

// --- ① 线稿：共享骨骼的 wireframe 蒙皮网格 -------------------------------------

function createWireMaterial(uniforms: IntroMaterializeUniforms) {
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#a7b2d6'),
    wireframe: true,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vWireObj;\nvarying vec3 vWireWorld;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vWireObj = position;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vWireWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = `varying vec3 vWireObj;\nvarying vec3 vWireWorld;\nuniform float uIntroTop;\nuniform float uIntroBottom;\nuniform float uIntroTime;\nuniform float uWireProgress;\nuniform float uWireAlpha;\n${HOLE_GLSL}\n${shader.fragmentShader}`
      .replace('#include <dithering_fragment>', /* glsl */ `#include <dithering_fragment>
    // igloo: idleAnimation = sin(y*6+t*5) * cos(z*6+t*5) * sin(x*6+t*5)，再 *0.8+0.2
    float wireIdle = (sin(vWireWorld.y * 6.0 + uIntroTime * 5.0) * 0.5 + 0.5)
      * (cos(vWireWorld.z * 6.0 + uIntroTime * 5.0) * 0.5 + 0.5)
      * (sin(vWireWorld.x * 6.0 + uIntroTime * 5.0) * 0.5 + 0.5);
    wireIdle = wireIdle * 0.8 + 0.2;
    // igloo: alpha *= falloffsmooth(y, top, bottom, band, progress)
    float wireFront = mix(uIntroTop + ${WIRE_BAND.toFixed(3)}, uIntroBottom, uWireProgress);
    float wireShow = smoothstep(wireFront - ${WIRE_BAND.toFixed(3)}, wireFront, vWireObj.y);
    gl_FragColor.a *= uWireAlpha * wireIdle * wireShow * (introOutsideHole() ? 0.0 : 1.0);`);
  };
  material.customProgramCacheKey = () => 'introWire';
  return material;
}

/** 为每个网格建一份共享骨骼与表情的线框副本 */
export function attachIntroWire(root: THREE.Object3D, uniforms: IntroMaterializeUniforms) {
  const material = createWireMaterial(uniforms);
  const wires: THREE.Mesh[] = [];
  const sources: THREE.Mesh[] = [];
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && !mesh.userData.introWire) sources.push(mesh);
  });
  for (const mesh of sources) {
    const skinned = mesh as THREE.SkinnedMesh;
    let wire: THREE.Mesh;
    if (skinned.isSkinnedMesh) {
      const skinnedWire = new THREE.SkinnedMesh(mesh.geometry, material);
      skinnedWire.bind(skinned.skeleton, skinned.bindMatrix);
      wire = skinnedWire;
    } else {
      wire = new THREE.Mesh(mesh.geometry, material);
    }
    // 共用表情权重数组：线框跟着眨眼、口型一起变
    wire.morphTargetInfluences = mesh.morphTargetInfluences;
    wire.morphTargetDictionary = mesh.morphTargetDictionary;
    wire.position.copy(mesh.position);
    wire.quaternion.copy(mesh.quaternion);
    wire.scale.copy(mesh.scale);
    wire.frustumCulled = false;
    wire.renderOrder = 999;
    wire.userData.introWire = true;
    wire.visible = false;
    mesh.parent?.add(wire);
    wires.push(wire);
  }
  return {
    setVisible(visible: boolean) {
      for (const wire of wires) wire.visible = visible;
    },
    dispose() {
      for (const wire of wires) wire.removeFromParent();
      material.dispose();
    },
  };
}

// --- ② 笼子：四周随机直线，按中心距离冲击波式出现 --------------------------------

export function createIntroCage(uniforms: IntroMaterializeUniforms): THREE.LineSegments {
  let seed = 9173;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const step = 0.45;
  const half = 7;
  const positions: number[] = [];
  const centroids: number[] = [];
  const flicker: number[] = [];
  // 晶格点之间随机连线（轴向 + 对角），点位轻微抖动：接近 igloo 笼子的乱线感
  const dirs = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, -1, 0], [1, 1, 1]];
  const jitter = () => (rand() - 0.5) * step * 0.35;
  for (let x = -half; x <= half; x++) {
    for (let y = -4; y <= 5; y++) {
      for (let z = -half; z <= half; z++) {
        if (rand() > 0.16) continue;
        const a = [x * step + jitter(), y * step + jitter(), z * step + jitter()];
        if (Math.hypot(a[0], a[1], a[2]) > CAGE_RADIUS) continue;
        const d = dirs[Math.floor(rand() * dirs.length)];
        const len = 1 + Math.floor(rand() * 2);
        const b = [a[0] + d[0] * step * len + jitter(), a[1] + d[1] * step * len + jitter(), a[2] + d[2] * step * len + jitter()];
        const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        const r = rand();
        positions.push(...a, ...b);
        centroids.push(...c, ...c);
        flicker.push(r, r);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('centr', new THREE.Float32BufferAttribute(centroids, 3));
  geometry.setAttribute('flicker', new THREE.Float32BufferAttribute(flicker, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uColor: { value: new THREE.Color('#a7b2d6') } },
    vertexShader: /* glsl */ `
      attribute vec3 centr;
      attribute float flicker;
      varying vec3 vCentr;
      varying float vFlicker;
      void main() {
        vCentr = centr;
        vFlicker = flicker;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntroTime;
      uniform float uCageProgress;
      uniform float uCageAlpha;
      varying vec3 vCentr;
      varying float vFlicker;
      ${HOLE_GLSL}
      void main() {
        if (introOutsideHole()) discard;
        // igloo: intro_shockwave = falloff(length(centroid), 0.0, 20.0, 5.0, uProgress)
        float p = mix(-${CAGE_MARGIN.toFixed(2)}, ${CAGE_RADIUS.toFixed(2)}, uCageProgress);
        float shockwave = clamp((p + ${CAGE_MARGIN.toFixed(2)} - length(vCentr)) / ${CAGE_MARGIN.toFixed(2)}, 0.0, 1.0);
        // igloo: idleAnimation = sin(vColor.r * 13.0 + time * 6.0) * 0.5 + 0.5
        float idle = sin(vFlicker * 13.0 + uIntroTime * 6.0) * 0.5 + 0.5;
        gl_FragColor = vec4(uColor, uCageAlpha * shockwave * idle);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    // 同 igloo：不做深度测试，线框笼子永远浮在最前；开场时靠 uHoleRect 裁在手机窗里
    depthTest: false,
    depthWrite: false,
  });
  const cage = new THREE.LineSegments(geometry, material);
  cage.frustumCulled = false;
  cage.renderOrder = 1000;
  cage.visible = false;
  return cage;
}
