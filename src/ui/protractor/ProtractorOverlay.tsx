import { useId, useMemo } from 'react';
import { projectDirection, type Projection } from '../../core/chart/projection';
import { circleLines, protractorPolylines, verticalLines } from '../../core/protractor/projected';
import {
  protractorCurves,
  protractorGrid,
  type AngleReference,
  type Circle,
  type ProtractorAngles,
  type ProtractorCurve,
} from '../../core/protractor/protractor';
import { ChartClip } from '../chart/ChartClip';
import { pathD, useChartProjection } from '../chart/projectionContext';

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

const FAMILY_SYMBOL = { alpha: 'α', beta: 'β', gamma: 'γ', finTop: 'γa' } as const;

interface DrawnCurve extends ProtractorCurve {
  /** Chave única e test id: "p-" na frente para as curvas da sombra parcial. */
  key: string;
  partial: boolean;
}

interface ProtractorProps {
  orientation: number;
  reference: AngleReference;
  angles: ProtractorAngles;
  /** Ângulos da sombra parcial (50%): curvas tracejadas. */
  partial: ProtractorAngles;
  sideLabels: { right: string; left: string };
}

export function ProtractorOverlay(props: ProtractorProps) {
  const projection = useChartProjection();
  return projection.kind === 'stereographic' ? (
    <StereographicProtractor {...props} />
  ) : (
    <ProjectedProtractor {...props} projection={projection} />
  );
}

const SYMBOL = (c: ProtractorCurve, sideLabels: { right: string; left: string }) =>
  `${FAMILY_SYMBOL[c.family]}${c.index === 2 ? '2' : ''}${c.side ? sideLabels[c.side] : ''}`;

/**
 * Transferidor na equidistante e na cilíndrica (spec 03, seção 3.5; decisão 0025): as mesmas curvas,
 * traçadas ponto a ponto a partir dos círculos máximos.
 */
function ProjectedProtractor({
  orientation,
  reference,
  angles,
  partial,
  sideLabels,
  projection,
}: ProtractorProps & { projection: Projection }) {
  const clipId = `pt-clip${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { kind, center } = projection;
  const grid = useMemo(() => {
    const g = protractorGrid(orientation);
    return {
      alpha: g.alpha.map((a) => ({
        externalAngle: a.externalAngle,
        d: pathD(circleLines(projection, a.circle)),
      })),
      beta: g.betaAzimuths.map((az) => ({ az, d: pathD(verticalLines(projection, az)) })),
      facade: g.facadeAzimuths.map((az) => pathD(verticalLines(projection, az))).join(''),
      normal: pathD(verticalLines(projection, g.normalAzimuth)),
    };
    // A projeção é descrita pelo tipo e pelo centro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation, kind, center]);
  const curves = useMemo(() => {
    const tag = (isPartial: boolean, a: ProtractorAngles) =>
      protractorPolylines(projection, orientation, reference, a).map((c) => ({
        ...c,
        partial: isPartial,
        key: `${isPartial ? 'p-' : ''}${c.family}-${c.side ?? ''}-${c.index}`,
      }));
    return [...tag(false, angles), ...tag(true, partial)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation, reference, angles, partial, kind, center]);
  // Ponta da normal fora do horizonte nas azimutais; na cilíndrica, a normal vai do horizonte ao topo.
  const normalTip = projectDirection(projection, 90, orientation);
  return (
    <g className="protractor" data-testid="protractor">
      <defs>
        <ChartClip id={clipId} />
      </defs>
      <g clipPath={`url(#${clipId})`} className="pt-grid">
        {grid.alpha.map((a) => (
          <path
            key={a.externalAngle}
            d={a.d}
            className={a.externalAngle % 10 === 0 ? 'major' : 'minor'}
          />
        ))}
        {grid.beta.map((b) => (
          <path key={b.az} d={b.d} className="minor" />
        ))}
      </g>
      <path d={grid.facade} className="pt-facade" data-testid="facade-line" />
      <path d={grid.normal} className="pt-normal" />
      {kind !== 'cylindrical' && (
        <line
          x1={normalTip.x}
          y1={-normalTip.y}
          x2={normalTip.x * 1.08}
          y2={-normalTip.y * 1.08}
          className="pt-normal"
        />
      )}
      <g clipPath={`url(#${clipId})`}>
        {curves.map((c) => (
          <path
            key={c.key}
            d={pathD(c.lines)}
            className={`pt-curve ${c.family}${c.partial ? ' partial' : ''}`}
            data-testid={`curve-${c.key}`}
          />
        ))}
      </g>
      <g className="pt-labels">
        {curves.map(
          (c) =>
            c.label && (
              <text
                key={c.key}
                x={c.label.x}
                y={-c.label.y - 0.02}
                className={`pt-label ${c.family}${c.partial ? ' partial' : ''}`}
              >
                {SYMBOL(c, sideLabels)}
              </text>
            ),
        )}
      </g>
    </g>
  );
}

function StereographicProtractor({
  orientation,
  reference,
  angles,
  partial,
  sideLabels,
}: ProtractorProps) {
  const grid = useMemo(() => protractorGrid(orientation), [orientation]);
  const clipId = `pt-clip${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const curves = useMemo((): DrawnCurve[] => {
    const tag = (list: ProtractorCurve[], isPartial: boolean) =>
      list.map((c) => ({
        ...c,
        partial: isPartial,
        key: `${isPartial ? 'p-' : ''}${c.family}-${c.side ?? ''}-${c.index}`,
      }));
    return [
      ...tag(protractorCurves(orientation, reference, angles), false),
      ...tag(protractorCurves(orientation, reference, partial), true),
    ];
  }, [orientation, reference, angles, partial]);
  const [f1, f2] = grid.facadeAzimuths.map((a) => atAzimuth(a)) as [
    { x: number; y: number },
    { x: number; y: number },
  ];
  const normal = atAzimuth(grid.normalAzimuth, 1.08);

  return (
    <g className="protractor" data-testid="protractor">
      <defs>
        <clipPath id={clipId}>
          <circle r={1} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} className="pt-grid">
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
      <g clipPath={`url(#${clipId})`}>
        {curves.map((c) => {
          const className = `pt-curve ${c.family}${c.partial ? ' partial' : ''}`;
          if (c.geometry.kind === 'ray') {
            const p = atAzimuth(c.geometry.azimuth);
            return (
              <line
                key={c.key}
                x1={0}
                y1={0}
                x2={p.x}
                y2={p.y}
                className={className}
                data-testid={`curve-${c.key}`}
              />
            );
          }
          const g = c.geometry;
          return (
            <circle
              key={c.key}
              cx={g.centerE}
              cy={-g.centerN}
              r={g.radius}
              className={className}
              data-testid={`curve-${c.key}`}
            />
          );
        })}
      </g>
      <g className="pt-labels">
        {curves.map((c) => {
          const key = c.key;
          let p: { x: number; y: number } | null;
          if (c.geometry.kind === 'ray') {
            if (c.externalAngle >= 90) return null;
            p = atAzimuth(c.geometry.azimuth, 0.9);
          } else if (c.family === 'alpha') {
            p = circleOnRay(c.geometry, grid.normalAzimuth);
          } else {
            // γ das aletas mais perto da fachada, onde fica a sombra da aleta.
            const offset = c.family === 'finTop' ? 70 : 45;
            p = circleOnRay(c.geometry, orientation + (c.side === 'right' ? offset : -offset));
          }
          if (!p) return null;
          const side = c.side ? sideLabels[c.side] : '';
          return (
            <text
              key={key}
              x={p.x}
              y={p.y - 0.02}
              className={`pt-label ${c.family}${c.partial ? ' partial' : ''}`}
            >
              {`${FAMILY_SYMBOL[c.family]}${c.index === 2 ? '2' : ''}${side}`}
            </text>
          );
        })}
      </g>
    </g>
  );
}
