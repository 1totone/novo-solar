// Classificação das horas (F3.4) contra a referência independente
// docs/validacao/scripts/classificacao_horas.py: médias diárias, temperatura média predominante e
// temperatura da hora com numpy; limites e faixa de aplicação da ASHRAE 55 pelo pythermalcomfort
// 4.6.2 (t_pma também conferida contra running_mean_outdoor_temperature), nos 6 EPWs de teste.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  classifyHours,
  dailyMeans,
  HOUR_CLASS,
  hourTemperature,
  type ClassificationMethod,
  type HourTemperature,
} from '../../src/core/comfort/classification';
import { parseEpw } from '../../src/core/epw/parseEpw';

const root = fileURLToPath(new URL('../../', import.meta.url));

interface Config {
  id: string;
  metodo: ClassificationMethod;
  temperatura: HourTemperature;
}
interface CityConfig {
  id: string;
  classes: string;
  contagem: Record<'q' | 'f' | 'n' | 's', number>;
  tpma?: (number | null)[];
  t_conforto?: (number | null)[];
  'horas_a_menos_de_1e-9_do_limite'?: number;
}
interface City {
  id: string;
  arquivo: string;
  horas: number;
  medias_diarias: (number | null)[];
  temperatura_hora_media?: (number | null)[];
  configuracoes: CityConfig[];
}
const data = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/classificacao/classificacao-horas.json`, 'utf-8'),
) as { configuracoes: Config[]; cidades: City[] };

const available = data.cidades.every((c) => existsSync(`${root}.cache/epw/${c.arquivo}`));
const CODE: Record<number, string> = {
  [HOUR_CLASS.hot]: 'q',
  [HOUR_CLASS.cold]: 'f',
  [HOUR_CLASS.neutral]: 'n',
  [HOUR_CLASS.none]: 's',
};

function expectClose(actual: ArrayLike<number>, expected: (number | null)[], tol: number) {
  expect(actual.length).toBe(expected.length);
  let worst = 0;
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i] ?? null;
    if (e === null) {
      expect(Number.isNaN(actual[i]!), `índice ${i}`).toBe(true);
    } else {
      worst = Math.max(worst, Math.abs(actual[i]! - e));
    }
  }
  expect(worst).toBeLessThanOrEqual(tol);
}

describe.skipIf(!available)('classificação das horas contra numpy e pythermalcomfort', () => {
  for (const city of data.cidades) {
    const epw = parseEpw(readFileSync(`${root}.cache/epw/${city.arquivo}`, 'utf-8'));

    it(`${city.id}: médias diárias`, () => {
      expect(epw.hours).toBe(city.horas);
      expectClose(dailyMeans(epw.fields.dryBulb), city.medias_diarias, 1e-9);
    });

    if (city.temperatura_hora_media) {
      it(`${city.id}: temperatura da hora (média do início e do fim)`, () => {
        expectClose(
          hourTemperature(epw.fields.dryBulb, 'mean'),
          city.temperatura_hora_media!,
          1e-9,
        );
      });
    }

    for (const ref of city.configuracoes) {
      const cfg = data.configuracoes.find((c) => c.id === ref.id)!;
      it(`${city.id}, ${cfg.id}: classes de todas as horas`, () => {
        const r = classifyHours(epw.fields.dryBulb, cfg.metodo, cfg.temperatura);
        if (ref.tpma) {
          expectClose(r.prevailingMean!, ref.tpma, 1e-9);
          expectClose(r.comfort!, ref.t_conforto!, 1e-9);
          expect(ref['horas_a_menos_de_1e-9_do_limite']).toBe(0);
        }
        const classes = Array.from(r.classes, (c) => CODE[c]).join('');
        let diff = 0;
        for (let i = 0; i < classes.length; i++) if (classes[i] !== ref.classes[i]) diff++;
        expect(diff).toBe(0);
        expect(r.counts).toEqual({
          hot: ref.contagem.q,
          cold: ref.contagem.f,
          neutral: ref.contagem.n,
          none: ref.contagem.s,
        });
      });
    }
  }
});

// Acréscimo por ganhos na faixa adaptativa (revisão da decisão 0020): a classe é a da temperatura
// interna estimada, T_h + ΔT, contra a faixa de conforto da referência (pythermalcomfort), com a
// média predominante do ar externo. Referência montada só com os arrays do JSON.
describe.skipIf(!available)('faixa adaptativa com acréscimo por ganhos', () => {
  const city = data.cidades.find((c) => c.id === 'florianopolis')!;
  const ref = city.configuracoes.find((c) => c.id === 'adaptativa-80-exp')!;
  const cfg = data.configuracoes.find((c) => c.id === ref.id)!;
  const epw = parseEpw(readFileSync(`${root}.cache/epw/${city.arquivo}`, 'utf-8'));
  for (const gains of [2, 4]) {
    it(`Florianópolis, 80%, ΔT = ${gains} °C: classes de todas as horas`, () => {
      if (cfg.metodo.kind !== 'adaptive') throw new Error('configuração inesperada');
      const r = classifyHours(epw.fields.dryBulb, { ...cfg.metodo, gains }, 'mean');
      let diff = 0;
      let near = 0;
      city.temperatura_hora_media!.forEach((t, i) => {
        const c = ref.t_conforto![Math.floor(i / 24)];
        let expected: string;
        if (t === null || c === null || c === undefined) expected = 's';
        else {
          const indoor = t + gains;
          if (Math.min(Math.abs(indoor - (c + 3.5)), Math.abs(indoor - (c - 3.5))) < 1e-9) near++;
          expected = indoor > c + 3.5 ? 'q' : indoor < c - 3.5 ? 'f' : 'n';
        }
        if (CODE[r.classes[i]!] !== expected) diff++;
      });
      expect(near).toBe(0);
      expect(diff).toBe(0);
    });
  }
});
