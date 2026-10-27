import { createContext, useContext } from 'react';
import {
  makeProjection,
  type ChartPoint,
  type Projection,
  type ProjectionKind,
} from '../../core/chart/projection';

/**
 * Projeção da carta em uso (F4.3), para as camadas desenhadas dentro da SunChart: dados, máscara,
 * transferidor, curvas da Fase 3, período e desenho à mão.
 */
export const ChartProjectionContext = createContext<Projection>(makeProjection('stereographic'));

export const useChartProjection = () => useContext(ChartProjectionContext);

export interface ChartFrame {
  /** viewBox do SVG (y para baixo). */
  viewBox: [number, number, number, number];
  /** Largura e altura impressas, em unidades do raio pedido (R). */
  span: { x: number; y: number };
}

const AZIMUTHAL: ChartFrame = { viewBox: [-1.32, -1.32, 2.64, 2.64], span: { x: 2.64, y: 2.64 } };
const CYLINDRICAL: ChartFrame = {
  viewBox: [-1.14, -1.1, 2.28, 1.36],
  span: { x: 2.28, y: 1.36 },
};

/** Moldura da carta: a carta cilíndrica tem 2 × 1 unidades e rótulos embaixo e à esquerda. */
export function chartFrame(kind: ProjectionKind): ChartFrame {
  return kind === 'cylindrical' ? CYLINDRICAL : AZIMUTHAL;
}

/** Ponto da carta (y para cima) em coordenadas do SVG (y para baixo). */
export const svgXY = (p: ChartPoint): [number, number] => [p.x, -p.y];

/** Caminho SVG de polilinhas da carta; com `closed`, cada uma é fechada (Z). */
export function pathD(lines: ChartPoint[][], closed = false): string {
  return lines
    .filter((l) => l.length > 1)
    .map(
      (l) =>
        l.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(5)},${(-p.y).toFixed(5)}`).join('') +
        (closed ? 'Z' : ''),
    )
    .join('');
}
