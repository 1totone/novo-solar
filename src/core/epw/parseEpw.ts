/**
 * Leitor de arquivos climáticos EPW (EnergyPlus Weather).
 *
 * Especificação: docs/spec/04-dados-climaticos.md. Cada linha horária descreve o intervalo que
 * termina na hora indicada (docs/spec/02-tempo-e-posicao-solar.md, seção 2.2); este módulo só lê
 * e valida, sem interpretar o tempo.
 *
 * Erros são lançados como EpwParseError com um código estável; a interface traduz o código.
 */
import {
  EpwParseError,
  hourlySeries,
  locationValue,
  parseNumber,
  type EpwData,
  type EpwFieldName,
  type EpwLocation,
} from './hourly';

export {
  EPW_FIELD_NAMES,
  EpwParseError,
  type EpwData,
  type EpwErrorCode,
  type EpwFieldName,
  type EpwLocation,
} from './hourly';

/** Campos horários usados, com a posição (a partir de 1) na linha e o código de ausente. */
const FIELD_SPECS: Record<EpwFieldName, { column: number; missing: number }> = {
  dryBulb: { column: 7, missing: 99.9 },
  dewPoint: { column: 8, missing: 99.9 },
  relativeHumidity: { column: 9, missing: 999 },
  pressure: { column: 10, missing: 999999 },
  extraterrestrialHorizontal: { column: 11, missing: 9999 },
  globalHorizontal: { column: 14, missing: 9999 },
  directNormal: { column: 15, missing: 9999 },
  diffuseHorizontal: { column: 16, missing: 9999 },
  windDirection: { column: 21, missing: 999 },
  windSpeed: { column: 22, missing: 999 },
  totalSkyCover: { column: 23, missing: 99 },
};

/** Menor número de campos aceito numa linha horária (até a cobertura do céu). */
const MIN_FIELDS = 23;

function parseLocation(line: string | undefined): EpwLocation {
  const parts = line?.split(',') ?? [];
  if (parts[0]?.trim().toUpperCase() !== 'LOCATION' || parts.length < 10) {
    throw new EpwParseError('missingLocation', 'First line must be LOCATION with 10 fields', 1);
  }
  return {
    city: parts[1]!.trim(),
    state: parts[2]!.trim(),
    country: parts[3]!.trim(),
    source: parts[4]!.trim(),
    wmo: parts[5]!.trim(),
    latitude: locationValue(parts[6], 'latitude', 1),
    longitude: locationValue(parts[7], 'longitude', 1),
    timeZone: locationValue(parts[8], 'timeZone', 1),
    elevation: locationValue(parts[9], 'elevation', 1),
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

  const series = hourlySeries();
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
    series.push(
      parseNumber(parts[1]),
      parseNumber(parts[2]),
      parseNumber(parts[3]),
      (name) => {
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
        return v >= spec.missing ? NaN : v;
      },
      lineNo,
    );
  }

  return { location, comments, ...series.finish() };
}

/**
 * Período de registro informado nos comentários do EPW, quando há (ex.: TMYx, "Period of
 * Record=2011-2025"); null se o arquivo não informa.
 */
export function epwPeriodOfRecord(comments: readonly string[]): [number, number] | null {
  for (const c of comments) {
    const m = /Period of Record\s*=\s*(\d{4})\s*-\s*(\d{4})/i.exec(c);
    if (m) return [Number(m[1]), Number(m[2])];
  }
  return null;
}
