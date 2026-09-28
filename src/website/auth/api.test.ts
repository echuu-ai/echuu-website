import { describe, expect, it, vi, afterEach } from 'vitest';
import { redeemInvite, registerBeta, validateProductRedirect } from './api';
afterEach(() => vi.unstubAllGlobals());
describe('invitation access boundary', () => {
  it('accepts only the configured product origin', () => {
    expect(validateProductRedirect('https://echuu.app/#invite-exchange=opaque', 'https://echuu.app')).toContain('#invite-exchange=');
    expect(() => validateProductRedirect('https://echuu.app.evil.test', 'https://echuu.app')).toThrow();
    expect(() => validateProductRedirect('https://user:secret@echuu.app/', 'https://echuu.app')).toThrow();
    expect(() => validateProductRedirect('javascript:alert(1)', 'https://echuu.app')).toThrow();
    expect(() => validateProductRedirect('http://echuu.app/', 'http://echuu.app')).toThrow();
  });
  it('allows the confirmed localhost product for development', () => {
    expect(validateProductRedirect('http://localhost:5173/#invite-exchange=opaque', 'http://localhost:5173')).toContain(':5173');
    expect(() => validateProductRedirect('http://localhost:5174', 'http://localhost:5173')).toThrow();
  });
  it('fails closed and never transmits credentials without configured services', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    await expect(redeemInvite('example', signal)).rejects.toMatchObject({ code: 'unavailable' });
    await expect(registerBeta('test@example.com', 'test-password-only', 'zh', signal)).rejects.toMatchObject({ code: 'unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
