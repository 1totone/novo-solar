import type { Site } from '../../core/chart/sunChart';
import type { GeometryState } from '../state/geometryHash';
import type { SizingState } from '../state/sizingHash';
import type { SizingInput } from './sizingCompute';

/** Entrada do dimensionamento (a mesma no passo 6 e na carta, para o cache servir aos dois). */
export function sizingInput(
  site: Site,
  orientation: number,
  geometry: GeometryState,
  sizing: SizingState,
): SizingInput | null {
  const win = geometry.window;
  if (!sizing.period || !win) return null;
  const { latitude, longitude, elevation, timeZone } = site;
  return {
    site: { latitude, longitude, elevation, timeZone },
    orientation,
    period: sizing.period,
    window: { width: win.width, height: win.height, setback: win.setback ?? 0 },
    gap: sizing.gap,
    count: sizing.count,
  };
}
