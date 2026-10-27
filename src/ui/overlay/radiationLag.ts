import type { EpwData } from '../../core/epw/hourly';
import { radiationLag } from '../../core/epw/radiationTiming';

const cache = new WeakMap<EpwData, number | null>();

/** Tempo da radiação do arquivo (spec 04, seção 4.3), calculado uma vez por arquivo. */
export function fileRadiationLag(epw: EpwData): number | null {
  if (!cache.has(epw)) cache.set(epw, radiationLag(epw));
  return cache.get(epw) ?? null;
}
