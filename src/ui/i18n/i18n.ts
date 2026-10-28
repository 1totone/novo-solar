import { ptBR } from './messages.pt-BR';

export type MessageKey = keyof typeof ptBR;
/** Catálogo completo de um idioma: as mesmas chaves do português (decisão 0005). */
export type Catalog = Record<MessageKey, string>;

/** Idiomas disponíveis (F4.6, decisão 0029). */
export const LOCALES = ['pt-BR', 'es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

/** Nome de cada idioma escrito nele mesmo, para o seletor. */
export const LOCALE_NAMES: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
  en: 'English',
};

/**
 * Catálogos já carregados. O português vem com a aplicação; o espanhol e o inglês, sob demanda,
 * só para quem usa (decisão 0039).
 */
const catalogs: Partial<Record<Locale, Catalog>> = { 'pt-BR': ptBR };

const loaders: Record<Exclude<Locale, 'pt-BR'>, () => Promise<Catalog>> = {
  es: () => import('./messages.es').then((m) => m.es),
  en: () => import('./messages.en').then((m) => m.en),
};

export function isLocaleLoaded(locale: Locale): boolean {
  return catalogs[locale] !== undefined;
}

/** Carrega o catálogo de um idioma (uma vez); o português já está carregado. */
export async function loadLocale(locale: Locale): Promise<void> {
  if (locale === 'pt-BR' || catalogs[locale]) return;
  catalogs[locale] = await loaders[locale]();
}

export function isLocale(value: string | undefined | null): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Primeiro idioma do navegador que a aplicação tem (pt, es ou en, de qualquer região). */
export function detectLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'pt') return 'pt-BR';
    if (base === 'es') return 'es';
    if (base === 'en') return 'en';
  }
  return DEFAULT_LOCALE;
}

/** Traduz uma chave, substituindo marcadores {nome} pelos parâmetros dados. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  // Idioma ainda não carregado: o texto em português, que tem todas as chaves.
  const template = (catalogs[locale] ?? ptBR)[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Formata um número conforme o idioma (vírgula decimal em português e espanhol). */
export function formatNumber(locale: Locale, value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Hora do relógio: 11h32 em português (como no ensino brasileiro), 11:32 nos outros idiomas. */
export function formatClock(locale: Locale, hours: number, minutes: number): string {
  const mm = String(minutes).padStart(2, '0');
  return locale === 'pt-BR' ? `${hours}h${mm}` : `${hours}:${mm}`;
}

/** Dia e mês: 11/02 em português e espanhol; 11 Feb em inglês (sem a ambiguidade de 11/02). */
export function formatDayMonth(locale: Locale, day: number, month: number): string {
  if (locale === 'en') {
    return `${day} ${translate(locale, 'chart.monthsShort').split(',')[month - 1]}`;
  }
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}
