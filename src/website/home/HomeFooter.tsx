import { SocialLinks } from '../components/SocialLinks';
import { useHomeDict } from './useHomeDict';
import { HOME_ASSETS } from '../assets';
import { Link } from '../components/Link';
import { websitePath } from '../router';
import { BETA_DOC_URL, CONTACT_EMAIL, LEGAL_DOCS } from '../config/site';
import { fill } from '../i18n';
import { Reveal } from '../components/Reveal';
import { LoopArt } from '../components/LoopArt';

/** 内测邀请 + 巨字 + 页脚。背景是从天空色沉到深蓝的渐变，中间是背对镜头的翅膀。 */
export function HomeFooter({ onBeta }: { onBeta: () => void }) {
  const { h, locale } = useHomeDict();
  const [title1, title2] = h.beta.title.split('\n');
  const home = websitePath(locale);

  return (
    <footer className="hv-footer" id="beta">
      <LoopArt className="hv-footer__wings" poster={HOME_ASSETS.footerWings} {...HOME_ASSETS.loops.footerWings} width={1000} height={1499} />
      <Reveal className="hv-beta">
        <h2 className="hv-beta__title">
          {title1}
          <br />
          {title2}
        </h2>
        <p className="hv-beta__body">{h.beta.body}</p>
        <button type="button" className="hv-glass hv-glass--beta" onClick={onBeta}>
          {h.beta.cta}
        </button>
      </Reveal>

      <p className="hv-footer__giant" aria-hidden="true">{h.footer.giant}</p>

      <div className="hv-footer__grid">
        <div className="hv-footer__col">
          <h3>{h.footer.product}</h3>
          <Link to={`${home}#feature`}>{h.footer.productLinks.demo}</Link>
          <a href={BETA_DOC_URL} target="_blank" rel="noreferrer noopener">{h.footer.productLinks.guide}</a>
        </div>
        <div className="hv-footer__col">
          <h3>{h.footer.creators}</h3>
          <Link to={websitePath(locale, 'creators')}>{h.footer.creatorLinks.partner}</Link>
          <a href={`${LEGAL_DOCS.terms}?lang=${locale}`} target="_blank" rel="noreferrer noopener">{h.footer.creatorLinks.rights}</a>
        </div>
        <div className="hv-footer__col">
          <h3>{h.footer.community}</h3>
          <Link to={websitePath(locale, 'feedback')}>{h.footer.communityLinks.feedback}</Link>
          <Link to={websitePath(locale, 'doodle')}>{h.footer.communityLinks.doodle}</Link>
          <Link to={websitePath(locale, 'blog')}>{h.footer.communityLinks.blog}</Link>
          <Link to={websitePath(locale, 'team')}>{h.footer.communityLinks.team}</Link>
          <Link to={websitePath(locale, 'journal')}>{h.footer.communityLinks.journal}</Link>
        </div>
        <div className="hv-footer__col">
          <h3>{h.footer.legal}</h3>
          <a href={`${LEGAL_DOCS.terms}?lang=${locale}`} target="_blank" rel="noreferrer noopener">{h.footer.legalLinks.terms}</a>
          <a href={`${LEGAL_DOCS.privacy}?lang=${locale}`} target="_blank" rel="noreferrer noopener">{h.footer.legalLinks.privacy}</a>
          <a href={`${LEGAL_DOCS.minors}?lang=${locale}`} target="_blank" rel="noreferrer noopener">{h.footer.legalLinks.minors}</a>
          <a href={`${LEGAL_DOCS.ai}?lang=${locale}`} target="_blank" rel="noreferrer noopener">{h.footer.legalLinks.ai}</a>
        </div>
        <div className="hv-footer__col">
          <h3>{h.footer.social}</h3>
          <SocialLinks />
        </div>
      </div>

      <div className="hv-footer__bottom">
        <p>
          <span>{h.footer.contact}</span>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <Link to={home} className="hv-footer__home"><img src={HOME_ASSETS.logoWhite} alt="Echuu" width={679} height={569} loading="lazy" decoding="async" /></Link>
        <p>
          <span>{fill(h.footer.copyright, { year: new Date().getFullYear() })}</span>
        </p>
      </div>
    </footer>
  );
}
