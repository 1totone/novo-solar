import { describe, expect, it } from 'vitest';
import type { Device } from '../../core/shading/geometry';
import { elevationDrawing, sectionDrawing, type Drawing } from './drawings';

const W = 2;
const H = 1;
const brise: Device = {
  kind: 'overhang',
  depth: 1.28,
  above: 0,
  extendRight: 1.2,
  extendLeft: 1.7,
};

const pieces = (d: Drawing) => d.shapes.filter((s) => s.role === 'piece');
const xs = (d: Drawing) => pieces(d).flatMap((s) => s.points.map((p) => p[0]));

describe('vista de fora', () => {
  it('janela da Figura 22 do tutorial: brise como linha na verga, direita de quem está dentro à esquerda', () => {
    const v = elevationDrawing({ width: W, height: H, setback: 0.15 }, [brise]);
    const [b] = pieces(v);
    expect(b!.edge).toBe(true);
    expect(b!.points.every((p) => p[1] === H)).toBe(true);
    // x de −1,7 a 3,2 vira X = W − x: de 3,7 (esquerda de quem está dentro) a −1,2 (direita).
    expect(Math.min(...xs(v))).toBeCloseTo(-1.2, 12);
    expect(Math.max(...xs(v))).toBeCloseTo(W + 1.7, 12);
    const right = v.angles.find((a) => a.kind === 'gammaRight')!;
    const left = v.angles.find((a) => a.kind === 'gammaLeft')!;
    expect(right.degrees).toBeCloseTo(Math.atan(1.2) * (180 / Math.PI), 10); // 50,2°
    expect(left.degrees).toBeCloseTo(Math.atan(1.7) * (180 / Math.PI), 10); // 59,5°
    expect(right.to[0]).toBeLessThan(0);
    // As placas do recuo (verga, peitoril, ombreiras) não entram na vista.
    expect(pieces(v)).toHaveLength(1);
  });

  it('aleta à direita aparece à esquerda da janela; lâminas inclinadas têm área', () => {
    const v = elevationDrawing({ width: W, height: H }, [
      { kind: 'fin', side: 'right', depth: 0.4, offset: 0.1, extendAbove: 0.2 },
      { kind: 'horizontalLouvers', count: 2, chord: 0.2, pitch: 0.5, angle: 30, above: 0 },
    ]);
    const [fin, l1, l2] = pieces(v);
    expect(fin!.edge).toBe(true);
    expect(fin!.points.every((p) => Math.abs(p[0] + 0.1) < 1e-12)).toBe(true);
    expect(Math.max(...fin!.points.map((p) => p[1]))).toBeCloseTo(H + 0.2, 12);
    expect(l1!.edge).toBe(false);
    expect(l2!.edge).toBe(false);
  });

  it('prolongamento infinito: cortado na borda do desenho e marcado', () => {
    const v = elevationDrawing({ width: W, height: H }, [
      { kind: 'overhang', depth: 0.5, above: 0, extendLeft: Infinity },
    ]);
    expect(v.infinite.length).toBeGreaterThan(0);
    expect(Math.max(...xs(v))).toBeCloseTo(v.bounds.maxX, 12);
    expect(v.bounds.maxX).toBeLessThan(10);
  });
});

describe('corte pelo meio da janela', () => {
  it('brise cortado na verga; α do peitoril, no vidro, à aresta externa (Figura 22: 55°)', () => {
    const c = sectionDrawing({ width: W, height: H, setback: 0.15 }, [brise]);
    const [b] = pieces(c);
    expect(b!.points.map((p) => p[1])).toEqual([H, H]);
    expect(Math.min(...b!.points.map((p) => p[0]))).toBeCloseTo(0.15, 12);
    expect(Math.max(...b!.points.map((p) => p[0]))).toBeCloseTo(1.43, 12);
    const alpha = c.angles.find((a) => a.kind === 'alpha')!;
    expect(alpha.degrees).toBeCloseTo(Math.atan(1.43) * (180 / Math.PI), 10); // 55,03°
    expect(c.dimensions.find((d) => d.kind === 'depth')!.value).toBe(1.28);
    expect(c.dimensions.find((d) => d.kind === 'setback')!.value).toBe(0.15);
  });

  it('brise afastado: o corte começa no afastamento; aletas ficam além do corte', () => {
    const c = sectionDrawing({ width: W, height: H }, [
      { kind: 'overhang', depth: 1, above: 0.3, gap: 0.28 },
      { kind: 'fin', side: 'left', depth: 0.5 },
    ]);
    const [b] = pieces(c);
    expect(Math.min(...b!.points.map((p) => p[0]))).toBeCloseTo(0.28, 12);
    expect(b!.points.map((p) => p[1])).toEqual([H + 0.3, H + 0.3]);
    const beyond = c.shapes.filter((s) => s.role === 'beyond');
    expect(beyond).toHaveLength(1);
    expect(Math.max(...beyond[0]!.points.map((p) => p[0]))).toBeCloseTo(0.5, 12);
    expect(c.dimensions.find((d) => d.kind === 'above')!.value).toBe(0.3);
  });

  it('lâminas horizontais inclinadas: segmentos com a inclinação, α da lâmina mais baixa', () => {
    const c = sectionDrawing({ width: W, height: H }, [
      { kind: 'horizontalLouvers', count: 3, chord: 0.3, pitch: 1 / 3, angle: 20, above: 0 },
    ]);
    const segs = pieces(c);
    expect(segs).toHaveLength(3);
    for (const s of segs) {
      const [a, b] = s.points;
      const slope = Math.abs((b![1] - a![1]) / (b![0] - a![0]));
      expect(slope).toBeCloseTo(Math.tan((20 * Math.PI) / 180), 10);
    }
    const alpha = c.angles.find((a) => a.kind === 'alpha')!;
    const zOut = H - 2 / 3 - 0.3 * Math.sin((20 * Math.PI) / 180);
    expect(alpha.to[1]).toBeCloseTo(zOut, 12);
  });
});
