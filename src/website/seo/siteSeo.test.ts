import { describe, expect, it } from 'vitest';
import { staticPages } from '../../../scripts/static-pages';
import { publicRoutes, seoDocument } from './siteSeo';
import { WEBSITE_LOCALES } from '../i18n';
import { ANSWERS } from '../data/answers';
const template = '<html><head><title>Generic</title><meta name="robots" content="index,follow"></head><body><div id="root"></div></body></html>';
const options = { origin: 'https://echuu.ai', base: '/', indexable: true };
function parse(html: string) { return new DOMParser().parseFromString(html, 'text/html'); }
describe('search documents', () => {
  it('renders localized readable content and a single canonical for every public route', () => {
    const pages = staticPages(template, options);
    for (const locale of WEBSITE_LOCALES) for (const path of publicRoutes()) {
      const doc = parse(pages[`website/${locale}/${path ? `${path}/` : ''}index.html`]);
      expect(doc.querySelectorAll('h1')).toHaveLength(1);
      expect(doc.querySelector('main')?.textContent?.length).toBeGreaterThan(50);
      expect(doc.querySelectorAll('link[rel=canonical]')).toHaveLength(1);
      expect(doc.querySelectorAll('link[hreflang]')).toHaveLength(5);
      expect(doc.title).toBe(seoDocument(locale, path, options).title);
      expect(JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']).toHaveLength(path ? 3 : 5);
    }
  });
  it('keeps all previews noindex with no canonical or sitemap entries, including subpath builds', () => {
    const pages = staticPages(template, { ...options, base: '/echuu-website-preview/', indexable: false });
    for (const [path, html] of Object.entries(pages)) if (path.endsWith('.html')) {
      const doc = parse(html);
      expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow');
      expect(doc.querySelector('link[rel=canonical]')).toBeNull();
    }
    expect(pages['sitemap.xml']).not.toContain('<loc>');
    expect(pages['website/zh/index.html']).toContain('/echuu-website-preview/website/zh/blog/');
  });
  it('publishes all visible answers and excludes unknown/internal pages from search', () => {
    const pages = staticPages(template, options);
    for (const locale of WEBSITE_LOCALES) for (const answer of ANSWERS[locale].items) {
      expect(parse(pages[`website/${locale}/index.html`]).body.textContent).toContain(answer.a);
    }
    expect(pages['sitemap.xml'].match(/<loc>/g)).toHaveLength(WEBSITE_LOCALES.length * publicRoutes().length);
    expect(pages['sitemap.xml']).not.toContain('moodboard');
    expect(parse(pages['404.html']).querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,follow');
    expect(seoDocument('en', 'missing', options, { title: 'Missing', description: '' }).indexable).toBe(false);
  });
});
