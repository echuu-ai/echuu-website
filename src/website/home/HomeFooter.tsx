import { useHomeDict } from './useHomeDict';
import { HOME_ASSETS } from '../assets';
import { Link } from '../components/Link';
import { websitePath } from '../router';
import { getBetaCta } from '../lib/cta';
import { BETA_DOC_URL, CONTACT_EMAIL, LEGAL_DOCS, SOCIAL_LINKS } from '../config/site';
import { fill } from '../i18n';

/** 内测邀请 + 巨字 + 页脚。背景是从天空色沉到深蓝的渐变，中间是背对镜头的翅膀。 */
export function HomeFooter() {
  const { h, locale } = useHomeDict();
  const beta = getBetaCta(h.beta.emailSubject, h.beta.emailBody);
  const [title1, title2] = h.beta.title.split('\n');
  const home = websitePath(locale);
  const x = SOCIAL_LINKS.find((item) => item.id === 'x');

  return (
    <footer className="hv-footer" id="beta">
      <img className="hv-footer__wings" src={HOME_ASSETS.footerWings} alt="" loading="lazy" decoding="async" aria-hidden="true" />
      <div className="hv-beta">
        <h2 className="hv-beta__title">
          {title1}
          <br />
          {title2}
        </h2>
        <p className="hv-beta__body">{h.beta.body}</p>
        <a className="hv-glass hv-glass--beta" href={beta.mode === 'email' ? beta.href : '#beta'}>
          {beta.mode === 'email' ? h.beta.ctaEmail : h.beta.cta}
        </a>
      </div>

      <p className="hv-footer__giant" aria-hidden="true">{h.footer.giant}</p>

      <div className="hv-footer__grid">
        <div className="hv-footer__col">
          <h3>{h.footer.product}</h3>
          <a href="#feature">{h.footer.productLinks.demo}</a>
          <a href={BETA_DOC_URL} target="_blank" rel="noreferrer noopener">{h.footer.productLinks.guide}</a>
        </div>
        <div className="hv-footer__col">
          <h3>{h.footer.creators}</h3>
          <Link to={websitePath(locale, 'creators')}>{h.footer.creatorLinks.partner}</Link>
          <a href={LEGAL_DOCS.terms} target="_blank" rel="noreferrer noopener">{h.footer.creatorLinks.rights}</a>
        </div>
        <div className="hv-footer__col">
          <h3>{h.footer.community}</h3>
          <Link to={websitePath(locale, 'feedback')}>{h.footer.communityLinks.feedback}</Link>
          <Link to={websitePath(locale, 'doodle')}>{h.footer.communityLinks.doodle}</Link>
          <Link to={websitePath(locale, 'journal')}>{h.footer.communityLinks.journal}</Link>
        </div>
        <div className="hv-footer__col">
          <h3>{h.footer.legal}</h3>
          <a href={LEGAL_DOCS.terms} target="_blank" rel="noreferrer noopener">{h.footer.legalLinks.terms}</a>
          <a href={LEGAL_DOCS.privacy} target="_blank" rel="noreferrer noopener">{h.footer.legalLinks.privacy}</a>
          <a href={LEGAL_DOCS.terms} target="_blank" rel="noreferrer noopener">{h.footer.legalLinks.minors}</a>
          <a href={LEGAL_DOCS.ai} target="_blank" rel="noreferrer noopener">{h.footer.legalLinks.ai}</a>
        </div>
        <div className="hv-footer__col">
          <h3>{h.footer.social}</h3>
          <span className="hv-footer__pending">{h.footer.socialLinks.xiaohongshu}</span>
          {x ? (
            <a href={x.href} target="_blank" rel="noreferrer noopener">{h.footer.socialLinks.x}</a>
          ) : null}
        </div>
      </div>

      <div className="hv-footer__bottom">
        <p>
          <span>{h.footer.contact}</span>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p>
          <Link to={home} className="hv-footer__home">Echuu</Link>
          <span>{fill(h.footer.copyright, { year: new Date().getFullYear() })}</span>
        </p>
      </div>
    </footer>
  );
}
