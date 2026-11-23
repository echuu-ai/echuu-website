import catalog from '../data/echuu-surveys.json' with { type: 'json' };

export type SurveyId = '01' | '02';
export type SurveyLocale = 'zh' | 'en' | 'ja' | 'ko';
export type SurveyAnswers = Record<string, string[]>;

type LocalizedText = Readonly<Record<SurveyLocale, string>>;

export type SurveyQuestion = {
  readonly id: string;
  readonly type: 'single' | 'multi';
  readonly required: boolean;
  readonly stem: LocalizedText;
  readonly options: readonly { readonly value: string; readonly label: LocalizedText }[];
  readonly maxSelections?: number;
  readonly screenOutValues?: readonly string[];
};

export type Survey = {
  readonly id: SurveyId;
  readonly title: LocalizedText;
  readonly intro: LocalizedText;
  readonly questions: readonly SurveyQuestion[];
  readonly emailQuestion: {
    readonly id: 'Q11';
    readonly type: 'email';
    readonly required: true;
    readonly stem: LocalizedText;
  };
};

export type SurveyResponse = {
  surveyId: SurveyId;
  locale: SurveyLocale;
  answers: SurveyAnswers;
  email: string;
  submissionId: string;
};

function readCatalogSurvey(id: SurveyId): Survey {
  const entry = catalog.surveys.find(survey => survey.id === id);
  if (!entry) throw new Error(`Missing survey ${id}`);
  const questions = entry.questions.map((question): SurveyQuestion => {
    const { type } = question;
    if (type !== 'single' && type !== 'multi') throw new Error(`Invalid question type in survey ${id}`);
    return { ...question, type };
  });
  const { id: emailId, type, required, stem } = entry.emailQuestion;
  if (emailId !== 'Q11' || type !== 'email' || !required) throw new Error(`Invalid email question in survey ${id}`);
  return { ...entry, id, questions, emailQuestion: { id: emailId, type, required, stem } };
}

const surveys = { '01': readCatalogSurvey('01'), '02': readCatalogSurvey('02') };
const responseKeys = ['surveyId', 'locale', 'answers', 'email', 'submissionId'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailLocalPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const emailDomainLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function getSurvey(id: SurveyId): Survey {
  return surveys[id];
}

export function isSurveyScreenOut(id: SurveyId, answers: SurveyAnswers): boolean {
  return getSurvey(id).questions.some(question =>
    question.screenOutValues?.some(value => answers[question.id]?.includes(value)));
}

/** Trim surrounding whitespace and preserve the submitted address for matching. */
export function normalizeSurveyEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  if (email.length > 254) return null;

  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (local.length > 64 || !emailLocalPattern.test(local)) return null;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;

  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every(label => emailDomainLabel.test(label))) return null;
  return email;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Validate completed submissions against the same question data used by the form. */
export function parseSurveyResponse(raw: unknown): SurveyResponse | null {
  if (!isRecord(raw)) return null;
  const keys = Object.keys(raw);
  if (keys.length !== responseKeys.length || !keys.every(key => responseKeys.includes(key))) return null;

  const { surveyId, locale, answers, submissionId } = raw;
  if (surveyId !== '01' && surveyId !== '02') return null;
  if (locale !== 'zh' && locale !== 'en' && locale !== 'ja' && locale !== 'ko') return null;
  if (typeof submissionId !== 'string' || !uuidPattern.test(submissionId)) return null;
  const email = normalizeSurveyEmail(raw.email);
  if (email === null) return null;
  if (!isRecord(answers)) return null;

  const { questions } = getSurvey(surveyId);
  if (Object.keys(answers).length !== questions.length) return null;

  const validated: SurveyAnswers = {};
  for (const question of questions) {
    if (!Object.prototype.hasOwnProperty.call(answers, question.id)) return null;
    const choices = answers[question.id];
    const limit = question.type === 'single' ? 1 : question.maxSelections ?? question.options.length;
    if (!Array.isArray(choices) || choices.length < 1 || choices.length > limit) return null;

    const selected = new Set<string>();
    for (const choice of choices) {
      if (typeof choice !== 'string' || !question.options.some(option => option.value === choice)) return null;
      if (selected.has(choice)) return null;
      selected.add(choice);
    }
    validated[question.id] = [...selected];
  }

  if (isSurveyScreenOut(surveyId, validated)) return null;
  return { surveyId, locale, answers: validated, email, submissionId: submissionId.toLowerCase() };
}
