import { useEffect, useState } from 'react';
import { navigateWithTransition, SITE_NAVIGATE_EVENT } from '../lib/pageTransition';
import { DEFAULT_WEBSITE_LOCALE, isWebsiteLocale, type Locale } from './i18n';

export const WEBSITE_BASE = '/website';

export type WebsitePage =
  | 'home' | 'gallery' | 'creators' | 'journal' | 'feedback' | 'doodle' | 'moodboard' | 'not-found';

const PAGES: Record<string, WebsitePage> = {
  '': 'home',
  gallery: 'gallery',
  creators: 'creators',
  journal: 'journal',
  feedback: 'feedback',
  doodle: 'doodle',
  moodboard: 'moodboard',
};

export type WebsiteLocation = { locale: Locale; page: WebsitePage; hash: string };

/** 从 /website/{locale}/{page} 解析；locale 缺失或非法时回落到默认语言。 */
export function parseWebsiteLocation(pathname: string, hash: string): WebsiteLocation {
  const rest = pathname.replace(/\/+$/, '').slice(WEBSITE_BASE.length).replace(/^\/+/, '');
  const [maybeLocale, maybePage = ''] = rest.split('/');
  if (!isWebsiteLocale(maybeLocale)) {
    return { locale: DEFAULT_WEBSITE_LOCALE, page: 'home', hash };
  }
  const page = PAGES[maybePage] ?? 'not-found';
  return { locale: maybeLocale, page, hash };
}

export function websitePath(locale: Locale, page: WebsitePage | '' = ''): string {
  const slug = !page || page === 'home' ? '' : `/${page}`;
  return `${WEBSITE_BASE}/${locale}${slug}`;
}

/** 站内跳转，复用 app 既有的过渡与 popstate 处理。 */
export function goWebsite(href: string) {
  navigateWithTransition(href);
}

export function useWebsiteLocation(): WebsiteLocation {
  const read = () => parseWebsiteLocation(window.location.pathname, window.location.hash);
  const [location, setLocation] = useState<WebsiteLocation>(read);

  useEffect(() => {
    const update = () => setLocation(read());
    window.addEventListener(SITE_NAVIGATE_EVENT, update);
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener(SITE_NAVIGATE_EVENT, update);
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
    };
  }, []);

  return location;
}
