/**
 * Leitor de arquivos climáticos EPW (EnergyPlus Weather).
 *
 * Especificação: docs/spec/04-dados-climaticos.md. Cada linha horária descreve o intervalo que
 * termina na hora indicada (docs/spec/02-tempo-e-posicao-solar.md, seção 2.2); este módulo só lê
 * e valida, sem interpretar o tempo.
 *
 * Erros são lançados como EpwParseError com um código estável; a interface traduz o código.
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

/** Campos horários usados, com a posição (a partir de 1) na linha e o código de ausente. */
const FIELD_SPECS = {
  dryBulb: { column: 7, missing: 99.9, radiation: false },
  dewPoint: { column: 8, missing: 99.9, radiation: false },
  relativeHumidity: { column: 9, missing: 999, radiation: false },
  pressure: { column: 10, missing: 999999, radiation: false },
  extraterrestrialHorizontal: { column: 11, missing: 9999, radiation: true },
  globalHorizontal: { column: 14, missing: 9999, radiation: true },
  directNormal: { column: 15, missing: 9999, radiation: true },
  diffuseHorizontal: { column: 16, missing: 9999, radiation: true },
  windDirection: { column: 21, missing: 999, radiation: false },
  windSpeed: { column: 22, missing: 999, radiation: false },
  totalSkyCover: { column: 23, missing: 99, radiation: false },
} as const;

export type EpwFieldName = keyof typeof FIELD_SPECS;
export const EPW_FIELD_NAMES = Object.keys(FIELD_SPECS) as EpwFieldName[];

/** Menor número de campos aceito numa linha horária (até a cobertura do céu). */
const MIN_FIELDS = 23;

export interface EpwData {
  location: EpwLocation;
  /** Textos das linhas COMMENTS 1 e COMMENTS 2, sem aspas. */
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

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function parseNumber(text: string | undefined): number {
  if (text === undefined || text.trim() === '') return NaN;
  return Number(text);
}

function parseLocation(line: string | undefined): EpwLocation {
  const parts = line?.split(',') ?? [];
  if (parts[0]?.trim().toUpperCase() !== 'LOCATION' || parts.length < 10) {
    throw new EpwParseError('missingLocation', 'First line must be LOCATION with 10 fields', 1);
  }
  const check = (i: number, min: number, max: number, code: EpwErrorCode, what: string) => {
    const v = parseNumber(parts[i]);
    if (!Number.isFinite(v) || v < min || v > max) {
      throw new EpwParseError(code, `Invalid ${what}: "${parts[i]?.trim() ?? ''}"`, 1, what);
    }
    return v;
  };
  return {
    city: parts[1]!.trim(),
    state: parts[2]!.trim(),
    country: parts[3]!.trim(),
    source: parts[4]!.trim(),
    wmo: parts[5]!.trim(),
    latitude: check(6, -90, 90, 'invalidLatitude', 'latitude'),
    longitude: check(7, -180, 180, 'invalidLongitude', 'longitude'),
    timeZone: check(8, -12, 14, 'invalidTimeZone', 'timeZone'),
    elevation: check(9, -1000, 9000, 'invalidElevation', 'elevation'),
  };
}

function unquote(text: string): string {
  return text.trim().replace(/^"(.*)"$/s, '$1');
}

/** Lê o texto de um arquivo EPW. Lança EpwParseError se o arquivo for inválido. */
export function parseEpw(text: string): EpwData {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const location = parseLocation(lines[0]);

  const comments: string[] = [];
  let firstData = 8;
  for (let i = 1; i < Math.min(lines.length, 12); i++) {
    const l = lines[i]!;
    const upper = l.toUpperCase();
    if (upper.startsWith('COMMENTS 1,') || upper.startsWith('COMMENTS 2,')) {
      comments.push(unquote(l.slice(l.indexOf(',') + 1)));
    }
    if (upper.startsWith('DATA PERIODS')) {
      firstData = i + 1;
      break;
    }
  }

  const capacity = 8784;
  const month = new Uint8Array(capacity);
  const day = new Uint8Array(capacity);
  const hour = new Uint8Array(capacity);
  const fields = Object.fromEntries(
    EPW_FIELD_NAMES.map((n) => [n, new Float64Array(capacity)]),
  ) as Record<EpwFieldName, Float64Array>;
  const missing = Object.fromEntries(EPW_FIELD_NAMES.map((n) => [n, 0])) as Record<
    EpwFieldName,
    number
  >;

  // Calendário esperado: começa em 1/1 hora 1; 29/02 é aceito se aparecer depois de 28/02 hora 24.
  let expM = 1;
  let expD = 1;
  let expH = 1;
  let hasLeapDay = false;
  let n = 0;
  let finished = false;

  for (let i = firstData; i < lines.length; i++) {
    const raw = lines[i]!;
    if (raw.trim() === '') continue;
    const lineNo = i + 1;
    const parts = raw.split(',');
    if (parts.length < MIN_FIELDS) {
      throw new EpwParseError(
        'tooFewFields',
        `Expected at least ${MIN_FIELDS} fields, found ${parts.length}`,
        lineNo,
      );
    }
    const m = parseNumber(parts[1]);
    const d = parseNumber(parts[2]);
    const h = parseNumber(parts[3]);
    if (finished || n >= capacity) {
      throw new EpwParseError('invalidHourCount', 'Data continues after 12/31 hour 24', lineNo);
    }
    if (m === 2 && d === 29 && h === 1 && expM === 3 && expD === 1 && expH === 1) {
      hasLeapDay = true;
      expM = 2;
      expD = 29;
    }
    if (m !== expM || d !== expD || h !== expH) {
      throw new EpwParseError(
        'invalidSequence',
        `Expected ${expM}/${expD} hour ${expH}, found ${parts[1]}/${parts[2]} hour ${parts[3]}`,
        lineNo,
      );
    }
    month[n] = m;
    day[n] = d;
    hour[n] = h;

    for (const name of EPW_FIELD_NAMES) {
      const spec = FIELD_SPECS[name];
      const v = parseNumber(parts[spec.column - 1]);
      if (Number.isNaN(v)) {
        throw new EpwParseError(
          'invalidNumber',
          `Invalid number "${parts[spec.column - 1] ?? ''}" in ${name}`,
          lineNo,
          name,
        );
      }
      if (v >= spec.missing) {
        fields[name][n] = NaN;
        missing[name]++;
        continue;
      }
      if (spec.radiation && v < 0) {
        throw new EpwParseError('negativeRadiation', `Negative radiation in ${name}`, lineNo, name);
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
  }

  const expected = hasLeapDay ? 8784 : 8760;
  if (n !== expected) {
    throw new EpwParseError('invalidHourCount', `Expected ${expected} hourly records, found ${n}`);
  }

  return {
    location,
    comments,
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
}
