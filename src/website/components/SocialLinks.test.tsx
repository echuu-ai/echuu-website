import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { SocialLinks } from './SocialLinks';

vi.mock('../locale-context', () => ({ useLocale: () => ({ locale: 'zh' }) }));
vi.mock('../lib/googleAnalytics', () => ({ trackEvent: vi.fn() }));
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  await act(async () => roots.splice(0).forEach(root => root.unmount()));
  document.body.replaceChildren(); window.history.replaceState(null, '', '/');
});
async function renderContact(query: string) {
  window.history.replaceState(null, '', '/website/zh?' + query);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host); roots.push(root);
  await act(async () => root.render(<><SocialLinks /><SocialLinks compact /></>));
}
it.each([['wechat', 'lyh958014884'], ['qq', '1085874893']])('opens one %s panel from an email link and preserves other parameters on close', async (channel, number) => {
  await renderContact(`contact=${channel}&ref=ExampleReferral`);
  expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);
  expect(document.querySelector('[role=dialog]')?.textContent).toContain(number);
  expect(Boolean(document.querySelector('.echuu-access__qr'))).toBe(channel === 'wechat');
  await act(async () => Simulate.click(document.querySelector('button[aria-label="关闭"]')!));
  expect(document.querySelector('[role=dialog]')).toBeNull();
  expect(new URLSearchParams(window.location.search).has('contact')).toBe(false);
  expect(new URLSearchParams(window.location.search).get('ref')).toBe('ExampleReferral');
});
it('ignores unsupported contact values', async () => {
  await renderContact('contact=unknown');
  expect(document.querySelector('[role=dialog]')).toBeNull();
});
