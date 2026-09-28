export const FACE_CHANNELS = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'blink', 'aa'] as const;
export type FaceChannel = typeof FACE_CHANNELS[number];
export type FaceWeights = Partial<Record<FaceChannel, number>>;
export type SceneExpression = { mode: 'motion' | 'manual'; weights: FaceWeights };
export const FACE_STATES = [
  { id: 'neutral', label: '平静' }, { id: 'happy', label: '开心' },
  { id: 'angry', label: '生气' }, { id: 'sad', label: '难过' },
  { id: 'relaxed', label: '放松' }, { id: 'surprised', label: '惊讶' },
] as const;
export function isSceneExpression(value: unknown): value is SceneExpression {
  if (!value || typeof value !== 'object') return false;
  const v = value as SceneExpression;
  return ['motion', 'manual'].includes(v.mode) && !!v.weights && typeof v.weights === 'object' && !Array.isArray(v.weights)
    && Object.entries(v.weights).every(([key, n]) => FACE_CHANNELS.includes(key as FaceChannel) && typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1);
}
