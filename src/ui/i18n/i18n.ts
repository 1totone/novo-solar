import { ptBR } from './messages.pt-BR';

export type MessageKey = keyof typeof ptBR;
type Catalog = Record<MessageKey, string>;

/** Idiomas disponíveis. ES e EN entram na Fase 4 (decisão 0005). */
export const LOCALES = ['pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

const catalogs: Record<Locale, Catalog> = { 'pt-BR': ptBR };

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

/** Traduz uma chave, substituindo marcadores {nome} pelos parâmetros dados. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  const template = catalogs[locale][key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Formata um número conforme o idioma (vírgula decimal em português). */
export function formatNumber(locale: Locale, value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
