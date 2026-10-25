import { useEffect, useState } from 'react';
import type { ShadingChart } from '../../core/shading/contours';
import { peekShading, requestShading, shadingKey, type ShadingInput } from './shadingClient';

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
  const key = input ? shadingKey(input) : null;
  const [loaded, setLoaded] = useState<{ key: string; chart: ShadingChart | null } | null>(null);
  useEffect(() => {
    if (!input || key === null) return;
    const request = requestShading(input);
    let alive = true;
    void request.promise.then((chart) => {
      if (alive) setLoaded({ key, chart });
    });
    return () => {
      alive = false;
      request.cancel();
    };
    // `input` é recriado a cada render; a chave já o representa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // O resultado desta chave: do cache ou, se o cache já o descartou, o que chegou por último.
  const own = key !== null && loaded?.key === key ? loaded : null;
  const chart = key === null ? null : (peekShading(key) ?? own?.chart ?? null);
  const failed = chart === null && own !== null;
  const pending = key !== null && chart === null && !failed;
  return { chart, stale: pending ? (loaded?.chart ?? null) : null, pending, failed };
}
