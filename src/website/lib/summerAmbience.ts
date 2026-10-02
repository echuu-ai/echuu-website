import { armFrostAudio, getAudioBus, onAudioUnlocked } from './frostAudio';

/**
 * 官网的夏日氛围声（WebAudio 现场合成，不引入任何音频文件，没有版权问题）：
 *   - 蝉鸣：几只蝉分布在左右声道，高频带通噪声加快速颤音（嘶嘶的「唧——」），
 *     每只各自一阵一阵地强弱起伏，此起彼伏；
 *   - 风铃：偶尔叮一声，带长尾音；
 *   - 铺底：一层很轻的四和弦循环（Fmaj7 → Em7 → Dm7 → Cmaj7），低通、慢起慢落，当作 BGM 的底。
 * 第一次点击或按键之后才开始（浏览器限制），3 秒淡入；共用底部栏的静音开关；
 * 标签页隐藏时淡出暂停。
 */

/** 氛围整体音量（在总音量之下再压一层；总音量已经很低） */
const AMBIENCE_LEVEL = 0.55;
const CICADA_LEVEL = 0.16;
const PAD_LEVEL = 0.05;
const CHIME_LEVEL = 0.07;

const CHORDS = [
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [164.81, 196.0, 246.94, 293.66], // Em7
  [146.83, 174.61, 220.0, 261.63], // Dm7
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
];
const CHORD_SECONDS = 6;
const CHIME_NOTES = [1567.98, 1760, 2093, 2349.32, 2637.02];

let started = false;

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function build(ctx: AudioContext, master: GainNode) {
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(master);
  out.gain.linearRampToValueAtTime(AMBIENCE_LEVEL, ctx.currentTime + 3);

  const noise = noiseBuffer(ctx, 3);
  const timers: number[] = [];

  // --- 蝉鸣 ---
  const cicadas = [
    { pan: -0.7, freq: 5200, rate: 210, period: 11 },
    { pan: 0.55, freq: 6100, rate: 245, period: 14 },
    { pan: -0.15, freq: 4600, rate: 190, period: 17 },
    { pan: 0.85, freq: 6800, rate: 260, period: 9 },
  ];
  for (const c of cicadas) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = c.freq;
    band.Q.value = 9;
    // 快速颤音：振幅被 ~200Hz 的方波调制，形成「唧」的粗糙质感
    const tremolo = ctx.createGain();
    tremolo.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = c.rate;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(tremolo.gain);
    // 一阵一阵：慢速起伏的音量包络
    const swell = ctx.createGain();
    swell.gain.value = 0;
    const pan = ctx.createStereoPanner();
    pan.pan.value = c.pan;
    src.connect(band).connect(tremolo).connect(swell).connect(pan).connect(out);
    src.start();
    lfo.start();
    const phase = Math.random() * c.period;
    const schedule = () => {
      const now = ctx.currentTime;
      const peak = CICADA_LEVEL * (0.55 + Math.random() * 0.45);
      swell.gain.cancelScheduledValues(now);
      swell.gain.setValueAtTime(swell.gain.value, now);
      swell.gain.linearRampToValueAtTime(peak, now + c.period * 0.35);
      swell.gain.linearRampToValueAtTime(peak * 0.85, now + c.period * 0.65);
      swell.gain.linearRampToValueAtTime(peak * 0.08, now + c.period);
      // 中心频率在一阵里略微上扬再回落
      band.frequency.setValueAtTime(c.freq * 0.96, now);
      band.frequency.linearRampToValueAtTime(c.freq * 1.04, now + c.period * 0.5);
      band.frequency.linearRampToValueAtTime(c.freq * 0.97, now + c.period);
    };
    timers.push(window.setTimeout(function loop() {
      schedule();
      timers.push(window.setTimeout(loop, c.period * 1000));
    }, phase * 1000));
  }

  // --- 铺底和弦 ---
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 1100;
  padFilter.connect(out);
  let chordIndex = 0;
  const playChord = () => {
    const now = ctx.currentTime;
    for (const freq of CHORDS[chordIndex % CHORDS.length]) {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(PAD_LEVEL / 4, now + 2.2);
        env.gain.linearRampToValueAtTime(PAD_LEVEL / 5, now + CHORD_SECONDS - 0.5);
        env.gain.linearRampToValueAtTime(0, now + CHORD_SECONDS + 2);
        osc.connect(env).connect(padFilter);
        osc.start(now);
        osc.stop(now + CHORD_SECONDS + 2.1);
      }
    }
    chordIndex += 1;
  };
  playChord();
  timers.push(window.setInterval(playChord, CHORD_SECONDS * 1000));

  // --- 风铃 ---
  const chime = () => {
    const now = ctx.currentTime;
    const base = CHIME_NOTES[Math.floor(Math.random() * CHIME_NOTES.length)];
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.2 - 0.6;
    pan.connect(out);
    // 基音 + 两个不谐和泛音，模仿金属风铃
    for (const [ratio, gain] of [[1, 1], [2.76, 0.35], [5.4, 0.12]] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = base * ratio;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(CHIME_LEVEL * gain, now + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      osc.connect(env).connect(pan);
      osc.start(now);
      osc.stop(now + 3.3);
    }
    timers.push(window.setTimeout(chime, 7000 + Math.random() * 12000));
  };
  timers.push(window.setTimeout(chime, 4000));

  // 标签页隐藏时淡出，回来再淡入
  const onVisibility = () => {
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(document.hidden ? 0 : AMBIENCE_LEVEL, now + (document.hidden ? 0.4 : 2));
  };
  document.addEventListener('visibilitychange', onVisibility);
}

/** 在官网根组件调用一次：第一次点击或按键后开始播放 */
export function armSummerAmbience() {
  if (started) return;
  armFrostAudio();
  onAudioUnlocked(() => {
    if (started) return;
    const bus = getAudioBus();
    if (!bus) return;
    started = true;
    build(bus.ctx, bus.master);
  });
}
