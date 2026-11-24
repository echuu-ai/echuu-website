import { expect, it } from 'vitest';
import { PRODUCT_ENTRY_URL } from './config/site';
import { WEBSITE_LOCALES } from './i18n';
import { productLoginFromLegacyAccess, WEBSITE_BASE, websitePath } from './router';

it.each(WEBSITE_LOCALES)('forwards a shared %s signup link to product login', (locale) => {
  const search = '?access=signup&ref=public123&utm_source=oc_photo&utm_medium=share_card';
  const url = productLoginFromLegacyAccess({ pathname: websitePath(locale), search }, 'en');
  expect(url?.origin).toBe(new URL(PRODUCT_ENTRY_URL).origin);
  expect(url?.pathname).toBe('/login');
  expect(Object.fromEntries(url?.searchParams ?? [])).toEqual({
    locale, ref: 'public123', utm_source: 'oc_photo', utm_medium: 'share_card',
  });
});

it('redirects unlocalized legacy links and only passes supported parameters', () => {
  const search = '?access=signup&ref=ECHU-1234-5678-X&ticket=hidden&returnTo=https://example.com';
  const url = productLoginFromLegacyAccess({ pathname: WEBSITE_BASE, search }, 'ko');
  expect(url?.search).toBe('?locale=ko');
});

it('leaves the website home and research subpages using their own routes', () => {
  expect(productLoginFromLegacyAccess({ pathname: websitePath('ja'), search: '?ref=public123' }, 'en')).toBeNull();
  expect(productLoginFromLegacyAccess({ pathname: `${WEBSITE_BASE}/ja/survey/`, search: '?access=signup' }, 'en')).toBeNull();
  expect(productLoginFromLegacyAccess({ pathname: '/unrelated/ja', search: '?access=signup' }, 'en')).toBeNull();
});
