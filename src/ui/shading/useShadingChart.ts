import type { ShadingChart } from '../../core/shading/contours';
import { useQueued } from '../workers/useQueued';
import { shadingQueue, type ShadingInput } from './shadingClient';

/**
 * Curvas e região de sombra total da geometria, calculadas no worker. Enquanto a geometria nova
 * não chega, `stale` traz o último resultado (a carta o mostra esmaecido) e `pending` fica
 * verdadeiro; `failed` diz que o cálculo desta geometria falhou.
 */
export function useShadingChart(input: ShadingInput | null): {
  chart: ShadingChart | null;
  stale: ShadingChart | null;
  pending: boolean;
  failed: boolean;
} {
  const { result, ...rest } = useQueued(shadingQueue, input);
  return { chart: result, ...rest };
}
