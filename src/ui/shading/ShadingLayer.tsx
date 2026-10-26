import { useId, useMemo } from 'react';
import {
  projectPath,
  projectRing,
  type ChartPoint,
  type Projection,
} from '../../core/chart/projection';
import { project } from '../../core/chart/stereographic';
import type { Region } from '../../core/mask/mask';
import type { ShadingChart, SkyDirection } from '../../core/shading/contours';
import { ChartClip } from '../chart/ChartClip';
import { useChartProjection } from '../chart/projectionContext';
import { formatCandidates } from '../chart/labelLayout';
import { useI18n } from '../i18n/useI18n';
import { BIG, HATCH, MaskBuilder, shortHash } from '../mask/maskBuilder';

type Point = [number, number];

/** Direção do céu em coordenadas do SVG da carta estereográfica (raio 1, y para baixo). */
function svgPoint(d: SkyDirection): Point {
  const c = project(90 - d.altitude, d.azimuth);
  return [c.x, -c.y];
}

const toDir = (d: SkyDirection) => ({ zenith: 90 - d.altitude, azimuth: d.azimuth });
const toPoints = (line: ChartPoint[]): Point[] => line.map((q) => [q.x, -q.y]);

/** O pedaço da polilinha com mais pontos dentro da carta (na cilíndrica, entre as cópias). */
function mainPiece(pieces: ChartPoint[][]): ChartPoint[] {
  let best = pieces[0] ?? [];
  let bestCount = -1;
  for (const piece of pieces) {
    const count = piece.filter((q) => q.x >= -1 && q.x <= 1).length;
    if (count > bestCount) {
      best = piece;
      bestCount = count;
    }
  }
  return best;
}

/** Curvas e região de 100% na projeção da carta (F4.3); na estereográfica, como antes. */
function drawChart(chart: ShadingChart, projection: Projection) {
  if (projection.kind === 'stereographic') {
    const lines = chart.contours.map((c) => ({ level: c.level, pieces: [c.points.map(svgPoint)] }));
    return {
      fill: chart.fullShade.map((ring) => pathOf(ring.map(svgPoint)) + 'Z').join(''),
      lines,
      labels: labelCandidates(lines.map((l) => l.pieces[0]!)),
    };
  }
  const lines = chart.contours.map((c) => {
    const pieces = projectPath(projection, c.points.map(toDir), false);
    return { level: c.level, pieces: pieces.map(toPoints), main: toPoints(mainPiece(pieces)) };
  });
  return {
    fill: chart.fullShade
      .flatMap((ring) => projectRing(projection, ring.map(toDir)))
      .map((ring) => pathOf(toPoints(ring)) + 'Z')
      .join(''),
    lines,
    labels: labelCandidates(lines.map((l) => l.main)),
  };
}

const pathOf = (points: readonly Point[]) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('');

/** Ponto da linha a uma fração do comprimento (0 no início, 1 no fim). */
function pointAt(points: readonly Point[], fraction: number): Point {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]);
  }
  let run = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]!;
    const [bx, by] = points[i]!;
    const len = Math.hypot(bx - ax, by - ay);
    if (run + len >= fraction * total && len > 0) {
      const t = (fraction * total - run) / len;
      return [ax + t * (bx - ax), ay + t * (by - ay)];
    }
    run += len;
  }
  return points[0]!;
}

/** Frações da linha tentadas para o rótulo, da preferida (o meio) às de reserva. */
const LABEL_FRACTIONS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.12, 0.88, 0.05, 0.95];
/** Depois das posições sobre a linha, as mesmas logo acima e logo abaixo dela (unidades da carta). */
const LABEL_LIFTS = [0, -0.05, 0.05];

/** Posições candidatas de cada rótulo; a escolhida não cobre outro texto (useLabelLayout). */
const labelCandidates = (lines: readonly (readonly Point[])[]): Point[][] =>
  lines.map((line) =>
    LABEL_LIFTS.flatMap((dy) =>
      LABEL_FRACTIONS.map((f): Point => {
        const [x, y] = pointAt(line, f);
        return [x, y + dy];
      }),
    ),
  );

/** Posições candidatas de cada rótulo; a escolhida não cobre outro texto (useLabelLayout). */
const labelCandidates = (lines: readonly (readonly Point[])[]): Point[][] =>
  lines.map((line) => LABEL_FRACTIONS.map((f) => pointAt(line, f)));

/**
 * Camadas da proteção pelas dimensões na carta (F3.2): região de sombra total (preenchimento leve
 * ou hachura horizontal sobre os dados), máscara de um ponto da janela (hachura vertical violeta)
 * e curvas de 0, 25, 50, 75 e 100% da janela à sombra, com o percentual escrito. Com `stale`, o
 * desenho é o da geometria anterior, esmaecido, enquanto o worker calcula a nova.
 */
export function ShadingLayer({
  chart,
  stale = false,
  point,
  hatched = false,
}: {
  chart: ShadingChart | null;
  stale?: boolean;
  /** Região da máscara de um ponto (null sem ela). */
  point: Region | null;
  /** Com dados sobre a carta, a sombra total vira hachura e deixa ver as cores. */
  hatched?: boolean;
}) {
  const { formatNumber } = useI18n();
  const projection = useChartProjection();
  const signature = shortHash(JSON.stringify([point, projection.kind, projection.center]));
  const prefix = `sh${useId().replace(/[^a-zA-Z0-9_-]/g, '')}${signature}`;
  // Coordenadas na carta: refeitas só quando chega outro resultado (não a cada passagem do mouse).
  const drawn = useMemo(
    () => (chart ? drawChart(chart, projection) : null),
    // A projeção é descrita pelo tipo e pelo centro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chart, projection.kind, projection.center],
  );
  if (!drawn && !point) return null;
  const builder = new MaskBuilder(prefix, projection);
  const pointMask = point && point.kind !== 'empty' ? builder.mask(point) : null;
  const levelClass = (level: number) => `level-${Math.round(level * 100)}`;
  return (
    <g className="shading" data-testid="shading-layer" data-stale={stale ? 'true' : undefined}>
      <defs>
        <ChartClip id={`${prefix}-clip`} />
        <pattern
          id={`${prefix}-hfull`}
          patternUnits="userSpaceOnUse"
          width={HATCH}
          height={HATCH}
          patternTransform="rotate(90)"
        >
          <rect x={0} y={0} width={HATCH * 0.28} height={HATCH} className="hatch-full-shade" />
        </pattern>
        <pattern id={`${prefix}-hpoint`} patternUnits="userSpaceOnUse" width={HATCH} height={HATCH}>
          <rect x={0} y={0} width={HATCH * 0.22} height={HATCH} className="hatch-point" />
        </pattern>
        {builder.defs}
      </defs>
      {drawn?.fill && (
        <path
          d={drawn.fill}
          clipPath={`url(#${prefix}-clip)`}
          fillRule="evenodd"
          className={`full-shade${hatched ? ' hatched' : ''}${stale ? ' stale' : ''}`}
          style={hatched ? { fill: `url(#${prefix}-hfull)` } : undefined}
          data-testid="shading-full"
        />
      )}
      {pointMask && (
        <rect
          {...BIG}
          clipPath={`url(#${prefix}-clip)`}
          className="point-mask"
          style={{ fill: `url(#${prefix}-hpoint)` }}
          mask={`url(#${pointMask})`}
          data-testid="shading-point"
        />
      )}
      {drawn && (
        <g className={`contours${stale ? ' stale' : ''}`}>
          <g clipPath={`url(#${prefix}-clip)`}>
            {drawn.lines.map((line, i) => (
              <path
                key={`l${i}`}
                d={line.pieces.map(pathOf).join('')}
                className={`contour ${levelClass(line.level)}`}
                data-level={line.level}
              />
            ))}
          </g>
          {drawn.labels.map((candidates, i) => {
            const line = drawn.lines[i]!;
            const [x, y] = candidates[0]!;
            return (
              <text
                key={`t${i}`}
                x={x}
                y={y}
                data-candidates={formatCandidates(candidates.map(([cx, cy]) => ({ x: cx, y: cy })))}
                className={`contour-label ${levelClass(line.level)}`}
                data-testid="contour-label"
              >
                {`${formatNumber(line.level * 100)}%`}
              </text>
            );
          })}
        </g>
      )}
    </g>
  );
}
