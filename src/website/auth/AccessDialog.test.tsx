import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AccessDialog } from './AccessDialog';
import { AuthError, betaAvailability, submitBetaApplication, registerBeta, redeemInvite } from './api';
import { trackEvent } from '../lib/googleAnalytics';
import { generateInviteCode, normalizeInviteCode } from './inviteCode';

vi.mock('../locale-context', () => ({ useLocale: () => ({ locale: 'zh' }) }));
vi.mock('../lib/googleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('./api', async original => ({ ...await original<typeof import('./api')>(), registerBeta: vi.fn(), redeemInvite: vi.fn(), betaAvailability: vi.fn(), submitBetaApplication: vi.fn() }));
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.mocked(betaAvailability).mockResolvedValue('open'); });
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => { await act(async () => roots.splice(0).forEach(root => root.unmount())); document.body.replaceChildren(); vi.restoreAllMocks(); vi.clearAllMocks(); });
async function open(mode: 'signup' | 'invite' = 'signup') {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); roots.push(root);
  await act(async () => root.render(<AccessDialog mode={mode} onClose={vi.fn()} onModeChange={vi.fn()} returnFocusRef={createRef()} />));
}
async function change(name: string, value: string) {
  await act(async () => Simulate.change(document.querySelector(`[name=${name}]`)!, { target: { value } } as never));
}
async function submit() { await act(async () => Simulate.submit(document.querySelector('form')!)); }

it('shows three fields immediately while availability is unresolved, and never collects a password', async () => {
  vi.mocked(betaAvailability).mockReturnValue(new Promise(() => {}));
  await open();
  for (const field of ['email', 'character', 'portfolio']) expect(document.querySelector(`[name=${field}]`)).not.toBeNull();
  expect(document.querySelector<HTMLInputElement>('[name=email]')!.required).toBe(true);
  expect(document.querySelector<HTMLTextAreaElement>('[name=character]')!.required).toBe(false);
  expect(document.querySelector('input[name=password]')).toBeNull();
  expect(document.querySelector('button[type=submit]:disabled')).toBeNull();
});
it('accepts an application even when activation is unavailable, only after mail acknowledgement', async () => {
  vi.mocked(betaAvailability).mockRejectedValue(new AuthError('unavailable'));
  let resolve!: () => void;
  vi.mocked(submitBetaApplication).mockReturnValue(new Promise<void>(r => { resolve = r; }));
  await open(); await change('email', 'test@example.com'); await change('character', '我的 OC'); await change('portfolio', 'https://example.com/work');
  await submit();
  expect(document.body.textContent).not.toContain('申请已发送');
  await submit(); expect(submitBetaApplication).toHaveBeenCalledOnce();
  await act(async () => resolve());
  expect(submitBetaApplication).toHaveBeenCalledWith({ email: 'test@example.com', character: '我的 OC', portfolio: 'https://example.com/work', website: '', locale: 'zh' }, expect.any(AbortSignal));
  expect(document.body.textContent).toContain('申请已发送');
  expect(registerBeta).not.toHaveBeenCalled(); expect(redeemInvite).not.toHaveBeenCalled();
  expect(trackEvent).toHaveBeenCalledWith('beta_application_completed', { locale: 'zh' });
});
it('preserves fields on send failure and provides a populated email fallback without reporting success', async () => {
  vi.mocked(submitBetaApplication).mockRejectedValue(new AuthError('unavailable'));
  await open(); await change('email', 'test@example.com'); await change('character', 'My OC & story'); await submit();
  expect(document.body.textContent).not.toContain('申请已发送');
  expect(document.querySelector('[role=alert]')).not.toBeNull();
  const link = document.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!;
  expect(decodeURIComponent(link.href)).toContain('My OC & story');
  expect(document.querySelector<HTMLInputElement>('[name=email]')!.value).toBe('test@example.com');
  expect(trackEvent).not.toHaveBeenCalledWith('beta_application_completed', expect.anything());
});
it('only uses waitlist wording for a confirmed full response', async () => {
  vi.mocked(betaAvailability).mockResolvedValue('full');
  await open(); expect(document.body.textContent).toContain('1,000 个内测名额已满');
  expect(document.querySelector('button[type=submit]')!.textContent).toContain('加入候补名单');
  expect(document.querySelector('[name=character]')).not.toBeNull();
});
it('retains beta-code redemption and main app password login', async () => {
  const code = generateInviteCode();
  vi.mocked(redeemInvite).mockResolvedValue('https://echuu.live/auth/invite-callback#ticket=test');
  const navigate = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
  await open('invite'); await change('invitation', code); await submit();
  expect(redeemInvite).toHaveBeenCalledWith(normalizeInviteCode(code), expect.any(AbortSignal));
  expect(navigate).toHaveBeenCalledOnce();
  expect(document.querySelector('a[href$="/#landing/log-in"]')).not.toBeNull();
  expect(submitBetaApplication).not.toHaveBeenCalled();
});
