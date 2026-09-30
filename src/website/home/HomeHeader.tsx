import { LangInline } from '../components/LangInline';
import { useHomeDict } from './useHomeDict';

/** Shared home and team masthead; layout is owned by home.css. */
export function HomeHeader({ menuOpen, onToggleMenu, menuId = 'hv-menu' }: { menuOpen: boolean; onToggleMenu: () => void; menuId?: string }) {
  const { h, locale } = useHomeDict();
  return (
    <header className="hv-header">
      <div className="hv-header__left">
        <span className="hv-header__tagline" lang="en">{h.header.tagline}</span>
        <p className="hv-header__quote" lang="en">
          {h.header.quote}
          <br />
          {h.header.quoteBy}
        </p>
      </div>
      <p className="hv-header__lede">{h.header.lede}</p>
      <div className="hv-header__right">
        <span className="hv-header__brand" lang="en">{h.header.brand}</span>
        <LangInline locale={locale} label={h.header.language} />
        <button
          type="button"
          className="hv-header__menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? h.header.close : h.header.menu}
          onClick={onToggleMenu}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
