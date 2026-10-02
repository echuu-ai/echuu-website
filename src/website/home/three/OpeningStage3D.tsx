import { FingertipGlint } from './FingertipGlint';
import { debutEnvelope } from '../debutHighlight';
import { SkyEdgeEffect } from './SkyEdgeEffect';
import { INTRO_TOTAL_SECONDS, applyIntroTimeline, attachIntroWire, createIntroCage, createIntroMaterializeUniforms, measureBindHeight, patchIntroMaterialize } from './introMaterialize';
import { Suspense, memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import { VRMLoaderPlugin, VRMUtils, type VRM, type VRMHumanBoneName } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FlightCanvas } from '../../../components/three/FlightCanvas';
import { AppColorGradeLutPass } from '../../../components/ColorGradeLutPass';
import { LiveRotatableHdrSky } from '../../../components/three/WebsiteHdrSky';
import { loadVrmLookSettings } from '../../../components/vrm-rig/VrmLookPanel';
import type { SceneEffectMode } from '../../../components/lab/domain/sceneLayer';
import { computeAvatarNormalization } from '../../../components/lab/viewport/avatarNormalization';
import { DEFAULT_LIVE_AVATAR_RIG, DEFAULT_LIVE_VRM_LOOK, LIVE_VRM_LOOK_STORAGE_KEY, liveBloom } from '../../../data/liveStagePresets';
import { bakeMotionForVrm, loadMotion, type LoadedMotion } from '../../../lib/retarget/motionLoader';
import { solveTwoBoneIk } from '../../../lib/reaction/twoBoneIk';
import { FACE_CHANNELS } from '../../../lib/scene-expression';
import { defaultSceneLighting, type SceneLighting } from '../../../lib/scene-lighting';
import { parseProject, type SceneCamera, type SceneProject } from '../../../lib/scene-editor';
import { publicUrl } from '../../../lib/publicUrl';
import { HOME_OPENING_MODEL, HOME_OPENING_MOTIONS } from '../../assets';
import { WEBSITE_SKY_HDR } from '../../sky';
import heroSceneJson from '../heroScene.json';
import { createReachPose } from './reachPose';
import {
  OPENING,
  OPENING_MOTION,
  OPENING_TOTAL,
  openingTime,
  reachWeight,
  smoothstep,
  startOpeningClock,
  windowOpenProgress,
  type OpeningClock,
} from '../openingTimeline';

import { MOTION_KEYS, motionTime, motionWeight, portraitPullback, type MotionKey } from '../openingMotion';

/**
 * 首屏定格镜头来自 Cory 在 /scene-editor-lab 导出的场景文件（heroScene.json）：
 * 相机、景深、表情权重、注视、灯光、HDR 强度与雾都按该文件还原，不在代码里另猜数值。
 */
const HERO_SCENE: SceneProject = import.meta.env.DEV
  ? parseProject(JSON.stringify(heroSceneJson))
  : (heroSceneJson as unknown as SceneProject);
const HERO_ACTOR = HERO_SCENE.actors[0];
const HERO_LIGHTING: SceneLighting = HERO_SCENE.lighting ?? defaultSceneLighting();
const HERO_CAMERA: SceneCamera = HERO_SCENE.camera;

/** HDR 天空绕 Y 轴：直播间基准 232° + 场景文件的 skyRotation（DEV 可用 ?opsky=<度> 覆盖） */
const SKY_ROTATION_DEG = import.meta.env.DEV && new URLSearchParams(window.location.search).has('opsky')
  ? Number(new URLSearchParams(window.location.search).get('opsky'))
  : (DEFAULT_LIVE_AVATAR_RIG.hdrRotationY ?? 232) + HERO_SCENE.skyRotation;

/** DOM 手机窗在视口里的位置（px）；3D 黑场按它开洞，打开时跟着一起放大 */
export type HoleRect = { x: number; y: number; w: number; h: number; open: boolean };

type Anchor = VRMHumanBoneName | 'origin' | 'world';

type DofState = Pick<SceneCamera, 'dofEnabled' | 'focusMode' | 'focusDistance' | 'focusRange' | 'blur' | 'target'>;

type CameraKey = {
  t: number;
  anchor: Anchor;
  pos: [number, number, number];
  look: Anchor;
  lookOff: [number, number, number];
  fov: number;
  near?: number;
  shift?: number;
  dof?: DofState;
};

const NO_DOF: DofState = { dofEnabled: false, focusMode: 'target', focusDistance: 4, focusRange: 0.3, blur: 1.4, target: [0, 1, 0] };
const HERO_DOF: DofState = {
  dofEnabled: HERO_CAMERA.dofEnabled ?? false,
  focusMode: HERO_CAMERA.focusMode ?? 'target',
  focusDistance: HERO_CAMERA.focusDistance ?? 4,
  focusRange: HERO_CAMERA.focusRange ?? 0.3,
  blur: HERO_CAMERA.blur ?? 1.4,
  target: HERO_CAMERA.target,
};

/**
 * 相机关键帧。开场分镜相对骨骼世界位置给出（躺下 / 站起构图都跟着角色）；
 * 定格镜头用 `world` 锚点直接取场景文件里的绝对坐标。
 */
const CAMERA_KEYS: CameraKey[] = [
  // 01 黑场手机窗：窗口只露出画布中央 47%×29%，所以镜头要拉得很远、视角收窄
  { t: 0, anchor: 'hips', pos: [5.2, 2.0, 4.6], look: 'hips', lookOff: [0, 0.05, 0], fov: 22 },
  { t: OPENING.sleepEnd, anchor: 'hips', pos: [4.6, 1.9, 5.2], look: 'hips', lookOff: [0, 0.05, 0], fov: 22 },
  // 推向头部
  { t: OPENING.sleepEnd + 1.6, anchor: 'head', pos: [0.9, 0.9, 1.1], look: 'head', lookOff: [0, 0.1, 0], fov: 30 },
  // 02 第一人称仰望天空
  { t: OPENING.lieEnd, anchor: 'head', pos: [0, 0.1, 0.05], look: 'head', lookOff: [0.14, 1.2, 0.34], fov: 74, near: 0.24 },
  { t: OPENING.povEnd, anchor: 'head', pos: [0, 0.1, 0.05], look: 'head', lookOff: [0.14, 1.2, 0.34], fov: 74, near: 0.24 },
  // 03 白闪后冲进窗口对面的世界：镜头退到角色后上方，环绕
  { t: OPENING.povEnd + 1.3, anchor: 'hips', pos: [-0.5, 1.3, -2.3], look: 'chest', lookOff: [0, 0.1, 0], fov: 40 },
  { t: OPENING_MOTION.introEndStart, anchor: 'hips', pos: [1.9, 1.0, -1.1], look: 'head', lookOff: [0, -0.05, 0], fov: 34 },
  // 04 定格：场景文件里的相机（含景深）
  { t: OPENING_MOTION.lockStart + 0.9, anchor: 'world', pos: HERO_CAMERA.position, look: 'world', lookOff: HERO_CAMERA.target, fov: HERO_CAMERA.fov, dof: HERO_DOF },
  { t: OPENING_TOTAL, anchor: 'world', pos: HERO_CAMERA.position, look: 'world', lookOff: HERO_CAMERA.target, fov: HERO_CAMERA.fov, dof: HERO_DOF },
];

const LOCK_CLIP = HERO_ACTOR?.clips.find((clip) => clip.motionId.includes('spot-target-locked'));

/** 场景文件里的表情 / 注视只在定格阶段生效，开场分镜跟随动作本身 */
const heroActorActive = (t: number) => t >= OPENING_MOTION.lockStart;

function effectModeAt(t: number): SceneEffectMode {
  if (t < OPENING.lieEnd - 0.35) return 'silhouette-black';
  if (t < OPENING.povEnd) return 'silhouette-white';
  return 'none';
}

/** 定格后的眨眼：约每 2.8–5 秒一次，闭 0.08 s、开 0.14 s */
function blinkWeight(now: number): number {
  const period = 3.9;
  const phase = (now / 1000) % period;
  const jitter = 0.6 * Math.sin(now / 7000);
  const start = 2.8 + jitter;
  if (phase < start) return 0;
  const x = phase - start;
  if (x < 0.08) return x / 0.08;
  if (x < 0.22) return 1 - (x - 0.08) / 0.14;
  return 0;
}

type ColorMaterial = THREE.Material & {
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  shadeColorFactor?: THREE.Color;
  matcapFactor?: THREE.Color;
  parametricRimColorFactor?: THREE.Color;
  outlineColorFactor?: THREE.Color;
};
const SILHOUETTE_COLOR_KEYS = ['color', 'emissive', 'shadeColorFactor', 'matcapFactor', 'parametricRimColorFactor', 'outlineColorFactor'] as const;

/**
 * 剪影：直接把 MToon 的各色因子压成纯黑 / 纯白，而不是换成 MeshBasicMaterial。
 * 这样贴图的 alpha 裁切（翅膀、发丝）仍然生效，不会变成一整块黑色四边形。
 */
function applySilhouette(root: THREE.Object3D, mode: SceneEffectMode): () => void {
  const saved: Array<{ material: ColorMaterial; colors: Partial<Record<(typeof SILHOUETTE_COLOR_KEYS)[number], THREE.Color>>; emissiveIntensity?: number }> = [];
  const target = new THREE.Color(mode === 'silhouette-white' ? '#ffffff' : '#000000');
  const seen = new Set<THREE.Material>();
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials as ColorMaterial[]) {
      if (seen.has(material)) continue;
      seen.add(material);
      const entry: (typeof saved)[number] = { material, colors: {}, emissiveIntensity: material.emissiveIntensity };
      for (const key of SILHOUETTE_COLOR_KEYS) {
        const value = material[key];
        if (value instanceof THREE.Color) {
          entry.colors[key] = value.clone();
          value.copy(target);
        }
      }
      if (typeof material.emissiveIntensity === 'number') material.emissiveIntensity = mode === 'silhouette-white' ? 4 : 0;
      saved.push(entry);
    }
  });
  return () => {
    for (const { material, colors, emissiveIntensity } of saved) {
      for (const key of SILHOUETTE_COLOR_KEYS) {
        const original = colors[key];
        const current = material[key];
        if (original && current instanceof THREE.Color) current.copy(original);
      }
      if (typeof emissiveIntensity === 'number') material.emissiveIntensity = emissiveIntensity;
    }
  };
}

let motionCache: Promise<Record<MotionKey, LoadedMotion>> | null = null;
function loadOpeningMotions() {
  motionCache ??= Promise.all(
    (Object.keys(HOME_OPENING_MOTIONS) as MotionKey[]).map(async (key) => [key, await loadMotion(HOME_OPENING_MOTIONS[key])] as const),
  ).then((entries) => Object.fromEntries(entries) as Record<MotionKey, LoadedMotion>);
  return motionCache;
}

function readHoldTime(): number | null {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(window.location.search).get('ophold');
  if (raw == null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** DEV 调试：?opmat=1.8 把出场时间线冻结在第 1.8 秒（0–5.2） */
function readMaterializeHold(): number | null {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(window.location.search).get('opmat');
  const value = raw == null ? NaN : Number(raw);
  return Number.isFinite(value) ? Math.max(0, value) : null;
}

/** DEV 调试：?opfx=0 关掉剪影；?opcam=x,y,z,lx,ly,lz,fov 覆盖当前关键帧的相机偏移 */
function readDebugOverrides() {
  if (!import.meta.env.DEV) return { fxOff: false, cam: null as number[] | null };
  const params = new URLSearchParams(window.location.search);
  const cam = params.get('opcam')?.split(',').map(Number);
  return { fxOff: params.get('opfx') === '0', cam: cam && cam.length === 7 && cam.every(Number.isFinite) ? cam : null };
}

type CameraStateRef = React.MutableRefObject<SceneCamera>;

type AvatarProps = { clock: OpeningClock; onReady: () => void; onFail: (error: unknown) => void; cameraState: CameraStateRef; hole: React.MutableRefObject<HoleRect> };

function OpeningAvatar({ clock, onReady, onFail, cameraState, hole }: AvatarProps) {
  const gltf = useLoader(GLTFLoader, HOME_OPENING_MODEL, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });
  const vrm = (gltf as { userData: { vrm: VRM } }).userData.vrm;
  const { camera } = useThree();

  const normalization = useMemo(() => {
    if (!vrm.scene.userData.__websiteOpeningInit) {
      VRMUtils.removeUnnecessaryVertices(vrm.scene);
      VRMUtils.removeUnnecessaryJoints(vrm.scene);
      vrm.scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) mesh.frustumCulled = false;
      });
      vrm.scene.userData.__websiteOpeningInit = true;
    }
    return computeAvatarNormalization(vrm);
  }, [vrm]);

  const state = useRef({
    mixer: null as THREE.AnimationMixer | null,
    actions: {} as Partial<Record<MotionKey, THREE.AnimationAction>>,
    currentKey: null as MotionKey | null,
    effect: 'none' as SceneEffectMode,
    restoreEffect: () => {},
    lastT: -1,
    materializeStart: -1,
    materializeHold: readMaterializeHold(),
    ready: false,
    holdTime: readHoldTime(),
    debug: readDebugOverrides(),
  });

  // 动作加载并烘焙到这份 VRM 后才开始计时：观众看到的第一帧就是睡着的角色。
  // igloo 式出场（线稿 + 笼子 + 主体物化）：所有材质共用一组 uniform
  const materialize = useMemo(createIntroMaterializeUniforms, []);
  const introCage = useMemo(() => createIntroCage(materialize), [materialize]);
  const introWire = useRef<ReturnType<typeof attachIntroWire> | null>(null);
  useEffect(() => {
    const { top, bottom } = measureBindHeight(vrm.scene);
    materialize.uIntroTop.value = top;
    materialize.uIntroBottom.value = bottom;
    patchIntroMaterialize(vrm.scene, materialize);
    const wire = attachIntroWire(vrm.scene, materialize);
    introWire.current = wire;
    return () => {
      wire.dispose();
      introWire.current = null;
    };
  }, [materialize, vrm]);
  useEffect(() => () => {
    introCage.geometry.dispose();
    (introCage.material as THREE.Material).dispose();
  }, [introCage]);

  useEffect(() => {
    let cancelled = false;
    loadOpeningMotions()
      .then((motions) => {
        if (cancelled) return;
        const mixer = new THREE.AnimationMixer(vrm.scene);
        const actions: Partial<Record<MotionKey, THREE.AnimationAction>> = {};
        (Object.keys(motions) as MotionKey[]).forEach((key) => {
          const { clip } = bakeMotionForVrm(motions[key], vrm as never, { includeLookAt: false });
          if (!clip) return;
          clip.name = `website-opening:${key}`;
          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.paused = true;
          action.play();
          actions[key] = action;
        });
        state.current.mixer = mixer;
        state.current.actions = actions;
        state.current.ready = true;
        startOpeningClock(clock, performance.now());
        onReady();
      })
      .catch((error) => {
        console.warn('[website-opening] motion load failed', error);
        onFail(error);
      });
    return () => { cancelled = true; };
  }, [clock, onFail, onReady, vrm]);

  useEffect(() => {
    const s = state.current;
    return () => {
      s.restoreEffect();
      s.mixer?.stopAllAction();
      s.mixer?.uncacheRoot(vrm.scene);
      VRMUtils.deepDispose(vrm.scene);
    };
  }, [vrm]);

  const pool = useMemo(() => ({
    anchor: new THREE.Vector3(), look: new THREE.Vector3(),
    posA: new THREE.Vector3(), posB: new THREE.Vector3(), lookA: new THREE.Vector3(), lookB: new THREE.Vector3(),
    targetPos: new THREE.Vector3(), targetLook: new THREE.Vector3(), smoothedLook: new THREE.Vector3(),
    ikTarget: new THREE.Vector3(), ikPole: new THREE.Vector3(),
    head: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), snapped: false,
  }), []);

  const boneWorld = (name: Anchor, out: THREE.Vector3) => {
    if (name === 'origin' || name === 'world') return out.set(0, 0, 0);
    const node = vrm.humanoid?.getRawBoneNode(name) ?? vrm.humanoid?.getNormalizedBoneNode(name);
    if (!node) return out.set(0, 1, 0);
    return node.getWorldPosition(out);
  };

  const applyKey = (key: CameraKey, pos: THREE.Vector3, look: THREE.Vector3) => {
    boneWorld(key.anchor, pos).add(pool.anchor.set(key.pos[0], key.pos[1], key.pos[2]));
    boneWorld(key.look, look).add(pool.anchor.set(key.lookOff[0], key.lookOff[1], key.lookOff[2]));
  };

  const reachBones = useMemo(() => ({
    root: vrm.humanoid.getNormalizedBoneNode('rightUpperArm'),
    mid: vrm.humanoid.getNormalizedBoneNode('rightLowerArm'),
    tip: vrm.humanoid.getNormalizedBoneNode('rightHand'),
    head: vrm.humanoid.getNormalizedBoneNode('head'),
  }), [vrm]);
  const reachPose = useMemo(() => createReachPose(reachBones.root, reachBones.mid), [reachBones]);

  const sampleMotion = (t: number) => {
    const s = state.current;
    // PropertyMixer can skip unchanged tracks. Undo last frame's IK before sampling,
    // otherwise a held/clamped animation accumulates the correction every frame.
    reachPose.restore();
    let dominantWeight = -1;
    for (const key of MOTION_KEYS) {
      const action = s.actions[key];
      if (!action) continue;
      const weight = motionWeight(key, t, LOCK_CLIP?.blend);
      action.enabled = true;
      action.paused = true;
      action.time = motionTime(key, t, action.getClip().duration, LOCK_CLIP?.speed);
      action.setEffectiveWeight(weight);
      if (weight > dominantWeight) { dominantWeight = weight; s.currentKey = key; }
    }
    s.mixer!.update(0);
  };

  const applyEffect = (mode: SceneEffectMode) => {
    const s = state.current;
    if (s.effect === mode) return;
    s.restoreEffect();
    s.restoreEffect = mode === 'none' ? () => {} : applySilhouette(vrm.scene, mode);
    s.effect = mode;
  };

  const applyReach = (weight: number) => {
    if (weight <= 0) return;
    const humanoid = vrm.humanoid;
    const { root, mid, tip, head } = reachBones;
    if (!root || !mid || !tip || !head) return;
    humanoid.normalizedHumanBonesRoot.updateMatrixWorld(true);
    head.getWorldPosition(pool.head);
    pool.ikTarget.copy(pool.head).add(pool.anchor.set(0.16, 0.52, 0.3));
    pool.ikPole.copy(pool.head).add(pool.anchor.set(0.62, 0.12, 0.36));
    reachPose.capture();
    solveTwoBoneIk({ root, mid, tip }, pool.ikTarget, pool.ikPole);
    reachPose.blend(weight);
  };

  /** 场景文件里的表情权重、眼镜开关与注视（与编辑器 Actor 同一套顺序）+ 定格后的眨眼 */
  const applyActorFace = (active: boolean, now: number) => {
    const manager = vrm.expressionManager;
    const expression = HERO_ACTOR?.expression;
    if (manager) {
      if (expression?.mode === 'manual') for (const key of FACE_CHANNELS) manager.setValue(key, active ? expression.weights[key] ?? 0 : 0);
      if (active && manager.getExpression('blink')) {
        manager.setValue('blink', Math.max(manager.getValue('blink') ?? 0, blinkWeight(now)));
      }
      if (HERO_ACTOR?.glassesHidden !== undefined && manager.getExpression('Glasses OFF')) {
        manager.setValue('Glasses OFF', active && HERO_ACTOR.glassesHidden ? 1 : 0);
      }
    }
    const gaze = HERO_ACTOR?.gaze;
    if (!vrm.lookAt) return;
    if (!active || !gaze) {
      if (vrm.lookAt.target) { vrm.lookAt.target = null; vrm.lookAt.reset(); }
      return;
    }
    vrm.lookAt.autoUpdate = true;
    if (gaze.mode === 'camera') vrm.lookAt.target = camera;
    else if (gaze.mode === 'target') { pool.look.fromArray(gaze.target); vrm.lookAt.target = null; vrm.lookAt.lookAt(pool.look); }
    else if (gaze.mode === 'forward') { vrm.lookAt.target = null; vrm.lookAt.reset(); }
    else { vrm.lookAt.target = null; vrm.lookAt.yaw = gaze.yaw; vrm.lookAt.pitch = gaze.pitch; }
  };

  useFrame((frame, rawDelta) => {
    const s = state.current;
    // 动作烘焙完成前不露出模型：否则观众会先看到一帧站着的 T-pose
    vrm.scene.visible = s.ready;
    if (!s.ready || !s.mixer) return;
    const delta = Math.min(rawDelta, 0.05);
    const now = performance.now();
    const t = s.holdTime ?? openingTime(clock, now);
    const jumped = s.lastT >= 0 && Math.abs(t - s.lastT) > 1;
    s.lastT = t;

    // 出场：第一次出现时开始；跳过 / 重播（时间跳变）时重新播一次。笼子以出场那一刻的髋部为中心
    if (s.materializeStart < 0 || jumped) {
      s.materializeStart = t;
      vrm.scene.updateMatrixWorld(true);
      boneWorld('hips', introCage.position);
    }
    const introSeconds = s.materializeHold ?? t - s.materializeStart;
    applyIntroTimeline(materialize, introSeconds);
    const introRunning = introSeconds < INTRO_TOTAL_SECONDS;
    introWire.current?.setVisible(introRunning);
    introCage.visible = introRunning;
    materialize.uIntroTime.value += delta;
    // 开场手机窗：出场效果只画在窗里（黑框本身不写深度，挡不住发光层）
    const rect = hole.current;
    materialize.uHoleOn.value = introRunning && !rect.open ? 1 : 0;
    if (materialize.uHoleOn.value) {
      const bounds = frame.gl.domElement.getBoundingClientRect();
      const sx = frame.gl.domElement.width / Math.max(1, bounds.width);
      const sy = frame.gl.domElement.height / Math.max(1, bounds.height);
      const bottom = bounds.height - (rect.y + rect.h - bounds.top);
      materialize.uHoleRect.value.set(
        (rect.x - bounds.left) * sx,
        bottom * sy,
        (rect.x + rect.w - bounds.left) * sx,
        (bottom + rect.h) * sy,
      );
    }

    // 先清掉手动表情再采样动作，回到动作模式时动作自己的表情才会恢复
    const actorActive = heroActorActive(t);
    if (vrm.expressionManager && HERO_ACTOR?.expression) for (const key of FACE_CHANNELS) vrm.expressionManager.setValue(key, 0);
    sampleMotion(t);
    applyReach(reachWeight(t));
    applyActorFace(actorActive, now);
    vrm.update(delta);
    vrm.scene.updateMatrixWorld(true);
    applyEffect(s.debug.fxOff ? 'none' : effectModeAt(t));
    if (import.meta.env.DEV && (frame.clock.elapsedTime * 4 | 0) % 2 === 0) {
      const read = (name: VRMHumanBoneName) => boneWorld(name, pool.anchor).toArray().map((v) => Number(v.toFixed(2)));
      (window as Window & { __hvOpening?: unknown }).__hvOpening = {
        t: Number(t.toFixed(2)), motion: s.currentKey,
        hips: read('hips'), head: read('head'), chest: read('chest'),
        leftFoot: read('leftFoot'), rightFoot: read('rightFoot'), rightHand: read('rightHand'), leftHand: read('leftHand'),
        camera: camera.position.toArray().map((v) => Number(v.toFixed(2))),
      };
    }

    // 相机：在关键帧之间平滑插值，再做一点阻尼避免跟骨骼抖动
    let index = 0;
    while (index < CAMERA_KEYS.length - 2 && t >= CAMERA_KEYS[index + 1].t) index += 1;
    let a = CAMERA_KEYS[index];
    let b = CAMERA_KEYS[Math.min(index + 1, CAMERA_KEYS.length - 1)];
    if (s.debug.cam) {
      const c = s.debug.cam;
      a = { ...a, pos: [c[0], c[1], c[2]], lookOff: [c[3], c[4], c[5]], fov: c[6] };
      b = a;
    }
    const u = smoothstep(a.t, b.t, t);
    applyKey(a, pool.posA, pool.lookA);
    applyKey(b, pool.posB, pool.lookB);
    pool.targetPos.copy(pool.posA).lerp(pool.posB, u);
    pool.targetLook.copy(pool.lookA).lerp(pool.lookB, u);
    const fov = THREE.MathUtils.lerp(a.fov, b.fov, u);
    const near = THREE.MathUtils.lerp(a.near ?? 0.05, b.near ?? 0.05, u);
    const shift = THREE.MathUtils.lerp(a.shift ?? 0, b.shift ?? 0, u);
    if (shift !== 0) {
      pool.anchor.copy(pool.targetLook).sub(pool.targetPos).normalize();
      pool.anchor.cross(pool.up).normalize();
      pool.targetLook.addScaledVector(pool.anchor, shift);
    }
    if (t >= OPENING_TOTAL) {
      // 定格后的轻微呼吸与指针视差，让画面不像静态图
      const breathe = Math.sin(now * 0.0009) * 0.008;
      pool.targetPos.x += frame.pointer.x * 0.03;
      pool.targetPos.y += breathe + frame.pointer.y * 0.02;
    }

    const perspective = camera as THREE.PerspectiveCamera;
    const pullback = portraitPullback(perspective.aspect, t);
    pool.anchor.copy(pool.targetPos).sub(pool.targetLook);
    const extraFocusDistance = pool.anchor.length() * pullback;
    pool.targetPos.addScaledVector(pool.anchor, pullback);
    // Keep the character above the mobile title and action bar.
    const portraitLift = Math.min(1, pullback) * 0.1;
    pool.targetPos.y -= portraitLift;
    pool.targetLook.y -= portraitLift;
    if (!pool.snapped || jumped) {
      camera.position.copy(pool.targetPos);
      pool.smoothedLook.copy(pool.targetLook);
      pool.snapped = true;
    } else {
      const k = 1 - Math.exp(-delta * 9);
      camera.position.lerp(pool.targetPos, k);
      pool.smoothedLook.lerp(pool.targetLook, k);
    }
    camera.lookAt(pool.smoothedLook);
    if (Math.abs(perspective.fov - fov) > 1e-3 || Math.abs(perspective.near - near) > 1e-4) {
      perspective.fov = fov;
      perspective.near = near;
      perspective.updateProjectionMatrix();
    }

    // 景深状态：靠近定格镜头时平滑接入场景文件的对焦设置
    const dofA = a.dof ?? NO_DOF;
    const dofB = b.dof ?? NO_DOF;
    const view = cameraState.current;
    const enabled = THREE.MathUtils.lerp(dofA.dofEnabled ? 1 : 0, dofB.dofEnabled ? 1 : 0, u);
    view.dofEnabled = enabled > 0.02;
    view.blur = THREE.MathUtils.lerp(dofA.blur ?? 1.4, dofB.blur ?? 1.4, u) * enabled;
    view.focusRange = THREE.MathUtils.lerp(dofA.focusRange ?? 0.3, dofB.focusRange ?? 0.3, u);
    view.focusDistance = THREE.MathUtils.lerp(dofA.focusDistance ?? 4, dofB.focusDistance ?? 4, u) + extraFocusDistance;
    view.focusMode = (u < 0.5 ? dofA : dofB).focusMode ?? 'target';
    view.target = (u < 0.5 ? dofA : dofB).target;
  });

  return (
    <>
    <group position={HERO_ACTOR?.position ?? [0, 0, 0]} rotation={HERO_ACTOR?.rotation ?? [0, 0, 0]} scale={HERO_ACTOR?.scale ?? 1}>
      <group position={normalization.offset}>
        <primitive object={vrm.scene} />
      </group>
    </group>
    <FingertipGlint vrm={vrm} clock={clock} />
    <primitive object={introCage} />
    </>
  );
}

/** 场景文件里的三盏灯：与 SceneEditorLights 同一套参数，去掉编辑手柄 */
const HeroLights = memo(function HeroLights({ lighting, clock }: { lighting: SceneLighting; clock: OpeningClock }) {
  const debutRim = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    if (debutRim.current) debutRim.current.intensity = clock.ready
      ? 0.35 * debutEnvelope(openingTime(clock, performance.now()) - OPENING_TOTAL) : 0;
  });
  const target = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    target.position.fromArray(lighting.target);
    target.updateMatrixWorld(true);
  }, [target, lighting.target]);
  return (
    <>
      <primitive object={target} />
      <ambientLight color={lighting.ambientColor} intensity={lighting.ambientIntensity} />
      <directionalLight ref={debutRim} position={lighting.rim.position} target={target} color="#b8eaff" intensity={0} />
      {(['key', 'fill', 'rim'] as const).map((id) => {
        const light = lighting[id];
        return <directionalLight key={id} position={light.position} color={light.color} intensity={light.enabled ? light.intensity : 0} target={target} />;
      })}
    </>
  );
});

/**
 * 黑场手机窗画在 3D 里：一块贴着相机、位于角色之后 / 天空之前的黑色幕布，中间按 DOM 窗口开洞。
 * 这样躺着的角色（更近）会压在黑幕之上，翅膀与身体可以伸出窗口，和 Figma 01 一样；
 * 窗口打开时洞跟着 DOM 一起放大到整屏。
 */
const FRAME_DISTANCE = 20;
function BlackFrame({ hole }: { hole: React.MutableRefObject<HoleRect> }) {
  const { gl, camera } = useThree();
  const material = useMemo(() => new THREE.ShaderMaterial({
    depthTest: true,
    depthWrite: false,
    transparent: false,
    toneMapped: false,
    uniforms: { uRect: { value: new THREE.Vector4(-2, -2, 2, 2) }, uDistance: { value: FRAME_DISTANCE }, uFeather: { value: 0.002 } },
    vertexShader: `
      uniform float uDistance;
      varying vec2 vNdc;
      void main() {
        vNdc = position.xy;
        vec4 p = projectionMatrix * vec4(0.0, 0.0, -uDistance, 1.0);
        gl_Position = vec4(position.xy, p.z / p.w, 1.0);
      }`,
    fragmentShader: `
      uniform vec4 uRect;
      uniform float uFeather;
      varying vec2 vNdc;
      void main() {
        vec2 inside = smoothstep(uRect.xy - uFeather, uRect.xy + uFeather, vNdc) * (1.0 - smoothstep(uRect.zw - uFeather, uRect.zw + uFeather, vNdc));
        float hole = inside.x * inside.y;
        if (hole > 0.999) discard;
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - hole);
      }`,
  }), []);
  useEffect(() => () => material.dispose(), [material]);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const rect = hole.current;
    if (rect.open) { m.visible = false; return; }
    m.visible = true;
    const bounds = gl.domElement.getBoundingClientRect();
    const nx = (x: number) => ((x - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
    const ny = (y: number) => 1 - ((y - bounds.top) / Math.max(1, bounds.height)) * 2;
    material.uniforms.uRect.value.set(nx(rect.x), ny(rect.y + rect.h), nx(rect.x + rect.w), ny(rect.y));
    material.uniforms.uDistance.value = Math.min(FRAME_DISTANCE, (camera as THREE.PerspectiveCamera).far * 0.5);
  });
  return (
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/** 与 /scene-editor-lab 的 EditorDepthOfField 相同：每帧从相机状态取对焦 */
function HeroDepthOfField({ cameraState }: { cameraState: CameraStateRef }) {
  const effect = useRef<DepthOfFieldEffect>(null);
  const target = useRef(new THREE.Vector3());
  const { camera } = useThree();
  useFrame(() => {
    const fx = effect.current;
    if (!fx) return;
    const view = cameraState.current;
    fx.blendMode.opacity.value = view.dofEnabled ? 1 : 0;
    fx.bokehScale = view.blur ?? 1.4;
    fx.cocMaterial.worldFocusRange = view.focusRange ?? 0.3;
    if (view.focusMode === 'manual') camera.getWorldDirection(target.current).multiplyScalar(view.focusDistance ?? 4).add(camera.position);
    else target.current.fromArray(view.target);
    fx.target = target.current;
  });
  return <DepthOfField ref={effect} worldFocusDistance={4} worldFocusRange={0.3} bokehScale={1.4} height={480} />;
}

type OpeningStage3DProps = {
  clock: OpeningClock;
  onReady: () => void;
  onFail: (error: unknown) => void;
  /** 首屏离开视口后停掉渲染循环 */
  running: boolean;
  hole: React.MutableRefObject<HoleRect>;
};

/**
 * 首屏 3D 舞台：直播间同款 HDR 天空 + 场景文件的灯光 / 景深 + Bloom + 全局调色（LUT），
 * corynorootbone 开场表演。用 FlightCanvas 挂载，纸飞机光标可以飞进这个场景绕角色一圈。
 */
export const OpeningStage3D = memo(function OpeningStage3D({ clock, onReady, onFail, running, hole }: OpeningStage3DProps) {
  const [look] = useState(() => loadVrmLookSettings(LIVE_VRM_LOOK_STORAGE_KEY, DEFAULT_LIVE_VRM_LOOK));
  const cameraState = useRef<SceneCamera>({ ...HERO_CAMERA, ...NO_DOF, target: HERO_CAMERA.target });
  return (
    <FlightCanvas
      className="hv-stage__canvas"
      frameloop={running ? 'always' : 'never'}
      dpr={[1, 1.5]}
      camera={{ fov: 30, near: 0.05, far: 80, position: [2, 1, 2] }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        <LiveRotatableHdrSky
          url={publicUrl(WEBSITE_SKY_HDR)}
          hdrRotationYDeg={SKY_ROTATION_DEG}
          environmentIntensity={HERO_LIGHTING.environmentIntensity}
          backgroundIntensity={HERO_LIGHTING.backgroundIntensity}
          fogDensity={HERO_LIGHTING.fogDensity}
        />
      </Suspense>
      <HeroLights lighting={HERO_LIGHTING} clock={clock} />
      <BlackFrame hole={hole} />
      <Suspense fallback={null}>
        <OpeningAvatar clock={clock} onReady={onReady} onFail={onFail} cameraState={cameraState} hole={hole} />
      </Suspense>
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <>
          <HeroDepthOfField cameraState={cameraState} />
          <Bloom {...liveBloom(look)} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.LINEAR} />
          <AppColorGradeLutPass forceWebGl includeTone />
          <SkyEdgeEffect hole={hole} />
        </>
      </EffectComposer>
    </FlightCanvas>
  );
});
