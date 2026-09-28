import * as THREE from 'three';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
  type VRMAnimation,
} from '@pixiv/three-vrm-animation';
import { remapAnimationToVrm } from './retarget';
import type { RetargetReport } from './types';

export type MotionFormat = 'fbx' | 'bvh' | 'vrma' | 'gltf' | 'unknown';

export function detectMotionFormat(filenameOrUrl: string): MotionFormat {
  const lower = filenameOrUrl.toLowerCase();
  if (lower.endsWith('.fbx')) return 'fbx';
  if (lower.endsWith('.bvh')) return 'bvh';
  if (lower.endsWith('.vrma')) return 'vrma';
  if (lower.endsWith('.glb') || lower.endsWith('.gltf')) return 'gltf';
  return 'unknown';
}

type Vrm = {
  scene: THREE.Object3D;
  meta?: { metaVersion?: string };
  humanoid?: { getNormalizedBoneNode: (name: string) => THREE.Object3D | null };
  lookAt?: unknown;
};

export type LoadedMotion = {
  clip: THREE.AnimationClip;
  /**
   * Source skeleton container if the loader produced one. Available for FBX and
   * BVH; null for VRMA (clip is already targeted at VRM humanoid).
   */
  source: (THREE.Object3D & { animations?: THREE.AnimationClip[] }) | null;
  /** Set on VRMA so the renderer knows no further retarget is needed. */
  preTargeted: boolean;
  format: MotionFormat;
};

export async function loadMotion(url: string, format?: MotionFormat): Promise<LoadedMotion> {
  const detected = format ?? detectMotionFormat(url);
  switch (detected) {
    case 'fbx':
      return loadFbx(url);
    case 'bvh':
      return loadBvh(url);
    case 'vrma':
      return loadVrma(url);
    case 'gltf':
      return loadGltf(url);
    default:
      throw new Error(`Unsupported motion format for "${url}"`);
  }
}

const BODY_CLIP_SKIP = /camera|t-?pose/i;
const MIN_BODY_CLIP_DURATION = 1e-3;

function clipHasBodyMotion(clip: THREE.AnimationClip) {
  if (clip.duration < MIN_BODY_CLIP_DURATION) return false;
  const quatTrack = clip.tracks.find((track) => track.name.endsWith('.quaternion'));
  if (!quatTrack?.times?.length) return false;
  return quatTrack.times.length >= 2 || clip.duration >= MIN_BODY_CLIP_DURATION;
}

/** Pick the skeleton body clip from multi-stack FBX/GLB (Blender exports). */
export function pickBodyMotionClipIndex(clips: THREE.AnimationClip[]): number | undefined {
  if (!clips?.length) return undefined;

  const baseCandidates = clips
    .map((clip, index) => ({ clip, index }))
    .filter(({ clip }) => !BODY_CLIP_SKIP.test(clip.name))
    .filter(({ clip }) => clip.tracks.some((track) => track.name.endsWith('.quaternion')));

  if (!baseCandidates.length) return 0;

  let candidates = baseCandidates.filter(({ clip }) => clipHasBodyMotion(clip));
  if (!candidates.length) candidates = baseCandidates;

  // Prefer the longest body clip — e.g. step2.fbx `step2|ArmatureAction` (2.5s),
  // not zero-length stubs or shorter Armature.001Action takes.
  candidates.sort((a, b) => {
    if (b.clip.duration !== a.clip.duration) return b.clip.duration - a.clip.duration;
    const quatCount = (clip: THREE.AnimationClip) =>
      clip.tracks.filter((track) => track.name.endsWith('.quaternion')).length;
    if (quatCount(b.clip) !== quatCount(a.clip)) return quatCount(b.clip) - quatCount(a.clip);
    const nameScore = (name: string) => (/\|ArmatureAction$/i.test(name) || /^ArmatureAction$/i.test(name) ? 1 : 0);
    return nameScore(b.clip.name) - nameScore(a.clip.name);
  });

  return candidates[0].index;
}

async function loadFbx(url: string): Promise<LoadedMotion> {
  const loader = new FBXLoader();
  const root = await loader.loadAsync(url);
  const clipIndex = pickBodyMotionClipIndex(root.animations ?? []);
  const clip =
    (typeof clipIndex === 'number' ? root.animations?.[clipIndex] : undefined) ?? root.animations?.[0];
  if (!clip) throw new Error(`FBX "${url}" has no animations`);
  return { clip, source: root, preTargeted: false, format: 'fbx' };
}

async function loadBvh(url: string): Promise<LoadedMotion> {
  const loader = new BVHLoader();
  const result = await new Promise<{ skeleton: THREE.Skeleton; clip: THREE.AnimationClip }>(
    (resolve, reject) => loader.load(url, (r) => resolve(r as never), undefined, reject),
  );
  // Build an Object3D scene around the skeleton so retarget kernel can traverse it.
  // BVHLoader returns `skeleton.bones[]` already parented per the hierarchy.
  const root = new THREE.Object3D();
  root.name = 'BVHRoot';
  if (result.skeleton.bones[0]) root.add(result.skeleton.bones[0]);
  (root as THREE.Object3D & { animations?: THREE.AnimationClip[] }).animations = [result.clip];
  return {
    clip: result.clip,
    source: root as THREE.Object3D & { animations?: THREE.AnimationClip[] },
    preTargeted: false,
    format: 'bvh',
  };
}

async function loadVrma(url: string): Promise<LoadedMotion> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrmAnimations = (gltf.userData as { vrmAnimations?: VRMAnimation[] }).vrmAnimations;
  if (!vrmAnimations?.length) throw new Error(`VRMA "${url}" has no animations`);
  // We can't bake the clip without a target VRM yet — return the VRMAnimation in `clip` via a shim.
  // Callers use `createClipForVrm()` to bake at the point of binding.
  const placeholder = new THREE.AnimationClip(`vrma:${url.split('/').pop() ?? ''}`, vrmAnimations[0].duration ?? 0, []);
  (placeholder as THREE.AnimationClip & { __vrmAnimation?: VRMAnimation }).__vrmAnimation = vrmAnimations[0];
  return { clip: placeholder, source: null, preTargeted: true, format: 'vrma' };
}

async function loadGltf(url: string): Promise<LoadedMotion> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const clip = gltf.animations?.[0];
  if (!clip) throw new Error(`glTF "${url}" has no animations`);
  const root = gltf.scene as THREE.Object3D & { animations?: THREE.AnimationClip[] };
  root.animations = gltf.animations;
  return { clip, source: root, preTargeted: false, format: 'gltf' };
}

/**
 * Bake a motion onto a VRM. For VRMA the clip is already at VRM humanoid names —
 * we just call `createVRMAnimationClip(vrmAnim, vrm)`. For FBX/BVH/GLTF we run
 * the unified retarget kernel.
 */
export function bakeMotionForVrm(
  motion: LoadedMotion,
  vrm: Vrm,
  options: { presetId?: string; includeLookAt?: boolean } = {},
): { clip: THREE.AnimationClip | null; report?: RetargetReport } {
  if (motion.preTargeted && motion.format === 'vrma') {
    const vrmAnim = (motion.clip as THREE.AnimationClip & { __vrmAnimation?: VRMAnimation }).__vrmAnimation;
    if (!vrmAnim) return { clip: motion.clip };
    const withoutLookAt = options.includeLookAt === false;
    const previousLookAt = vrm.lookAt;
    const lookAtProxies = withoutLookAt
      ? vrm.scene.children.filter((child) => child.type === 'VRMLookAtQuaternionProxy' || child.name === 'VRMLookAtQuaternionProxy')
      : [];
    if (withoutLookAt) {
      for (const proxy of lookAtProxies) proxy.removeFromParent();
      vrm.lookAt = null;
    }
    let clip: THREE.AnimationClip;
    try {
      clip = createVRMAnimationClip(vrmAnim, vrm as never);
    } finally {
      if (withoutLookAt) {
        vrm.lookAt = previousLookAt;
      }
    }
    if (withoutLookAt) {
      clip.tracks = clip.tracks.filter((track) => !track.name.includes('VRMLookAtQuaternionProxy'));
    }
    return {
      clip,
      report: {
        rawTracks: clip.tracks.length,
        mappedTracks: clip.tracks.length,
        duration: clip.duration,
        clipName: motion.clip.name,
        preset: 'vrma',
        mappedBones: ['(vrma direct)'],
        unmappedBones: [],
      },
    };
  }
  if (!motion.source) return { clip: null };
  return remapAnimationToVrm(vrm, motion.source, options);
}
