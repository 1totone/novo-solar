import type { TutorialTarget } from '../didactic/tutorial';
import type { HashState } from '../state/hashState';
import { rememberFocus } from './focusAfterLoad';
import { WIDE_QUERY } from './sideResultsContext';

/**
 * Passos da coluna como acordeão (decisão 0044): os cinco do caminho básico, o painel das projeções
 * e os passos avançados 6 e 7. Um aberto por vez; o aberto não vai para o link.
 */
export type StepId = '1' | '2' | '3' | '4' | '5' | 'opcoes' | '6' | '7';

/** Chaves do link que abrem o passo 7 (classificação das horas e alternativas). */
const EFFECT_KEYS = ['cm', 'ca', 'cr', 'cal', 'cn', 'cg', 'tf', 'tq', 'te', 'ct', 'alter1'];

/**
 * Passo aberto ao chegar: o do tutorial; o 3 num exercício de máscara; o passo avançado que o link
 * traz (7, 6 ou as projeções, nessa ordem); senão o 1. Os outros mostram o resumo.
 */
export function initialStep(
  hash: HashState,
  geometryDefined: boolean,
  tutorialTarget: TutorialTarget | null,
): StepId {
  if (tutorialTarget && tutorialTarget !== 'carta') return tutorialTarget;
  if (hash.exercicio) return '3';
  if (EFFECT_KEYS.some((k) => hash[k])) return '7';
  if (geometryDefined) return '6';
  if (hash.proj || hash.hl) return 'opcoes';
  return '1';
}

const SELECTOR: Record<StepId, string> = {
  '1': '[data-step="1"]',
  '2': '[data-step="2"]',
  '3': '[data-step="3"]',
  '4': '[data-step="4"]',
  '5': '[data-step="5"]',
  opcoes: '[data-testid="chart-options-panel"]',
  '6': '[data-testid="geometry-panel"]',
  '7': '[data-testid="effect-panel"]',
};

/** Cabeçalho (o `summary`) do passo. */
export function stepSummary(id: StepId): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.steps ${SELECTOR[id]} > details > summary`);
}

/**
 * Altura do que fica fixo no alto da tela e cobriria um passo: a carta no celular; no computador,
 * o atalho entre passos (decisão 0040), quando está à vista.
 */
export function topCover(): number {
  const wide = window.matchMedia?.(WIDE_QUERY).matches ?? true;
  const el = document.querySelector<HTMLElement>(wide ? '.step-nav' : '.chart-section');
  if (!el || getComputedStyle(el).position !== 'sticky') return 0;
  // A altura, e não a posição de agora: antes de rolar, a área ainda não grudou no alto.
  return el.offsetHeight + (parseFloat(getComputedStyle(el).top) || 0);
}

/**
 * Traz o cabeçalho do passo para a vista, abaixo do que é fixo no alto, se ele não estiver à vista
 * (fechar o passo de cima pode tirá-lo do lugar); com `focus`, põe o foco nele.
 */
export function revealStep(id: StepId, focus: boolean) {
  const summary = stepSummary(id);
  if (!summary) return;
  const cover = topCover();
  const box = summary.getBoundingClientRect();
  if (box.top < cover || box.bottom > window.innerHeight) {
    window.scrollTo({ top: Math.max(0, box.top + window.scrollY - cover - 8) });
  }
  if (!focus) return;
  summary.focus({ preventScroll: true });
  // Passo avançado ainda carregando (decisão 0039): o foco volta ao cabeçalho quando ele chegar.
  const testId = summary.closest<HTMLElement>('[data-testid]')?.dataset.testid;
  if (testId && summary.parentElement?.querySelector('[role="status"]')) rememberFocus(testId);
}
