/**
 * Curvas de percentual e região de sombra total da proteção pelas dimensões (F3.2), calculadas num
 * web worker com cache (workerQueue).
 *
 * O cálculo depende só da janela, das peças e da orientação da fachada (não do local nem do
 * arquivo) e leva de 0,2 a 0,6 s num computador (mais num celular): fica fora da linha principal.
 */
import { shadingChart, type ShadingChart } from '../../core/shading/contours';
import { buildScene, type Device, type WindowGeometry } from '../../core/shading/geometry';
import { workerQueue } from '../workers/workerQueue';

export interface ShadingInput {
  window: WindowGeometry;
  devices: readonly Device[];
  orientation: number;
}

/** Chave do cálculo; prolongamento infinito vira "inf" (o JSON não tem Infinity). */
export function shadingKey(input: ShadingInput): string {
  return JSON.stringify([input.window, input.devices, input.orientation], (_k, v: unknown) =>
    v === Infinity ? 'inf' : v,
  );
}

/** O cálculo (o mesmo no worker, em shading.worker.ts, e na linha principal). */
export function computeShading(input: ShadingInput): ShadingChart {
  return shadingChart(buildScene(input.window, input.devices), input.orientation);
}

export const shadingQueue = workerQueue<ShadingInput, ShadingChart>({
  key: shadingKey,
  // O Vite empacota o worker com caminho relativo (base './'): o build continua portátil.
  create: () => new Worker(new URL('./shading.worker.ts', import.meta.url), { type: 'module' }),
  compute: computeShading,
  maxEntries: 16,
});

export const peekShading = (key: string) => shadingQueue.peek(key);
export const requestShading = (input: ShadingInput) => shadingQueue.request(input);
