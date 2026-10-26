import { describe, expect, it } from 'vitest';
import type { EpwData } from '../epw/parseEpw';
import { sectorOf, speedClass, speedResolution, windRose } from './windRose';

/** EPW mínimo com as horas dadas (mês, hora, direção, velocidade). */
function epwOf(rows: [number, number, number, number][]): EpwData {
  const n = rows.length;
  const f = () => new Float64Array(n).fill(NaN);
  const fields = {
    dryBulb: f(),
    dewPoint: f(),
    relativeHumidity: f(),
    pressure: f(),
    extraterrestrialHorizontal: f(),
    globalHorizontal: f(),
    directNormal: f(),
    diffuseHorizontal: f(),
    windDirection: Float64Array.from(rows.map((r) => r[2])),
    windSpeed: Float64Array.from(rows.map((r) => r[3])),
    totalSkyCover: f(),
  };
  return {
    location: {
      city: '',
      state: '',
      country: '',
      source: '',
      wmo: '',
      latitude: -27,
      longitude: -48,
      timeZone: -3,
      elevation: 0,
    },
    comments: [],
    hours: n,
    hasLeapDay: false,
    month: Uint8Array.from(rows.map((r) => r[0])),
    day: Uint8Array.from(rows.map(() => 1)),
    hour: Uint8Array.from(rows.map((r) => r[1])),
    fields,
    missing: Object.fromEntries(Object.keys(fields).map((k) => [k, 0])) as EpwData['missing'],
  };
}

describe('setores e classes (spec 06, seção 6.2)', () => {
  it('setor centrado no Norte; fronteira vai para o setor seguinte no sentido horário', () => {
    expect(sectorOf(0, 8)).toBe(0);
    expect(sectorOf(360, 8)).toBe(0);
    expect(sectorOf(337.5, 8)).toBe(0);
    expect(sectorOf(337.4, 8)).toBe(7);
    expect(sectorOf(22.4, 8)).toBe(0);
    expect(sectorOf(22.5, 8)).toBe(1);
    expect(sectorOf(90, 16)).toBe(4);
    expect(sectorOf(11.25, 16)).toBe(1);
  });

  it('classes [0,5; 2), [2; 4), [4; 6) e 6 ou mais', () => {
    expect([0.5, 1.99, 2, 3.99, 4, 5.99, 6, 15].map(speedClass)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
});

describe('rosa', () => {
  const epw = epwOf([
    [1, 1, 0, 0], // calmaria (velocidade 0, direção 0)
    [1, 7, 180, 0.4], // calmaria com direção registrada
    [1, 13, 90, 3], // L, classe 1
    [1, 14, 95, 5], // L, classe 2
    [7, 13, 270, 7], // O, classe 3 (julho)
    [7, 20, 999, 5], // direção ausente
  ]);
  epw.fields.windDirection[5] = NaN;

  it('frequências sobre as horas válidas, calmaria à parte, velocidade média sem calmarias', () => {
    const r = windRose(epw, { sectors: 8 });
    expect([r.hours, r.valid]).toEqual([6, 5]);
    expect(r.calm).toBeCloseTo(40, 12);
    expect(r.frequency[2]).toEqual([0, 20, 20, 0]);
    expect(r.frequency[6]).toEqual([0, 0, 0, 20]);
    expect(r.meanSpeed[2]).toBe(4);
    expect(r.meanSpeed[0]).toBeNull();
  });

  it('filtros por estação (meses) e período do dia (horas do arquivo)', () => {
    expect(windRose(epw, { sectors: 8, season: 'jun-ago' }).valid).toBe(1);
    const afternoon = windRose(epw, { sectors: 8, period: 'tarde' });
    expect([afternoon.hours, afternoon.valid, afternoon.calm]).toEqual([3, 3, 0]);
    expect(windRose(epw, { sectors: 8, season: 'dez-fev', period: 'madrugada' }).calm).toBe(100);
  });

  it('resolução da velocidade: passos inteiros e de 0,1 m/s', () => {
    expect(speedResolution(epw)).toBe(0.1);
    expect(
      speedResolution(
        epwOf([
          [1, 1, 0, 2],
          [1, 2, 0, 3],
        ]),
      ),
    ).toBe(1);
    expect(
      speedResolution(
        epwOf([
          [1, 1, 0, 2.5],
          [1, 2, 0, 3],
        ]),
      ),
    ).toBe(0.5);
  });
});

describe('condição térmica e correção da velocidade (F4.4, seções 6.3 e 6.7)', () => {
  const epw = epwOf([
    [1, 1, 0, 0.4], // calmaria na estação
    [1, 13, 90, 3], // L, classe 1
    [1, 14, 95, 5], // L, classe 2
    [7, 13, 270, 7], // O, classe 3
  ]);
  // Classes das linhas (HOUR_CLASS): fria, quente, quente, neutra.
  const classes = Int8Array.from([-1, 1, 1, 0]);

  it('só as linhas da classe pedida; as demais saem das horas do filtro', () => {
    const hot = windRose(epw, { sectors: 8, thermal: { classes, keep: 'hot' } });
    expect([hot.hours, hot.valid, hot.calm]).toEqual([2, 2, 0]);
    expect(hot.frequency[2]).toEqual([0, 50, 50, 0]);
    const cold = windRose(epw, { sectors: 8, thermal: { classes, keep: 'cold' } });
    expect([cold.hours, cold.calm]).toEqual([1, 100]);
    const neutral = windRose(epw, {
      sectors: 8,
      season: 'dez-fev',
      thermal: { classes, keep: 'neutral' },
    });
    expect([neutral.hours, neutral.valid, neutral.calm]).toEqual([0, 0, 0]);
    expect(neutral.frequency.flat().every((v) => v === 0)).toBe(true);
    expect(() =>
      windRose(epw, { sectors: 8, thermal: { classes: classes.slice(1), keep: 'hot' } }),
    ).toThrow(RangeError);
  });

  it('o fator multiplica a velocidade antes da calmaria e das classes; a direção não muda', () => {
    // k = 0,5: 0,4 → 0,2 (calmaria); 3 → 1,5 (classe 0); 5 → 2,5 (classe 1); 7 → 3,5 (classe 1).
    const half = windRose(epw, { sectors: 8, speedFactor: 0.5 });
    expect(half.calm).toBe(25);
    expect(half.frequency[2]).toEqual([25, 25, 0, 0]);
    expect(half.frequency[6]).toEqual([0, 25, 0, 0]);
    expect(half.meanSpeed[2]).toBe(2);
    // k = 1,5: a calmaria da estação (0,4 m/s, direção 0°) passa a 0,6 m/s e conta no Norte.
    const up = windRose(epw, { sectors: 8, speedFactor: 1.5 });
    expect(up.calm).toBe(0);
    expect(up.frequency[0]).toEqual([25, 0, 0, 0]);
    expect(up.meanSpeed[0]).toBeCloseTo(0.6, 12);
    // k = 1 dá a rosa sem correção.
    expect(windRose(epw, { sectors: 16, speedFactor: 1 })).toEqual(windRose(epw, { sectors: 16 }));
    expect(() => windRose(epw, { sectors: 8, speedFactor: 0 })).toThrow(RangeError);
    expect(() => windRose(epw, { sectors: 8, speedFactor: NaN })).toThrow(RangeError);
  });
});
