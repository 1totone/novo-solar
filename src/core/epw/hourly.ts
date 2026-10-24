/**
 * Modelo dos dados climáticos horários e a montagem da série de um ano, comuns aos leitores de EPW
 * (parseEpw.ts) e do CSV do SOL-AR 6.2 (parseSolar62.ts). Especificação:
 * docs/spec/04-dados-climaticos.md.
 */

export interface EpwLocation {
  city: string;
  state: string;
  country: string;
  source: string;
  wmo: string;
  /** Graus, positiva ao Norte. */
  latitude: number;
  /** Graus, positiva a Leste. */
  longitude: number;
  /** Horas em relação ao UTC. */
  timeZone: number;
  /** Metros. */
  elevation: number;
}

/** Campos horários usados, nas unidades do EPW (°C, %, Pa, Wh/m², graus, m/s, décimos). */
export const EPW_FIELD_NAMES = [
  'dryBulb',
  'dewPoint',
  'relativeHumidity',
  'pressure',
  'extraterrestrialHorizontal',
  'globalHorizontal',
  'directNormal',
  'diffuseHorizontal',
  'windDirection',
  'windSpeed',
  'totalSkyCover',
] as const;

export type EpwFieldName = (typeof EPW_FIELD_NAMES)[number];

const RADIATION: ReadonlySet<EpwFieldName> = new Set([
  'extraterrestrialHorizontal',
  'globalHorizontal',
  'directNormal',
  'diffuseHorizontal',
]);

export interface EpwData {
  location: EpwLocation;
  /** Textos das linhas COMMENTS 1 e COMMENTS 2, sem aspas (vazio no CSV do 6.2). */
  comments: string[];
  /** Número de horas: 8760, ou 8784 com 29/02. */
  hours: number;
  hasLeapDay: boolean;
  month: Uint8Array;
  day: Uint8Array;
  hour: Uint8Array;
  /** Valores na unidade do EPW; ausentes viram NaN. */
  fields: Record<EpwFieldName, Float64Array>;
  missing: Record<EpwFieldName, number>;
}

export type EpwErrorCode =
  | 'missingLocation'
  | 'missingCsvLocation'
  | 'invalidCsvHeader'
  | 'invalidLatitude'
  | 'invalidLongitude'
  | 'invalidTimeZone'
  | 'invalidElevation'
  | 'tooFewFields'
  | 'invalidNumber'
  | 'invalidSequence'
  | 'invalidHourCount'
  | 'negativeRadiation';

export class EpwParseError extends Error {
  readonly code: EpwErrorCode;
  /** Linha do arquivo, a partir de 1. */
  readonly line: number | undefined;
  readonly field: string | undefined;

  constructor(code: EpwErrorCode, message: string, line?: number, field?: string) {
    super(line === undefined ? message : `${message} (line ${line})`);
    this.name = 'EpwParseError';
    this.code = code;
    this.line = line;
    this.field = field;
  }
}

/** Limites aceitos para o local, com o código de erro de cada valor fora deles. */
export const LOCATION_LIMITS = {
  latitude: { min: -90, max: 90, code: 'invalidLatitude' },
  longitude: { min: -180, max: 180, code: 'invalidLongitude' },
  timeZone: { min: -12, max: 14, code: 'invalidTimeZone' },
  elevation: { min: -1000, max: 9000, code: 'invalidElevation' },
} as const satisfies Record<string, { min: number; max: number; code: EpwErrorCode }>;

/** Número de um campo de texto; vazio ou ausente vira NaN. */
export function parseNumber(text: string | undefined): number {
  if (text === undefined || text.trim() === '') return NaN;
  return Number(text);
}

/** Valor do local dentro dos limites, ou EpwParseError com o código do valor. */
export function locationValue(
  text: string | undefined,
  what: keyof typeof LOCATION_LIMITS,
  line?: number,
): number {
  const { min, max, code } = LOCATION_LIMITS[what];
  const v = parseNumber(text);
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new EpwParseError(code, `Invalid ${what}: "${text?.trim() ?? ''}"`, line, what);
  }
  return v;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;
const CAPACITY = 8784;

export type HourlyRecords = Omit<EpwData, 'location' | 'comments'>;

/**
 * Série horária de um ano: exige a sequência de 1/1 hora 1 até 31/12 hora 24, sem falta,
 * repetição ou inversão; 29/02 é aceito quando aparece logo depois de 28/02 hora 24. Valores NaN
 * são contados como ausentes; radiação negativa é erro.
 */
export function hourlySeries() {
  const month = new Uint8Array(CAPACITY);
  const day = new Uint8Array(CAPACITY);
  const hour = new Uint8Array(CAPACITY);
  const fields = Object.fromEntries(
    EPW_FIELD_NAMES.map((n) => [n, new Float64Array(CAPACITY)]),
  ) as Record<EpwFieldName, Float64Array>;
  const missing = Object.fromEntries(EPW_FIELD_NAMES.map((n) => [n, 0])) as Record<
    EpwFieldName,
    number
  >;
  let expM = 1;
  let expD = 1;
  let expH = 1;
  let hasLeapDay = false;
  let n = 0;
  let finished = false;

  return {
    /** Acrescenta a hora (m, d, h); `value` dá o valor de cada campo (NaN se ausente). */
    push(m: number, d: number, h: number, value: (name: EpwFieldName) => number, line: number) {
      if (finished || n >= CAPACITY) {
        throw new EpwParseError('invalidHourCount', 'Data continues after 12/31 hour 24', line);
      }
      if (m === 2 && d === 29 && h === 1 && expM === 3 && expD === 1 && expH === 1) {
        hasLeapDay = true;
        expM = 2;
        expD = 29;
      }
      if (m !== expM || d !== expD || h !== expH) {
        throw new EpwParseError(
          'invalidSequence',
          `Expected ${expM}/${expD} hour ${expH}, found ${m}/${d} hour ${h}`,
          line,
        );
      }
      month[n] = m;
      day[n] = d;
      hour[n] = h;
      for (const name of EPW_FIELD_NAMES) {
        const v = value(name);
        if (Number.isNaN(v)) {
          fields[name][n] = NaN;
          missing[name]++;
          continue;
        }
        if (RADIATION.has(name) && v < 0) {
          throw new EpwParseError('negativeRadiation', `Negative radiation in ${name}`, line, name);
        }
        fields[name][n] = v;
      }
      n++;

      // Avança o calendário esperado.
      expH++;
      if (expH > 24) {
        expH = 1;
        expD++;
        const daysThisMonth = expM === 2 && hasLeapDay ? 29 : DAYS_IN_MONTH[expM - 1]!;
        if (expD > daysThisMonth) {
          expD = 1;
          expM++;
          if (expM > 12) finished = true;
        }
      }
    },

    /** Confere o total de horas e devolve as séries. */
    finish(): HourlyRecords {
      const expected = hasLeapDay ? 8784 : 8760;
      if (n !== expected) {
        throw new EpwParseError(
          'invalidHourCount',
          `Expected ${expected} hourly records, found ${n}`,
        );
      }
      return {
        hours: n,
        hasLeapDay,
        month: month.slice(0, n),
        day: day.slice(0, n),
        hour: hour.slice(0, n),
        fields: Object.fromEntries(
          EPW_FIELD_NAMES.map((name) => [name, fields[name].slice(0, n)]),
        ) as Record<EpwFieldName, Float64Array>,
        missing,
      };
    },
  };
}
