import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const audio = vi.hoisted(() => ({ muted: true, listener: () => {}, bus: vi.fn(), nodes: [] as any[] }));
vi.mock('./frostAudio', () => ({
 armFrostAudio: vi.fn(), getAudioBus: audio.bus, isFrostMuted: () => audio.muted,
 onAudioUnlocked: () => () => {},
 subscribeFrostMuted: (fn: () => void) => { audio.listener = fn; return () => {}; },
}));
import { armSummerAmbience } from './summerAmbience';
beforeEach(() => {
 vi.useFakeTimers(); audio.muted = true; audio.nodes = []; audio.bus.mockClear();
 const node = () => {
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const n = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), gain: param(), frequency: param(), playbackRate: param(), Q: param(), pan: param() };
  n.connect.mockImplementation((next: unknown) => next); audio.nodes.push(n); return n;
 };
 audio.bus.mockReturnValue({ master: {}, ctx: { currentTime: 0, sampleRate: 100, resume: async () => {}, createBuffer: () => ({ getChannelData: () => new Float32Array(300) }), createGain: node, createBufferSource: node, createOscillator: node, createBiquadFilter: node, createStereoPanner: node } });
});
afterEach(() => vi.useRealTimers());
it('waits for sound opt-in and clears every timer and node on unmount', () => {
 const cleanup = armSummerAmbience();
 expect(audio.nodes).toHaveLength(0);
 audio.muted = false; audio.listener();
 expect(audio.nodes.length).toBeGreaterThan(0);
 vi.advanceTimersByTime(4100); // includes the first chime
 cleanup();
 expect(vi.getTimerCount()).toBe(0);
 for (const node of audio.nodes) expect(node.disconnect).toHaveBeenCalled();
});
it('does not duplicate the graph and fully stops when muted', () => {
 audio.muted = false; const cleanup = armSummerAmbience();
 const count = audio.nodes.length; audio.listener();
 expect(audio.nodes).toHaveLength(count);
 audio.muted = true; audio.listener();
 expect(vi.getTimerCount()).toBe(0);
 cleanup();
});
