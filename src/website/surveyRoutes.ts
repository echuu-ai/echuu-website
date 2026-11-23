import type { SurveyId } from './lib/surveys';

export const SURVEY_ROUTES = {
  'survey-before': '01',
  'survey-after': '02',
} as const satisfies Record<string, SurveyId>;

export type SurveyRoute = keyof typeof SURVEY_ROUTES;

export function isSurveyRoute(path: string): path is SurveyRoute {
  return Object.prototype.hasOwnProperty.call(SURVEY_ROUTES, path);
}
