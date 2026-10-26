import { useId, useMemo, useRef, type ReactNode } from 'react';
import type { Site } from '../../core/chart/sunChart';
import { useI18n } from '../i18n/useI18n';
import { chartGeometry, type SvgPoint } from './chartGeometry';
import { useLabelLayout } from './useLabelLayout';
import './SunChart.css';

const AZIMUTH_LABELS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const CARDINAL: Record<number, 'chart.north' | 'chart.east' | 'chart.south' | 'chart.west'> = {
  0: 'chart.north',
  90: 'chart.east',
  180: 'chart.south',
  270: 'chart.west',
};

function polyline(points: SvgPoint[]): string {
  return points.map((p) => `${p.x.toFixed(5)},${p.y.toFixed(5)}`).join(' ');
}

export function SunChart({
  site,
  title,
  underlay,
  overlay,
  top,
}: {
  site: Site;
  title: string;
  /** Camada sob a grade (dados climáticos), em coordenadas de raio 1. */
  underlay?: ReactNode;
  /** Camada desenhada sobre a carta e sob as trajetórias (máscara, transferidor), raio 1. */
  overlay?: ReactNode;
  /** Camada por cima de tudo (ex.: desenho à mão, que recebe os cliques). */
  top?: ReactNode;
}) {
  const { t, formatNumber } = useI18n();
  const g = useMemo(() => chartGeometry(site), [site]);
  const titleId = `chart-title${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // Rótulos de altura no semieixo meridiano oposto ao lado em que o sol passa mais tempo
  // (sul da carta para latitudes sul): y do SVG cresce para o Sul.
  const labelSide = site.latitude < 0 ? 1 : -1;
  const months = t('chart.monthsShort').split(',');
  // Rótulos móveis das camadas (curvas, período) longe dos outros textos da carta.
  const svgRef = useRef<SVGSVGElement>(null);
  useLabelLayout(svgRef);

  return (
    <svg
      ref={svgRef}
      className="sun-chart"
      viewBox="-1.32 -1.32 2.64 2.64"
      role="img"
      aria-labelledby={titleId}
      data-testid="sun-chart"
    >
      <title id={titleId}>{title}</title>
      {underlay}
      <g className="grid">
        {g.altitudeCircles.map((c) => (
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
        {g.altitudeCircles.map((c) => (
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
      <g className="hour-lines" data-testid="hour-lines">
        {g.hourLines.map((h) => {
          const label = h.points[Math.floor(h.points.length / 2)]!;
          return (
            <g key={h.hour}>
              <polyline points={polyline(h.points)} className="hour-line" />
              <text x={label.x} y={label.y + 0.05} className="hour-label">
                {h.hour}
              </text>
            </g>
          );
        })}
      </g>
      {overlay}
      <g className="date-labels" data-testid="date-labels">
        {g.pathLabels.map((l) => (
          <text key={l.months.join('-')} x={l.x} y={l.y} className="date-label">
            {l.months.map((m) => months[m - 1]).join('/')}
          </text>
        ))}
      </g>
      <g className="sun-paths" data-testid="sun-paths">
        {g.paths.map((p) => (
          <polyline
            key={`${p.date.month}-${p.date.day}`}
            points={polyline(p.points)}
            className={`sun-path ${p.date.kind}`}
            data-date={`${p.date.day}/${p.date.month}`}
          />
        ))}
      </g>
      {top}
    </svg>
  );
}
