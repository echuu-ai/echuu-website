export type ThumbnailMetadata = {
  url?: string;
  status?: 'idle' | 'loading' | 'ready' | 'error';
};

export type AnimationItem = {
  id: string;
  name: string;
  url: string;
  thumbnail?: ThumbnailMetadata;
};

export type CharacterItem = {
  id: string;
  name: string;
  url: string;
  thumbnail?: ThumbnailMetadata;
};

export type AudioItem = {
  id: string;
  name: string;
  url: string;
  durationSeconds?: number;
};

export type CameraAsset = {
  id: string;
  name: string;
  origin: 'builtin' | 'user';
  cameraMode: 'preset' | 'dollycurve';
  cameraPreset: CameraPreset;
  durationFrames: number;
  fps: number;
  actionJson?: unknown;
  preview?: ThumbnailMetadata & { version?: string };
};

export type SceneAsset = {
  id: string;
  name: string;
  kind: 'hdr' | 'gaussian-splat';
  origin: 'builtin' | 'user' | 'candidate';
  url?: string;
  sourceUrl?: string;
  license?: string;
  format?: 'hdr' | 'exr' | 'splat' | 'ply' | 'spz' | 'sog';
  note?: string;
};

export type AvatarEffectMode = 'none' | 'outline' | 'poster' | 'bitmap' | 'ascii' | 'sprint';

export type CameraPreset = 'free' | 'orbit' | 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'dollycurve';
export type DrivenCameraPreset = Exclude<CameraPreset, 'free' | 'dollycurve'>;
export type InspectorTab = 'camera' | 'model' | 'render' | 'fx' | 'export' | 'retarget';
export type TimelineTab = 'timeline' | 'curves';

export type TimelineTrackKind = 'avatar' | 'camera' | 'audio' | 'blendshape' | 'overlay';
export type ActorTrackRole = 'motion' | 'blendshape' | 'transform' | 'visibility';

export type ActorInstance = {
  id: string;
  name: string;
  modelId: string;
  collapsed?: boolean;
};

export type BlendshapeKeyframe = {
  frame: number;
  value: number;
  bezierInX?: number;
  bezierInY?: number;
  bezierOutX?: number;
  bezierOutY?: number;
};

export type TimelineClip = {
  id: string;
  trackKind: TimelineTrackKind;
  trackId: string;
  label: string;
  startFrame: number;
  durationFrames: number;
  enabled: boolean;
  sourceCharacterId?: string;
  sourceAnimationId?: string;
  sourceAudioId?: string;
  sourceBlendshape?: string;
  sourceOverlayId?: string;
  blendValue?: number;
  blendKeyframes?: BlendshapeKeyframe[];
  cameraPreset?: CameraPreset;
  cameraMode?: 'preset' | 'dollycurve';
  sourceCameraAssetId?: string;
  cameraActionJson?: unknown;
  offsetFrame?: number;
  speed?: number;
  blendIn?: number;
  blendOut?: number;
  volume?: number;
};

export type TimelineTrack = {
  id: string;
  kind: TimelineTrackKind;
  label: string;
  characterId?: string;
  actorId?: string;
  actorRole?: ActorTrackRole;
  height?: number;
  muted?: boolean;
  locked?: boolean;
};

export type RenderSettings = {
  envIntensity: number;
  ambient: number;
  key: number;
  rim: number;
  exposure: number;
  modelX: number;
  modelScale: number;
  modelY: number;
  modelZ: number;
  modelRotX: number;
  modelRotY: number;
  modelRotZ: number;
  showGrid: boolean;
  showStats: boolean;
  transparentBackground: boolean;
  viewAnchorY: number;
  viewDistance: number;
  avatarEffectMode: AvatarEffectMode;
  avatarEffectStrength: number;
  avatarEffectGranularity: number;
  avatarEffectColor: string;
  postProcessingEnabled: boolean;
  ppAvatarFxEnabled: boolean;
  ppColorAdjustEnabled: boolean;
  ppCurveLutEnabled: boolean;
  ppImportedLutEnabled: boolean;
  ppHue: number;
  ppSaturation: number;
  ppBrightness: number;
  ppContrast: number;
  curveEnabled: boolean;
  curveMaster: number;
  curveR: number;
  curveG: number;
  curveB: number;
  curveA: number;
  curvePointsMaster: number[];
  curvePointsR: number[];
  curvePointsG: number[];
  curvePointsB: number[];
  liftX: number;
  liftY: number;
  liftStrength: number;
  gammaX: number;
  gammaY: number;
  gammaStrength: number;
  gainX: number;
  gainY: number;
  gainStrength: number;
  lutEnabled: boolean;
  lutTetrahedral: boolean;
};

export type RetargetReport = {
  rawTracks: number;
  mappedTracks: number;
  duration: number;
  clipName: string;
  error?: string;
};

export type VrmBounds = {
  center: [number, number, number];
  size: [number, number, number];
  min: [number, number, number];
  max: [number, number, number];
};

export type VrmModelInfo = {
  version: string;
  normalizedFacing: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
};

export type TransferJson = {
  kind?: string;
  assets?: {
    activeCharacterId?: string;
    characters?: CharacterItem[];
    animations?: AnimationItem[];
  };
  renderSettings?: Partial<RenderSettings>;
  playback?: {
    activeAnimationId?: string;
    loop?: boolean;
    timeScale?: number;
  };
  camera?: {
    preset?: CameraPreset;
    dollyEnabled?: boolean;
    currentFrame?: number;
    dollycurve?: unknown;
  };
  timeline?: {
    durationFrames?: number;
    clips?: TimelineClip[];
  };
  model?: {
    transform?: Partial<
      Pick<
        RenderSettings,
        'modelX' | 'modelY' | 'modelZ' | 'modelRotX' | 'modelRotY' | 'modelRotZ' | 'modelScale'
      >
    >;
  };
};

export type Selection =
  | { kind: 'none' }
  | { kind: 'scene-object'; objectId: string }
  | { kind: 'actor'; trackId: string }
  | { kind: 'clip'; clipId: string }
  | { kind: 'track'; trackId: string }
  | { kind: 'overlay'; overlayId: string };
