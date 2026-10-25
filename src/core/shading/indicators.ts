/**
 * Indicadores de sombreamento: radiação direta incidente na janela, bloqueada nas horas quentes e
 * admitida nas horas frias, e comparação entre alternativas (F3.5).
 *
 * Especificação: docs/spec/09-indicadores.md (proposta, decisão 0021). A DNI do arquivo é a energia
 * da hora (h − 1, h]; supõe-se constante na hora, e a fração ensolarada de cada amostra é ponderada
 * pelo cos θ daquele instante (C_e da seção 7.6), com cos θ ≥ 0. Só radiação direta.
 *
 * Validação: memória de cálculo à mão (indicators.test.ts) e pvlib, shapely e a DNI do EPW no ano
 * inteiro (tests/referencia/indicadores.test.ts).
 */
import { HOUR_CLASS } from '../comfort/classification';
import type { Scene } from './geometry';
import {
  HOURS_PER_YEAR,
  hourIndex,
  hourlyShading,
  type HourlyShading,
  type SunSamples,
} from './hourly';

/** Linhas do arquivo climático: mês, dia e hora (1 a 24). */
export interface EpwRows {
  month: ArrayLike<number>;
  day: ArrayLike<number>;
  hour: ArrayLike<number>;
}

/**
 * DNI constante na hora inteira (padrão) ou só enquanto o sol está acima do horizonte, o que
 * conserva a energia da hora no nascer e no pôr do sol (seção 9.1).
 */
export type DniWithinHour = 'constant' | 'whileSunUp';

export interface HourlyBeamOptions {
  within?: DniWithinHour;
  /** Fração das amostras de cada hora com o sol acima do horizonte (sunUpFraction); exigida com 'whileSunUp'. */
  sunUp?: Float64Array;
}

/** Radiação direta na janela em cada linha do arquivo (Wh por m² de janela); NaN sem DNI. */
export interface HourlyBeam {
  /** Sem a proteção: DNI · C. */
  incident: Float64Array;
  /** Com a proteção: DNI · C_e. */
  admitted: Float64Array;
}

export interface ClassTotals {
  /** Σ E₀ (Wh/m²). */
  incident: number;
  /** Σ E (Wh/m²). */
  admitted: number;
  /** Σ (E₀ − E) (Wh/m²). */
  blocked: number;
  /** Linhas com DNI. */
  hours: number;
}

export interface BeamIndicators {
  byClass: { hot: ClassTotals; cold: ClassTotals; neutral: ClassTotals; none: ClassTotals };
  /** Fração bloqueada nas horas quentes; null se as horas quentes não recebem radiação direta. */
  blockedInHot: number | null;
  /** Fração admitida nas horas frias; null se as horas frias não recebem radiação direta. */
  admittedInCold: number | null;
  /** Linhas sem DNI, fora das somas. */
  missingDni: number;
}

/** Limiar do sol acima do horizonte (seno da altura), o mesmo do sol na janela (seção 7.2). */
const SUN_UP = 1e-5;
/** Tolerância da dominância entre alternativas (arredondamento das somas). */
const DOMINANCE_TOLERANCE = 1e-12;

/** Índice no ano de referência de cada linha do arquivo; 29 de fevereiro usa 28 de fevereiro (seção 9.4). */
export function referenceHourIndices(
  month: ArrayLike<number>,
  day: ArrayLike<number>,
  hour: ArrayLike<number>,
): Int32Array {
  const n = month.length;
  if (day.length !== n || hour.length !== n) throw new RangeError('rows must have the same length');
  const out = new Int32Array(n);
  for (let r = 0; r < n; r++) {
    const m = month[r]!;
    const d = m === 2 && day[r] === 29 ? 28 : day[r]!;
    out[r] = hourIndex(m, d, hour[r]!);
  }
  return out;
}

/** Fração das amostras de cada hora do ano com o sol acima do horizonte. */
export function sunUpFraction(samples: SunSamples): Float64Array {
  const n = samples.samplesPerHour;
  const out = new Float64Array(HOURS_PER_YEAR);
  for (let i = 0; i < HOURS_PER_YEAR; i++) {
    let up = 0;
    for (let k = 0; k < n; k++) if (samples.up[i * n + k]! >= SUN_UP) up++;
    out[i] = up / n;
  }
  return out;
}

/** Radiação direta incidente na janela, sem e com a proteção, em cada linha do arquivo (seção 9.1). */
export function hourlyBeam(
  shading: HourlyShading,
  rows: EpwRows,
  dni: ArrayLike<number>,
  options: HourlyBeamOptions = {},
): HourlyBeam {
  if (dni.length !== rows.month.length)
    throw new RangeError('DNI and rows must have the same length');
  const within = options.within ?? 'constant';
  if (within === 'whileSunUp' && !options.sunUp) {
    throw new RangeError("sunUp is required with 'whileSunUp'");
  }
  const index = referenceHourIndices(rows.month, rows.day, rows.hour);
  const incident = new Float64Array(dni.length);
  const admitted = new Float64Array(dni.length);
  for (let r = 0; r < dni.length; r++) {
    const i = index[r]!;
    // C e C_e já são médias sobre as N amostras; com 'whileSunUp', médias sobre as amostras com sol.
    const up = within === 'whileSunUp' ? options.sunUp![i]! : 1;
    const scale = up > 0 ? dni[r]! / up : 0;
    incident[r] = scale * shading.incidence[i]!;
    admitted[r] = scale * shading.sunlitIncidence[i]!;
    if (Number.isNaN(dni[r]!)) {
      incident[r] = NaN;
      admitted[r] = NaN;
    }
  }
  return { incident, admitted };
}

const emptyTotals = (): ClassTotals => ({ incident: 0, admitted: 0, blocked: 0, hours: 0 });

/** Somas por classe e os dois percentuais (seção 9.2). */
export function beamIndicators(beam: HourlyBeam, classes: Int8Array): BeamIndicators {
  if (classes.length !== beam.incident.length) {
    throw new RangeError('classes and hourly beam must have the same length');
  }
  const byClass = {
    hot: emptyTotals(),
    cold: emptyTotals(),
    neutral: emptyTotals(),
    none: emptyTotals(),
  };
  let missingDni = 0;
  for (let r = 0; r < classes.length; r++) {
    const e0 = beam.incident[r]!;
    const e = beam.admitted[r]!;
    if (Number.isNaN(e0)) {
      missingDni++;
      continue;
    }
    const c = classes[r];
    const t =
      c === HOUR_CLASS.hot
        ? byClass.hot
        : c === HOUR_CLASS.cold
          ? byClass.cold
          : c === HOUR_CLASS.neutral
            ? byClass.neutral
            : byClass.none;
    t.incident += e0;
    t.admitted += e;
    t.blocked += e0 - e;
    t.hours++;
  }
  const { hot, cold } = byClass;
  return {
    byClass,
    blockedInHot: hot.incident > 0 ? hot.blocked / hot.incident : null,
    admittedInCold: cold.incident > 0 ? cold.admitted / cold.incident : null,
    missingDni,
  };
}

export interface Alternative {
  id: string;
  scene: Scene;
}

export interface AlternativeResult {
  id: string;
  indicators: BeamIndicators;
  /** Outra alternativa tem os dois percentuais pelo menos iguais e um deles maior (seção 9.3). */
  dominated: boolean;
}

function dominates(a: BeamIndicators, b: BeamIndicators): boolean {
  const pairs: [number | null, number | null][] = [
    [a.blockedInHot, b.blockedInHot],
    [a.admittedInCold, b.admittedInCold],
  ];
  let better = false;
  for (const [x, y] of pairs) {
    if (x === null || y === null) continue; // percentual indefinido: não decide
    if (x < y - DOMINANCE_TOLERANCE) return false;
    if (x > y + DOMINANCE_TOLERANCE) better = true;
  }
  return better;
}

/** Indicadores de cada alternativa na mesma janela, fachada, clima e classificação (seção 9.3). */
export function compareAlternatives(
  samples: SunSamples,
  orientation: number,
  alternatives: readonly Alternative[],
  rows: EpwRows,
  dni: ArrayLike<number>,
  classes: Int8Array,
  options: HourlyBeamOptions = {},
): AlternativeResult[] {
  const results = alternatives.map((alt) => ({
    id: alt.id,
    indicators: beamIndicators(
      hourlyBeam(hourlyShading(samples, alt.scene, orientation), rows, dni, options),
      classes,
    ),
  }));
  return results.map((r) => ({
    ...r,
    dominated: results.some((o) => o !== r && dominates(o.indicators, r.indicators)),
  }));
}
