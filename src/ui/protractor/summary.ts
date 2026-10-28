import type { MessageKey } from '../i18n/i18n';
import type { HashState } from '../state/hashState';
import type { ProtractorState } from '../state/protractorHash';

type T = (key: MessageKey, params?: Record<string, string | number>) => string;

/** Chaves dos ângulos de "Mais opções" (índices 2, γ das aletas, sombra parcial e desenho). */
const MORE = /^p?(a2|b[de]2|g[de]2|ga[de])$|^p(a1|b[de]1|g[de]1)$|^d[tp]$/;

/**
 * Resumo do passo 3 fechado (decisão 0044), em uma linha: os ângulos da sombra total (α do brise,
 * β das aletas e γ dos limites laterais, esquerda/direita), a referência quando é a externa e um
 * aviso quando há mais ângulos em "Mais opções". Ex.: "Brise α 50° · referência externa".
 */
export function protectionSummary(
  hash: HashState,
  state: ProtractorState,
  t: T,
  format: (v: number) => string,
): string {
  const a = state.angles;
  const deg = (v: number | undefined) => (v === undefined ? '–' : `${format(v)}°`);
  const parts: string[] = [];
  if (a.alpha) parts.push(t('steps.protection.alpha', { value: deg(a.alpha[0]) }));
  if (a.betaLeft || a.betaRight) {
    parts.push(
      t('steps.protection.beta', { left: deg(a.betaLeft?.[0]), right: deg(a.betaRight?.[0]) }),
    );
  }
  if (a.gammaLeft || a.gammaRight) {
    parts.push(
      t('steps.protection.gamma', { left: deg(a.gammaLeft?.[0]), right: deg(a.gammaRight?.[0]) }),
    );
  }
  const more = Object.keys(hash).some((k) => MORE.test(k) && hash[k] !== '');
  if (parts.length === 0)
    parts.push(t(more ? 'steps.protection.onlyMore' : 'steps.protection.none'));
  else if (more) parts.push(t('steps.protection.more'));
  if (state.invalid.length > 0) parts.push(t('steps.protection.invalid'));
  if (state.reference === 'external') parts.push(t('steps.protection.external'));
  const text = parts.join(' · ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
