import { forwardRef, useId } from 'react';
import type { MonthHourMap } from '../../core/shading/hourly';
import { useI18n } from '../i18n/useI18n';
import { MAP_COLORS, MAP_FONT as FONT, MAP_TICKS as TICKS, mapLayout, shadeClass } from './mapData';

/**
 * Mapa mês × hora da sombra (F3.3): 12 linhas (meses) por 24 colunas (horas do arquivo, em hora
 * legal; a hora h é o intervalo de h − 1 a h). Cada célula tem a cor da classe do percentual da
 * janela à sombra com sol na janela; sem sol na janela, hachura cinza. A dica de cada célula traz
 * os valores; a tabela, todos eles.
 */
export const MonthHourMapView = forwardRef<
  SVGSVGElement,
  {
    map: MonthHourMap;
    width: number;
    title: string;
    hourAxis: string;
    stale?: boolean;
    testId?: string;
  }
>(function MonthHourMapView({ map, width, title, hourAxis, stale = false, testId }, ref) {
  const { t, formatNumber } = useI18n();
  const id = `mhm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const L = mapLayout(width);
  const months = t('chart.monthsShort').split(',');
  const monthsLong = t('annual.monthsLong').split(',');
  const pct = (v: number) => formatNumber(Math.round(v * 100));
  const gridBottom = L.top + 12 * L.cellH;
  return (
    <svg
      ref={ref}
      className={`month-hour-map${stale ? ' stale' : ''}`}
      viewBox={`0 0 ${L.width} ${L.height}`}
      width={L.width}
      height={L.height}
      role="img"
      aria-labelledby={`${id}-t`}
      data-testid={testId ?? 'month-hour-map'}
      fontFamily="inherit"
    >
      <title id={`${id}-t`}>{title}</title>
      <defs>
        <pattern id={`${id}-nosun`} patternUnits="userSpaceOnUse" width={5} height={5}>
          <rect width={5} height={5} fill="#ffffff" />
          <path d="M-1,1 l2,-2 M0,5 l5,-5 M4,6 l2,-2" stroke="#8c959f" strokeWidth={1} />
        </pattern>
      </defs>
      {map.shadedWhenExposed.map((row, m) =>
        row.map((s, h) => {
          const k = shadeClass(s);
          const label =
            s === null
              ? t('annual.cellNoSun', { month: monthsLong[m]!, from: h, to: h + 1 })
              : t('annual.cell', {
                  month: monthsLong[m]!,
                  from: h,
                  to: h + 1,
                  shaded: pct(s),
                  exposure: pct(map.exposure[m]![h]!),
                });
          return (
            <rect
              key={`${m}-${h}`}
              x={L.left + h * L.cellW + 0.5}
              y={L.top + m * L.cellH + 0.5}
              width={L.cellW - 1}
              height={L.cellH - 1}
              fill={k === null ? `url(#${id}-nosun)` : MAP_COLORS[k]}
              data-month={m + 1}
              data-hour={h + 1}
              data-class={k ?? 'sem-sol'}
            >
              <title>{label}</title>
            </rect>
          );
        }),
      )}
      {months.map((name, m) => (
        <text
          key={name}
          x={L.left - 0.4 * FONT}
          y={L.top + (m + 0.5) * L.cellH}
          fontSize={FONT}
          textAnchor="end"
          dominantBaseline="central"
          fill="#3d444d"
        >
          {name}
        </text>
      ))}
      {TICKS.map((h) => (
        <g key={h}>
          <line
            x1={L.left + h * L.cellW}
            x2={L.left + h * L.cellW}
            y1={gridBottom}
            y2={gridBottom + 0.35 * FONT}
            stroke="#57606a"
            strokeWidth={1}
          />
          <text
            x={L.left + h * L.cellW}
            y={gridBottom + 1.3 * FONT}
            fontSize={FONT}
            textAnchor="middle"
            fill="#3d444d"
          >
            {h}
          </text>
        </g>
      ))}
      <text
        x={L.left + 12 * L.cellW}
        y={gridBottom + 2.75 * FONT}
        fontSize={FONT}
        textAnchor="middle"
        fill="#3d444d"
      >
        {hourAxis}
      </text>
    </svg>
  );
});
