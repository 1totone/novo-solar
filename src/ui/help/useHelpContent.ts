import { use } from 'react';
import type { Locale } from '../i18n/i18n';
import { useI18n } from '../i18n/useI18n';
import type { HelpContent } from './content';

/** Texto da ajuda de cada idioma, carregado sob demanda (decisão 0039). */
const LOADERS: Record<Locale, () => Promise<HelpContent>> = {
  'pt-BR': () => import('./help.pt-BR').then((m) => m.helpPtBR),
  es: () => import('./help.es').then((m) => m.helpEs),
  en: () => import('./help.en').then((m) => m.helpEn),
};

const loading = new Map<Locale, Promise<HelpContent>>();

/** Promessa do texto da ajuda de um idioma (a mesma a cada chamada, para o `use` do React). */
export function helpContent(locale: Locale): Promise<HelpContent> {
  let p = loading.get(locale);
  if (!p) {
    p = LOADERS[locale]();
    // Falhou (sem internet e sem cópia): tenta de novo na próxima vez.
    p.catch(() => loading.delete(locale));
    loading.set(locale, p);
  }
  return p;
}

/**
 * Texto da ajuda no idioma da interface (F4.8). Suspende até o texto chegar: quem usa fica dentro
 * de um `Suspense`.
 */
export function useHelpContent(): HelpContent {
  return use(helpContent(useI18n().locale));
}
