import { Head } from '../components/Head';
import { Link } from '../components/Link';
import { useLocale } from '../locale-context';
import { websitePath } from '../router';

export function NotFoundPage() {
  const { locale, t } = useLocale();
  return (
    <section className="section">
      <Head locale={locale} htmlLang={t.htmlLang} title={`${t.common.notFound} — Echuu`} description="" path="not-found" noindex />
      <div className="shell">
        <h1 className="section__title">{t.common.notFound}</h1>
        <p className="section__foot">
          <Link className="btn btn--quiet btn--small" to={websitePath(locale)}>
            {t.common.backHome}
          </Link>
        </p>
      </div>
    </section>
  );
}
