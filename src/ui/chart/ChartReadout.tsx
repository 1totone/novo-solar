import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { unprojectPoint, type Projection } from '../../core/chart/projection';
import { readDirection } from '../../core/chart/readout';
import type { Site } from '../../core/chart/sunChart';
import { useI18n } from '../i18n/useI18n';
import type { HourLinesMode } from '../state/chartOptionsHash';
import type { PointNumber } from '../state/pointsHash';
import { useReadingText } from './readingText';

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
 * Marcação de pontos pela leitura (decisão 0051): o número que o próximo ponto recebe (null com os
 * três marcados), o ponto marcado sob o cursor, se houver, e o que fazer ao marcar.
 */
export interface ReadoutMarking {
  next: PointNumber | null;
  /** Número do ponto marcado que o marcador cobre na posição dada (SVG), ou null. */
  markedAt: (svgX: number, svgY: number) => PointNumber | null;
  onMark: (direction: { altitude: number; azimuth: number }) => void;
}

/** Deslocamento máximo, em px, entre apertar e soltar o botão para contar como clique. */
const CLICK_SLOP = 4;

/**
 * Leitura da carta (decisão 0045): passar o mouse ou tocar mostra a altura, o azimute e quando o sol
 * passa pelo ponto (hora solar e datas; hora legal quando a carta mostra os analemas). Com
 * `marking`, um clique marca o ponto, e no toque a caixa ganha o botão "Marcar ponto" (decisão
 * 0051). Devolve os eventos para a moldura da carta, a marca do ponto (dentro do SVG) e a caixa
 * com a leitura.
 */
export function useChartReadout(
  site: Site,
  projection: Projection,
  hourLines: HourLinesMode,
  marking?: ReadoutMarking,
) {
  const { t } = useI18n();
  const text = useReadingText(hourLines);
  const [point, setPoint] = useState<ReadoutPoint | null>(null);
  const reading = useMemo(
    () => (point ? readDirection(site, point.zenith, point.azimuth) : null),
    [site, point],
  );
  const mark = (p: ReadoutPoint) =>
    marking?.onMark({ altitude: 90 - p.zenith, azimuth: p.azimuth });

  // Onde o botão (mouse) ou o dedo desceu: clique e toque sem arrastar (arrastar rola a página).
  const pressStart = useRef<{ x: number; y: number; touch: boolean } | null>(null);
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
      const touch = e.pointerType === 'touch';
      pressStart.current = touch || e.button === 0 ? { x: e.clientX, y: e.clientY, touch } : null;
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const start = pressStart.current;
      pressStart.current = null;
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      if (start.touch) {
        if (moved <= 10) setPoint(pointAt(e.currentTarget, projection, e.clientX, e.clientY, true));
        return;
      }
      // Mouse e caneta: o clique marca o ponto (decisão 0051), salvo em cima de um marcado.
      if (!marking || moved > CLICK_SLOP) return;
      const p = pointAt(e.currentTarget, projection, e.clientX, e.clientY, false);
      if (p && marking.markedAt(p.svgX, p.svgY) === null) mark(p);
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
    const legal = text.legal(reading);
    // Marcação (decisão 0051): o que um clique faz ali, ou o botão no toque.
    let action: ReactNode = null;
    if (marking) {
      const marked = marking.markedAt(point.svgX, point.svgY);
      if (marked !== null) {
        action = (
          <p className="readout-hint" data-testid="readout-mark-hint">
            {t('points.here', { n: marked })}
          </p>
        );
      } else if (marking.next === null) {
        action = (
          <p className="readout-hint readout-full" data-testid="readout-mark-hint">
            {t('points.full')}
          </p>
        );
      } else if (point.touch) {
        action = (
          <button
            type="button"
            className="btn small readout-mark"
            data-testid="readout-mark"
            // O toque no botão não move a leitura (os eventos da moldura ficam de fora).
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={() => {
              mark(point);
              setPoint(null);
            }}
          >
            {t('points.markButton')}
          </button>
        );
      } else {
        action = (
          <p className="readout-hint" data-testid="readout-mark-hint">
            {t('points.clickHint', { n: marking.next })}
          </p>
        );
      }
    }
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
          {t('readout.position', text.angles(90 - point.zenith, point.azimuth))}
        </p>
        <p data-testid="readout-sun">{text.sun(reading)}</p>
        {legal && <p data-testid="readout-legal">{legal}</p>}
        {action}
      </div>
    );
  }

  return { handlers, marker, box, point, reading };
}
