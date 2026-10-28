import { shadingRegion, type Region } from '../../core/mask/mask';
import type { AngleReference, ProtractorAngles } from '../../core/protractor/protractor';
import { buildHash, type HashState } from '../state/hashState';

/**
 * Exercícios de máscara (F4.5, spec 12, seção 12.2): o aluno desenha à mão a sombra total de uma
 * proteção dada pelos ângulos, e a aplicação compara com a calculada (seção 12.3). O link do
 * exercício traz o local e a fachada, mas não os ângulos, para que a carta não mostre a resposta.
 * Os enunciados ficam na ajuda de cada idioma (HelpContent.exercises).
 */
export const EXERCISE_IDS = ['brise', 'brise-gama', 'aletas', 'grelha'] as const;
export type ExerciseId = (typeof EXERCISE_IDS)[number];

export interface Exercise {
  /** Local e orientação, como no link. */
  state: HashState;
  orientation: number;
  reference: AngleReference;
  /** Ângulos da sombra total (a resposta). */
  angles: ProtractorAngles;
}

export const EXERCISES: Record<ExerciseId, Exercise> = {
  brise: {
    state: { local: 'florianopolis', o: '0' },
    orientation: 0,
    reference: 'internal',
    angles: { alpha: [45] },
  },
  'brise-gama': {
    state: { local: 'florianopolis', o: '0' },
    orientation: 0,
    reference: 'internal',
    angles: { alpha: [40], gammaRight: [40], gammaLeft: [40] },
  },
  aletas: {
    state: { local: 'florianopolis', o: '270' },
    orientation: 270,
    reference: 'internal',
    angles: { betaRight: [30], betaLeft: [30] },
  },
  grelha: {
    state: { local: 'brasilia', o: '30' },
    orientation: 30,
    reference: 'internal',
    angles: { alpha: [50], betaRight: [30], betaLeft: [30] },
  },
};

export function exerciseFromHash(state: HashState): ExerciseId | null {
  const value = state.exercicio;
  return (EXERCISE_IDS as readonly string[]).includes(value ?? '') ? (value as ExerciseId) : null;
}

/** Link relativo que abre o exercício (o resto do link vazio). */
export const exerciseHref = (id: ExerciseId) =>
  `./${buildHash({ ...EXERCISES[id].state, exercicio: id })}`;

/** Região de sombra total calculada do exercício (a resposta). */
export const answerRegion = (id: ExerciseId): Region => {
  const e = EXERCISES[id];
  return shadingRegion(e.orientation, e.reference, e.angles);
};
