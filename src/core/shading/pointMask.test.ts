import { describe, expect, it } from 'vitest';
import { project } from '../chart/stereographic';
import { regionContains } from '../mask/mask';
import { buildScene } from './geometry';
import { pointMask } from './pointMask';

const RAD = Math.PI / 180;

function directions(n: number, seed = 1): [number, number][] {
  let x = seed;
  const next = () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
  return Array.from({ length: n }, () => [0.2 + 89.6 * next(), -179.8 + 359.6 * next()]);
}

describe('máscara de um ponto (spec 07, seção 7.4)', () => {
  it('brise infinito rente à fachada: do peitoril, é a curva α medida do peitoril', () => {
    const H = 1.2;
    const e = 0.1;
    const D = 0.8;
    const orientation = 40;
    const scene = buildScene({ width: 1.5, height: H }, [
      { kind: 'overhang', depth: D, above: e, extendLeft: Infinity, extendRight: Infinity },
    ]);
    const region = pointMask(scene, { x: 0.75, z: 0 }, orientation);
    const alpha = Math.atan((H + e) / D);
    for (const [h, psi] of directions(3000)) {
      const p = project(90 - h, orientation + psi);
      const inFront = Math.abs(psi) < 90;
      const profile = Math.atan2(Math.tan(h * RAD), Math.cos(psi * RAD));
      // Longe da borda (10⁻⁹ rad), a classificação tem de ser exata.
      if (inFront && Math.abs(profile - alpha) < 1e-9) continue;
      expect(regionContains(region, p.x, p.y), `h = ${h}, ψ = ${psi}`).toBe(
        inFront && profile >= alpha,
      );
    }
  });

  it('aleta infinita à direita: do centro, é a reta β com tan β = (W/2 + s) / D', () => {
    const W = 1.2;
    const s = 0.1;
    const D = 0.5;
    const scene = buildScene({ width: W, height: 1.4 }, [
      { kind: 'fin', side: 'right', depth: D, offset: s, extendAbove: Infinity, extendBelow: Infinity },
    ]);
    const region = pointMask(scene, { x: W / 2, z: 0.7 }, 0);
    const beta = Math.atan((W / 2 + s) / D) / RAD;
    for (const [h, psi] of directions(3000, 9)) {
      if (Math.abs(Math.abs(psi) - beta) < 1e-7) continue;
      const p = project(90 - h, psi);
      expect(regionContains(region, p.x, p.y), `h = ${h}, ψ = ${psi}`).toBe(psi >= beta && psi < 90);
    }
  });

  it('sem proteção, a máscara é vazia; placa vista de perfil não entra', () => {
    const empty = buildScene({ width: 1, height: 1 }, []);
    // Aleta rente à lateral direita (s = 0): o plano dela contém os pontos da lateral x = W.
    const edgeOn = buildScene({ width: 1, height: 1 }, [{ kind: 'fin', side: 'right', depth: 0.5 }]);
    for (const [h, psi] of directions(300, 4)) {
      const p = project(90 - h, psi);
      expect(regionContains(pointMask(empty, { x: 0.5, z: 0.5 }, 0), p.x, p.y)).toBe(false);
      expect(regionContains(pointMask(edgeOn, { x: 1, z: 0.5 }, 0), p.x, p.y)).toBe(false);
    }
  });
});
