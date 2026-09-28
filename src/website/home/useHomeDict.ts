import { useLocale } from '../locale-context';
import { HOME_DICTS, type HomeDict } from '../i18n/home';

export function useHomeDict(): { locale: ReturnType<typeof useLocale>['locale']; h: HomeDict } {
  const { locale } = useLocale();
  return { locale, h: HOME_DICTS[locale] };
}
