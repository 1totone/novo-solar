import {
  bandIndex,
  cellKey,
  PERIODS,
  type CellStats,
  type OverlayCell,
} from '../../core/overlay/overlay';
import type { WindRose } from '../../core/wind/windRose';
import { csvDocument } from './csv';

const day = (d: { month: number; day: number }) =>
  `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}`;

/** Células desenhadas na carta: período, intervalo, estatísticas e faixa. */
export function overlayCsv({
  header,
  cells,
  stats,
  mode,
  limits,
}: {
  header: string[];
  cells: OverlayCell[];
  stats: Map<string, CellStats>;
  mode: 'mean' | 'frequency';
  /** Limites das faixas em uso (na unidade da grandeza; frações no modo de frequência). */
  limits: readonly number[];
}): string {
  const rows = [...cells]
    .sort((a, b) => a.period - b.period || a.hour - b.hour)
    .map((c) => {
      const p = PERIODS[c.period - 1]!;
      const s = stats.get(cellKey(c.period, c.hour));
      const value = s ? (mode === 'frequency' ? s.above : s.mean) : undefined;
      return [
        c.period,
        day(p.first),
        day(p.last),
        c.hour,
        c.start,
        c.end,
        s?.n ?? 0,
        s?.mean ?? null,
        s?.min ?? null,
        s?.max ?? null,
        mode === 'frequency' ? (s?.above ?? null) : null,
        value === undefined ? null : bandIndex(value, limits) + 1,
      ];
    });
  return csvDocument(
    header,
    [
      'periodo',
      'primeiro_dia',
      'ultimo_dia',
      'hora_do_arquivo',
      'inicio_hora_legal',
      'fim_hora_legal',
      'horas',
      'media',
      'minima',
      'maxima',
      'fracao_acima_do_limiar',
      'faixa',
    ],
    rows,
  );
}

/** Rosa dos ventos: frequência por setor e classe, total e velocidade média; calmaria no fim. */
export function windCsv({
  header,
  rose,
  sectorNames,
}: {
  header: string[];
  rose: WindRose;
  sectorNames: string[];
}): string {
  const w = 360 / rose.sectors;
  const rows: (string | number | null)[][] = rose.frequency.map((row, k) => [
    sectorNames[k]!,
    k * w,
    ...row,
    row.reduce((a, b) => a + b, 0),
    rose.meanSpeed[k] ?? null,
  ]);
  rows.push(['calmaria', null, null, null, null, null, rose.calm, null]);
  return csvDocument(
    header,
    [
      'setor',
      'centro_graus',
      'pct_0.5_a_2',
      'pct_2_a_4',
      'pct_4_a_6',
      'pct_6_ou_mais',
      'pct_total',
      'velocidade_media_m_s',
    ],
    rows,
  );
}
