import { describe, expect, it } from 'vitest';
import { bandIndex, overlayCells, PERIODS, periodOf } from './overlay';

describe('períodos (spec 05, seção 5.2)', () => {
  it('10 quinzenas por semestre, com os limites da spec', () => {
    expect(PERIODS).toHaveLength(20);
    expect(PERIODS.filter((p) => p.semester === 1)).toHaveLength(10);
    const at = (m: number, d: number) => periodOf(m, d).index;
    expect(at(12, 22)).toBe(1);
    expect(at(1, 15)).toBe(1);
    expect(at(1, 16)).toBe(2);
    expect(at(2, 28)).toBe(4);
    expect(at(2, 29)).toBe(4); // 29/02 entra no período de 16 a 28/02
    expect(at(3, 1)).toBe(5);
    expect(at(6, 21)).toBe(10);
    expect(at(6, 22)).toBe(11);
    expect(at(12, 21)).toBe(20);
  });

  it('cada dia do ano cai em exatamente um período; semestres de 182 e 183 dias', () => {
    const count = new Map<number, number>();
    for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 86_400_000) {
      const d = new Date(t);
      const p = periodOf(d.getUTCMonth() + 1, d.getUTCDate());
      count.set(p.semester, (count.get(p.semester) ?? 0) + 1);
    }
    expect(count.get(1)).toBe(182);
    expect(count.get(2)).toBe(183);
  });
});

describe('faixas', () => {
  it('classe pelo limite superior incluído, como no 6.2 ("até 10", "10 a 14", "acima de 25")', () => {
    const limits = [10, 14, 20, 25];
    expect(bandIndex(-5, limits)).toBe(0);
    expect(bandIndex(10, limits)).toBe(0);
    expect(bandIndex(10.01, limits)).toBe(1);
    expect(bandIndex(25, limits)).toBe(3);
    expect(bandIndex(25.1, limits)).toBe(4);
  });
});

describe('células', () => {
  const site = { latitude: -27.67, longitude: -48.547, elevation: 6.1, timeZone: -3 };
  const cells = overlayCells(site, 2, 'integrated');

  it('horas vizinhas do mesmo período compartilham a borda de hora legal', () => {
    const a = cells.find((c) => c.period === 13 && c.hour === 10)!;
    const b = cells.find((c) => c.period === 13 && c.hour === 11)!;
    expect([a.start, a.end, b.start, b.end]).toEqual([9, 10, 10, 11]);
    // lado "fim" de a (curva das 10 h, do primeiro ao último dia) = lado "início" de b, invertido
    const days = 15;
    const n = a.polygon.length;
    const steps = (n - 2 * days) / 2;
    const endSideA = a.polygon.slice(steps, steps + days);
    const startSideB = b.polygon.slice(n - days).reverse();
    expect(endSideA).toEqual(startSideB);
  });

  it('não desenha células inteiramente abaixo do horizonte', () => {
    expect(cells.some((c) => c.hour === 1 || c.hour === 24)).toBe(false);
    expect(cells.every((c) => c.polygon.some((v) => v.zenith < 90))).toBe(true);
  });

  it('temperatura: intervalos centrados na hora (h − 0,5 a h + 0,5)', () => {
    const c = overlayCells(site, 1, 'instant').find((x) => x.period === 3 && x.hour === 12)!;
    expect([c.start, c.end]).toEqual([11.5, 12.5]);
  });
});
