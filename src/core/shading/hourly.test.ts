import { describe, expect, it } from 'vitest';
import { REFERENCE_YEAR } from '../solar/constants';
import { solarPosition } from '../solar/spa';
import { localStandardToUtc } from '../solar/time';
import { buildScene } from './geometry';
import { HOURS_PER_YEAR, hourIndex, hourlyShading, monthHourMap, sunSamples } from './hourly';
import { facadeFromEnu, sunlitFraction } from './shadedFraction';

const RAD = Math.PI / 180;
const site = { latitude: -27.67, longitude: -48.547, elevation: 6.1, timeZone: -3 };
const samples = sunSamples(site);

function enu(utcMs: number) {
  const p = solarPosition(utcMs, site.latitude, site.longitude, site.elevation);
  const h = p.elevation * RAD;
  const a = p.azimuth * RAD;
  return [Math.cos(h) * Math.sin(a), Math.cos(h) * Math.cos(a), Math.sin(h)];
}

describe('amostras do sol no ano (spec 07, seção 7.6)', () => {
  it('8760 horas, 6 amostras por hora no meio de subintervalos de 10 min', () => {
    expect(HOURS_PER_YEAR).toBe(8760);
    expect(samples.samplesPerHour).toBe(6);
    expect(samples.at).toBe('middle');
    expect(samples.east).toHaveLength(8760 * 6);
    // 21/06, hora 13 (12:00 a 13:00), primeira e última amostras: 12:05 e 12:55.
    const i = hourIndex(6, 21, 13);
    for (const [k, minutes] of [
      [0, 5],
      [5, 55],
    ] as const) {
      const expected = enu(localStandardToUtc(REFERENCE_YEAR, 6, 21, 12 + minutes / 60, -3));
      const j = i * 6 + k;
      expect(samples.east[j]).toBeCloseTo(expected[0]!, 12);
      expect(samples.north[j]).toBeCloseTo(expected[1]!, 12);
      expect(samples.up[j]).toBeCloseTo(expected[2]!, 12);
    }
  });

  it('opção "end": fim de cada passo, como o EnergyPlus; uma amostra no meio da hora', () => {
    const end = sunSamples(site, { samplesPerHour: 4, at: 'end' });
    const j = hourIndex(1, 1, 18) * 4 + 3; // 17:00 a 18:00, última amostra: 18:00
    const expected = enu(localStandardToUtc(REFERENCE_YEAR, 1, 1, 18, -3));
    expect(end.up[j]).toBeCloseTo(expected[2]!, 12);
    const one = sunSamples(site, { samplesPerHour: 1 });
    const mid = enu(localStandardToUtc(REFERENCE_YEAR, 12, 31, 23.5, -3));
    expect(one.up[hourIndex(12, 31, 24)]).toBeCloseTo(mid[2]!, 12);
  });

  it('índice da hora: dia a dia, horas 1 a 24', () => {
    expect(hourIndex(1, 1, 1)).toBe(0);
    expect(hourIndex(3, 1, 1)).toBe(59 * 24);
    expect(hourIndex(12, 31, 24)).toBe(8759);
    expect(() => hourIndex(2, 29, 1)).toThrow(RangeError);
    expect(() => hourIndex(1, 1, 0)).toThrow(RangeError);
  });
});

describe('fração ensolarada hora a hora', () => {
  it('sem proteção, a fração ensolarada é a exposição', () => {
    const hourly = hourlyShading(samples, buildScene({ width: 1, height: 1 }, []), 0);
    for (let i = 0; i < HOURS_PER_YEAR; i++) {
      expect(hourly.sunlit[i]).toBe(hourly.exposure[i]);
      expect(hourly.sunlitIncidence[i]).toBe(hourly.incidence[i]);
    }
    // Fachada norte em Florianópolis: noite e madrugada sem sol; meio-dia de junho com sol.
    expect(hourly.exposure[hourIndex(6, 21, 2)]).toBe(0);
    expect(hourly.exposure[hourIndex(6, 21, 13)]).toBe(1);
  });

  it('a média da hora é a média das amostras', () => {
    const scene = buildScene({ width: 1.5, height: 1.2 }, [
      { kind: 'overhang', depth: 0.8, above: 0.1, extendLeft: 0.5, extendRight: 0.5 },
    ]);
    const orientation = 20;
    const hourly = hourlyShading(samples, scene, orientation);
    for (const i of [hourIndex(1, 15, 8), hourIndex(4, 2, 12), hourIndex(9, 30, 17)]) {
      let sunlit = 0;
      let incidence = 0;
      for (let k = 0; k < 6; k++) {
        const j = i * 6 + k;
        const s = facadeFromEnu(samples.east[j]!, samples.north[j]!, samples.up[j]!, orientation);
        const f = sunlitFraction(scene, s);
        sunlit += f / 6;
        incidence += (f > 0 ? s.y * f : 0) / 6;
      }
      expect(hourly.sunlit[i]).toBeCloseTo(sunlit, 14);
      expect(hourly.sunlitIncidence[i]).toBeCloseTo(incidence, 14);
    }
  });

  it('mapa mês × hora: médias dos dias e percentual sombreado só com sol na janela', () => {
    const scene = buildScene({ width: 1.5, height: 1.2 }, [
      { kind: 'overhang', depth: 0.8, above: 0.1, extendLeft: 0.5, extendRight: 0.5 },
    ]);
    const hourly = hourlyShading(samples, scene, 0);
    const map = monthHourMap(hourly);
    expect(map.sunlit).toHaveLength(12);
    expect(map.sunlit[0]).toHaveLength(24);
    // Junho (30 dias), hora 13.
    let sunlit = 0;
    let exposure = 0;
    for (let d = 1; d <= 30; d++) {
      sunlit += hourly.sunlit[hourIndex(6, d, 13)]! / 30;
      exposure += hourly.exposure[hourIndex(6, d, 13)]! / 30;
    }
    expect(map.sunlit[5]![12]).toBeCloseTo(sunlit, 14);
    expect(map.exposure[5]![12]).toBeCloseTo(exposure, 14);
    expect(map.shadedWhenExposed[5]![12]).toBeCloseTo(1 - sunlit / exposure, 14);
    // Hora 1 (00:00 a 01:00): noite em todos os meses.
    for (let m = 0; m < 12; m++) expect(map.shadedWhenExposed[m]![0]).toBeNull();
  });
});
