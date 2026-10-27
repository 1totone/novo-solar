import { describe, expect, it } from 'vitest';
import { solarPosition } from '../solar/spa';
import { readDirection, SUN_RADIUS_DEG } from './readout';
import { seasonInstants, sunPath } from './sunChart';

const RECIFE = { latitude: -8.126, longitude: -34.924, elevation: 10.1, timeZone: -3 };
const FLORIPA = { latitude: -27.67, longitude: -48.547, elevation: 6.1, timeZone: -3 };
const HELSINKI = { latitude: 60.317, longitude: 24.963, elevation: 51, timeZone: 2 };

const DEG = Math.PI / 180;
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
  const dot = u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
  return Math.acos(Math.min(1, dot)) / DEG;
}

describe('leitura de um ponto da carta', () => {
  it('ida e volta: em cada passagem devolvida, o disco do sol (pelo SPA) cobre o ponto', () => {
    for (const site of [RECIFE, FLORIPA, HELSINKI]) {
      for (let zenith = 5; zenith < 90; zenith += 10) {
        for (let azimuth = 0; azimuth < 360; azimuth += 15) {
          const r = readDirection(site, zenith, azimuth);
          for (const p of r.passages) {
            const s = solarPosition(p.utcMs, site.latitude, site.longitude, site.elevation);
            expect(separation(s.zenith, s.azimuth, zenith, azimuth)).toBeLessThan(SUN_RADIUS_DEG);
          }
        }
      }
    }
  });

  it('Recife, 21/06 às 9 h solares (tarefa 1 do F2.9): altura de 36°, azimute de 53°', () => {
    // O ponto da trajetória de 21/06 na hora solar 9, pelo SPA.
    const path = sunPath(RECIFE, 2026, 6, 21, 1);
    const reading = path
      .map((p) => ({ p, r: readDirection(RECIFE, p.zenith, p.azimuth) }))
      .find(({ r }) => Math.abs(r.solarHour - 9) < 1 / 120)!;
    expect(90 - reading.p.zenith).toBeCloseTo(36, 0);
    expect(reading.p.azimuth).toBeCloseTo(53, 0);
    // Perto do solstício: uma passagem por volta de 21/06 (o centro do sol no dia do solstício).
    for (const pass of reading.r.passages) {
      expect(pass.date.month).toBe(6);
      expect(Math.abs(pass.date.day - 21)).toBeLessThanOrEqual(1);
    }
  });

  it('hora solar e hora legal: ao meio-dia solar, o sol a Norte em Recife (verão do Sul: a Sul)', () => {
    // 15 de abril: declinação de cerca de +9,7°; em Recife (−8,1°), meio-dia com o sol a Norte.
    const t = Date.UTC(2026, 3, 15, 12);
    const s = solarPosition(t, RECIFE.latitude, RECIFE.longitude, RECIFE.elevation);
    const r = readDirection(RECIFE, s.zenith, s.azimuth);
    expect(r.solarHour).toBeCloseTo(12 + s.hourAngle / 15, 3);
    expect(r.declination).toBeCloseTo(s.declination, 2);
    expect(r.passages).toHaveLength(2);
    const match = r.passages.find((p) => p.date.month === 4 && p.date.day === 15)!;
    // Hora legal = UTC − 3 h.
    expect(match.legalHour).toBeCloseTo(9, 1);
    // A outra passagem, simétrica em relação ao solstício de junho: fim de agosto.
    const other = r.passages.find((p) => p !== match)!;
    expect(other.date.month).toBe(8);
  });

  it('além da trajetória do solstício: o disco cobre até o raio dele; depois, o sol nunca chega', () => {
    const { juneSolstice } = seasonInstants(2026);
    const max = solarPosition(juneSolstice, 0, 0, 0).declination;
    // Em Florianópolis, ao meio-dia solar a Norte, o ângulo zenital é φ − δ (em módulo).
    const zenithFor = (dec: number) => Math.abs(FLORIPA.latitude - dec);
    const inside = readDirection(FLORIPA, zenithFor(max + SUN_RADIUS_DEG / 2), 0);
    expect(inside.passages).toHaveLength(1);
    expect(inside.solsticeEdge).toBe(true);
    expect(inside.passages[0]!.date).toMatchObject({ month: 6, day: 21 });
    const outside = readDirection(FLORIPA, zenithFor(max + 2 * SUN_RADIUS_DEG), 0);
    expect(outside.passages).toHaveLength(0);
    // Sul, perto do polo celeste: o sol nunca está ali.
    expect(readDirection(FLORIPA, 30, 180).passages).toHaveLength(0);
  });

  it('no equinócio de março, as duas passagens são nos dois equinócios', () => {
    const { marchEquinox, septemberEquinox } = seasonInstants(2026);
    const s = solarPosition(marchEquinox, RECIFE.latitude, RECIFE.longitude, RECIFE.elevation);
    const r = readDirection(RECIFE, s.zenith, s.azimuth);
    expect(r.passages).toHaveLength(2);
    // Um minuto de diferença de δ muda o instante em poucos minutos: até 1 h dos equinócios.
    const hours = (a: number, b: number) => Math.abs(a - b) / 3_600_000;
    expect(hours(r.passages[0]!.utcMs, marchEquinox)).toBeLessThan(1);
    // Em setembro, a mesma declinação vem na mesma hora solar do dia do equinócio, não no instante.
    expect(Math.abs(r.passages[1]!.utcMs - septemberEquinox) / 86_400_000).toBeLessThan(1);
  });
});
