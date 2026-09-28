import { zh, type Dict } from './zh';
import { ja } from './ja';
import { en } from './en';
import { ko } from './ko';
import type { Locale } from '../../hooks/use-i18n';

/** 官网字典与产品 app 的 `src/i18n/site.ts` 分开维护，但共用同一套 locale 代码。 */
export const WEBSITE_LOCALES: readonly Locale[] = ['zh', 'ja', 'en', 'ko'] as const;
export const DEFAULT_WEBSITE_LOCALE: Locale = 'en';

export const DICTS: Record<Locale, Dict> = { zh, ja, en, ko };

export function isWebsiteLocale(value: string | undefined): value is Locale {
  return !!value && (WEBSITE_LOCALES as readonly string[]).includes(value);
}

/** 简单占位替换：{n} / {max}。 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type { Dict, Locale };
