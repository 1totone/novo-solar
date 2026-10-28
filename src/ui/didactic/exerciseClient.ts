/** Conferência do exercício de máscara (F4.5) num web worker, com cache. */
import { useQueued } from '../workers/useQueued';
import { workerQueue } from '../workers/workerQueue';
import {
  computeExercise,
  exerciseKey,
  type ExerciseInput,
  type ExerciseResult,
} from './exerciseCompute';

export const exerciseQueue = workerQueue<ExerciseInput, ExerciseResult>({
  key: exerciseKey,
  // O Vite empacota o worker com caminho relativo (base './'): o build continua portátil.
  create: () => new Worker(new URL('./exercise.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeExercise,
  maxEntries: 8,
});

export function useExercise(input: ExerciseInput | null) {
  return useQueued(exerciseQueue, input);
}
