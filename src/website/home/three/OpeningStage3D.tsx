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
import { groundOpeningClips, type GroundResult } from './openingGround';
import { PAPER_HEIGHT, PAPER_RATIO, PAPER_WIDTH, paperPlacement } from './paperFrame';
import { PAPER_TEXTURE_HEIGHT, PAPER_TEXTURE_WIDTH, captureSleepOutline, type SketchOutline } from './captureOutline';
import { createFoldingPaper } from './foldingPaper';
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
  { t: 0, anchor: 'paper', pos: [0, 0, 0], look: 'paper', lookOff: [0, 0, 0], fov: 32, fitPaper: true },
  // DOM 纸淡出期间镜头不动，两张纸叠得住
  { t: 1.0, anchor: 'paper', pos: [0, 0, 0], look: 'paper', lookOff: [0, 0, 0], fov: 32, fitPaper: true },
  { t: OPENING.standStart, anchor: 'hips', pos: [0, 2.6, 0.35], look: 'hips', lookOff: [0, 0, 0.1], fov: 32 },
  { t: OPENING.standStart + 1.2, anchor: 'hips', pos: [0.3, 2.2, 1.6], look: 'chest', lookOff: [0, 0.05, 0], fov: 33 },
  // Stand Up：镜头随站起转到正面
  { t: OPENING.standStart + 2.9, anchor: 'hips', pos: [0.35, 1.5, 2.6], look: 'chest', lookOff: [0, 0.12, 0], fov: 32 },
  // 站稳后拉开、略俯视：脚下那张纸折成纸飞机的过程要在画面里
  { t: OPENING.wakeEnd, anchor: 'hips', pos: [0.45, 1.55, 3.0], look: 'hips', lookOff: [0.1, -0.35, 0.45], fov: 38 },
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

type AvatarProps = {
  clock: OpeningClock; onReady: () => void; onFail: (error: unknown) => void; cameraState: CameraStateRef;
  hole: React.MutableRefObject<HoleRect>; lying: React.MutableRefObject<GroundResult | null>;
  onSketch: (sketch: SketchOutline) => void;
};

function OpeningAvatar({ clock, onReady, onFail, cameraState, hole, lying, onSketch }: AvatarProps) {
  const gltf = useLoader(GLTFLoader, HOME_OPENING_MODEL, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });
  const vrm = (gltf as { userData: { vrm: VRM } }).userData.vrm;
  const { camera, gl } = useThree();

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
        const sleepTime = motionTime('sleep', 0, sleepDuration);
        lying.current = groundOpeningClips(vrm, mixer, actions, sleepTime);
        // 纸上的铅笔稿直接从这个睡姿拍出来：与 wake 那一刻的 3D 角色严丝合缝
        if (lying.current && actions.sleep) {
          for (const action of Object.values(actions)) action?.setEffectiveWeight(action === actions.sleep ? 1 : 0);
          actions.sleep.time = sleepTime;
          mixer.update(0);
          // 动作写在 normalized 骨骼上，蒙皮用的是 raw 骨骼：要先同步一次，否则拍到的是 T-pose
          vrm.humanoid.update();
          vrm.scene.updateMatrixWorld(true);
          try {
            const sketch = captureSleepOutline(gl, vrm, paperPlacement(lying.current));
            lying.current.sketch = sketch;
            onSketch(sketch);
          } catch (error) {
            console.warn('[website-opening] sketch capture failed', error);
          }
        }
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
  }, [clock, gl, lying, onFail, onReady, onSketch, vrm]);

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
    up: new THREE.Vector3(0, 1, 0), side: new THREE.Vector3(), snapped: false,
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
    boneWorld(key.look, look).add(pool.anchor.set(key.lookOff[0], key.lookOff[1], key.lookOff[2]));
    const pose = lying.current;
    if (key.fitPaper && pose) {
      // 正上方俯视纸面：距离取「整张纸占视口 paperFill」，画面上方 = 头的方向（与纸面图片上方一致），
      // 再按 DOM 纸偏离视口中心的像素平移，两张纸在交接时完全叠住
      const fill = Math.max(0.3, pose.paperFill ?? 1);
      const perPx = PAPER_HEIGHT / (fill * window.innerHeight);
      const screenUp = pose.headDir;
      const screenRight = pool.side.set(0, -1, 0).cross(screenUp);
      boneWorld('paper', look)
        .addScaledVector(screenRight, -(pose.paperShift?.x ?? 0) * perPx)
        .addScaledVector(screenUp, (pose.paperShift?.y ?? 0) * perPx);
      pos.copy(look).addScaledVector(screenUp, -0.02);
      pos.y += (PAPER_HEIGHT / fill) / 2 / Math.tan(THREE.MathUtils.degToRad(key.fov) / 2);
    }
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
        headDir: lying.current?.headDir.toArray().map((v) => Number(v.toFixed(3))),
        paper: lying.current?.paper?.toArray().map((v) => Number(v.toFixed(3))),
        camRight: new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).toArray().map((v) => Number(v.toFixed(3))),
        camUp: new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).toArray().map((v) => Number(v.toFixed(3))),
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
/**
 * fold：角色站起来以后，纸从地上飘起来按真实折法折成纸飞机（foldingPaper），
 * 一边折一边缩小、飞到镜头前的起飞点，再沿弧线钻进手机窗，开窗白闪前一刻消失。
 */
const FOLD_SECONDS = 1.2;
const FLY_END = OPENING.openStart + 0.15;
/** 折好后纸飞机相对整张纸的大小 */
const PLANE_SCALE = 0.2;
/** 纸飞机起飞点与弧线控制点（相机空间，米） */
const FLY_START = new THREE.Vector3(0.32, -0.3, -1.5);
const FLY_CONTROL = new THREE.Vector3(0.75, 0.42, -2.6);
const FLY_DEPTH = 7;

function PaperSheet3D({ clock, art, lying, hole }: {
  clock: OpeningClock;
  art: React.MutableRefObject<HTMLCanvasElement | null>;
  lying: React.MutableRefObject<GroundResult | null>;
  hole: React.MutableRefObject<HoleRect>;
}) {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const [hold] = useState(readHoldTime);
  const parts = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = PAPER_TEXTURE_WIDTH;
    canvas.height = PAPER_TEXTURE_HEIGHT;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide, fog: false });
    const paper = createFoldingPaper(material, PAPER_WIDTH, PAPER_HEIGHT);
    return { texture, material, paper, ctx: canvas.getContext('2d'), sheet: null as HTMLImageElement | null, sketched: false, stamped: false };
  }, []);
  const pool = useMemo(() => ({
    start: new THREE.Vector3(), control: new THREE.Vector3(), end: new THREE.Vector3(),
    pos: new THREE.Vector3(), tangent: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3(),
    basis: new THREE.Matrix4(), flightQuat: new THREE.Quaternion(), bankQuat: new THREE.Quaternion(),
    tail: new THREE.Vector3(), nose: new THREE.Vector3(0, 1, 0),
  }), []);
  const placement = useRef<ReturnType<typeof paperPlacement> | null>(null);
  useEffect(() => {
    const image = new Image();
    image.onload = () => { parts.sheet = image; };
    image.src = HOME_ASSETS.opening.paperSheet;
  }, [parts]);
  useEffect(() => () => {
    parts.texture.dispose();
    parts.material.dispose();
    parts.paper.dispose();
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
  /** 二次贝塞尔：位置与切线 */
  const bezier = (u: number) => {
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    pool.pos.set(0, 0, 0).addScaledVector(pool.start, a).addScaledVector(pool.control, b).addScaledVector(pool.end, c);
    pool.tangent.copy(pool.control).sub(pool.start).multiplyScalar(2 * (1 - u))
      .addScaledVector(pool.tail.copy(pool.end).sub(pool.control), 2 * u).normalize();
  };
  /** 机头（纸面 +y）沿切线、机背（纸面 +z）朝镜头的上方 */
  const flightOrientation = (bank: number) => {
    pool.up.setFromMatrixColumn(camera.matrixWorld, 1);
    pool.right.crossVectors(pool.tangent, pool.up).normalize();
    pool.up.crossVectors(pool.right, pool.tangent).normalize();
    pool.basis.makeBasis(pool.right, pool.tangent, pool.up);
    pool.flightQuat.setFromRotationMatrix(pool.basis);
    if (bank) pool.flightQuat.multiply(pool.bankQuat.setFromAxisAngle(pool.nose, bank));
  };

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const started = openingStarted(clock);
    const t = hold ?? openingTime(clock, performance.now());
    const pose = lying.current;
    if (pose && !placement.current) {
      placement.current = paperPlacement(pose);
      pose.paper = placement.current.center.clone();
    }
    if (pose?.sketch && parts.sheet && !parts.sketched && parts.ctx) {
      // 纸 + 从 3D 睡姿拍出来的铅笔稿（DOM 纸用的是同一组笔画）
      const { width, height } = parts.ctx.canvas;
      parts.ctx.drawImage(parts.sheet, 0, 0, width, height);
      parts.ctx.drawImage(pose.sketch.canvas, 0, 0, width, height);
      parts.sketched = true;
      parts.texture.needsUpdate = true;
    }
    if (started && pose && pose.paperFill === undefined && art.current) {
      // DOM 纸的画布就是纸面大小（clientHeight 不受旋转影响）；旋转不改变中心，量它离视口中心多远
      pose.paperFill = art.current.clientHeight / Math.max(1, window.innerHeight);
      const rect = art.current.getBoundingClientRect();
      pose.paperShift = new THREE.Vector2(rect.left + rect.width / 2 - window.innerWidth / 2, rect.top + rect.height / 2 - window.innerHeight / 2);
    }
    if (started && parts.sketched && !parts.stamped && art.current && parts.ctx) {
      // 用户画的翅膀盖到纸面贴图上（笔迹之后不再变，只盖一次）
      parts.ctx.drawImage(art.current, 0, 0, parts.ctx.canvas.width, parts.ctx.canvas.height);
      parts.stamped = true;
      parts.texture.needsUpdate = true;
    }
    const F = OPENING.wakeEnd;
    const flyStart = F + FOLD_SECONDS;
    g.visible = started && !!placement.current && t < FLY_END;
    if (!g.visible || !placement.current) return;

    camera.updateMatrixWorld();
    fromCamera(FLY_START, pool.start);
    fromCamera(FLY_CONTROL, pool.control);
    windowTarget(pool.end);

    // 三步折叠：角 → 对折 → 翻翼（彼此稍有重叠，动作连贯）
    parts.paper.setFold(
      smoothstep(F + 0.05, F + 0.45, t),
      smoothstep(F + 0.4, F + 0.85, t),
      smoothstep(F + 0.8, F + FOLD_SECONDS, t),
    );
    if (t < flyStart) {
      // 一边折一边从地上飘到起飞点，缩成纸飞机大小
      const m = smoothstep(F, flyStart, t);
      bezier(0);
      flightOrientation(0);
      g.position.copy(placement.current.center).lerp(pool.start, m);
      g.position.y += Math.sin(m * Math.PI) * 0.25;
      g.quaternion.copy(placement.current.groupQuaternion).slerp(pool.flightQuat, smoothstep(0.15, 1, m));
      g.scale.setScalar(1 - (1 - PLANE_SCALE) * smoothstep(0, 0.8, m));
      return;
    }
    // 沿弧线飞进窗口，飞行中轻轻侧倾
    const u = smoothstep(flyStart, FLY_END, t);
    bezier(u);
    flightOrientation(Math.sin(u * Math.PI * 2) * 0.35);
    g.position.copy(pool.pos);
    g.quaternion.copy(pool.flightQuat);
    g.scale.setScalar(PLANE_SCALE);
  });
  return (
    <group ref={group} visible={false}>
      <primitive object={parts.paper.root} />
    </group>
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
  /** 从 3D 睡姿拍出的铅笔稿就绪：DOM 纸换上同一张线稿与画翅膀引导 */
  onSketch: (sketch: SketchOutline) => void;
};

/**
 * 首屏 3D 舞台：直播间同款 HDR 天空 + 场景文件的灯光 / 景深 + Bloom + 全局调色（LUT），
 * corynorootbone 开场表演。用 FlightCanvas 挂载，纸飞机光标可以飞进这个场景绕角色一圈。
 */
export const OpeningStage3D = memo(function OpeningStage3D({ clock, onReady, onFail, running, hole, paperArt, onSketch }: OpeningStage3DProps) {
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
        <OpeningAvatar clock={clock} onReady={onReady} onFail={onFail} cameraState={cameraState} hole={hole} lying={lying} onSketch={onSketch} />
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
