import { describe, expect, it } from 'vitest';
import { project } from '../chart/stereographic';
import { regionContains, shadingRegion } from '../mask/mask';
import { directionAngles } from './pointAngles';
import { alphaCircle, betaRayAzimuth, toExternal, type AngleReference } from './protractor';

const RAD = Math.PI / 180;

/** Direção (altura, azimute) a partir do referencial da fachada (spec 01, seção 1.2). */
function fromFacade(orientation: number, h: number, psi: number) {
  return { altitude: h, azimuth: (((orientation + psi) % 360) + 360) % 360 };
}

/** Direções diante da fachada, sorteadas com semente fixa (resultado reproduzível). */
function frontDirections(n: number) {
  let seed = 51;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed / 2 ** 31;
  };
  return Array.from({ length: n }, () => ({
    orientation: random() * 720 - 360,
    h: random() * 88 + 1,
    psi: random() * 176 - 88,
  }));
}

describe('α e β de um ponto da carta (decisão 0051)', () => {
  it('casos analíticos: na normal, α é a altura e β é zero', () => {
    const a = directionAngles(0, 'external', 30, 0);
    expect(a.front).toBe(true);
    expect(a.alpha).toBeCloseTo(30, 12);
    expect(a.beta).toBeCloseTo(0, 12);
    expect(a.side).toBeNull();
    const i = directionAngles(0, 'internal', 30, 0);
    expect(i.alpha).toBeCloseTo(60, 12);
    expect(i.beta).toBeCloseTo(90, 12);
  });

  it('casos analíticos: fachada leste, sol no horizonte a 45° para o sul', () => {
    // ψ = 135° − 90° = 45° > 0: à direita de quem olha para fora (o Sul, para quem olha a Leste).
    const a = directionAngles(90, 'external', 0, 135);
    expect(a.psi).toBeCloseTo(45, 12);
    expect(a.alpha).toBeCloseTo(0, 12);
    expect(a.beta).toBeCloseTo(45, 12);
    expect(a.side).toBe('right');
    // tan α = tan h / cos ψ: h = 30°, ψ = −45° (à esquerda), fachada norte.
    const b = directionAngles(0, 'external', 30, 315);
    expect(b.side).toBe('left');
    expect(b.beta).toBeCloseTo(45, 12);
    expect(b.alpha).toBeCloseTo(Math.atan(Math.tan(30 * RAD) / Math.cos(45 * RAD)) / RAD, 12);
  });

  it('atrás da fachada, no plano dela ou no zênite: sem α e sem β', () => {
    for (const [h, az] of [
      [30, 180],
      [10, 90],
      [10, 270],
      [90, 0],
    ] as const) {
      const a = directionAngles(0, 'internal', h, az);
      expect(a.front).toBe(false);
      expect(a.alpha).toBeNull();
      expect(a.beta).toBeNull();
    }
  });

  it('a direção fica na curva de α e na reta de β do núcleo do transferidor', () => {
    for (const { orientation, h, psi } of frontDirections(2000)) {
      const d = fromFacade(orientation, h, psi);
      const a = directionAngles(orientation, 'external', d.altitude, d.azimuth);
      expect(a.front).toBe(true);
      const p = project(90 - d.altitude, d.azimuth);
      const c = alphaCircle(orientation, a.alpha!);
      expect(Math.abs(Math.hypot(p.x - c.centerE, p.y - c.centerN) - c.radius)).toBeLessThan(1e-9);
      if (a.side) {
        const ray = betaRayAzimuth(orientation, a.side, a.beta!);
        expect(Math.abs(((ray - d.azimuth + 540) % 360) - 180)).toBeLessThan(1e-9);
      }
    }
  });

  it('a referência interna é 90° menos a externa, como no transferidor', () => {
    for (const { orientation, h, psi } of frontDirections(200)) {
      const d = fromFacade(orientation, h, psi);
      const ext = directionAngles(orientation, 'external', d.altitude, d.azimuth);
      const int = directionAngles(orientation, 'internal', d.altitude, d.azimuth);
      expect(toExternal(int.alpha!, 'internal')).toBeCloseTo(ext.alpha!, 9);
      expect(toExternal(int.beta!, 'internal')).toBeCloseTo(ext.beta!, 9);
    }
  });

  it('a máscara do transferidor com o α do ponto passa por ele, nas duas referências', () => {
    // Meio grau para cada lado do α do ponto: com a proteção maior, o ponto fica na sombra.
    for (const reference of ['internal', 'external'] as AngleReference[]) {
      const more = reference === 'internal' ? 0.5 : -0.5;
      for (const { orientation, h, psi } of frontDirections(300)) {
        const d = fromFacade(orientation, h, psi);
        const a = directionAngles(orientation, reference, d.altitude, d.azimuth);
        const p = project(90 - d.altitude, d.azimuth);
        // Longe de 0° e de 90° externos, onde a curva de meio grau a mais sai do domínio.
        const inRange = (v: number) =>
          toExternal(v, reference) > 1 && toExternal(v, reference) < 89;
        const shade = (alpha: number) =>
          regionContains(shadingRegion(orientation, reference, { alpha: [alpha] }), p.x, p.y);
        if (inRange(a.alpha!)) {
          expect(shade(a.alpha! + more)).toBe(true);
          expect(shade(a.alpha! - more)).toBe(false);
        }
        if (!a.side || !inRange(a.beta!)) continue;
        const key = a.side === 'right' ? 'betaRight' : 'betaLeft';
        const fin = (beta: number) =>
          regionContains(shadingRegion(orientation, reference, { [key]: [beta] }), p.x, p.y);
        expect(fin(a.beta! + more)).toBe(true);
        expect(fin(a.beta! - more)).toBe(false);
      }
    }
  });
});
