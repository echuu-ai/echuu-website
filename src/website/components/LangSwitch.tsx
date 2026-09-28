import { useEffect, useRef, useState } from 'react';
import { siteLocaleOptions } from '../../i18n/site';
import { useI18nStore } from '../../hooks/use-i18n';
import { goWebsite, useWebsiteLocation, websitePath } from '../router';
import type { Locale } from '../i18n';

/**
 * 语言菜单：显示语言名，不用国旗。
 * 切换时同时更新 URL（保留当前子页）与 app 的 locale store。
 */
export function LangSwitch({ locale, label }: { locale: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { page } = useWebsiteLocation();
  const setLocale = useI18nStore((state) => state.setLocale);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const currentLabel = siteLocaleOptions.find((item) => item.locale === locale)?.label ?? locale;
  const target = page === 'not-found' ? '' : page;

  return (
    <div className="lang-switch" ref={wrapRef}>
      <button
        type="button"
        className="lang-switch__button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="visually-hidden">{label}: </span>
        {currentLabel}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="lang-switch__menu">
          {siteLocaleOptions.map((item) => (
            <li key={item.locale}>
              <a
                href={websitePath(item.locale, target as never)}
                lang={item.locale === 'zh' ? 'zh-CN' : item.locale}
                aria-current={item.locale === locale ? 'true' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setLocale(item.locale);
                  setOpen(false);
                  goWebsite(websitePath(item.locale, target as never));
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
