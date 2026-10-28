/**
 * Fração ensolarada hora a hora do ano (F3.3): o cálculo que roda no worker (annual.worker.ts) ou,
 * sem ele, na linha principal.
 *
 * As 52 560 posições do sol do ano (6 por hora) só dependem do local e levam quase 1 s num
 * computador: ficam guardadas por local; a sombra é refeita para cada geometria (cerca de 0,1 s).
 */
import type { Site } from '../../core/chart/sunChart';
import { buildScene, type Device, type WindowGeometry } from '../../core/shading/geometry';
import {
  hourlyShading,
  sunSamples,
  type HourlyShading,
  type SunSamples,
} from '../../core/shading/hourly';

export interface AnnualInput {
  site: Site;
  window: WindowGeometry;
  devices: readonly Device[];
  orientation: number;
}

/** Locais com as posições do sol guardadas. */
const MAX_SITES = 4;
const samplesBySite = new Map<string, SunSamples>();

export const siteKey = (site: Site) =>
  [site.latitude, site.longitude, site.elevation, site.timeZone].join('|');

/** Chave do cálculo; prolongamento infinito vira "inf" (o JSON não tem Infinity). */
export function annualKey(input: AnnualInput): string {
  return JSON.stringify(
    [siteKey(input.site), input.window, input.devices, input.orientation],
    (_k, v: unknown) => (v === Infinity ? 'inf' : v),
  );
}

export function annualShading(input: AnnualInput): HourlyShading {
  const k = siteKey(input.site);
  let samples = samplesBySite.get(k);
  if (!samples) {
    const { latitude, longitude, elevation, timeZone } = input.site;
    samples = sunSamples({ latitude, longitude, elevation, timeZone });
    samplesBySite.set(k, samples);
    while (samplesBySite.size > MAX_SITES) {
      samplesBySite.delete(samplesBySite.keys().next().value!);
    }
  }
  return hourlyShading(samples, buildScene(input.window, input.devices), input.orientation);
}
