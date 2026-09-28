export type StreamAvatarCameraRig = {
  far?: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  lookAtX: number;
  lookAtY: number;
  lookAtZ: number;
  fov: number;
  /** Normalized offset of the projection centre. */
  projectionShiftX?: number;
  projectionShiftY?: number;
  /** Virtual viewport scale used to preserve framing on a larger Canvas. */
  viewportScale?: number;
  avatarX: number;
  avatarY: number;
  avatarZ: number;
  avatarScale: number;
  avatarRotationX: number;
  avatarRotationY: number;
  avatarRotationZ: number;
  joy: number;
  happy: number;
  relaxed: number;
  surprised: number;
  sad: number;
  angry: number;
  neutral: number;
  blink: number;
  blinkLeft: number;
  blinkRight: number;
  aa: number;
  ih: number;
  ee: number;
  oh: number;
  ou: number;
  lookUp: number;
  lookDown: number;
  lookLeft: number;
  lookRight: number;
  leftEyeYaw: number;
  leftEyePitch: number;
  rightEyeYaw: number;
  rightEyePitch: number;
  lookAtCamera: number;
  silhouetteX: number;
  silhouetteY: number;
  silhouetteZ: number;
  silhouetteScale: number;
  silhouetteColor?: string;
  /** Live room HDR sky rotation (degrees, Y axis). */
  hdrRotationY?: number;
  /** Live room IBL / reflection strength from HDR. */
  hdrEnvironmentIntensity?: number;
  /** Live room visible sky background brightness. */
  hdrBackgroundIntensity?: number;
  /** Air perspective density that blends the character into the HDR sky. */
  hdrFogDensity?: number;
  /** Character lighting controls used by the live rig panel. */
  ambientLightIntensity?: number;
  keyLightIntensity?: number;
  keyLightX?: number;
  keyLightY?: number;
  keyLightZ?: number;
  fillLightIntensity?: number;
  fillLightX?: number;
  fillLightY?: number;
  fillLightZ?: number;
};
