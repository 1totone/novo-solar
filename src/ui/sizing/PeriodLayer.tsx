import { useId } from 'react';
import { projectDirection, projectRing } from '../../core/chart/projection';
import type { RequiredAngles, SkyPosition } from '../../core/shading/inverse';
import { ChartClip } from '../chart/ChartClip';
import { pathD, useChartProjection } from '../chart/projectionContext';
import { aroundPoint, formatCandidates } from '../chart/labelLayout';
import { useI18n } from '../i18n/useI18n';

/** Rótulo de cada ângulo na carta: símbolo e lado (d e e em português). */
const LABELS: [keyof RequiredAngles, string, 'right' | 'left' | null][] = [
  ['alpha', 'α', null],
  ['alphaMax', 'α2', null],
  ['gammaRight', 'γ', 'right'],
  ['gammaLeft', 'γ', 'left'],
  ['betaRight', 'β', 'right'],
  ['betaLeft', 'β', 'left'],
  ['finGammaRight', 'γa', 'right'],
  ['finGammaLeft', 'γa', 'left'],
];

/**
 * Área do período do dimensionamento na carta (F3.6), em verde, como a Figura 13 do tutorial do
 * SOL-AR da UFU; fica sob as trajetórias.
 */
export function PeriodArea({ outline }: { outline: readonly SkyPosition[] }) {
  const projection = useChartProjection();
  const clipId = `period-clip${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const rings = projectRing(
    projection,
    outline.map((p) => ({ zenith: 90 - p.altitude, azimuth: p.azimuth })),
  );
  return (
    <g className="period" data-testid="period-layer">
      <defs>
        <ChartClip id={clipId} />
      </defs>
      <path
        d={pathD(rings, true)}
        className="period-area"
        clipPath={`url(#${clipId})`}
        data-testid="period-area"
      />
    </g>
  );
}

/**
 * Sol que determina cada ângulo exigido, marcado com o nome do ângulo; fica por cima das
 * trajetórias (os pontos caem sobre elas, nas pontas do período).
 */
export function PeriodMarks({
  angles,
  showAlphaMax,
}: {
  angles: RequiredAngles;
  showAlphaMax: boolean;
}) {
  const projection = useChartProjection();
  const { t } = useI18n();
  const side = { right: t('sides.rightShort'), left: t('sides.leftShort') };
  const svg = (d: SkyPosition) => {
    const c = projectDirection(projection, 90 - d.altitude, d.azimuth);
    return [c.x, -c.y] as const;
  };
  // Pontos repetidos (o mesmo sol determina dois ângulos): um rótulo só, com os dois nomes.
  const marks = new Map<string, { x: number; y: number; names: string[] }>();
  for (const [key, symbol, s] of LABELS) {
    const name = s ? `${symbol} ${side[s]}` : symbol;
    const e = angles[key];
    if (!e || (key === 'alphaMax' && !showAlphaMax)) continue;
    const [x, y] = svg(e.sample);
    const id = `${x.toFixed(4)},${y.toFixed(4)}`;
    const m = marks.get(id);
    if (m) m.names.push(name);
    else marks.set(id, { x, y, names: [name] });
  }
  return (
    <g className="period" data-testid="period-marks">
      {[...marks.values()].map((m) => (
        <g key={`${m.x},${m.y}`} className="period-mark" data-testid="period-mark">
          {/* Obstáculo para os rótulos móveis: nenhum rótulo cobre o ponto do sol. */}
          <circle cx={m.x} cy={m.y} r={0.018} data-label-obstacle="" />
          <text
            x={m.x + 0.03}
            y={m.y}
            className="period-label"
            data-candidates={formatCandidates(aroundPoint(m.x, m.y, 0.03, 0.045))}
          >
            {m.names.join(', ')}
          </text>
        </g>
      ))}
    </g>
  );
}
