import { armFrostAudio, getAudioBus, onAudioUnlocked, isFrostMuted, subscribeFrostMuted } from './frostAudio';

/** Restored original cicadas and occasional wind chimes; no music or chord bed. */
const AMBIENCE_LEVEL = 0.55;
const CICADA_LEVEL = 0.16;
const CHIME_LEVEL = 0.07;

const CHIME_NOTES = [1567.98, 1760, 2093, 2349.32, 2637.02];


function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function build(ctx: AudioContext, master: GainNode) {
  const nodes = new Set<AudioNode>();
  const sources = new Set<AudioScheduledSourceNode>();
  const keep = <T extends AudioNode>(node: T): T => { nodes.add(node); return node; };
  const track = <T extends AudioScheduledSourceNode>(node: T): T => {
    keep(node); sources.add(node); return node;
  };
  const out = keep(ctx.createGain());
  out.gain.value = 0;
  out.connect(master);
  out.gain.linearRampToValueAtTime(AMBIENCE_LEVEL, ctx.currentTime + 3);

  const noise = noiseBuffer(ctx, 3);
  const timers = new Set<number>();
  let disposed = false;
  const later = (callback: () => void, delay: number) => {
    const id = window.setTimeout(() => { timers.delete(id); if (!disposed) callback(); }, delay);
    timers.add(id);
  };

  // --- 蝉鸣 ---
  const cicadas = [
    { pan: -0.7, freq: 5200, rate: 210, period: 11 },
    { pan: 0.55, freq: 6100, rate: 245, period: 14 },
    { pan: -0.15, freq: 4600, rate: 190, period: 17 },
    { pan: 0.85, freq: 6800, rate: 260, period: 9 },
  ];
  for (const c of cicadas) {
    const src = track(ctx.createBufferSource());
    src.buffer = noise;
    src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const band = keep(ctx.createBiquadFilter());
    band.type = 'bandpass';
    band.frequency.value = c.freq;
    band.Q.value = 9;
    // 快速颤音：振幅被 ~200Hz 的方波调制，形成「唧」的粗糙质感
    const tremolo = keep(ctx.createGain());
    tremolo.gain.value = 0.5;
    const lfo = track(ctx.createOscillator());
    lfo.type = 'square';
    lfo.frequency.value = c.rate;
    const lfoDepth = keep(ctx.createGain());
    lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(tremolo.gain);
    // 一阵一阵：慢速起伏的音量包络
    const swell = keep(ctx.createGain());
    swell.gain.value = 0;
    const pan = keep(ctx.createStereoPanner());
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
    later(function loop() {
      schedule();
      later(loop, c.period * 1000);
    }, phase * 1000);
  }

  // --- 风铃 ---
  const chime = () => {
    const now = ctx.currentTime;
    const base = CHIME_NOTES[Math.floor(Math.random() * CHIME_NOTES.length)];
    const pan = keep(ctx.createStereoPanner());
    pan.pan.value = Math.random() * 1.2 - 0.6;
    pan.connect(out);
    let remaining = 3;
    // 基音 + 两个不谐和泛音，模仿金属风铃
    for (const [ratio, gain] of [[1, 1], [2.76, 0.35], [5.4, 0.12]] as const) {
      const osc = track(ctx.createOscillator());
      osc.type = 'sine';
      osc.frequency.value = base * ratio;
      const env = keep(ctx.createGain());
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(CHIME_LEVEL * gain, now + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      osc.connect(env).connect(pan);
      osc.start(now);
      osc.onended = () => {
        osc.disconnect(); env.disconnect(); sources.delete(osc); nodes.delete(osc); nodes.delete(env);
        if (--remaining === 0) { pan.disconnect(); nodes.delete(pan); }
      };
      osc.stop(now + 3.3);
    }
    later(chime, 7000 + Math.random() * 12000);
  };
  later(chime, 4000);

  return () => {
    disposed = true;
    timers.forEach(window.clearTimeout); timers.clear();
    sources.forEach(source => { source.onended = null; try { source.stop(); } catch { /* already ended */ } });
    nodes.forEach(node => node.disconnect()); sources.clear(); nodes.clear();
  };
}

/** Opt-in environmental sound; one graph per mount, disposed when muted/hidden/off-home. */
export function armSummerAmbience() {
  let disposed = false;
  let stop: (() => void) | undefined;
  const sync = () => {
    if (disposed || document.hidden || isFrostMuted()) { stop?.(); stop = undefined; return; }
    const bus = getAudioBus();
    if (!bus || stop) return;
    void bus.ctx.resume().catch(() => {});
    stop = build(bus.ctx, bus.master);
  };
  armFrostAudio();
  const offUnlock = onAudioUnlocked(sync);
  const offMute = subscribeFrostMuted(sync);
  document.addEventListener('visibilitychange', sync);
  sync();
  return () => {
    disposed = true; stop?.(); offUnlock(); offMute();
    document.removeEventListener('visibilitychange', sync);
  };
}
