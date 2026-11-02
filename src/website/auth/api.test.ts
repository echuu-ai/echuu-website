import { describe, expect, it, vi, afterEach } from 'vitest';
import { generateInviteCode } from './inviteCode';
import { betaAvailability, joinWaitlist, registerBeta, submitBetaApplication, validateProductRedirect } from './api';
afterEach(() => vi.unstubAllGlobals());
describe('invitation access boundary', () => {
  it('accepts only the configured product origin', () => {
    expect(validateProductRedirect('https://echuu.live/#invite-exchange=opaque', 'https://echuu.live')).toContain('#invite-exchange=');
    expect(() => validateProductRedirect('https://echuu.live.evil.test', 'https://echuu.live')).toThrow();
    expect(() => validateProductRedirect('https://user:secret@echuu.live/', 'https://echuu.live')).toThrow();
    expect(() => validateProductRedirect('javascript:alert(1)', 'https://echuu.live')).toThrow();
    expect(() => validateProductRedirect('http://echuu.live/', 'http://echuu.live')).toThrow();
  });
  it('allows the confirmed localhost product for development', () => {
    expect(validateProductRedirect('http://localhost:5173/#invite-exchange=opaque', 'http://localhost:5173')).toContain(':5173');
    expect(() => validateProductRedirect('http://localhost:5174', 'http://localhost:5173')).toThrow();
  });
  it('surfaces a disabled backend instead of pretending registration succeeded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(registerBeta('test@example.com', 'test-password-only', 'zh', new AbortController().signal)).rejects.toMatchObject({ code: 'unavailable' });
  });
  it('rejects full capacity and an impossible gift after place 300', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({status: 'issued', code: generateInviteCode(), ordinal: 301, gift_shards: 3800})));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    await expect(registerBeta('test@example.com', 'test-password-only', 'zh', signal)).rejects.toMatchObject({ code: 'full' });
    await expect(registerBeta('test@example.com', 'test-password-only', 'zh', signal)).rejects.toMatchObject({ code: 'failed' });
  });
  it('keeps referral attribution through registration and clears it after success', async () => {
    history.replaceState({}, '', '/website/zh?ref=referral123');
    const code = generateInviteCode();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({status: 'issued', code, ordinal: 300, gift_shards: 3800})));
    vi.stubGlobal('fetch', fetchMock);
    const result = await registerBeta('test@example.com', 'test-password-only', 'zh', new AbortController().signal);
    expect(result.gift_shards).toBe(3800);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).referral_code).toBe('referral123');
    expect(sessionStorage.getItem('echuu-beta-referral-v1')).toBeNull();
  });
});

it('rejects inconsistent capacity and only confirms waitlist after persistence acknowledgement', async () => {
  const signal = new AbortController().signal;
  const fetcher = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({status: 'full', issued: 999, capacity: 1000})))
    .mockResolvedValueOnce(new Response(JSON.stringify({status: 'waitlisted'})));
  vi.stubGlobal('fetch', fetcher);
  await expect(betaAvailability(signal)).rejects.toMatchObject({code: 'failed'});
  history.replaceState({}, '', '/website/zh?ref=referral123');
  await joinWaitlist(' test@example.com ', 'ko', signal);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({email: 'test@example.com', locale: 'ko', referral_code: 'referral123'});
  expect(sessionStorage.getItem('echuu-beta-referral-v1')).toBeNull();
});


it('sends an application without clearing referral before later account activation', async () => {
  sessionStorage.clear(); history.replaceState({}, '', '/website/en?ref=referral123');
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({status: 'submitted'})));
  vi.stubGlobal('fetch', fetcher);
  await submitBetaApplication({email: ' test@example.com ', character: ' My OC ', portfolio: '', website: '', locale: 'en'}, new AbortController().signal);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({email:'test@example.com', character:'My OC', portfolio:'', website:'', locale:'en', referral_code:'referral123'});
  expect(sessionStorage.getItem('echuu-beta-referral-v1')).toContain('referral123');
});
it('does not treat arbitrary successful HTTP responses as an application receipt', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
  await expect(submitBetaApplication({email:'test@example.com',character:'',portfolio:'',website:'',locale:'zh'}, new AbortController().signal)).rejects.toMatchObject({code:'failed'});
});
