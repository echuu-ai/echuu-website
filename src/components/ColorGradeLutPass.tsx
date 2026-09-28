import { wrapEffect } from '@react-three/postprocessing';
import { Effect } from 'postprocessing';
import { useLayoutEffect, useMemo, useRef, type ComponentType, type Ref } from 'react';
import * as THREE from 'three';
import { useAppColorGrade } from './AppColorGrade';
import {
  buildColorGradeAlphaTable,
  buildColorGradeCurveTable,
  deriveColorGradeCss,
  isWebKitColorGradeEngine,
  type AppColorGradeState,
} from '../lib/app-color-grade';
import { buildTransferLut } from '../lib/canvas-color-grade';

const FRAGMENT = /* glsl */ `
uniform sampler2D uLut;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uHue;

vec3 applySaturation(vec3 color, float amount) {
  float red = (0.213 + 0.787 * amount) * color.r
    + (0.715 - 0.715 * amount) * color.g
    + (0.072 - 0.072 * amount) * color.b;
  float green = (0.213 - 0.213 * amount) * color.r
    + (0.715 + 0.285 * amount) * color.g
    + (0.072 - 0.072 * amount) * color.b;
  float blue = (0.213 - 0.213 * amount) * color.r
    + (0.715 - 0.715 * amount) * color.g
    + (0.072 + 0.928 * amount) * color.b;
  return vec3(red, green, blue);
}

vec3 applyHueRotate(vec3 color, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  float red = (0.213 + c * 0.787 - s * 0.213) * color.r
    + (0.715 - c * 0.715 - s * 0.715) * color.g
    + (0.072 - c * 0.072 + s * 0.928) * color.b;
  float green = (0.213 - c * 0.213 + s * 0.143) * color.r
    + (0.715 + c * 0.285 + s * 0.140) * color.g
    + (0.072 - c * 0.072 - s * 0.283) * color.b;
  float blue = (0.213 - c * 0.213 - s * 0.787) * color.r
    + (0.715 - c * 0.715 + s * 0.715) * color.g
    + (0.072 + c * 0.928 + s * 0.072) * color.b;
  return vec3(red, green, blue);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Match AppColorGradeStack: inner CSS tone first, outer curve table second.
  vec3 toned = inputColor.rgb * uBrightness;
  toned = (toned - 0.5) * uContrast + 0.5;
  toned = applySaturation(toned, uSaturation);
  toned = applyHueRotate(toned, uHue);
  vec4 graded = vec4(
    texture(uLut, vec2(toned.r, 0.5)).r,
    texture(uLut, vec2(toned.g, 0.5)).g,
    texture(uLut, vec2(toned.b, 0.5)).b,
    texture(uLut, vec2(inputColor.a, 0.5)).a
  );
  outputColor = graded;
}
`;

class ColorGradeLutEffect extends Effect {
  constructor() {
    const identity = new Uint8Array(256 * 4);
    for (let index = 0; index < 256; index += 1) {
      identity[index * 4] = index;
      identity[index * 4 + 1] = index;
      identity[index * 4 + 2] = index;
      identity[index * 4 + 3] = index;
    }
    const placeholder = new THREE.DataTexture(identity, 256, 1, THREE.RGBAFormat);
    placeholder.generateMipmaps = false;
    placeholder.needsUpdate = true;
    super('ColorGradeLut', FRAGMENT, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uLut', new THREE.Uniform(placeholder)],
        ['uBrightness', new THREE.Uniform(1)],
        ['uContrast', new THREE.Uniform(1)],
        ['uSaturation', new THREE.Uniform(1)],
        ['uHue', new THREE.Uniform(0)],
      ]),
    });
    // The paired SVG transfer uses colorInterpolationFilters="sRGB".
    // Applying those tables to linear light lifts dark hair and shifts skin.
    this.inputColorSpace = THREE.SRGBColorSpace;
  }
}

const ColorGradeLut = wrapEffect(ColorGradeLutEffect) as unknown as ComponentType<{
  ref?: Ref<ColorGradeLutEffect>;
}>;

export function buildColorGradeLutTexture(value: AppColorGradeState) {
  const red = buildTransferLut(buildColorGradeCurveTable(value, value.curvePointsR, value.curveR));
  const green = buildTransferLut(buildColorGradeCurveTable(value, value.curvePointsG, value.curveG));
  const blue = buildTransferLut(buildColorGradeCurveTable(value, value.curvePointsB, value.curveB));
  const alpha = buildTransferLut(buildColorGradeAlphaTable(value));
  const data = new Uint8Array(256 * 4);
  for (let index = 0; index < 256; index += 1) {
    data[index * 4] = red?.[index] ?? index;
    data[index * 4 + 1] = green?.[index] ?? index;
    data[index * 4 + 2] = blue?.[index] ?? index;
    data[index * 4 + 3] = alpha?.[index] ?? index;
  }
  const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function AppColorGradeLutPass({
  forceWebGl = false,
  includeTone = false,
}: {
  forceWebGl?: boolean;
  includeTone?: boolean;
} = {}) {
  if (!forceWebGl && !isWebKitColorGradeEngine()) return null;
  return <AppColorGradeLutPassImpl includeTone={includeTone} />;
}

function AppColorGradeLutPassImpl({ includeTone }: { includeTone: boolean }) {
  const { color } = useAppColorGrade();
  const ref = useRef<ColorGradeLutEffect>(null);
  const texture = useMemo(() => buildColorGradeLutTexture(color), [color]);
  const tone = useMemo(() => includeTone ? deriveColorGradeCss(color) : {
    brightness: 1,
    contrast: 1,
    saturation: 1,
    hue: 0,
  }, [color, includeTone]);

  useLayoutEffect(() => {
    const uniforms = ref.current?.uniforms;
    const lutUniform = uniforms?.get('uLut') as THREE.Uniform<THREE.Texture> | undefined;
    if (lutUniform) lutUniform.value = texture;
    const setNumber = (name: string, value: number) => {
      const uniform = uniforms?.get(name) as THREE.Uniform<number> | undefined;
      if (uniform) uniform.value = value;
    };
    setNumber('uBrightness', tone.brightness);
    setNumber('uContrast', tone.contrast);
    setNumber('uSaturation', tone.saturation);
    setNumber('uHue', THREE.MathUtils.degToRad(tone.hue));
    return () => {
      texture.dispose();
    };
  }, [texture, tone]);

  return <ColorGradeLut ref={ref} />;
}
