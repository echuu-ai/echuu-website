import { useEffect } from 'react';
import type { Locale } from '../i18n';
import { CANONICAL_ORIGIN } from '../config/site';
import { SHARE_IMAGE, seoDocument } from '../seo/siteSeo';

type Props = { locale: Locale; htmlLang: string; title: string; description: string; path: string; noindex?: boolean };

/** Replace only managed head entries; initial HTML and SPA navigation share the same metadata. */
export function Head({ locale, htmlLang, title, description, path, noindex }: Props) {
  useEffect(() => {
    const indexingEnabled = import.meta.env.PROD && import.meta.env.VITE_SITE_INDEXABLE === '1'
      && window.location.origin === CANONICAL_ORIGIN;
    const seo = seoDocument(locale, path, {
      origin: CANONICAL_ORIGIN, base: import.meta.env.BASE_URL, indexable: indexingEnabled,
    }, { title, description, noindex });
    document.title = title;
    document.documentElement.lang = htmlLang;
    document.head.querySelectorAll('[data-seo], [data-managed="1"], meta[name="description"], meta[name="robots"], meta[name^="twitter:"], meta[property^="og:"], link[rel="canonical"], link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    const add = (tag: string, attrs: Record<string, string>, text?: string) => {
      const el = document.createElement(tag);
      el.setAttribute('data-seo', '1');
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
      if (text) el.textContent = text;
      document.head.appendChild(el);
    };
    add('meta', { name: 'description', content: description });
    add('meta', { name: 'robots', content: seo.indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow' });
    for (const [property, content] of Object.entries({
      'og:title': title, 'og:description': description, 'og:type': seo.article ? 'article' : 'website',
      'og:locale': htmlLang.replace('-', '_'), 'og:site_name': 'Echuu',
      'og:url': seo.indexable ? seo.url : window.location.href,
      'og:image': seo.image, 'og:image:width': String(SHARE_IMAGE.width), 'og:image:height': String(SHARE_IMAGE.height), 'og:image:type': SHARE_IMAGE.type,
      'og:image:alt': HOME_IMAGE_ALT,
    })) add('meta', { property, content });
    add('meta', { name: 'twitter:card', content: 'summary_large_image' });
    add('meta', { name: 'twitter:title', content: title });
    add('meta', { name: 'twitter:description', content: description });
    add('meta', { name: 'twitter:image', content: seo.image });
    if (seo.indexable) {
      add('link', { rel: 'canonical', href: seo.url });
      for (const item of seo.alternates) add('link', { rel: 'alternate', hreflang: item.lang, href: item.url });
      add('link', { rel: 'alternate', hreflang: 'x-default', href: seo.xDefault });
    }
    add('script', { type: 'application/ld+json' }, JSON.stringify(seo.schema));
  }, [locale, htmlLang, title, description, path, noindex]);
  return null;
}
const HOME_IMAGE_ALT = 'Echuu — Original characters on stage';
