import { useId, useMemo, useRef, type ReactNode } from 'react';
import { makeProjection, projectDirection, type Projection } from '../../core/chart/projection';
import type { Site } from '../../core/chart/sunChart';
import { useI18n } from '../i18n/useI18n';
import type { HourLinesMode } from '../state/chartOptionsHash';
import { chartGeometry, chartSky, type SvgPoint } from './chartGeometry';
import { ChartProjectionContext, chartFrame, pathD } from './projectionContext';
import { useLabelLayout } from './useLabelLayout';
import './SunChart.css';

const AZIMUTH_LABELS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const CARDINAL: Record<number, 'chart.north' | 'chart.east' | 'chart.south' | 'chart.west'> = {
  0: 'chart.north',
  90: 'chart.east',
  180: 'chart.south',
  270: 'chart.west',
};
const ALTITUDES = [10, 20, 30, 40, 50, 60, 70, 80];
const STEREO = makeProjection('stereographic');

function polyline(points: SvgPoint[]): string {
  return points.map((p) => `${p.x.toFixed(5)},${p.y.toFixed(5)}`).join(' ');
}

/** Grade e rótulos das projeções azimutais (estereográfica e equidistante). */
function AzimuthalGrid({
  radii,
  labelSide,
}: {
  radii: { altitude: number; radius: number }[];
  labelSide: number;
}) {
  const { t, formatNumber } = useI18n();
  return (
    <>
      <g className="grid">
        {radii.map((c) => (
          <circle key={c.altitude} r={c.radius} className="altitude" />
        ))}
        {AZIMUTH_LABELS.map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line key={a} x1={0} y1={0} x2={Math.sin(r)} y2={-Math.cos(r)} className="azimuth" />
          );
        })}
        <circle r={1} className="horizon" />
      </g>
      <g className="labels">
        {AZIMUTH_LABELS.map((a) => {
          const r = (a * Math.PI) / 180;
          const key = CARDINAL[a];
          // Os pontos cardeais ficam mais afastados que os graus: assim não encostam nos rótulos
          // das datas, que no equinócio ficam exatamente no Leste e no Oeste.
          const radius = key ? 1.25 : 1.17;
          return (
            <text
              key={a}
              x={radius * Math.sin(r)}
              y={-radius * Math.cos(r)}
              className={key ? 'cardinal' : 'azimuth-label'}
            >
              {key ? t(key) : `${a}°`}
            </text>
          );
        })}
        {radii.map((c) => (
          <text
            key={c.altitude}
            x={0.015}
            y={labelSide * (c.radius + 0.01)}
            className="altitude-label"
          >
            {formatNumber(c.altitude)}°
          </text>
        ))}
      </g>
    </>
  );
}

/**
 * Grade e rótulos da cilíndrica (spec 03, seção 3.5.2): altura de 10° em 10° na horizontal,
 * azimutes verdadeiros de 30° em 30° na vertical (com os pontos cardeais), a normal da fachada no
 * centro e a direção oposta nas duas bordas.
 */
function CylindricalGrid({ projection }: { projection: Projection }) {
  const { t, formatNumber } = useI18n();
  const columns = AZIMUTH_LABELS.map((a) => ({ a, x: projectDirection(projection, 90, a).x }));
  return (
    <>
      <g className="grid">
        {ALTITUDES.map((h) => (
          <line key={h} x1={-1} y1={-h / 90} x2={1} y2={-h / 90} className="altitude" />
        ))}
        {columns.map(({ a, x }) => (
          <line key={a} x1={x} y1={0} x2={x} y2={-1} className="azimuth" />
        ))}
        <line x1={-1} y1={-1} x2={1} y2={-1} className="zenith-edge" />
        <line x1={-1} y1={0} x2={-1} y2={-1} className="side-edge" />
        <line x1={1} y1={0} x2={1} y2={-1} className="side-edge" />
        <line x1={-1} y1={0} x2={1} y2={0} className="horizon" />
      </g>
      <g className="labels">
        {columns.map(({ a, x }) => {
          const key = CARDINAL[a];
          // A costura (x = −1) repete a borda da direita: o rótulo fica só de um lado.
          if (x < -0.999) return null;
          return (
            <text
              key={a}
              x={x}
              y={key ? 0.17 : 0.11}
              className={key ? 'cardinal' : 'azimuth-label'}
            >
              {key ? t(key) : `${a}°`}
            </text>
          );
        })}
        {[...ALTITUDES, 90].map((h) => (
          <text key={h} x={-1.025} y={-h / 90} className="altitude-label cylindrical">
            {formatNumber(h)}°
          </text>
        ))}
      </g>
    </>
  );
}

export function SunChart({
  site,
  title,
  underlay,
  overlay,
  top,
  projection = STEREO,
  hourLines = 'solar',
}: {
  site: Site;
  title: string;
  /** Camada sob a grade (dados climáticos), em coordenadas de raio 1. */
  underlay?: ReactNode;
  /** Camada desenhada sobre a carta e sob as trajetórias (máscara, transferidor), raio 1. */
  overlay?: ReactNode;
  /** Camada por cima de tudo (ex.: desenho à mão, que recebe os cliques). */
  top?: ReactNode;
  /** Projeção da carta (F4.3); padrão estereográfica. */
  projection?: Projection;
  /** Linhas horárias em hora solar, em hora legal (analemas) ou as duas. */
  hourLines?: HourLinesMode;
}) {
  const { t } = useI18n();
  const sky = useMemo(() => chartSky(site), [site]);
  const withAnalemmas = hourLines !== 'solar';
  const g = useMemo(
    () => chartGeometry(site, projection, withAnalemmas, sky),
    // A projeção é descrita pelo tipo e pelo centro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [site, sky, projection.kind, projection.center, withAnalemmas],
  );
  const titleId = `chart-title${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const clipId = `${titleId}-clip`;
  // Rótulos de altura no semieixo meridiano oposto ao lado em que o sol passa mais tempo
  // (sul da carta para latitudes sul): y do SVG cresce para o Sul.
  const labelSide = site.latitude < 0 ? 1 : -1;
  const months = t('chart.monthsShort').split(',');
  const frame = chartFrame(projection.kind);
  const stereo = projection.kind === 'stereographic';
  const cylindrical = projection.kind === 'cylindrical';
  const showSolar = hourLines !== 'legal';
  // Rótulos móveis das camadas (curvas, período) longe dos outros textos da carta.
  const svgRef = useRef<SVGSVGElement>(null);
  useLabelLayout(svgRef);

  return (
    <ChartProjectionContext.Provider value={projection}>
      <svg
        ref={svgRef}
        className={`sun-chart ${projection.kind}`}
        viewBox={frame.viewBox.join(' ')}
        role="img"
        aria-labelledby={titleId}
        data-testid="sun-chart"
        data-projection={projection.kind}
      >
        <title id={titleId}>{title}</title>
        <defs>
          <clipPath id={clipId}>
            {cylindrical ? <rect x={-1} y={-1} width={2} height={1} /> : <circle r={1} />}
          </clipPath>
        </defs>
        {underlay}
        {cylindrical ? (
          <CylindricalGrid projection={projection} />
        ) : (
          <AzimuthalGrid radii={g.altitudeCircles} labelSide={labelSide} />
        )}
        {showSolar && (
          <g
            className="hour-lines"
            data-testid="hour-lines"
            clipPath={stereo ? undefined : `url(#${clipId})`}
          >
            {g.hourLines.map((h) => (
              <g key={h.hour}>
                {stereo ? (
                  <polyline points={polyline(h.points)} className="hour-line" />
                ) : (
                  <path d={pathD(h.lines)} className="hour-line" />
                )}
                <text x={h.label.x} y={h.label.y} className="hour-label">
                  {h.hour}
                </text>
              </g>
            ))}
          </g>
        )}
        {withAnalemmas && (
          <g className="legal-hour-lines" data-testid="legal-hour-lines">
            <g clipPath={`url(#${clipId})`}>
              {g.analemmas.map((a) => (
                <path
                  key={a.hour}
                  d={pathD(a.lines)}
                  className="legal-hour-line"
                  data-hour={a.hour}
                />
              ))}
            </g>
            {g.analemmas.map(
              (a) =>
                a.label && (
                  <text
                    key={a.hour}
                    x={a.label.x}
                    y={a.label.y}
                    className="legal-hour-label"
                    data-hour={a.hour}
                  >
                    {a.hour}
                  </text>
                ),
            )}
          </g>
        )}
        {overlay}
        <g className="date-labels" data-testid="date-labels">
          {g.pathLabels.map((l) => (
            <text
              key={l.months.join('-')}
              x={l.x}
              y={l.y}
              className={`date-label${cylindrical ? ' cylindrical' : ''}`}
            >
              {l.months.map((m) => months[m - 1]).join('/')}
            </text>
          ))}
        </g>
        <g
          className="sun-paths"
          data-testid="sun-paths"
          clipPath={stereo ? undefined : `url(#${clipId})`}
        >
          {g.paths.map((p) =>
            stereo ? (
              <polyline
                key={`${p.date.month}-${p.date.day}`}
                points={polyline(p.points)}
                className={`sun-path ${p.date.kind}`}
                data-date={`${p.date.day}/${p.date.month}`}
              />
            ) : (
              <path
                key={`${p.date.month}-${p.date.day}`}
                d={pathD(p.lines)}
                className={`sun-path ${p.date.kind}`}
                data-date={`${p.date.day}/${p.date.month}`}
              />
            ),
          )}
        </g>
        {top}
      </svg>
    </ChartProjectionContext.Provider>
  );
}
