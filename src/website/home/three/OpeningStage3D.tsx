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
import { CinematicLayer, hermite, lerpFPS } from './cameraRig';
import { WEBSITE_SKY_HDR } from '../../sky';
import heroSceneJson from '../heroScene.json';
import {
  OPENING,
  OPENING_MOTION,
  OPENING_TOTAL,
  OPENING_ACT2,
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
  /** 窗口蓝框的不透明度：画在 3D 黑幕上（角色身后），不再用 DOM 描边盖住角色 */
  border: number;
};

/** paper = 3D 纸面中心（开场第一镜）；fold = 第二幕折纸飞机的位置 */
type Anchor = VRMHumanBoneName | 'origin' | 'world' | 'paper' | 'fold';

type DofState = Pick<SceneCamera, 'dofEnabled' | 'focusMode' | 'focusDistance' | 'focusRange' | 'blur' | 'target'> & {
  /** 对焦跟着某个锚点走（拉焦用），优先于 target */
  focusAnchor?: Anchor;
};

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
  /** fitPaper 的距离倍数（<1 = 推近） */
  fitScale?: number;
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
/** 英雄停顿与拉焦的景深（导演流程 1-5、2-1、2-2） */
const FACE_DOF: DofState = { dofEnabled: true, focusMode: 'target', focusDistance: 2, focusRange: 0.45, blur: 1.1, target: [0, 1.4, 0], focusAnchor: 'head' };
const FOLD_DOF: DofState = { dofEnabled: true, focusMode: 'target', focusDistance: 1, focusRange: 0.35, blur: 1.4, target: [0, 1, 0], focusAnchor: 'fold' };

/**
 * 分镜（docs/website-opening-director.md 第 3 节）。关键帧之间用三次 Hermite 插值（cameraRig），
 * 经过关键帧速度连续；相邻两帧相同 = hold。
 */
const A = OPENING.standStart;
const W = OPENING.wakeEnd;
const R = OPENING_ACT2;
const CAMERA_KEYS: CameraKey[] = [
  // 0 / 1-1 纸面交接与显形：长焦、远机位正俯视（透视视差小，3D 角色与纸上的铅笔稿始终重合）；
  // DOM 纸淡出期间不动，之后只极慢地推近一点，等身体完全显形再动
  { t: 0, anchor: 'paper', pos: [0, 0, 0], look: 'paper', lookOff: [0, 0, 0], fov: 16, fitPaper: true },
  { t: 0.7, anchor: 'paper', pos: [0, 0, 0], look: 'paper', lookOff: [0, 0, 0], fov: 16, fitPaper: true },
  { t: 2.1, anchor: 'paper', pos: [0, 0, 0], look: 'paper', lookOff: [0, 0, 0], fov: 16, fitPaper: true, fitScale: 0.86 },
  // 1-2 翻身：绕身体转 30° 并降低机位（与翻身同向）
  { t: A + 1.1, anchor: 'hips', pos: [0.95, 1.3, 1.05], look: 'chest', lookOff: [0, 0.02, 0], fov: 38 },
  // 1-3 坐起：低机位 3/4 侧面仰拍，镜头跟着她后退升起（不正对双腿）
  { t: A + 2.7, anchor: 'hips', pos: [1.45, 0.18, 0.95], look: 'head', lookOff: [0, 0.05, 0], fov: 44 },
  { t: A + 4.1, anchor: 'hips', pos: [1.6, 0.12, 1.45], look: 'head', lookOff: [0, 0.02, 0], fov: 40 },
  // 1-4 站起：升到眼平，同时环绕约 15°，速度不停
  { t: A + 5.5, anchor: 'head', pos: [0.55, -0.05, 1.7], look: 'head', lookOff: [0, -0.02, 0], fov: 34 },
  // 1-5 英雄停顿：静止一拍，再极慢推进
  { t: A + 5.95, anchor: 'head', pos: [0.55, -0.05, 1.7], look: 'head', lookOff: [0, -0.02, 0], fov: 34, dof: FACE_DOF },
  { t: W + 0.3, anchor: 'head', pos: [0.47, -0.05, 1.48], look: 'head', lookOff: [0, -0.02, 0], fov: 30, dof: FACE_DOF },
  // 2-1 纸从脚下慢慢飘起：镜头从正面绕到她右侧（侧面：人与纸同框），再绕到右肩后
  { t: R.riseStart + 0.7, anchor: 'head', pos: [1.05, 0.02, 0.95], look: 'head', lookOff: [0, -0.15, 0.25], fov: 34, dof: FACE_DOF },
  { t: R.foldStart, anchor: 'head', pos: [2.7, 0.45, 0.95], look: 'fold', lookOff: [-0.3, 0.85, -0.35], fov: 46, dof: FOLD_DOF },
  // 2-2 高位 3/4 后侧：越过翅膀与右肩，看她右前方地上的纸一折一折慢慢折成纸飞机；她和纸同框，焦点在纸上
  { t: R.foldStart + 1.0, anchor: 'head', pos: [1.1, 0.75, -1.9], look: 'fold', lookOff: [-0.3, 0.85, -0.3], fov: 46, dof: FOLD_DOF },
  { t: R.flyStart, anchor: 'head', pos: [1.0, 0.7, -1.75], look: 'fold', lookOff: [-0.25, 0.8, -0.1], fov: 44, dof: FOLD_DOF },
  // 2-3 纸飞机越过她飞进窗口：镜头留在她身后、略后退，视线跟着飞机往前
  { t: OPENING.openStart, anchor: 'hips', pos: [-0.25, 1.55, -2.3], look: 'chest', lookOff: [0, 0.15, 1.5], fov: 38 },
  // open 白闪后冲进窗口对面的世界：镜头退到角色后上方，环绕（与旧版一致）
  { t: OPENING.openStart + 1.3, anchor: 'hips', pos: [-0.5, 1.3, -2.3], look: 'chest', lookOff: [0, 0.1, 0], fov: 40 },
  { t: OPENING_MOTION.introEndStart, anchor: 'hips', pos: [1.9, 1.0, -1.1], look: 'head', lookOff: [0, -0.05, 0], fov: 34 },
  // 04 定格：场景文件里的相机（含景深）
  // 绕到她右前方再落到定格镜头：直线过去会穿过头发
  { t: OPENING_MOTION.lockStart + 0.35, anchor: 'head', pos: [1.25, 0.2, 0.85], look: 'head', lookOff: [0, -0.05, 0], fov: 32 },
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
    up: new THREE.Vector3(0, 1, 0), side: new THREE.Vector3(), prevPos: new THREE.Vector3(), snapped: false,
  }), []);

  // 相机曲线的工作区：每帧把各关键帧解析成世界坐标，再按通道做 Hermite 插值
  const rig = useMemo(() => ({
    times: CAMERA_KEYS.map((key) => key.t),
    /** 开窗之前用 Hermite；开窗之后保持原来的分段运镜（R9：那段镜头不改） */
    preTimes: CAMERA_KEYS.filter((key) => key.t <= OPENING.openStart).map((key) => key.t),
    fov: CAMERA_KEYS.map((key) => key.fov),
    channels: Array.from({ length: 6 }, () => new Array<number>(CAMERA_KEYS.length).fill(0)),
    pos: CAMERA_KEYS.map(() => new THREE.Vector3()),
    look: CAMERA_KEYS.map(() => new THREE.Vector3()),
    layer: new CinematicLayer(),
    speed: 0,
    focus: [0, 0, 0] as [number, number, number],
  }), []);

  const boneWorld = (name: Anchor, out: THREE.Vector3): THREE.Vector3 => {
    if (name === 'origin' || name === 'world') return out.set(0, 0, 0);
    if (name === 'paper') return lying.current?.paper ? out.copy(lying.current.paper) : boneWorld('hips', out);
    if (name === 'fold') return lying.current?.foldPoint ? out.copy(lying.current.foldPoint) : boneWorld('chest', out);
    const node = vrm.humanoid?.getRawBoneNode(name) ?? vrm.humanoid?.getNormalizedBoneNode(name);
    if (!node) return out.set(0, 1, 0);
    return node.getWorldPosition(out);
  };

  /** 相机跟的骨骼锚点先做低通（约 0.25 s）：镜头跟着人走，但不跟着骨骼抖 */
  const smoothedAnchors = useMemo(() => new Map<Anchor, THREE.Vector3>(), []);
  const updateAnchors = (delta: number, snap: boolean) => {
    for (const name of ['hips', 'chest', 'head'] as const) {
      const raw = boneWorld(name, pool.anchor);
      let value = smoothedAnchors.get(name);
      if (!value) { value = raw.clone(); smoothedAnchors.set(name, value); }
      if (snap) value.copy(raw);
      else value.lerp(raw, 1 - Math.pow(1 - 0.12, delta * 60));
    }
  };
  const anchorWorld = (name: Anchor, out: THREE.Vector3) => {
    const smoothed = smoothedAnchors.get(name);
    return smoothed ? out.copy(smoothed) : boneWorld(name, out);
  };

  const applyKey = (key: CameraKey, pos: THREE.Vector3, look: THREE.Vector3) => {
    anchorWorld(key.anchor, pos).add(pool.anchor.set(key.pos[0], key.pos[1], key.pos[2]));
    anchorWorld(key.look, look).add(pool.anchor.set(key.lookOff[0], key.lookOff[1], key.lookOff[2]));
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
      pos.y += (key.fitScale ?? 1) * (PAPER_HEIGHT / fill) / 2 / Math.tan(THREE.MathUtils.degToRad(key.fov) / 2);
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
    applyIntroTimeline(materialize, introSeconds, true);
    const introRunning = introSeconds < INTRO_TOTAL_SECONDS;
    // 官网开场用 quiet 物化：线框与笔记都不出现
    introWire.current?.setVisible(false);
    introCage.visible = false;
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

    // 相机（cameraRig）：分镜关键帧 → Hermite 曲线（速度连续）→ igloo 式附加层（视差 / 手持 / 滚转）
    updateAnchors(delta, !pool.snapped || jumped);
    const keys = CAMERA_KEYS;
    for (let k = 0; k < keys.length; k += 1) {
      applyKey(keys[k], rig.pos[k], rig.look[k]);
      for (let c = 0; c < 3; c += 1) {
        rig.channels[c][k] = rig.pos[k].getComponent(c);
        rig.channels[c + 3][k] = rig.look[k].getComponent(c);
      }
    }
    // 当前所在的分镜段
    let index = 0;
    while (index < keys.length - 2 && t >= keys[index + 1].t) index += 1;
    const a = keys[index];
    const b = keys[Math.min(index + 1, keys.length - 1)];
    const u = smoothstep(a.t, b.t, t);
    let fov: number;
    if (t < OPENING.openStart) {
      const T = rig.preTimes;
      pool.targetPos.set(hermite(T, rig.channels[0], t), hermite(T, rig.channels[1], t), hermite(T, rig.channels[2], t));
      pool.targetLook.set(hermite(T, rig.channels[3], t), hermite(T, rig.channels[4], t), hermite(T, rig.channels[5], t));
      fov = hermite(T, rig.fov, t);
    } else {
      pool.targetPos.copy(rig.pos[index]).lerp(rig.pos[Math.min(index + 1, keys.length - 1)], u);
      pool.targetLook.copy(rig.look[index]).lerp(rig.look[Math.min(index + 1, keys.length - 1)], u);
      fov = THREE.MathUtils.lerp(a.fov, b.fov, u);
    }
    if (s.debug.cam) {
      const c = s.debug.cam;
      pool.targetPos.copy(pool.targetLook).add(pool.anchor.set(c[0], c[1], c[2]));
      fov = c[6];
    }
    const near = THREE.MathUtils.lerp(a.near ?? 0.05, b.near ?? 0.05, u);

    const perspective = camera as THREE.PerspectiveCamera;
    const pullback = portraitPullback(perspective.aspect, t);
    pool.anchor.copy(pool.targetPos).sub(pool.targetLook);
    const extraFocusDistance = pool.anchor.length() * pullback;
    pool.targetPos.addScaledVector(pool.anchor, pullback);
    // Keep the character above the mobile title and action bar.
    const portraitLift = Math.min(1, pullback) * 0.1;
    pool.targetPos.y -= portraitLift;
    pool.targetLook.y -= portraitLift;

    // 速度感：机位移动越快 fov 略微张开（igloo 按滚动速度加宽）
    const speed = pool.snapped && !jumped && delta > 0 ? pool.prevPos.distanceTo(pool.targetPos) / delta : 0;
    rig.speed = lerpFPS(rig.speed, Math.min(speed, 4), 0.08, delta);
    pool.prevPos.copy(pool.targetPos);
    pool.snapped = true;
    fov += Math.min(4, rig.speed * 1.4);

    // 活力：交接帧与大运动时只有基础层；英雄停顿与定格后手持 / 视差全开
    const life = t >= OPENING_TOTAL ? 1
      : 0.55 * smoothstep(0.35, 2.0, t) + 0.45 * smoothstep(A + 5.5, A + 6.0, t) * (1 - smoothstep(W + 0.6, W + 1.2, t));
    rig.layer.apply(perspective, pool.targetPos, pool.targetLook, frame.pointer, life, delta, lying.current?.headDir);
    if (Math.abs(perspective.fov - fov) > 1e-3 || Math.abs(perspective.near - near) > 1e-4) {
      perspective.fov = fov;
      perspective.near = near;
      perspective.updateProjectionMatrix();
    }

    // 景深：按段过渡；focusAnchor 让焦点跟着脸 / 纸走（拉焦）
    const dofA = a.dof ?? NO_DOF;
    const dofB = b.dof ?? NO_DOF;
    const view = cameraState.current;
    const enabled = THREE.MathUtils.lerp(dofA.dofEnabled ? 1 : 0, dofB.dofEnabled ? 1 : 0, u);
    view.dofEnabled = enabled > 0.02;
    view.blur = THREE.MathUtils.lerp(dofA.blur ?? 1.4, dofB.blur ?? 1.4, u) * enabled;
    view.focusRange = THREE.MathUtils.lerp(dofA.focusRange ?? 0.3, dofB.focusRange ?? 0.3, u);
    view.focusDistance = THREE.MathUtils.lerp(dofA.focusDistance ?? 4, dofB.focusDistance ?? 4, u) + extraFocusDistance;
    const dofNow = u < 0.5 ? dofA : dofB;
    view.focusMode = dofNow.focusMode ?? 'target';
    if (dofA.focusAnchor || dofB.focusAnchor) {
      // 两个锚点之间平滑拉焦
      anchorWorld(dofA.focusAnchor ?? dofB.focusAnchor!, pool.lookA);
      anchorWorld(dofB.focusAnchor ?? dofA.focusAnchor!, pool.lookB);
      pool.lookA.lerp(pool.lookB, u);
      pool.lookA.toArray(rig.focus);
      view.target = rig.focus;
      view.focusMode = 'target';
    } else {
      view.target = dofNow.target;
    }
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
 * fold（导演流程第二幕）：英雄停顿后，脚下那张纸飘起到她身前（2-1，镜头下摇 + 拉焦），
 * 在特写里按真实折法四拍折成纸飞机（2-2），折好立刻起飞（2-3 甩镜），沿弧线钻进手机窗（2-4 后拉揭示）。
 */

const FLY_END = OPENING.openStart + 0.15;
/** 在地上折的那张纸相对整张纸的大小（纸宽 1.95 m → 约 0.5 m，接近一张大号作业纸） */
const FOLD_SCALE = 0.26;
/** 折纸时机头的水平方向（她面朝 +Z）：右前方 */
const FOLD_NOSE = { x: 0.9, z: 0.45 } as const;
const FLY_DEPTH = 7;
/** 瞄准手机窗靠右的位置，不从角色身后穿过去 */
const WINDOW_AIM_X = 0.6;

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
    // 交接时与 DOM 纸一样纯白；DOM 淡出后慢慢压到略低于纯白，镜头贴近时不被 bloom 吹成一片白
    // alphaTest：纸外的透明边和打孔的黑洞都镂空（不然纸飞机边上一圈黑）
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide, fog: false, vertexColors: true, alphaTest: 0.5 });
    const paper = createFoldingPaper(material, PAPER_WIDTH, PAPER_HEIGHT);
    return { texture, material, paper, ctx: canvas.getContext('2d'), sheet: null as HTMLCanvasElement | null, sketched: false, stamped: false };
  }, []);
  const pool = useMemo(() => ({
    anchor: new THREE.Vector3(), start: new THREE.Vector3(), control: new THREE.Vector3(), end: new THREE.Vector3(),
    pos: new THREE.Vector3(), tangent: new THREE.Vector3(), tail: new THREE.Vector3(), up: new THREE.Vector3(), right: new THREE.Vector3(),
    basis: new THREE.Matrix4(), flightQuat: new THREE.Quaternion(), bankQuat: new THREE.Quaternion(), nose: new THREE.Vector3(0, 1, 0),
    foldQuat: new THREE.Quaternion(), euler: new THREE.Euler(),
    light: new THREE.Vector3(),
  }), []);
  const placement = useRef<ReturnType<typeof paperPlacement> | null>(null);
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      // 纸张图里的打孔是黑色像素：抠成透明，纸飞机折起来也不会露出黑洞
      const sheet = document.createElement('canvas');
      sheet.width = image.naturalWidth;
      sheet.height = image.naturalHeight;
      const ctx = sheet.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, sheet.width, sheet.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const luma = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        if (luma < 70) px[i + 3] = 0;
      }
      ctx.putImageData(data, 0, 0);
      parts.sheet = sheet;
    };
    image.src = HOME_ASSETS.opening.paperSheet;
  }, [parts]);
  useEffect(() => () => {
    parts.texture.dispose();
    parts.material.dispose();
    parts.paper.dispose();
  }, [parts]);

  /** 手机窗中心方向上、相机前方 FLY_DEPTH 米的点（窗口还没完全回来也按它的最终位置瞄准） */
  const windowTarget = (out: THREE.Vector3) => {
    const rect = hole.current;
    const bounds = gl.domElement.getBoundingClientRect();
    const ndcX = ((rect.x + rect.w * WINDOW_AIM_X - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
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
  /** 机头（纸面 +y）沿切线、机背（纸面 +z）朝上 */
  const flightOrientation = (bank: number) => {
    pool.up.set(0, 1, 0);
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
    parts.material.color.setScalar(1 - 0.14 * smoothstep(0.8, 2.2, t));
    const F = OPENING_ACT2.riseStart;
    const foldStart = OPENING_ACT2.foldStart;
    const flyStart = OPENING_ACT2.flyStart;
    g.visible = started && !!placement.current && t < FLY_END;
    if (!g.visible || !placement.current) return;
    if (t < F) {
      // 平铺在地上
      g.position.copy(placement.current.center);
      g.quaternion.copy(placement.current.groupQuaternion);
      g.scale.setScalar(1);
      parts.paper.setFold(0, 0, 0, 0);
      return;
    }

    camera.updateMatrixWorld();
    // 折纸点：她脚前方的地面（openingGround），机头朝她的右前方——镜头在她右肩后，看到的是纸飞机的侧面
    pool.anchor.copy(pose?.foldPoint ?? placement.current.center);
    pool.nose.set(FOLD_NOSE.x, 0, FOLD_NOSE.z).normalize();
    pool.foldQuat.setFromEuler(pool.euler.set(-Math.PI / 2, 0, Math.atan2(-pool.nose.x, -pool.nose.z), 'XYZ'));
    pool.nose.set(0, 1, 0);

    // 在地上四拍慢慢折：角 → 鼻 → 对折 → 翻翼（折完留一小拍再起飞）
    const foldEnd = flyStart - 0.25;
    const beat = (foldEnd - foldStart) / 4;
    const steps = [0, 1, 2, 3].map((k) => smoothstep(foldStart + k * beat, foldStart + (k + 1) * beat - 0.06, t));
    pool.light.copy(camera.position);
    g.worldToLocal(pool.light).normalize();
    parts.paper.setFold(steps[0], steps[1], steps[2], steps[3], pool.light);

    if (t < flyStart) {
      // 从她脚下滑出来、贴着地面缩成一张小纸，转到折纸的朝向
      const m = smoothstep(F, foldStart, t);
      g.position.lerpVectors(placement.current.center, pool.anchor, m);
      g.position.y = 0.006 + Math.sin(m * Math.PI) * 0.05;
      g.quaternion.slerpQuaternions(placement.current.groupQuaternion, pool.foldQuat, m);
      g.scale.setScalar(1 - (1 - FOLD_SCALE) * m);
      return;
    }
    // 起飞：先从地上抬起来，再沿弧线钻进窗口；机头在头 0.45 s 里转向飞行方向
    pool.start.copy(pool.anchor).setY(0.05);
    windowTarget(pool.end);
    pool.control.copy(pool.start).lerp(pool.end, 0.3);
    pool.control.y += 0.8;
    const x = Math.min(1, Math.max(0, (t - flyStart) / (FLY_END - flyStart)));
    const u = 1 - (1 - x) * (1 - x);
    bezier(u);
    flightOrientation(Math.sin(u * Math.PI * 2) * 0.3);
    g.position.copy(pool.pos);
    g.quaternion.copy(pool.foldQuat).slerp(pool.flightQuat, smoothstep(flyStart, flyStart + 0.45, t));
    g.scale.setScalar(FOLD_SCALE * (1 - 0.4 * u));
  });
  return (
    <group ref={group} visible={false}>
      <primitive object={parts.paper.mesh} />
    </group>
  );
}

/** 场景文件里的三盏灯：与 SceneEditorLights 同一套参数，去掉编辑手柄 */
const HeroLights = memo(function HeroLights({ lighting, clock }: { lighting: SceneLighting; clock: OpeningClock }) {
  const debutRim = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    if (!debutRim.current) return;
    const t = openingTime(clock, performance.now());
    // 苏醒的轮廓光（导演流程 1-3 → 1-4 升起，英雄停顿后收）+ 定格时的一次出场光
    const wake = openingStarted(clock) ? 0.55 * smoothstep(OPENING.standStart + 1.1, OPENING.standStart + 5.0, t) * (1 - smoothstep(OPENING.wakeEnd + 0.4, OPENING.wakeEnd + 1.4, t)) : 0;
    debutRim.current.intensity = clock.ready ? Math.max(wake, 0.35 * debutEnvelope(t - OPENING_TOTAL)) : 0;
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
    uniforms: {
      uRect: { value: new THREE.Vector4(-2, -2, 2, 2) }, uDistance: { value: FRAME_DISTANCE }, uFeather: { value: 0.002 },
      uPx: { value: new THREE.Vector2(0.001, 0.001) }, uThickness: { value: 12 }, uBorder: { value: 0 },
    },
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
      uniform vec2 uPx;
      uniform float uThickness;
      uniform float uBorder;
      varying vec2 vNdc;
      void main() {
        vec2 inside = smoothstep(uRect.xy - uFeather, uRect.xy + uFeather, vNdc) * (1.0 - smoothstep(uRect.zw - uFeather, uRect.zw + uFeather, vNdc));
        float hole = inside.x * inside.y;
        if (hole > 0.999) discard;
        // 窗口外缘到这里的像素距离：蓝框 = 一圈实心 + 外发光（与原 DOM 描边同色同粗）
        vec2 q = max(uRect.xy - vNdc, vNdc - uRect.zw) / uPx;
        float d = length(max(q, 0.0));
        float ring = 1.0 - smoothstep(uThickness - 1.0, uThickness + 1.0, d);
        float glow = exp(-max(d - uThickness, 0.0) / (uThickness * 1.4)) * 0.55;
        vec3 blue = vec3(0.447, 0.835, 0.996);
        float a = clamp(ring + glow * (1.0 - ring), 0.0, 1.0) * uBorder;
        gl_FragColor = vec4(blue * a, 1.0 - hole);
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
    material.uniforms.uPx.value.set(2 / Math.max(1, bounds.width), 2 / Math.max(1, bounds.height));
    // 原 DOM 描边：684 宽的窗口里 17 单位粗
    material.uniforms.uThickness.value = Math.max(2, rect.w * (17 / 684) * r);
    material.uniforms.uBorder.value = rect.border;
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
