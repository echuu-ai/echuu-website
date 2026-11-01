import { afterEach, expect, it, vi } from 'vitest';
import handler from '../../../api/redeem';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const response = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

it('fails closed before forwarding credentials when the platform is not configured', async () => {
  vi.stubEnv('BETA_PLATFORM_API_BASE', '');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const res = response();
  await handler({ method: 'POST', query: {} } as never, res as never);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(fetcher).not.toHaveBeenCalled();
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
});

it('forwards only registration fields and its own server credential', async () => {
  vi.stubEnv('BETA_PLATFORM_API_BASE', 'https://platform.example/api/v1');
  vi.stubEnv('BETA_WEBSITE_API_KEY', 'test-only-key');
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'issued' })));
  vi.stubGlobal('fetch', fetcher);
  const res = response();
  await handler({ method: 'POST', query: { action: 'register' }, headers: { 'x-forwarded-for': '192.0.2.1', 'x-beta-website-key': 'spoofed' },
    body: { email: 'test@example.com', password: 'test-password', locale: 'zh', referral_code: 'public123', is_superuser: true } } as never, res as never);
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe('https://platform.example/api/v1/beta/register');
  expect(JSON.parse(init.body)).toEqual({ email: 'test@example.com', password: 'test-password', locale: 'zh', referral_code: 'public123' });
  expect(init.headers['x-beta-website-key']).toBe('test-only-key');
  expect(init.redirect).toBe('error');
  expect(res.status).toHaveBeenCalledWith(200);
});

it('does not expose upstream errors and rejects credential-bearing or insecure destinations', async () => {
  vi.stubEnv('BETA_WEBSITE_API_KEY', 'test-only-key');
  const fetcher = vi.fn().mockResolvedValue(new Response('internal detail', { status: 500 }));
  vi.stubGlobal('fetch', fetcher);
  const req = { method: 'POST', query: {}, headers: {}, body: { code: 'test' } };
  for (const base of ['http://platform.example', 'https://user:secret@platform.example']) {
    vi.stubEnv('BETA_PLATFORM_API_BASE', base);
    const res = response(); await handler(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(503);
  }
  expect(fetcher).not.toHaveBeenCalled();
  vi.stubEnv('BETA_PLATFORM_API_BASE', 'https://platform.example/api/v1');
  const res = response(); await handler(req as never, res as never);
  expect(res.status).toHaveBeenCalledWith(502);
  expect(res.json).toHaveBeenCalledWith({ status: 'failed' });
});

it('proxies capacity as GET and waitlist without password or arbitrary fields', async () => {
  vi.stubEnv('BETA_PLATFORM_API_BASE', 'https://platform.example/api/v1');
  vi.stubEnv('BETA_WEBSITE_API_KEY', 'test-only-key');
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'full', issued: 1000, capacity: 1000 })));
  vi.stubGlobal('fetch', fetcher);
  await handler({ method: 'GET', query: { action: 'availability' }, headers: {} } as never, response() as never);
  expect(fetcher.mock.calls[0][0]).toContain('/beta/availability');
  expect(fetcher.mock.calls[0][1].method).toBe('GET');
  expect(fetcher.mock.calls[0][1].body).toBeUndefined();
  fetcher.mockResolvedValue(new Response(JSON.stringify({ status: 'waitlisted' })));
  const res = response();
  await handler({ method: 'POST', query: { action: 'waitlist' }, headers: {}, body: { email: 'test@example.com', locale: 'ko', referral_code: 'public123', password: 'discard', admin: true } } as never, res as never);
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ email: 'test@example.com', locale: 'ko', referral_code: 'public123' });
  expect(res.json).toHaveBeenCalledWith({ status: 'waitlisted' });
});
