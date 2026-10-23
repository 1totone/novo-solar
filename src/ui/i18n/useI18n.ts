import { createContext, useContext } from 'react';
import type { Locale, MessageKey } from './i18n';

export interface I18n {
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, fractionDigits?: number) => string;
}

export const I18nContext = createContext<I18n | null>(null);

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n precisa estar dentro de <I18nProvider>.');
  return ctx;
}
