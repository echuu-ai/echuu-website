import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { AccessDialog } from './AccessDialog';
import { AuthError, registerBeta, redeemInvite } from './api';
import { trackEvent } from '../lib/googleAnalytics';
import { generateInviteCode } from './inviteCode';

vi.mock('../locale-context', () => ({ useLocale: () => ({ locale: 'zh', t: { apply: { emailSubject: '', emailBody: '' } } }) }));
vi.mock('../lib/googleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('./api', async original => ({ ...await original<typeof import('./api')>(), registerBeta: vi.fn(), redeemInvite: vi.fn() }));
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
