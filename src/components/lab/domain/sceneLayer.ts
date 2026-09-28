export type SceneLayerKind = 'avatar' | 'camera' | 'hdr' | 'overlay-2d' | 'group';

export type SceneBlendMode = 'normal' | 'additive' | 'screen' | 'multiply' | 'overlay';

export const SCENE_BLEND_MODES: SceneBlendMode[] = ['normal', 'additive', 'screen', 'multiply', 'overlay'];

export type SceneEffectMode =
  | 'none'
  | 'outline'
  | 'silhouette-white'
  | 'silhouette-black'
  | 'poster'
  | 'bitmap'
  | 'ascii'
  | 'sprint';

export const SCENE_EFFECT_MODES: SceneEffectMode[] = [
  'none',
  'outline',
  'silhouette-white',
  'silhouette-black',
  'poster',
  'bitmap',
  'ascii',
  'sprint',
];

export type LayerTransform = {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
};

export const DEFAULT_LAYER_TRANSFORM: LayerTransform = {
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  scale: 1,
};

export type SceneLayer = {
  id: string;
  kind: SceneLayerKind;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: SceneBlendMode;
  parentId?: string;
  trackId?: string;
  characterId?: string;
  collapsed?: boolean;
  transform?: LayerTransform;
  effectMode?: SceneEffectMode;
  effectColor?: string;
};

export function resolveLayerTransform(layer: SceneLayer): LayerTransform {
  return layer.transform ?? DEFAULT_LAYER_TRANSFORM;
}

export function isContainerLayer(layer: SceneLayer): boolean {
  return layer.kind === 'group';
}

export function getLayerChildren(layers: SceneLayer[], parentId: string): SceneLayer[] {
  return layers.filter((layer) => layer.parentId === parentId);
}

export function getRootLayers(layers: SceneLayer[]): SceneLayer[] {
  return layers.filter((layer) => !layer.parentId);
}

export function flattenLayersTopDown(layers: SceneLayer[]): SceneLayer[] {
  const result: SceneLayer[] = [];
  const visit = (layer: SceneLayer) => {
    result.push(layer);
    if (layer.kind === 'group' && !layer.collapsed) {
      getLayerChildren(layers, layer.id).forEach(visit);
    }
  };
  getRootLayers(layers).forEach(visit);
  return result;
}

export function makeSceneLayerId(prefix: SceneLayerKind | 'layer' = 'layer'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
