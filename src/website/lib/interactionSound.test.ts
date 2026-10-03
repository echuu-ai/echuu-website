import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ muted: true, node: { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void), frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }, getBus: vi.fn() }));
vi.mock('./frostAudio', () => ({ isFrostMuted: () => state.muted, getAudioBus: state.getBus }));
import { playInteractionSound } from './interactionSound';
beforeEach(() => {
 vi.clearAllMocks();
 state.node.connect.mockReturnValue(state.node);
 state.getBus.mockReturnValue({ master: {}, ctx: { state: 'running', currentTime: 0, createOscillator: () => state.node, createGain: () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }) } });
});
it('does not create an audio context when muted', () => {
 state.muted = true; playInteractionSound('charm'); expect(state.getBus).not.toHaveBeenCalled();
});
it('limits repeated accents and disconnects completed nodes', () => {
 state.muted = false;
 playInteractionSound('charm'); playInteractionSound('charm'); playInteractionSound('gift');
 expect(state.node.start).toHaveBeenCalledOnce();
 state.node.onended?.(); expect(state.node.disconnect).toHaveBeenCalledOnce();
});
