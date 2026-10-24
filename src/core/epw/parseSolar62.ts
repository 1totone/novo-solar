/**
 * Leitor do CSV do Analysis SOL-AR 6.2 (docs/spec/04-dados-climaticos.md, seção 4.2).
 *
 * Dois formatos, com o mesmo corpo de 19 colunas por hora (mês, dia, hora, TBS, TBU, TPO, pressão
 * em kPa, umidade absoluta, UR, densidade, entalpia, velocidade e direção do vento, nebulosidade,
 * radiação extraterrestre, global, direta horizontal, direta normal e difusa):
 * - arquivos embarcados no 6.2 (`cidades/*.csv`): sem cabeçalho; o local vem de fora;
 * - formato "Incluir Nova Cidade": linha de rótulos, linha com nome, latitude, longitude (leste
 *   positiva), fuso e elevação, rótulos das colunas e então os dados.
 *
 * O resultado tem o mesmo modelo do EPW (pressão convertida para Pa); campo vazio é ausente (NaN).
 * Linhas sem nenhum valor (só vírgulas) são ignoradas. Cada hora descreve o intervalo que termina
 * nela, como no EPW (verificado na radiação extraterrestre dos arquivos; relatório do F2.7).
 */
import {
  EpwParseError,
  hourlySeries,
  locationValue,
  parseNumber,
  type EpwData,
  type EpwFieldName,
} from './hourly';

export interface Solar62Location {
  name: string;
  /** Graus, positiva ao Norte. */
  latitude: number;
  /** Graus, positiva a Leste. */
  longitude: number;
  /** Horas em relação ao UTC. */
  timeZone: number;
  /** Metros. */
  elevation: number;
}

/** Coluna (a partir de 1) e fator de conversão para a unidade do EPW. */
const COLUMNS: Record<EpwFieldName, { column: number; factor: number }> = {
  dryBulb: { column: 4, factor: 1 },
  dewPoint: { column: 6, factor: 1 },
  pressure: { column: 7, factor: 1000 }, // kPa -> Pa
  relativeHumidity: { column: 9, factor: 1 },
  windSpeed: { column: 12, factor: 1 },
  windDirection: { column: 13, factor: 1 },
  totalSkyCover: { column: 14, factor: 1 },
  extraterrestrialHorizontal: { column: 15, factor: 1 },
  globalHorizontal: { column: 16, factor: 1 },
  directNormal: { column: 18, factor: 1 },
  diffuseHorizontal: { column: 19, factor: 1 },
};

/** Campos de uma linha horária. */
const FIELDS_PER_LINE = 19;

const isNumeric = (text: string | undefined) => Number.isFinite(parseNumber(text));
const isBlank = (line: string) => line.split(',').every((f) => f.trim() === '');

interface Layout {
  lines: string[];
  location: Solar62Location | null;
  /** Índice da primeira linha de dados. */
  firstData: number;
}

function layout(text: string): Layout {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  let i = 0;
  while (i < lines.length && isBlank(lines[i]!)) i++;
  if (i >= lines.length || isNumeric(lines[i]!.split(',')[0])) {
    return { lines, location: null, firstData: i };
  }
  // Formato de inclusão: rótulos, depois a linha do local.
  i++;
  while (i < lines.length && isBlank(lines[i]!)) i++;
  const parts = lines[i]?.split(',') ?? [];
  const line = i + 1;
  if (parts.length < 5) {
    throw new EpwParseError(
      'invalidCsvHeader',
      'Second header line must have name, latitude, longitude, time zone and elevation',
      line,
    );
  }
  const location: Solar62Location = {
    name: parts[0]?.trim() ?? '',
    latitude: locationValue(parts[1], 'latitude', line),
    longitude: locationValue(parts[2], 'longitude', line),
    timeZone: locationValue(parts[3], 'timeZone', line),
    elevation: locationValue(parts[4], 'elevation', line),
  };
  // Pula os rótulos das colunas até a primeira linha que começa com número.
  i++;
  while (i < lines.length && (isBlank(lines[i]!) || !isNumeric(lines[i]!.split(',')[0]))) i++;
  return { lines, location, firstData: i };
}

/**
 * Local do cabeçalho do formato "Incluir Nova Cidade", ou null se o arquivo começa direto com os
 * dados (arquivos embarcados no 6.2). Lança EpwParseError se o cabeçalho tiver valor inválido.
 */
export function solar62Header(text: string): Solar62Location | null {
  return layout(text).location;
}

/**
 * Lê um CSV do SOL-AR 6.2. O local do cabeçalho tem prioridade; sem cabeçalho, vale `location`
 * (sem ele, erro `missingCsvLocation`: o fuso nunca é presumido).
 */
export function parseSolar62(text: string, location?: Solar62Location): EpwData {
  const { lines, location: header, firstData } = layout(text);
  const place = header ?? location;
  if (!place) {
    throw new EpwParseError('missingCsvLocation', 'CSV without location header');
  }
  const series = hourlySeries();
  for (let i = firstData; i < lines.length; i++) {
    const raw = lines[i]!;
    if (isBlank(raw)) continue;
    const lineNo = i + 1;
    const parts = raw.split(',');
    if (parts.length < FIELDS_PER_LINE) {
      throw new EpwParseError(
        'tooFewFields',
        `Expected at least ${FIELDS_PER_LINE} fields, found ${parts.length}`,
        lineNo,
      );
    }
    series.push(
      parseNumber(parts[0]),
      parseNumber(parts[1]),
      parseNumber(parts[2]),
      (name) => {
        const { column, factor } = COLUMNS[name];
        const text = parts[column - 1]!;
        if (text.trim() === '') return NaN;
        const v = Number(text);
        if (!Number.isFinite(v)) {
          throw new EpwParseError(
            'invalidNumber',
            `Invalid number "${text}" in ${name}`,
            lineNo,
            name,
          );
        }
        return v * factor;
      },
      lineNo,
    );
  }
  return {
    location: {
      city: place.name,
      state: '',
      country: '',
      source: 'SOL-AR 6.2',
      wmo: '',
      latitude: locationValue(String(place.latitude), 'latitude'),
      longitude: locationValue(String(place.longitude), 'longitude'),
      timeZone: locationValue(String(place.timeZone), 'timeZone'),
      elevation: locationValue(String(place.elevation), 'elevation'),
    },
    comments: [],
    ...series.finish(),
  };
}
