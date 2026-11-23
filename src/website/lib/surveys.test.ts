import { describe, expect, it } from 'vitest';
import {
  getSurvey,
  isSurveyScreenOut,
  normalizeSurveyEmail,
  parseSurveyResponse,
  type SurveyId,
  type SurveyLocale,
  type SurveyResponse,
} from './surveys';

const submissionId = '6364c3cf-1b1f-44d0-9ad8-8acae9d2e30f';
const email = 'Test.Matching+Survey@Example.com';
const locales = ['zh', 'en', 'ja', 'ko'] as const;

function completed(surveyId: SurveyId, locale: SurveyLocale = 'zh'): SurveyResponse {
  return {
    surveyId,
    locale,
    email,
    submissionId,
    answers: Object.fromEntries(getSurvey(surveyId).questions.map(question => [question.id, [question.options[0].value]])),
  };
}

describe('survey response validation', () => {
  it.each(['01', '02'] as const)('provides a localized required email question after ten choice questions in survey %s', surveyId => {
    const survey = getSurvey(surveyId);
    expect(survey.questions).toHaveLength(10);
    expect(survey.emailQuestion).toMatchObject({ id: 'Q11', type: 'email', required: true });
    for (const locale of locales) {
      expect(survey.emailQuestion.stem[locale]).toBeTruthy();
      expect(survey.intro[locale]).toContain('11');
      expect(survey.intro[locale]).not.toMatch(/anonymous|匿名|익명/i);
    }
  });

  it.each(['01', '02'] as const)('accepts complete survey %s in each supported language', surveyId => {
    for (const locale of locales) {
      const response = completed(surveyId, locale);
      expect(parseSurveyResponse(response)).toEqual(response);
    }
  });

  it('returns detached answer codes, trims email without changing its case, and normalizes UUID casing', () => {
    const response = completed('01');
    const parsed = parseSurveyResponse({ ...response, email: '  ' + email + '  ', submissionId: submissionId.toUpperCase() });
    expect(parsed).toEqual(response);
    response.answers.Q01.push('B');
    expect(parsed?.answers.Q01).toEqual(['A']);
  });

  it('rejects missing or extra metadata, noncanonical locales, and invalid UUIDs', () => {
    const response = completed('01');
    for (const raw of [null, [], {}, { ...response, surveyId: '03' }, { ...response, locale: 'zh-CN' },
      { ...response, name: 'example' }, { ...response, submissionId: 'abc' },
      { ...response, submissionId: '00000000-0000-0000-0000-000000000000' }]) {
      expect(parseSurveyResponse(raw)).toBeNull();
    }
  });

  it('requires a valid top-level email for both surveys', () => {
    for (const surveyId of ['01', '02'] as const) {
      const { email: _email, ...response } = completed(surveyId);
      expect(parseSurveyResponse(response)).toBeNull();
      for (const invalid of [null, '', '   ', 'missing-at.example.com', 'a@b', 'a..b@example.com',
        'a b@example.com', 'a@example..com', 'a@-example.com', 'a@example.com\nBcc:x@other.com']) {
        expect(parseSurveyResponse({ ...response, email: invalid })).toBeNull();
      }
      expect(parseSurveyResponse({ ...response, email, answers: { ...response.answers, Q11: [email] } })).toBeNull();
    }
  });

  it('checks address syntax and the length limit after trimming', () => {
    const addressAtLimit = 'a'.repeat(64) + '@' + ['b'.repeat(63), 'c'.repeat(63), 'd'.repeat(61)].join('.');
    expect(addressAtLimit).toHaveLength(254);
    expect(normalizeSurveyEmail(' ' + addressAtLimit + ' ')).toBe(addressAtLimit);
    expect(normalizeSurveyEmail(addressAtLimit + 'd')).toBeNull();
    expect(normalizeSurveyEmail('X_12@xn--bcher-kva.de')).toBe('X_12@xn--bcher-kva.de');
    expect(normalizeSurveyEmail('a'.repeat(65) + '@example.com')).toBeNull();
  });

  it('rejects missing and unknown questions, empty selections, and values outside the question options', () => {
    const response = completed('01');
    const { Q01: first, ...remaining } = response.answers;
    expect(parseSurveyResponse({ ...response, answers: remaining })).toBeNull();
    expect(parseSurveyResponse({ ...response, answers: { ...remaining, Q11: first } })).toBeNull();
    expect(parseSurveyResponse({ ...response, answers: { ...response.answers, Q01: [] } })).toBeNull();
    expect(parseSurveyResponse({ ...response, answers: { ...response.answers, Q01: ['A', 'B'] } })).toBeNull();
    expect(parseSurveyResponse({ ...response, answers: { ...response.answers, Q01: ['G'] } })).toBeNull();
    expect(parseSurveyResponse({ ...response, answers: { ...response.answers, Q01: 'A' } })).toBeNull();
  });

  it.each([
    ['01', 'Q05', 3],
    ['01', 'Q08', 3],
    ['02', 'Q05', 3],
    ['02', 'Q08', 2],
    ['02', 'Q10', 3],
  ] as const)('enforces the selection cap for survey %s question %s', (surveyId, questionId, cap) => {
    const response = completed(surveyId);
    Object.assign(response.answers, { [questionId]: ['A', 'B', 'C', 'D'].slice(0, cap) });
    expect(parseSurveyResponse(response)).toEqual(response);
    response.answers[questionId].push('D');
    expect(parseSurveyResponse(response)).toBeNull();
  });

  it('accepts all distinct listed options on an uncapped multi-select', () => {
    const response = completed('01');
    response.answers.Q04 = getSurvey('01').questions[3].options.map(option => option.value);
    expect(parseSurveyResponse(response)).toEqual(response);
    response.answers.Q04 = ['A', 'A'];
    expect(parseSurveyResponse(response)).toBeNull();
  });

  it('allows early termination only in survey 01 and rejects a terminal response even if complete', () => {
    const earlyAnswers = { Q02: ['D'] };
    expect(isSurveyScreenOut('01', earlyAnswers)).toBe(true);
    expect(isSurveyScreenOut('01', { Q02: ['C'] })).toBe(false);
    expect(isSurveyScreenOut('02', earlyAnswers)).toBe(false);
    const response = completed('01');
    expect(parseSurveyResponse({ ...response, answers: earlyAnswers })).toBeNull();
    expect(parseSurveyResponse({ ...response, answers: { ...response.answers, ...earlyAnswers } })).toBeNull();
    const second = completed('02');
    expect(parseSurveyResponse({ ...second, answers: { ...second.answers, ...earlyAnswers } })).not.toBeNull();
  });
});
