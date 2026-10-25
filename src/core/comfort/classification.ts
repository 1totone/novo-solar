/**
 * Classificação das horas do arquivo climático em quentes, frias e neutras (F3.4).
 *
 * Especificação: docs/spec/08-classificacao-das-horas.md (proposta, decisão 0020). A classe usa só a
 * temperatura do ar externo, um indicador aproximado da necessidade de sombra (seção 8.1); a faixa
 * adaptativa da ASHRAE 55 vale para a temperatura operativa interna de ambientes naturalmente
 * condicionados e é usada aqui com a temperatura externa.
 *
 * Validação: numpy e pythermalcomfort nos 6 EPWs de teste (tests/referencia/classificacao.test.ts).
 */

/** Classe de cada hora, como inteiro (Int8Array). */
export const HOUR_CLASS = { cold: -1, neutral: 0, hot: 1, none: 2 } as const;

/** Temperatura que representa a hora (h − 1, h]: média do início e do fim (padrão) ou a do fim. */
export type HourTemperature = 'mean' | 'end';

export type RunningMeanOptions =
  | { averaging: 'exponential'; alpha: number; days: number }
  | { averaging: 'arithmetic'; days: number };

export type ClassificationMethod =
  | { kind: 'adaptive'; acceptability: 80 | 90; running: RunningMeanOptions }
  | { kind: 'thresholds'; cold: number | null; hot: number | null }
  | { kind: 'balance'; balance: number };

/** Padrão proposto (seção 8.8): faixa adaptativa, 80%, média exponencial com α = 0,8 e 30 dias. */
export const DEFAULT_METHOD: ClassificationMethod = {
  kind: 'adaptive',
  acceptability: 80,
  running: { averaging: 'exponential', alpha: 0.8, days: 30 },
};

/** ASHRAE 55-2023, modelo adaptativo (seção 8.4). */
export const ADAPTIVE = {
  slope: 0.31,
  intercept: 17.8,
  halfWidth: { 80: 3.5, 90: 2.5 },
  minPrevailing: 10,
  maxPrevailing: 33.5,
  minAlpha: 0.6,
  maxAlpha: 0.9,
  minDays: 7,
  maxDays: 30,
} as const;

/** Mínimo de horas presentes para a média diária. */
const MIN_HOURS_PER_DAY = 18;

export interface HourClassification {
  /** Classe de cada linha do arquivo (HOUR_CLASS). */
  classes: Int8Array;
  /** Temperatura da hora (°C). */
  temperature: Float64Array;
  /** Limites de cada hora (°C); NaN onde não há limite (faixa adaptativa fora de aplicação). */
  lower: Float64Array;
  upper: Float64Array;
  /** Faixa adaptativa: temperatura média predominante e de conforto de cada dia (°C). */
  prevailingMean: Float64Array | null;
  comfort: Float64Array | null;
  counts: { hot: number; cold: number; neutral: number; none: number };
}

function checkHours(dryBulb: ArrayLike<number>): void {
  if (dryBulb.length === 0 || dryBulb.length % 24 !== 0) {
    throw new RangeError('hourly data must have whole days');
  }
}

/** Temperatura de cada hora (seção 8.2); a linha anterior à primeira é a última (ano cíclico). */
export function hourTemperature(dryBulb: ArrayLike<number>, mode: HourTemperature): Float64Array {
  checkHours(dryBulb);
  const n = dryBulb.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const now = dryBulb[i]!;
    out[i] = mode === 'end' ? now : (dryBulb[(i + n - 1) % n]! + now) / 2;
  }
  return out;
}

/** Média das 24 linhas de cada dia; NaN com menos de 18 valores presentes (seção 8.3). */
export function dailyMeans(dryBulb: ArrayLike<number>): Float64Array {
  checkHours(dryBulb);
  const days = dryBulb.length / 24;
  const out = new Float64Array(days);
  for (let d = 0; d < days; d++) {
    let sum = 0;
    let count = 0;
    for (let h = 0; h < 24; h++) {
      const v = dryBulb[d * 24 + h]!;
      if (Number.isNaN(v)) continue;
      sum += v;
      count++;
    }
    out[d] = count >= MIN_HOURS_PER_DAY ? sum / count : NaN;
  }
  return out;
}

function checkRunning(options: RunningMeanOptions): void {
  const { days } = options;
  if (!(Number.isInteger(days) && days >= ADAPTIVE.minDays && days <= ADAPTIVE.maxDays)) {
    throw new RangeError('running mean days must be an integer from 7 to 30');
  }
  if (
    options.averaging === 'exponential' &&
    !(options.alpha >= ADAPTIVE.minAlpha && options.alpha <= ADAPTIVE.maxAlpha)
  ) {
    throw new RangeError('alpha must be between 0.6 and 0.9');
  }
}

/**
 * Temperatura média predominante de cada dia: média ponderada dos n dias anteriores (ano cíclico),
 * com os dias sem média fora da soma e os pesos renormalizados (seção 8.3).
 */
export function prevailingMean(
  daily: ArrayLike<number>,
  options: RunningMeanOptions,
): Float64Array {
  checkRunning(options);
  const n = options.days;
  const weights = Array.from({ length: n }, (_, i) =>
    options.averaging === 'exponential' ? options.alpha ** i : 1,
  );
  const m = daily.length;
  const out = new Float64Array(m);
  for (let d = 0; d < m; d++) {
    let sum = 0;
    let total = 0;
    for (let i = 1; i <= n; i++) {
      const v = daily[(((d - i) % m) + m) % m]!;
      if (Number.isNaN(v)) continue;
      sum += weights[i - 1]! * v;
      total += weights[i - 1]!;
    }
    out[d] = total > 0 ? sum / total : NaN;
  }
  return out;
}

/** Temperatura de conforto da ASHRAE 55; NaN fora de 10 °C ≤ t_pma ≤ 33,5 °C. */
export function adaptiveComfort(prevailing: number): number {
  if (!(prevailing >= ADAPTIVE.minPrevailing && prevailing <= ADAPTIVE.maxPrevailing)) return NaN;
  return ADAPTIVE.slope * prevailing + ADAPTIVE.intercept;
}

/** Classifica cada linha do arquivo pela temperatura do ar externo (seções 8.4 e 8.5). */
export function classifyHours(
  dryBulb: ArrayLike<number>,
  method: ClassificationMethod,
  mode: HourTemperature = 'mean',
): HourClassification {
  const temperature = hourTemperature(dryBulb, mode);
  const n = temperature.length;
  const lower = new Float64Array(n);
  const upper = new Float64Array(n);
  let prevailing: Float64Array | null = null;
  let comfort: Float64Array | null = null;

  if (method.kind === 'adaptive') {
    const half = ADAPTIVE.halfWidth[method.acceptability];
    if (half === undefined) throw new RangeError('acceptability must be 80 or 90');
    prevailing = prevailingMean(dailyMeans(dryBulb), method.running);
    comfort = prevailing.map(adaptiveComfort);
    for (let i = 0; i < n; i++) {
      const c = comfort[Math.floor(i / 24)]!;
      lower[i] = c - half;
      upper[i] = c + half;
    }
  } else {
    const [lo, hi] =
      method.kind === 'balance'
        ? [method.balance, method.balance]
        : [method.cold ?? -Infinity, method.hot ?? Infinity];
    if (Number.isNaN(lo) || Number.isNaN(hi) || lo > hi) {
      throw new RangeError('thresholds must satisfy cold <= hot');
    }
    lower.fill(lo);
    upper.fill(hi);
  }

  const classes = new Int8Array(n);
  const counts = { hot: 0, cold: 0, neutral: 0, none: 0 };
  for (let i = 0; i < n; i++) {
    const t = temperature[i]!;
    const lo = lower[i]!;
    const hi = upper[i]!;
    let c: number;
    if (Number.isNaN(t) || Number.isNaN(lo) || Number.isNaN(hi)) {
      c = HOUR_CLASS.none;
      counts.none++;
    } else if (t > hi) {
      c = HOUR_CLASS.hot;
      counts.hot++;
    } else if (t < lo) {
      c = HOUR_CLASS.cold;
      counts.cold++;
    } else {
      c = HOUR_CLASS.neutral;
      counts.neutral++;
    }
    classes[i] = c;
  }
  return { classes, temperature, lower, upper, prevailingMean: prevailing, comfort, counts };
}
