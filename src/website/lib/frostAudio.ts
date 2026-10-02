/**
 * 角色悬停音效（参考 igloo.inc：shard.ogg 循环音的音量跟随鼠标划动速度；悬停时随机三种短促 beep）。
 * igloo 的音频是它自己的素材，这里用 WebAudio 现场合成，不引入任何音频文件：
 *   - 冰晶声：高频带通噪声 + 随速度变密的高音「叮」；
 *   - beep：三种音高随机一个，两次之间至少 0.4 秒。
 * 浏览器要求先有一次点击或按键才能出声：在那之前一律静音，不会主动请求权限。
 * 底部栏有静音开关（setFrostMuted），状态存在 localStorage。
 */

/** 总音量（音效与夏日氛围共用；整体压低，作为背景存在） */
const MASTER = 0.2;
const MUTE_KEY = 'echuu-sound-muted';
const BEEP_NOTES = [1318.5, 1567.98, 2093];
const SPARKLE_NOTES = [2349.3, 2637, 3136, 3520, 4186];

type Voice = { ctx: AudioContext; master: GainNode; shard: GainNode; band: BiquadFilterNode };

let voice: Voice | null = null;
let unlocked = false;
let shardVolume = 0;
let lastBeep = 0;
let lastSparkle = 0;
let muted = (() => {
  try { return window.localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
})();
const muteListeners = new Set<() => void>();

/** 底部栏静音开关读写；状态存 localStorage，刷新后保持 */
export function isFrostMuted() {
  return muted;
}
export function setFrostMuted(next: boolean) {
  muted = next;
  try { window.localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* 隐私模式下不持久化 */ }
  if (voice) voice.master.gain.setTargetAtTime(next ? 0 : MASTER, voice.ctx.currentTime, 0.05);
  muteListeners.forEach((listener) => listener());
}
export function subscribeFrostMuted(listener: () => void) {
  muteListeners.add(listener);
  return () => { muteListeners.delete(listener); };
}

const unlockListeners = new Set<() => void>();

function unlock() {
  unlocked = true;
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
  voice?.ctx.resume().catch(() => {});
  unlockListeners.forEach((listener) => listener());
  unlockListeners.clear();
}

/** 第一次点击 / 按键后回调（已解锁则立即回调） */
export function onAudioUnlocked(listener: () => void) {
  if (unlocked) { listener(); return () => {}; }
  unlockListeners.add(listener);
  return () => { unlockListeners.delete(listener); };
}

/** 共用的音频上下文与总音量节点（受静音开关控制）；未解锁时为 null */
export function getAudioBus(): { ctx: AudioContext; master: GainNode } | null {
  const v = ensureVoice();
  return v ? { ctx: v.ctx, master: v.master } : null;
}

/** 只登记解锁监听，不创建 AudioContext */
export function armFrostAudio() {
  if (unlocked) return;
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

function ensureVoice(): Voice | null {
  if (!unlocked) return null;
  if (voice) return voice;
  const AudioCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  const ctx = new AudioCtor();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER;
  master.connect(ctx.destination);

  // 冰晶沙沙声：2 秒循环白噪声 → 高通 → 共振带通（中心频率缓慢游移）→ 音量
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const high = ctx.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = 3200;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 6500;
  band.Q.value = 6;
  const shard = ctx.createGain();
  shard.gain.value = 0;
  noise.connect(high).connect(band).connect(shard).connect(master);
  noise.start();

  voice = { ctx, master, shard, band };
  return voice;
}

function ping(v: Voice, frequency: number, gain: number, duration: number, type: OscillatorType = 'sine') {
  const now = v.ctx.currentTime;
  const osc = v.ctx.createOscillator();
  const env = v.ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gain, now + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(env).connect(v.master);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** 指针进入角色：igloo 的 playBeep，三种随机，间隔至少 0.4s */
export function playFrostBeep(nowSeconds: number) {
  if (muted || nowSeconds - lastBeep < 0.4) return;
  const v = ensureVoice();
  if (!v) return;
  lastBeep = nowSeconds;
  const note = BEEP_NOTES[Math.floor(Math.random() * BEEP_NOTES.length)];
  ping(v, note, 0.18, 0.09, 'triangle');
  window.setTimeout(() => voice && ping(voice, note * 1.5, 0.1, 0.07, 'triangle'), 70);
}

/**
 * 每帧调用：target 为 0–1 的划动速度。igloo：变大时插值 0.2，回落时 0.05，最终音量 ×0.5。
 * hidden 为 true（首屏离开视口、标签页隐藏）时直接压到 0。
 */
export function updateFrostAudio(target: number, nowSeconds: number, hidden: boolean) {
  const goal = hidden ? 0 : target;
  shardVolume += (goal - shardVolume) * (goal > shardVolume ? 0.2 : 0.05);
  if (shardVolume < 0.002 && !voice) return;
  const v = ensureVoice();
  if (!v) return;
  const t = v.ctx.currentTime;
  v.shard.gain.setTargetAtTime(shardVolume * 0.5, t, 0.03);
  v.band.frequency.setTargetAtTime(5200 + Math.sin(nowSeconds * 1.7) * 1400 + shardVolume * 1800, t, 0.08);
  // 划得越快，高音「叮」越密
  if (shardVolume > 0.05 && nowSeconds - lastSparkle > 0.16 - shardVolume * 0.11) {
    lastSparkle = nowSeconds;
    ping(v, SPARKLE_NOTES[Math.floor(Math.random() * SPARKLE_NOTES.length)], 0.05 * shardVolume, 0.28);
  }
}
