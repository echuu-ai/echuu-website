import { getAudioBus, isFrostMuted } from './frostAudio';
import { OPENING, OPENING_ACT2 } from '../home/openingTimeline';

/**
 * 开场拍点音效（docs/website-opening-director.md 第 3 节「声音 / 光」列）。
 * 全部 WebAudio 现场合成，不引入音频文件；走 frostAudio 的总线，所以和底部栏的静音开关一致、默认很轻。
 * updateOpeningSound(t) 由 OpeningHero 的时钟轮询调用：越过某个拍点就响一次；时间往回跳（重播）就重置。
 */

type Cue = { at: number; play: (ctx: AudioContext, out: AudioNode) => void };

const LEVEL = 0.5;

function noise(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

/** 一段带包络的滤波噪声：纸声、布料声、风声都用它 */
function rustle(ctx: AudioContext, out: AudioNode, { duration, from, to, q, gain, type = 'bandpass' as BiquadFilterType }: {
  duration: number; from: number; to: number; q: number; gain: number; type?: BiquadFilterType;
}) {
  const now = ctx.currentTime;
  const src = noise(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, now);
  filter.frequency.exponentialRampToValueAtTime(to, now + duration);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain * LEVEL, now + Math.min(0.06, duration * 0.3));
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter).connect(env).connect(out);
  src.start(now);
  src.stop(now + duration + 0.05);
}

/** 显形：三个泛音慢慢叠起来的 shimmer */
function shimmer(ctx: AudioContext, out: AudioNode) {
  const now = ctx.currentTime;
  [1046.5, 1568, 2093, 2637].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = ctx.createGain();
    const start = now + i * 0.18;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.05 * LEVEL / (i + 1), start + 0.4);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 2.4);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + 2.5);
  });
}

/** 入窗：低沉的一声 + 一点空气 */
function thump(ctx: AudioContext, out: AudioNode) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(48, now + 0.5);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(0.22 * LEVEL, now + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  osc.connect(env).connect(out);
  osc.start(now);
  osc.stop(now + 0.75);
  rustle(ctx, out, { duration: 0.9, from: 1800, to: 400, q: 0.6, gain: 0.08, type: 'lowpass' });
}

const FOLD = OPENING_ACT2.foldStart;
const BEAT = (OPENING_ACT2.flyStart - OPENING_ACT2.foldStart) / 4;
const CUES: Cue[] = [
  { at: 0.25, play: shimmer },
  // 翻身：布料
  { at: OPENING.standStart + 0.1, play: (c, o) => rustle(c, o, { duration: 0.7, from: 900, to: 2400, q: 0.9, gain: 0.07 }) },
  // 站起、翅膀展开：羽毛扑动（两下）
  { at: OPENING.standStart + 5.2, play: (c, o) => rustle(c, o, { duration: 0.35, from: 600, to: 1500, q: 1.2, gain: 0.08 }) },
  { at: OPENING.standStart + 5.5, play: (c, o) => rustle(c, o, { duration: 0.4, from: 500, to: 1300, q: 1.2, gain: 0.07 }) },
  // 纸被风掀起
  { at: OPENING_ACT2.riseStart, play: (c, o) => rustle(c, o, { duration: 1.2, from: 2500, to: 5200, q: 0.7, gain: 0.06 }) },
  // 四声折纸
  ...[0, 1, 2, 3].map((k): Cue => ({ at: FOLD + k * BEAT + BEAT * 0.55, play: (c, o) => rustle(c, o, { duration: 0.12, from: 3200, to: 1800, q: 2.5, gain: 0.12 }) })),
  // 起飞 whoosh
  { at: OPENING_ACT2.flyStart, play: (c, o) => rustle(c, o, { duration: 1.1, from: 400, to: 3600, q: 1.4, gain: 0.1 }) },
  // 入窗
  { at: OPENING.openStart, play: thump },
];

let lastT = -1;

export function updateOpeningSound(t: number, started: boolean) {
  if (!started) { lastT = -1; return; }
  // 重播 / 跳过：时间往回跳就重置；往前跳过一大段（跳过开场）就不补放
  if (t < lastT - 0.5) lastT = -1;
  const from = lastT;
  lastT = t;
  if (from < 0 || t - from > 1.5) return;
  if (isFrostMuted() || document.hidden) return;
  const bus = getAudioBus();
  if (!bus || bus.ctx.state !== 'running') return;
  for (const cue of CUES) {
    if (cue.at > from && cue.at <= t) cue.play(bus.ctx, bus.master);
  }
}
