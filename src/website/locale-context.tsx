import { createContext, useContext } from 'react';
import type { Dict, Locale } from './i18n';

export type LocaleValue = { locale: Locale; t: Dict };

export const LocaleContext = createContext<LocaleValue | null>(null);

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleContext');
  return value;
}
