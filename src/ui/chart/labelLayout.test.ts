import { describe, expect, it } from 'vitest';
import {
  aroundPoint,
  chooseCandidate,
  formatCandidates,
  overlapArea,
  parseCandidates,
  type Box,
} from './labelLayout';

const box = (x0: number, y0: number, x1: number, y1: number): Box => ({ x0, y0, x1, y1 });

describe('disposição dos rótulos da carta', () => {
  it('área da interseção, com e sem folga', () => {
    expect(overlapArea(box(0, 0, 2, 2), box(1, 1, 3, 3))).toBe(1);
    expect(overlapArea(box(0, 0, 2, 2), box(2, 0, 3, 2))).toBe(0);
    // Encostadas por 1 nos dois eixos: com folga de 0,5 de cada lado, não se cobrem.
    expect(overlapArea(box(0, 0, 2, 2), box(1, 1, 3, 3), 0.5)).toBe(0);
  });

  it('escolhe a primeira candidata livre', () => {
    const obstacles = [box(0, 0, 10, 10)];
    const candidates = [box(5, 5, 8, 8), box(20, 0, 25, 5), box(30, 0, 35, 5)];
    expect(chooseCandidate(obstacles, candidates)).toBe(1);
  });

  it('sem candidata livre, fica com a que cobre menos', () => {
    const obstacles = [box(0, 0, 10, 10)];
    const candidates = [box(0, 0, 5, 5), box(9, 9, 12, 12), box(8, 8, 12, 12)];
    expect(chooseCandidate(obstacles, candidates)).toBe(1);
  });

  it('sem obstáculos, a preferida (primeira)', () => {
    expect(chooseCandidate([], [box(0, 0, 1, 1), box(5, 5, 6, 6)])).toBe(0);
  });

  it('candidatas vão e voltam pelo atributo', () => {
    const c = aroundPoint(0.1, -0.2, 0.03, 0.05);
    expect(c).toHaveLength(8);
    expect(c[0]).toEqual({ x: 0.13, y: -0.2, anchor: 'start' });
    expect(c[1]!.anchor).toBe('end');
    const back = parseCandidates(formatCandidates(c));
    back.forEach((b, k) => {
      expect(b.x).toBeCloseTo(c[k]!.x, 4);
      expect(b.y).toBeCloseTo(c[k]!.y, 4);
      expect(b.anchor).toBe(c[k]!.anchor);
    });
    expect(parseCandidates('0.5,0.25')).toEqual([{ x: 0.5, y: 0.25 }]);
    expect(parseCandidates('a,b;1,2')).toEqual([{ x: 1, y: 2 }]);
  });
});
