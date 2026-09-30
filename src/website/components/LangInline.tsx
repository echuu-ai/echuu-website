import { siteLocaleOptions } from '../../i18n/site';
import { useI18nStore } from '../../hooks/use-i18n';
import { goWebsite, useWebsiteLocation, websitePath } from '../router';
import type { Locale } from '../i18n';

/**
 * 首屏页头用的一行语言切换：中 · 日 · EN · 한。
 * 切换时保留当前子页与文章，URL 与 app 的 locale store 一起更新。
 */
export function LangInline({ locale, label }: { locale: Locale; label: string }) {
  const { page, slug } = useWebsiteLocation();
  const setLocale = useI18nStore((state) => state.setLocale);
  const target = page === 'not-found' ? '' : page;
  return (
    <nav className="hv-lang" aria-label={label}>
      {siteLocaleOptions.map((item) => {
        const href = websitePath(item.locale, target as never, slug);
        return (
          <a
            key={item.locale}
            href={href}
            lang={item.locale === 'zh' ? 'zh-CN' : item.locale}
            aria-current={item.locale === locale ? 'true' : undefined}
            title={item.label}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              setLocale(item.locale);
              goWebsite(href);
            }}
          >
            {item.shortLabel}
          </a>
        );
      })}
    </nav>
  );
}
