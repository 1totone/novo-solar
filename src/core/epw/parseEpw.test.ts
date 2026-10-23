import { describe, expect, it } from 'vitest';
import { EpwParseError, parseEpw } from './parseEpw';

const HEADER = [
  'LOCATION,Florianopolis-Luz.Intl.AP,SC,BRA,SRC-TMYx,838990,-27.67000,-48.54700,-3.0,6.1',
  'DESIGN CONDITIONS,0',
  'TYPICAL/EXTREME PERIODS,0',
  'GROUND TEMPERATURES,0',
  'HOLIDAYS/DAYLIGHT SAVINGS,No,0,0,0',
  'COMMENTS 1,"Arquivo sintético para testes"',
  'COMMENTS 2,"Gerado em parseEpw.test.ts"',
  'DATA PERIODS,1,1,Data,Sunday,1/ 1,12/31',
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface RowOverrides {
  [field: number]: string;
}

/** Linha horária com 35 campos; os valores dependem do índice da hora para serem verificáveis. */
function row(i: number, month: number, day: number, hour: number, o: RowOverrides = {}): string {
  const f = [
    '2020',
    String(month),
    String(day),
    String(hour),
    '60',
    'A7A7A7A7*0?9?9?9?9?9?9?9A7A7A7A7A7A7*0E8*0*0',
    (20 + (i % 10) / 10).toFixed(1), // 7 TBS
    '15.0', // 8 TPO
    String(70 + (i % 5)), // 9 UR
    '101300', // 10 pressão
    String(i % 24 >= 6 && i % 24 <= 18 ? 800 : 0), // 11 extraterrestre horizontal
    '1415', // 12 extraterrestre normal
    '380', // 13 infravermelho
    String(i % 24 >= 6 && i % 24 <= 18 ? 400 : 0), // 14 GHI
    String(i % 24 >= 6 && i % 24 <= 18 ? 300 : 0), // 15 DNI
    String(i % 24 >= 6 && i % 24 <= 18 ? 150 : 0), // 16 DHI
    '0',
    '0',
    '0',
    '0',
    String((i * 10) % 360), // 21 direção do vento
    (i % 7).toFixed(1), // 22 velocidade do vento
    '5', // 23 cobertura do céu
    '3',
    '9999',
    '77777',
    '9',
    '999999999',
    '20',
    '0.1',
    '0',
    '88',
    '0.2',
    '0',
    '1',
  ];
  for (const [k, v] of Object.entries(o)) f[Number(k) - 1] = v;
  return f.join(',');
}

function buildEpw(
  opts: {
    header?: string[];
    leap?: boolean;
    overrides?: (i: number) => RowOverrides | undefined;
    dropRow?: number;
    eol?: string;
  } = {},
): string {
  const days = [...DAYS_IN_MONTH];
  if (opts.leap) days[1] = 29;
  const lines = [...(opts.header ?? HEADER)];
  let i = 0;
  days.forEach((n, m) => {
    for (let d = 1; d <= n; d++) {
      for (let h = 1; h <= 24; h++) {
        if (i !== opts.dropRow) lines.push(row(i, m + 1, d, h, opts.overrides?.(i)));
        i++;
      }
    }
  });
  return lines.join(opts.eol ?? '\n') + (opts.eol ?? '\n');
}

function expectError(text: string, code: string, line?: number) {
  try {
    parseEpw(text);
  } catch (err) {
    expect(err).toBeInstanceOf(EpwParseError);
    const e = err as EpwParseError;
    expect(e.code).toBe(code);
    if (line !== undefined) expect(e.line).toBe(line);
    return e;
  }
  throw new Error(`esperava erro ${code}`);
}

describe('parseEpw: cabeçalho', () => {
  it('lê local, latitude, longitude, fuso e elevação', () => {
    const epw = parseEpw(buildEpw());
    expect(epw.location).toEqual({
      city: 'Florianopolis-Luz.Intl.AP',
      state: 'SC',
      country: 'BRA',
      source: 'SRC-TMYx',
      wmo: '838990',
      latitude: -27.67,
      longitude: -48.547,
      timeZone: -3,
      elevation: 6.1,
    });
    expect(epw.comments).toEqual(['Arquivo sintético para testes', 'Gerado em parseEpw.test.ts']);
  });

  it('aceita BOM e quebras de linha CRLF', () => {
    const epw = parseEpw('\uFEFF' + buildEpw({ eol: '\r\n' }));
    expect(epw.location.city).toBe('Florianopolis-Luz.Intl.AP');
    expect(epw.hours).toBe(8760);
  });

  it('rejeita arquivo sem linha LOCATION', () => {
    expectError(buildEpw({ header: HEADER.slice(1).concat('COMMENTS 3,x') }), 'missingLocation', 1);
  });

  it('rejeita arquivo vazio ou que não é EPW', () => {
    expectError('', 'missingLocation');
    expectError('mês,dia,hora\n1,1,1\n', 'missingLocation', 1);
  });

  it.each([
    ['latitude fora de [-90, 90]', 6, '-95', 'invalidLatitude'],
    ['longitude fora de [-180, 180]', 7, '200', 'invalidLongitude'],
    ['fuso fora de [-12, 14]', 8, '-13', 'invalidTimeZone'],
    ['latitude não numérica', 6, 'abc', 'invalidLatitude'],
    ['elevação não numérica', 9, '', 'invalidElevation'],
  ])('rejeita %s', (_label, index, value, code) => {
    const parts = HEADER[0]!.split(',');
    parts[index] = value;
    expectError(buildEpw({ header: [parts.join(','), ...HEADER.slice(1)] }), code, 1);
  });
});

describe('parseEpw: dados horários', () => {
  it('lê 8760 horas na ordem do arquivo', () => {
    const epw = parseEpw(buildEpw());
    expect(epw.hours).toBe(8760);
    expect(epw.hasLeapDay).toBe(false);
    expect([epw.month[0], epw.day[0], epw.hour[0]]).toEqual([1, 1, 1]);
    expect([epw.month[8759], epw.day[8759], epw.hour[8759]]).toEqual([12, 31, 24]);
    expect(epw.fields.dryBulb[3]).toBeCloseTo(20.3, 12);
    expect(epw.fields.globalHorizontal[12]).toBe(400);
    expect(epw.fields.windDirection[5]).toBe(50);
    expect(epw.fields.windSpeed[6]).toBe(6);
    expect(epw.fields.pressure[0]).toBe(101300);
  });

  it('converte códigos de ausente em NaN e conta por campo', () => {
    const epw = parseEpw(
      buildEpw({
        overrides: (i): RowOverrides | undefined =>
          i === 10
            ? { 7: '99.9', 9: '999', 15: '9999', 21: '999', 22: '999', 23: '99', 10: '999999' }
            : i === 11
              ? { 15: '9999' }
              : undefined,
      }),
    );
    expect(Number.isNaN(epw.fields.dryBulb[10])).toBe(true);
    expect(Number.isNaN(epw.fields.directNormal[11])).toBe(true);
    expect(epw.missing.dryBulb).toBe(1);
    expect(epw.missing.relativeHumidity).toBe(1);
    expect(epw.missing.pressure).toBe(1);
    expect(epw.missing.directNormal).toBe(2);
    expect(epw.missing.windDirection).toBe(1);
    expect(epw.missing.windSpeed).toBe(1);
    expect(epw.missing.totalSkyCover).toBe(1);
    expect(epw.missing.globalHorizontal).toBe(0);
  });

  it('aceita ano com 29/02 (8784 horas) e sinaliza', () => {
    const epw = parseEpw(buildEpw({ leap: true }));
    expect(epw.hours).toBe(8784);
    expect(epw.hasLeapDay).toBe(true);
  });

  it('rejeita número de horas diferente de 8760 ou 8784', () => {
    const text = buildEpw();
    const lines = text.trimEnd().split('\n');
    expectError(lines.slice(0, -24).join('\n'), 'invalidHourCount');
  });

  it('rejeita sequência de horas quebrada, indicando a linha', () => {
    // A hora de índice 100 some e a 8761ª linha esperada não existe: a primeira quebra está na linha 9 + 100.
    const e = expectError(buildEpw({ dropRow: 100 }).concat(row(0, 12, 31, 24)), 'invalidSequence');
    expect(e.line).toBe(9 + 100);
  });

  it('rejeita linha com campos faltando', () => {
    const lines = buildEpw().split('\n');
    lines[8 + 50] = lines[8 + 50]!.split(',').slice(0, 20).join(',');
    expectError(lines.join('\n'), 'tooFewFields', 9 + 50);
  });

  it('rejeita valor não numérico, indicando linha e campo', () => {
    const e = expectError(
      buildEpw({ overrides: (i) => (i === 200 ? { 14: 'x' } : undefined) }),
      'invalidNumber',
      9 + 200,
    );
    expect(e.field).toBe('globalHorizontal');
  });

  it('rejeita radiação negativa', () => {
    const e = expectError(
      buildEpw({ overrides: (i) => (i === 300 ? { 15: '-5' } : undefined) }),
      'negativeRadiation',
      9 + 300,
    );
    expect(e.field).toBe('directNormal');
  });
});
