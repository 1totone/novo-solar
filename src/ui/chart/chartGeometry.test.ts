import { describe, expect, it } from 'vitest';
import { chartGeometry, DATE_LABEL_RADIUS } from './chartGeometry';

const recife = { latitude: -8.126, longitude: -34.924, elevation: 10.1, timeZone: -3 };
const portoAlegre = { latitude: -30.0, longitude: -51.18, elevation: 3, timeZone: -3 };
const lisboa = { latitude: 38.72, longitude: -9.14, elevation: 100, timeZone: 0 };

describe('rótulos das datas nas trajetórias', () => {
  it('um rótulo por par de datas com a mesma trajetória (simétricas ao solstício de junho)', () => {
    for (const site of [recife, portoAlegre, lisboa]) {
      expect(chartGeometry(site).pathLabels.map((l) => l.months)).toEqual([
        [1, 11],
        [2, 10],
        [3, 9],
        [4, 8],
        [5, 7],
        [6],
        [12],
      ]);
    }
  });

  it('cada rótulo fica no poente da sua trajetória, logo fora do horizonte, do lado oeste', () => {
    for (const site of [recife, portoAlegre, lisboa]) {
      const g = chartGeometry(site);
      for (const label of g.pathLabels) {
        expect(label.x).toBeLessThan(0);
        expect(Math.hypot(label.x, label.y)).toBeCloseTo(DATE_LABEL_RADIUS, 9);
        // A direção do rótulo é a do pôr do sol das datas do grupo (a menos de 1°).
        for (const month of label.months) {
          const path = g.paths.find((p) => p.date.month === month)!;
          const sunset = path.points.find(
            (q) => q.x < 0 && Math.abs(Math.hypot(q.x, q.y) - 1) < 1e-3,
          )!;
          const cos =
            (sunset.x * label.x + sunset.y * label.y) /
            (Math.hypot(sunset.x, sunset.y) * Math.hypot(label.x, label.y));
          expect(Math.acos(Math.min(1, cos)) * (180 / Math.PI), `mês ${month}`).toBeLessThan(1);
        }
      }
    }
  });

  it('em Recife, o rótulo de junho fica ao norte do de dezembro (sol mais ao norte no inverno)', () => {
    const labels = chartGeometry(recife).pathLabels;
    const june = labels.find((l) => l.months[0] === 6)!;
    const december = labels.find((l) => l.months[0] === 12)!;
    // y do SVG cresce para o Sul.
    expect(june.y).toBeLessThan(0);
    expect(december.y).toBeGreaterThan(0);
  });

  it('sem pôr do sol (dia ou noite polar), a trajetória fica sem rótulo', () => {
    const labels = chartGeometry({
      latitude: -80,
      longitude: 0,
      elevation: 0,
      timeZone: 0,
    }).pathLabels;
    expect(labels.some((l) => l.months.includes(6))).toBe(false);
    expect(labels.some((l) => l.months.includes(12))).toBe(false);
  });
});
