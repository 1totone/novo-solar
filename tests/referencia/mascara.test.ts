// Máscara pelos ângulos (F2.3) contra traçado de raios com janela e placas reais
// (docs/validacao/scripts/mascara_tracado_raios.py). Ângulos derivados da geometria pelos pontos
// de referência da spec; nada do traçado usa as fórmulas de máscara.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { maskRegions, regionContains, type ShadingSet } from '../../src/core/mask/mask';
import { project } from '../../src/core/chart/stereographic';

const root = fileURLToPath(new URL('../../', import.meta.url));
interface Case {
  id: string;
  orientacao: number;
  total: ShadingSet;
  parcial: ShadingSet;
  dispositivos: string[];
  uniao_exata: boolean;
  amostras: [number, number, number, number, number][];
}
const data = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/mascara/tracado-raios.json`, 'utf-8'),
) as { grade_janela: number; casos: Case[] };

function classify(c: Case) {
  const regions = maskRegions(c.orientacao, 'external', c.total, c.parcial);
  return c.amostras.map(([h, az, total, center, fraction]) => {
    const p = project(90 - h, az);
    return {
      total: total === 1,
      center: center === 1,
      fraction,
      inTotal: regionContains(regions.total, p.x, p.y),
      inPartialSet: regionContains(regions.partialSet, p.x, p.y),
      inPartial: regionContains(regions.partial, p.x, p.y),
    };
  });
}

describe('máscara pelos ângulos contra traçado de raios', () => {
  it.each(data.casos.map((c) => [c.id, c] as const))('%s: sombra total (100%%)', (_id, c) => {
    const r = classify(c);
    const falsePositives = r.filter((s) => s.inTotal && !s.total).length;
    expect(falsePositives).toBe(0);
    // Com uma peça só, só aletas ou grelha fechada, a união das máscaras é a sombra total exata;
    // com brise e aletas de pontas livres, a união é só uma parte dela (spec 01, seção 1.6).
    if (c.uniao_exata) {
      expect(r.filter((s) => !s.inTotal && s.total).length).toBe(0);
    }
  });

  it.each(data.casos.map((c) => [c.id, c] as const))(
    '%s: centro da janela à sombra (50%%) é exato, inclusive com dispositivos combinados',
    (_id, c) => {
      const r = classify(c);
      expect(r.filter((s) => s.inPartialSet !== s.center).length).toBe(0);
    },
  );

  it.each(data.casos.map((c) => [c.id, c] as const))(
    '%s: região parcial = região dos 50% menos a total',
    (_id, c) => {
      for (const s of classify(c)) {
        expect(s.inPartial).toBe(s.inPartialSet && !s.inTotal);
      }
    },
  );

  it('dispositivos infinitos: centro à sombra equivale a pelo menos 50% da janela à sombra', () => {
    const tol = 1 / data.grade_janela;
    for (const id of ['brise-infinito', 'aleta-direita-infinita']) {
      const c = data.casos.find((x) => x.id === id)!;
      for (const s of classify(c)) {
        if (Math.abs(s.fraction - 0.5) <= tol) continue;
        expect(s.inPartialSet, `${id} fração ${s.fraction}`).toBe(s.fraction > 0.5);
      }
    }
  });
});
