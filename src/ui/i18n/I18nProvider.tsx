import { useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, formatNumber, translate, type Locale } from './i18n';
import { I18nContext, type I18n } from './useI18n';

export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18n>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      formatNumber: (n, digits) => formatNumber(locale, n, digits),
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
