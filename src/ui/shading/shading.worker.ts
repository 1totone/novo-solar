/**
 * Curvas de percentual e região de sombra total (F3.2) calculadas fora da linha principal: cerca de
 * 22 mil percentuais sombreados na grade do disco da fachada, mais a bisseção de cada curva.
 */
import { shadingChart } from '../../core/shading/contours';
import { buildScene } from '../../core/shading/geometry';
import { serveWorker } from '../workers/workerQueue';
import type { ShadingInput } from './shadingClient';

serveWorker((input: ShadingInput) =>
  shadingChart(buildScene(input.window, input.devices), input.orientation),
);
