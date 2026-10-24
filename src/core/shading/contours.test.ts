import { describe, expect, it } from 'vitest';
import { CONTOUR_LEVELS, contourThreshold, shadingContours } from './contours';
import { buildScene } from './geometry';
import { facadeVector, shadedFraction } from './shadedFraction';

const RAD = Math.PI / 180;

/** Ângulo azimutal relativo ψ, em (−180°, 180°]. */
function relative(azimuth: number, orientation: number) {
  const d = (((azimuth - orientation) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

describe('curvas de percentual (spec 07, seção 7.5)', () => {
  it('níveis padrão e limiares de 0% e 100%', () => {
    expect(CONTOUR_LEVELS).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(contourThreshold(0)).toBe(1e-9);
    expect(contourThreshold(1)).toBe(1 - 1e-9);
    expect(contourThreshold(0.25)).toBe(0.25);
  });

  it('brise infinito rente à fachada: a curva do nível p é a curva α com tan α = (e + p·H) / D', () => {
    const H = 1.2;
    const e = 0.1;
    const D = 0.8;
    const orientation = 25;
    const scene = buildScene({ width: 1.5, height: H }, [
      { kind: 'overhang', depth: D, above: e, extendLeft: Infinity, extendRight: Infinity },
    ]);
    const contours = shadingContours(scene, orientation);
    for (const level of CONTOUR_LEVELS) {
      const lines = contours.filter((c) => c.level === level);
      expect(lines.length, `nível ${level}`).toBeGreaterThan(0);
      const alpha = Math.atan((e + contourThreshold(level) * H) / D) / RAD;
      let n = 0;
      for (const line of lines) {
        for (const p of line.points) {
          const psi = relative(p.azimuth, orientation) * RAD;
          const profile = Math.atan2(Math.tan(p.altitude * RAD), Math.cos(psi)) / RAD;
          // Vértices junto ao horizonte (h → 0) e ao plano da fachada (ψ → ±90°) ficam fora do teste
          // de ângulo: ali o ângulo de perfil é mal condicionado.
          if (p.altitude < 0.01 || Math.abs(psi / RAD) > 89.99) continue;
          expect(profile, `nível ${level}`).toBeCloseTo(alpha, 6);
          n++;
        }
      }
      expect(n, `nível ${level}`).toBeGreaterThan(50);
    }
  });

  it('aleta infinita à direita: a curva do nível p é a reta β com tan β = (s + p·W) / D', () => {
    const W = 1;
    const s = 0.1;
    const D = 0.6;
    const scene = buildScene({ width: W, height: 1.4 }, [
      { kind: 'fin', side: 'right', depth: D, offset: s, extendAbove: Infinity, extendBelow: Infinity },
    ]);
    const contours = shadingContours(scene, 180);
    for (const level of CONTOUR_LEVELS) {
      const beta = Math.atan((s + contourThreshold(level) * W) / D) / RAD;
      const points = contours.filter((c) => c.level === level).flatMap((c) => c.points);
      expect(points.length, `nível ${level}`).toBeGreaterThan(50);
      for (const p of points) {
        if (p.altitude > 89.99) continue; // no zênite, o azimute é indefinido
        expect(relative(p.azimuth, 180), `nível ${level}`).toBeCloseTo(beta, 6);
      }
    }
  });

  it('cada vértice está no nível da curva (percentual exato a 10⁻⁶)', () => {
    const orientation = 300;
    const scene = buildScene({ width: 1.4, height: 1.2 }, [
      { kind: 'overhang', depth: 0.7, above: 0.15, gap: 0.1, extendLeft: 0.2, extendRight: 0.5 },
      { kind: 'fin', side: 'right', depth: 0.5, offset: 0.2, extendAbove: 0.3 },
      { kind: 'fin', side: 'left', depth: 0.4, offset: 0.1, gap: 0.05, extendBelow: 0.4 },
      {
        kind: 'horizontalLouvers',
        count: 2,
        chord: 0.2,
        pitch: 0.4,
        angle: 20,
        gap: 0.05,
        above: -0.3,
      },
    ]);
    const contours = shadingContours(scene, orientation);
    expect(contours.length).toBeGreaterThan(0);
    for (const line of contours) {
      const target = contourThreshold(line.level);
      for (const p of line.points) {
        const s = facadeVector(p.altitude, p.azimuth, orientation);
        // Junto ao plano da fachada, a volta por altura e azimute perde precisão em s_y.
        if (s.y < 1e-3) continue;
        const f = shadedFraction(scene, s);
        expect(Math.abs(f - target), `nível ${line.level}`).toBeLessThan(1e-6);
      }
    }
  });

  it('sem proteção não há curvas', () => {
    expect(shadingContours(buildScene({ width: 1, height: 1 }, []), 0)).toEqual([]);
  });
});
