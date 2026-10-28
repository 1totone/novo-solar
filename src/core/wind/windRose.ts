/**
 * Rosa dos ventos (F2.5): frequência por setor e classe de velocidade, calmarias e velocidade
 * média por setor, com filtros por estação e período do dia; no F4.4, filtro pela condição térmica
 * das horas e velocidade corrigida para a altura e o terreno.
 *
 * Especificação: docs/spec/06-vento.md. Validação: tests/referencia/rosaDosVentos.test.ts e
 * tests/referencia/ventoAvancado.test.ts (cálculos independentes em Python e o EnergyPlus) e
 * windRose.test.ts.
 */
import { HOUR_CLASS } from '../comfort/classification';
import type { EpwData } from '../epw/parseEpw';

/** Limite inferior de cada classe de velocidade (m/s); abaixo do primeiro é calmaria. */
export const SPEED_CLASSES = [0.5, 2, 4, 6] as const;
export const CALM_LIMIT = SPEED_CLASSES[0];

export type SeasonKey = 'dez-fev' | 'mar-mai' | 'jun-ago' | 'set-nov';
export const SEASON_MONTHS: Record<SeasonKey, readonly number[]> = {
  'dez-fev': [12, 1, 2],
  'mar-mai': [3, 4, 5],
  'jun-ago': [6, 7, 8],
  'set-nov': [9, 10, 11],
};

export type DayPeriodKey = 'madrugada' | 'manha' | 'tarde' | 'noite';
/** Horas do arquivo (1 a 24) de cada período do dia. */
export const DAY_PERIOD_HOURS: Record<DayPeriodKey, readonly [number, number]> = {
  madrugada: [1, 6],
  manha: [7, 12],
  tarde: [13, 18],
  noite: [19, 24],
};

/** Condição térmica (seção 6.3): só as linhas do arquivo com a classe dada. */
export interface ThermalFilter {
  /** Classe de cada linha do arquivo (HOUR_CLASS), da classificação das horas (spec 08). */
  classes: ArrayLike<number>;
  keep: 'hot' | 'cold' | 'neutral';
}

export interface WindRoseOptions {
  sectors: 8 | 16;
  season?: SeasonKey;
  period?: DayPeriodKey;
  thermal?: ThermalFilter;
  /** Fator k da altura e do terreno (seção 6.7), aplicado a todas as velocidades; padrão 1. */
  speedFactor?: number;
}

export interface WindRose {
  sectors: number;
  /** Horas do arquivo no filtro. */
  hours: number;
  /** Horas com direção e velocidade presentes. */
  valid: number;
  /** Porcentagem de calmaria (abaixo de 0,5 m/s) nas horas válidas. */
  calm: number;
  /** Porcentagem das horas válidas por setor (0 = N, sentido horário) e classe de velocidade. */
  frequency: number[][];
  /** Velocidade média das horas sem calmaria de cada setor (m/s), ou null sem horas. */
  meanSpeed: (number | null)[];
}

/** Setor (0 = N, sentido horário) de uma direção de onde o vento sopra. */
export function sectorOf(direction: number, sectors: number): number {
  const w = 360 / sectors;
  const d = ((direction % 360) + 360) % 360;
  return Math.floor(((d + w / 2) % 360) / w);
}

/** Classe de velocidade (0 a 3) de uma hora sem calmaria. */
export function speedClass(speed: number): number {
  let k = 0;
  while (k + 1 < SPEED_CLASSES.length && speed >= SPEED_CLASSES[k + 1]!) k++;
  return k;
}

export function windRose(epw: EpwData, options: WindRoseOptions): WindRose {
  const n = options.sectors;
  const months = options.season ? SEASON_MONTHS[options.season] : undefined;
  const range = options.period ? DAY_PERIOD_HOURS[options.period] : undefined;
  const thermal = options.thermal;
  if (thermal && thermal.classes.length !== epw.hours) {
    throw new RangeError('thermal classes must have one value per hour of the file');
  }
  const keep = thermal ? HOUR_CLASS[thermal.keep] : undefined;
  const factor = options.speedFactor ?? 1;
  if (!(factor > 0 && Number.isFinite(factor))) throw new RangeError('speedFactor must be > 0');
  const direction = epw.fields.windDirection;
  const speed = epw.fields.windSpeed;
  const counts = Array.from({ length: n }, () => new Array<number>(SPEED_CLASSES.length).fill(0));
  const sum = new Array<number>(n).fill(0);
  const count = new Array<number>(n).fill(0);
  let hours = 0;
  let valid = 0;
  let calm = 0;
  for (let i = 0; i < epw.hours; i++) {
    if (months && !months.includes(epw.month[i]!)) continue;
    const h = epw.hour[i]!;
    if (range && (h < range[0] || h > range[1])) continue;
    if (thermal && thermal.classes[i] !== keep) continue;
    hours++;
    const d = direction[i]!;
    const v = speed[i]! * factor;
    if (Number.isNaN(d) || Number.isNaN(v)) continue;
    valid++;
    if (v < CALM_LIMIT) {
      calm++;
      continue;
    }
    const k = sectorOf(d, n);
    counts[k]![speedClass(v)]!++;
    sum[k]! += v;
    count[k]!++;
  }
  const pct = (x: number) => (valid > 0 ? (100 * x) / valid : 0);
  return {
    sectors: n,
    hours,
    valid,
    calm: pct(calm),
    frequency: counts.map((row) => row.map(pct)),
    meanSpeed: sum.map((s, k) => (count[k]! > 0 ? s / count[k]! : null)),
  };
}

/**
 * Resolução da velocidade no arquivo: o maior passo entre 1; 0,5; 0,1 e 0,01 m/s do qual todas
 * as velocidades presentes são múltiplas (spec 06, seção 6.4).
 */
export function speedResolution(epw: EpwData): number {
  const speeds = epw.fields.windSpeed;
  for (const r of [1, 0.5, 0.1, 0.01]) {
    let ok = true;
    for (let i = 0; i < epw.hours && ok; i++) {
      const v = speeds[i]!;
      if (Number.isNaN(v)) continue;
      const q = v / r;
      if (Math.abs(q - Math.round(q)) > 1e-6) ok = false;
    }
    if (ok) return r;
  }
  return 0.01;
}
