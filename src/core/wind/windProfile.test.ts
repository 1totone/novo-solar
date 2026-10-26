import { describe, expect, it } from 'vitest';
import { HEIGHT_RANGE, STATION, TERRAIN, windSpeedFactor } from './windProfile';

// Casos à mão da spec 06, seção 6.7. A conferência contra o EnergyPlus está em
// tests/referencia/ventoAvancado.test.ts.
describe('fator da altura e do terreno (spec 06, seção 6.7)', () => {
  it('a própria estação (campo aberto a 10 m) dá exatamente 1', () => {
    expect(STATION).toEqual({ height: 10, terrain: 'country' });
    expect(TERRAIN.country).toEqual({ exponent: 0.14, boundaryLayer: 270 });
    expect(windSpeedFactor(10, 'country')).toBe(1);
  });

  it('valores da tabela da spec (3 casas)', () => {
    const table: [number, number, number, number, number][] = [
      [1.5, 0.767, 0.472, 0.24, 0.968],
      [3, 0.845, 0.55, 0.301, 1.037],
      [10, 1, 0.717, 0.448, 1.17],
      [40, 1.214, 0.972, 0.709, 1.344],
    ];
    for (const [z, ...k] of table) {
      (['country', 'suburbs', 'city', 'ocean'] as const).forEach((t, i) =>
        expect(windSpeedFactor(z, t)).toBeCloseTo(k[i]!, 3),
      );
    }
  });

  it('cidade a 3 m: (270 / 10)^0,14 · (3 / 460)^0,33', () => {
    expect(windSpeedFactor(3, 'city')).toBeCloseTo(27 ** 0.14 * (3 / 460) ** 0.33, 15);
  });

  it('cresce com a altura; a 10 m, água > campo aberto > subúrbio > cidade', () => {
    for (const t of ['country', 'suburbs', 'city', 'ocean'] as const) {
      expect(windSpeedFactor(2, t)).toBeLessThan(windSpeedFactor(20, t));
    }
    const at10 = (['ocean', 'country', 'suburbs', 'city'] as const).map((t) =>
      windSpeedFactor(10, t),
    );
    expect([...at10].sort((a, b) => b - a)).toEqual(at10);
  });

  it('alturas fora de 1 a 200 m são recusadas', () => {
    expect(HEIGHT_RANGE).toEqual({ min: 1, max: 200 });
    expect(() => windSpeedFactor(0.5, 'city')).toThrow(RangeError);
    expect(() => windSpeedFactor(201, 'country')).toThrow(RangeError);
    expect(() => windSpeedFactor(NaN, 'country')).toThrow(RangeError);
    expect(windSpeedFactor(1, 'city')).toBeGreaterThan(0);
    expect(windSpeedFactor(200, 'ocean')).toBeGreaterThan(1);
  });
});
