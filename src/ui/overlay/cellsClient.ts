/**
 * Células da sobreposição com cache por local e cálculo num web worker (achado 9 da revisão do F2.9).
 *
 * As células só dependem do local (latitude, longitude, elevação, fuso), do semestre e da convenção
 * de tempo, e não do arquivo: outro arquivo do mesmo local reaproveita o cálculo. Sem suporte a
 * workers (testes de unidade, navegadores antigos), o cálculo roda na linha principal.
 */
import type { Site } from '../../core/chart/sunChart';
import {
  overlayCells,
  type OverlayCell,
  type OverlayTiming,
  type Semester,
} from '../../core/overlay/overlay';

export interface CellsRequest {
  id: number;
  site: Site;
  semester: Semester;
  timing: OverlayTiming;
}

export interface CellsResponse {
  id: number;
  cells: OverlayCell[];
}

/** Locais guardados (cada um com até 4 combinações de semestre e convenção de tempo). */
const MAX_ENTRIES = 32;
const cache = new Map<string, Promise<OverlayCell[]>>();
const ready = new Map<string, OverlayCell[]>();

export function cellsKey(site: Site, semester: Semester, timing: OverlayTiming): string {
  return [site.latitude, site.longitude, site.elevation, site.timeZone, semester, timing].join('|');
}

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, (cells: OverlayCell[]) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    // O Vite empacota o worker com caminho relativo (base './'): o build continua portátil.
    worker = new Worker(new URL('./cells.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<CellsResponse>) => {
      pending.get(event.data.id)?.(event.data.cells);
      pending.delete(event.data.id);
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Células já calculadas, sem esperar (null se ainda não estão prontas). */
export function peekCells(
  site: Site,
  semester: Semester,
  timing: OverlayTiming,
): OverlayCell[] | null {
  return ready.get(cellsKey(site, semester, timing)) ?? null;
}

/** Células do local, do cache ou calculadas no worker. */
export function requestCells(
  site: Site,
  semester: Semester,
  timing: OverlayTiming,
): Promise<OverlayCell[]> {
  const key = cellsKey(site, semester, timing);
  const hit = cache.get(key);
  if (hit) {
    // Mais recente no fim: a mais antiga sai primeiro quando o cache enche.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const w = typeof Worker === 'undefined' ? null : getWorker();
  const promise = w
    ? new Promise<OverlayCell[]>((resolve) => {
        const id = nextId++;
        pending.set(id, resolve);
        const request: CellsRequest = { id, site, semester, timing };
        w.postMessage(request);
      })
    : Promise.resolve(overlayCells(site, semester, timing));
  cache.set(key, promise);
  void promise.then((cells) => ready.set(key, cells));
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value!;
    cache.delete(oldest);
    ready.delete(oldest);
  }
  return promise;
}
