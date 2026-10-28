/**
 * Fração ensolarada hora a hora e mapa mês × hora (F3.3).
 *
 * Especificação: docs/spec/07-mascara-pela-geometria.md, seção 7.6. Ano de referência (2026, 8760
 * horas); a hora h (1 a 24) do EPW é o intervalo [h − 1, h] em hora legal, no fuso do arquivo,
 * dividido em N subintervalos, com o sol no meio de cada um (padrão, N = 6) ou no fim (opção
 * "end", os instantes do EnergyPlus). Posição do sol: SPA, geométrica (spec 02, seção 2.4).
 *
 * As posições do sol dependem só do local: sunSamples calcula as 52 560 do ano uma vez, e
 * hourlyShading recalcula a sombra para cada geometria.
 *
 * Validação: pvlib e shapely no ano inteiro (tests/referencia/fracaoEnsolarada.test.ts).
 */
import type { Site } from '../chart/sunChart';
import { REFERENCE_YEAR } from '../solar/constants';
import { solarPosition } from '../solar/spa';
import { localStandardToUtc } from '../solar/time';
import type { Scene } from './geometry';
import { facadeFromEnu, shadedFraction, sunOnWindow } from './shadedFraction';

const RAD = Math.PI / 180;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const HOURS_PER_YEAR = 8760;

/** Instante de cada amostra no seu subintervalo: meio (padrão) ou fim (como o EnergyPlus). */
export type SampleTime = 'middle' | 'end';

export interface SunSamplesOptions {
  /** Amostras por hora (padrão 6, de 10 min). */
  samplesPerHour?: number;
  at?: SampleTime;
}

/** Direções do sol (Leste, Norte, Cima) das amostras do ano, na ordem dia, hora, amostra. */
export interface SunSamples {
  samplesPerHour: number;
  at: SampleTime;
  east: Float64Array;
  north: Float64Array;
  up: Float64Array;
}

/** Índice (0 a 8759) da linha do EPW de um dia e hora (1 a 24) do ano de referência. */
export function hourIndex(month: number, day: number, hour: number): number {
  if (!(Number.isInteger(month) && month >= 1 && month <= 12))
    throw new RangeError('invalid month');
  if (!(Number.isInteger(day) && day >= 1 && day <= DAYS_IN_MONTH[month - 1]!)) {
    throw new RangeError('invalid day');
  }
  if (!(Number.isInteger(hour) && hour >= 1 && hour <= 24)) throw new RangeError('invalid hour');
  const before = DAYS_IN_MONTH.slice(0, month - 1).reduce((a, b) => a + b, 0);
  return (before + day - 1) * 24 + hour - 1;
}

/** Posições do sol em todas as amostras do ano de referência, para um local. */
export function sunSamples(site: Site, options: SunSamplesOptions = {}): SunSamples {
  const n = options.samplesPerHour ?? 6;
  if (!(Number.isInteger(n) && n >= 1))
    throw new RangeError('samplesPerHour must be a positive integer');
  const at = options.at ?? 'middle';
  const offset = at === 'middle' ? 0.5 : 1;
  const size = HOURS_PER_YEAR * n;
  const east = new Float64Array(size);
  const north = new Float64Array(size);
  const up = new Float64Array(size);
  let j = 0;
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= DAYS_IN_MONTH[month - 1]!; day++) {
      for (let hour = 1; hour <= 24; hour++) {
        for (let k = 0; k < n; k++) {
          const time = hour - 1 + (k + offset) / n;
          const utc = localStandardToUtc(REFERENCE_YEAR, month, day, time, site.timeZone);
          const p = solarPosition(utc, site.latitude, site.longitude, site.elevation);
          const h = p.elevation * RAD;
          const a = p.azimuth * RAD;
          east[j] = Math.cos(h) * Math.sin(a);
          north[j] = Math.cos(h) * Math.cos(a);
          up[j] = Math.sin(h);
          j++;
        }
      }
    }
  }
  return { samplesPerHour: n, at, east, north, up };
}

/** Grandezas de cada hora do ano (seção 7.6), na ordem das linhas do EPW. */
export interface HourlyShading {
  /** Fração ensolarada média da hora (0 com o sol fora da janela). */
  sunlit: Float64Array;
  /** Fração da hora com o sol na janela (acima do horizonte e diante da fachada). */
  exposure: Float64Array;
  /** Média de cos θ · fração ensolarada: a radiação direta no vidro é DNI vezes este fator. */
  sunlitIncidence: Float64Array;
  /** Média de cos θ com o sol na janela, sem a proteção. */
  incidence: Float64Array;
}

/** Fração ensolarada hora a hora de uma cena numa fachada de orientação dada. */
export function hourlyShading(
  samples: SunSamples,
  scene: Scene,
  orientation: number,
): HourlyShading {
  const n = samples.samplesPerHour;
  const sunlit = new Float64Array(HOURS_PER_YEAR);
  const exposure = new Float64Array(HOURS_PER_YEAR);
  const sunlitIncidence = new Float64Array(HOURS_PER_YEAR);
  const incidence = new Float64Array(HOURS_PER_YEAR);
  for (let i = 0; i < HOURS_PER_YEAR; i++) {
    let lit = 0;
    let exposed = 0;
    let litCos = 0;
    let cos = 0;
    for (let k = 0; k < n; k++) {
      const j = i * n + k;
      const s = facadeFromEnu(samples.east[j]!, samples.north[j]!, samples.up[j]!, orientation);
      if (!sunOnWindow(s)) continue;
      const f = 1 - shadedFraction(scene, s);
      exposed += 1;
      cos += s.y;
      lit += f;
      litCos += s.y * f;
    }
    sunlit[i] = lit / n;
    exposure[i] = exposed / n;
    sunlitIncidence[i] = litCos / n;
    incidence[i] = cos / n;
  }
  return { sunlit, exposure, sunlitIncidence, incidence };
}

/** Médias de cada mês (linhas 0 a 11) e hora (colunas 0 a 23, horas 1 a 24 do EPW). */
export interface MonthHourMap {
  sunlit: number[][];
  exposure: number[][];
  /** Percentual sombreado pela proteção com o sol na janela: 1 − F̄_e / Ē; null sem sol na janela. */
  shadedWhenExposed: (number | null)[][];
}

export function monthHourMap(hourly: HourlyShading): MonthHourMap {
  const sunlit: number[][] = [];
  const exposure: number[][] = [];
  const shadedWhenExposed: (number | null)[][] = [];
  let first = 0;
  DAYS_IN_MONTH.forEach((days) => {
    const lit = new Array<number>(24).fill(0);
    const exp = new Array<number>(24).fill(0);
    for (let d = 0; d < days; d++) {
      for (let h = 0; h < 24; h++) {
        const i = first + d * 24 + h;
        lit[h]! += hourly.sunlit[i]!;
        exp[h]! += hourly.exposure[i]!;
      }
    }
    first += days * 24;
    const litMean = lit.map((v) => v / days);
    const expMean = exp.map((v) => v / days);
    sunlit.push(litMean);
    exposure.push(expMean);
    shadedWhenExposed.push(expMean.map((e, h) => (e > 0 ? 1 - litMean[h]! / e : null)));
  });
  return { sunlit, exposure, shadedWhenExposed };
}
