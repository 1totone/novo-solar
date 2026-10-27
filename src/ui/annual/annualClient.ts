/**
 * Fração ensolarada hora a hora do ano (F3.3) num web worker, com cache por local e geometria.
 */
import type { HourlyShading } from '../../core/shading/hourly';
import { useQueued } from '../workers/useQueued';
import { workerQueue } from '../workers/workerQueue';
import { annualKey, annualShading, type AnnualInput } from './annualCompute';

export const annualQueue = workerQueue<AnnualInput, HourlyShading>({
  key: annualKey,
  // O Vite empacota o worker com caminho relativo (base './'): o build continua portátil.
  create: () => new Worker(new URL('./annual.worker.ts', import.meta.url), { type: 'module' }),
  compute: annualShading,
  maxEntries: 8,
});

/** Fração ensolarada do ano para a entrada (null enquanto calcula ou sem entrada). */
export function useAnnualShading(input: AnnualInput | null) {
  return useQueued(annualQueue, input);
}
