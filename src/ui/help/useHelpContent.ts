import type { Locale } from '../i18n/i18n';
import { useI18n } from '../i18n/useI18n';
import type { HelpContent } from './content';
import { helpEn } from './help.en';
import { helpEs } from './help.es';
import { helpPtBR } from './help.pt-BR';

const CONTENT: Record<Locale, HelpContent> = { 'pt-BR': helpPtBR, es: helpEs, en: helpEn };

/** Texto da ajuda no idioma da interface (F4.8). */
export function useHelpContent(): HelpContent {
  return CONTENT[useI18n().locale];
}
