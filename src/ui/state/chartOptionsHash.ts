import type { ProjectionKind } from '../../core/chart/projection';
import type { HashState } from './hashState';

/**
 * Opções da carta (F4.3, decisão 0025) no '#' da URL: proj (eq equidistante, cil cilíndrica; em
 * branco, estereográfica) e hl (l hora legal, a as duas; em branco, hora solar verdadeira).
 */
export type HourLinesMode = 'solar' | 'legal' | 'both';

export interface ChartOptions {
  projection: ProjectionKind;
  hourLines: HourLinesMode;
}

export function chartOptionsFromHash(state: HashState): ChartOptions {
  return {
    projection:
      state.proj === 'eq' ? 'equidistant' : state.proj === 'cil' ? 'cylindrical' : 'stereographic',
    hourLines: state.hl === 'l' ? 'legal' : state.hl === 'a' ? 'both' : 'solar',
  };
}

export const projectionPatch = (kind: ProjectionKind): HashState => ({
  proj: kind === 'equidistant' ? 'eq' : kind === 'cylindrical' ? 'cil' : '',
});

export const hourLinesPatch = (mode: HourLinesMode): HashState => ({
  hl: mode === 'legal' ? 'l' : mode === 'both' ? 'a' : '',
});
