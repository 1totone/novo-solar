/** Conferência do exercício de máscara (F4.5) fora da linha principal: posições do sol do ano. */
import { serveWorker } from '../workers/workerQueue';
import { computeExercise } from './exerciseCompute';

serveWorker(computeExercise);
