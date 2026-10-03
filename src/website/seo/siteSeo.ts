import { DICTS, WEBSITE_LOCALES, type Locale } from '../i18n';
import { HOME_DICTS } from '../i18n/home';
import { BLOG_POSTS } from '../data/blog';

export const PLANNED_ORIGIN = 'https://echuu.ai';
export const SEO_PAGES = ['', 'gallery', 'creators', 'journal', 'blog', 'team', 'feedback', 'doodle'] as const;
export function publicRoutes() {
  return [...SEO_PAGES, ...BLOG_POSTS.map((post) => `blog/${post.slug}`)];
}
export function pageMetadata(locale: Locale, path: string) {
  const dict = DICTS[locale];
  if (!path) return { ...HOME_DICTS[locale].meta, article: false, noindex: false };
  const post = path.startsWith('blog/') ? BLOG_POSTS.find((item) => `blog/${item.slug}` === path) : undefined;
  if (post) return { title: `${post.title[locale]} — Echuu`, description: post.excerpt[locale], article: true, noindex: false };
  const entry = dict.meta[path as keyof typeof dict.meta];
  if (entry && SEO_PAGES.includes(path as typeof SEO_PAGES[number])) return { ...entry, article: false, noindex: false };
  return { title: `${dict.common.notFound} — Echuu`, description: '', article: false, noindex: true };
}

export type SeoOptions = { origin: string; base: string; indexable: boolean };
/** Configuration is supplied explicitly so browser and build output use identical URLs. */
export function seoDocument(locale: Locale, path: string, options: SeoOptions, overrides?: { title: string; description: string; noindex?: boolean }) {
  const baseMeta = pageMetadata(locale, path);
  const meta = { ...baseMeta, ...overrides, noindex: overrides?.noindex ?? baseMeta.noindex };
  const origin = new URL(options.origin).origin;
  const base = `/${options.base.split('/').filter(Boolean).join('/')}`.replace(/\/$/, '');
  const urlFor = (language: Locale) => `${origin}${base}/website/${language}${path ? `/${path}` : ''}/`;
  const url = urlFor(locale);
  const indexable = options.indexable && !meta.noindex;
  const image = `${origin}${base}/website/figma/hero-shot.webp`;
  const lang = DICTS[locale].htmlLang;
  const org = { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Echuu', legalName: 'Anngel LLC', url: origin };
  const website = { '@type': 'WebSite', '@id': `${origin}/#website`, name: 'Echuu', alternateName: 'エチュウゥ', url: `${origin}${base}/website/en/`, publisher: { '@id': org['@id'] }, inLanguage: WEBSITE_LOCALES.map((l) => DICTS[l].htmlLang) };
  const page = { '@type': meta.article ? 'Article' : 'WebPage', '@id': `${url}#page`, url, name: meta.title, ...(meta.article ? { headline: meta.title } : {}), description: meta.description, inLanguage: lang, isPartOf: { '@id': website['@id'] } };
  return { ...meta, lang, url, image, indexable,
    alternates: WEBSITE_LOCALES.map((language) => ({ lang: DICTS[language].htmlLang, url: urlFor(language) })),
    xDefault: urlFor('en'), schema: { '@context': 'https://schema.org', '@graph': [org, website, page] },
  };
}
