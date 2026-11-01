import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AccessDialog } from './AccessDialog';
import { AuthError, betaAvailability, joinWaitlist, registerBeta, redeemInvite } from './api';
import { trackEvent } from '../lib/googleAnalytics';
import { generateInviteCode } from './inviteCode';

vi.mock('../locale-context', () => ({ useLocale: () => ({ locale: 'zh', t: { apply: { emailSubject: '', emailBody: '' } } }) }));
vi.mock('../lib/googleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('./api', async original => ({ ...await original<typeof import('./api')>(), registerBeta: vi.fn(), redeemInvite: vi.fn(), betaAvailability: vi.fn(), joinWaitlist: vi.fn() }));
beforeEach(() => { vi.mocked(betaAvailability).mockResolvedValue('open'); });
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => { await act(async () => roots.splice(0).forEach(root => root.unmount())); document.body.replaceChildren(); vi.restoreAllMocks(); vi.clearAllMocks(); });

async function submitRegistration() {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); roots.push(root);
  await act(async () => root.render(<AccessDialog mode="signup" onClose={vi.fn()} onModeChange={vi.fn()} returnFocusRef={createRef()} />));
  const email = document.querySelector<HTMLInputElement>('input[name=email]')!;
  const password = document.querySelector<HTMLInputElement>('input[name=password]')!;
  await act(async () => {
    Simulate.change(email, { target: { value: 'test@example.com' } } as never);
    Simulate.change(password, { target: { value: 'test-password-only' } } as never);
  });
  await act(async () => Simulate.submit(document.querySelector('form')!));
}

it('registers and redeems in one submission without another confirmation step', async () => {
  const code = generateInviteCode();
  vi.mocked(registerBeta).mockResolvedValue({ status: 'issued', code, ordinal: 1, gift_shards: 3800 });
  vi.mocked(redeemInvite).mockResolvedValue('https://echuu.live/auth/invite-callback#ticket=test');
  const navigate = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
  await submitRegistration();
  expect(registerBeta).toHaveBeenCalledOnce();
  expect(redeemInvite).toHaveBeenCalledWith(code, expect.any(AbortSignal));
  expect(navigate).toHaveBeenCalledWith('https://echuu.live/auth/invite-callback#ticket=test');
});

it('preserves the issued code and a password-login exit if automatic redemption fails', async () => {
  const code = generateInviteCode();
  vi.mocked(registerBeta).mockResolvedValue({ status: 'issued', code, ordinal: 301, gift_shards: 0 });
  vi.mocked(redeemInvite).mockRejectedValue(new AuthError('invalid'));
  await submitRegistration();
  expect(document.querySelector<HTMLInputElement>('input[readonly]')?.value).toBe(code);
  expect(document.querySelector('a[href$="/#landing/log-in"]')).not.toBeNull();
  expect(trackEvent).toHaveBeenCalledWith('access_failed', { mode: 'invite', reason: 'invalid' });
  expect(document.querySelector<HTMLInputElement>('input[type=password]')).toBeNull();
  await act(async () => Simulate.submit(document.querySelector('form')!));
  expect(registerBeta).toHaveBeenCalledOnce();
  expect(redeemInvite).toHaveBeenCalledTimes(2);
});

async function openSignup() {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); roots.push(root);
  await act(async () => root.render(<AccessDialog mode="signup" onClose={vi.fn()} onModeChange={vi.fn()} returnFocusRef={createRef()} />));
}

it('shows an email-only waitlist when the backend reports full, and waits for save acknowledgement', async () => {
  vi.mocked(betaAvailability).mockResolvedValue('full');
  await openSignup();
  expect(document.querySelector('input[name=password]')).toBeNull();
  expect(document.body.textContent).toContain('加入候补名单');
  expect(trackEvent).toHaveBeenCalledWith('waitlist_viewed', { locale: 'zh' });
  await act(async () => Simulate.change(document.querySelector('input[name=email]')!, { target: { value: 'contact@example.com' } } as never));
  vi.mocked(joinWaitlist).mockRejectedValueOnce(new AuthError('network')).mockResolvedValueOnce();
  await act(async () => Simulate.submit(document.querySelector('form')!));
  expect(document.body.textContent).not.toContain('已加入候补名单');
  expect(document.querySelector('[role=alert]')?.textContent).toContain('网络');
  await act(async () => Simulate.submit(document.querySelector('form')!));
  expect(joinWaitlist).toHaveBeenLastCalledWith('contact@example.com', 'zh', expect.any(AbortSignal));
  expect(document.body.textContent).toContain('已加入候补名单');
  expect(registerBeta).not.toHaveBeenCalled();
  expect(trackEvent).toHaveBeenCalledWith('waitlist_completed', { locale: 'zh' });
});

it('keeps the email but clears the password when the final place is claimed by someone else', async () => {
  vi.mocked(registerBeta).mockRejectedValue(new AuthError('full'));
  await submitRegistration();
  expect(document.querySelector<HTMLInputElement>('input[name=email]')?.value).toBe('test@example.com');
  expect(document.querySelector('input[name=password]')).toBeNull();
  expect(document.body.textContent).toContain('加入候补名单');
  expect(joinWaitlist).not.toHaveBeenCalled();
});

it('does not pretend a failed availability check means full, and allows a retry', async () => {
  vi.mocked(betaAvailability).mockRejectedValueOnce(new AuthError('unavailable')).mockResolvedValueOnce('full');
  await openSignup();
  expect(document.querySelector('form')).toBeNull();
  expect(trackEvent).not.toHaveBeenCalledWith('waitlist_viewed', expect.anything());
  await act(async () => Simulate.click(document.querySelector('.echuu-access__submit')!));
  expect(document.body.textContent).toContain('加入候补名单');
});
