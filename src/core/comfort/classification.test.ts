import { describe, expect, it } from 'vitest';
import {
  adaptiveComfort,
  classifyHours,
  dailyMeans,
  HOUR_CLASS,
  hourTemperature,
  prevailingMean,
} from './classification';

/** Dias com temperatura constante em cada dia. */
const days = (...values: number[]) => values.flatMap((v) => new Array<number>(24).fill(v));

describe('hourTemperature', () => {
  it('média do início e do fim da hora, com a última linha antes da primeira', () => {
    const t = days(20, 22);
    t[0] = 10;
    const mean = hourTemperature(t, 'mean');
    expect(mean[0]).toBe((22 + 10) / 2); // linha anterior à primeira: a última do arquivo
    expect(mean[1]).toBe((10 + 20) / 2);
    expect(mean[24]).toBe(21);
    expect(hourTemperature(t, 'end')[0]).toBe(10);
  });

  it('valor ausente no início ou no fim da hora deixa a hora sem temperatura', () => {
    const t = days(20);
    t[5] = NaN;
    const mean = hourTemperature(t, 'mean');
    expect(Number.isNaN(mean[5]!)).toBe(true);
    expect(Number.isNaN(mean[6]!)).toBe(true);
    expect(mean[7]).toBe(20);
  });

  it('recusa dados que não são dias inteiros', () => {
    expect(() => hourTemperature([1, 2, 3], 'mean')).toThrow(RangeError);
  });
});

describe('dailyMeans', () => {
  it('média das 24 linhas; exige 18 presentes', () => {
    const t = days(10, 20, 30);
    for (let h = 0; h < 6; h++) t[24 + h] = NaN; // 18 presentes: ainda tem média
    for (let h = 0; h < 7; h++) t[48 + h] = NaN; // 17 presentes: sem média
    const m = dailyMeans(t);
    expect(m[0]).toBe(10);
    expect(m[1]).toBe(20);
    expect(Number.isNaN(m[2]!)).toBe(true);
  });
});

describe('prevailingMean', () => {
  const daily = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  it('aritmética dos 7 dias anteriores, sem o próprio dia, com o ano cíclico', () => {
    const p = prevailingMean(daily, { averaging: 'arithmetic', days: 7 });
    expect(p[9]).toBeCloseTo((12 + 13 + 14 + 15 + 16 + 17 + 18) / 7, 12);
    // Dia 0: os 7 anteriores são os últimos 7 do arquivo.
    expect(p[0]).toBeCloseTo((13 + 14 + 15 + 16 + 17 + 18 + 19) / 7, 12);
  });

  it('exponencial normalizada: pesos α^(i − 1) do dia mais recente ao mais antigo', () => {
    const alpha = 0.6;
    const p = prevailingMean(daily, { averaging: 'exponential', alpha, days: 7 });
    const prev = [18, 17, 16, 15, 14, 13, 12];
    const w = prev.map((_, i) => alpha ** i);
    const expected = prev.reduce((s, v, i) => s + w[i]! * v, 0) / w.reduce((a, b) => a + b, 0);
    expect(p[9]).toBeCloseTo(expected, 12);
  });

  it('dias sem média saem da soma; sem nenhum dia, indefinida', () => {
    const d = [NaN, NaN, NaN, NaN, NaN, NaN, 20, 30];
    const p = prevailingMean(d, { averaging: 'arithmetic', days: 7 });
    expect(p[7]).toBe(20); // dias 0 a 6: só o dia 6 tem média
    const empty = prevailingMean(new Array<number>(8).fill(NaN), {
      averaging: 'arithmetic',
      days: 7,
    });
    expect(Number.isNaN(empty[0]!)).toBe(true);
  });

  it('recusa α fora de 0,6 a 0,9 e n fora de 7 a 30', () => {
    expect(() =>
      prevailingMean(daily, { averaging: 'exponential', alpha: 0.95, days: 7 }),
    ).toThrow();
    expect(() =>
      prevailingMean(daily, { averaging: 'exponential', alpha: 0.5, days: 7 }),
    ).toThrow();
    expect(() => prevailingMean(daily, { averaging: 'arithmetic', days: 6 })).toThrow();
    expect(() => prevailingMean(daily, { averaging: 'arithmetic', days: 31 })).toThrow();
  });
});

describe('adaptiveComfort', () => {
  it('0,31 · t_pma + 17,8 dentro de 10 °C a 33,5 °C (inclusive)', () => {
    expect(adaptiveComfort(20)).toBeCloseTo(24, 12); // exemplo do pythermalcomfort: 20,5 a 27,5 (80%)
    expect(adaptiveComfort(10)).toBeCloseTo(20.9, 12);
    expect(adaptiveComfort(33.5)).toBeCloseTo(28.185, 12);
    expect(Number.isNaN(adaptiveComfort(9.99))).toBe(true);
    expect(Number.isNaN(adaptiveComfort(33.51))).toBe(true);
    expect(Number.isNaN(adaptiveComfort(NaN))).toBe(true);
  });
});

describe('classifyHours', () => {
  it('limiares fixos: acima de T_quente é quente, abaixo de T_fria é fria, empate é neutro', () => {
    const t = [17.9, 18, 22, 26, 26.1, ...new Array<number>(19).fill(22)];
    const r = classifyHours(t, { kind: 'thresholds', cold: 18, hot: 26 }, 'end');
    expect(Array.from(r.classes.slice(0, 5))).toEqual([
      HOUR_CLASS.cold,
      HOUR_CLASS.neutral,
      HOUR_CLASS.neutral,
      HOUR_CLASS.neutral,
      HOUR_CLASS.hot,
    ]);
    expect(r.counts).toEqual({ hot: 1, cold: 1, neutral: 22, none: 0 });
    expect(r.prevailingMean).toBeNull();
  });

  it('limiar em branco: sem horas daquela classe', () => {
    const t = days(5);
    expect(classifyHours(t, { kind: 'thresholds', cold: null, hot: 26 }).counts.cold).toBe(0);
    expect(classifyHours(t, { kind: 'thresholds', cold: 10, hot: null }).counts.cold).toBe(24);
  });

  it('temperatura de equilíbrio: duas classes, só o empate exato é neutro', () => {
    const t = [23.9, 24, 24.1, ...new Array<number>(21).fill(24)];
    const r = classifyHours(t, { kind: 'balance', balance: 24 }, 'end');
    expect(Array.from(r.classes.slice(0, 3))).toEqual([
      HOUR_CLASS.cold,
      HOUR_CLASS.neutral,
      HOUR_CLASS.hot,
    ]);
  });

  it('recusa limiares invertidos', () => {
    expect(() => classifyHours(days(20), { kind: 'thresholds', cold: 27, hot: 26 })).toThrow();
  });

  it('faixa adaptativa: limites do dia pela média dos dias anteriores', () => {
    // 30 dias a 20 °C: t_pma = 20, conforto 24, faixa de 80% de 20,5 a 27,5.
    const t = days(...new Array<number>(30).fill(20));
    t[24 * 10 + 5] = 27.6;
    t[24 * 10 + 6] = 27.4; // abaixo do limite de 27,5 °C: neutra
    const r = classifyHours(
      t,
      { kind: 'adaptive', acceptability: 80, running: { averaging: 'arithmetic', days: 7 } },
      'end',
    );
    expect(r.prevailingMean![10]).toBeCloseTo(20, 12);
    expect(r.upper[24 * 10]).toBeCloseTo(27.5, 12);
    expect(r.lower[24 * 10]).toBeCloseTo(20.5, 12);
    expect(r.classes[24 * 10 + 5]).toBe(HOUR_CLASS.hot);
    expect(r.classes[24 * 10 + 6]).toBe(HOUR_CLASS.neutral);
    expect(r.classes[0]).toBe(HOUR_CLASS.cold); // 20 °C < 20,5 °C
  });

  it('faixa adaptativa fora de aplicação (t_pma < 10 °C): horas sem classe', () => {
    const t = days(...new Array<number>(10).fill(8));
    const r = classifyHours(t, {
      kind: 'adaptive',
      acceptability: 90,
      running: { averaging: 'exponential', alpha: 0.8, days: 7 },
    });
    expect(r.counts.none).toBe(240);
    expect(Number.isNaN(r.comfort![0]!)).toBe(true);
  });
});
