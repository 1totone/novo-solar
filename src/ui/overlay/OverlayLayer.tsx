import { useId, useMemo } from 'react';
import { projectRing } from '../../core/chart/projection';
import { project } from '../../core/chart/stereographic';
import { bandIndex, cellKey, type CellStats, type OverlayCell } from '../../core/overlay/overlay';
import { ChartClip } from '../chart/ChartClip';
import { pathD, useChartProjection } from '../chart/projectionContext';

export interface CellView {
  cell: OverlayCell;
  stats?: CellStats;
}

/** Células coloridas na carta, sob a grade, recortadas no horizonte. */
export function OverlayLayer({
  cells,
  stats,
  limits,
  colors,
  mode,
  onHover,
}: {
  cells: OverlayCell[];
  stats: Map<string, CellStats>;
  /** Limites das faixas (4 valores); no modo de frequência, frações de 0 a 1. */
  limits: readonly number[];
  colors: readonly string[];
  mode: 'mean' | 'frequency';
  onHover: (view: CellView | null) => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `overlay-horizon${uid}`;
  const projection = useChartProjection();
  // Fora da estereográfica (F4.3), cada célula vira um caminho com as cópias da costura.
  const shapes = useMemo(
    () =>
      projection.kind === 'stereographic'
        ? null
        : new Map(cells.map((c) => [c, pathD(projectRing(projection, c.polygon), true)])),
    // A projeção é descrita pelo tipo e pelo centro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cells, projection.kind, projection.center],
  );
  const noDataId = `overlay-no-data${uid}`;
  return (
    <g className="overlay" data-testid="overlay" onPointerLeave={() => onHover(null)}>
      <defs>
        <ChartClip id={clipId} />
        <pattern
          id={noDataId}
          patternUnits="userSpaceOnUse"
          width={0.03}
          height={0.03}
          patternTransform="rotate(45)"
        >
          <rect x={0} y={0} width={0.008} height={0.03} className="no-data-line" />
        </pattern>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {cells.map((cell) => {
          const s = stats.get(cellKey(cell.period, cell.hour));
          const value = s ? (mode === 'frequency' ? s.above : s.mean) : undefined;
          const band = value === undefined ? undefined : bandIndex(value, limits);
          const common = {
            className: band === undefined ? 'cell no-data' : 'cell',
            style: { fill: band === undefined ? `url(#${noDataId})` : colors[band] },
            'data-cell': `${cell.period}-${cell.hour}`,
            'data-band': band,
            onPointerEnter: () => onHover({ cell, stats: s }),
            onClick: () => onHover({ cell, stats: s }),
          };
          if (shapes) {
            return <path key={`${cell.period}-${cell.hour}`} d={shapes.get(cell)} {...common} />;
          }
          const points = cell.polygon
            .map((v) => {
              const p = project(v.zenith, v.azimuth);
              return `${p.x.toFixed(5)},${(-p.y).toFixed(5)}`;
            })
            .join(' ');
          return <polygon key={`${cell.period}-${cell.hour}`} points={points} {...common} />;
        })}
      </g>
    </g>
  );
}
