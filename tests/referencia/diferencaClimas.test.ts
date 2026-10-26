// Diferença entre dois climas na mesma carta (F4.2, spec 05, seção 5.5): casos exatos (o mesmo
// arquivo com um acréscimo conhecido) e a diferença TMYx 2011-2025 menos TRY (SOL-AR 6.2) de
// Florianópolis contra uma conta direta nas horas do arquivo, sem as funções da aplicação.
// Os EPWs não são versionados (decisão 0010); no CI a ausência é erro, fora dele o teste é pulado.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEpw, type EpwData, type EpwFieldName } from '../../src/core/epw/parseEpw';
import { parseSolar62 } from '../../src/core/epw/parseSolar62';
import { cellDifference, sameLocation } from '../../src/core/overlay/difference';
import { cellStatistics } from '../../src/core/overlay/overlay';
import { CITIES } from '../../src/ui/cities';

const root = fileURLToPath(new URL('../../', import.meta.url));
const EPW = `${root}.cache/epw/BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw`;
const available = existsSync(EPW);
if (!available && process.env.CI) throw new Error('EPW de teste ausente no CI');

/** Cópia do arquivo com um campo transformado hora a hora. */
function withField(epw: EpwData, field: EpwFieldName, f: (v: number) => number): EpwData {
  return { ...epw, fields: { ...epw.fields, [field]: Float64Array.from(epw.fields[field], f) } };
}

describe.skipIf(!available)('diferença entre climas (spec 05, seção 5.5)', () => {
  const tmyx = parseEpw(readFileSync(EPW, 'utf-8'));

  it('o mesmo arquivo com +2 °C em todas as horas: +2 °C em todas as células', () => {
    const warmer = withField(tmyx, 'dryBulb', (v) => v + 2);
    const d = cellDifference(cellStatistics(tmyx, 'dryBulb'), cellStatistics(warmer, 'dryBulb'));
    expect(d.size).toBe(cellStatistics(tmyx, 'dryBulb').size);
    for (const s of d.values()) {
      expect(s.mean).toBeCloseTo(2, 10);
      expect(s.b - s.a).toBeCloseTo(s.mean, 12);
    }
  });

  it('DNI 10% maior: diferença de 10% da média de A em cada célula; A − B é o oposto', () => {
    const more = withField(tmyx, 'directNormal', (v) => v * 1.1);
    const a = cellStatistics(tmyx, 'directNormal');
    const d = cellDifference(a, cellStatistics(more, 'directNormal'));
    for (const [k, s] of d) expect(s.mean).toBeCloseTo(0.1 * a.get(k)!.mean, 8);
    const back = cellDifference(cellStatistics(more, 'directNormal'), a);
    for (const [k, s] of back) expect(s.mean).toBeCloseTo(-d.get(k)!.mean, 10);
  });

  it('TMYx 2011-2025 menos TRY de Florianópolis: igual à conta direta em cada quinzena e hora', () => {
    const city = CITIES.find((c) => c.id === 'florianopolis')!;
    const tryData = parseSolar62(
      readFileSync(`${root}docs/validacao/casos/solar-6.2/florianopolis.csv`, 'latin1'),
      {
        name: city.name,
        latitude: city.latitude,
        longitude: city.longitude,
        timeZone: city.timeZone,
        elevation: city.elevation,
      },
    );
    expect(sameLocation(tmyx.location, tryData.location)).toBe(true);
    const d = cellDifference(cellStatistics(tryData, 'dryBulb'), cellStatistics(tmyx, 'dryBulb'));
    // Conta direta: quinzenas da spec 05 (dia do ano de início de cada uma), média das horas.
    const starts = [
      [12, 22],
      [1, 16],
      [2, 1],
      [2, 16],
      [3, 1],
      [3, 16],
      [4, 1],
      [4, 16],
      [5, 1],
      [5, 16],
      [6, 22],
      [7, 16],
      [8, 1],
      [8, 16],
      [9, 1],
      [9, 16],
      [10, 1],
      [10, 16],
      [11, 1],
      [11, 16],
    ];
    const order = (m: number, day: number) => m * 100 + day;
    const periodOf = (m: number, day: number) => {
      // Do fim para o começo: a última quinzena que começou até a data (22/12 abre a primeira).
      if (order(m, day) >= order(12, 22) || order(m, day) < order(1, 16)) return 1;
      let p = 1;
      starts.forEach(([sm, sd], i) => {
        if (
          i > 0 &&
          order(m, day) >= order(sm!, sd!) &&
          !(i === 10 && order(m, day) < order(6, 22))
        ) {
          p = i + 1;
        }
      });
      return p;
    };
    const mean = (epw: EpwData) => {
      const acc = new Map<string, [number, number]>();
      for (let i = 0; i < epw.hours; i++) {
        const v = epw.fields.dryBulb[i]!;
        if (Number.isNaN(v)) continue;
        const k = `${periodOf(epw.month[i]!, epw.day[i]!)}-${epw.hour[i]!}`;
        const [s, n] = acc.get(k) ?? [0, 0];
        acc.set(k, [s + v, n + 1]);
      }
      return new Map([...acc].map(([k, [s, n]]) => [k, s / n]));
    };
    const ma = mean(tryData);
    const mb = mean(tmyx);
    expect(d.size).toBe(480);
    for (const [k, s] of d) expect(s.mean).toBeCloseTo(mb.get(k)! - ma.get(k)!, 10);
    // O ano recente é mais quente que o TRY dos anos 1960 na média das células (registro).
    const avg = [...d.values()].reduce((x, s) => x + s.mean, 0) / d.size;
    expect(avg).toBeGreaterThan(0);
  });

  it('mesmo local: até 0,1° e o mesmo fuso', () => {
    const a = { latitude: -27.67, longitude: -48.55, timeZone: -3 };
    expect(sameLocation(a, { latitude: -27.6, longitude: -48.6, timeZone: -3 })).toBe(true);
    expect(sameLocation(a, { latitude: -27.5, longitude: -48.55, timeZone: -3 })).toBe(false);
    expect(sameLocation(a, { latitude: -27.67, longitude: -48.55, timeZone: -2 })).toBe(false);
  });
});
