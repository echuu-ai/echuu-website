/**
 * Rig retarget types.
 *
 * Source motion rigs differ in bone naming, hierarchy depth, up-axis, and
 * rest-pose convention. Instead of branching across rig kinds inside the
 * retarget kernel, each rig is described by a `RigPreset` that the kernel
 * reads. Adding a new rig is "add a preset", not "edit the kernel".
 */

export type RigUpAxis = 'y' | 'z';

export type RootMotionMode =
  /** Drop horizontal hips motion but preserve vertical bounce, good for web VTuber previews. */
  | 'inPlace'
  /** Preserve root displacement as frame delta from the rest/first frame. */
  | 'preserveRootMotion'
  /** Preserve horizontal displacement but keep vertical motion on the ground plane. */
  | 'projectToGround'
  /** Legacy alias for preserveRootMotion. */
  | 'preserve'
  /** Legacy alias for inPlace. */
  | 'origin'
  /** Legacy alias for preserveRootMotion. */
  | 'normalize';

/** How quaternion tracks are transferred onto VRM humanoid bones. */
export type RotationRetargetMode =
  /** Mixamo-style: compensate source rest pose (default for cross-rig). */
  | 'rest-offset'
  /** Same-rig VRoid/J_Bip: copy local quaternions directly (Blender glTF exports). */
  | 'local-copy';

export type RigPreset = {
  /** Stable id used in UI + persistence. */
  id: string;
  /** Human-readable label shown in the source-rig dropdown. */
  displayName: string;
  /** Up-axis of the FBX. Three.js scene is Y-up; Z-up sources get extra conversion in the kernel. */
  upAxis: RigUpAxis;
  /** Regex patterns stripped from raw bone names before lookup (e.g. `^mixamorig1?`, `^Armature\|`). */
  prefixStrip: RegExp[];
  /** Exact bone-name map from source name (post-strip) to VRM humanoid bone name. */
  boneMap: Record<string, string>;
  /** Ranked candidate names for the hips node, used to read motionHipsHeight. */
  hipsNodeNames: string[];
  /** What to do with the hips translation track. */
  rootMotionMode: RootMotionMode;
  /** Quaternion transfer strategy. VRoid same-rig exports use local-copy. */
  rotationMode?: RotationRetargetMode;
  /** Set true if source coordinate system has the opposite handedness (Unity → Three). */
  isHandednessMirrored?: boolean;
  /** Optional matcher functions that bump the auto-detector score for this preset. */
  detect?: {
    /** Return true if any track name matches one of these patterns. */
    trackPatterns?: RegExp[];
    /** Return true if any object in the scene matches one of these names. */
    objectNames?: string[];
  };
  description?: string;
};

export type RestPoseSource = 'bindPose' | 'calibrationClip' | 'profilePreset' | 'firstFrameFallback';

export type BoneMapReason = 'preset' | 'name' | 'topology' | 'symmetry' | 'manual';

export type BoneMapReportEntry = {
  sourceBone: string;
  targetBone: string;
  confidence: number;
  reason: BoneMapReason;
};

export type RetargetReport = {
  rawTracks: number;
  mappedTracks: number;
  duration: number;
  clipName: string;
  preset: string;
  rotationMode?: RotationRetargetMode;
  rootMotionMode?: RootMotionMode;
  vrmVersion?: '0.x' | '1.0' | 'unknown';
  sceneRotationApplied?: boolean;
  restPoseSource?: RestPoseSource;
  confidence?: number;
  warnings?: string[];
  boneMap?: BoneMapReportEntry[];
  mappedBones: string[];
  unmappedBones: string[];
  error?: string;
};
