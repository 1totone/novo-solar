/**
 * Mapa mês × hora da sombra (F3.3): classes de cor e CSVs. O cálculo é do núcleo
 * (src/core/shading/hourly.ts); aqui só a apresentação.
 */
import { HOURS_PER_YEAR, type HourlyShading, type MonthHourMap } from '../../core/shading/hourly';
import { csvDocument } from '../export/csv';

/**
 * Cores das 6 classes, do 0% ao 100% da janela à sombra: rampa de um matiz (OKLCH, matiz 215°,
 * luminosidade de 0,935 a 0,43, passos de pelo menos 0,06); a ponta clara recua para o fundo, como
 * num mapa de calor, e a tabela traz os números (decisão 0030; tests/acessibilidade/paleta.test.ts).
 */
export const MAP_COLORS = [
  '#d4eff6',
  '#a1d8e6',
  '#70bdcf',
  '#409db2',
  '#067e93',
  '#005b6d',
] as const;

/**
 * Classe do percentual sombreado com sol na janela: 0 (0%), 1 (até 25%), 2 (até 50%), 3 (até 75%),
 * 4 (abaixo de 100%) e 5 (100%), os níveis das curvas da carta; null sem sol na janela.
 */
export function shadeClass(s: number | null): number | null {
  if (s === null) return null;
  if (s <= 1e-9) return 0;
  if (s >= 1 - 1e-9) return 5;
  if (s <= 0.25) return 1;
  if (s <= 0.5) return 2;
  if (s <= 0.75) return 3;
  return 4;
}

/** Letra do mapa, em px (1 unidade do SVG = 1 px). */
export const MAP_FONT = 12;
/** Horas marcadas no eixo (limites das colunas). */
export const MAP_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/** Disposição do mapa para uma largura em px. */
export function mapLayout(width: number) {
  const left = 2.9 * MAP_FONT;
  const right = 0.8 * MAP_FONT;
  const top = 0.5 * MAP_FONT;
  const bottom = 3.2 * MAP_FONT;
  const cellW = Math.max(6, (width - left - right) / 24);
  const cellH = Math.min(22, Math.max(15, 0.85 * cellW));
  return {
    left,
    top,
    cellW,
    cellH,
    width: left + 24 * cellW + right,
    height: top + 12 * cellH + bottom,
  };
}

const percent = (v: number) => Math.round(v * 1000) / 10;

/** CSV do mapa: para cada mês, o percentual à sombra com sol na janela e a exposição. */
export function mapCsv(map: MonthHourMap, header: string[], months: string[]): string {
  const hours = Array.from({ length: 24 }, (_, h) => String(h + 1));
  const rows: (string | number | null)[][] = [];
  map.shadedWhenExposed.forEach((row, m) => {
    rows.push([months[m]!, 'sombra_%', ...row.map((v) => (v === null ? null : percent(v)))]);
    rows.push([months[m]!, 'sol_na_janela_%', ...map.exposure[m]!.map(percent)]);
  });
  return csvDocument(header, ['mes', 'grandeza', ...hours], rows);
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** CSV hora a hora (8760 linhas, na ordem do EPW), com as grandezas da spec 07, seção 7.6. */
export function hourlyCsv(hourly: HourlyShading, header: string[]): string {
  const rows: number[][] = [];
  let i = 0;
  DAYS_IN_MONTH.forEach((days, m) => {
    for (let d = 1; d <= days; d++) {
      for (let h = 1; h <= 24; h++, i++) {
        rows.push([
          m + 1,
          d,
          h,
          hourly.sunlit[i]!,
          hourly.exposure[i]!,
          hourly.sunlitIncidence[i]!,
          hourly.incidence[i]!,
        ]);
      }
    }
  });
  if (i !== HOURS_PER_YEAR) throw new Error('ano de referência com 8760 horas');
  return csvDocument(
    header,
    [
      'mes',
      'dia',
      'hora',
      'fracao_ensolarada',
      'sol_na_janela',
      'incidencia_ensolarada',
      'incidencia_sem_protecao',
    ],
    rows,
  );
}
