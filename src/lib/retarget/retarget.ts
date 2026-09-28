import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { detectRigPreset } from './detect';
import { VRM_BONE_NAMES, presetById } from './presets';
import type {
  BoneMapReportEntry,
  RestPoseSource,
  RetargetReport,
  RigPreset,
  RootMotionMode,
  RotationRetargetMode,
} from './types';

const Z_UP_ROOT_X = -Math.SQRT1_2;
const Z_UP_ROOT_W = Math.SQRT1_2;
const R_ZUP_TO_YUP = new THREE.Quaternion(Math.SQRT1_2, 0, 0, Math.SQRT1_2);
const R_ZUP_TO_YUP_INV = new THREE.Quaternion().copy(R_ZUP_TO_YUP).invert();
const REST_CALIBRATION_CLIP = /\b(?:t|a)[-_ ]?pose\b/i;

function isFbxRootZUp(root: THREE.Object3D) {
  const q = root.quaternion;
  return Math.abs(q.x - Z_UP_ROOT_X) < 0.05 && Math.abs(q.w - Z_UP_ROOT_W) < 0.05;
}

function convertQuaternionZUpToYUp(q: THREE.Quaternion) {
  return q.premultiply(R_ZUP_TO_YUP).multiply(R_ZUP_TO_YUP_INV);
}

function convertQuaternionTrackZUpToYUp(values: Float32Array | ArrayLike<number>) {
  const out = new Float32Array(values.length);
  const q = new THREE.Quaternion();
  for (let i = 0; i < values.length; i += 4) {
    q.set(values[i], values[i + 1], values[i + 2], values[i + 3]);
    convertQuaternionZUpToYUp(q);
    out[i] = q.x;
    out[i + 1] = q.y;
    out[i + 2] = q.z;
    out[i + 3] = q.w;
  }
  return out;
}

function convertPositionTrackZUpToYUp(values: Float32Array) {
  for (let i = 0; i < values.length; i += 3) {
    const y = values[i + 1];
    const z = values[i + 2];
    values[i + 1] = z;
    values[i + 2] = -y;
  }
}

function stripPrefixes(name: string, prefixStrip: RegExp[]): string {
  let next = name;
  for (const re of prefixStrip) next = next.replace(re, '');
  return next;
}

function findSourceNode(source: THREE.Object3D, rawName: string, preset: RigPreset): THREE.Object3D | null {
  const byName = (name: string): THREE.Object3D | null => source.getObjectByName(name) ?? null;
  // try raw name
  let node = byName(rawName);
  if (node) return node;
  // try stripped
  const stripped = stripPrefixes(rawName, preset.prefixStrip);
  if (stripped !== rawName) {
    node = byName(stripped);
    if (node) return node;
  }
  // try with Armature| prefix (some FBX exporters add it)
  return byName(`Armature|${rawName}`);
}

function pickHipsNode(source: THREE.Object3D, preset: RigPreset): THREE.Object3D | null {
  for (const name of preset.hipsNodeNames) {
    const node = source.getObjectByName(name);
    if (node) return node ?? null;
  }
  // last resort: probe boneMap for hips key
  for (const [rawName, vrmName] of Object.entries(preset.boneMap)) {
    if (vrmName === 'hips') {
      const node = source.getObjectByName(rawName);
      if (node) return node ?? null;
    }
  }
  return null;
}

type Vrm = {
  scene: THREE.Object3D;
  meta?: { metaVersion?: string; version?: string };
  humanoid?: {
    getNormalizedBoneNode: (name: string) => THREE.Object3D | null;
  };
};

export type RemapResult = { clip: THREE.AnimationClip | null; report: RetargetReport };

export type RetargetOptions = {
  presetId?: string;
  clipIndex?: number;
  rotationMode?: RotationRetargetMode;
  rootMotionMode?: RootMotionMode;
};

type QuaternionRetargetEntry = {
  rawBone: string;
  sourceBone: string;
  vrmBoneName: string;
  srcNode: THREE.Object3D;
  vrmNode: THREE.Object3D;
  track: THREE.QuaternionKeyframeTrack;
  sourceRestWorldInverse: THREE.Quaternion;
  targetRestWorld: THREE.Quaternion;
  targetParentRestWorldInverse: THREE.Quaternion;
  targetDepth: number;
};

function getVrmVersion(vrm: Vrm): RetargetReport['vrmVersion'] {
  const version = vrm.meta?.metaVersion ?? vrm.meta?.version;
  if (version === '0') return '0.x';
  if (version === '1' || version?.startsWith('1.')) return '1.0';
  return 'unknown';
}

function isSceneRotationApplied(vrm: Vrm) {
  return Boolean(vrm.scene.userData.__oshiFacingNormalized || vrm.scene.userData.__vrm0Rotated);
}

function createBaseReport(
  srcClip: THREE.AnimationClip | null,
  preset: string,
  options: RetargetOptions,
  vrm?: Vrm,
): RetargetReport {
  return {
    rawTracks: srcClip?.tracks.length ?? 0,
    mappedTracks: 0,
    duration: srcClip?.duration ?? 0,
    clipName: srcClip?.name || 'unknown',
    preset,
    rotationMode: options.rotationMode,
    rootMotionMode: options.rootMotionMode,
    vrmVersion: vrm ? getVrmVersion(vrm) : undefined,
    sceneRotationApplied: vrm ? isSceneRotationApplied(vrm) : undefined,
    mappedBones: [],
    unmappedBones: [],
  };
}

function getTargetDepth(node: THREE.Object3D) {
  let depth = 0;
  let current = node.parent;
  while (current) {
    depth += 1;
    current = current.parent;
  }
  return depth;
}

function normalizeRootMotionMode(mode: RootMotionMode): 'inPlace' | 'preserveRootMotion' | 'projectToGround' {
  if (mode === 'origin' || mode === 'inPlace') return 'inPlace';
  if (mode === 'projectToGround') return 'projectToGround';
  return 'preserveRootMotion';
}

function applyVrm0RetargetSpaceFix(q: THREE.Quaternion, enabled: boolean) {
  if (!enabled) return q;
  q.x = -q.x;
  q.z = -q.z;
  return q;
}

function ensureQuaternionContinuity(values: Float32Array) {
  for (let i = 4; i < values.length; i += 4) {
    const dot =
      values[i - 4] * values[i] +
      values[i - 3] * values[i + 1] +
      values[i - 2] * values[i + 2] +
      values[i - 1] * values[i + 3];
    if (dot < 0) {
      values[i] = -values[i];
      values[i + 1] = -values[i + 1];
      values[i + 2] = -values[i + 2];
      values[i + 3] = -values[i + 3];
    }
  }
}

function cloneClipForSourceEvaluation(srcClip: THREE.AnimationClip, treatAsZUp: boolean) {
  const tracks = srcClip.tracks.map((track) => {
    if (track instanceof THREE.QuaternionKeyframeTrack && treatAsZUp) {
      return new THREE.QuaternionKeyframeTrack(track.name, track.times, convertQuaternionTrackZUpToYUp(track.values));
    }
    return track.clone();
  });
  return new THREE.AnimationClip(srcClip.name, srcClip.duration, tracks);
}

function pickRestCalibrationClip(
  clips: THREE.AnimationClip[] | undefined,
  selectedClip: THREE.AnimationClip,
): THREE.AnimationClip | null {
  const candidates =
    clips
      ?.filter((clip) => clip !== selectedClip)
      .filter((clip) => REST_CALIBRATION_CLIP.test(clip.name))
      .filter((clip) => clip.tracks.some((track) => track.name.endsWith('.quaternion'))) ?? [];
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.tracks.length - a.tracks.length)[0];
}

function applyCalibrationClipFrame(
  root: THREE.Object3D,
  clip: THREE.AnimationClip,
  preset: RigPreset,
  treatAsZUp: boolean,
) {
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  for (const track of clip.tracks) {
    const dotIdx = track.name.lastIndexOf('.');
    if (dotIdx < 0) continue;
    const propName = track.name.slice(dotIdx + 1);
    let rawBone = track.name.slice(0, dotIdx);
    if (rawBone.includes('|')) rawBone = rawBone.split('|').pop() ?? rawBone;
    const node = findSourceNode(root, rawBone, preset);
    if (!node) continue;

    if (propName === 'quaternion' && track instanceof THREE.QuaternionKeyframeTrack) {
      q.set(track.values[0], track.values[1], track.values[2], track.values[3]).normalize();
      if (treatAsZUp) convertQuaternionZUpToYUp(q);
      node.quaternion.copy(q);
      node.updateMatrix();
    } else if (propName === 'position' && track instanceof THREE.VectorKeyframeTrack) {
      v.set(track.values[0], track.values[1], track.values[2]);
      if (treatAsZUp) {
        const y = v.y;
        v.y = v.z;
        v.z = -y;
      }
      node.position.copy(v);
      node.updateMatrix();
    }
  }
  root.updateWorldMatrix(true, true);
}

function inferProfileConfidence(
  preset: RigPreset,
  options: RetargetOptions,
  detectedPreset: RigPreset | null,
): { confidence: number; restPoseSource: RestPoseSource; warnings: string[] } {
  if (options.presetId) {
    return { confidence: 1, restPoseSource: 'profilePreset', warnings: [] };
  }
  if (detectedPreset) {
    return { confidence: 0.95, restPoseSource: 'profilePreset', warnings: [] };
  }
  return {
    confidence: 0.35,
    restPoseSource: 'firstFrameFallback',
    warnings: [
      `No rig preset matched the source. Refusing silent retarget instead of falling back to "${preset.id}".`,
    ],
  };
}

export function remapAnimationToVrm(
  vrm: Vrm,
  source: THREE.Object3D & { animations?: THREE.AnimationClip[] },
  options: RetargetOptions = {},
): RemapResult {
  const srcClip = pickSourceClip(source, options.clipIndex);
  if (!vrm?.humanoid || !srcClip) {
    const report = createBaseReport(srcClip, options.presetId ?? 'none', options, vrm);
    report.error = 'VRM humanoid or source clip missing';
    return {
      clip: null,
      report,
    };
  }

  const detectedPreset = detectRigPreset(source, srcClip);
  const preset = (options.presetId && presetById.get(options.presetId)) || detectedPreset;
  if (!preset) {
    const report = createBaseReport(srcClip, options.presetId ?? 'unmatched', options, vrm);
    report.confidence = 0.35;
    report.restPoseSource = 'firstFrameFallback';
    report.warnings = ['No known rig preset matched the source; manual mapping is required for main-chain retarget.'];
    report.error = 'Rig preset confidence below 0.85 for required humanoid chain.';
    return { clip: null, report };
  }

  // Up-axis: prefer FBX root quaternion sniffing; preset.upAxis is a hint when sniff is inconclusive.
  const sceneIsZUp = isFbxRootZUp(source);
  const treatAsZUp = sceneIsZUp || preset.upAxis === 'z';
  const vrmVersion = getVrmVersion(vrm);
  const sceneRotationApplied = isSceneRotationApplied(vrm);
  const needsVrm0RetargetSpaceFix = vrmVersion === '0.x' && !sceneRotationApplied;
  const rotationMode = options.rotationMode ?? preset.rotationMode ?? 'rest-offset';
  const rootMotionMode = options.rootMotionMode ?? preset.rootMotionMode;
  const rootMotion = normalizeRootMotionMode(rootMotionMode);
  const profile = inferProfileConfidence(preset, options, detectedPreset);
  const warnings = [...profile.warnings];
  let restPoseSource = profile.restPoseSource;
  if (needsVrm0RetargetSpaceFix) {
    warnings.push('VRM0 scene rotation has not been marked as applied; using VRM0 retarget-space Y-180 compensation.');
  }

  source.updateWorldMatrix(true, true);
  vrm.scene.updateWorldMatrix(true, true);

  const tmpVec = new THREE.Vector3();
  const srcHipsNode = pickHipsNode(source, preset);
  const motionHipsHeight =
    srcHipsNode?.position?.y ?? (srcHipsNode ? srcHipsNode.getWorldPosition(tmpVec).y : 1) ?? 1;
  const vrmHipsNode = vrm.humanoid.getNormalizedBoneNode('hips');
  const vrmHipsHeight = vrmHipsNode
    ? Math.abs(vrmHipsNode.getWorldPosition(tmpVec).y - vrm.scene.getWorldPosition(tmpVec).y) || 1
    : 1;
  const hipsPositionScale = Math.abs(motionHipsHeight) > 0 ? vrmHipsHeight / Math.abs(motionHipsHeight) : 1;

  const tracks: THREE.KeyframeTrack[] = [];
  const mappedBones = new Set<string>();
  const unmappedBones = new Set<string>();
  const boneMapReport: BoneMapReportEntry[] = [];
  const quat = new THREE.Quaternion();
  const sourceAnimatedWorldRotation = new THREE.Quaternion();
  const deltaWorldRotation = new THREE.Quaternion();
  const targetAnimatedWorldRotation = new THREE.Quaternion();
  const targetLocalRotation = new THREE.Quaternion();
  const parentWorldInverse = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const tmpWorld = new THREE.Quaternion();
  const localResults = new Map<QuaternionRetargetEntry, Map<number, THREE.Quaternion>>();
  const targetWorldByNode = new Map<string, THREE.Quaternion>();
  const evalSource = cloneSkeleton(source) as THREE.Object3D & { animations?: THREE.AnimationClip[] };
  const evalClip = cloneClipForSourceEvaluation(srcClip, treatAsZUp);
  evalSource.animations = [evalClip];
  evalSource.updateWorldMatrix(true, true);
  const calibrationClip = pickRestCalibrationClip(source.animations, srcClip);
  if (calibrationClip) {
    applyCalibrationClipFrame(evalSource, calibrationClip, preset, treatAsZUp);
    restPoseSource = 'calibrationClip';
  }
  const evalMixer = new THREE.AnimationMixer(evalSource);
  const evalAction = evalMixer.clipAction(evalClip);
  evalAction.loop = THREE.LoopOnce;
  evalAction.clampWhenFinished = true;
  evalAction.play();
  const quaternionEntries: QuaternionRetargetEntry[] = [];
  const uniqueQuaternionTimes = new Set<number>();

  for (const track of srcClip.tracks) {
    const dotIdx = track.name.lastIndexOf('.');
    if (dotIdx < 0) continue;
    const propName = track.name.slice(dotIdx + 1);
    if (propName === 'scale') continue;

    let rawBone = track.name.slice(0, dotIdx);
    if (rawBone.includes('|')) rawBone = rawBone.split('|').pop() ?? rawBone;

    const strippedBone = stripPrefixes(rawBone, preset.prefixStrip);
    const vrmBoneName = preset.boneMap[strippedBone] ?? preset.boneMap[rawBone];
    if (!vrmBoneName || !VRM_BONE_NAMES.has(vrmBoneName)) {
      unmappedBones.add(rawBone);
      continue;
    }

    const vrmNode = vrm.humanoid.getNormalizedBoneNode(vrmBoneName);
    if (!vrmNode) {
      unmappedBones.add(rawBone);
      continue;
    }

    const srcNode = findSourceNode(evalSource, rawBone, preset);
    if (!srcNode) {
      unmappedBones.add(rawBone);
      continue;
    }

    if (propName === 'quaternion' && track instanceof THREE.QuaternionKeyframeTrack) {
      const rawValues = treatAsZUp ? convertQuaternionTrackZUpToYUp(track.values) : track.values;

      if (rotationMode === 'local-copy') {
        const values = new Float32Array(rawValues.length);
        if (needsVrm0RetargetSpaceFix) {
          for (let i = 0; i < rawValues.length; i += 4) {
            values[i] = -rawValues[i];
            values[i + 1] = rawValues[i + 1];
            values[i + 2] = -rawValues[i + 2];
            values[i + 3] = rawValues[i + 3];
          }
        } else {
          values.set(rawValues);
        }
        ensureQuaternionContinuity(values);
        tracks.push(new THREE.QuaternionKeyframeTrack(`${vrmNode.name}.quaternion`, track.times, values));
        mappedBones.add(vrmBoneName);
        boneMapReport.push({
          sourceBone: strippedBone,
          targetBone: vrmBoneName,
          confidence: options.presetId ? 1 : profile.confidence,
          reason: options.presetId ? 'manual' : 'preset',
        });
        continue;
      }

      const sourceRestWorldInverse = new THREE.Quaternion();
      const targetRestWorld = new THREE.Quaternion();
      const targetParentRestWorldInverse = new THREE.Quaternion();
      srcNode.getWorldQuaternion(sourceRestWorldInverse).invert();
      vrmNode.getWorldQuaternion(targetRestWorld);
      vrmNode.parent
        ? vrmNode.parent.getWorldQuaternion(targetParentRestWorldInverse).invert()
        : targetParentRestWorldInverse.identity();

      const entry: QuaternionRetargetEntry = {
        rawBone,
        sourceBone: strippedBone,
        vrmBoneName,
        srcNode,
        vrmNode,
        track,
        sourceRestWorldInverse,
        targetRestWorld,
        targetParentRestWorldInverse,
        targetDepth: getTargetDepth(vrmNode),
      };
      quaternionEntries.push(entry);
      localResults.set(entry, new Map());
      for (const time of track.times) uniqueQuaternionTimes.add(time);
      mappedBones.add(vrmBoneName);
      boneMapReport.push({
        sourceBone: strippedBone,
        targetBone: vrmBoneName,
        confidence: options.presetId ? 1 : profile.confidence,
        reason: options.presetId ? 'manual' : 'preset',
      });
    } else if (propName === 'position' && vrmBoneName === 'hips' && track instanceof THREE.VectorKeyframeTrack) {
      const values = new Float32Array(track.values);
      if (treatAsZUp) convertPositionTrackZUpToYUp(values);

      const baseX = values[0] ?? 0;
      const baseY = values[1] ?? 0;
      const baseZ = values[2] ?? 0;
      const targetRestX = vrmNode.position.x;
      const targetRestY = vrmNode.position.y;
      const targetRestZ = vrmNode.position.z;
      for (let i = 0; i < values.length; i += 3) {
        const sign = needsVrm0RetargetSpaceFix ? -1 : 1;
        const dx = (values[i] - baseX) * hipsPositionScale * sign;
        const dy = (values[i + 1] - baseY) * hipsPositionScale;
        const dz = (values[i + 2] - baseZ) * hipsPositionScale * sign;
        values[i] = targetRestX + (rootMotion === 'inPlace' ? 0 : dx);
        values[i + 1] = targetRestY + (rootMotion === 'projectToGround' ? 0 : dy);
        values[i + 2] = targetRestZ + (rootMotion === 'inPlace' ? 0 : dz);
      }
      tracks.push(new THREE.VectorKeyframeTrack(`${vrmNode.name}.position`, track.times, values));
      mappedBones.add('hips:position');
    }
  }

  if (quaternionEntries.length) {
    const entriesByTargetDepth = [...quaternionEntries].sort((a, b) => a.targetDepth - b.targetDepth);
    const targetBoneByNode = new Map(entriesByTargetDepth.map((entry) => [entry.vrmNode.uuid, entry]));
    const sortedTimes = Array.from(uniqueQuaternionTimes).sort((a, b) => a - b);

    for (const time of sortedTimes) {
      evalMixer.setTime(time);
      evalSource.updateWorldMatrix(true, true);
      targetWorldByNode.clear();

      for (const entry of entriesByTargetDepth) {
        entry.srcNode.getWorldQuaternion(sourceAnimatedWorldRotation);
        deltaWorldRotation.copy(sourceAnimatedWorldRotation).multiply(entry.sourceRestWorldInverse);
        targetAnimatedWorldRotation.copy(deltaWorldRotation).multiply(entry.targetRestWorld);
        const parentEntry = entry.vrmNode.parent ? targetBoneByNode.get(entry.vrmNode.parent.uuid) : undefined;
        if (parentEntry && targetWorldByNode.has(parentEntry.vrmNode.uuid)) {
          parentWorldInverse.copy(targetWorldByNode.get(parentEntry.vrmNode.uuid)!).invert();
        } else {
          parentWorldInverse.copy(entry.targetParentRestWorldInverse);
        }
        parentWorld.copy(parentWorldInverse).invert();
        targetLocalRotation.copy(parentWorldInverse).multiply(targetAnimatedWorldRotation).normalize();
        applyVrm0RetargetSpaceFix(targetLocalRotation, needsVrm0RetargetSpaceFix);
        localResults.get(entry)?.set(time, targetLocalRotation.clone());
        targetWorldByNode.set(entry.vrmNode.uuid, tmpWorld.copy(parentWorld).multiply(targetLocalRotation).normalize().clone());
      }
    }

    for (const entry of quaternionEntries) {
      const values = new Float32Array(entry.track.times.length * 4);
      const byTime = localResults.get(entry);
      for (let keyIndex = 0; keyIndex < entry.track.times.length; keyIndex += 1) {
        quat.copy(byTime?.get(entry.track.times[keyIndex]) ?? entry.vrmNode.quaternion).normalize();
        const offset = keyIndex * 4;
        values[offset] = quat.x;
        values[offset + 1] = quat.y;
        values[offset + 2] = quat.z;
        values[offset + 3] = quat.w;
      }
      ensureQuaternionContinuity(values);
      tracks.push(new THREE.QuaternionKeyframeTrack(`${entry.vrmNode.name}.quaternion`, entry.track.times, values));
    }
  }

  const out = tracks.length ? new THREE.AnimationClip('vrmAnimation', srcClip.duration, tracks) : null;
  if (profile.confidence < 0.85) {
    warnings.push('Main-chain preset confidence is below 0.85; retarget should require manual confirmation.');
  }
  return {
    clip: out,
    report: {
      rawTracks: srcClip.tracks.length,
      mappedTracks: tracks.length,
      duration: srcClip.duration,
      clipName: srcClip.name || 'unknown',
      preset: preset.id,
      rotationMode,
      rootMotionMode,
      vrmVersion,
      sceneRotationApplied,
      restPoseSource,
      confidence: profile.confidence,
      warnings,
      boneMap: boneMapReport,
      mappedBones: Array.from(mappedBones),
      unmappedBones: Array.from(unmappedBones).slice(0, 32),
      error: tracks.length ? undefined : `0 tracks mapped via preset "${preset.id}".`,
    },
  };
}

function pickSourceClip(
  source: { animations?: THREE.AnimationClip[] },
  preferredIndex?: number,
): THREE.AnimationClip | null {
  const clips = source?.animations;
  if (!clips?.length) return null;
  if (typeof preferredIndex === 'number' && clips[preferredIndex]) return clips[preferredIndex];
  // pick mixamo.com if present (common Mixamo behavior), else first
  return THREE.AnimationClip.findByName(clips, 'mixamo.com') ?? clips[0];
}
