import { describe, expect, it } from 'vitest';
import type { CellStats, OverlayCell } from '../../core/overlay/overlay';
import { overlayCsv, windCsv } from './dataCsv';

describe('CSV dos dados mostrados', () => {
  it('células: período, intervalo em hora legal, estatísticas e faixa', () => {
    const cells: OverlayCell[] = [
      { period: 3, hour: 14, start: 13, end: 14, polygon: [] },
      { period: 3, hour: 6, start: 5, end: 6, polygon: [] },
    ];
    const stats = new Map<string, CellStats>([
      ['3-14', { n: 15, mean: 612.4, min: 120, max: 980 }],
    ]);
    const text = overlayCsv({
      header: ['Local: X', 'Separador: vírgula; decimal: ponto.'],
      cells,
      stats,
      mode: 'mean',
      limits: [250, 500, 850, 1000],
    });
    const lines = text.split('\n');
    expect(lines[2]).toBe(
      'periodo,primeiro_dia,ultimo_dia,hora_do_arquivo,inicio_hora_legal,fim_hora_legal,horas,media,minima,maxima,fracao_acima_do_limiar,faixa',
    );
    expect(lines[3]).toBe('3,01/02,15/02,6,5,6,0,,,,,'); // célula sem dados
    expect(lines[4]).toBe('3,01/02,15/02,14,13,14,15,612.4,120,980,,3');
  });

  it('rosa: setores, classes, total, velocidade e calmaria', () => {
    const text = windCsv({
      header: ['Separador: vírgula; decimal: ponto.'],
      rose: {
        sectors: 8,
        hours: 10,
        valid: 10,
        calm: 10,
        frequency: Array.from({ length: 8 }, (_, k) => (k === 4 ? [0, 90, 0, 0] : [0, 0, 0, 0])),
        meanSpeed: Array.from({ length: 8 }, (_, k) => (k === 4 ? 2.5 : null)),
      },
      sectorNames: ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'],
    });
    const lines = text.split('\n');
    expect(lines[6]).toBe('S,180,0,90,0,0,90,2.5');
    expect(lines[10]).toBe('calmaria,,,,,,10,');
  });
});
