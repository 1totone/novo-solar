/**
 * Curvas de percentual e região de sombra total da proteção pelas dimensões (F3.2), calculadas num
 * web worker com cache.
 *
 * O cálculo depende só da janela, das peças e da orientação da fachada (não do local nem do
 * arquivo) e leva de 0,2 a 0,6 s num computador (mais num celular): fica fora da linha principal.
 * Os pedidos esperam numa fila; o pedido que ninguém mais espera (a geometria mudou de novo) sai da
 * fila antes de começar. Sem suporte a workers (testes de unidade, navegadores antigos), o cálculo
 * roda na linha principal.
 */
import { shadingChart, type ShadingChart } from '../../core/shading/contours';
import { buildScene, type Device, type WindowGeometry } from '../../core/shading/geometry';

export interface ShadingInput {
  window: WindowGeometry;
  devices: readonly Device[];
  orientation: number;
}

export interface ShadingRequest extends ShadingInput {
  id: number;
}

export interface ShadingResponse {
  id: number;
  /** Null se o cálculo falhou. */
  chart: ShadingChart | null;
}

/** Geometrias guardadas. */
const MAX_ENTRIES = 16;
const ready = new Map<string, ShadingChart>();

/** Chave do cálculo; prolongamento infinito vira "inf" (o JSON não tem Infinity). */
export function shadingKey(input: ShadingInput): string {
  return JSON.stringify([input.window, input.devices, input.orientation], (_k, v: unknown) =>
    v === Infinity ? 'inf' : v,
  );
}

/** Resultado já calculado, sem esperar (null se ainda não está pronto). */
export function peekShading(key: string): ShadingChart | null {
  return ready.get(key) ?? null;
}

/** Cálculo na linha principal (o worker faz o mesmo, em shading.worker.ts); null se falhar. */
function computeShading(input: ShadingInput): ShadingChart | null {
  try {
    return shadingChart(buildScene(input.window, input.devices), input.orientation);
  } catch {
    return null;
  }
}

function store(key: string, chart: ShadingChart) {
  ready.delete(key);
  ready.set(key, chart);
  while (ready.size > MAX_ENTRIES) ready.delete(ready.keys().next().value!);
}

interface Job {
  key: string;
  input: ShadingInput;
  waiters: Set<(chart: ShadingChart | null) => void>;
}

let worker: Worker | null | undefined;
let nextId = 1;
let running: (Job & { id: number }) | null = null;
const queue: Job[] = [];

function finish(job: Job, chart: ShadingChart | null) {
  if (chart) store(job.key, chart);
  for (const resolve of job.waiters) resolve(chart);
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  if (typeof Worker === 'undefined') return (worker = null);
  try {
    // O Vite empacota o worker com caminho relativo (base './'): o build continua portátil.
    const w = new Worker(new URL('./shading.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (event: MessageEvent<ShadingResponse>) => {
      const job = running;
      if (!job || job.id !== event.data.id) return;
      running = null;
      finish(job, event.data.chart);
      startNext();
    };
    // Worker que não carrega ou que quebra: os pedidos pendentes e os próximos são calculados na
    // linha principal, em vez de esperar para sempre.
    w.onerror = () => {
      w.terminate();
      worker = null;
      const pending = [...(running ? [running] : []), ...queue.splice(0)];
      running = null;
      for (const job of pending) finish(job, computeShading(job.input));
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

function startNext() {
  const job = queue.shift();
  if (!job || !worker) return;
  const id = nextId++;
  running = { ...job, id };
  const request: ShadingRequest = { id, ...job.input, devices: [...job.input.devices] };
  worker.postMessage(request);
}

/**
 * Pede o cálculo. A promessa resolve com o resultado (null se o cálculo falhou); `cancel` desiste
 * de esperar (o pedido sai da fila se ninguém mais o espera; um cálculo já começado termina e vai
 * para o cache).
 */
export function requestShading(input: ShadingInput): {
  promise: Promise<ShadingChart | null>;
  cancel: () => void;
} {
  const key = shadingKey(input);
  const hit = ready.get(key);
  if (hit) {
    store(key, hit);
    return { promise: Promise.resolve(hit), cancel: () => {} };
  }
  const w = getWorker();
  if (!w) {
    const chart = computeShading(input);
    if (chart) store(key, chart);
    return { promise: Promise.resolve(chart), cancel: () => {} };
  }
  let job: Job | undefined = running?.key === key ? running : queue.find((j) => j.key === key);
  if (!job) {
    job = { key, input, waiters: new Set() };
    queue.push(job);
  }
  let resolve!: (chart: ShadingChart | null) => void;
  const promise = new Promise<ShadingChart | null>((r) => (resolve = r));
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
}
