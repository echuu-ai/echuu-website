import { FingertipGlint } from './FingertipGlint';
import { debutEnvelope } from '../debutHighlight';
import { SkyEdgeEffect } from './SkyEdgeEffect';
import { useSceneTuning } from './sceneTuning';
import { FrostSim, pointerOnAvatar } from './mouseFrost';
import { armFrostAudio, playFrostBeep, updateFrostAudio } from '../../lib/frostAudio';
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
import { computeAvatarNormalization } from '../../../components/lab/viewport/avatarNormalization';
import { DEFAULT_LIVE_AVATAR_RIG, DEFAULT_LIVE_VRM_LOOK, LIVE_VRM_LOOK_STORAGE_KEY, liveBloom } from '../../../data/liveStagePresets';
import { bakeMotionForVrm, loadMotion, type LoadedMotion } from '../../../lib/retarget/motionLoader';
import { FACE_CHANNELS } from '../../../lib/scene-expression';
import { defaultSceneLighting, type SceneLighting } from '../../../lib/scene-lighting';
import { parseProject, type SceneCamera, type SceneProject } from '../../../lib/scene-editor';
import { publicUrl } from '../../../lib/publicUrl';
import { HOME_ASSETS, HOME_OPENING_MODEL, HOME_OPENING_MOTIONS } from '../../assets';
import { PAPER_OUTLINE_BOX, PAPER_TILT_DEG } from '../DrawWingsPaper';
import { groundOpeningClips, type GroundResult } from './openingGround';
import { WEBSITE_SKY_HDR } from '../../sky';
import heroSceneJson from '../heroScene.json';
import {
  OPENING,
  OPENING_MOTION,
  OPENING_TOTAL,
  markOpeningReady,
  openingStarted,
  openingTime,
  smoothstep,
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
export type HoleRect = {
  x: number; y: number; w: number; h: number; open: boolean;
  /** 0 = 窗口还没回来（黑幕全黑）→ 1 = 窗口完整；fold 阶段从窗口中心张开 */
  reveal: number;
};

/** paper = 3D 纸面中心（只给开场第一镜用） */
type Anchor = VRMHumanBoneName | 'origin' | 'world' | 'paper';

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
  /** 俯视纸面：高度改成刚好让整张纸填满 paperFill 的距离（pos.y 不用） */
  fitPaper?: boolean;
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
  // wake 俯视纸面：铅笔稿物化成 3D，像从纸上看它醒来
  // 头朝 −Z 躺在纸上：相机在正上方略偏 +Z，画面上方就是头的方向；第一帧整张纸占满画面高度，与 DOM 纸衔接
  { t: 0, anchor: 'paper', pos: [0, 0, 0.02], look: 'paper', lookOff: [0, 0, 0], fov: 32, fitPaper: true },
  { t: OPENING.standStart, anchor: 'hips', pos: [0, 2.6, 0.35], look: 'hips', lookOff: [0, 0, 0.1], fov: 32 },
  { t: OPENING.standStart + 1.2, anchor: 'hips', pos: [0.3, 2.2, 1.6], look: 'chest', lookOff: [0, 0.05, 0], fov: 33 },
  // Stand Up：镜头随站起转到正面
  { t: 4.2, anchor: 'hips', pos: [0.35, 1.5, 2.6], look: 'chest', lookOff: [0, 0.12, 0], fov: 32 },
  { t: OPENING.wakeEnd, anchor: 'head', pos: [0.18, 0.04, 2.0], look: 'head', lookOff: [0, 0, 0], fov: 28 },
  // fold：后拉，手机窗与纸飞机回到画面
  { t: OPENING.windowBack, anchor: 'hips', pos: [0.55, 1.35, 3.1], look: 'chest', lookOff: [0, 0.1, 0], fov: 36 },
  { t: OPENING.openStart, anchor: 'hips', pos: [0.55, 1.35, 3.1], look: 'chest', lookOff: [0, 0.1, 0], fov: 36 },
  // open 白闪后冲进窗口对面的世界：镜头退到角色后上方，环绕（与旧版一致）
  { t: OPENING.openStart + 1.3, anchor: 'hips', pos: [-0.5, 1.3, -2.3], look: 'chest', lookOff: [0, 0.1, 0], fov: 40 },
  { t: OPENING_MOTION.introEndStart, anchor: 'hips', pos: [1.9, 1.0, -1.1], look: 'head', lookOff: [0, -0.05, 0], fov: 34 },
  // 04 定格：场景文件里的相机（含景深）
  { t: OPENING_MOTION.lockStart + 0.9, anchor: 'world', pos: HERO_CAMERA.position, look: 'world', lookOff: HERO_CAMERA.target, fov: HERO_CAMERA.fov, dof: HERO_DOF },
  { t: OPENING_TOTAL, anchor: 'world', pos: HERO_CAMERA.position, look: 'world', lookOff: HERO_CAMERA.target, fov: HERO_CAMERA.fov, dof: HERO_DOF },
];

const LOCK_CLIP = HERO_ACTOR?.clips.find((clip) => clip.motionId.includes('spot-target-locked'));

/** 场景文件里的表情 / 注视只在定格阶段生效，开场分镜跟随动作本身 */
const heroActorActive = (t: number) => t >= OPENING_MOTION.lockStart;

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

type AvatarProps = { clock: OpeningClock; onReady: () => void; onFail: (error: unknown) => void; cameraState: CameraStateRef; hole: React.MutableRefObject<HoleRect>; lying: React.MutableRefObject<GroundResult | null> };

function OpeningAvatar({ clock, onReady, onFail, cameraState, hole, lying }: AvatarProps) {
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

  // igloo 式悬停结霜 + 音效：只在桌面精确指针、未开减少动态效果时启用
  const frost = useMemo(() => new FrostSim(), []);
  const frostPointer = useRef({ x: 0, y: 0, inside: false, hovering: false, enabled: false });
  useEffect(() => {
    const p = frostPointer.current;
    p.enabled = !!window.matchMedia?.('(pointer: fine)').matches && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!p.enabled) return;
    armFrostAudio();
    const onMove = (event: PointerEvent) => { p.x = event.clientX; p.y = event.clientY; p.inside = event.pointerType === 'mouse' || event.pointerType === 'pen'; };
    const onLeave = () => { p.inside = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  useEffect(() => () => frost.dispose(), [frost]);

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
        // Stand Up 落地、睡姿转到同一朝向；纸面按躺姿摆放
        const sleepDuration = actions.sleep?.getClip().duration ?? 1;
        lying.current = groundOpeningClips(vrm, mixer, actions, motionTime('sleep', 0, sleepDuration));
        state.current.mixer = mixer;
        state.current.actions = actions;
        state.current.ready = true;
        markOpeningReady(clock);
        onReady();
      })
      .catch((error) => {
        console.warn('[website-opening] motion load failed', error);
        onFail(error);
      });
    return () => { cancelled = true; };
  }, [clock, lying, onFail, onReady, vrm]);

  useEffect(() => {
    const s = state.current;
    return () => {
      s.mixer?.stopAllAction();
      s.mixer?.uncacheRoot(vrm.scene);
      VRMUtils.deepDispose(vrm.scene);
    };
  }, [vrm]);

  const pool = useMemo(() => ({
    anchor: new THREE.Vector3(), look: new THREE.Vector3(),
    posA: new THREE.Vector3(), posB: new THREE.Vector3(), lookA: new THREE.Vector3(), lookB: new THREE.Vector3(),
    targetPos: new THREE.Vector3(), targetLook: new THREE.Vector3(), smoothedLook: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0), snapped: false,
  }), []);

  const boneWorld = (name: Anchor, out: THREE.Vector3): THREE.Vector3 => {
    if (name === 'origin' || name === 'world') return out.set(0, 0, 0);
    if (name === 'paper') return lying.current?.paper ? out.copy(lying.current.paper) : boneWorld('hips', out);
    const node = vrm.humanoid?.getRawBoneNode(name) ?? vrm.humanoid?.getNormalizedBoneNode(name);
    if (!node) return out.set(0, 1, 0);
    return node.getWorldPosition(out);
  };

  const applyKey = (key: CameraKey, pos: THREE.Vector3, look: THREE.Vector3) => {
    boneWorld(key.anchor, pos).add(pool.anchor.set(key.pos[0], key.pos[1], key.pos[2]));
    if (key.fitPaper) {
      // 高度取「整张纸占视口 paperFill」所需的距离，与 DOM 纸同样大
      const fill = Math.max(0.3, lying.current?.paperFill ?? 1);
      pos.y = boneWorld('paper', pool.look).y + (PAPER_HEIGHT / fill) / 2 / Math.tan(THREE.MathUtils.degToRad(key.fov) / 2);
    }
    boneWorld(key.look, look).add(pool.anchor.set(key.lookOff[0], key.lookOff[1], key.lookOff[2]));
  };

  const sampleMotion = (t: number) => {
    const s = state.current;
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
    // 动作烘焙完成前、以及 draw 阶段（时钟未启动）不露出模型
    vrm.scene.visible = s.ready && openingStarted(clock);
    if (!s.ready || !s.mixer || !vrm.scene.visible) return;
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
    materialize.uHoleOn.value = introRunning && !rect.open && rect.reveal > 0.999 ? 1 : 0;
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
    applyActorFace(actorActive, now);
    vrm.update(delta);
    vrm.scene.updateMatrixWorld(true);
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

  // 结霜在相机与骨骼本帧更新之后计算（同优先级按注册顺序，排在上面的主循环之后）
  const frostPoint = useMemo(() => new THREE.Vector2(), []);
  const frostUv = useMemo(() => new THREE.Vector2(), []);
  useFrame(({ gl, camera: cam }) => {
    const p = frostPointer.current;
    const now = performance.now() / 1000;
    const active = p.enabled && hole.current.open && state.current.ready;
    let hovering = false;
    if (active && p.inside && document.visibilityState === 'visible') {
      const rect = gl.domElement.getBoundingClientRect();
      frostPoint.set(p.x - rect.left, p.y - rect.top);
      if (frostPoint.x >= 0 && frostPoint.y >= 0 && frostPoint.x <= rect.width && frostPoint.y <= rect.height) {
        hovering = pointerOnAvatar(vrm, cam as THREE.PerspectiveCamera, frostPoint, rect);
        if (hovering) {
          if (!p.hovering) { frost.hoverStart(); playFrostBeep(now); }
          frostUv.set(frostPoint.x / rect.width, 1 - frostPoint.y / rect.height);
          frost.move(frostUv, now);
        }
      }
    }
    p.hovering = hovering;
    const sampling = active && frost.isActive(now);
    if (sampling) {
      frost.resize(gl.domElement.width / Math.max(1, gl.domElement.height));
      frost.update(gl, now);
      materialize.uFrostTex.value = frost.texture;
      materialize.uFrostResolution.value.set(gl.domElement.width, gl.domElement.height);
    }
    materialize.uFrostOn.value = sampling ? 1 : 0;
    updateFrostAudio(frost.soundVelocity, now, !sampling || document.visibilityState !== 'visible');
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

/**
 * draw 阶段那张纸的 3D 版：wake 开始时 DOM 纸淡出、这张接上（同一张纸素材 + 同一个铅笔稿位置，
 * 外加用户画的翅膀笔迹）。角色在它上面物化并站起；fold 阶段它翻卷着飞走，让位给纸飞机。
 */
/** 纸宽（米）：铅笔稿长边约 0.86 × 纸宽，与角色躺下的身长（约 1.4 m）对上 */
const PAPER_WIDTH = 1.65;
const PAPER_RATIO = 1652 / 1200;
const PAPER_HEIGHT = PAPER_WIDTH * PAPER_RATIO;
const PAPER_TILT = THREE.MathUtils.degToRad(PAPER_TILT_DEG);
/** 铅笔稿与 3D 躺姿只能大致对齐：再按纸面本地坐标（米，y 朝头）微调一点 */
const OUTLINE_NUDGE = new THREE.Vector2(-0.05, 0.02);
/** fold：纸先揉折成飞机（FOLD_SECONDS），再飞进手机窗，开窗白闪前一刻钻进去 */
const FOLD_SECONDS = 0.9;
const FLY_END = OPENING.openStart + 0.15;
/** 纸飞机起飞点与弧线控制点（相机空间，米） */
const FLY_START = new THREE.Vector3(0.32, -0.38, -1.5);
const FLY_CONTROL = new THREE.Vector3(0.75, 0.42, -2.6);
const FLY_DEPTH = 7;

/** 经典纸飞机（尖头朝 +Z，方便 lookAt）：两片机翼 + 中间的龙骨，UV 直接取纸面贴图 */
function createPaperPlaneGeometry() {
  const L = 0.34;
  const W = 0.32;
  const nose = [0, 0, L / 2];
  const top = [0, 0, -L / 2];
  const keel = [0, -0.07, -L / 2];
  const left = [-W / 2, 0.025, -L / 2];
  const right = [W / 2, 0.025, -L / 2];
  const tris = [nose, top, left, nose, right, top, nose, keel, top];
  const position = new Float32Array(tris.flat());
  const uv = new Float32Array(tris.flatMap(([x, , z]) => [0.5 + x / W, 0.5 + z / L]));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function PaperSheet3D({ clock, art, lying, hole }: {
  clock: OpeningClock;
  art: React.MutableRefObject<HTMLCanvasElement | null>;
  lying: React.MutableRefObject<GroundResult | null>;
  hole: React.MutableRefObject<HoleRect>;
}) {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const plane = useRef<THREE.Mesh>(null);
  const [hold] = useState(readHoldTime);
  const parts = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 880;
    canvas.height = Math.round(880 * PAPER_RATIO);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, transparent: true, side: THREE.DoubleSide, fog: false });
    const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide, fog: false });
    return { texture, material, planeMaterial, planeGeometry: createPaperPlaneGeometry(), ctx: canvas.getContext('2d'), loaded: false, stamped: false };
  }, []);
  const pool = useMemo(() => ({
    floor: new THREE.Vector3(), floorQuat: new THREE.Quaternion(), euler: new THREE.Euler(),
    start: new THREE.Vector3(), control: new THREE.Vector3(), end: new THREE.Vector3(),
    pos: new THREE.Vector3(), next: new THREE.Vector3(), faceQuat: new THREE.Quaternion(), spin: new THREE.Quaternion(),
  }), []);
  // 纸面中心相对铅笔稿中心的偏移（纸面本地坐标，y 朝上）：把铅笔稿中心放到角色躺姿中心
  const offset = useMemo(() => new THREE.Vector2(
    -(PAPER_OUTLINE_BOX.cx - 0.5) * PAPER_WIDTH + OUTLINE_NUDGE.x,
    (PAPER_OUTLINE_BOX.cy - 0.5) * PAPER_WIDTH * PAPER_RATIO + OUTLINE_NUDGE.y,
  ), []);
  useEffect(() => {
    let on = true;
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    Promise.all([load(HOME_ASSETS.opening.paperSheet), load(HOME_ASSETS.opening.paperOutline)]).then(([sheet, outline]) => {
      const ctx = parts.ctx;
      if (!on || !ctx) return;
      const { width, height } = ctx.canvas;
      ctx.drawImage(sheet, 0, 0, width, height);
      // 与 DOM 纸同一组几何：铅笔稿绕自身中心旋转后贴在纸面上
      const box = PAPER_OUTLINE_BOX;
      ctx.save();
      ctx.translate(box.cx * width, box.cy * height);
      ctx.rotate((box.rot * Math.PI) / 180);
      ctx.drawImage(outline, (-box.w * width) / 2, (-box.h * height) / 2, box.w * width, box.h * height);
      ctx.restore();
      parts.loaded = true;
      parts.texture.needsUpdate = true;
    }).catch(() => {});
    return () => { on = false; };
  }, [parts]);
  useEffect(() => () => {
    parts.texture.dispose();
    parts.material.dispose();
    parts.planeMaterial.dispose();
    parts.planeGeometry.dispose();
  }, [parts]);

  /** 相机空间的点 → 世界坐标 */
  const fromCamera = (v: THREE.Vector3, out: THREE.Vector3) => out.copy(v).applyMatrix4(camera.matrixWorld);
  /** 手机窗中心方向上、相机前方 FLY_DEPTH 米的点（窗口还没完全回来也按它的最终位置瞄准） */
  const windowTarget = (out: THREE.Vector3) => {
    const rect = hole.current;
    const bounds = gl.domElement.getBoundingClientRect();
    const ndcX = ((rect.x + rect.w / 2 - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
    const ndcY = 1 - ((rect.y + rect.h / 2 - bounds.top) / Math.max(1, bounds.height)) * 2;
    out.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
    return out.multiplyScalar(FLY_DEPTH).add(camera.position);
  };
  const bezier = (u: number, out: THREE.Vector3) => {
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    return out.set(
      a * pool.start.x + b * pool.control.x + c * pool.end.x,
      a * pool.start.y + b * pool.control.y + c * pool.end.y,
      a * pool.start.z + b * pool.control.z + c * pool.end.z,
    );
  };

  useFrame(() => {
    const g = group.current;
    const p = plane.current;
    if (!g || !p) return;
    const started = openingStarted(clock);
    const t = hold ?? openingTime(clock, performance.now());
    const pose = lying.current;
    if (started && pose && pose.paperFill === undefined && art.current) {
      // DOM 纸的画布就是纸面大小（clientHeight 不受旋转影响）
      pose.paperFill = art.current.clientHeight / Math.max(1, window.innerHeight);
    }
    if (started && parts.loaded && !parts.stamped && art.current && parts.ctx) {
      // 用户画的翅膀盖到纸面贴图上（笔迹之后不再变，只盖一次）
      parts.ctx.drawImage(art.current, 0, 0, parts.ctx.canvas.width, parts.ctx.canvas.height);
      parts.stamped = true;
      parts.texture.needsUpdate = true;
    }
    const fold = smoothstep(OPENING.wakeEnd, OPENING.wakeEnd + FOLD_SECONDS, t);
    const swap = OPENING.wakeEnd + FOLD_SECONDS;
    g.visible = started && !!pose && t < swap;
    p.visible = started && !!pose && t >= swap && t < FLY_END;
    if (!pose) return;
    camera.updateMatrixWorld();
    fromCamera(FLY_START, pool.start);

    if (g.visible) {
      // 纸面朝上铺在地上，图片上方朝着角色头的方向；俯视时绕 Z 的正方向在画面上是顺时针，与 CSS 相反，所以倾角取反
      const heading = Math.atan2(-pose.headDir.x, -pose.headDir.z);
      pool.floor.set(pose.center.x, 0.004, pose.center.z);
      pool.floorQuat.setFromEuler(pool.euler.set(-Math.PI / 2, 0, heading - PAPER_TILT, 'XYZ'));
      // fold：从地上飘起来、翻卷、缩小到起飞点，换成纸飞机
      pool.faceQuat.copy(camera.quaternion).multiply(pool.spin.set(0, 0, Math.sin(fold * 1.4), Math.cos(fold * 1.4)));
      g.position.copy(pool.floor).lerp(pool.start, fold);
      g.position.y += Math.sin(fold * Math.PI) * 0.35;
      g.quaternion.copy(pool.floorQuat).slerp(pool.faceQuat, fold);
      if (!pose.paper && fold === 0) {
        // 纸面中心（世界坐标）：开场第一镜对准它
        g.updateMatrixWorld(true);
        pose.paper = new THREE.Vector3(offset.x, offset.y, 0).applyMatrix4(g.matrixWorld);
      }
      // 前段就缩小，别让整张纸横在角色前面
      const shrink = smoothstep(0, 0.55, fold);
      g.scale.set(Math.max(0.0001, 1 - 0.88 * shrink), Math.max(0.0001, 1 - 0.93 * shrink), 1);
      parts.material.opacity = 1;
    }
    if (p.visible) {
      const u = smoothstep(swap, FLY_END, t);
      fromCamera(FLY_CONTROL, pool.control);
      windowTarget(pool.end);
      bezier(u, pool.pos);
      bezier(Math.min(1, u + 0.02), pool.next);
      p.position.copy(pool.pos);
      if (pool.next.distanceToSquared(pool.pos) > 1e-8) p.lookAt(pool.next);
      // 飞行中轻轻侧倾，出手那一下有个小抖动
      p.rotateZ(Math.sin(u * Math.PI * 2) * 0.35);
      p.scale.setScalar(1 + 0.25 * Math.sin(Math.min(1, (t - swap) / 0.3) * Math.PI));
    }
    if (import.meta.env.DEV) (window as Window & { __hvPaper?: unknown }).__hvPaper = g;
  });
  return (
    <>
      <group ref={group} visible={false}>
        <mesh material={parts.material} position={[offset.x, offset.y, 0]}>
          <planeGeometry args={[PAPER_WIDTH, PAPER_WIDTH * PAPER_RATIO]} />
        </mesh>
      </group>
      <mesh ref={plane} visible={false} geometry={parts.planeGeometry} material={parts.planeMaterial} />
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
    // reveal 从窗口中心张开：0 时洞收成一个点（黑幕全黑）
    const r = Math.max(0, Math.min(1, rect.reveal));
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const hw = (rect.w / 2) * r;
    const hh = (rect.h / 2) * r;
    material.uniforms.uRect.value.set(nx(cx - hw), ny(cy + hh), nx(cx + hw), ny(cy - hh));
    material.uniforms.uDistance.value = Math.min(FRAME_DISTANCE, (camera as THREE.PerspectiveCamera).far * 0.5);
  });
  return (
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/**
 * 画布比首屏高出一截（切口藏在首屏下面）。取景仍按首屏可见高度：
 * aspect 用可见区域，setViewOffset 把视锥往下延长，上面那部分画面和原来完全一样。
 * 在主循环之后、渲染之前跑；R3F 改尺寸时会重置 aspect，所以每帧检查。
 */
function HeroViewExtend() {
  const { camera, gl, size } = useThree();
  const chrome = useRef<HTMLElement | null>(null);
  useFrame(() => {
    const persp = camera as THREE.PerspectiveCamera;
    chrome.current ??= gl.domElement.closest('.hv-hero')?.querySelector<HTMLElement>('.hv-chrome') ?? null;
    const visible = Math.min(size.height, chrome.current?.clientHeight || size.height);
    const width = size.width;
    const view = persp.view;
    if (visible >= size.height - 0.5) {
      if (view?.enabled) persp.clearViewOffset();
      return;
    }
    const aspect = width / visible;
    if (view?.enabled && view.fullHeight === visible && view.height === size.height && view.fullWidth === width && persp.aspect === aspect) return;
    persp.aspect = aspect;
    persp.setViewOffset(width, visible, 0, 0, width, size.height);
  });
  return null;
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
  /** draw 阶段画的翅膀笔迹（DrawWingsPaper 的画布） */
  paperArt: React.MutableRefObject<HTMLCanvasElement | null>;
};

/**
 * 首屏 3D 舞台：直播间同款 HDR 天空 + 场景文件的灯光 / 景深 + Bloom + 全局调色（LUT），
 * corynorootbone 开场表演。用 FlightCanvas 挂载，纸飞机光标可以飞进这个场景绕角色一圈。
 */
export const OpeningStage3D = memo(function OpeningStage3D({ clock, onReady, onFail, running, hole, paperArt }: OpeningStage3DProps) {
  const [look] = useState(() => loadVrmLookSettings(LIVE_VRM_LOOK_STORAGE_KEY, DEFAULT_LIVE_VRM_LOOK));
  const cameraState = useRef<SceneCamera>({ ...HERO_CAMERA, ...NO_DOF, target: HERO_CAMERA.target });
  const lying = useRef<GroundResult | null>(null);
  // 场景光倍率（开发时 ?tune=grade 调，正式构建恒为 1）
  const scene = useSceneTuning();
  const bloom = liveBloom(look);
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
          environmentIntensity={HERO_LIGHTING.environmentIntensity * scene.env}
          backgroundIntensity={HERO_LIGHTING.backgroundIntensity * scene.sky}
          fogDensity={HERO_LIGHTING.fogDensity}
        />
      </Suspense>
      <HeroLights lighting={HERO_LIGHTING} clock={clock} />
      <BlackFrame hole={hole} />
      <PaperSheet3D clock={clock} art={paperArt} lying={lying} hole={hole} />
      <Suspense fallback={null}>
        <OpeningAvatar clock={clock} onReady={onReady} onFail={onFail} cameraState={cameraState} hole={hole} lying={lying} />
      </Suspense>
      <HeroViewExtend />
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <>
          <HeroDepthOfField cameraState={cameraState} />
          <Bloom {...bloom} intensity={bloom.intensity * scene.bloom} luminanceThreshold={bloom.luminanceThreshold * scene.bloomThreshold} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.LINEAR} />
          <AppColorGradeLutPass forceWebGl includeTone />
          <SkyEdgeEffect hole={hole} />
        </>
      </EffectComposer>
    </FlightCanvas>
  );
});
