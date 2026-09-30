import { Link } from '../components/Link';
import { useLocale } from '../locale-context';
import { websitePath } from '../router';
import { BETA_DOC_URL, LEGAL_DOCS, SOCIAL_LINKS, CONTACT_EMAIL, LEGAL_FINALIZED } from '../config/site';
import { WING_DECO } from '../assets';

export function SiteFooter() {
  const { locale, t } = useLocale();

  return (
    <footer className="site-footer">
      <img className="footer-wing" src={WING_DECO} alt="" width={28} height={24} />
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-col">
            <h2>{t.footer.product}</h2>
            <ul>
              <li>
                <Link to={`${websitePath(locale)}#video`}>{t.footer.productLinks.demo}</Link>
              </li>
              <li>
                <a href={BETA_DOC_URL} target="_blank" rel="noreferrer noopener">
                  {t.footer.productLinks.guide}
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h2>{t.footer.creators}</h2>
            <ul>
              <li>
                <Link to={websitePath(locale, 'creators')}>{t.footer.creatorLinks.partner}</Link>
              </li>
              <li>
                <a href={`${LEGAL_DOCS.terms}?lang=${locale}`} target="_blank" rel="noreferrer noopener">
                  {t.footer.creatorLinks.rights}
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h2>{t.footer.community}</h2>
            <ul>
              <li>
                <Link to={websitePath(locale, 'feedback')}>{t.footer.communityLinks.feedback}</Link>
              </li>
              <li>
                <Link to={websitePath(locale, 'doodle')}>{t.footer.communityLinks.doodle}</Link>
              </li>
              <li>
                <Link to={websitePath(locale, 'journal')}>{t.footer.communityLinks.journal}</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h2>{t.footer.legal}</h2>
            <ul>
              <li>
                <a href={`${LEGAL_DOCS.terms}?lang=${locale}`} target="_blank" rel="noreferrer noopener">
                  {t.footer.legalLinks.terms}
                </a>
              </li>
              <li>
                <a href={`${LEGAL_DOCS.privacy}?lang=${locale}`} target="_blank" rel="noreferrer noopener">
                  {t.footer.legalLinks.privacy}
                </a>
              </li>
              <li>
                <a href={`${LEGAL_DOCS.ai}?lang=${locale}`} target="_blank" rel="noreferrer noopener">
                  {t.footer.legalLinks.ai}
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h2>{t.footer.social}</h2>
            <ul>
              {SOCIAL_LINKS.map((social) => (
                <li key={social.id}>
                  <a href={social.href} target="_blank" rel="noreferrer noopener">
                    {social.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`}>{t.footer.contact}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-scribble">To recreate life out of live</span>
          <span>© {new Date().getFullYear()} {t.footer.rights}</span>
        </div>
        {!LEGAL_FINALIZED && (
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-faint)' }}>{t.footer.draftNotice}</p>
        )}
      </div>
    </footer>
  );
}
