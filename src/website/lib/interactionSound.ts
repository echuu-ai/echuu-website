import { getAudioBus, isFrostMuted } from './frostAudio';

export type InteractionSound = 'plane' | 'pencil' | 'charm' | 'gift';
const COOLDOWN: Record<InteractionSound, number> = { plane: 900, pencil: 110, charm: 650, gift: 400 };
const last: Partial<Record<InteractionSound, number>> = {};
let lastAny = -Infinity;
let noise: AudioBuffer | undefined;

/** Small tactile accents only: no soundtrack, no timers, no work while muted/hidden. */
export function playInteractionSound(kind: InteractionSound, strength = 1) {
  const now = performance.now();
  if (isFrostMuted() || document.hidden || now - (last[kind] ?? -Infinity) < COOLDOWN[kind] || now - lastAny < 45) return;
  const bus = getAudioBus();
  if (!bus || bus.ctx.state !== 'running') return;
  last[kind] = lastAny = now;
  const { ctx, master } = bus;
  const t = ctx.currentTime;
  const level = Math.max(0.15, Math.min(1, strength));
  const duration = kind === 'plane' ? 0.28 : kind === 'pencil' ? 0.085 : kind === 'charm' ? 0.22 : 0.16;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime((kind === 'charm' ? 0.035 : 0.065) * level, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  env.connect(master);
  if (kind === 'plane' || kind === 'pencil') {
    if (!noise) {
      noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.3), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(kind === 'plane' ? 1600 : 2400, t);
    filter.frequency.exponentialRampToValueAtTime(kind === 'plane' ? 450 : 1800, t + duration);
    source.connect(filter).connect(env);
    source.onended = () => { source.disconnect(); filter.disconnect(); env.disconnect(); };
    source.start(t); source.stop(t + duration);
  } else {
    const source = ctx.createOscillator();
    source.type = 'sine';
    source.frequency.setValueAtTime(kind === 'charm' ? 1850 : 420, t);
    source.frequency.exponentialRampToValueAtTime(kind === 'charm' ? 1800 : 170, t + duration);
    source.connect(env);
    source.onended = () => { source.disconnect(); env.disconnect(); };
    source.start(t); source.stop(t + duration);
  }
}
