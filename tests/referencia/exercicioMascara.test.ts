// Métrica do exercício de máscara (F4.5, spec 12, seção 12.4): ângulo sólido e índice de Jaccard
// contra casos analíticos (cunhas da esfera) e contagem independente das posições do sol pelo
// ângulo de perfil (spec 01, seção 1.3), sem as funções de região da máscara.
import { describe, expect, it } from 'vitest';
import { project } from '../../src/core/chart/stereographic';
import { compareRegions, solidAngle } from '../../src/core/mask/compare';
import { shadingRegion, EMPTY, type Region } from '../../src/core/mask/mask';
import { sunSamples } from '../../src/core/shading/hourly';
import { siteFromHash } from '../../src/ui/state/siteHash';

const RAD = Math.PI / 180;

const brise = (orientation: number, alphaExt: number) =>
  shadingRegion(orientation, 'external', { alpha: [alphaExt] });
const finRight = (orientation: number, betaExt: number) =>
  shadingRegion(orientation, 'external', { betaRight: [betaExt] });

describe('ângulo sólido das regiões (grade de Fibonacci)', () => {
  for (const orientation of [0, 30, 270]) {
    for (const alpha of [20, 35, 50, 70]) {
      it(`brise infinito, α externo ${alpha}°, fachada a ${orientation}°: π − 2α`, () => {
        const exact = Math.PI - 2 * alpha * RAD;
        expect(
          Math.abs(solidAngle(brise(orientation, alpha), orientation) / exact - 1),
        ).toBeLessThan(0.005);
      });
    }
    for (const beta of [30, 60]) {
      it(`aleta infinita à direita, β externo ${beta}°, fachada a ${orientation}°: π/2 − β`, () => {
        const exact = Math.PI / 2 - beta * RAD;
        expect(
          Math.abs(solidAngle(finRight(orientation, beta), orientation) / exact - 1),
        ).toBeLessThan(0.005);
      });
    }
  }
});

describe('índice de Jaccard em ângulo sólido', () => {
  it('dois brises infinitos encaixados: (π − 2α2) / (π − 2α1)', () => {
    for (const [a1, a2] of [
      [30, 40],
      [35, 60],
      [10, 45],
    ] as const) {
      const r = compareRegions(brise(30, a2), brise(30, a1), 30);
      const exact = (Math.PI - 2 * a2 * RAD) / (Math.PI - 2 * a1 * RAD);
      expect(Math.abs(r.shape.jaccard! - exact)).toBeLessThan(0.005);
      // O desenho (α2) fica dentro da resposta (α1): nada a mais; falta a faixa entre as curvas.
      expect(r.shape.extra).toBe(0);
      expect(Math.abs(r.shape.missed! - (1 - exact))).toBeLessThan(0.005);
    }
  });

  it('desenho com 25 vértices sobre a curva de α: coincidência de pelo menos 99%', () => {
    const orientation = 0;
    const alphaExt = 45;
    const points = Array.from({ length: 25 }, (_, i) => {
      const psi = -90 + (180 * i) / 24;
      const h = Math.atan(Math.tan(alphaExt * RAD) * Math.cos(psi * RAD)) / RAD;
      return project(90 - h, orientation + psi);
    });
    const drawn: Region = { kind: 'polygon', points };
    const r = compareRegions(drawn, brise(orientation, alphaExt), orientation);
    expect(r.shape.jaccard!).toBeGreaterThanOrEqual(0.99);
    expect(r.shape.jaccard!).toBeLessThan(1);
  });

  it('desenho vazio: coincidência 0 e toda a sombra faltando; as duas vazias: indefinido', () => {
    const r = compareRegions(EMPTY, brise(0, 45), 0);
    expect(r.shape.jaccard).toBe(0);
    expect(r.shape.missed).toBe(1);
    expect(r.shape.extra).toBe(0);
    const none = compareRegions(EMPTY, EMPTY, 0);
    expect(none.shape.jaccard).toBeNull();
    expect(none.shape.missed).toBeNull();
  });

  it('desenho atrás da fachada não conta (só o quarto de esfera diante dela)', () => {
    // Polígono que cobre a carta toda: dentro de Q, é o céu inteiro diante da fachada.
    const all: Region = {
      kind: 'polygon',
      points: [
        { x: -2, y: -2 },
        { x: 2, y: -2 },
        { x: 2, y: 2 },
        { x: -2, y: 2 },
      ],
    };
    const r = compareRegions(all, brise(0, 45), 0);
    const exact = (Math.PI - 2 * 45 * RAD) / Math.PI;
    expect(Math.abs(r.shape.jaccard! - exact)).toBeLessThan(0.005);
    expect(Math.abs(r.shape.extra! - (Math.PI / (Math.PI - Math.PI / 2) - 1))).toBeLessThan(0.01);
  });
});

describe('coincidência nas horas de sol: contagem independente pelo ângulo de perfil', () => {
  it('Florianópolis, fachada Norte, brises de α externo 35° (resposta) e 50° (desenho)', () => {
    const site = siteFromHash({ local: 'florianopolis' }).site;
    const sun = sunSamples(site, { samplesPerHour: 2 });
    const orientation = 0;
    const r = compareRegions(brise(orientation, 50), brise(orientation, 35), orientation, sun);
    // Independente: sol diante da fachada (ψ entre −90° e 90°) e acima do horizonte, perfil
    // tan α = tan h / cos ψ.
    let inAnswer = 0;
    let inDrawn = 0;
    for (let i = 0; i < sun.up.length; i++) {
      const up = sun.up[i]!;
      const e = sun.east[i]!;
      const n = sun.north[i]!;
      if (up <= 0) continue;
      const azimuth = Math.atan2(e, n) / RAD;
      const psi = ((((azimuth - orientation + 180) % 360) + 360) % 360) - 180;
      if (Math.abs(psi) >= 90) continue;
      const h = Math.asin(up) / RAD;
      const profile = Math.atan(Math.tan(h * RAD) / Math.cos(psi * RAD)) / RAD;
      if (profile >= 35) inAnswer++;
      if (profile >= 50) inDrawn++;
    }
    expect(inAnswer).toBeGreaterThan(1000);
    // Regiões encaixadas: interseção = desenho; união = resposta.
    expect(Math.abs(r.sun!.jaccard! - inDrawn / inAnswer)).toBeLessThan(2 / inAnswer);
    expect(r.sun!.extra).toBe(0);
  });
});
