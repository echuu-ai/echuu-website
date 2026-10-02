import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';
import { createEdgeNoise } from './edgeNoise';
import type { HoleRect } from './OpeningStage3D';

/**
 * 首屏 3D 与下方天空的衔接切口。
 *
 * 边缘参考 Shopify Editions Winter '26 的 Overlay 擦除：阈值 = 竖直位置 + 大尺度 fbm 起伏 + 小尺度细纹，
 * 切口用 fwidth 抗锯齿，边缘干净；切口两侧一道很窄的亮线，3D 一侧带一点提亮。
 * 色散参考 igloo.inc 的场景合成：5 次采样光谱加权 + 桶形畸变，只出现在切口上方一条带里，
 * 滚动时整个 3D 画面也按速度出现色散（中段强、四边收），停下后回落，只留切口上方一层很轻的彩边。
 * 切口以下输出透明，露出页面主体共用的 DOM 天空。
 * 静止时切口贴着首屏底部；往下滚，切口跟着往上推。只在定格（hole.open）后生效。
 */

/** 静止时的切口进度：切口贴着首屏最底边，只露出一道撕纸边 */
const SEAM_REST = 0.09;
/** 滚过首屏高度的这个比例时 3D 完全被切掉（大于 1：首屏离开视口时还有余量） */
const SEAM_FULL_SCROLL = 1.6;
/** 色散带高度（首屏高度比例）：切口上方这一段有彩边 */
const CA_BAND = 0.22;
/** 滚动时整个 3D 画面的色散上限（桶形畸变强度，igloo 原值约 12，这里收敛一些） */
const SCROLL_CA = 4;

const fragment = /* glsl */ `
uniform float seamEnabled;
uniform float seamProgress;
uniform float seamTime;
uniform vec2 seamResolution;
uniform sampler2D seamNoise;
uniform float seamMotion;
uniform vec2 seamJitter;

#define SEAM_CA_ITER 5

// igloo 式色散：沿桶形畸变方向采样 5 次，按光谱权重混合出彩边
vec4 seamSpectrum(float t) {
  float lo = step(t, 0.5);
  float w = clamp(1.0 - abs(2.0 * clamp((t - 1.0 / 6.0) / (4.0 / 6.0), 0.0, 1.0) - 1.0), 0.0, 1.0);
  return pow(vec4(lo, 1.0, 1.0 - lo, 1.0) * vec4(1.0 - w, w, 1.0 - w, 1.0), vec4(1.0 / 2.2));
}
vec2 seamBarrel(vec2 c, float amt) { vec2 cc = c - 0.5; return c + cc * dot(cc, cc) * amt; }
vec4 seamChromatic(vec2 st, float amount) {
  vec4 sumCol = vec4(0.0);
  vec4 sumW = vec4(0.0);
  for (int i = 0; i < SEAM_CA_ITER; ++i) {
    float t = float(i) / float(SEAM_CA_ITER - 1);
    vec4 w = seamSpectrum(t);
    sumW += w;
    sumCol += w * texture2D(inputBuffer, clamp(seamBarrel(st, amount * t), 0.0, 1.0));
  }
  return sumCol / sumW;
}
float seamHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// 预计算噪声，归一化到 [-1, 1]
float seamSample(vec2 st) {
  return texture2D(seamNoise, st).r * 2.0 - 1.0;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (seamEnabled < 0.5) { outputColor = inputColor; return; }

  float aspect = seamResolution.x / seamResolution.y;
  vec2 aspectUv = vec2(uv.x * aspect, uv.y) + vec2(0.0, seamTime * 0.02);
  // 大尺度起伏：缓慢漂移，切口像活的
  float swell = seamSample(aspectUv * 0.375 - seamTime * 0.00625);
  // 小尺度细纹：替代 Shopify 的泥纹法线贴图，给边缘一点纸纤维感
  float grain = seamSample(uv * vec2(aspect, 1.0) * 2.0 + 0.37) * mix(0.3, 0.6, 0.5 + 0.5 * sin(seamTime - uv.x * 10.0)) * 0.1;

  float threshold = uv.y * 2.0 - 1.0;
  threshold = threshold / 1.2 + swell * 0.1 + grain;
  threshold = threshold * 0.5 + 0.5;

  // 抗锯齿的切口：edge > 0 的部分被切掉
  float edge = seamProgress - threshold;
  float aa = fwidth(edge) * 4.0;
  float cut = smoothstep(-aa, aa, edge);
  // 最底一行一定透明，起伏取到极值也不会留下一条硬边
  cut = max(cut, 1.0 - smoothstep(0.0, 0.01, uv.y));

  // 色散带：切口上方逐渐减弱；左右两端收掉，避免屏幕边缘被拉扯
  float above = max(-edge, 0.0);
  float band = (1.0 - smoothstep(0.0, ${CA_BAND.toFixed(3)}, above)) * smoothstep(1.0, 0.75, abs(uv.x * 2.0 - 1.0));
  float bandAmount = 1.1 * band * mix(0.45, 1.0, seamMotion);
  // 整个 3D 画面的色散（igloo 的 modulator）：画面中段最强，四边收到 0；只在滚动时出现
  float vignette = smoothstep(1.0, 0.7, abs(uv.x * 2.0 - 1.0)) * smoothstep(1.0, 0.7, abs(uv.y * 2.0 - 1.0));
  float sceneAmount = ${SCROLL_CA.toFixed(2)} * vignette * seamMotion;
  float amount = max(bandAmount, sceneAmount);
  vec4 color = inputColor;
  if (amount > 0.002 && cut < 1.0) {
    // 轻微抖动打散分层，幅度很小，避免满屏颗粒
    float jitter = mix(0.8, 1.0, seamHash(gl_FragCoord.xy + seamJitter));
    color = seamChromatic(uv, amount * jitter);
  }

  // 3D 一侧：贴近切口的地方轻微提亮
  float rim = 1.0 - smoothstep(0.0, 0.02, abs(edge));
  color.rgb *= 1.0 + rim * 0.2 * (1.0 - cut);

  // 画布按预乘 alpha 合成：切掉的部分整体透明
  color *= 1.0 - cut;

  // 切口亮线：很窄，亮度随时间与横向位置轻微起伏
  float line = 1.0 - smoothstep(0.0, 0.004, abs(edge));
  float flicker = mix(0.55, 0.95, 0.5 + 0.5 * swell * sin(seamTime + uv.x * 10.0));
  color = mix(color, vec4(0.9, 0.97, 1.0, 1.0), line * flicker);

  outputColor = clamp(color, 0.0, 1.0);
}
`;

export const SkyEdgeEffect = memo(function SkyEdgeEffect({ hole }: { hole: React.MutableRefObject<HoleRect> }) {
  const { size } = useThree();
  const effect = useMemo(() => new Effect('EchuuSkyEdge', fragment, {
    blendFunction: BlendFunction.SET,
    // 色散会读取 inputBuffer 的偏移位置，必须独占一个 EffectPass
    attributes: EffectAttribute.CONVOLUTION,
    uniforms: new Map<string, THREE.Uniform>([
      ['seamEnabled', new THREE.Uniform(0)],
      ['seamProgress', new THREE.Uniform(SEAM_REST)],
      ['seamTime', new THREE.Uniform(0)],
      ['seamResolution', new THREE.Uniform(new THREE.Vector2(1, 1))],
      ['seamNoise', new THREE.Uniform(createEdgeNoise())],
      ['seamMotion', new THREE.Uniform(0)],
      ['seamJitter', new THREE.Uniform(new THREE.Vector2())],
    ]),
  }), []);
  const motion = useRef({ lastY: -1, value: 0 });
  useEffect(() => () => {
    (effect.uniforms.get('seamNoise')!.value as THREE.DataTexture).dispose();
    effect.dispose?.();
  }, [effect]);

  useFrame((_, delta) => {
    const uniforms = effect.uniforms;
    uniforms.get('seamEnabled')!.value = hole.current.open ? 1 : 0;
    if (!hole.current.open) return;
    uniforms.get('seamTime')!.value += Math.min(delta, 0.05);
    (uniforms.get('seamResolution')!.value as THREE.Vector2).set(size.width, size.height);
    const scrolled = Math.min(1, Math.max(0, window.scrollY / Math.max(1, size.height * SEAM_FULL_SCROLL)));
    uniforms.get('seamProgress')!.value = SEAM_REST + (1 - SEAM_REST) * scrolled;

    // 滚动速度（每帧滚过的首屏高度比例）驱动色散强度：滚得越快越强，停下后约半秒回落
    const m = motion.current;
    const y = window.scrollY;
    const speed = m.lastY < 0 ? 0 : Math.abs(y - m.lastY) / Math.max(1, size.height);
    m.lastY = y;
    m.value = Math.min(1, Math.max(speed * 14, m.value * Math.exp(-Math.min(delta, 0.05) * 4)));
    uniforms.get('seamMotion')!.value = m.value;
    // 抖动只在彩边变化时刷新，静止时不闪
    if (m.value > 0.01) (uniforms.get('seamJitter')!.value as THREE.Vector2).set(Math.random() * 100, Math.random() * 100);
  });
  return <primitive object={effect} />;
});
