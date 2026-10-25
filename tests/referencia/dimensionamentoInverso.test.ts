// Dimensionamento inverso (F3.6): ângulos exigidos contra a referência independente
// docs/validacao/scripts/dimensionamento_inverso.py (pvlib, hora solar pela equação do tempo), e
// ida e volta e minimalidade com a máscara pela geometria do F3.2 (área exata da sombra).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/core/chart/sunChart';
import { buildScene, type Device } from '../../src/core/shading/geometry';
import {
  periodSamples,
  requiredAngles,
  sizeFins,
  sizeOverhang,
  subdivideFins,
  subdivideOverhang,
  type PeriodSample,
  type RequiredAngles,
  type ShadingPeriod,
} from '../../src/core/shading/inverse';
import { shadedFraction } from '../../src/core/shading/shadedFraction';

const root = fileURLToPath(new URL('../../', import.meta.url));

interface ExtremeRef {
  externo: number;
  mes: number;
  dia: number;
  hora: number;
}
interface CaseRef {
  id: string;
  local: Site;
  orientacao: number;
  periodo: {
    start: [number, number];
    end: [number, number];
    startHour: number;
    endHour: number;
    timeBase: 'solar' | 'legal';
  };
  angulos: Record<string, ExtremeRef | null | number>;
}
const data = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/dimensionamento/angulos.json`, 'utf-8'),
) as { casos: CaseRef[] };

const KEYS: [string, keyof RequiredAngles][] = [
  ['alfa_min', 'alpha'],
  ['alfa_max', 'alphaMax'],
  ['gama_direita_min', 'gammaRight'],
  ['gama_esquerda_min', 'gammaLeft'],
  ['beta_direita_min', 'betaRight'],
  ['beta_esquerda_min', 'betaLeft'],
  ['gama_aleta_direita_max', 'finGammaRight'],
  ['gama_aleta_esquerda_max', 'finGammaLeft'],
];

const periodOf = (c: CaseRef): ShadingPeriod => ({
  start: { month: c.periodo.start[0], day: c.periodo.start[1] },
  end: { month: c.periodo.end[0], day: c.periodo.end[1] },
  startHour: c.periodo.startHour,
  endHour: c.periodo.endHour,
  timeBase: c.periodo.timeBase,
});

const WINDOW = { width: 1.2, height: 1.0 };
const fullShade = (devices: Device[], samples: PeriodSample[]) => {
  const scene = buildScene(WINDOW, devices);
  return Math.min(...samples.map((p) => shadedFraction(scene, p.s)));
};
/** Reduz uma dimensão em 0,1%: alguma amostra tem de deixar de ter sombra total. */
const SHRINK = 1 - 1e-3;
const LIMIT = 1 - 1e-9;

const cache = new Map<string, { samples: PeriodSample[]; total: number }>();
const samplesOf = (c: CaseRef) => {
  if (!cache.has(c.id)) cache.set(c.id, periodSamples(c.local, c.orientacao, periodOf(c)));
  return cache.get(c.id)!;
};

describe('ângulos exigidos contra o pvlib', () => {
  for (const c of data.casos) {
    it(`${c.id}`, () => {
      const { samples, total } = samplesOf(c);
      expect(total).toBe(c.angulos.amostras);
      // Amostras rentes ao limiar do sol na janela (cos θ ≈ 10⁻⁵) podem mudar de lado entre o pvlib e
      // o SPA daqui: no máximo 2 por caso.
      expect(
        Math.abs(samples.length - (c.angulos.com_sol_na_janela as number)),
      ).toBeLessThanOrEqual(2);
      const req = requiredAngles(samples);
      const betas = ['beta_direita_min', 'beta_esquerda_min']
        .map((k) => c.angulos[k] as ExtremeRef | null)
        .filter((x) => x !== null);
      const nearNormal = Math.min(...betas.map((x) => x!.externo)) < 0.1;
      for (const [ref, key] of KEYS) {
        const e = c.angulos[ref] as ExtremeRef | null;
        const a = req[key];
        if (e === null) {
          expect(a, ref).toBeNull();
          continue;
        }
        // Sol quase na normal no período (alguma amostra com |ψ| < 0,1°): aletas inviáveis, e o lado
        // em que cai o ψ ≈ 0 do meio-dia depende do arredondamento. Só se confere que o núcleo também
        // acha β pequeno; os β e γ de aleta de cada lado não são comparados.
        if (nearNormal && (ref.startsWith('beta') || ref.startsWith('gama_aleta'))) {
          const both = [req.betaRight, req.betaLeft].filter((x) => x !== null);
          expect(Math.min(...both.map((x) => x!.external))).toBeLessThan(0.1);
          continue;
        }
        expect(Math.abs(a!.external - e.externo), ref).toBeLessThanOrEqual(0.01);
        expect(a!.internal).toBeCloseTo(90 - a!.external, 12);
      }
    });
  }
});

const byId = (id: string) => data.casos.find((c) => c.id === id)!;

describe('ida e volta e minimalidade', () => {
  it('brise sem afastamento (tutorial da UFU, ano todo): sombra total e dimensões mínimas', () => {
    const { samples } = samplesOf(byId('tutorial-ufu-ano-todo'));
    const angles = requiredAngles(samples);
    const r = sizeOverhang(WINDOW, angles);
    if (!r.ok) throw new Error(r.reason);
    const o = r.device;
    expect(fullShade([o], samples)).toBeGreaterThanOrEqual(LIMIT);
    expect(fullShade([{ ...o, depth: o.depth * SHRINK }], samples)).toBeLessThan(LIMIT);
    expect(fullShade([{ ...o, extendRight: o.extendRight! * SHRINK }], samples)).toBeLessThan(
      LIMIT,
    );
    expect(fullShade([{ ...o, extendLeft: o.extendLeft! * SHRINK }], samples)).toBeLessThan(LIMIT);
  });

  it('brise na altura e acima da verga: mesma regra, com H + e', () => {
    const { samples } = samplesOf(byId('florianopolis-norte-verao'));
    const r = sizeOverhang(WINDOW, requiredAngles(samples), { above: 0.3 });
    if (!r.ok) throw new Error(r.reason);
    expect(r.device.above).toBe(0.3);
    expect(fullShade([r.device], samples)).toBeGreaterThanOrEqual(LIMIT);
    expect(fullShade([{ ...r.device, depth: r.device.depth * SHRINK }], samples)).toBeLessThan(
      LIMIT,
    );
  });

  it('brise afastado 28 cm (inverno do tutorial): altura acima da verga e profundidade mínimas', () => {
    const { samples } = samplesOf(byId('tutorial-ufu-inverno'));
    const r = sizeOverhang(WINDOW, requiredAngles(samples), { gap: 0.28 });
    if (!r.ok) throw new Error(r.reason);
    const o = r.device;
    expect(o.gap).toBe(0.28);
    expect(fullShade([o], samples)).toBeGreaterThanOrEqual(LIMIT);
    // Brise mais baixo: o sol mais alto do período passa pela fresta.
    expect(fullShade([{ ...o, above: o.above * SHRINK }], samples)).toBeLessThan(LIMIT);
    expect(fullShade([{ ...o, depth: o.depth * SHRINK }], samples)).toBeLessThan(LIMIT);
  });

  it('brise afastado com o sol rente à fachada no período (ano todo): altura absurda', () => {
    const { samples } = samplesOf(byId('tutorial-ufu-ano-todo'));
    const r = sizeOverhang(WINDOW, requiredAngles(samples), { gap: 0.28 });
    if (!r.ok) throw new Error(r.reason);
    expect(r.device.above).toBeGreaterThan(1000); // metros
  });

  it('aleta (Florianópolis, fachada Sul, manhãs de verão): sombra total e dimensões mínimas', () => {
    const { samples } = samplesOf(byId('florianopolis-sul-manhas-de-verao'));
    const fins = sizeFins(WINDOW, requiredAngles(samples));
    expect(fins.right).toBeNull();
    const left = fins.left!;
    expect(fullShade([left], samples)).toBeGreaterThanOrEqual(LIMIT);
    expect(fullShade([{ ...left, depth: left.depth * SHRINK }], samples)).toBeLessThan(LIMIT);
    expect(fullShade([{ ...left, extendAbove: left.extendAbove! * SHRINK }], samples)).toBeLessThan(
      LIMIT,
    );
  });

  it('subdivisão do brise em lâminas mantendo α e γ', () => {
    const { samples } = samplesOf(byId('tutorial-ufu-ano-todo'));
    const r = sizeOverhang(WINDOW, requiredAngles(samples));
    if (!r.ok) throw new Error(r.reason);
    for (const n of [2, 3, 5]) {
      const l = subdivideOverhang(WINDOW, r.device, n);
      expect(l.count).toBe(n);
      expect(l.chord).toBeCloseTo(r.device.depth / n, 12);
      expect(l.pitch).toBeCloseTo(WINDOW.height / n, 12);
      expect(fullShade([l], samples)).toBeGreaterThanOrEqual(LIMIT);
      expect(fullShade([{ ...l, chord: l.chord * SHRINK }], samples)).toBeLessThan(LIMIT);
      expect(fullShade([{ ...l, extendRight: l.extendRight! * SHRINK }], samples)).toBeLessThan(
        LIMIT,
      );
      expect(fullShade([{ ...l, extendLeft: l.extendLeft! * SHRINK }], samples)).toBeLessThan(
        LIMIT,
      );
    }
  });

  it('subdivisão das aletas em lâminas verticais com o β mais exigente', () => {
    const { samples } = samplesOf(byId('florianopolis-sul-manhas-de-verao'));
    const fins = sizeFins(WINDOW, requiredAngles(samples));
    const v = subdivideFins(WINDOW, fins, 4);
    expect(v.count).toBe(5);
    expect(v.chord).toBeCloseTo(fins.left!.depth / 4, 12);
    expect(fullShade([v], samples)).toBeGreaterThanOrEqual(LIMIT);
    expect(fullShade([{ ...v, chord: v.chord * SHRINK }], samples)).toBeLessThan(LIMIT);
    expect(fullShade([{ ...v, extendAbove: v.extendAbove! * SHRINK }], samples)).toBeLessThan(
      LIMIT,
    );
  });
});

describe('tutorial do SOL-AR da UFU (Bortoli e Saramago), ano todo, 9 h às 15 h solar', () => {
  const { samples } = samplesOf(byId('tutorial-ufu-ano-todo'));
  const a = requiredAngles(samples);

  it('ângulos exigidos perto das leituras do tutorial (α 55°, γ direita 50°, γ esquerda 60°)', () => {
    // α: 57,5°, 2,5° acima da leitura; é o ponto das 9 h de 21/06 (relatório do F2.3).
    expect(a.alpha!.internal).toBeGreaterThan(55);
    expect(a.alpha!.internal - 55).toBeLessThan(3);
    expect([a.alpha!.sample.month, a.alpha!.sample.day, a.alpha!.sample.hour]).toEqual([6, 21, 9]);
    // γ esquerda: 58,5°, 1,5° abaixo da leitura (tardes de junho, às 15 h).
    expect(Math.abs(a.gammaLeft!.internal - 60)).toBeLessThan(1.5);
    expect(a.gammaLeft!.sample.hour).toBe(15);
    // γ direita: 42,2°; a leitura de 50° dá um prolongamento maior que o necessário (manhãs de dezembro).
    expect(a.gammaRight!.internal).toBeLessThan(50);
    expect([a.gammaRight!.sample.month, a.gammaRight!.sample.hour]).toEqual([12, 9]);
  });

  it('as leituras do tutorial deixam passar as 9 h de junho; os ângulos calculados, não', () => {
    const tutorial = sizeOverhang(WINDOW, {
      ...a,
      alpha: { ...a.alpha!, internal: 55, external: 35 },
      gammaRight: { ...a.gammaRight!, internal: 50, external: 40 },
      gammaLeft: { ...a.gammaLeft!, internal: 60, external: 30 },
    });
    if (!tutorial.ok) throw new Error(tutorial.reason);
    const scene = buildScene(WINDOW, [tutorial.device]);
    const leaks = samples.filter((p) => shadedFraction(scene, p.s) < LIMIT);
    expect(leaks.length).toBeGreaterThan(0);
    expect(leaks.every((p) => [5, 6, 7].includes(p.month) && p.hour < 9.5)).toBe(true);
  });
});
