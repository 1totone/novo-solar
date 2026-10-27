// Leitura de um ponto da carta (decisão 0045, spec 03, seção 3.6) contra o pvlib: para cada ponto
// das linhas horárias de referência (linhas-horarias.csv: dia 21 de cada mês de 2026, horas solares
// de 5 h a 19 h, posição do sol pelo SPA do pvlib), a leitura da direção (ângulo zenital e azimute)
// tem de devolver a hora solar do ponto e uma passagem do sol no instante do pvlib, em latitudes
// equatorial (Belém, Manaus), tropical (Brasília) e subtropical (Florianópolis, Porto Alegre,
// Concepción) e fusos de −3 e −4 h.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readDirection } from '../../src/core/chart/readout';
import { solarPosition } from '../../src/core/solar/spa';

const root = fileURLToPath(new URL('../../', import.meta.url));
const casos = `${root}docs/validacao/casos/`;

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

const rows = csv(`${casos}carta/linhas-horarias.csv`);
const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;

describe('leitura de um ponto da carta contra o pvlib (linhas horárias de 2026)', () => {
  it('há pontos de referência para os 6 locais', () => {
    expect(new Set(rows.map((r) => r.local)).size).toBe(6);
    expect(rows.length).toBeGreaterThan(800);
  });

  it('hora solar do ponto: até 1 min do pvlib, em todos os pontos', () => {
    let worst = 0;
    for (const r of rows) {
      const reading = readDirection(sites.get(r.local!)!, Number(r.zenite), Number(r.azimute));
      // Diferença circular em horas (perto da meia-noite não ocorre: o sol está acima do horizonte).
      const diff = Math.abs(reading.solarHour - Number(r.hora_solar));
      worst = Math.max(worst, diff);
    }
    expect(worst * 60).toBeLessThan(1);
  });

  it('passagem do sol: até 30 min do instante do pvlib, fora das semanas dos solstícios', () => {
    // Longe dos solstícios, a declinação muda pelo menos 0,2° por dia: o instante da passagem fica
    // bem determinado. Perto deles, a declinação para (ver o teste seguinte).
    let worst = 0;
    let checked = 0;
    for (const r of rows) {
      if (r.data!.endsWith('-06-21') || r.data!.endsWith('-12-21')) continue;
      const reading = readDirection(sites.get(r.local!)!, Number(r.zenite), Number(r.azimute));
      const ref = Date.parse(r.utc!);
      expect(reading.passages.length, `${r.local} ${r.data} ${r.hora_solar} h`).toBe(2);
      const best = Math.min(...reading.passages.map((p) => Math.abs(p.utcMs - ref)));
      worst = Math.max(worst, best);
      checked++;
    }
    expect(checked).toBeGreaterThan(650);
    expect(worst / MS_PER_MIN).toBeLessThan(30);
  });

  it('nos solstícios: o sol na mesma declinação do ponto de referência, a até 2 dias dele', () => {
    // Perto do solstício, a declinação quase não muda de um dia para outro: 0,0024° de paralaxe
    // (que a leitura deixa de fora) já desloca a data em até cerca de 0,8 dia. O que importa é o
    // sol passar pelo ponto: a declinação no instante devolvido, pelo SPA (conferido contra o pvlib
    // a 10⁻⁸°, F1.2), fica a menos de 0,003° da declinação no instante do pvlib.
    const declinationAt = (utc: number) => solarPosition(utc, 0, 0, 0).declination;
    let checked = 0;
    for (const r of rows) {
      if (!r.data!.endsWith('-06-21') && !r.data!.endsWith('-12-21')) continue;
      const site = sites.get(r.local!)!;
      const reading = readDirection(site, Number(r.zenite), Number(r.azimute));
      const ref = Date.parse(r.utc!);
      expect(reading.passages.length, `${r.local} ${r.data} ${r.hora_solar} h`).toBeGreaterThan(0);
      for (const p of reading.passages) {
        expect(Math.abs(p.utcMs - ref) / MS_PER_DAY).toBeLessThan(2);
        expect(Math.abs(declinationAt(p.utcMs) - declinationAt(ref))).toBeLessThan(0.003);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(130);
  });
});
