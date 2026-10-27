import type { HashState } from '../state/hashState';

/**
 * Tutorial guiado (F4.5, spec 12, seção 12.1): etapas pelo caminho básico, com o painel que cada uma
 * realça, a condição que diz se a ação foi feita e o "Fazer por mim". Os textos ficam na ajuda de
 * cada idioma (HelpContent.tutorial), na mesma ordem.
 */

/** Painel realçado: um dos passos 1 a 5 ou a carta. */
export type TutorialTarget = '1' | '2' | '3' | '4' | '5' | 'carta';

export interface TutorialStep {
  id: string;
  target: TutorialTarget | null;
  /** A ação da etapa já está feita no estado do link? (Sem ação: sempre verdadeiro.) */
  done?: (state: HashState) => boolean;
  /** O que o "Fazer por mim" aplica no link. */
  patch?: HashState;
}

const number = (text: string | undefined) =>
  text === undefined || text.trim() === '' ? NaN : Number(text.replace(',', '.'));

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'inicio', target: null },
  {
    id: 'local',
    target: '1',
    done: (s) => s.local === 'brasilia',
    patch: { local: 'brasilia', nome: '', lat: '', lon: '', fuso: '', alt: '' },
  },
  { id: 'carta', target: 'carta' },
  {
    id: 'fachada',
    target: '2',
    done: (s) => ((number(s.o) % 360) + 360) % 360 === 30,
    patch: { o: '30' },
  },
  {
    id: 'alfa',
    target: '3',
    done: (s) => number(s.a1) === 55 && s.ref !== 'e',
    patch: { a1: '55', ref: '' },
  },
  {
    id: 'gama',
    target: '3',
    done: (s) => number(s.gd1) === 50 && number(s.ge1) === 60,
    patch: { gd1: '50', ge1: '60' },
  },
  {
    id: 'dados',
    // Os dados e o que pintar ficam no passo 1 (decisão 0047).
    target: '1',
    done: (s) => s.hist === '1' && s.dado === 'tbs',
    patch: { hist: '1', dado: 'tbs' },
  },
  { id: 'fim', target: '5' },
];

/** Etapa do link (tutorial=1 a n), ou null fora do tutorial. */
export function tutorialStepFromHash(state: HashState): number | null {
  const n = Number(state.tutorial);
  if (!Number.isInteger(n) || n < 1) return null;
  return Math.min(n, TUTORIAL_STEPS.length);
}

/** Link relativo que começa o tutorial do zero (o resto do link vazio). */
export const TUTORIAL_HREF = './#tutorial=1';
