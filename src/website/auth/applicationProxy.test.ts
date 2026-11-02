import { beforeEach, afterEach, expect, it, vi } from 'vitest';
let handler: typeof import('../../../api/beta-application')['default'];
const response = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });
const request = (body: object = {}) => ({ method: 'POST', headers: { origin: 'https://www.echuu.ai', 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.4' }, body: { email: 'cory958014884@gmail.com', character: '', portfolio: '', locale: 'zh', ...body } });
beforeEach(async () => { vi.resetModules(); handler = (await import('../../../api/beta-application')).default; vi.stubEnv('RESEND_API_KEY', 'test-key'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('sends the three fields and referral only to fixed recipients with a private idempotency key', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{"id":"mail-test-id"}')); vi.stubGlobal('fetch', fetcher);
  const req = request({ character: '<script>OC</script>', portfolio: 'https://example.com/work', referral_code: 'public123', to: 'attacker@example.com', password: 'must-not-send' });
  const res = response(); await handler(req as never, res as never);
  const [url, init] = fetcher.mock.calls[0]; const payload = JSON.parse(init.body);
  expect(url).toBe('https://api.resend.com/emails');
  expect(payload.to).toEqual(['cory@echuu.ai', 'cory958014884@gmail.com']);
  expect(payload.reply_to).toBe('cory958014884@gmail.com');
  expect(payload.text).toContain('public123'); expect(payload.text).toContain('<script>OC</script>');
  expect(payload.html).toBeUndefined(); expect(init.body).not.toContain('must-not-send');
  expect(init.headers['Idempotency-Key']).not.toContain('gmail');
  await handler(req as never, response() as never);
  expect(fetcher.mock.calls[1][1].headers['Idempotency-Key']).toBe(init.headers['Idempotency-Key']);
  expect(res.json).toHaveBeenCalledWith({ status: 'submitted' });
});
it('validates optional fields, protocol, locale, referral and header injection before sending', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  for (const body of [{email:'x@example.com\r\nBcc: x@example.com'}, {character:'x'.repeat(1001)}, {portfolio:'javascript:alert(1)'}, {portfolio:'https://user:secret@example.com'}, {portfolio:22}, {locale:'unknown'}, {referral_code:'secret'}, {website:'bot-filled'}]) {
    const res = response(); await handler(request(body) as never, res as never); expect(res.status).toHaveBeenCalledWith(400);
  }
  expect(fetcher).not.toHaveBeenCalled();
});
it('fails closed for missing credentials, malformed JSON, oversized bodies and foreign origins', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  vi.stubEnv('RESEND_API_KEY', '');
  const res = response(); await handler(request() as never, res as never); expect(res.status).toHaveBeenCalledWith(503);
  for (const [req, status] of [[{...request(),body:'{'},400], [{...request(),body:'x'.repeat(12001)},413], [{...request(),headers:{origin:'https://other.example','content-type':'application/json'}},403]]) {
    const res = response(); await handler(req as never, res as never); expect(res.status).toHaveBeenCalledWith(status);
  }
  expect(fetcher).not.toHaveBeenCalled();
});
it('does not acknowledge a provider failure or malformed success', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  for (const result of [new Response('{"secret":"provider detail"}',{status:500}), new Response('{}')]) {
    fetcher.mockResolvedValueOnce(result); const res=response(); await handler(request() as never,res as never);
    expect(res.status).toHaveBeenCalledWith(502); expect(res.json).toHaveBeenCalledWith({status:'failed'});
  }
});
it('throttles repeated requests in the current worker', async () => {
  const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(new Response('{"id":"test"}')));vi.stubGlobal('fetch',fetcher);
  for(let n=0;n<5;n++) await handler(request() as never,response() as never);
  const res=response();await handler(request() as never,res as never);
  expect(res.status).toHaveBeenCalledWith(429);expect(fetcher).toHaveBeenCalledTimes(5);
});
