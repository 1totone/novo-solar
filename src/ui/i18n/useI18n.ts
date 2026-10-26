import { createContext, useContext } from 'react';
import type { Locale, MessageKey } from './i18n';

export interface I18n {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, fractionDigits?: number) => string;
  /** Hora do relógio (11h32 em português, 11:32 nos outros idiomas). */
  formatClock: (hours: number, minutes: number) => string;
  /** Dia e mês (11/02; 11 Feb em inglês). */
  formatDayMonth: (day: number, month: number) => string;
  /** Data por extenso curto, no formato do idioma (impressão). */
  formatDate: (date: Date) => string;
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n precisa estar dentro de <I18nProvider>.');
  return ctx;
}
