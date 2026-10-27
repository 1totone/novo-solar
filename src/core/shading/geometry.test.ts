import { describe, expect, it } from 'vitest';
import { buildScene, INFINITE_EXTENT, type Device, type Plate } from './geometry';

/** Compara placas vértice a vértice, a 10⁻¹² m. */
function expectPlates(actual: readonly Plate[], expected: number[][][]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((plate, i) => {
    expect(plate).toHaveLength(expected[i]!.length);
    plate.forEach((v, j) => {
      v.forEach((c, k) =>
        expect(c, `placa ${i}, vértice ${j}`).toBeCloseTo(expected[i]![j]![k]!, 12),
      );
    });
  });
}

const sorted = (values: number[]) => [...values].sort((a, b) => a - b);

describe('cena: janela, recuo e dispositivos (spec 07, seção 7.1)', () => {
  it('brise horizontal: placa em z = H + e, da fachada até a profundidade', () => {
    const scene = buildScene({ width: 1.5, height: 1.2 }, [
      { kind: 'overhang', depth: 0.8, above: 0.1, gap: 0.2, extendLeft: 0.3, extendRight: 0.4 },
    ]);
    expect(scene.width).toBe(1.5);
    expect(scene.height).toBe(1.2);
    expectPlates(scene.plates, [
      [
        [-0.3, 0.2, 1.3],
        [1.9, 0.2, 1.3],
        [1.9, 1, 1.3],
        [-0.3, 1, 1.3],
      ],
    ]);
  });

  it('prolongamento infinito vira 10⁶ m', () => {
    const scene = buildScene({ width: 1, height: 1 }, [
      { kind: 'overhang', depth: 0.5, above: 0, extendLeft: Infinity, extendRight: Infinity },
      { kind: 'fin', side: 'right', depth: 0.5, extendAbove: Infinity, extendBelow: Infinity },
    ]);
    const xs = scene.plates[0]!.map((v) => v[0]);
    expect(Math.min(...xs)).toBe(-INFINITE_EXTENT);
    expect(Math.max(...xs)).toBe(1 + INFINITE_EXTENT);
    const zs = scene.plates[1]!.map((v) => v[2]);
    expect(Math.min(...zs)).toBe(-INFINITE_EXTENT);
    expect(Math.max(...zs)).toBe(1 + INFINITE_EXTENT);
  });

  it('aletas: x = W + s à direita e x = −s à esquerda, prolongamentos acima e abaixo', () => {
    const scene = buildScene({ width: 1.2, height: 1.4 }, [
      { kind: 'fin', side: 'right', depth: 0.6, offset: 0.1, gap: 0.05, extendAbove: 0.3 },
      { kind: 'fin', side: 'left', depth: 0.6, offset: 0.2, extendBelow: 0.5 },
    ]);
    expectPlates(scene.plates, [
      [
        [1.3, 0.05, 0],
        [1.3, 0.65, 0],
        [1.3, 0.65, 1.7],
        [1.3, 0.05, 1.7],
      ],
      [
        [-0.2, 0, -0.5],
        [-0.2, 0.6, -0.5],
        [-0.2, 0.6, 1.4],
        [-0.2, 0, 1.4],
      ],
    ]);
  });

  it('recuo: verga, peitoril e ombreiras de y = 0 a y = d; proteções medidas da fachada (y = d)', () => {
    const scene = buildScene({ width: 1, height: 1.4, setback: 0.25 }, [
      { kind: 'overhang', depth: 0.5, above: 0, gap: 0.1 },
    ]);
    expect(scene.plates).toHaveLength(5);
    for (const plate of scene.plates.slice(0, 4)) {
      expect(Math.min(...plate.map((v) => v[1]))).toBe(0);
      expect(Math.max(...plate.map((v) => v[1]))).toBeCloseTo(0.25, 12);
    }
    const y = sorted(scene.plates[4]!.map((v) => v[1]));
    [0.35, 0.35, 0.85, 0.85].forEach((v, i) => expect(y[i]).toBeCloseTo(v, 12));
  });

  it('lâminas horizontais: giram em torno da borda interna; θ > 0 abaixa a borda externa', () => {
    const scene = buildScene({ width: 1, height: 1.5 }, [
      {
        kind: 'horizontalLouvers',
        count: 3,
        chord: 0.2,
        pitch: 0.4,
        angle: 30,
        gap: 0.1,
        above: 0.05,
      },
    ]);
    expect(scene.plates).toHaveLength(3);
    scene.plates.forEach((plate, k) => {
      const inner = plate.filter((v) => Math.abs(v[1] - 0.1) < 1e-12);
      const outer = plate.filter((v) => Math.abs(v[1] - 0.1) >= 1e-12);
      expect(inner).toHaveLength(2);
      const zIn = 1.55 - k * 0.4;
      for (const v of inner) expect(v[2]).toBeCloseTo(zIn, 12);
      for (const v of outer) {
        expect(v[1]).toBeCloseTo(0.1 + 0.2 * Math.cos(Math.PI / 6), 12);
        expect(v[2]).toBeCloseTo(zIn - 0.2 * Math.sin(Math.PI / 6), 12);
      }
    });
  });

  it('lâminas com θ = 90° ficam paralelas à fachada', () => {
    const scene = buildScene({ width: 1, height: 1 }, [
      {
        kind: 'horizontalLouvers',
        count: 1,
        chord: 0.3,
        pitch: 0.3,
        angle: 90,
        gap: 0.2,
        above: 0,
      },
      {
        kind: 'verticalLouvers',
        count: 1,
        chord: 0.3,
        pitch: 0.3,
        angle: -90,
        gap: 0.2,
        start: 0.5,
      },
    ]);
    for (const plate of scene.plates) {
      for (const v of plate) expect(v[1]).toBeCloseTo(0.2, 12);
    }
  });

  it('lâminas verticais: borda interna em x_0 + k·p; θ > 0 leva a borda externa para a direita', () => {
    const scene = buildScene({ width: 1.5, height: 1.2 }, [
      {
        kind: 'verticalLouvers',
        count: 2,
        chord: 0.3,
        pitch: 0.4,
        angle: 25,
        gap: 0.1,
        start: 0.2,
      },
    ]);
    scene.plates.forEach((plate, k) => {
      const inner = plate.filter((v) => Math.abs(v[1] - 0.1) < 1e-12);
      expect(inner).toHaveLength(2);
      for (const v of inner) expect(v[0]).toBeCloseTo(0.2 + k * 0.4, 12);
      const outer = plate.filter((v) => Math.abs(v[1] - 0.1) >= 1e-12);
      for (const v of outer) {
        expect(v[0]).toBeCloseTo(0.2 + k * 0.4 + 0.3 * Math.sin((25 * Math.PI) / 180), 12);
        expect(v[1]).toBeCloseTo(0.1 + 0.3 * Math.cos((25 * Math.PI) / 180), 12);
      }
    });
  });

  it('entradas inválidas são recusadas', () => {
    const bad: [string, () => unknown][] = [
      ['largura', () => buildScene({ width: 0, height: 1 }, [])],
      ['altura', () => buildScene({ width: 1, height: Number.NaN }, [])],
      ['recuo', () => buildScene({ width: 1, height: 1, setback: -0.1 }, [])],
      [
        'profundidade',
        () => buildScene({ width: 1, height: 1 }, [{ kind: 'overhang', depth: 0, above: 0 }]),
      ],
      [
        'afastamento',
        () =>
          buildScene({ width: 1, height: 1 }, [{ kind: 'overhang', depth: 1, above: 0, gap: -1 }]),
      ],
      [
        'prolongamento',
        () =>
          buildScene({ width: 1, height: 1 }, [
            { kind: 'fin', side: 'left', depth: 1, extendAbove: -0.1 },
          ]),
      ],
      [
        'número de lâminas',
        () =>
          buildScene({ width: 1, height: 1 }, [
            { kind: 'horizontalLouvers', count: 1.5, chord: 0.2, pitch: 0.2, above: 0 },
          ]),
      ],
      [
        'inclinação',
        () =>
          buildScene({ width: 1, height: 1 }, [
            { kind: 'verticalLouvers', count: 2, chord: 0.2, pitch: 0.2, angle: 91, start: 0 },
          ]),
      ],
      [
        'placa atrás do vidro',
        () =>
          buildScene({ width: 1, height: 1 }, [
            {
              kind: 'plate',
              vertices: [
                [0, -0.1, 1],
                [1, 0.2, 1],
                [1, 0.2, 2],
              ],
            },
          ]),
      ],
      [
        'placa não plana',
        () =>
          buildScene({ width: 1, height: 1 }, [
            {
              kind: 'plate',
              vertices: [
                [0, 0.1, 1],
                [1, 0.1, 1],
                [1, 0.5, 1.5],
                [0, 0.2, 1.5],
              ],
            },
          ]),
      ],
      [
        'placa côncava',
        () =>
          buildScene({ width: 1, height: 1 }, [
            {
              kind: 'plate',
              vertices: [
                [0, 0.5, 0],
                [1, 0.5, 0],
                [0.5, 0.5, 0.2],
                [1, 0.5, 1],
                [0, 0.5, 1],
              ],
            },
          ]),
      ],
      [
        'placa em gravata-borboleta',
        () =>
          buildScene({ width: 1, height: 1 }, [
            {
              kind: 'plate',
              vertices: [
                [0, 0.5, 0],
                [1, 0.5, 1],
                [1, 0.5, 0],
                [0, 0.5, 1],
              ],
            },
          ]),
      ],
      [
        'placa sem área',
        () =>
          buildScene({ width: 1, height: 1 }, [
            {
              kind: 'plate',
              vertices: [
                [0, 0.5, 0],
                [0.5, 0.5, 0.5],
                [1, 0.5, 1],
              ],
            },
          ]),
      ],
      [
        'placa com menos de 3 vértices',
        () =>
          buildScene({ width: 1, height: 1 }, [
            {
              kind: 'plate',
              vertices: [
                [0, 0.1, 1],
                [1, 0.2, 1],
              ],
            },
          ]),
      ],
    ];
    for (const [what, f] of bad) expect(f, what).toThrow(RangeError);
  });

  it('placa livre plana e convexa é aceita nos dois sentidos de percurso', () => {
    const square: [number, number, number][] = [
      [0, 0.2, 1],
      [1, 0.2, 1],
      [1, 0.6, 1.2],
      [0, 0.6, 1.2],
    ];
    for (const vertices of [square, [...square].reverse()]) {
      expect(
        buildScene({ width: 1, height: 1 }, [{ kind: 'plate', vertices }]).plates,
      ).toHaveLength(1);
    }
  });

  it('a ordem das placas segue o recuo e depois os dispositivos, na ordem dada', () => {
    const devices: Device[] = [
      { kind: 'fin', side: 'left', depth: 0.3 },
      { kind: 'overhang', depth: 0.4, above: 0 },
    ];
    const scene = buildScene({ width: 1, height: 1, setback: 0.1 }, devices);
    expect(scene.plates).toHaveLength(6);
    expect(scene.plates[4]!.every((v) => v[0] === 0)).toBe(true);
    expect(scene.plates[5]!.every((v) => Math.abs(v[2] - 1) < 1e-12)).toBe(true);
  });
});
