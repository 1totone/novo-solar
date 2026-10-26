import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  detectLocale,
  formatClock,
  formatDayMonth,
  formatNumber,
  isLocale,
  translate,
  type Locale,
} from './i18n';
import { I18nContext, type I18n } from './useI18n';

/** Preferência de idioma de quem usa (só neste navegador; não vai para o link). */
export const LOCALE_STORAGE_KEY = 'sol-ar:idioma';

function initialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Armazenamento bloqueado: segue pelo idioma do navegador.
  }
  return detectLocale(typeof navigator === 'undefined' ? [] : navigator.languages);
}

export function I18nProvider({
  locale: fixed,
  children,
}: {
  /** Idioma fixo (testes); sem ele, o guardado neste navegador ou o do navegador. */
  locale?: Locale;
  children: ReactNode;
}) {
  const [chosen, setChosen] = useState<Locale>(() => fixed ?? initialLocale());
  const locale = fixed ?? chosen;
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale: (next) => {
        setChosen(next);
        try {
          window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
        } catch {
          // Sem armazenamento, o idioma vale só nesta página.
        }
      },
      t: (key, params) => translate(locale, key, params),
      formatNumber: (n, digits) => formatNumber(locale, n, digits),
      formatClock: (h, m) => formatClock(locale, h, m),
      formatDayMonth: (d, m) => formatDayMonth(locale, d, m),
      formatDate: (date) => new Intl.DateTimeFormat(locale).format(date),
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
