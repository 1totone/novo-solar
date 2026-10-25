/// <reference lib="webworker" />
/**
 * Células da sobreposição calculadas fora da linha principal (achado 9 da revisão do F2.9): cerca de
 * 8400 posições do sol por semestre, que travavam a página por 0,6 a 1 s num celular médio.
 */
import { overlayCells } from '../../core/overlay/overlay';
import type { CellsRequest, CellsResponse } from './cellsClient';

self.onmessage = (event: MessageEvent<CellsRequest>) => {
  const { id, site, semester, timing } = event.data;
  const response: CellsResponse = { id, cells: overlayCells(site, semester, timing) };
  self.postMessage(response);
};
