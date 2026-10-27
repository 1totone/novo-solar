import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { unprojectPoint, type Projection } from '../../core/chart/projection';
import { readDirection } from '../../core/chart/readout';
import type { Site } from '../../core/chart/sunChart';
import { useI18n } from '../i18n/useI18n';
import type { HourLinesMode } from '../state/chartOptionsHash';

/** Ponto lido na carta: posição no SVG, direção do céu e onde fica a caixa da leitura. */
export interface ReadoutPoint {
  svgX: number;
  svgY: number;
  zenith: number;
  azimuth: number;
  /** Posição do ponto na moldura da carta, em px, para a caixa ao lado dele. */
  boxX: number;
  boxY: number;
  frameWidth: number;
  touch: boolean;
}

/**
 * Ponto da carta sob o cursor ou o dedo (coordenadas da tela), pela inversa da projeção (spec 03,
 * seção 3.6); null fora do céu desenhado (abaixo do horizonte ou fora da faixa da cilíndrica).
 */
function pointAt(
  frame: HTMLElement,
  projection: Projection,
  clientX: number,
  clientY: number,
  touch: boolean,
): ReadoutPoint | null {
  const svg = frame.querySelector<SVGSVGElement>('svg.sun-chart');
  const m = svg?.getScreenCTM();
  if (!svg || !m) return null;
  const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  const x = p.x;
  const y = -p.y;
  if (projection.kind === 'cylindrical') {
    if (Math.abs(x) > 1 || y < 0 || y > 1) return null;
  } else if (Math.hypot(x, y) > 1) return null;
  const d = unprojectPoint(projection, x, y);
  if (!d || d.zenith > 90) return null;
  const box = frame.getBoundingClientRect();
  return {
    svgX: p.x,
    svgY: p.y,
    zenith: d.zenith,
    azimuth: d.azimuth,
    boxX: clientX - box.left,
    boxY: clientY - box.top,
    frameWidth: box.width,
    touch,
  };
}

/**
 * Leitura da carta (decisão 0045): passar o mouse ou tocar mostra a altura, o azimute e quando o sol
 * passa pelo ponto (hora solar e datas; hora legal quando a carta mostra os analemas). Devolve os
 * eventos para a moldura da carta, a marca do ponto (dentro do SVG) e a caixa com a leitura.
 */
export function useChartReadout(site: Site, projection: Projection, hourLines: HourLinesMode) {
  const { t, formatNumber, formatClock, formatDayMonth, locale } = useI18n();
  const [point, setPoint] = useState<ReadoutPoint | null>(null);
  const reading = useMemo(
    () => (point ? readDirection(site, point.zenith, point.azimuth) : null),
    [site, point],
  );

  // Toque: o ponto de quem tocou sem arrastar (arrastar rola a página).
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handlers = {
    // Mouse e caneta: a leitura acompanha o cursor e some quando ele sai da carta.
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'touch') return;
      setPoint(pointAt(e.currentTarget, projection, e.clientX, e.clientY, false));
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'touch') setPoint(null);
    },
    // Toque: a leitura fica no ponto tocado até o próximo toque (fora do céu, some).
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      touchStart.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY } : null;
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (e.pointerType !== 'touch' || !start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) return;
      setPoint(pointAt(e.currentTarget, projection, e.clientX, e.clientY, true));
    },
  };

  const marker = point ? (
    <g
      className="readout-marker"
      data-export="no"
      data-testid="readout-marker"
      pointerEvents="none"
      aria-hidden="true"
    >
      <circle cx={point.svgX} cy={point.svgY} r={0.018} />
      <line x1={point.svgX - 0.035} y1={point.svgY} x2={point.svgX + 0.035} y2={point.svgY} />
      <line x1={point.svgX} y1={point.svgY - 0.035} x2={point.svgX} y2={point.svgY + 0.035} />
    </g>
  ) : null;

  let box: ReactNode = null;
  if (point && reading) {
    const points = t('compass.points').split(',');
    const azimuth = Math.round(point.azimuth) % 360;
    const altitude = Math.round(90 - point.zenith);
    const minutes = Math.round(reading.solarHour * 60) % (24 * 60);
    const clock = (m: number) => formatClock(Math.floor(m / 60), m % 60);
    const list = (items: string[]) =>
      new Intl.ListFormat(locale, { type: 'conjunction' }).format(items);
    const dates = reading.passages.map((p) => formatDayMonth(p.date.day, p.date.month));
    let sun: string;
    if (reading.passages.length === 0) sun = t('readout.never');
    else if (reading.solsticeEdge) {
      sun = t('readout.sunEdge', { time: clock(minutes), date: dates[0]! });
    } else sun = t('readout.sun', { time: clock(minutes), dates: list([...new Set(dates)]) });
    const legal =
      hourLines !== 'solar' && reading.passages.length > 0
        ? t('readout.legal', {
            times: list(
              reading.passages.map((p, i) =>
                t('readout.legalAt', {
                  time: clock(Math.round(p.legalHour * 60) % (24 * 60)),
                  date: dates[i]!,
                }),
              ),
            ),
          })
        : null;
    // A caixa fica ao lado do ponto, do lado com mais espaço, e acima dele no toque (o dedo cobre
    // o que fica embaixo).
    const right = point.boxX < point.frameWidth / 2;
    const style = {
      left: right ? point.boxX + 14 : undefined,
      right: right ? undefined : point.frameWidth - point.boxX + 14,
      top: point.touch ? undefined : point.boxY + 14,
      bottom: point.touch ? `calc(100% - ${point.boxY - 18}px)` : undefined,
    };
    box = (
      <div className="chart-readout" style={style} data-testid="chart-readout" aria-live="off">
        <p data-testid="readout-position">
          {t('readout.position', {
            altitude: formatNumber(altitude),
            azimuth: formatNumber(azimuth),
            compass: points[Math.round(point.azimuth / 22.5) % 16]!,
          })}
        </p>
        <p data-testid="readout-sun">{sun}</p>
        {legal && <p data-testid="readout-legal">{legal}</p>}
      </div>
    );
  }

  return { handlers, marker, box, point, reading };
}
