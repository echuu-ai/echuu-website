import { DICTS, WEBSITE_LOCALES, type Locale } from '../i18n';
import { HOME_DICTS } from '../i18n/home';
import { BLOG_POSTS } from '../data/blog';
import { ANSWERS } from '../data/answers';

/** 正式主地址：带 www（Cory 2026-10-04 定；echuu.ai 在 Vercel 308 跳到 www） */
export const PLANNED_ORIGIN = 'https://www.echuu.ai';
/** 分享卡片图（og:image / twitter:image）：1200×630 JPG，微信、QQ、X、Discord 等都能抓 */
export const SHARE_IMAGE = { url: (origin: string) => `${origin}/website/og/echuu-share.jpg`, width: 1200, height: 630, type: 'image/jpeg' };
/** 结构化数据里的品牌信息（只放已核实的：X 是官方账号主页；小红书 / YouTube 目前只有单条作品链接，不算主页） */
export const BRAND = {
  logo: (origin: string) => `${origin}/website/og/echuu-logo.png`,
  sameAs: ['https://x.com/Echuu_AIVTUBING'],
  product: 'https://echuu.live',
};
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
  // 分享卡片图：始终是正式站上的绝对地址（社交平台抓不到相对路径；预览站也指向正式站这张图）
  const image = SHARE_IMAGE.url(origin);
  const lang = DICTS[locale].htmlLang;
  const org = { '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Echuu', legalName: 'Anngel LLC', url: origin,
    logo: { '@type': 'ImageObject', url: BRAND.logo(origin) }, sameAs: BRAND.sameAs };
  const website = { '@type': 'WebSite', '@id': `${origin}/#website`, name: 'Echuu', alternateName: 'エチュウゥ', url: `${origin}${base}/website/en/`, publisher: { '@id': org['@id'] }, inLanguage: WEBSITE_LOCALES.map((l) => DICTS[l].htmlLang) };
  const page = { '@type': meta.article ? 'Article' : 'WebPage', '@id': `${url}#page`, url, name: meta.title, description: meta.description, inLanguage: lang, isPartOf: { '@id': website['@id'] },
    primaryImageOfPage: { '@type': 'ImageObject', url: image, width: SHARE_IMAGE.width, height: SHARE_IMAGE.height },
    ...(meta.article ? { headline: meta.title, image, author: { '@id': org['@id'] }, publisher: { '@id': org['@id'] } } : {}),
    ...(!path ? { about: { '@id': `${origin}/#software` }, mainEntity: { '@id': `${url}#faq` } } : {}) };
  // 首页额外说明「这是什么产品」和常见问题：搜索引擎的富结果与 AI 回答引擎（GEO）都直接读这些
  const home = !path ? [
    { '@type': 'SoftwareApplication', '@id': `${origin}/#software`, name: 'Echuu', url: BRAND.product, applicationCategory: 'MultimediaApplication', applicationSubCategory: 'AI VTuber streaming',
      operatingSystem: 'Web browser', description: HOME_DICTS.en.meta.description, image, publisher: { '@id': org['@id'] }, inLanguage: WEBSITE_LOCALES.map((l) => DICTS[l].htmlLang) },
    { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: lang, mainEntity: ANSWERS[locale].items.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) },
  ] : [];
  return { ...meta, lang, url, image, indexable,
    alternates: WEBSITE_LOCALES.map((language) => ({ lang: DICTS[language].htmlLang, url: urlFor(language) })),
    xDefault: urlFor('en'), schema: { '@context': 'https://schema.org', '@graph': [org, website, page, ...home] },
  };
}
