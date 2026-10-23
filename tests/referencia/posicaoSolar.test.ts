// Posição solar (NREL SPA em TypeScript) contra referências independentes:
// pvlib 0.16.1 (docs/validacao/casos/posicao-solar/) e o caso publicado no relatório do SPA.
// Tolerâncias: docs/spec/02-tempo-e-posicao-solar.md, seção 2.6.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DELTA_T_SECONDS } from '../../src/core/solar/constants';
import { solarPosition, sunTimes } from '../../src/core/solar/spa';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dir = `${root}docs/validacao/casos/posicao-solar/`;
const DEG = Math.PI / 180;

interface Site {
  id: string;
  latitude: number;
  longitude: number;
  fuso: number;
  elevacao: number;
}
const meta = JSON.parse(readFileSync(`${dir}metadados.json`, 'utf-8')) as {
  delta_t_s: number;
  locais: Site[];
};
const sites = new Map(meta.locais.map((s) => [s.id, s]));

function csv(name: string): Record<string, string>[] {
  const [head, ...rows] = readFileSync(dir + name, 'utf-8')
    .trim()
    .split('\n');
  const keys = head!.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [keys[i]!, v])));
}

function unitVector(zenith: number, azimuth: number): [number, number, number] {
  const z = zenith * DEG;
  const a = azimuth * DEG;
  return [Math.sin(z) * Math.sin(a), Math.sin(z) * Math.cos(a), Math.cos(z)];
}

function separation(z1: number, a1: number, z2: number, a2: number): number {
  const u = unitVector(z1, a1);
  const v = unitVector(z2, a2);
  const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  return Math.atan2(Math.hypot(...cross), dot) / DEG;
}

function wrap180(x: number): number {
  const r = (((x % 360) + 540) % 360) - 180;
  return r === -180 ? 180 : r;
}

it('usa o mesmo ΔT das referências', () => {
  expect(meta.delta_t_s).toBe(DELTA_T_SECONDS);
});

describe('posição solar contra pvlib (3456 instantes, 6 locais)', () => {
  const rows = csv('posicao.csv');
  const worst = { zenith: 0, separation: 0, azimuth: 0, eot: 0, hourAngle: 0 };

  it('ângulo zenital, direção, azimute, equação do tempo e ângulo horário', () => {
    for (const r of rows) {
      const site = sites.get(r.local!)!;
      const p = solarPosition(Date.parse(r.utc!), site.latitude, site.longitude, site.elevacao);
      const zRef = Number(r.zenite_geometrico);
      const aRef = Number(r.azimute);
      worst.zenith = Math.max(worst.zenith, Math.abs(p.zenith - zRef));
      worst.separation = Math.max(worst.separation, separation(p.zenith, p.azimuth, zRef, aRef));
      if (90 - zRef < 89) {
        worst.azimuth = Math.max(worst.azimuth, Math.abs(wrap180(p.azimuth - aRef)));
      }
      worst.eot = Math.max(worst.eot, Math.abs(p.equationOfTime - Number(r.equacao_do_tempo_min)));
      worst.hourAngle = Math.max(
        worst.hourAngle,
        Math.abs(wrap180(p.hourAngle - Number(r.angulo_horario))),
      );
    }
    expect(rows.length).toBe(3456);
    expect(worst.zenith).toBeLessThan(0.01);
    expect(worst.separation).toBeLessThan(0.01);
    expect(worst.azimuth).toBeLessThan(0.01);
    expect(worst.eot * 60).toBeLessThan(1); // segundos
    expect((worst.hourAngle / 15) * 3600).toBeLessThan(1); // hora solar verdadeira, segundos
  });
});

describe('nascer, pôr e passagem meridiana contra pvlib (72 dias)', () => {
  it('diferença menor que 10 s', () => {
    let worst = 0;
    for (const r of csv('nascer-por.csv')) {
      const site = sites.get(r.local!)!;
      const [y, m, d] = r.data!.split('-').map(Number) as [number, number, number];
      const t = sunTimes(y, m, d, site.latitude, site.longitude);
      for (const [ours, ref] of [
        [t.sunrise, r.nascer],
        [t.sunset, r.por],
        [t.transit, r.passagem],
      ] as const) {
        worst = Math.max(worst, Math.abs(ours - Date.parse(ref!)) / 1000);
      }
    }
    expect(worst).toBeLessThan(10);
  });
});

describe('caso publicado no relatório do NREL SPA (Reda e Andreas, 2004)', () => {
  const c = JSON.parse(readFileSync(`${dir}caso-reda-andreas-2004.json`, 'utf-8')) as {
    entrada: Record<string, number | string>;
    saida_publicada: Record<string, number>;
  };
  it('zênite com refração e azimute dentro do arredondamento publicado', () => {
    const e = c.entrada;
    const p = solarPosition(
      Date.parse(e.hora_legal as string),
      e.latitude as number,
      e.longitude as number,
      e.elevacao_m as number,
      {
        deltaT: e.delta_t_s as number,
        refraction: { pressure: e.pressao_mbar as number, temperature: e.temperatura_c as number },
      },
    );
    expect(
      Math.abs(p.apparentZenith - c.saida_publicada.zenite_topocentrico_com_refracao!),
    ).toBeLessThan(1e-5);
    expect(Math.abs(p.azimuth - c.saida_publicada.azimute_topocentrico!)).toBeLessThan(1e-5);
  });
});
