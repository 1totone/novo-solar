/**
 * Disposição do corte e da vista (F3.1): unidades em metros, altura da letra em metros do desenho
 * (cerca de 12 px na tela; 2,5 mm no papel na escala escolhida) e escalas de exportação.
 */
import type { Device, WindowGeometry } from '../../core/shading/geometry';
import { elevationDrawing, sectionDrawing, type Drawing } from './drawings';

/** Altura da letra no papel, em metros (2,5 mm), na exportação e na impressão em escala. */
export const PAPER_FONT_M = 0.0025;

export const SCALES = [10, 20, 25, 50, 100] as const;
export const DEFAULT_SCALE = 50;

export function scaleFromHash(text: string | undefined): number {
  const n = Number(text);
  return (SCALES as readonly number[]).includes(n) ? n : DEFAULT_SCALE;
}

export type DrawingParts = 'section' | 'elevation' | 'both';

export interface DrawingLayout {
  section: Drawing;
  elevation: Drawing;
  /** Deslocamento horizontal da vista, para ficar à direita do corte (com as duas partes). */
  offset: number;
  viewBox: { x: number; y: number; width: number; height: number };
  font: number;
  parts: DrawingParts;
}

/** Disposição do corte e da vista; `font` é a altura da letra em metros do desenho. */
export function drawingLayout(
  window: WindowGeometry,
  devices: readonly Device[],
  font: number,
  parts: DrawingParts = 'both',
): DrawingLayout {
  const section = sectionDrawing(window, devices);
  const elevation = elevationDrawing(window, devices);
  const gap = 0.12 * Math.max(window.width, window.height) + 8 * font;
  // Margem para os textos que passam das bordas (ângulos, cotas) e faixa do título embaixo.
  const pad = 4 * font;
  let minX: number;
  let maxX: number;
  let minY: number;
  let maxY: number;
  let offset = 0;
  if (parts === 'section') {
    ({ minX, maxX, minY, maxY } = section.bounds);
  } else if (parts === 'elevation') {
    ({ minX, maxX, minY, maxY } = elevation.bounds);
  } else {
    offset = section.bounds.maxX - elevation.bounds.minX + gap;
    minX = section.bounds.minX;
    maxX = elevation.bounds.maxX + offset;
    minY = Math.min(section.bounds.minY, elevation.bounds.minY);
    maxY = Math.max(section.bounds.maxY, elevation.bounds.maxY);
  }
  const titleBand = 2.6 * font;
  return {
    section,
    elevation,
    offset,
    viewBox: {
      x: minX - pad,
      y: -maxY - pad,
      width: maxX - minX + 2 * pad,
      height: maxY - minY + 2 * pad + titleBand,
    },
    font,
    parts,
  };
}

/** Corte e vista lado a lado para o papel: letra de 2,5 mm na escala dada; tamanho em cm. */
export function paperDrawing(
  window: WindowGeometry,
  devices: readonly Device[],
  scale: number,
): { font: number; width: number; height: number } {
  const font = PAPER_FONT_M * scale;
  const layout = drawingLayout(window, devices, font, 'both');
  return {
    font,
    width: (layout.viewBox.width * 100) / scale,
    height: (layout.viewBox.height * 100) / scale,
  };
}

/** Letra de cerca de 12 px na tela, para um desenho que ocupa `boxPx` de largura. */
export function screenFont(
  window: WindowGeometry,
  devices: readonly Device[],
  parts: DrawingParts,
  boxPx: number,
): number {
  const content = drawingLayout(window, devices, 0, parts).viewBox.width;
  return (12 * content) / Math.max(boxPx - 96, 100);
}
