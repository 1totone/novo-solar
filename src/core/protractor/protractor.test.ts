import { describe, expect, it } from 'vitest';
import { project } from '../chart/stereographic';
import {
  alphaCircle,
  betaRayAzimuth,
  gammaCircle,
  protractorCurves,
  protractorGrid,
  toExternal,
} from './protractor';

const RAD = Math.PI / 180;

/** Direção (zênite, azimute) a partir do referencial da fachada (spec 01, seção 1.2). */
function fromFacade(orientation: number, h: number, psi: number) {
  return { zenith: 90 - h, azimuth: (((orientation + psi) % 360) + 360) % 360 };
}

function distanceToCircle(
  p: { x: number; y: number },
  c: { centerE: number; centerN: number; radius: number },
) {
  return Math.abs(Math.hypot(p.x - c.centerE, p.y - c.centerN) - c.radius);
}

describe('referência interna e externa', () => {
  it('externo = 90° − interno', () => {
    expect(toExternal(30, 'internal')).toBe(60);
    expect(toExternal(30, 'external')).toBe(30);
  });
});

describe('curvas do transferidor contra a geometria da spec (casos analíticos)', () => {
  const orientations = [0, 30, 90, 135, 200, 330, -30];

  it('α: toda direção com ângulo de perfil α_ext está no círculo', () => {
    for (const o of orientations) {
      for (const a of [5, 30, 45, 70, 85]) {
        const c = alphaCircle(o, a);
        for (let psi = -85; psi <= 85; psi += 5) {
          // tan(perfil) = tan h / cos ψ
          const h = Math.atan(Math.tan(a * RAD) * Math.cos(psi * RAD)) / RAD;
          const d = fromFacade(o, h, psi);
          expect(distanceToCircle(project(d.zenith, d.azimuth), c)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it('γ: toda direção do lado com γ_ext está no círculo do lado certo', () => {
    for (const o of orientations) {
      for (const g of [5, 30, 60, 85]) {
        for (const side of ['right', 'left'] as const) {
          const c = gammaCircle(o, side, g);
          for (let p = 5; p <= 175; p += 5) {
            const psi = side === 'right' ? p : -p;
            // tan γ = tan h / |sen ψ|
            const h = Math.atan(Math.tan(g * RAD) * Math.abs(Math.sin(psi * RAD))) / RAD;
            const d = fromFacade(o, h, psi);
            expect(distanceToCircle(project(d.zenith, d.azimuth), c)).toBeLessThan(1e-9);
          }
        }
      }
    }
  });

  it('β: a reta fica no azimute relativo ±β_ext (direita = sentido horário a partir da normal)', () => {
    expect(betaRayAzimuth(0, 'right', 60)).toBe(60);
    expect(betaRayAzimuth(0, 'left', 60)).toBe(300);
    expect(betaRayAzimuth(-30, 'right', 50)).toBe(20);
    expect(betaRayAzimuth(350, 'right', 30)).toBe(20);
  });

  it('α → 0° tende ao horizonte e γ → 0° também; α_ext pequeno cobre quase toda a frente', () => {
    const c = alphaCircle(0, 1e-6);
    expect(c.radius).toBeCloseTo(1, 9);
    expect(Math.hypot(c.centerE, c.centerN)).toBeLessThan(1e-6);
  });
});

describe('protractorCurves', () => {
  it('mantém os índices 1 e 2 na ordem digitada e completa β sem índice 2 com a linha da fachada', () => {
    const curves = protractorCurves(30, 'internal', {
      alpha: [40, 15],
      betaRight: [20],
    });
    const alpha = curves.filter((c) => c.family === 'alpha').map((c) => [c.index, c.externalAngle]);
    expect(alpha).toEqual([
      [1, 50],
      [2, 75],
    ]);
    const beta = curves.filter((c) => c.family === 'beta').map((c) => c.externalAngle);
    expect(beta).toEqual([70, 90]);
    const swapped = protractorCurves(0, 'external', { alpha: [60, 30] });
    expect(swapped.map((c) => [c.index, c.externalAngle])).toEqual([
      [1, 60],
      [2, 30],
    ]);
  });

  it('α e γ sem índice 2 não ganham segunda curva', () => {
    const curves = protractorCurves(0, 'external', { alpha: [45], gammaLeft: [30] });
    expect(curves.map((c) => `${c.family}${c.index}`)).toEqual(['alpha1', 'gamma1']);
  });

  it('γ das aletas usa a família de curvas de γ, do lado da aleta', () => {
    const [top] = protractorCurves(200, 'internal', { finTopRight: [50] });
    expect(top).toMatchObject({ family: 'finTop', side: 'right', index: 1, externalAngle: 40 });
    expect(top!.geometry).toEqual(gammaCircle(200, 'right', 40));
  });
});

describe('grade do transferidor', () => {
  it('curvas de α de 5° em 5° (5° a 85°) e retas de β de 10° em 10°, como no 6.2', () => {
    const g = protractorGrid(30);
    expect(g.alpha.map((c) => c.externalAngle)).toEqual(
      Array.from({ length: 17 }, (_, k) => 5 + 5 * k),
    );
    expect(g.betaAzimuths).toHaveLength(36);
    expect(g.betaAzimuths[0]).toBe(30);
  });
});
