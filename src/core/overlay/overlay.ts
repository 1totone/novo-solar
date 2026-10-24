/**
 * Sobreposição de dados climáticos na carta (F2.4): células como áreas.
 *
 * Especificação: docs/spec/05-sobreposicao-de-dados.md. Cada célula é a região da carta ocupada
 * pelo sol nos dias de um período (quinzena) e no intervalo de tempo que o valor de uma hora do
 * EPW representa: radiação de h − 1 a h (energia integrada), temperatura e umidade de h − 0,5 a
 * h + 0,5 (valor no instante h). Hora legal com o fuso do arquivo (spec 02, seção 2.2).
 *
 * Validação: tests/referencia/sobreposicao.test.ts (cada hora do EPW na sua célula, Florianópolis
 * e Manaus, com teste negativo de fuso) e overlay.test.ts.
 */
import type { Site } from '../chart/sunChart';
import type { EpwData, EpwFieldName } from '../epw/parseEpw';
import { REFERENCE_YEAR } from '../solar/constants';
import { solarPosition } from '../solar/spa';

export type Semester = 1 | 2;

/** 'integrated': radiação (h − 1 a h); 'instant': temperatura e umidade (h − 0,5 a h + 0,5). */
export type OverlayTiming = 'integrated' | 'instant';

export interface Period {
  /** 1 a 20: 1 a 10 no primeiro semestre (22/12 a 21/06), 11 a 20 no segundo. */
  index: number;
  semester: Semester;
  first: { month: number; day: number };
  last: { month: number; day: number };
}

// Spec 05, seção 5.2: [mês, dia] do primeiro e do último dia de cada período.
const LIMITS: [number, number, number, number][] = [
  [12, 22, 1, 15],
  [1, 16, 1, 31],
  [2, 1, 2, 15],
  [2, 16, 2, 28],
  [3, 1, 3, 15],
  [3, 16, 3, 31],
  [4, 1, 4, 15],
  [4, 16, 4, 30],
  [5, 1, 5, 15],
  [5, 16, 6, 21],
  [6, 22, 7, 15],
  [7, 16, 7, 31],
  [8, 1, 8, 15],
  [8, 16, 8, 31],
  [9, 1, 9, 15],
  [9, 16, 9, 30],
  [10, 1, 10, 15],
  [10, 16, 10, 31],
  [11, 1, 11, 15],
  [11, 16, 12, 21],
];

export const PERIODS: Period[] = LIMITS.map(([m1, d1, m2, d2], i) => ({
  index: i + 1,
  semester: i < 10 ? 1 : 2,
  first: { month: m1, day: d1 },
  last: { month: m2, day: d2 },
}));

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const STEP_MINUTES = 5;
/** Ângulo zenital acima do qual uma hora da trajetória de borda é tratada como noite. */
const NIGHT_ZENITH = 100;

/** Dia do ano (0 a 364) de uma data do ano de referência (sem 29/02). */
function dayOfYear(month: number, day: number): number {
  return (Date.UTC(REFERENCE_YEAR, month - 1, day) - Date.UTC(REFERENCE_YEAR, 0, 1)) / MS_PER_DAY;
}

const PERIOD_BY_DAY: Period[] = (() => {
  const out: Period[] = [];
  for (const p of PERIODS) {
    const a = dayOfYear(p.first.month, p.first.day);
    const b = dayOfYear(p.last.month, p.last.day);
    for (let k = a; k !== (b + 1) % 365; k = (k + 1) % 365) out[k] = p;
  }
  return out;
})();

/** Período de uma data do arquivo; 29/02 entra no período de 16 a 28/02 (spec 05, seção 5.2). */
export function periodOf(month: number, day: number): Period {
  if (month === 2 && day === 29) return PERIOD_BY_DAY[dayOfYear(2, 28)]!;
  return PERIOD_BY_DAY[dayOfYear(month, day)]!;
}

/** Instante UTC (ms) da meia-noite legal de um dia do ano de referência, no fuso dado. */
function localMidnight(dayIndex: number, timeZone: number): number {
  return Date.UTC(REFERENCE_YEAR, 0, 1) + dayIndex * MS_PER_DAY - timeZone * MS_PER_HOUR;
}

export interface SkyDirection {
  zenith: number;
  azimuth: number;
}

export interface OverlayCell {
  period: number;
  /** Hora do EPW (1 a 24). */
  hour: number;
  /** Intervalo em hora legal que o valor representa. */
  start: number;
  end: number;
  /** Contorno da célula (direções do céu), fechado implicitamente. */
  polygon: SkyDirection[];
}

const RAD = Math.PI / 180;

/** Ponto médio de duas direções na esfera (média dos vetores unitários, normalizada). */
function midpoint(p: SkyDirection, q: SkyDirection): SkyDirection {
  const vec = (d: SkyDirection) => {
    const z = d.zenith * RAD;
    const a = d.azimuth * RAD;
    return [Math.sin(z) * Math.sin(a), Math.sin(z) * Math.cos(a), Math.cos(z)] as const;
  };
  const u = vec(p);
  const v = vec(q);
  const x = u[0] + v[0];
  const y = u[1] + v[1];
  const w = u[2] + v[2];
  const azimuth = Math.atan2(x, y) / RAD;
  return {
    zenith: Math.acos(w / Math.hypot(x, y, w)) / RAD,
    azimuth: azimuth < 0 ? azimuth + 360 : azimuth,
  };
}

/**
 * Células de um semestre. Limites de cada célula (spec 05, seção 5.1): nas bordas entre períodos,
 * a curva a meio caminho entre as trajetórias do último dia de um período e do primeiro do
 * seguinte (ponto médio, na esfera, das posições dos dois dias na mesma hora legal), para que as
 * células vizinhas se encostem e as horas do primeiro e do último dia fiquem dentro da célula; nas
 * outras bordas, as curvas de hora legal constante no início e no fim do intervalo. Células
 * inteiramente abaixo do horizonte são omitidas.
 */
export function overlayCells(site: Site, semester: Semester, timing: OverlayTiming): OverlayCell[] {
  const periods = PERIODS.filter((p) => p.semester === semester);
  const sun = (utc: number): SkyDirection => {
    const p = solarPosition(utc, site.latitude, site.longitude, site.elevation);
    return { zenith: p.zenith, azimuth: p.azimuth };
  };
  // Horas legais dos limites dos intervalos: T_j, j = 0..24; a célula da hora h vai de T_(h−1) a T_h.
  const offset = timing === 'integrated' ? 0 : 0.5;
  const stepsPerHour = 60 / STEP_MINUTES;

  // Dias do semestre em ordem, com o período de cada um.
  const days: { index: number; period: Period }[] = [];
  for (const p of periods) {
    const a = dayOfYear(p.first.month, p.first.day);
    const b = dayOfYear(p.last.month, p.last.day);
    for (let k = a; k !== (b + 1) % 365; k = (k + 1) % 365) days.push({ index: k, period: p });
  }

  // Trajetória de um dia, de 5 em 5 minutos, de T_0 a T_24. Nas horas com o sol mais de 10°
  // abaixo do horizonte nas duas pontas, os pontos internos repetem a ponta: essas células ficam
  // inteiras abaixo do horizonte e não são desenhadas (economiza metade das contas).
  const trajectory = (dayIndex: number) => {
    const midnight = localMidnight(dayIndex, site.timeZone);
    const at = (k: number) => sun(midnight + (offset + k / stepsPerHour) * MS_PER_HOUR);
    const out: SkyDirection[] = [at(0)];
    for (let hour = 1; hour <= 24; hour++) {
      const start = out[out.length - 1]!;
      const end = at(hour * stepsPerHour);
      const night = start.zenith > NIGHT_ZENITH && end.zenith > NIGHT_ZENITH;
      for (let k = 1; k < stepsPerHour; k++) {
        out.push(night ? start : at((hour - 1) * stepsPerHour + k));
      }
      out.push(end);
    }
    return out;
  };
  const between = (dayBefore: number, dayAfter: number) => {
    const a = trajectory((dayBefore + 365) % 365);
    const b = trajectory(dayAfter % 365);
    return a.map((p, k) => midpoint(p, b[k]!));
  };
  const boundaries = periods.map((p) => {
    const first = dayOfYear(p.first.month, p.first.day);
    return between(first - 1, first);
  });
  const lastPeriod = periods[periods.length - 1]!;
  const lastDay = dayOfYear(lastPeriod.last.month, lastPeriod.last.day);
  boundaries.push(between(lastDay, lastDay + 1));

  // Posições de cada dia do semestre nas horas T_j.
  const atBoundaryTimes = days.map((d) => {
    const midnight = localMidnight(d.index, site.timeZone);
    return Array.from({ length: 25 }, (_, j) => sun(midnight + (offset + j) * MS_PER_HOUR));
  });

  const cells: OverlayCell[] = [];
  periods.forEach((p, i) => {
    const before = boundaries[i]!;
    const after = boundaries[i + 1]!;
    const own = atBoundaryTimes.filter((_, k) => days[k]!.period === p);
    for (let hour = 1; hour <= 24; hour++) {
      const a = (hour - 1) * stepsPerHour;
      const b = hour * stepsPerHour;
      const polygon: SkyDirection[] = [
        ...before.slice(a, b + 1),
        ...own.map((d) => d[hour]!),
        ...after.slice(a, b + 1).reverse(),
        ...own.map((d) => d[hour - 1]!).reverse(),
      ];
      if (polygon.every((v) => v.zenith > 90)) continue;
      cells.push({ period: p.index, hour, start: hour - 1 + offset, end: hour + offset, polygon });
    }
  });
  return cells;
}

/** Grandezas que podem ser sobrepostas à carta. */
export type OverlayQuantity =
  'dryBulb' | 'relativeHumidity' | 'globalHorizontal' | 'directNormal' | 'diffuseHorizontal';

export interface QuantityInfo {
  timing: OverlayTiming;
  unit: string;
  /** Limites padrão das 5 faixas (4 valores, em ordem crescente). */
  bands: readonly number[];
}

/**
 * Faixas padrão: TBS, GHI e DNI como no SOL-AR 6.2 (a última faixa do 6.2 para radiação ia até
 * 1300 W/m²; aqui fica "acima de 1000"); UR e DHI não existiam no 6.2 (proposta do F2.4).
 */
export const OVERLAY_QUANTITIES: Record<OverlayQuantity, QuantityInfo> = {
  dryBulb: { timing: 'instant', unit: '°C', bands: [10, 14, 20, 25] },
  relativeHumidity: { timing: 'instant', unit: '%', bands: [30, 50, 70, 90] },
  globalHorizontal: { timing: 'integrated', unit: 'Wh/m²', bands: [250, 500, 850, 1000] },
  directNormal: { timing: 'integrated', unit: 'Wh/m²', bands: [250, 500, 850, 1000] },
  diffuseHorizontal: { timing: 'integrated', unit: 'Wh/m²', bands: [100, 200, 300, 400] },
};

export interface CellStats {
  /** Número de horas com valor (ausentes não entram). */
  n: number;
  mean: number;
  min: number;
  max: number;
  /** Fração das horas com valor acima do limiar (só com limiar). */
  above?: number;
}

/** Chave de uma célula nos mapas de estatísticas: "período-hora". */
export const cellKey = (period: number, hour: number) => `${period}-${hour}`;

/**
 * Estatísticas de cada célula (todas as 20 quinzenas): média, mínimo e máximo das horas do arquivo
 * que caem nela (uma por dia do período) e, com limiar, a fração acima dele (estritamente).
 */
export function cellStatistics(
  epw: EpwData,
  field: EpwFieldName,
  threshold?: number,
): Map<string, CellStats> {
  const acc = new Map<
    string,
    { n: number; sum: number; min: number; max: number; above: number }
  >();
  const values = epw.fields[field];
  for (let i = 0; i < epw.hours; i++) {
    const v = values[i]!;
    if (Number.isNaN(v)) continue;
    const k = cellKey(periodOf(epw.month[i]!, epw.day[i]!).index, epw.hour[i]!);
    let a = acc.get(k);
    if (!a) {
      a = { n: 0, sum: 0, min: Infinity, max: -Infinity, above: 0 };
      acc.set(k, a);
    }
    a.n++;
    a.sum += v;
    if (v < a.min) a.min = v;
    if (v > a.max) a.max = v;
    if (threshold !== undefined && v > threshold) a.above++;
  }
  const out = new Map<string, CellStats>();
  for (const [k, a] of acc) {
    const s: CellStats = { n: a.n, mean: a.sum / a.n, min: a.min, max: a.max };
    if (threshold !== undefined) s.above = a.above / a.n;
    out.set(k, s);
  }
  return out;
}

/** Classe (0 a limites.length) de um valor: até o 1º limite, entre limites (aberto à esquerda), acima do último. */
export function bandIndex(value: number, limits: readonly number[]): number {
  let k = 0;
  while (k < limits.length && value > limits[k]!) k++;
  return k;
}

/**
 * Percentis (interpolação linear entre as posições vizinhas, como o padrão do numpy) de um campo
 * nas horas com sol acima do horizonte no instante que o valor representa.
 */
export function filePercentiles(
  epw: EpwData,
  field: EpwFieldName,
  timing: OverlayTiming,
  percentiles: readonly number[],
): number[] {
  const { latitude, longitude, elevation, timeZone } = epw.location;
  const values: number[] = [];
  const at = timing === 'integrated' ? -0.5 : 0;
  for (let i = 0; i < epw.hours; i++) {
    const v = epw.fields[field][i]!;
    if (Number.isNaN(v)) continue;
    const month = epw.month[i]!;
    const day = epw.day[i]!;
    const d = month === 2 && day === 29 ? dayOfYear(2, 28) : dayOfYear(month, day);
    const utc = localMidnight(d, timeZone) + (epw.hour[i]! + at) * MS_PER_HOUR;
    if (solarPosition(utc, latitude, longitude, elevation).zenith < 90) values.push(v);
  }
  values.sort((a, b) => a - b);
  return percentiles.map((p) => {
    if (values.length === 0) return NaN;
    const pos = (p / 100) * (values.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, values.length - 1);
    return values[lo]! + (values[hi]! - values[lo]!) * (pos - lo);
  });
}
