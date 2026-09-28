import { useLocale } from '../locale-context';
import { Head } from '../components/Head';
import { buildMailto } from '../lib/cta';
import { CONTACT_EMAIL, LEGAL_DOCS } from '../config/site';

export function CreatorsPage() {
  const { locale, t } = useLocale();
  const href = buildMailto(CONTACT_EMAIL, t.creatorsPage.emailSubject, t.creatorsPage.emailBody);

  return (
    <>
      <Head
        locale={locale}
        htmlLang={t.htmlLang}
        title={t.meta.creators.title}
        description={t.meta.creators.description}
        path="creators"
      />
      <div className="shell page-head">
        <h1>{t.creatorsPage.title}</h1>
        <p>{t.creatorsPage.lede}</p>
      </div>

      <section className="section section--tight">
        <div className="shell">
          <p className="creators-manifesto">{t.creators.manifesto}</p>
          <p className="section__lede" style={{ maxWidth: '52ch' }}>
            {t.creators.body}
          </p>

          <h2 className="section__title" style={{ fontSize: 24, marginTop: 40 }}>
            {t.creators.intentsTitle}
          </h2>
          <div className="intents">
            {t.creators.intents.map((intent) => (
              <div className="intent-card" key={intent.title}>
                <h3>{intent.title}</h3>
                <p>{intent.body}</p>
              </div>
            ))}
          </div>
          <p className="section__foot">{t.creators.disclaimer}</p>

          <h2 className="section__title" style={{ fontSize: 24, marginTop: 44 }}>
            {t.creatorsPage.howTitle}
          </h2>
          <p className="section__lede" style={{ maxWidth: '52ch' }}>
            {t.creatorsPage.howBody}
          </p>
          <p style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a className="btn btn--primary" href={href}>
              {t.creators.cta}
            </a>
            <a className="btn btn--ghost" href={LEGAL_DOCS.terms} target="_blank" rel="noreferrer noopener">
              {t.creators.secondary}
            </a>
          </p>
          <p className="section__foot">{t.apply.mailNote}</p>
        </div>
      </section>
    </>
  );
}
