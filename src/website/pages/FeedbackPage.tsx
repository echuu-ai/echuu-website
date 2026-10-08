import { useState } from 'react';
import { useLocale } from '../locale-context';
import { Head } from '../components/Head';
import { fill } from '../i18n';
import { buildMailto, copyText } from '../lib/cta';
import { trackEvent } from '../lib/googleAnalytics';
import { CONTACT_EMAIL, FEEDBACK_ENDPOINT } from '../config/site';

const MAX = 1200;

/**
 * 意见箱。没有接通收件服务时不假装提交成功：
 * 只提供「打开邮件客户端」和「复制」，并说明真实流程。
 * 不声称匿名——邮件会带上发件地址。
 */
export function FeedbackPage() {
  const { locale, t } = useLocale();
  const [category, setCategory] = useState<'bug' | 'idea' | 'other'>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const categoryLabel = t.feedbackPage.categories[category];
  const tooLong = message.length > MAX;

  const composed = `[${categoryLabel}]\n\n${message}\n\n${t.feedbackPage.contact}: ${contact || '—'}`;

  function validate(): boolean {
    if (!message.trim()) {
      setError(t.feedbackPage.required);
      return false;
    }
    if (tooLong) {
      setError(t.feedbackPage.tooLong);
      return false;
    }
    setError('');
    return true;
  }

  return (
    <>
      <Head
        locale={locale}
        htmlLang={t.htmlLang}
        title={t.meta.feedback.title}
        description={t.meta.feedback.description}
        path="feedback"
      />
      <div className="shell page-head">
        <h1>{t.feedbackPage.title}</h1>
        <p>{t.feedbackPage.lede}</p>
      </div>

      <section className="section section--tight">
        <div className="shell">
          {!FEEDBACK_ENDPOINT && (
            <div className="notice notice--warn" style={{ maxWidth: 620, marginBottom: 22 }}>
              <span>{t.feedbackPage.noBackendNotice}</span>
            </div>
          )}

          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validate()) return;
              trackEvent('feedback_submitted', { category, method: 'email' });
              window.location.href = buildMailto(
                CONTACT_EMAIL,
                `[Echuu] ${categoryLabel}`,
                composed,
              );
            }}
          >
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field" style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
                {t.feedbackPage.category}
              </legend>
              <div className="radio-row">
                {(['bug', 'idea', 'other'] as const).map((id) => (
                  <label className="radio-chip" key={id}>
                    <input
                      type="radio"
                      name="category"
                      value={id}
                      checked={category === id}
                      onChange={() => setCategory(id)}
                    />
                    {t.feedbackPage.categories[id]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="message">{t.feedbackPage.message}</label>
              <textarea
                id="message"
                value={message}
                maxLength={MAX + 200}
                placeholder={t.feedbackPage.messagePlaceholder}
                onChange={(event) => setMessage(event.target.value)}
                aria-describedby="message-hint"
                aria-invalid={Boolean(error) || tooLong}
              />
              <span className="field__hint" id="message-hint">
                {fill(t.feedbackPage.counter, { n: message.length, max: MAX })}
              </span>
            </div>

            <div className="field">
              <label htmlFor="contact">{t.feedbackPage.contact}</label>
              <input
                id="contact"
                type="text"
                value={contact}
                placeholder={t.feedbackPage.contactPlaceholder}
                onChange={(event) => setContact(event.target.value)}
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="field__error" role="alert">
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn--primary">
                {t.feedbackPage.submit}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={async () => {
                  if (!validate()) return;
                  const ok = await copyText(composed);
                  if (ok) {
                    trackEvent('feedback_submitted', { category, method: 'copy' });
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2400);
                  }
                }}
              >
                {copied ? t.feedbackPage.copied : t.feedbackPage.copy}
              </button>
            </div>

            <p className="status-line" aria-live="polite">
              {copied ? t.feedbackPage.copied : ''}
            </p>

            <div className="notice">
              <span>{t.feedbackPage.privacyNotice}</span>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
