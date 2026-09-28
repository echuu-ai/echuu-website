// Camera rig and lighting for the live-room VRM stage.
// Shared so the live room and the archived-session replay frame the character
// identically; each surface still layers its own stored user overrides on top.
import type { StreamAvatarCameraRig } from '../components/streamroom/StreamVrmAvatar';
import type { VrmLookSettings } from '../components/vrm-rig/VrmLookPanel';

export const LIVE_VRM_LOOK_STORAGE_KEY = 'echuu.live-vrm-look.v6';
export const LIVE_AVATAR_RIG_STORAGE_KEY = 'echuu.live-avatar-rig.v1';

/** 2026-09-19 reference calibration: cool key, neutral lavender ambient, pink fill. */
export const DEFAULT_LIVE_VRM_LOOK: VrmLookSettings = {
  ambientColor: '#e4e5ff',
  keyColor: '#c2f0ff',
  fillColor: '#ffb3ee',
  bloomIntensity: 0.55,
  bloomThreshold: 0.88,
  bloomSmoothing: 0.24,
  dofEnabled: false,
  dofFocalLength: 0.028,
  dofBokehScale: 1.4,
};

export const DEFAULT_LIVE_AVATAR_RIG: StreamAvatarCameraRig = {
  cameraX: -0.24,
  cameraY: 0.95,
  cameraZ: 4.35,
  lookAtX: -0.05,
  lookAtY: 1.12,
  lookAtZ: 1.16,
  fov: 13.5,
  avatarX: -0.02,
  avatarY: 0,
  avatarZ: 0,
  avatarScale: 1,
  avatarRotationX: 0,
  avatarRotationY: 0,
  avatarRotationZ: 0,
  joy: 0,
  happy: 0,
  relaxed: 0,
  surprised: 0,
  sad: 0,
  angry: 0,
  neutral: 0,
  blink: 0,
  blinkLeft: 0,
  blinkRight: 0,
  aa: 0,
  ih: 0,
  ee: 0,
  oh: 0,
  ou: 0,
  lookUp: 0,
  lookDown: 0,
  lookLeft: 0,
  lookRight: 0,
  leftEyeYaw: 0,
  leftEyePitch: 0,
  rightEyeYaw: 0,
  rightEyePitch: 0,
  lookAtCamera: 1,
  silhouetteX: 0,
  silhouetteY: 0,
  silhouetteZ: 1.48,
  silhouetteScale: 0.14,
  // Cory 于 2026-09-19 截图确认的主直播间 HDR / Lighting 参数。
  hdrRotationY: 232,
  hdrEnvironmentIntensity: 0.75,
  hdrBackgroundIntensity: 0.95,
  hdrFogDensity: 0.03,
  ambientLightIntensity: 0.95,
  keyLightIntensity: 1.2,
  keyLightX: 0.3,
  keyLightY: 3.1,
  keyLightZ: 3.4,
  fillLightIntensity: 0.35,
  fillLightX: -2.4,
  fillLightY: 2.4,
  fillLightZ: 2.8,
};

/** Light colors in the shape StreamVrmAvatar expects. */
export function liveLightColors(look: VrmLookSettings) {
  return { ambient: look.ambientColor, key: look.keyColor, fill: look.fillColor };
}

/** Bloom settings in the shape StreamVrmAvatar expects. */
export function liveBloom(look: VrmLookSettings) {
  return {
    intensity: look.bloomIntensity,
    luminanceThreshold: look.bloomThreshold,
    luminanceSmoothing: look.bloomSmoothing,
  };
}
