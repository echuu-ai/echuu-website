import { Link } from '../components/Link';
import { useLocale } from '../locale-context';
import { websitePath } from '../router';

export function NotFoundPage() {
  const { locale, t } = useLocale();
  return (
    <section className="section">
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
