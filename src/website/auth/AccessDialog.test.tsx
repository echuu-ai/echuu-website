import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AccessDialog } from './AccessDialog';
import { AuthError, betaAvailability, joinWaitlist, registerBeta, redeemInvite } from './api';
import { trackEvent } from '../lib/googleAnalytics';
import { generateInviteCode, normalizeInviteCode } from './inviteCode';

vi.mock('../locale-context', () => ({ useLocale: () => ({ locale: 'zh' }) }));
vi.mock('../lib/googleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('./api', async original => ({ ...await original<typeof import('./api')>(), registerBeta: vi.fn(), redeemInvite: vi.fn(), betaAvailability: vi.fn(), joinWaitlist: vi.fn() }));
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  sessionStorage.clear(); history.replaceState({}, '', '/website/zh');
  vi.mocked(betaAvailability).mockResolvedValue('open');
  vi.spyOn(window.location, 'assign').mockImplementation(() => {});
});
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => { await act(async () => roots.splice(0).forEach(root => root.unmount())); document.body.replaceChildren(); vi.restoreAllMocks(); vi.resetAllMocks(); });
async function open(mode: 'signup' | 'invite' = 'signup') {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); roots.push(root);
  await act(async () => root.render(<AccessDialog mode={mode} onClose={vi.fn()} onModeChange={vi.fn()} returnFocusRef={createRef()} />));
}
async function change(name: string, value: string) {
  await act(async () => Simulate.change(document.querySelector(`[name=${name}]`)!, { target: { value } } as never));
}
async function submit() { await act(async () => Simulate.submit(document.querySelector('form')!)); }
async function fill() { await change('name', '小星'); await change('email', 'test@example.com'); await change('password', 'test-password-only'); }

it('shows three required fields and an optional invitation while availability is unresolved', async () => {
  vi.mocked(betaAvailability).mockReturnValue(new Promise(() => {}));
  await open();
  for (const field of ['name', 'email', 'password']) expect(document.querySelector<HTMLInputElement>(`[name=${field}]`)!.required).toBe(true);
  expect(document.querySelector<HTMLInputElement>('[name=referral]')!.required).toBe(false);
  expect(document.querySelector('[name=character], [name=portfolio], textarea, a[href^="mailto:"]')).toBeNull();
  expect(document.querySelector('button[type=submit]:disabled')).toBeNull();
});
it('registers with a username and optional typed referral, then enters the main app', async () => {
  const code = generateInviteCode();
  vi.mocked(registerBeta).mockResolvedValue({status: 'issued', code, ordinal: 1, gift_shards: 3800});
  vi.mocked(redeemInvite).mockResolvedValue('https://echuu.live/auth/invite-callback#ticket=test');
  await open(); await fill(); await change('referral', 'public123'); await submit();
  expect(registerBeta).toHaveBeenCalledWith('test@example.com', 'test-password-only', 'zh', expect.any(AbortSignal), {name: '小星', referralCode: 'public123'});
  expect(redeemInvite).toHaveBeenCalledWith(code, expect.any(AbortSignal));
  expect(window.location.assign).toHaveBeenCalledWith('https://echuu.live/auth/invite-callback#ticket=test');
  expect(trackEvent).toHaveBeenCalledWith('access_completed', {mode: 'signup'});
});
it('prefills a shared referral and permits removing it', async () => {
  history.replaceState({}, '', '/website/zh?ref=Friend_123');
  vi.mocked(registerBeta).mockRejectedValue(new AuthError('unavailable'));
  await open();
  expect(document.querySelector<HTMLInputElement>('[name=referral]')!.value).toBe('Friend_123');
  await fill(); await change('referral', ''); await submit();
  expect(registerBeta).toHaveBeenCalledWith('test@example.com', 'test-password-only', 'zh', expect.any(AbortSignal), {name: '小星', referralCode: ''});
});
it('keeps the form on service failure and allows a retry without claiming success', async () => {
  vi.mocked(betaAvailability).mockRejectedValue(new AuthError('unavailable'));
  vi.mocked(registerBeta).mockRejectedValue(new AuthError('unavailable'));
  await open(); await fill(); await submit();
  expect(document.querySelector('[role=alert]')).not.toBeNull();
  expect(document.querySelector<HTMLInputElement>('[name=name]')!.value).toBe('小星');
  expect(document.querySelector<HTMLInputElement>('[name=password]')!.value).toBe('test-password-only');
  await submit(); expect(registerBeta).toHaveBeenCalledTimes(2);
  expect(redeemInvite).not.toHaveBeenCalled();
  expect(trackEvent).not.toHaveBeenCalledWith('access_completed', expect.anything());
});
it('prevents duplicate registration and retries only redemption after an issued code', async () => {
  const issued = {status: 'issued' as const, code: generateInviteCode(), ordinal: 301, gift_shards: 0 as const};
  let resolve!: (value: typeof issued) => void;
  vi.mocked(registerBeta).mockReturnValue(new Promise(r => { resolve = r; }));
  vi.mocked(redeemInvite).mockRejectedValue(new AuthError('network'));
  await open(); await fill(); await submit(); await submit();
  expect(registerBeta).toHaveBeenCalledOnce();
  await act(async () => resolve(issued));
  expect(document.querySelector('[name=password]')).toBeNull();
  await submit(); expect(registerBeta).toHaveBeenCalledOnce(); expect(redeemInvite).toHaveBeenCalledTimes(2);
});
it('collects only email when capacity is full, and waits for persistence acknowledgement', async () => {
  vi.mocked(betaAvailability).mockResolvedValue('full');
  let resolve!: () => void;
  vi.mocked(joinWaitlist).mockReturnValue(new Promise(r => { resolve = r; }));
  await open();
  expect(document.querySelectorAll('form input')).toHaveLength(1);
  expect(document.body.textContent).toContain('1,000 个内测名额已满');
  await change('email', 'test@example.com'); await submit(); await submit();
  expect(joinWaitlist).toHaveBeenCalledOnce();
  expect(trackEvent).not.toHaveBeenCalledWith('waitlist_completed', expect.anything());
  await act(async () => resolve());
  expect(trackEvent).toHaveBeenCalledWith('waitlist_completed', {locale: 'zh'});
  expect(registerBeta).not.toHaveBeenCalled();
});
it('switches to email-only waitlist when the last place is taken during registration', async () => {
  vi.mocked(registerBeta).mockRejectedValue(new AuthError('full'));
  await open(); await fill(); await submit();
  expect(document.querySelectorAll('form input')).toHaveLength(1);
  expect(document.querySelector<HTMLInputElement>('[name=email]')!.value).toBe('test@example.com');
  expect(document.querySelector('[name=password]')).toBeNull();
});
it('rejects blank names and private login codes in the public referral field', async () => {
  await open(); await fill(); await change('name', ' '); await submit();
  expect(registerBeta).not.toHaveBeenCalled();
  await change('name', '小星'); await change('referral', generateInviteCode()); await submit();
  expect(registerBeta).not.toHaveBeenCalled(); expect(document.querySelector('[role=alert]')).not.toBeNull();
});
it('retains private beta-code redemption and main app password login', async () => {
  const code = generateInviteCode();
  vi.mocked(redeemInvite).mockResolvedValue('https://echuu.live/auth/invite-callback#ticket=test');
  await open('invite'); await change('invitation', code); await submit();
  expect(redeemInvite).toHaveBeenCalledWith(normalizeInviteCode(code), expect.any(AbortSignal));
  expect(window.location.assign).toHaveBeenCalledOnce();
  expect(document.querySelector('a[href$="/#landing/log-in"]')).not.toBeNull(); expect(registerBeta).not.toHaveBeenCalled();
});
