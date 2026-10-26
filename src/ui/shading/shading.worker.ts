/// <reference lib="webworker" />
/**
 * Curvas de percentual e região de sombra total (F3.2) calculadas fora da linha principal: cerca de
 * 22 mil percentuais sombreados na grade do disco da fachada, mais a bisseção de cada curva.
 */
import { shadingChart } from '../../core/shading/contours';
import { buildScene } from '../../core/shading/geometry';
import type { ShadingRequest, ShadingResponse } from './shadingClient';

self.onmessage = (event: MessageEvent<ShadingRequest>) => {
  const { id, window, devices, orientation } = event.data;
  let chart: ShadingResponse['chart'];
  try {
    chart = shadingChart(buildScene(window, devices), orientation);
  } catch {
    // A carta avisa que não foi possível calcular; a fila do cliente continua andando.
    chart = null;
  }
  const response: ShadingResponse = { id, chart };
  self.postMessage(response);
};
