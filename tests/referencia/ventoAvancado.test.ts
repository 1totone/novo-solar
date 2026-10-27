// Vento avançado (F4.4, spec 06, seções 6.3 e 6.7) contra referências independentes:
// - o fator da altura e do terreno contra o EnergyPlus 26.2.0 (vento local de faixas de parede de
//   1,5 a 40 m nos 5 terrenos do objeto Building; docs/validacao/scripts/energyplus_vento.py);
// - as rosas com o filtro pela condição térmica e a correção contra um cálculo em Python
//   (docs/validacao/scripts/rosa_vento_avancado.py), com a classificação do F3.4.
// Os EPWs não são versionados (decisão 0010); no CI a ausência é erro, fora dele os testes que
// precisam deles são pulados.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ADAPTIVE_DEFAULT,
  DEFAULT_METHOD,
  classifyHours,
  type ClassificationMethod,
} from '../../src/core/comfort/classification';
import { parseEpw } from '../../src/core/epw/parseEpw';
import { windSpeedFactor, type TerrainKey } from '../../src/core/wind/windProfile';
import { windRose, type ThermalFilter } from '../../src/core/wind/windRose';

const root = fileURLToPath(new URL('../../', import.meta.url));

interface EnergyPlusStrip {
  z: number;
  razao_media: number;
  razao_min: number;
  razao_max: number;
  horas_com_vento: number;
  amostra: [number, number, number][];
  zero_com_estacao_zero: boolean;
}
const energyPlus = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/energyplus/vento.json`, 'utf-8'),
) as {
  epw: string;
  estacao: { z_met: number; alfa_met: number; delta_met: number };
  alturas: number[];
  terrenos: Record<string, { diferenca_site_epw: number; faixas: EnergyPlusStrip[] }>;
};

/** Terreno do objeto Building do EnergyPlus → terreno da aplicação (Urban tem os valores de Suburbs). */
const EP_TERRAIN: Record<string, TerrainKey> = {
  Country: 'country',
  Suburbs: 'suburbs',
  City: 'city',
  Ocean: 'ocean',
  Urban: 'suburbs',
};

interface Rose {
  metodo: 'limiar-20' | 'adaptativa-80';
  correcao: { terreno: string; z: number } | null;
  filtro: 'q' | 'f' | 'n' | null;
  setores: 8 | 16;
  estacao: 'ano' | 'dez-fev';
  horas: number;
  validas: number;
  calmaria: number;
  frequencia: number[][];
  velocidade_media: (number | null)[];
}
const roses = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/vento/rosas-avancadas.json`, 'utf-8'),
) as {
  fatores: Record<string, number>;
  casos: Record<
    string,
    {
      arquivo: string;
      rosas: Rose[];
      'contagem_limiar-20': Record<'q' | 'f' | 'n' | 's', number>;
      'contagem_adaptativa-80': Record<'q' | 'f' | 'n' | 's', number>;
    }
  >;
};

const ROSE_TERRAIN: Record<string, TerrainKey> = {
  campo: 'country',
  suburbio: 'suburbs',
  cidade: 'city',
  agua: 'ocean',
};
const METHOD: Record<Rose['metodo'], ClassificationMethod> = {
  'limiar-20': DEFAULT_METHOD,
  'adaptativa-80': ADAPTIVE_DEFAULT,
};
const FILTER: Record<'q' | 'f' | 'n', ThermalFilter['keep']> = {
  q: 'hot',
  f: 'cold',
  n: 'neutral',
};

const epwFiles = [energyPlus.epw, ...Object.values(roses.casos).map((c) => c.arquivo)];
const available = epwFiles.every((f) => existsSync(`${root}.cache/epw/${f}`));
if (!available && process.env.CI) throw new Error('EPWs de teste ausentes no CI');

describe('fator da altura e do terreno contra o EnergyPlus 26.2.0', () => {
  it('estação nos padrões do Site:WeatherStation e as 8 alturas das faixas', () => {
    expect(energyPlus.estacao).toEqual({ z_met: 10, alfa_met: 0.14, delta_met: 270 });
    expect(energyPlus.alturas).toEqual([1.5, 4.5, 7.5, 10, 15, 20, 30, 40]);
  });

  for (const [name, terrain] of Object.entries(energyPlus.terrenos)) {
    it(`${name}: razão entre o vento local e o da estação em cada altura, e 48 horas`, () => {
      // Propriedades da própria referência: o vento da estação na simulação é o do EPW, e a razão é
      // a mesma em todas as horas com vento (o EnergyPlus multiplica por um fator constante).
      expect(terrain.diferenca_site_epw).toBe(0);
      expect(terrain.faixas).toHaveLength(8);
      for (const strip of terrain.faixas) {
        expect(strip.razao_max - strip.razao_min).toBeLessThan(1e-12);
        expect(strip.zero_com_estacao_zero).toBe(true);
        const k = windSpeedFactor(strip.z, EP_TERRAIN[name]!);
        expect(Math.abs(k / strip.razao_media - 1), `${name}, ${strip.z} m`).toBeLessThan(1e-9);
        expect(strip.amostra).toHaveLength(48);
        for (const [, site, local] of strip.amostra) {
          expect(Math.abs(k * site - local), `${name}, ${strip.z} m`).toBeLessThan(1e-9);
        }
      }
    });
  }

  it.skipIf(!available)('o vento da estação na simulação é o que a aplicação lê do EPW', () => {
    const epw = parseEpw(readFileSync(`${root}.cache/epw/${energyPlus.epw}`, 'utf-8'));
    for (const strip of energyPlus.terrenos.Country!.faixas) {
      for (const [hour, site] of strip.amostra) expect(epw.fields.windSpeed[hour]).toBe(site);
    }
  });

  it('fatores das correções usadas nas rosas (cálculo em Python)', () => {
    for (const [key, value] of Object.entries(roses.fatores)) {
      const [terrain, z] = key.split('-') as [string, string];
      const k = windSpeedFactor(Number(z), ROSE_TERRAIN[terrain]!);
      expect(Math.abs(k / value - 1), key).toBeLessThan(1e-12);
    }
  });
});

// Tolerância da spec: a das rosas do F2.5 (0,1 ponto percentual e 0,01 m/s). As definições são as
// mesmas dos dois lados, então a diferença esperada é só de arredondamento (o JSON tem 9 casas).
const PP = 1e-6;

describe.skipIf(!available)(
  'rosas com o filtro térmico e a correção contra cálculo independente em Python',
  () => {
    for (const [site, c] of Object.entries(roses.casos)) {
      it(`${site}: contagem das classes e 140 rosas`, () => {
        const epw = parseEpw(readFileSync(`${root}.cache/epw/${c.arquivo}`, 'utf-8'));
        const classes = {
          'limiar-20': classifyHours(epw.fields.dryBulb, METHOD['limiar-20'], 'mean'),
          'adaptativa-80': classifyHours(epw.fields.dryBulb, METHOD['adaptativa-80'], 'mean'),
        };
        for (const m of ['limiar-20', 'adaptativa-80'] as const) {
          const ref = c[`contagem_${m}`];
          expect(classes[m].counts, m).toEqual({
            hot: ref.q,
            cold: ref.f,
            neutral: ref.n,
            none: ref.s,
          });
        }
        expect(c.rosas).toHaveLength(140);
        for (const r of c.rosas) {
          const rose = windRose(epw, {
            sectors: r.setores,
            season: r.estacao === 'ano' ? undefined : r.estacao,
            thermal: r.filtro
              ? { classes: classes[r.metodo].classes, keep: FILTER[r.filtro] }
              : undefined,
            speedFactor: r.correcao
              ? windSpeedFactor(r.correcao.z, ROSE_TERRAIN[r.correcao.terreno]!)
              : undefined,
          });
          const label = `${r.metodo}, ${JSON.stringify(r.correcao)}, ${r.filtro}, ${r.setores} setores, ${r.estacao}`;
          expect(rose.hours, label).toBe(r.horas);
          expect(rose.valid, label).toBe(r.validas);
          expect(Math.abs(rose.calm - r.calmaria), label).toBeLessThan(PP);
          rose.frequency.forEach((row, k) =>
            row.forEach((v, j) =>
              expect(Math.abs(v - r.frequencia[k]![j]!), label).toBeLessThan(PP),
            ),
          );
          expect(rose.meanSpeed).toHaveLength(r.velocidade_media.length);
          rose.meanSpeed.forEach((v, k) => {
            const ref = r.velocidade_media[k] ?? null;
            if (ref === null) expect(v, label).toBeNull();
            else expect(Math.abs(v! - ref), label).toBeLessThan(1e-6);
          });
          if (r.validas > 0) {
            const sum = rose.calm + rose.frequency.flat().reduce((a, b) => a + b, 0);
            expect(sum, label).toBeCloseTo(100, 9);
          }
        }
      });
    }
  },
);
