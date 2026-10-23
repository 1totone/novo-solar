import { describe, expect, it } from 'vitest';
import { project, unproject } from './stereographic';

describe('projeção estereográfica (docs/spec/03, seção 3.1)', () => {
  it('zênite no centro, horizonte no raio unitário, Norte para cima e Leste à direita', () => {
    expect(project(0, 123)).toEqual({ x: 0, y: 0 });
    const n = project(90, 0);
    expect(n.x).toBeCloseTo(0, 15);
    expect(n.y).toBeCloseTo(1, 15);
    const e = project(90, 90);
    expect(e.x).toBeCloseTo(1, 15);
    expect(e.y).toBeCloseTo(0, 15);
    const w = project(90, 270);
    expect(w.x).toBeCloseTo(-1, 15);
  });

  it('r = tan(z/2)', () => {
    for (const z of [5, 30, 45, 60, 89.9]) {
      const p = project(z, 37);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(Math.tan((z * Math.PI) / 360), 14);
    }
  });

  it('a inversa recupera zênite e azimute', () => {
    for (let k = 0; k < 200; k++) {
      const z = (k * 7.3) % 90;
      const a = (k * 37.1) % 360;
      const back = unproject(project(z, a).x, project(z, a).y);
      expect(back.zenith).toBeCloseTo(z, 10);
      if (z > 1e-6) expect(Math.abs(((back.azimuth - a + 540) % 360) - 180)).toBeLessThan(1e-9);
    }
  });

  it('escala do 6.2: 1° vale cerca de 0,52 mm no zênite e 1,04 mm no horizonte, para R = 60 mm', () => {
    const r = (z: number) => 60 * Math.hypot(project(z, 0).x, project(z, 0).y);
    expect(r(1) - r(0)).toBeCloseTo(0.5236, 3);
    expect(r(90) - r(89)).toBeCloseTo(1.0381, 2);
  });
});
