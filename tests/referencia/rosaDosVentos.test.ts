// Rosa dos ventos (F2.5) contra um cálculo independente em Python puro
// (docs/validacao/scripts/rosa_dos_ventos.py), nos EPWs de Florianópolis, Porto Alegre e Belém:
// 8 e 16 setores, ano e 4 estações, dia todo e 4 períodos do dia (spec 06).
// Os EPWs não são versionados (decisão 0010); no CI a ausência é erro, fora dele o teste é pulado.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseEpw } from '../../src/core/epw/parseEpw';
import {
  speedResolution,
  windRose,
  type DayPeriodKey,
  type SeasonKey,
} from '../../src/core/wind/windRose';

const root = fileURLToPath(new URL('../../', import.meta.url));

interface Rose {
  setores: 8 | 16;
  estacao: 'ano' | SeasonKey;
  periodo: 'todos' | '1-6' | '7-12' | '13-18' | '19-24';
  horas: number;
  validas: number;
  calmaria: number;
  frequencia: number[][];
  velocidade_media: (number | null)[];
}
const reference = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/vento/rosas.json`, 'utf-8'),
) as { casos: Record<string, { arquivo: string; resolucao_velocidade: number; rosas: Rose[] }> };

const PERIOD: Record<Exclude<Rose['periodo'], 'todos'>, DayPeriodKey> = {
  '1-6': 'madrugada',
  '7-12': 'manha',
  '13-18': 'tarde',
  '19-24': 'noite',
};

const available = Object.values(reference.casos).every((c) =>
  existsSync(`${root}.cache/epw/${c.arquivo}`),
);
if (!available && process.env.CI) throw new Error('EPWs de teste ausentes no CI');

// Tolerância da spec: 0,1 ponto percentual e 0,01 m/s. As definições são as mesmas dos dois
// lados, então a diferença esperada é só de arredondamento (o JSON tem 9 casas).
const PP = 1e-6;

describe.skipIf(!available)('rosa dos ventos contra cálculo independente em Python', () => {
  for (const [site, c] of Object.entries(reference.casos)) {
    it(`${site}: 50 rosas (setores, estações, períodos) e resolução da velocidade`, () => {
      const epw = parseEpw(readFileSync(`${root}.cache/epw/${c.arquivo}`, 'utf-8'));
      expect(speedResolution(epw)).toBe(c.resolucao_velocidade);
      expect(c.rosas).toHaveLength(50);
      for (const r of c.rosas) {
        const rose = windRose(epw, {
          sectors: r.setores,
          season: r.estacao === 'ano' ? undefined : r.estacao,
          period: r.periodo === 'todos' ? undefined : PERIOD[r.periodo],
        });
        const label = `${r.setores} setores, ${r.estacao}, ${r.periodo}`;
        expect(rose.hours, label).toBe(r.horas);
        expect(rose.valid, label).toBe(r.validas);
        expect(rose.calm, label).toBeCloseTo(r.calmaria, 6);
        expect(Math.abs(rose.calm - r.calmaria)).toBeLessThan(PP);
        rose.frequency.forEach((row, k) =>
          row.forEach((v, j) => expect(Math.abs(v - r.frequencia[k]![j]!), label).toBeLessThan(PP)),
        );
        expect(rose.meanSpeed).toHaveLength(r.velocidade_media.length);
        rose.meanSpeed.forEach((v, k) => {
          const ref = r.velocidade_media[k] ?? null;
          if (ref === null) expect(v, label).toBeNull();
          else expect(Math.abs(v! - ref), label).toBeLessThan(1e-6);
        });
        // As frequências e a calmaria somam 100%.
        const sum = rose.calm + rose.frequency.flat().reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(100, 9);
      }
    });
  }
});
