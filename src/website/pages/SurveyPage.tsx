import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Head } from '../components/Head';
import { LangInline } from '../components/LangInline';
import { LEGAL_DOCS } from '../config/site';
import { fill, type Locale } from '../i18n';
import { surveyUi } from '../i18n/surveyUi';
import { getSurvey, isSurveyScreenOut, normalizeSurveyEmail, type SurveyAnswers, type SurveyId, type SurveyQuestion } from '../lib/surveys';
import { useLocale } from '../locale-context';
import './SurveyPage.css';

type Props = { surveyId: SurveyId };
type Submission = { submissionId: string; locale: Locale };

export function SurveyPage({ surveyId }: Props) {
  return <SurveyForm key={surveyId} surveyId={surveyId} />;
}

function SurveyForm({ surveyId }: Props) {
  const { locale, t } = useLocale();
  const copy = surveyUi[locale];
  const survey = getSurvey(surveyId);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [email, setEmail] = useState('');
  const [validate, setValidate] = useState(false);
  const [phase, setPhase] = useState<'editing' | 'submitting' | 'submitted' | 'failed'>('editing');
  const attempt = useRef<Submission | null>(null);
  const request = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const terminalHeading = useRef<HTMLHeadingElement>(null);

  const screenedOut = isSurveyScreenOut(surveyId, answers);
  const complete = phase === 'submitted';
  const busy = phase === 'submitting';
  const canShowAll = surveyId !== '01' || Boolean(answers.Q01?.length && answers.Q02?.length);
  const questions = canShowAll ? survey.questions : survey.questions.slice(0, 2);
  const missing = survey.questions.filter(question => question.required && !answers[question.id]?.length);
  const normalizedEmail = normalizeSurveyEmail(email);
  const emailError = validate && !normalizedEmail ? (email.trim() ? copy.emailInvalid : copy.emailRequired) : null;
  const emailId = `survey-${surveyId}-email`;
  const total = survey.questions.length + 1;
  const answered = survey.questions.length - missing.length + Number(Boolean(normalizedEmail));

  useEffect(() => () => {
    const pending = request.current;
    request.current = null;
    pending?.abort();
  }, []);

  useEffect(() => {
    if (screenedOut || complete) terminalHeading.current?.focus();
  }, [complete, screenedOut]);

  function choose(question: SurveyQuestion, value: string, checked: boolean) {
    if (request.current) return;
    const current = answers[question.id] ?? [];
    if (question.type === 'single' && current[0] === value) return;
    if (question.type === 'multi' && checked && current.length >= (question.maxSelections ?? question.options.length)) return;
    const choices = question.type === 'single' ? [value] : checked
      ? [...current, value] : current.filter(choice => choice !== value);
    setAnswers({ ...answers, [question.id]: choices });
    attempt.current = null;
    if (phase === 'failed') setPhase('editing');
  }

  function changeEmail(value: string) {
    if (request.current) return;
    setEmail(value);
    if (normalizeSurveyEmail(value) === normalizedEmail) return;
    attempt.current = null;
    if (phase === 'failed') setPhase('editing');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || screenedOut || complete) return;
    if (missing.length || !normalizedEmail) {
      setValidate(true);
      if (missing.length) form.current?.querySelector<HTMLInputElement>(`input[name="${missing[0].id}"]`)?.focus();
      else emailInput.current?.focus();
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    const deadline = window.setTimeout(() => controller.abort(), 20_000);
    setPhase('submitting');
    try {
      attempt.current ??= { locale, submissionId: crypto.randomUUID() };
      const response = await fetch('/api/survey-response', {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId, answers, email: normalizedEmail, ...attempt.current }),
        signal: controller.signal,
      });
      if (response.status !== 200 && response.status !== 201) throw new Error('Survey response rejected');
      const result: unknown = await response.json();
      if (typeof result !== 'object' || result === null || !('status' in result) || result.status !== 'saved') {
        throw new Error('Survey response was not acknowledged');
      }
      if (request.current === controller) setPhase('submitted');
    } catch {
      if (request.current === controller) setPhase('failed');
    } finally {
      window.clearTimeout(deadline);
      if (request.current === controller) request.current = null;
    }
  }

  return (
    <section className="shell survey-page" aria-labelledby="survey-page-title">
      <Head
        locale={locale}
        htmlLang={t.htmlLang}
        title={survey.title[locale]}
        description={survey.intro[locale]}
        path={surveyId === '01' ? 'survey-before' : 'survey-after'}
        noindex
        track={false}
      />
      <div className="survey-page__language">
        <LangInline locale={locale} label={t.nav.language} />
      </div>
      {screenedOut || complete ? (
        <header className="page-head survey-page__terminal">
          <h1 id="survey-page-title" ref={terminalHeading} tabIndex={-1}>
            {screenedOut ? copy.screenedOut : copy.complete}
          </h1>
          <p>{screenedOut ? copy.screenedOutDetail : copy.received}</p>
        </header>
      ) : (
        <>
          <header className="page-head">
            <h1 id="survey-page-title">{survey.title[locale]}</h1>
            <p>{survey.intro[locale]}</p>
          </header>
          <div className="survey-page__overview">
            <p>{copy.required}</p>
            <p role="status">{fill(copy.progress, { answered, total })}</p>
          </div>
          <form ref={form} className="survey-form" onSubmit={submit} noValidate aria-busy={busy}>
            {questions.map(question => {
              const selections = answers[question.id] ?? [];
              const limit = question.maxSelections;
              const capped = limit !== undefined && selections.length >= limit;
              const invalid = validate && question.required && !selections.length;
              const hint = limit !== undefined
                ? fill(capped ? copy.limitReached : copy.limit, { max: limit })
                : question.type === 'single' ? copy.one : copy.multiple;
              const hintId = `survey-${surveyId}-${question.id}-hint`;
              const errorId = `${hintId}-error`;
              return (
                <fieldset
                  className="survey-question"
                  key={question.id}
                  disabled={busy}
                  aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
                >
                  <legend>
                    <span className="survey-question__index" aria-hidden="true">{question.id}</span>
                    {question.stem[locale]}
                  </legend>
                  <p id={hintId} className="survey-question__hint" aria-live={limit === undefined ? undefined : 'polite'}>{hint}</p>
                  {invalid && <p id={errorId} className="field__error">{copy.requiredAnswer}</p>}
                  <div className="survey-question__options">
                    {question.options.map(option => {
                      const checked = selections.includes(option.value);
                      return (
                        <label className="survey-option" key={option.value}>
                          <input
                            type={question.type === 'single' ? 'radio' : 'checkbox'}
                            name={question.id}
                            value={option.value}
                            checked={checked}
                            required={question.type === 'single' && question.required}
                            disabled={capped && !checked}
                            aria-invalid={invalid || undefined}
                            onChange={event => choose(question, option.value, event.currentTarget.checked)}
                          />
                          <span>{option.label[locale]}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
            {canShowAll && (
              <>
                <div className="field survey-email">
                  <label htmlFor={emailId}>
                    <span className="survey-question__index" aria-hidden="true">{survey.emailQuestion.id}</span>
                    {survey.emailQuestion.stem[locale]}
                  </label>
                  <input
                    ref={emailInput}
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    required={survey.emailQuestion.required}
                    disabled={busy}
                    value={email}
                    aria-invalid={Boolean(emailError) || undefined}
                    aria-describedby={emailError ? `${emailId}-error` : undefined}
                    onChange={event => changeEmail(event.currentTarget.value)}
                  />
                  {emailError && <p id={`${emailId}-error`} className="field__error" role="alert">{emailError}</p>}
                </div>
                <footer className="survey-form__footer">
                  <p>
                    {copy.privacy}{' '}
                    <a href={`${LEGAL_DOCS.privacy}?lang=${locale}`} target="_blank" rel="noreferrer noopener">
                      {t.footer.legalLinks.privacy}
                    </a>
                  </p>
                  {validate && missing.length > 0 && <p className="field__error" role="alert">{copy.incomplete}</p>}
                  {phase === 'failed' && <p className="field__error" role="alert">{copy.failed}</p>}
                  <button className="btn btn--primary survey-form__submit" type="submit" disabled={busy}>
                    {busy ? copy.submitting : copy.submit}
                  </button>
                </footer>
              </>
            )}
          </form>
        </>
      )}
    </section>
  );
}
