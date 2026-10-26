import { useEffect, useState } from 'react';
import type { WorkerQueue } from './workerQueue';

/**
 * Resultado de um cálculo da fila do worker para a entrada atual. Enquanto ele não chega, `stale`
 * traz o último resultado recebido (de outra entrada) e `pending` fica verdadeiro; `failed` diz
 * que o cálculo desta entrada falhou.
 */
export function useQueued<I, O>(
  queue: WorkerQueue<I, O>,
  input: I | null,
): { result: O | null; stale: O | null; pending: boolean; failed: boolean } {
  const key = input === null ? null : queue.key(input);
  const [loaded, setLoaded] = useState<{ key: string; result: O | null } | null>(null);
  useEffect(() => {
    if (input === null || key === null) return;
    const request = queue.request(input);
    let alive = true;
    void request.promise.then((result) => {
      if (alive) setLoaded({ key, result });
    });
    return () => {
      alive = false;
      request.cancel();
    };
    // `input` é recriado a cada render; a chave já o representa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, queue]);
  // O resultado desta chave: do cache ou, se o cache já o descartou, o que chegou por último.
  const own = key !== null && loaded?.key === key ? loaded : null;
  const result = key === null ? null : (queue.peek(key) ?? own?.result ?? null);
  const failed = result === null && own !== null;
  const pending = key !== null && result === null && !failed;
  return { result, stale: pending ? (loaded?.result ?? null) : null, pending, failed };
}

/**
 * Resultados da fila para várias entradas ao mesmo tempo (as alternativas do F3.5), na ordem das
 * entradas; null onde ainda não chegou ou falhou.
 */
export function useQueuedAll<I, O>(
  queue: WorkerQueue<I, O>,
  inputs: readonly I[],
): { results: (O | null)[]; pending: boolean } {
  const keys = inputs.map(queue.key);
  const joined = keys.join('\n');
  const [loaded, setLoaded] = useState<ReadonlyMap<string, O | null>>(new Map());
  useEffect(() => {
    const requests = inputs.map((input, i) => ({ key: keys[i]!, request: queue.request(input) }));
    let alive = true;
    for (const { key, request } of requests) {
      void request.promise.then((result) => {
        if (alive) setLoaded((m) => new Map(m).set(key, result));
      });
    }
    return () => {
      alive = false;
      for (const { request } of requests) request.cancel();
    };
    // As entradas são recriadas a cada render; as chaves já as representam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, queue]);
  const results = keys.map((k) => queue.peek(k) ?? loaded.get(k) ?? null);
  return { results, pending: keys.some((k) => !queue.peek(k) && !loaded.has(k)) };
}
