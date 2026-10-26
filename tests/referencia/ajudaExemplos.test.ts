// Exemplos resolvidos da ajuda (F4.8): cada número que o texto afirma é conferido aqui com o núcleo,
// a partir do próprio link do exemplo (src/ui/help/content.ts), e, no brise afastado, contra o
// traçado de raios independente do relatório do F2.3 (docs/validacao/scripts/tutorial_ufu_fresta.py).
import { describe, expect, it } from 'vitest';
import { project } from '../../src/core/chart/stereographic';
import { buildScene, type Device } from '../../src/core/shading/geometry';
import {
  periodSamples,
  requiredAngles,
  sizeOverhang,
  type PeriodSample,
} from '../../src/core/shading/inverse';
import { facadeVector, shadedFraction } from '../../src/core/shading/shadedFraction';
import { EXAMPLES } from '../../src/ui/help/content';
import { geometryFromHash } from '../../src/ui/state/geometryHash';
import { protractorFromHash } from '../../src/ui/state/protractorHash';
import { siteFromHash } from '../../src/ui/state/siteHash';
import { sizingFromHash } from '../../src/ui/state/sizingHash';
import { helpPtBR } from '../../src/ui/help/help.pt-BR';

const RAD = Math.PI / 180;
const FULL = 1 - 1e-9;

const site = siteFromHash(EXAMPLES.angulos).site;
const orientation = protractorFromHash(EXAMPLES.angulos).orientation;
const period = sizingFromHash(EXAMPLES.angulos).period!;
const { samples } = periodSamples(site, orientation, period);
const angles = requiredAngles(samples);

/** Cena do passo 6 de um exemplo, lida do link como a aplicação lê. */
const sceneOf = (id: keyof typeof EXAMPLES) => {
  const g = geometryFromHash(EXAMPLES[id]);
  return buildScene(g.window!, g.devices);
};
const stats = (devicesScene: ReturnType<typeof sceneOf>, list: PeriodSample[]) => {
  const f = list.map((p) => shadedFraction(devicesScene, p.s));
  const full = f.filter((v) => v >= FULL).length;
  return { full, share: full / list.length, worstSunlit: 1 - Math.min(...f) };
};
/** Sol no plano da normal (ψ = 0) com o ângulo de perfil dado. */
const profileSun = (profile: number) => facadeVector(profile, orientation, orientation);

/** O texto em português traz o número com vírgula decimal. */
const ptText = (id: keyof typeof EXAMPLES) => {
  const e = helpPtBR.examples.items[id];
  return [e.problem, ...e.steps, e.lesson].join(' ');
};

describe('exemplo 1: ângulos lidos no tutorial contra os exigidos pelo período', () => {
  it('o período é o da Figura 13: ano todo, das 9 h às 15 h solares, em Brasília a 30°', () => {
    expect(site.name).toMatch(/Brasília/);
    expect(orientation).toBe(30);
    expect(period).toMatchObject({
      start: { month: 1, day: 1 },
      end: { month: 12, day: 31 },
      startHour: 9,
      endHour: 15,
      timeBase: 'solar',
    });
  });

  it('α exigido 57,5° (21/6, 9 h solar); γ direita 42,2° (21/12, 9 h); γ esquerda 58,5° (21/6, 15 h)', () => {
    const { alpha, gammaRight, gammaLeft } = angles;
    expect(alpha!.internal).toBeCloseTo(57.52, 1);
    expect([alpha!.sample.month, alpha!.sample.day, alpha!.sample.hour]).toEqual([6, 21, 9]);
    expect(gammaRight!.internal).toBeCloseTo(42.2, 1);
    expect([gammaRight!.sample.month, gammaRight!.sample.day, gammaRight!.sample.hour]).toEqual([
      12, 21, 9,
    ]);
    expect(gammaLeft!.internal).toBeCloseTo(58.53, 1);
    expect([gammaLeft!.sample.month, gammaLeft!.sample.day, gammaLeft!.sample.hour]).toEqual([
      6, 21, 15,
    ]);
    const text = ptText('angulos');
    for (const s of ['57,5°', '42,2°', '58,5°', '32,5°']) expect(text).toContain(s);
  });

  it('com os ângulos lidos (α 55°, γ 50° e 60°), só escapam as manhãs de maio a julho, antes das 9h30', () => {
    const read = protractorFromHash(EXAMPLES.angulos).angles;
    expect(read.alpha).toEqual([55]);
    expect(read.gammaRight).toEqual([50]);
    expect(read.gammaLeft).toEqual([60]);
    const sized = sizeOverhang(
      { width: 2, height: 1, setback: 0.15 },
      {
        ...angles,
        alpha: { ...angles.alpha!, internal: 55, external: 35 },
        gammaRight: { ...angles.gammaRight!, internal: 50, external: 40 },
        gammaLeft: { ...angles.gammaLeft!, internal: 60, external: 30 },
      },
    );
    if (!sized.ok) throw new Error(sized.reason);
    const scene = buildScene({ width: 2, height: 1, setback: 0.15 }, [sized.device]);
    const leaks = samples.filter((p) => shadedFraction(scene, p.s) < FULL);
    expect(leaks.length).toBeGreaterThan(0);
    expect(leaks.every((p) => [5, 6, 7].includes(p.month) && p.hour < 9.5)).toBe(true);
    // O perfil do sol das 9 h de 21/6 é 32,5°, abaixo dos 35° do α externo lido.
    expect(angles.alpha!.external).toBeCloseTo(32.48, 1);
  });

  it('na carta de 6 cm de raio, o ponto das 9 h de 21/6 fica a 1,7 mm da curva de α = 55°', () => {
    const p = angles.alpha!.sample;
    const sun = project(90 - p.altitude, p.azimuth);
    // Curva do α externo de 35°: tan h = tan 35° · cos ψ, com ψ de −90° a 90°.
    let best = Infinity;
    for (let psi = -89.99; psi <= 89.99; psi += 0.01) {
      const h = Math.atan(Math.tan(35 * RAD) * Math.cos(psi * RAD)) / RAD;
      const q = project(90 - h, orientation + psi);
      best = Math.min(best, Math.hypot(q.x - sun.x, q.y - sun.y));
    }
    const mm = best * 60;
    expect(mm).toBeGreaterThan(1.6);
    expect(mm).toBeLessThan(1.8);
    expect(ptText('angulos')).toContain('1,7 mm');
  });

  it('com 57,5°, a profundidade do brise passa de 1,28 m para 1,42 m (vidro recuado 15 cm)', () => {
    const sized = sizeOverhang({ width: 2, height: 1, setback: 0.15 }, angles);
    if (!sized.ok) throw new Error(sized.reason);
    expect(sized.device.depth).toBeCloseTo(1.421, 2);
    const read = sizeOverhang(
      { width: 2, height: 1, setback: 0.15 },
      { ...angles, alpha: { ...angles.alpha!, internal: 55, external: 35 } },
    );
    if (!read.ok) throw new Error(read.reason);
    expect(read.device.depth).toBeCloseTo(1.278, 2);
    const text = ptText('angulos');
    expect(text).toContain('1,28 m');
    expect(text).toContain('1,42 m');
  });
});

describe('exemplo 2: o brise da Figura 22 com o vidro recuado', () => {
  const g = geometryFromHash(EXAMPLES.recuo);
  const scene = sceneOf('recuo');

  it('janela de 2,00 × 1,00 m, recuo de 15 cm, brise de 1,28 m com prolongamentos de 1,70 e 1,20 m', () => {
    expect(g.window).toEqual({ width: 2, height: 1, setback: 0.15 });
    expect(g.devices).toEqual([
      expect.objectContaining({
        kind: 'overhang',
        depth: 1.28,
        above: 0,
        gap: 0,
        extendLeft: 1.7,
        extendRight: 1.2,
      }),
    ]);
  });

  it('α do peitoril, junto ao vidro, até a aresta externa: (1,28 + 0,15) / 1,00 dá 55,0°; γ 50,2° e 59,5°', () => {
    expect(Math.atan(1.43) / RAD).toBeCloseTo(55.03, 2);
    expect(Math.atan(1.2) / RAD).toBeCloseTo(50.19, 2);
    expect(Math.atan(1.7) / RAD).toBeCloseTo(59.53, 2);
    const text = ptText('recuo');
    for (const s of ['55,0°', '50,2°', '59,5°']) expect(text).toContain(s);
  });

  it('a borda da sombra total coincide com a do α de 55° do passo 3, a menos de 0,1°', () => {
    // No plano da normal, a janela fica toda à sombra a partir do perfil de atan(1 / 1,43) = 34,97°.
    expect(shadedFraction(scene, profileSun(34.9))).toBeLessThan(FULL);
    expect(shadedFraction(scene, profileSun(35.0))).toBeGreaterThanOrEqual(FULL);
    expect(90 - Math.atan(1.43) / RAD).toBeCloseTo(34.97, 2);
  });

  it('não há curva de 0%: com o recuo, toda direção diante da janela sombreia uma parte dela', () => {
    for (let h = 0.5; h < 90; h += 7) {
      for (let psi = -85; psi <= 85; psi += 5) {
        const s = facadeVector(h, orientation + psi, orientation);
        expect(shadedFraction(scene, s)).toBeGreaterThan(0);
      }
    }
    // Sem o recuo e sem o brise, a mesma janela não tem sombra nenhuma.
    const bare = buildScene({ width: 2, height: 1 }, []);
    expect(shadedFraction(bare, facadeVector(30, orientation + 20, orientation))).toBe(0);
  });

  it('no período, 99,2% dos instantes com a janela toda à sombra; no pior, 8,7% dela ao sol (21/6, 9 h)', () => {
    const r = stats(scene, samples);
    expect(r.share).toBeCloseTo(0.992, 3);
    expect(r.worstSunlit).toBeCloseTo(0.087, 3);
    const text = ptText('recuo');
    expect(text).toContain('99,2%');
    expect(text).toContain('8,7%');
  });
});

describe('exemplo 3: o brise afastado da Figura 26 (α2 medido da verga)', () => {
  const g = geometryFromHash(EXAMPLES.afastado);
  const scene = sceneOf('afastado');

  it('brise de 1,00 m na altura da verga, a 28 cm da parede; a aresta externa no mesmo lugar (α1 55°)', () => {
    expect(g.devices).toEqual([
      expect.objectContaining({ kind: 'overhang', depth: 1, above: 0, gap: 0.28 }),
    ]);
    expect(protractorFromHash(EXAMPLES.afastado).angles.alpha).toEqual([55, 20]);
    expect((g.devices[0] as Extract<Device, { kind: 'overhang' }>).depth + 0.28 + 0.15).toBeCloseTo(
      1.43,
      10,
    );
  });

  it('a fresta só fecha com o sol a mais de 81,5° de perfil, pela verga da própria parede', () => {
    // tan(90° − 81,47°) = 0,15 / 1,00: a sombra da verga de 15 cm cobre a janela inteira.
    expect(90 - Math.atan(0.15) / RAD).toBeCloseTo(81.47, 2);
    expect(shadedFraction(scene, profileSun(81.3))).toBeLessThan(FULL);
    expect(shadedFraction(scene, profileSun(81.6))).toBeGreaterThanOrEqual(FULL);
    for (const profile of [36, 50, 70, 80]) {
      expect(shadedFraction(scene, profileSun(profile))).toBeLessThan(FULL);
    }
    expect(ptText('afastado')).toContain('81,5°');
  });

  it('igual ao traçado de raios do F2.3: posições com sombra total em cada data, de 15 em 15 min', () => {
    // Relatório do F2.3, seção 2 (tutorial_ufu_fresta.py, pvlib e grade de 41 × 41 pontos):
    // [mês, dia, posições diante da fachada, com sombra total].
    const reference: [number, number, number, number][] = [
      [1, 21, 10, 5],
      [2, 21, 15, 5],
      [3, 20, 19, 4],
      [4, 21, 24, 3],
      [5, 21, 25, 0],
      [6, 21, 25, 0],
      [7, 21, 25, 0],
      [8, 21, 24, 3],
      [9, 22, 19, 4],
      [10, 21, 15, 5],
      [11, 21, 10, 5],
      [12, 21, 8, 6],
    ];
    for (const [month, day, positions, full] of reference) {
      const day1 = { month, day };
      const list = periodSamples(site, orientation, {
        ...period,
        start: day1,
        end: day1,
        stepMinutes: 15,
      }).samples;
      expect(list.length, `${day}/${month}`).toBe(positions);
      expect(stats(scene, list).full, `${day}/${month}`).toBe(full);
    }
  });

  it('no período, só 18,4% dos instantes com a janela toda à sombra, todos com o sol a mais de 81,5° de perfil e nenhum de 12/5 a 30/7; no pior, 64,8% ao sol', () => {
    const r = stats(scene, samples);
    expect(r.share).toBeCloseTo(0.184, 3);
    expect(r.worstSunlit).toBeCloseTo(0.648, 3);
    const full = samples.filter((p) => shadedFraction(scene, p.s) >= FULL);
    expect(full.every((p) => p.profile > 81.4)).toBe(true);
    // Do inverno, só sobram tardes de 1 a 11 de maio e de 31 de julho, com o sol rente à fachada.
    const doy = (p: PeriodSample) => p.month * 100 + p.day;
    const winter = samples.filter((p) => doy(p) >= 512 && doy(p) <= 730);
    expect(winter.length).toBeGreaterThan(1000);
    expect(stats(scene, winter).full).toBe(0);
    expect(full.some((p) => doy(p) === 511)).toBe(true);
    expect(full.some((p) => doy(p) === 731)).toBe(true);
    const text = ptText('afastado');
    expect(text).toContain('18%');
    expect(text).toContain('de 12/5 a 30/7');
    expect(text).toContain('65%');
  });

  it('para fechar a fresta até 70° de perfil: aresta interna 0,77 m acima da verga e brise de 2,10 m', () => {
    // α2 = 20° medido da verga: e = g / tan 20°; α1 = 55° do peitoril: D = (H + e) · tan 55° − g − d.
    const e = 0.28 / Math.tan(20 * RAD);
    const depth = (1 + e) * Math.tan(55 * RAD) - 0.28 - 0.15;
    expect(e).toBeCloseTo(0.769, 3);
    expect(depth).toBeCloseTo(2.097, 3);
    const fixed = buildScene({ width: 2, height: 1, setback: 0.15 }, [
      {
        kind: 'overhang',
        depth: 2.1,
        above: 0.77,
        gap: 0.28,
        extendLeft: Infinity,
        extendRight: Infinity,
      },
    ]);
    for (const profile of [35.1, 50, 69.9]) {
      expect(shadedFraction(fixed, profileSun(profile)), `${profile}°`).toBeGreaterThanOrEqual(
        FULL,
      );
    }
    for (const profile of [34.8, 70.2, 75]) {
      expect(shadedFraction(fixed, profileSun(profile)), `${profile}°`).toBeLessThan(FULL);
    }
    const text = ptText('afastado');
    expect(text).toContain('0,77 m');
    expect(text).toContain('2,10 m');
  });
});
