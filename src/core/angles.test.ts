import { describe, expect, it } from 'vitest';
import { angularDifference, normalizeDegrees, toDegrees, toRadians } from './angles';

describe('conversão entre graus e radianos', () => {
  it('reproduz valores analíticos', () => {
    expect(toRadians(180)).toBe(Math.PI);
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 15);
    expect(toDegrees(Math.PI / 4)).toBeCloseTo(45, 12);
  });

  it('é inversa nos dois sentidos', () => {
    for (const deg of [-720, -90, 0, 0.01, 23.44, 359.99, 1e4]) {
      expect(toDegrees(toRadians(deg))).toBeCloseTo(deg, 9);
    }
  });
});

describe('normalizeDegrees', () => {
  it.each([
    [0, 0],
    [360, 0],
    [-360, 0],
    [450, 90],
    [-90, 270],
    [-0.5, 359.5],
    [720.25, 0.25],
  ])('normaliza %f para %f', (input, expected) => {
    expect(normalizeDegrees(input)).toBeCloseTo(expected, 12);
  });

  it('nunca devolve 360 nem -0', () => {
    expect(normalizeDegrees(-1e-15)).toBeLessThan(360);
    expect(Object.is(normalizeDegrees(-0), -0)).toBe(false);
    expect(Object.is(normalizeDegrees(-360), -0)).toBe(false);
  });
});

describe('angularDifference', () => {
  it.each([
    [10, 20, 10],
    [350, 10, 20],
    [10, 350, -20],
    [0, 180, 180],
    [180, 0, 180],
    [90, 270, 180],
  ])('de %f até %f é %f', (a, b, expected) => {
    expect(angularDifference(a, b)).toBeCloseTo(expected, 12);
  });
});
