import { useEffect, useId, useRef, useState } from 'react';
import { siteLocaleOptions } from '../../i18n/site';
import { useI18nStore } from '../../hooks/use-i18n';
import { goWebsite, useWebsiteLocation, websitePath } from '../router';
import type { Locale } from '../i18n';
import { HOME_ASSETS } from '../assets';

/**
 * 底部栏的语言按钮：点开是一个小的语言列表（在按钮上方），不再打开整页菜单。
 * 切换时保留当前子页与文章；Esc、点外面、选完都会收起，焦点回到按钮。
 */
export function LangPopover({ locale, label }: { locale: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const { page, slug } = useWebsiteLocation();
  const setLocale = useI18nStore((state) => state.setLocale);
  const target = page === 'not-found' ? '' : page;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    root.current?.querySelector<HTMLElement>('[aria-current="true"], a')?.focus();
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="hv-langpop" ref={root}>
      <button
        ref={button}
        type="button"
        className="hv-cta__icon"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <img src={HOME_ASSETS.icons.language} alt="" />
      </button>
      {open ? (
        <nav className="hv-langpop__list" id={listId} aria-label={label}>
          {siteLocaleOptions.map((item) => {
            const href = websitePath(item.locale, target as never, slug);
            return (
              <a
                key={item.locale}
                href={href}
                lang={item.locale === 'zh' ? 'zh-CN' : item.locale}
                aria-current={item.locale === locale ? 'true' : undefined}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  setOpen(false);
                  setLocale(item.locale);
                  goWebsite(href);
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
