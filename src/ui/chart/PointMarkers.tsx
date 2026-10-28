import { projectDirection } from '../../core/chart/projection';
import type { MarkedPoint, PointNumber } from '../state/pointsHash';
import { useChartProjection } from './projectionContext';

/** Meio tamanho do marcador, em unidades da carta (raio do horizonte = 1): cerca de 10 px. */
export const MARKER_SIZE = 0.045;

/**
 * Forma de cada número (decisão 0051): círculo, quadrado e losango, com o número dentro. Os
 * pontos se distinguem pela forma e pelo número, não pela cor (WCAG 1.4.1).
 */
function Shape({ n, x, y, s }: { n: PointNumber; x: number; y: number; s: number }) {
  if (n === 1) return <circle cx={x} cy={y} r={s} data-label-obstacle="" />;
  if (n === 2) {
    const a = s * 0.9;
    return <rect x={x - a} y={y - a} width={2 * a} height={2 * a} data-label-obstacle="" />;
  }
  const d = s * 1.25;
  return (
    <polygon
      points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`}
      data-label-obstacle=""
    />
  );
}

/** Marcador de um ponto, no SVG (x para a direita, y para baixo). */
function Marker({ n, x, y, s }: { n: PointNumber; x: number; y: number; s: number }) {
  return (
    <g className={`point-marker point-${n}`} data-testid="point-marker" data-point={n}>
      <Shape n={n} x={x} y={y} s={s} />
      <text x={x} y={y} className="point-number">
        {n}
      </text>
    </g>
  );
}

/** Posição do ponto na carta, em coordenadas do SVG. */
function useMarkerPosition() {
  const projection = useChartProjection();
  return (p: { altitude: number; azimuth: number }) => {
    const c = projectDirection(projection, 90 - p.altitude, p.azimuth);
    return { x: c.x, y: -c.y };
  };
}

/** Pontos marcados na carta (decisão 0051): por cima de tudo, também na impressão e nas imagens. */
export function PointMarkers({ points }: { points: readonly MarkedPoint[] }) {
  const position = useMarkerPosition();
  if (points.length === 0) return null;
  return (
    <g className="point-markers" data-testid="point-markers" aria-hidden="true">
      {points.map((p) => {
        const { x, y } = position(p);
        return <Marker key={p.n} n={p.n} x={x} y={y} s={MARKER_SIZE} />;
      })}
    </g>
  );
}

/** O mesmo marcador, pequeno, na primeira coluna da tabela dos pontos. */
export function PointBadge({ n }: { n: PointNumber }) {
  return (
    <svg className="point-badge" viewBox="-1.3 -1.3 2.6 2.6" aria-hidden="true">
      <g className={`point-marker point-${n}`}>
        <Shape n={n} x={0} y={0} s={1} />
        <text x={0} y={0} className="point-number">
          {n}
        </text>
      </g>
    </svg>
  );
}
