/**
 * Fila de cálculos num web worker, com cache por chave (F3.2 e F3.3; o mesmo padrão das células da
 * sobreposição, achado 9 do F2.9).
 *
 * Um pedido por vez no worker; os outros esperam na fila, e o pedido que ninguém mais espera (a
 * entrada mudou de novo) sai dela antes de começar. Sem suporte a workers (testes de unidade,
 * navegadores antigos), ou se o worker não carregar ou quebrar, o cálculo roda na linha principal.
 * Um cálculo que falha devolve null e não entra no cache.
 */

export interface WorkerRequest<I> {
  id: number;
  input: I;
}

export interface WorkerResponse<O> {
  id: number;
  /** Null se o cálculo falhou. */
  result: O | null;
}

export interface WorkerQueue<I, O> {
  key: (input: I) => string;
  /** Resultado já calculado, sem esperar (null se ainda não está pronto). */
  peek: (key: string) => O | null;
  /**
   * Pede o cálculo. A promessa resolve com o resultado (null se falhou); `cancel` desiste de
   * esperar (um cálculo já começado termina e vai para o cache).
   */
  request: (input: I) => { promise: Promise<O | null>; cancel: () => void };
}

interface Job<I, O> {
  key: string;
  input: I;
  waiters: Set<(result: O | null) => void>;
}

export function workerQueue<I, O>(options: {
  key: (input: I) => string;
  /** Cria o worker: `new Worker(new URL('./x.worker.ts', import.meta.url), ...)`, para o Vite. */
  create: () => Worker;
  /** O mesmo cálculo do worker, para a linha principal. */
  compute: (input: I) => O;
  /** Resultados guardados (os mais antigos saem primeiro). */
  maxEntries: number;
}): WorkerQueue<I, O> {
  const ready = new Map<string, O>();
  let worker: Worker | null | undefined;
  let nextId = 1;
  let running: (Job<I, O> & { id: number }) | null = null;
  const queue: Job<I, O>[] = [];

  const store = (key: string, result: O) => {
    ready.delete(key);
    ready.set(key, result);
    while (ready.size > options.maxEntries) ready.delete(ready.keys().next().value!);
  };
  const computeHere = (input: I): O | null => {
    try {
      return options.compute(input);
    } catch {
      return null;
    }
  };
  const finish = (job: Job<I, O>, result: O | null) => {
    if (result !== null) store(job.key, result);
    for (const resolve of job.waiters) resolve(result);
  };
  const startNext = () => {
    const job = queue.shift();
    if (!job || !worker) return;
    const id = nextId++;
    running = { ...job, id };
    const request: WorkerRequest<I> = { id, input: job.input };
    worker.postMessage(request);
  };
  const getWorker = (): Worker | null => {
    if (worker !== undefined) return worker;
    if (typeof Worker === 'undefined') return (worker = null);
    try {
      const w = options.create();
      w.onmessage = (event: MessageEvent<WorkerResponse<O>>) => {
        const job = running;
        if (!job || job.id !== event.data.id) return;
        running = null;
        finish(job, event.data.result);
        startNext();
      };
      // Worker que não carrega ou que quebra: os pedidos pendentes e os próximos são calculados
      // na linha principal, em vez de esperar para sempre.
      w.onerror = () => {
        w.terminate();
        worker = null;
        const pending = [...(running ? [running] : []), ...queue.splice(0)];
        running = null;
        for (const job of pending) finish(job, computeHere(job.input));
      };
      worker = w;
    } catch {
      worker = null;
    }
    return worker;
  };

  return {
    key: options.key,
    peek: (key) => ready.get(key) ?? null,
    request: (input) => {
      const key = options.key(input);
      const hit = ready.get(key);
      if (hit !== undefined) {
        store(key, hit);
        return { promise: Promise.resolve(hit), cancel: () => {} };
      }
      if (!getWorker()) {
        const result = computeHere(input);
        if (result !== null) store(key, result);
        return { promise: Promise.resolve(result), cancel: () => {} };
      }
      let job = running?.key === key ? running : queue.find((j) => j.key === key);
      if (!job) {
        job = { key, input, waiters: new Set() };
        queue.push(job);
      }
      let resolve!: (result: O | null) => void;
      const promise = new Promise<O | null>((r) => (resolve = r));
      job.waiters.add(resolve);
      if (!running) startNext();
      const target = job;
      return {
        promise,
        cancel: () => {
          target.waiters.delete(resolve);
          const i = queue.indexOf(target);
          if (i >= 0 && target.waiters.size === 0) queue.splice(i, 1);
        },
      };
    },
  };
}

/** Escopo global do worker, só com o que serveWorker usa (sem depender da lib "webworker"). */
interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown) => void;
}

/** Lado do worker: responde cada pedido com o cálculo (null se ele lançar um erro). */
export function serveWorker<I, O>(compute: (input: I) => O) {
  const scope = globalThis as unknown as WorkerScope;
  scope.onmessage = (event: MessageEvent) => {
    const { id, input } = event.data as WorkerRequest<I>;
    let result: O | null;
    try {
      result = compute(input);
    } catch {
      result = null;
    }
    const response: WorkerResponse<O> = { id, result };
    scope.postMessage(response);
  };
}
