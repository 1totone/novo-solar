// Regressão contra o SOL-AR 6.2 (F2.8), na rosa dos ventos: com os mesmos dados (os CSV do 6.2) e
// as definições do 6.2, o núcleo da nova versão reproduz as rosas pré-calculadas (.ventos.csv);
// com as definições da nova versão (estações pelos meses), as diferenças são as documentadas em
// docs/validacao/casos/solar-6.2/regressao.json (docs/validacao/scripts/regressao_solar62.py) e no
// relatório docs/validacao/relatorios/F2.8-regressao.md.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EpwData } from '../../src/core/epw/parseEpw';
import { parseSolar62 } from '../../src/core/epw/parseSolar62';
import { CALM_LIMIT, sectorOf, windRose, type SeasonKey } from '../../src/core/wind/windRose';
import { CITIES } from '../../src/ui/cities';

const dir = new URL('../../docs/validacao/casos/solar-6.2/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), 'utf-8');

interface RoseRef {
  melhor_ajuste_dif_max_pp: { frequencia: number; calmaria_por_periodo: number };
  nova_versao: {
    frequencia_pct: number[][];
    calmaria_pct: number[];
    dif_max_frequencia_pp: number;
    dif_max_calmaria_pp: number;
  };
}
const reference = JSON.parse(read('regressao.json')) as { rosa: Record<string, RoseRef> };

/** Rosa do 6.2: 20 linhas (8 frequências, 8 velocidades, 4 calmarias por período) x 4 estações. */
function ventos62(file: string): number[][] {
  return read(file.replace(/\.csv$/, '.ventos.csv'))
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split(',').map(Number));
}

// Estações dos .ventos.csv (melhor ajuste): início à 0 h de 23/09, 22/12, 21/03 e 22/06, na ordem
// primavera, verão, outono, inverno (a ordem das colunas do 6.2).
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const dayIndex = (m: number, d: number) => DAYS.slice(0, m - 1).reduce((a, b) => a + b, 0) + d - 1;
const STARTS = [dayIndex(9, 23), dayIndex(12, 22), dayIndex(3, 21), dayIndex(6, 22)];
function season62(month: number, day: number): number {
  const i = dayIndex(month, day);
  let best = -1;
  let bestStart = -1;
  STARTS.forEach((s, k) => {
    if (s <= i && s > bestStart) {
      best = k;
      bestStart = s;
    }
  });
  return best >= 0 ? best : STARTS.indexOf(Math.max(...STARTS));
}

/** Frequência por setor (% das horas da estação) e calmaria por período, com o núcleo da nova versão. */
function roseWith62Seasons(epw: EpwData) {
  const count = Array.from({ length: 8 }, () => [0, 0, 0, 0]);
  const calm = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  const hours = [0, 0, 0, 0];
  const periodHours = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  for (let i = 0; i < epw.hours; i++) {
    const s = season62(epw.month[i]!, epw.day[i]!);
    const p = Math.floor((epw.hour[i]! - 1) / 6);
    const v = epw.fields.windSpeed[i]!;
    hours[s]!++;
    periodHours[p]![s]!++;
    if (v < CALM_LIMIT) calm[p]![s]!++;
    else count[sectorOf(epw.fields.windDirection[i]!, 8)]![s]!++;
  }
  return {
    frequency: count.map((row) => row.map((c, s) => (100 * c) / hours[s]!)),
    calm: calm.map((row, p) => row.map((c, s) => (100 * c) / periodHours[p]![s]!)),
  };
}

const round1 = (v: number) => Math.round(v * 10 + 1e-9) / 10;
const historical = CITIES.filter((c) => c.historical);
const tryCities = historical.filter((c) => c.historical!.kind === 'try');

function load(id: string): EpwData {
  const city = CITIES.find((c) => c.id === id)!;
  return parseSolar62(read(city.historical!.file), {
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    timeZone: city.timeZone,
    elevation: city.elevation,
  });
}

describe('rosa dos ventos: regressão contra o SOL-AR 6.2', () => {
  it.each(tryCities.map((c) => c.id))(
    '%s: com as estações do 6.2, o núcleo reproduz o .ventos.csv a 0,5 ponto percentual',
    (id) => {
      const epw = load(id);
      const file = ventos62(CITIES.find((c) => c.id === id)!.historical!.file);
      const ours = roseWith62Seasons(epw);
      let maxFreq = 0;
      let maxCalm = 0;
      for (let k = 0; k < 8; k++) {
        for (let s = 0; s < 4; s++) {
          maxFreq = Math.max(maxFreq, Math.abs(round1(ours.frequency[k]![s]!) - file[k]![s]!));
        }
      }
      for (let p = 0; p < 4; p++) {
        for (let s = 0; s < 4; s++) {
          maxCalm = Math.max(maxCalm, Math.abs(round1(ours.calm[p]![s]!) - file[16 + p]![s]!));
        }
      }
      // Mesmos valores da referência em Python (melhor ajuste).
      const ref = reference.rosa[id]!.melhor_ajuste_dif_max_pp;
      expect(maxFreq).toBeCloseTo(ref.frequencia, 6);
      expect(maxCalm).toBeCloseTo(ref.calmaria_por_periodo, 6);
      expect(maxFreq).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(maxCalm).toBeLessThanOrEqual(0.5 + 1e-9);
    },
  );

  it.each(historical.map((c) => c.id))(
    '%s: a rosa da nova versão (estações pelos meses) é a documentada',
    (id) => {
      const epw = load(id);
      const ref = reference.rosa[id]!.nova_versao;
      // Colunas na ordem do 6.2: primavera = set a nov, verão = dez a fev, outono = mar a mai,
      // inverno = jun a ago.
      const seasons: SeasonKey[] = ['set-nov', 'dez-fev', 'mar-mai', 'jun-ago'];
      seasons.forEach((season, s) => {
        const rose = windRose(epw, { sectors: 8, season });
        expect(rose.calm, season).toBeCloseTo(ref.calmaria_pct[s]!, 6);
        rose.frequency.forEach((classes, k) => {
          const sector = classes.reduce((a, b) => a + b, 0);
          expect(sector, `${season} setor ${k}`).toBeCloseTo(ref.frequencia_pct[k]![s]!, 6);
        });
      });
    },
  );
});
