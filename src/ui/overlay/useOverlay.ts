import { useEffect, useMemo, useState } from 'react';
import type { EpwData } from '../../core/epw/parseEpw';
import type { Site } from '../../core/chart/sunChart';
import {
  cellStatistics,
  filePercentiles,
  OVERLAY_QUANTITIES,
  type OverlayCell,
  type OverlayQuantity,
} from '../../core/overlay/overlay';
import type { HashState } from '../state/hashState';
import { overlayFromHash, QUANTITY_OF } from '../state/overlayHash';
import { cellsKey, peekCells, requestCells } from './cellsClient';
import { FREQUENCY_COLORS, FREQUENCY_LIMITS, QUANTITY_COLORS } from './palettes';

/** Casas decimais de cada grandeza na interface. */
export const DIGITS: Record<OverlayQuantity, number> = {
  dryBulb: 1,
  relativeHumidity: 0,
  globalHorizontal: 0,
  directNormal: 0,
  diffuseHorizontal: 0,
};

const round = (v: number, digits: number) => Math.round(v * 10 ** digits) / 10 ** digits;

// Cache por arquivo das estatísticas e faixas (as células têm cache por local, em cellsClient).
const cache = new WeakMap<EpwData, Map<string, unknown>>();
function cached<T>(epw: EpwData, key: string, compute: () => T): T {
  let m = cache.get(epw);
  if (!m) {
    m = new Map();
    cache.set(epw, m);
  }
  if (!m.has(key)) m.set(key, compute());
  return m.get(key) as T;
}

/**
 * Estado e cálculos da sobreposição: células (por semestre e convenção de tempo), estatísticas
 * (por grandeza e limiar) e faixas. Cada cálculo só refaz quando muda o que ele usa.
 */
export function useOverlay(epw: EpwData | null, hash: HashState) {
  const overlay = overlayFromHash(hash);
  const quantity = overlay.key ? QUANTITY_OF[overlay.key] : undefined;
  const info = quantity ? OVERLAY_QUANTITIES[quantity] : undefined;
  const timing = info?.timing;
  const semester = overlay.semester;
  const threshold = overlay.mode === 'frequency' ? overlay.threshold : undefined;
  const bandSource = overlay.bands.source;

  // Células do local, calculadas num web worker; enquanto não chegam, `pending` fica verdadeiro.
  const site: Site | null = epw
    ? {
        latitude: epw.location.latitude,
        longitude: epw.location.longitude,
        elevation: epw.location.elevation,
        timeZone: epw.location.timeZone,
      }
    : null;
  const key = site && timing ? cellsKey(site, semester, timing) : null;
  const [loaded, setLoaded] = useState<{ key: string; cells: OverlayCell[] } | null>(null);
  useEffect(() => {
    if (!site || !timing || !key) return;
    // Já no cache: a renderização usa peekCells, sem outra renderização ao resolver a promessa.
    if (peekCells(site, semester, timing)) return;
    let alive = true;
    void requestCells(site, semester, timing).then((cells) => {
      if (alive) setLoaded({ key, cells });
    });
    return () => {
      alive = false;
    };
    // `site` é recriado a cada render; a chave já o representa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const cells =
    key === null ? null : loaded?.key === key ? loaded.cells : peekCells(site!, semester, timing!);

  const stats = useMemo(
    () =>
      epw && quantity
        ? cached(epw, `stats:${quantity}:${threshold}`, () =>
            cellStatistics(epw, quantity, threshold),
          )
        : null,
    [epw, quantity, threshold],
  );

  const fileLimits = useMemo(() => {
    if (!epw || !quantity || !timing || bandSource !== 'file') return null;
    return cached(epw, `percentiles:${quantity}`, () =>
      filePercentiles(epw, quantity, timing, [20, 40, 60, 80]).map((v) =>
        round(v, DIGITS[quantity]),
      ),
    );
  }, [epw, quantity, timing, bandSource]);

  let quantityLimits: readonly number[] | null = null;
  if (quantity) {
    if (overlay.bands.source === 'custom') quantityLimits = overlay.bands.limits;
    else if (overlay.bands.source === 'file') quantityLimits = fileLimits;
    else quantityLimits = OVERLAY_QUANTITIES[quantity].bands;
  }
  const frequency = overlay.mode === 'frequency';
  return {
    overlay,
    quantity,
    /** Células ainda em cálculo (o painel mostra "calculando"). */
    pending: key !== null && cells === null,
    unit: info?.unit ?? '',
    cells,
    stats,
    /** Limites das faixas da grandeza (editáveis no painel). */
    quantityLimits,
    /** Limites e cores efetivamente usados nas células. */
    limits: frequency ? FREQUENCY_LIMITS : quantityLimits,
    colors: frequency ? FREQUENCY_COLORS : quantity ? QUANTITY_COLORS[quantity] : [],
  };
}
