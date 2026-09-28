import { memo, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';
import type { HoleRect } from './OpeningStage3D';

// An original, soft cloud dissolve. Alpha reveals the same DOM sky used below
// the hero; isolated glints accent the boundary without drawing a horizontal rim.
const fragment = /* glsl */ `
uniform float edgeEnabled;
uniform float edgeTime;
uniform float edgeAspect;
uniform float edgeScroll;
float skyHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float skyNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(skyHash(cell), skyHash(cell + vec2(1.0, 0.0)), f.x),
    mix(skyHash(cell + vec2(0.0, 1.0)), skyHash(cell + vec2(1.0)), f.x), f.y);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
  if (edgeEnabled < 0.5 || uv.y > 0.48) return;
  vec2 p = vec2(uv.x * edgeAspect, uv.y);
  float cloud = skyNoise(p * 4.0 + vec2(edgeTime * 0.012, 0.0));
  cloud += skyNoise(p * 9.0 - vec2(0.0, edgeTime * 0.018)) * 0.3;
  float boundary = 0.15 + (cloud - 0.65) * 0.10 + edgeScroll * 0.045;
  float distanceToCloud = uv.y - boundary;
  float opacity = smoothstep(-0.12, 0.17, distanceToCloud);
  // Force the last row fully transparent even at the extremes of the noise.
  opacity *= smoothstep(0.0, 0.045, uv.y);
  vec2 grid = p * 38.0;
  vec2 cell = floor(grid), point = fract(grid) - 0.5;
  float seed = skyHash(cell);
  float pulse = pow(max(0.0, sin(edgeTime * 1.3 + seed * 30.0)), 10.0);
  float star = exp(-abs(point.x) * 95.0 - abs(point.y) * 13.0)
             + exp(-abs(point.y) * 95.0 - abs(point.x) * 13.0);
  float edgeBand = exp(-distanceToCloud * distanceToCloud * 1900.0);
  float shimmer = star * pulse * step(0.91, seed) * edgeBand;
  outputColor.rgb += vec3(0.68, 0.87, 1.0) * shimmer * 0.65;
  // The browser composites this canvas with premultiplied alpha.
  outputColor.rgb *= opacity;
  outputColor.a = inputColor.a * opacity;
}
`;

export const SkyEdgeEffect = memo(function SkyEdgeEffect({ hole }: { hole: React.MutableRefObject<HoleRect> }) {
  const { size } = useThree();
  const effect = useMemo(() => new Effect('EchuuSkyEdge', fragment, {
    blendFunction: BlendFunction.SET,
    uniforms: new Map([
      ['edgeEnabled', new Uniform(0)],
      ['edgeTime', new Uniform(0)],
      ['edgeAspect', new Uniform(1)],
      ['edgeScroll', new Uniform(0)],
    ]),
  }), []);
  useEffect(() => () => effect.dispose?.(), [effect]);
  useFrame((_, delta) => {
    const uniforms = effect.uniforms;
    uniforms.get('edgeEnabled')!.value = hole.current.open ? 1 : 0;
    if (!hole.current.open) return;
    uniforms.get('edgeTime')!.value += Math.min(delta, 0.05);
    uniforms.get('edgeAspect')!.value = size.width / Math.max(1, size.height);
    uniforms.get('edgeScroll')!.value = Math.min(1, window.scrollY / Math.max(1, size.height));
  });
  return <primitive object={effect} />;
});
