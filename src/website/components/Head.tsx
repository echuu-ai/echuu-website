import { useEffect } from 'react';
import { WEBSITE_LOCALES, type Locale } from '../i18n';
import { CANONICAL_ORIGIN, BASE_PATH } from '../config/site';

function upsert(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    const tag = selector.startsWith('link') ? 'link' : 'meta';
    el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
    document.head.appendChild(el);
  }
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function removeAll(selector: string) {
  document.head.querySelectorAll(selector).forEach((node) => node.remove());
}

type Props = {
  locale: Locale;
  htmlLang: string;
  title: string;
  description: string;
  /** 相对路径，例如 '' 或 'gallery' */
  path: string;
  noindex?: boolean;
};

/**
 * 语义化 head：title/description、OG、hreflang。
 * html.lang 由 app 的 i18n store 统一维护（zh → zh-CN），这里不重复设置。
 * canonical 域名未配置时不输出假的绝对地址。
 */
export function Head({ locale, htmlLang, title, description, path, noindex }: Props) {
  useEffect(() => {
    document.title = title;
    upsert('meta[name="description"]', { name: 'description', content: description });
    upsert('meta[property="og:title"]', { property: 'og:title', content: title });
    upsert('meta[property="og:description"]', { property: 'og:description', content: description });
    upsert('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsert('meta[property="og:locale"]', { property: 'og:locale', content: htmlLang.replace('-', '_') });
    upsert('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });

    removeAll('meta[name="robots"][data-managed="1"]');
    if (noindex) {
      upsert('meta[name="robots"]', { name: 'robots', content: 'noindex, nofollow' }).setAttribute(
        'data-managed',
        '1',
      );
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove();
    }

    removeAll('link[rel="alternate"][data-managed="1"]');
    removeAll('link[rel="canonical"][data-managed="1"]');
    // 没有确认的正式域名时不输出 canonical / hreflang，避免指向错误的站点。
    if (CANONICAL_ORIGIN && !noindex) {
      const suffix = path ? `/${path}` : '';
      const canonical = upsert('link[rel="canonical"]', {
        rel: 'canonical',
        href: `${CANONICAL_ORIGIN}${BASE_PATH}/${locale}${suffix}`,
      });
      canonical.setAttribute('data-managed', '1');
      const hrefLangOf = (item: Locale) => (item === 'zh' ? 'zh-CN' : item);
      for (const other of WEBSITE_LOCALES) {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = hrefLangOf(other);
        link.href = `${CANONICAL_ORIGIN}${BASE_PATH}/${other}${suffix}`;
        link.setAttribute('data-managed', '1');
        document.head.appendChild(link);
      }
      const x = document.createElement('link');
      x.rel = 'alternate';
      x.hreflang = 'x-default';
      x.href = `${CANONICAL_ORIGIN}${BASE_PATH}/en${suffix}`;
      x.setAttribute('data-managed', '1');
      document.head.appendChild(x);
    }
  }, [locale, htmlLang, title, description, path, noindex]);

  return null;
}
