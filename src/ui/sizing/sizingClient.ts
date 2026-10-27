/** Dimensionamento pelo período (F3.6) num web worker, com cache. */
import { useQueued } from '../workers/useQueued';
import { workerQueue } from '../workers/workerQueue';
import { computeSizing, sizingKey, type SizingInput, type SizingResult } from './sizingCompute';

export const sizingQueue = workerQueue<SizingInput, SizingResult>({
  key: sizingKey,
  // O Vite empacota o worker com caminho relativo (base './'): o build continua portátil.
  create: () => new Worker(new URL('./sizing.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeSizing,
  maxEntries: 8,
});

export function useSizing(input: SizingInput | null) {
  return useQueued(sizingQueue, input);
}
