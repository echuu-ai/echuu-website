import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import * as THREE from 'three';
import { createEdgeNoise } from './edgeNoise';
import type { HoleRect } from './OpeningStage3D';
import { OPENING, openingTime, smoothstep, type OpeningClock } from '../openingTimeline';
import { pctToProgress, seamTuning } from './seamTuning';

/**
 * 首屏 3D 与下方天空的衔接切口。
 *
 * 边缘参考 Shopify Editions Winter '26 的 Overlay 擦除：阈值 = 竖直位置 + 大尺度 fbm 起伏 + 小尺度细纹，
 * 切口用 fwidth 抗锯齿，边缘干净；切口两侧一道很窄的亮线，3D 一侧带一点提亮。
 * 色散参考 igloo.inc 的场景合成：5 次采样光谱加权 + 桶形畸变，只出现在切口上方一条带里，
 * 滚动时整个 3D 画面也按速度出现色散（中段强、四边收），停下后回落，只留切口上方一层很轻的彩边。
 * 切口以下输出透明，露出页面主体共用的 DOM 天空。
 * 切口固定贴着首屏底部，随页面一起滚走（不随滚动上推）。只在定格（hole.open）后生效。
 */

// 所有可调参数在 seamTuning.ts（开发环境有调节面板 SeamTuningPanel）

const fragment = /* glsl */ `
uniform float portalStrength;
uniform float openingMood;
uniform float seamEnabled;
uniform float seamProgress;
uniform float seamTime;
uniform vec2 seamResolution;
uniform sampler2D seamNoise;
uniform float seamMotion;
uniform float seamSwellAmp;
uniform float seamGrainAmp;
uniform float seamFiberAmp;
uniform float seamRim;
uniform float seamLineWidth;
uniform float seamLineAlpha;
uniform float seamBandHeight;
uniform float seamBandAmount;
uniform float seamSceneCA;
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
  if (seamEnabled < 0.5) {
    outputColor = inputColor;
    if (portalStrength > 0.001) {
      // 开窗冲进去那一下：igloo 式 5 次光谱采样色散 + 桶形畸变，越靠画面边缘越强，脸和画面中心保持干净
      vec2 radial = uv - 0.5;
      float edge = smoothstep(0.08, 0.6, length(radial));
      vec3 split = seamChromatic(uv, portalStrength * 0.16).rgb;
      outputColor.rgb = mix(inputColor.rgb, split, edge);
      outputColor.rgb *= 1.0 - edge * portalStrength * 0.045;
      outputColor.rgb += vec3(0.012, 0.025, 0.032) * edge * portalStrength * inputColor.a;
    }
    if (openingMood > 0.001) {
      // 苏醒到开窗之前：压暗、略去饱和、偏冷蓝（夜里醒来）；开窗后回到首屏的光
      float lum = dot(outputColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 cool = mix(outputColor.rgb, vec3(lum), 0.28) * vec3(0.8, 0.92, 1.14) * 0.64;
      outputColor.rgb = mix(outputColor.rgb, cool, openingMood);
    }
    return;
  }

  float aspect = seamResolution.x / seamResolution.y;
  vec2 aspectUv = vec2(uv.x * aspect, uv.y) + vec2(0.0, seamTime * 0.02);
  // 大尺度起伏：缓慢漂移，切口像活的
  float swell = seamSample(aspectUv * 0.375 - seamTime * 0.00625);
  // 小尺度细纹：替代 Shopify 的泥纹法线贴图，给边缘一点纸纤维感
  float grain = seamSample(uv * vec2(aspect, 1.0) * 2.0 + 0.37) * mix(0.3, 0.6, 0.5 + 0.5 * sin(seamTime - uv.x * 10.0)) * 0.1;
  // 纸纤维：更细更碎的锯齿，让贴底的切口一眼看得出是撕开的
  // 纤维随 seamTime 横向流动：滚动时 seamTime 加速，边缘跟着翻涌
  float fiber = seamSample(uv * vec2(aspect, 1.0) * 9.0 + vec2(1.7 + seamTime * 0.035, 1.7)) * 0.022
    + seamSample(uv * vec2(aspect, 1.0) * 23.0 + vec2(4.1 - seamTime * 0.06, 4.1)) * 0.009;

  float threshold = uv.y * 2.0 - 1.0;
  // 起伏收小：切口贴底时，最高处也不超过首屏底部约 3%
  // 平均位置压低，起伏适中，主要靠细碎锯齿体现撕纸感
  // 噪声整体减去它的上限：切口只往上撕，最低点落在 seamProgress，不会被画布底边切成直线
  // （fbm 实际很少超过 ±0.7；grain 最大 0.06，fiber 最大 0.031）
  float tearRange = 0.7 * (seamSwellAmp + 0.06 * seamGrainAmp + 0.031 * seamFiberAmp);
  threshold = threshold / 1.2 + swell * seamSwellAmp + grain * seamGrainAmp + fiber * seamFiberAmp - tearRange;
  threshold = threshold * 0.5 + 0.5;

  // 抗锯齿的切口：edge > 0 的部分被切掉
  float edge = seamProgress - threshold;
  float aa = fwidth(edge) * 4.0;
  float cut = smoothstep(-aa, aa, edge);
  // 最底一行一定透明，起伏取到极值也不会留下一条硬边
  cut = max(cut, 1.0 - smoothstep(0.0, 0.01, uv.y));

  // 色散带：切口上方逐渐减弱；左右两端收掉，避免屏幕边缘被拉扯
  float above = max(-edge, 0.0);
  float band = (1.0 - smoothstep(0.0, max(seamBandHeight, 1e-4), above)) * smoothstep(1.0, 0.75, abs(uv.x * 2.0 - 1.0));
  float bandAmount = seamBandAmount * band * mix(0.45, 1.0, seamMotion);
  // 整个 3D 画面的色散（igloo 的 modulator）：画面中段最强，四边收到 0；只在滚动时出现
  float vignette = smoothstep(1.0, 0.7, abs(uv.x * 2.0 - 1.0)) * smoothstep(1.0, 0.7, abs(uv.y * 2.0 - 1.0));
  float sceneAmount = seamSceneCA * vignette * seamMotion;
  float amount = max(bandAmount, sceneAmount);
  vec4 color = inputColor;
  if (amount > 0.002 && cut < 1.0) {
    // 轻微抖动打散分层，幅度很小，避免满屏颗粒
    float jitter = mix(0.8, 1.0, seamHash(gl_FragCoord.xy + seamJitter));
    color = seamChromatic(uv, amount * jitter);
  }

  // 3D 一侧：贴近切口的地方轻微提亮
  float rim = 1.0 - smoothstep(0.0, 0.02, abs(edge));
  color.rgb *= 1.0 + rim * seamRim * (1.0 - cut);

  // 画布按预乘 alpha 合成：切掉的部分整体透明
  color *= 1.0 - cut;

  // 切口亮线：很窄，亮度随时间与横向位置轻微起伏
  float line = (1.0 - smoothstep(0.0, max(seamLineWidth, 1e-5), abs(edge))) * seamLineAlpha;
  float flicker = mix(0.55, 0.95, 0.5 + 0.5 * swell * sin(seamTime + uv.x * 10.0));
  color = mix(color, vec4(0.9, 0.97, 1.0, 1.0), line * flicker);

  outputColor = clamp(color, 0.0, 1.0);
}
`;

export const SkyEdgeEffect = memo(function SkyEdgeEffect({ hole, clock }: { hole: React.MutableRefObject<HoleRect>; clock: OpeningClock }) {
  const { size } = useThree();
  const effect = useMemo(() => new Effect('EchuuSkyEdge', fragment, {
    blendFunction: BlendFunction.SET,
    // 色散会读取 inputBuffer 的偏移位置，必须独占一个 EffectPass
    attributes: EffectAttribute.CONVOLUTION,
    uniforms: new Map<string, THREE.Uniform>([
      ['portalStrength', new THREE.Uniform(0)],
      ['openingMood', new THREE.Uniform(0)],
      ['seamEnabled', new THREE.Uniform(0)],
      ['seamProgress', new THREE.Uniform(pctToProgress(seamTuning.restPct))],
      ['seamTime', new THREE.Uniform(0)],
      ['seamResolution', new THREE.Uniform(new THREE.Vector2(1, 1))],
      ['seamNoise', new THREE.Uniform(createEdgeNoise())],
      ['seamMotion', new THREE.Uniform(0)],
      ['seamJitter', new THREE.Uniform(new THREE.Vector2())],
      ...(['seamSwellAmp', 'seamGrainAmp', 'seamFiberAmp', 'seamRim', 'seamLineWidth', 'seamLineAlpha', 'seamBandHeight', 'seamBandAmount', 'seamSceneCA']
        .map((name) => [name, new THREE.Uniform(0)] as [string, THREE.Uniform])),
    ]),
  }), []);
  const motion = useRef({ lastY: -1, value: 0 });
  useEffect(() => () => {
    (effect.uniforms.get('seamNoise')!.value as THREE.DataTexture).dispose();
    effect.dispose?.();
  }, [effect]);

  useFrame((_, delta) => {
    const uniforms = effect.uniforms;
    const openingSeconds = openingTime(clock, performance.now());
    uniforms.get('portalStrength')!.value = smoothstep(OPENING.openStart - 0.1, OPENING.openStart + 0.45, openingSeconds)
      * (1 - smoothstep(OPENING.openStart + 0.6, OPENING.openStart + 2.0, openingSeconds));
    // 苏醒光：纸交接完（约 1.4 s）压到最暗最冷，开窗时（openStart 前 0.3 s 到后 0.9 s）回到首屏的光
    uniforms.get('openingMood')!.value = smoothstep(0.2, 1.6, openingSeconds)
      * (1 - smoothstep(OPENING.openStart - 0.3, OPENING.openStart + 0.9, openingSeconds));
    uniforms.get('seamEnabled')!.value = hole.current.open ? 1 : 0;
    if (!hole.current.open) return;
    (uniforms.get('seamResolution')!.value as THREE.Vector2).set(size.width, size.height);

    // 滚动速度（每帧滚过的首屏高度比例）：滚得越快越强，停下后约半秒回落
    const m = motion.current;
    const y = window.scrollY;
    const speed = m.lastY < 0 ? 0 : Math.abs(y - m.lastY) / Math.max(1, size.height);
    m.lastY = y;
    m.value = Math.min(1, Math.max(speed * 14, m.value * Math.exp(-Math.min(delta, 0.05) * 4)));
    uniforms.get('seamMotion')!.value = m.value;

    // 切口跟着滚动「速度」动，而不是滚动位置：滚动时边缘加速流动、翻涌并稍微抬起，停下后落回底边。
    // 不按位置上推，3D 与标题、按钮作为一个整体滚走，标题不会被留在蓝底上
    uniforms.get('seamTime')!.value += Math.min(delta, 0.05) * (1 + m.value * 9);
    const t = seamTuning;
    uniforms.get('seamProgress')!.value = pctToProgress(t.restPct + t.liftPct * m.value);
    uniforms.get('seamSwellAmp')!.value = t.swell;
    uniforms.get('seamGrainAmp')!.value = t.grain;
    uniforms.get('seamFiberAmp')!.value = t.fiber;
    uniforms.get('seamRim')!.value = t.rim;
    uniforms.get('seamLineWidth')!.value = t.lineWidth;
    uniforms.get('seamLineAlpha')!.value = t.lineAlpha;
    uniforms.get('seamBandHeight')!.value = t.bandHeight;
    uniforms.get('seamBandAmount')!.value = t.bandAmount;
    uniforms.get('seamSceneCA')!.value = t.sceneCA;
    // 抖动只在彩边变化时刷新，静止时不闪
    if (m.value > 0.01) (uniforms.get('seamJitter')!.value as THREE.Vector2).set(Math.random() * 100, Math.random() * 100);
  });
  return <primitive object={effect} />;
});
