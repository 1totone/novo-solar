import { useMemo } from 'react';
import {
  protractorCurves,
  protractorGrid,
  type AngleReference,
  type Circle,
  type ProtractorAngles,
} from '../../core/protractor/protractor';

const RAD = Math.PI / 180;

/** Ponto do horizonte (raio r) no azimute dado, em coordenadas do SVG (y para baixo). */
function atAzimuth(az: number, r = 1): { x: number; y: number } {
  return { x: r * Math.sin(az * RAD), y: -r * Math.cos(az * RAD) };
}

/** Interseção do círculo com a semirreta que sai do centro no azimute dado (para o rótulo). */
function circleOnRay(c: Circle, az: number): { x: number; y: number } | null {
  const u = { e: Math.sin(az * RAD), n: Math.cos(az * RAD) };
  const b = u.e * c.centerE + u.n * c.centerN;
  const disc = b * b - (c.centerE ** 2 + c.centerN ** 2) + c.radius ** 2;
  if (disc < 0) return null;
  const t = b + Math.sqrt(disc);
  if (t > 1) return null;
  return { x: t * u.e, y: -t * u.n };
}

const FAMILY_SYMBOL = { alpha: 'α', beta: 'β', gamma: 'γ' } as const;

export function ProtractorOverlay({
  orientation,
  reference,
  angles,
  sideLabels,
}: {
  orientation: number;
  reference: AngleReference;
  angles: ProtractorAngles;
  sideLabels: { right: string; left: string };
}) {
  const grid = useMemo(() => protractorGrid(orientation), [orientation]);
  const curves = useMemo(
    () => protractorCurves(orientation, reference, angles),
    [orientation, reference, angles],
  );
  const [f1, f2] = grid.facadeAzimuths.map((a) => atAzimuth(a)) as [
    { x: number; y: number },
    { x: number; y: number },
  ];
  const normal = atAzimuth(grid.normalAzimuth, 1.08);

  return (
    <g className="protractor" data-testid="protractor">
      <defs>
        <clipPath id="horizon-clip">
          <circle r={1} />
        </clipPath>
      </defs>
      <g clipPath="url(#horizon-clip)" className="pt-grid">
        {grid.alpha.map((a) => (
          <circle
            key={a.externalAngle}
            cx={a.circle.centerE}
            cy={-a.circle.centerN}
            r={a.circle.radius}
            className={a.externalAngle % 10 === 0 ? 'major' : 'minor'}
          />
        ))}
        {grid.betaAzimuths.map((az) => {
          const p = atAzimuth(az);
          return <line key={az} x1={0} y1={0} x2={p.x} y2={p.y} className="minor" />;
        })}
      </g>
      <line
        x1={f1.x}
        y1={f1.y}
        x2={f2.x}
        y2={f2.y}
        className="pt-facade"
        data-testid="facade-line"
      />
      <line x1={0} y1={0} x2={normal.x} y2={normal.y} className="pt-normal" />
      <g clipPath="url(#horizon-clip)">
        {curves.map((c) => {
          const key = `${c.family}-${c.side ?? ''}-${c.index}`;
          if (c.geometry.kind === 'ray') {
            const p = atAzimuth(c.geometry.azimuth);
            return (
              <line
                key={key}
                x1={0}
                y1={0}
                x2={p.x}
                y2={p.y}
                className={`pt-curve ${c.family}`}
                data-testid={`curve-${key}`}
              />
            );
          }
          const g = c.geometry;
          return (
            <circle
              key={key}
              cx={g.centerE}
              cy={-g.centerN}
              r={g.radius}
              className={`pt-curve ${c.family}`}
              data-testid={`curve-${key}`}
            />
          );
        })}
      </g>
      <g className="pt-labels">
        {curves.map((c) => {
          const key = `${c.family}-${c.side ?? ''}-${c.index}`;
          let p: { x: number; y: number } | null;
          if (c.geometry.kind === 'ray') {
            if (c.externalAngle >= 90) return null;
            p = atAzimuth(c.geometry.azimuth, 0.9);
          } else if (c.family === 'alpha') {
            p = circleOnRay(c.geometry, grid.normalAzimuth);
          } else {
            p = circleOnRay(c.geometry, orientation + (c.side === 'right' ? 45 : -45));
          }
          if (!p) return null;
          const side = c.side ? sideLabels[c.side] : '';
          return (
            <text key={key} x={p.x} y={p.y - 0.02} className={`pt-label ${c.family}`}>
              {`${FAMILY_SYMBOL[c.family]}${c.index === 2 ? '2' : ''}${side}`}
            </text>
          );
        })}
      </g>
    </g>
  );
}
