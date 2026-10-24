// Sobreposição de dados (F2.4): cada hora do EPW cai na célula certa da carta (spec 05, seção 5.4).
// Os instantes de cada hora são calculados aqui, direto da convenção do EPW (spec 02, seção 2.2):
// radiação no meio do intervalo (h − 0,5), temperatura e umidade no instante h, hora legal com o
// fuso do cabeçalho. A posição do sol vem do SPA, já conferido contra o pvlib (F1.2).
// Os EPWs não são versionados (decisão 0010); no CI a ausência é erro, fora dele o teste é pulado.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { project } from '../../src/core/chart/stereographic';
import { parseEpw, type EpwData } from '../../src/core/epw/parseEpw';
import {
  cellStatistics,
  filePercentiles,
  overlayCells,
  type OverlayCell,
  type OverlayTiming,
} from '../../src/core/overlay/overlay';
import { solarPosition } from '../../src/core/solar/spa';

const root = fileURLToPath(new URL('../../', import.meta.url));
const FILES = {
  florianopolis: 'BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw',
  manaus: 'BRA_AM_Manaus-Gomes.Intl.AP.821110_TMYx.2011-2025.epw',
} as const;
const available = Object.values(FILES).every((f) => existsSync(`${root}.cache/epw/${f}`));
if (!available && process.env.CI) throw new Error('EPWs de teste ausentes no CI');

// Períodos da spec 05, seção 5.2 (primeiro e último dia), escritos de novo aqui de propósito.
const PERIOD_TABLE: [number, number, number, number][] = [
  [12, 22, 1, 15],
  [1, 16, 1, 31],
  [2, 1, 2, 15],
  [2, 16, 2, 28],
  [3, 1, 3, 15],
  [3, 16, 3, 31],
  [4, 1, 4, 15],
  [4, 16, 4, 30],
  [5, 1, 5, 15],
  [5, 16, 6, 21],
  [6, 22, 7, 15],
  [7, 16, 7, 31],
  [8, 1, 8, 15],
  [8, 16, 8, 31],
  [9, 1, 9, 15],
  [9, 16, 9, 30],
  [10, 1, 10, 15],
  [10, 16, 10, 31],
  [11, 1, 11, 15],
  [11, 16, 12, 21],
];
const key = (m: number, d: number) => m * 100 + d;

/** Período (1 a 20) de uma data, pela tabela acima. */
function expectedPeriod(month: number, day: number): number {
  const k = key(month, day);
  for (let i = 0; i < PERIOD_TABLE.length; i++) {
    const [m1, d1, m2, d2] = PERIOD_TABLE[i]!;
    const a = key(m1, d1);
    const b = key(m2, d2);
    if (a <= b ? k >= a && k <= b : k >= a || k <= b) return i + 1;
  }
  throw new Error(`data fora da tabela: ${day}/${month}`);
}

interface Poly {
  cell: OverlayCell;
  xs: number[];
  ys: number[];
  box: [number, number, number, number];
}

function toPoly(cell: OverlayCell): Poly {
  const pts = cell.polygon.map((p) => project(p.zenith, p.azimuth));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    cell,
    xs,
    ys,
    box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
  };
}

/** Par-ímpar; devolve também a distância até a borda, para a tolerância. */
function locate(p: Poly, x: number, y: number): { inside: boolean; distance: number } {
  let inside = false;
  let distance = Infinity;
  const n = p.xs.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = p.xs[i]!;
    const yi = p.ys[i]!;
    const xj = p.xs[j]!;
    const yj = p.ys[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    const dx = xj - xi;
    const dy = yj - yi;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / len2));
    distance = Math.min(distance, Math.hypot(x - (xi + t * dx), y - (yi + t * dy)));
  }
  return { inside, distance };
}

// Tolerância na carta de raio 1: 1e-4 (0,006 mm numa carta de 6 cm). As células de períodos
// vizinhos se encostam a meio dia do primeiro e do último dia; perto dos solstícios essa margem
// tem só milésimos de grau de declinação.
const EPS = 1e-4;

function check(epw: EpwData, timing: OverlayTiming, zoneShift = 0) {
  const { latitude, longitude, elevation, timeZone } = epw.location;
  const site = { latitude, longitude, elevation, timeZone };
  const polys = {
    1: overlayCells(site, 1, timing).map(toPoly),
    2: overlayCells(site, 2, timing).map(toPoly),
  };
  let checked = 0;
  let ownOk = 0;
  let foreign = 0;
  const missingCell: string[] = [];
  for (let i = 0; i < epw.hours; i++) {
    const month = epw.month[i]!;
    const day = epw.day[i]!;
    const hour = epw.hour[i]!;
    if (month === 2 && day === 29) continue;
    const t = timing === 'integrated' ? hour - 0.5 : hour;
    const utc = Date.UTC(2026, month - 1, day) + (t - (timeZone + zoneShift)) * 3_600_000;
    const sun = solarPosition(utc, latitude, longitude, elevation);
    if (sun.zenith >= 89.5) continue;
    checked++;
    const period = expectedPeriod(month, day);
    const semester = period <= 10 ? 1 : 2;
    const { x, y } = project(sun.zenith, sun.azimuth);
    const own = polys[semester].find((p) => p.cell.period === period && p.cell.hour === hour);
    if (!own) {
      missingCell.push(`${day}/${month} ${hour} h`);
      continue;
    }
    const where = locate(own, x, y);
    if (where.inside || where.distance <= EPS) ownOk++;
    for (const other of polys[semester]) {
      if (other === own) continue;
      const [x0, y0, x1, y1] = other.box;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const w = locate(other, x, y);
      if (w.inside && w.distance > EPS) foreign++;
    }
  }
  return { checked, ownOk, foreign, missingCell };
}

describe.skipIf(!available)('células da sobreposição contra as horas do EPW', () => {
  const epws = Object.fromEntries(
    Object.entries(FILES).map(([id, f]) => [
      id,
      parseEpw(readFileSync(`${root}.cache/epw/${f}`, 'utf-8')),
    ]),
  ) as Record<keyof typeof FILES, EpwData>;

  for (const id of Object.keys(FILES) as (keyof typeof FILES)[]) {
    for (const timing of ['integrated', 'instant'] as const) {
      it(`${id}, ${timing === 'integrated' ? 'radiação (h − 0,5)' : 'temperatura (h)'}: cada hora com sol cai só na sua célula`, () => {
        const r = check(epws[id], timing);
        expect(r.missingCell).toEqual([]);
        expect(r.checked).toBeGreaterThan(4000);
        expect(r.ownOk).toBe(r.checked);
        expect(r.foreign).toBe(0);
      });
    }

    it(`${id}: com o fuso deslocado 1 h, nenhuma hora fica na sua célula (teste negativo)`, () => {
      for (const timing of ['integrated', 'instant'] as const) {
        const r = check(epws[id], timing, 1);
        expect(r.checked).toBeGreaterThan(4000);
        expect(r.ownOk).toBe(0);
      }
    });
  }

  it('estatísticas de uma célula: média, mínimo, máximo e frequência acima do limiar', () => {
    const epw = epws.florianopolis;
    // Período 3 (1 a 15/02), hora 14 (radiação de 13 h a 14 h; temperatura às 14 h).
    const tbs: number[] = [];
    const ghi: number[] = [];
    for (let i = 0; i < epw.hours; i++) {
      if (epw.month[i] === 2 && epw.day[i]! <= 15 && epw.hour[i] === 14) {
        tbs.push(epw.fields.dryBulb[i]!);
        ghi.push(epw.fields.globalHorizontal[i]!);
      }
    }
    expect(tbs).toHaveLength(15);
    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    const s = cellStatistics(epw, 'dryBulb', 26).get('3-14')!;
    expect(s.n).toBe(15);
    expect(s.mean).toBeCloseTo(mean(tbs), 10);
    expect(s.min).toBe(Math.min(...tbs));
    expect(s.max).toBe(Math.max(...tbs));
    expect(s.above).toBeCloseTo(tbs.filter((v) => v > 26).length / 15, 12);
    const g = cellStatistics(epw, 'globalHorizontal').get('3-14')!;
    expect(g.mean).toBeCloseTo(mean(ghi), 10);
  });

  it('faixas pelo arquivo: percentis 20, 40, 60 e 80 nas horas com sol acima do horizonte', () => {
    const epw = epws.florianopolis;
    const { latitude, longitude, elevation, timeZone } = epw.location;
    for (const [field, timing] of [
      ['dryBulb', 'instant'],
      ['globalHorizontal', 'integrated'],
    ] as const) {
      const values: number[] = [];
      for (let i = 0; i < epw.hours; i++) {
        const t = timing === 'integrated' ? epw.hour[i]! - 0.5 : epw.hour[i]!;
        const utc = Date.UTC(2026, epw.month[i]! - 1, epw.day[i]!) + (t - timeZone) * 3_600_000;
        if (solarPosition(utc, latitude, longitude, elevation).zenith < 90) {
          values.push(epw.fields[field][i]!);
        }
      }
      values.sort((a, b) => a - b);
      const expected = [20, 40, 60, 80].map((q) => {
        const pos = (q / 100) * (values.length - 1);
        const lo = Math.floor(pos);
        return values[lo]! + (values[lo + 1]! - values[lo]!) * (pos - lo);
      });
      const got = filePercentiles(epw, field, timing, [20, 40, 60, 80]);
      got.forEach((v, k) => expect(v).toBeCloseTo(expected[k]!, 10));
    }
  });
});
