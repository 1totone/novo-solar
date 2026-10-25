import { describe, expect, it } from 'vitest';
import { EpwParseError } from './parseEpw';
import { parseSolar62, solar62Header, type Solar62Location } from './parseSolar62';

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PLACE: Solar62Location = {
  name: 'Teste',
  latitude: -27.67,
  longitude: -48.547,
  timeZone: -3,
  elevation: 6.1,
};
const HEADER = [
  'Localização,Latitude {N+/S-},Longitude {E+/W-},Zona Horaria {+/- GMT},Elevação {m},,,,,,,,,,,,,,',
  'Concepcion,-36.77,-73.05,-4,16,,,,,,,,,,,,,,',
  '',
  'Mês,Dia,Hora,TBS {C},TBU {C},T. Pto Orvalho {C},Pressao Atmosferica {kPa},Umidade {kg/kg},U. R. {%},Densidade do ar {kg/m3},Entalpia {BTU/LB},Velocidade do Vento {m/s},Direção do Vento {graus},Cobertura Total de Nuvens {decimas},Rad Horizontal Extraterreste {Wh/m2},Rad Global Horizontal {Wh/m2},Rad Direta {Wh/m2},Rad Direta Normal {Wh/m2},Rad Difusa Horizontal {Wh/m2}',
];

/** Linha de 19 campos; os valores dependem do índice da hora para serem verificáveis. */
function row(i: number, m: number, d: number, h: number, o: Record<number, string> = {}): string {
  const sun = h >= 7 && h <= 18;
  const f = [
    String(m),
    String(d),
    String(h),
    (20 + (i % 10) / 10).toFixed(1), // 4 TBS
    '18.0', // 5 TBU
    '15.0', // 6 TPO
    '101.3', // 7 pressão (kPa)
    '0.012', // 8 umidade absoluta
    String(70 + (i % 5)), // 9 UR
    '1.15', // 10 densidade
    '55.1', // 11 entalpia
    String(i % 7), // 12 velocidade do vento
    String((i * 10) % 360), // 13 direção do vento
    '5', // 14 nebulosidade
    sun ? '800' : '0', // 15 extraterrestre
    sun ? '400' : '0', // 16 global
    sun ? '250' : '0', // 17 direta horizontal
    sun ? '300' : '0', // 18 direta normal
    sun ? '150' : '0', // 19 difusa
  ];
  for (const [k, v] of Object.entries(o)) f[Number(k) - 1] = v;
  return f.join(',');
}

function buildCsv(
  opts: {
    header?: string[];
    leap?: boolean;
    overrides?: (i: number) => Record<number, string> | undefined;
    dropRow?: number;
    extra?: (i: number) => string[] | undefined;
    eol?: string;
  } = {},
): string {
  const days = [...DAYS_IN_MONTH];
  if (opts.leap) days[1] = 29;
  const lines = [...(opts.header ?? [])];
  let i = 0;
  days.forEach((n, m) => {
    for (let d = 1; d <= n; d++) {
      for (let h = 1; h <= 24; h++) {
        if (i !== opts.dropRow) lines.push(row(i, m + 1, d, h, opts.overrides?.(i)));
        lines.push(...(opts.extra?.(i) ?? []));
        i++;
      }
    }
  });
  return lines.join(opts.eol ?? '\n') + (opts.eol ?? '\n');
}

function errorOf(fn: () => unknown): EpwParseError {
  try {
    fn();
  } catch (err) {
    if (err instanceof EpwParseError) return err;
    throw err;
  }
  throw new Error('não lançou EpwParseError');
}

describe('parseSolar62', () => {
  it('lê o arquivo sem cabeçalho com o local dado, convertendo a pressão para Pa', () => {
    const text = buildCsv();
    expect(solar62Header(text)).toBeNull();
    const csv = parseSolar62(text, PLACE);
    expect(csv.hours).toBe(8760);
    expect(csv.hasLeapDay).toBe(false);
    expect(csv.location).toEqual({
      city: 'Teste',
      state: '',
      country: '',
      source: 'SOL-AR 6.2',
      wmo: '',
      latitude: -27.67,
      longitude: -48.547,
      timeZone: -3,
      elevation: 6.1,
    });
    expect(csv.comments).toEqual([]);
    expect([csv.month[0], csv.day[0], csv.hour[0]]).toEqual([1, 1, 1]);
    expect([csv.month[8759], csv.day[8759], csv.hour[8759]]).toEqual([12, 31, 24]);
    // Hora 12 de 1/1 (i = 11): TBS 20,1; UR 71; vento 4 m/s de 110°; radiação de dia.
    expect(csv.fields.dryBulb[11]).toBeCloseTo(20.1, 12);
    expect(csv.fields.dewPoint[11]).toBe(15);
    expect(csv.fields.relativeHumidity[11]).toBe(71);
    expect(csv.fields.pressure[11]).toBeCloseTo(101300, 6);
    expect(csv.fields.windSpeed[11]).toBe(4);
    expect(csv.fields.windDirection[11]).toBe(110);
    expect(csv.fields.totalSkyCover[11]).toBe(5);
    expect(csv.fields.extraterrestrialHorizontal[11]).toBe(800);
    expect(csv.fields.globalHorizontal[11]).toBe(400);
    expect(csv.fields.directNormal[11]).toBe(300);
    expect(csv.fields.diffuseHorizontal[11]).toBe(150);
    expect(Object.values(csv.missing).every((n) => n === 0)).toBe(true);
  });

  it('formato de inclusão: local do cabeçalho, com BOM, CRLF e linha em branco', () => {
    const text = '\uFEFF' + buildCsv({ header: HEADER, eol: '\r\n' });
    const header = {
      name: 'Concepcion',
      latitude: -36.77,
      longitude: -73.05,
      timeZone: -4,
      elevation: 16,
    };
    expect(solar62Header(text)).toEqual(header);
    // O cabeçalho prevalece sobre o local dado.
    const csv = parseSolar62(text, PLACE);
    expect(csv.location).toMatchObject({
      city: 'Concepcion',
      latitude: -36.77,
      longitude: -73.05,
      timeZone: -4,
      elevation: 16,
    });
    const plain = parseSolar62(buildCsv(), PLACE);
    expect(Array.from(csv.fields.dryBulb)).toEqual(Array.from(plain.fields.dryBulb));
    expect(Array.from(csv.fields.globalHorizontal)).toEqual(
      Array.from(plain.fields.globalHorizontal),
    );
  });

  it('sem cabeçalho e sem local: erro, o fuso nunca é presumido', () => {
    expect(errorOf(() => parseSolar62(buildCsv())).code).toBe('missingCsvLocation');
  });

  it('valor inválido no cabeçalho: erro com a linha', () => {
    const bad = [...HEADER];
    bad[1] = 'Concepcion,-36.77,-73.05,,16';
    const err = errorOf(() => solar62Header(buildCsv({ header: bad })));
    expect([err.code, err.line]).toEqual(['invalidTimeZone', 2]);
    bad[1] = 'Concepcion,-136.77,-73.05,-4,16';
    expect(errorOf(() => parseSolar62(buildCsv({ header: bad }))).code).toBe('invalidLatitude');
  });

  it('cabeçalho sem a linha do local: erro próprio do CSV', () => {
    const err = errorOf(() => solar62Header('mes,dia,hora\n1,1,1\n'));
    expect([err.code, err.line]).toEqual(['invalidCsvHeader', 2]);
  });

  it('CSV salvo pelo Excel em português (ponto e vírgula): erro próprio com a linha', () => {
    const excel = (text: string) => text.replace(/,/g, ';').replace(/(\d)\.(\d)/g, '$1,$2');
    const withHeader = errorOf(() => solar62Header(excel(buildCsv({ header: HEADER }))));
    expect([withHeader.code, withHeader.line]).toEqual(['semicolonCsv', 1]);
    const noHeader = errorOf(() => parseSolar62(excel(buildCsv()), PLACE));
    expect([noHeader.code, noHeader.line]).toEqual(['semicolonCsv', 1]);
    const afterBlank = errorOf(() => solar62Header('\n' + excel(buildCsv())));
    expect([afterBlank.code, afterBlank.line]).toEqual(['semicolonCsv', 2]);
  });

  it('ponto e vírgula num campo de texto não basta para recusar', () => {
    const header = [...HEADER];
    header[1] = 'Cidade; Estado,-36.77,-73.05,-4,16,,,,,,,,,,,,,,';
    expect(solar62Header(buildCsv({ header }))?.name).toBe('Cidade; Estado');
  });

  it('local dado fora dos limites: erro', () => {
    const err = errorOf(() => parseSolar62(buildCsv(), { ...PLACE, timeZone: 20 }));
    expect(err.code).toBe('invalidTimeZone');
  });

  it('campo vazio é ausente (NaN), contado por campo', () => {
    const csv = parseSolar62(
      buildCsv({ overrides: (i) => (i < 10 ? { 18: '', 4: i === 3 ? '' : '20.0' } : undefined) }),
      PLACE,
    );
    expect(csv.missing.directNormal).toBe(10);
    expect(csv.missing.dryBulb).toBe(1);
    expect(Number.isNaN(csv.fields.directNormal[0]!)).toBe(true);
    expect(Number.isNaN(csv.fields.dryBulb[3]!)).toBe(true);
  });

  it('linhas sem nenhum valor (só vírgulas) e em branco são ignoradas', () => {
    const csv = parseSolar62(
      buildCsv({
        extra: (i) => (i === 8759 ? [',,,,,,,,,,,,,,,,,,'] : i === 100 ? [''] : undefined),
      }),
      PLACE,
    );
    expect(csv.hours).toBe(8760);
  });

  it('linha com menos de 19 campos: erro com a linha', () => {
    const text = buildCsv().split('\n');
    text[5] = text[5]!.split(',').slice(0, 18).join(',');
    const short = errorOf(() => parseSolar62(text.join('\n'), PLACE));
    expect([short.code, short.line]).toEqual(['tooFewFields', 6]);
  });

  it('valor não numérico: erro com a linha e o campo', () => {
    const err = errorOf(() =>
      parseSolar62(buildCsv({ overrides: (i) => (i === 7 ? { 9: 'abc' } : undefined) }), PLACE),
    );
    expect([err.code, err.line, err.field]).toEqual(['invalidNumber', 8, 'relativeHumidity']);
  });

  it('hora faltando ou fora de ordem: erro de sequência', () => {
    const err = errorOf(() => parseSolar62(buildCsv({ dropRow: 30 }), PLACE));
    expect([err.code, err.line]).toEqual(['invalidSequence', 31]);
  });

  it('radiação negativa: erro', () => {
    const err = errorOf(() =>
      parseSolar62(buildCsv({ overrides: (i) => (i === 12 ? { 16: '-5' } : undefined) }), PLACE),
    );
    expect([err.code, err.field]).toEqual(['negativeRadiation', 'globalHorizontal']);
  });

  it('aceita 29/02 depois de 28/02 hora 24 (8784 horas)', () => {
    const csv = parseSolar62(buildCsv({ leap: true }), PLACE);
    expect(csv.hours).toBe(8784);
    expect(csv.hasLeapDay).toBe(true);
  });

  it('arquivo incompleto: erro de número de horas', () => {
    const text = buildCsv().split('\n').slice(0, 5000).join('\n');
    expect(errorOf(() => parseSolar62(text, PLACE)).code).toBe('invalidHourCount');
  });
});
