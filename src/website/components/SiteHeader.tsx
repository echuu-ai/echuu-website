import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { useLocale } from '../locale-context';
import { useWebsiteLocation, websitePath } from '../router';
import { LangSwitch } from './LangSwitch';
import { getBetaCta } from '../lib/cta';
import { WING_MARK } from '../assets';

/**
 * 桌面：Logo / 看演示 / 怎么开播 / 角色展示 / 创作者合作 / 申请内测。
 * 移动端只保留 Logo、申请内测和菜单。
 */
export function SiteHeader() {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const { page, hash } = useWebsiteLocation();

  // 换页或跳锚点后收起移动菜单
  useEffect(() => setOpen(false), [page, hash]);

  const home = websitePath(locale);
  const cta = getBetaCta(t.apply.emailSubject, t.apply.emailBody);
  const ctaLabel = cta.mode === 'email' ? t.hero.ctaPrimaryEmail : t.nav.apply;
  const ctaHref = cta.mode === 'email' ? cta.href : `${home}#apply`;

  const links = [
    { href: `${home}#video`, label: t.nav.demo },
    { href: `${home}#steps`, label: t.nav.how },
    { href: websitePath(locale, 'gallery'), label: t.nav.gallery },
    { href: websitePath(locale, 'creators'), label: t.nav.creators },
  ];

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand-link" to={home}>
          <img src={WING_MARK} alt="" width={22} height={22} />
          Echuu
        </Link>

        <nav className="site-nav" aria-label={t.nav.menu}>
          {links.map((link) => (
            <Link key={link.href} to={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <LangSwitch locale={locale} label={t.nav.language} />
          <a className="btn btn--primary btn--small" href={ctaHref}>
            {ctaLabel}
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t.nav.close : t.nav.menu}
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-menu" id="mobile-menu">
          <div className="shell">
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <Link to={link.href}>{link.label}</Link>
                </li>
              ))}
              <li>
                <Link to={websitePath(locale, 'journal')}>{t.footer.communityLinks.journal}</Link>
              </li>
              <li>
                <Link to={websitePath(locale, 'feedback')}>{t.footer.communityLinks.feedback}</Link>
              </li>
              <li>
                <Link to={websitePath(locale, 'doodle')}>{t.footer.communityLinks.doodle}</Link>
              </li>
            </ul>
            <a className="btn btn--primary" href={ctaHref} style={{ marginTop: 16, width: '100%' }}>
              {ctaLabel}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
