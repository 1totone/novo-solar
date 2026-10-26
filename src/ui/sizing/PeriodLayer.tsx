import { project } from '../../core/chart/stereographic';
import type { RequiredAngles, SkyPosition } from '../../core/shading/inverse';

const LABELS: [keyof RequiredAngles, string][] = [
  ['alpha', 'α'],
  ['alphaMax', 'α2'],
  ['gammaRight', 'γ d'],
  ['gammaLeft', 'γ e'],
  ['betaRight', 'β d'],
  ['betaLeft', 'β e'],
  ['finGammaRight', 'γa d'],
  ['finGammaLeft', 'γa e'],
];

const svg = (d: SkyPosition) => {
  const c = project(90 - d.altitude, d.azimuth);
  return [c.x, -c.y] as const;
};

/**
 * Área do período do dimensionamento na carta (F3.6), em verde, como a Figura 13 do tutorial do
 * SOL-AR da UFU; fica sob as trajetórias.
 */
export function PeriodArea({ outline }: { outline: readonly SkyPosition[] }) {
  const d = outline.map(
    (p, i) =>
      `${i === 0 ? 'M' : 'L'}${svg(p)
        .map((v) => v.toFixed(5))
        .join(',')}`,
  );
  return (
    <g className="period" data-testid="period-layer">
      <clipPath id="period-clip">
        <circle r={1} />
      </clipPath>
      <path
        d={`${d.join('')}Z`}
        className="period-area"
        clipPath="url(#period-clip)"
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
  // Pontos repetidos (o mesmo sol determina dois ângulos): um rótulo só, com os dois nomes.
  const marks = new Map<string, { x: number; y: number; names: string[] }>();
  for (const [key, name] of LABELS) {
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
          <circle cx={m.x} cy={m.y} r={0.018} />
          <text x={m.x + 0.03} y={m.y} className="period-label">
            {m.names.join(', ')}
          </text>
        </g>
      ))}
    </g>
  );
}
