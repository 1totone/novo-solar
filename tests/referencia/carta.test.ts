// Carta estereográfica (F1.3) contra pontos de referência independentes do pvlib:
// trajetórias (posicao.csv) e linhas horárias em hora solar verdadeira (linhas-horarias.csv),
// em latitudes equatorial (Belém, Manaus), tropical (Brasília) e subtropical (Florianópolis,
// Porto Alegre, Concepción). Também confere as datas de solstícios e equinócios de 2026.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hourLine, seasonInstants, sunPath } from '../../src/core/chart/sunChart';
import { project } from '../../src/core/chart/stereographic';

const root = fileURLToPath(new URL('../../', import.meta.url));
const casos = `${root}docs/validacao/casos/`;
const DEG = Math.PI / 180;
const CHART_RADIUS_MM = 60;

interface Site {
  id: string;
  latitude: number;
  longitude: number;
  fuso: number;
  elevacao: number;
}
const sites = new Map(
  (
    JSON.parse(readFileSync(`${casos}posicao-solar/metadados.json`, 'utf-8')) as {
      locais: Site[];
    }
  ).locais.map((s) => [
    s.id,
    { latitude: s.latitude, longitude: s.longitude, elevation: s.elevacao, timeZone: s.fuso },
  ]),
);

function csv(path: string): Record<string, string>[] {
  const [head, ...rows] = readFileSync(path, 'utf-8').trim().split('\n');
  const keys = head!.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i]!, v])));
}

function separation(z1: number, a1: number, z2: number, a2: number): number {
  const u = [
    Math.sin(z1 * DEG) * Math.sin(a1 * DEG),
    Math.sin(z1 * DEG) * Math.cos(a1 * DEG),
    Math.cos(z1 * DEG),
  ];
  const v = [
    Math.sin(z2 * DEG) * Math.sin(a2 * DEG),
    Math.sin(z2 * DEG) * Math.cos(a2 * DEG),
    Math.cos(z2 * DEG),
  ];
  const c = [
    u[1]! * v[2]! - u[2]! * v[1]!,
    u[2]! * v[0]! - u[0]! * v[2]!,
    u[0]! * v[1]! - u[1]! * v[0]!,
  ];
  return Math.atan2(Math.hypot(...c), u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) / DEG;
}

/** Distância na carta impressa com raio de 60 mm, em mm. */
function chartDistanceMm(z1: number, a1: number, z2: number, a2: number): number {
  const p = project(z1, a1);
  const q = project(z2, a2);
  return CHART_RADIUS_MM * Math.hypot(p.x - q.x, p.y - q.y);
}

describe('trajetórias do sol contra pvlib', () => {
  it('todos os pontos de referência acima do horizonte estão na trajetória do dia', () => {
    let worstDeg = 0;
    let worstMm = 0;
    let compared = 0;
    const byDay = new Map<string, Record<string, string>[]>();
    for (const r of csv(`${casos}posicao-solar/posicao.csv`)) {
      if (Number(r.zenite_geometrico) >= 90) continue;
      const key = `${r.local}|${r.hora_legal!.slice(0, 10)}`;
      byDay.set(key, [...(byDay.get(key) ?? []), r]);
    }
    for (const [key, rows] of byDay) {
      const [id, date] = key.split('|') as [string, string];
      const site = sites.get(id)!;
      const [y, m, d] = date.split('-').map(Number) as [number, number, number];
      const path = sunPath(site, y, m, d);
      for (const r of rows) {
        const t = Date.parse(r.utc!);
        const p = path.find((pt) => pt.utcMs === t);
        expect(p, `${key} ${r.hora_legal}`).toBeDefined();
        const zr = Number(r.zenite_geometrico);
        const ar = Number(r.azimute);
        worstDeg = Math.max(worstDeg, separation(p!.zenith, p!.azimuth, zr, ar));
        worstMm = Math.max(worstMm, chartDistanceMm(p!.zenith, p!.azimuth, zr, ar));
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(1500);
    expect(worstDeg).toBeLessThan(0.01);
    expect(worstMm).toBeLessThan(0.01);
  });

  it('a trajetória começa e termina no horizonte geométrico', () => {
    const site = sites.get('florianopolis')!;
    const path = sunPath(site, 2026, 6, 21);
    expect(path[0]!.zenith).toBeCloseTo(90, 4);
    expect(path.at(-1)!.zenith).toBeCloseTo(90, 4);
    expect(path.every((p) => p.zenith <= 90 + 1e-9)).toBe(true);
  });
});

describe('linhas horárias em hora solar verdadeira contra pvlib', () => {
  it('cada ponto de referência coincide com a linha horária no mesmo dia', () => {
    let worst = 0;
    let compared = 0;
    for (const r of csv(`${casos}carta/linhas-horarias.csv`)) {
      const site = sites.get(r.local!)!;
      const [y, m, d] = r.data!.split('-').map(Number) as [number, number, number];
      const line = hourLine(site, Number(r.hora_solar), [{ year: y, month: m, day: d }]);
      expect(line.length, `${r.local} ${r.data} ${r.hora_solar} h`).toBe(1);
      worst = Math.max(
        worst,
        separation(line[0]!.zenith, line[0]!.azimuth, Number(r.zenite), Number(r.azimute)),
      );
      compared++;
    }
    expect(compared).toBe(852);
    expect(worst).toBeLessThan(0.01);
  });
});

describe('solstícios e equinócios de 2026', () => {
  // Instantes publicados pelo U.S. Naval Observatory (Earth's Seasons, 2026), em UTC.
  const published = {
    marchEquinox: '2026-03-20T14:46:00Z',
    juneSolstice: '2026-06-21T08:24:00Z',
    septemberEquinox: '2026-09-23T00:05:00Z',
    decemberSolstice: '2026-12-21T20:50:00Z',
  } as const;

  it('dentro de 5 min dos valores publicados', () => {
    const s = seasonInstants(2026);
    for (const [k, iso] of Object.entries(published) as [keyof typeof published, string][]) {
      expect(Math.abs(s[k] - Date.parse(iso)) / 60000, k).toBeLessThan(5);
    }
  });
});
