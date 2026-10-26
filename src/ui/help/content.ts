import type { ExerciseId } from '../didactic/exercises';
import { buildHash, type HashState } from '../state/hashState';

/**
 * Ajuda (F4.8, decisão 0032): partes, exemplos resolvidos e a estrutura do texto de cada idioma.
 * O texto fica em help.pt-BR.ts, help.es.ts e help.en.ts, com a mesma estrutura nos três
 * (conferida em help.test.ts); os números dos exemplos são conferidos pelo núcleo em
 * tests/referencia/ajudaExemplos.test.ts.
 */

/** Partes da ajuda, no '#' da URL como ajuda=guia, ajuda=exemplos etc. (não se traduzem). */
export const HELP_SECTIONS = [
  'guia',
  'exemplos',
  'exercicios',
  'glossario',
  'perguntas',
  'hipoteses',
] as const;
export type HelpSection = (typeof HELP_SECTIONS)[number];

export function helpSectionFromHash(state: HashState): HelpSection | null {
  const value = state.ajuda;
  if (value === undefined || value === '') return null;
  return (HELP_SECTIONS as readonly string[]).includes(value) ? (value as HelpSection) : 'guia';
}

/** Exemplos resolvidos, a partir do tutorial do SOL-AR da UFU (Bortoli e Saramago, 2013). */
export const EXAMPLE_IDS = ['angulos', 'recuo', 'afastado'] as const;
export type ExampleId = (typeof EXAMPLE_IDS)[number];

/** Estado de cada exemplo no link (sem a chave exemplo, que a ajuda acrescenta). */
export const EXAMPLES: Record<ExampleId, HashState> = {
  // Os ângulos lidos no tutorial no passo 3 e o período da Figura 13 (ano todo, 9 h às 15 h
  // solares) no dimensionamento do passo 6; janela de 2,00 × 1,00 m com o vidro recuado 15 cm.
  // As curvas do recuo ficam ocultas (cs=0): o assunto é o período.
  angulos: {
    local: 'brasilia',
    o: '30',
    a1: '55',
    gd1: '50',
    ge1: '60',
    jl: '2',
    ja: '1',
    jr: '0,15',
    cs: '0',
    dpi: '1/1',
    dpf: '31/12',
    dhi: '9',
    dhf: '15',
  },
  // O brise da Figura 22: 1,28 m na verga, prolongamentos de 1,70 m à esquerda e 1,20 m à direita.
  recuo: {
    local: 'brasilia',
    o: '30',
    a1: '55',
    gd1: '50',
    ge1: '60',
    jl: '2',
    ja: '1',
    jr: '0,15',
    pc1: 'b_1,28___1,7_1,2',
  },
  // O brise afastado da Figura 26: 1,00 m na altura da verga, a 28 cm da parede, com α2 = 20°.
  afastado: {
    local: 'brasilia',
    o: '30',
    a1: '55',
    a2: '20',
    gd1: '50',
    ge1: '60',
    jl: '2',
    ja: '1',
    jr: '0,15',
    pc1: 'b_1_0_0,28_1,7_1,2',
  },
};

/** Link relativo que abre o exemplo com o cartão de acompanhamento (chave exemplo). */
export const exampleHref = (id: ExampleId) => `./${buildHash({ ...EXAMPLES[id], exemplo: id })}`;

export function exampleFromHash(state: HashState): ExampleId | null {
  const value = state.exemplo;
  return (EXAMPLE_IDS as readonly string[]).includes(value ?? '') ? (value as ExampleId) : null;
}

export interface HelpItem {
  title: string;
  text: string;
}

export interface HelpExample {
  title: string;
  /** O que o exemplo pergunta, em uma ou duas frases. */
  problem: string;
  /** O que fazer e observar na tela, na ordem. */
  steps: string[];
  lesson: string;
}

export interface HelpTerm {
  term: string;
  definition: string;
}

export interface HelpQuestion {
  question: string;
  answer: string;
}

export interface HelpContent {
  /** Tutorial guiado (F4.5): uma etapa para cada uma de TUTORIAL_STEPS, na mesma ordem. */
  tutorial: { title: string; intro: string; steps: HelpItem[] };
  /** Exercícios de máscara (F4.5). */
  exercises: {
    intro: string;
    howTo: string[];
    metric: string;
    items: Record<ExerciseId, { title: string; statement: string }>;
  };
  guide: {
    intro: string;
    steps: HelpItem[];
    advanced: HelpItem[];
    tabs: HelpItem[];
    tips: string[];
  };
  examples: {
    intro: string;
    items: Record<ExampleId, HelpExample>;
    source: string;
  };
  glossary: { title: string; terms: HelpTerm[] }[];
  faq: HelpQuestion[];
  hypotheses: { intro: string; groups: { title: string; items: string[] }[] };
}
