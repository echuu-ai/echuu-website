import { useEffect, useState } from 'react';
import { navigateWithTransition, SITE_NAVIGATE_EVENT } from '../lib/pageTransition';
import { DEFAULT_WEBSITE_LOCALE, isWebsiteLocale, type Locale } from './i18n';

export const WEBSITE_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/website`;

export type WebsitePage =
  | 'home' | 'gallery' | 'creators' | 'journal' | 'blog' | 'team' | 'feedback' | 'doodle' | 'moodboard' | 'not-found';

const PAGES: Record<string, WebsitePage> = {
  '': 'home',
  gallery: 'gallery',
  creators: 'creators',
  journal: 'journal',
  blog: 'blog',
  team: 'team',
  feedback: 'feedback',
  doodle: 'doodle',
  moodboard: 'moodboard',
};

/** 只有这些页面接受第三段 slug（例如 /website/zh/blog/{slug}） */
const PAGES_WITH_SLUG: ReadonlySet<WebsitePage> = new Set(['blog']);

export type WebsiteLocation = { locale: Locale; page: WebsitePage; hash: string; slug?: string };

/** 从 /website/{locale}/{page}[/{slug}] 解析；locale 缺失或非法时回落到默认语言。 */
export function parseWebsiteLocation(pathname: string, hash: string): WebsiteLocation {
  const rest = pathname.replace(/\/+$/, '').slice(WEBSITE_BASE.length).replace(/^\/+/, '');
  const [maybeLocale, maybePage = '', maybeSlug] = rest.split('/');
  if (!isWebsiteLocale(maybeLocale)) {
    return { locale: DEFAULT_WEBSITE_LOCALE, page: 'home', hash };
  }
  const page = PAGES[maybePage] ?? 'not-found';
  if (maybeSlug && !PAGES_WITH_SLUG.has(page)) return { locale: maybeLocale, page: 'not-found', hash };
  const slug = maybeSlug ? decodeURIComponent(maybeSlug) : undefined;
  return { locale: maybeLocale, page, hash, slug };
}

export function websitePath(locale: Locale, page: WebsitePage | '' = '', slug?: string): string {
  const segment = !page || page === 'home' ? '' : `/${page}`;
  const tail = slug && page && PAGES_WITH_SLUG.has(page) ? `/${encodeURIComponent(slug)}` : '';
  // 结尾带 /：和预渲染的静态页、canonical、sitemap 同一个地址（不带 / 的地址服务器会 308 过来，多跳一次）
  return `${WEBSITE_BASE}/${locale}${segment}${tail}/`;
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
