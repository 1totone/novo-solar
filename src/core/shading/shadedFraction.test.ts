import { describe, expect, it } from 'vitest';
import { buildScene } from './geometry';
import {
  shadowPolygons,
  facadeVector,
  MIN_SUN_COSINE,
  shadedFraction,
  sunlitFraction,
  sunOnWindow,
} from './shadedFraction';

const RAD = Math.PI / 180;

/** Gerador determinístico de direções diante da fachada (altura h, ângulo azimutal relativo ψ). */
function directions(n: number, seed = 1): [number, number][] {
  let x = seed;
  const next = () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
  return Array.from({ length: n }, () => [0.2 + 89.6 * next(), -89.8 + 179.6 * next()]);
}

/** Brise horizontal infinito (spec 07, seção 7.5): faixa sombreada entre z_lo e z_hi. */
function overhangFraction(h: number, psi: number, H: number, e: number, g: number, D: number) {
  const t = Math.tan(h * RAD) / Math.cos(psi * RAD);
  const zHi = H + e - g * t;
  const zLo = H + e - (g + D) * t;
  return Math.max(0, Math.min(H, zHi) - Math.max(0, zLo)) / H;
}

/** Aleta infinita à direita, a uma distância s da lateral: faixa sombreada entre x_lo e x_hi. */
function finFraction(psi: number, W: number, s: number, g: number, D: number) {
  if (psi <= 0) return 0;
  const t = Math.tan(psi * RAD);
  const xHi = W + s - g * t;
  const xLo = W + s - (g + D) * t;
  return Math.max(0, Math.min(W, xHi) - Math.max(0, xLo)) / W;
}

describe('direção do sol no referencial da fachada', () => {
  it('ψ > 0 (sol à direita de quem olha para fora) dá s_x > 0', () => {
    // Fachada norte: a direita de quem olha para fora é o Leste.
    const s = facadeVector(30, 60, 0);
    expect(s.x).toBeCloseTo(Math.cos(30 * RAD) * Math.sin(60 * RAD), 12);
    expect(s.y).toBeCloseTo(Math.cos(30 * RAD) * Math.cos(60 * RAD), 12);
    expect(s.z).toBeCloseTo(0.5, 12);
    const w = facadeVector(30, 200, 270);
    expect(w.x).toBeLessThan(0);
    expect(w.y).toBeGreaterThan(0);
  });

  it('sol na janela: altura e incidência de pelo menos 10⁻⁵', () => {
    expect(MIN_SUN_COSINE).toBe(1e-5);
    expect(sunOnWindow({ x: 0, y: 1, z: 1e-5 })).toBe(true);
    expect(sunOnWindow({ x: 0, y: 1, z: 0.9e-5 })).toBe(false);
    expect(sunOnWindow({ x: 1, y: 0.9e-5, z: 0.5 })).toBe(false);
    expect(sunOnWindow({ x: 1, y: -0.5, z: 0.5 })).toBe(false);
  });
});

describe('percentual sombreado: casos analíticos (spec 07, seção 7.5)', () => {
  it.each([
    ['sem afastamento', 1.2, 0.1, 0, 0.8],
    ['com afastamento', 1.5, 0.2, 0.15, 0.6],
    ['rente à verga', 1, 0, 0, 0.5],
  ])('brise horizontal infinito, %s', (_name, H, e, g, D) => {
    const scene = buildScene({ width: 1.3, height: H }, [
      { kind: 'overhang', depth: D, above: e, gap: g, extendLeft: Infinity, extendRight: Infinity },
    ]);
    for (const [h, psi] of directions(2000)) {
      const f = shadedFraction(scene, facadeVector(h, psi, 0));
      expect(f, `h = ${h}, ψ = ${psi}`).toBeCloseTo(overhangFraction(h, psi, H, e, g, D), 12);
    }
  });

  it.each([
    ['rente à janela', 1, 0, 0, 0.6],
    ['afastada', 1.4, 0.15, 0.1, 0.9],
  ])('aleta infinita à direita, %s', (_name, W, s, g, D) => {
    const scene = buildScene({ width: W, height: 1.2 }, [
      {
        kind: 'fin',
        side: 'right',
        depth: D,
        offset: s,
        gap: g,
        extendAbove: Infinity,
        extendBelow: Infinity,
      },
    ]);
    for (const [h, psi] of directions(2000, 7)) {
      const f = shadedFraction(scene, facadeVector(h, psi, 0));
      expect(f, `h = ${h}, ψ = ${psi}`).toBeCloseTo(finFraction(psi, W, s, g, D), 12);
    }
  });

  it('aleta infinita à esquerda é o espelho da direita', () => {
    const right = buildScene({ width: 1.1, height: 1 }, [
      {
        kind: 'fin',
        side: 'right',
        depth: 0.7,
        offset: 0.05,
        extendAbove: Infinity,
        extendBelow: Infinity,
      },
    ]);
    const left = buildScene({ width: 1.1, height: 1 }, [
      {
        kind: 'fin',
        side: 'left',
        depth: 0.7,
        offset: 0.05,
        extendAbove: Infinity,
        extendBelow: Infinity,
      },
    ]);
    for (const [h, psi] of directions(500, 3)) {
      expect(shadedFraction(left, facadeVector(h, -psi, 0))).toBeCloseTo(
        shadedFraction(right, facadeVector(h, psi, 0)),
        12,
      );
    }
  });
});

describe('percentual sombreado: união das sombras', () => {
  it('sem proteção, 0; com uma placa que cobre tudo, 1', () => {
    const empty = buildScene({ width: 1, height: 1 }, []);
    const screen = buildScene({ width: 1, height: 1 }, [
      {
        kind: 'plate',
        vertices: [
          [-1e3, 0.5, -1e3],
          [1e3, 0.5, -1e3],
          [1e3, 0.5, 1e3],
          [-1e3, 0.5, 1e3],
        ],
      },
    ]);
    for (const [h, psi] of directions(200, 5)) {
      const s = facadeVector(h, psi, 0);
      expect(shadedFraction(empty, s)).toBe(0);
      if (Math.abs(s.x / s.y) < 1000 && Math.abs(s.z / s.y) < 1000) {
        expect(shadedFraction(screen, s)).toBeCloseTo(1, 12);
      }
    }
  });

  it('placas repetidas não contam duas vezes; a ordem das placas não importa', () => {
    const devices = [
      { kind: 'overhang', depth: 0.7, above: 0.1, gap: 0.05, extendLeft: 0.2, extendRight: 0.6 },
      { kind: 'fin', side: 'right', depth: 0.5, offset: 0.1, extendAbove: 0.3 },
      { kind: 'fin', side: 'left', depth: 0.4, gap: 0.1 },
    ] as const;
    const once = buildScene({ width: 1.4, height: 1.2 }, [...devices]);
    const twice = buildScene({ width: 1.4, height: 1.2 }, [...devices, ...devices]);
    const reversed = buildScene({ width: 1.4, height: 1.2 }, [...devices].reverse());
    for (const [h, psi] of directions(500, 11)) {
      const s = facadeVector(h, psi, 0);
      const f = shadedFraction(once, s);
      expect(shadedFraction(twice, s)).toBeCloseTo(f, 12);
      expect(shadedFraction(reversed, s)).toBeCloseTo(f, 12);
    }
  });

  it('sombras que não se sobrepõem somam as áreas', () => {
    // Duas placas paralelas ao vidro, a 0,3 m, que cobrem as metades esquerda e direita.
    const half = (x0: number, x1: number) =>
      ({
        kind: 'plate',
        vertices: [
          [x0, 0.3, 0.2],
          [x1, 0.3, 0.2],
          [x1, 0.3, 0.6],
          [x0, 0.3, 0.6],
        ],
      }) as const;
    const scene = buildScene({ width: 1, height: 1 }, [half(0, 0.5), half(0.5, 1)]);
    // Com o sol na normal, a sombra é a própria placa: 1 × 0,4.
    expect(shadedFraction(scene, facadeVector(0.0001, 0, 0))).toBeCloseTo(0.4, 6);
    expect(shadedFraction(scene, { x: 0, y: 1, z: 0 })).toBeCloseTo(0.4, 12);
  });

  it('sol atrás da fachada: percentual indefinido e fração ensolarada 0', () => {
    const scene = buildScene({ width: 1, height: 1 }, [{ kind: 'overhang', depth: 0.5, above: 0 }]);
    expect(shadedFraction(scene, facadeVector(30, 120, 0))).toBeNaN();
    expect(sunlitFraction(scene, facadeVector(30, 120, 0))).toBe(0);
    expect(sunlitFraction(scene, facadeVector(-5, 10, 0))).toBe(0);
    const s = facadeVector(30, 10, 0);
    expect(sunlitFraction(scene, s)).toBeCloseTo(1 - shadedFraction(scene, s), 15);
  });
});

describe('polígonos da sombra na janela (vista 3D, F3.7)', () => {
  /** Ponto dentro de um polígono convexo ou não (regra par-ímpar). */
  const inside = (poly: readonly [number, number][], x: number, z: number) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i]!;
      const [xj, zj] = poly[j]!;
      if (zi > z !== zj > z && x < xj + ((z - zj) * (xi - xj)) / (zi - zj)) c = !c;
    }
    return c;
  };
  const scene = buildScene({ width: 1.5, height: 1.2, setback: 0.1 }, [
    { kind: 'overhang', depth: 0.6, above: 0.1, extendLeft: 0.3, extendRight: 0.2 },
    { kind: 'fin', side: 'right', depth: 0.4, offset: 0.1 },
    { kind: 'horizontalLouvers', count: 2, chord: 0.2, pitch: 0.4, angle: 25, above: -0.4 },
  ]);
  for (const [h, psi] of [
    [40, 20],
    [60, -35],
    [15, 70],
    [75, 5],
  ] as const) {
    it(`a área coberta pelos polígonos é o percentual sombreado (h ${h}°, ψ ${psi}°)`, () => {
      const s = facadeVector(h, psi, 0);
      const polys = shadowPolygons(scene, s);
      for (const p of polys) {
        for (const [x, z] of p) {
          expect(x).toBeGreaterThanOrEqual(-1e-12);
          expect(x).toBeLessThanOrEqual(1.5 + 1e-12);
          expect(z).toBeGreaterThanOrEqual(-1e-12);
          expect(z).toBeLessThanOrEqual(1.2 + 1e-12);
        }
      }
      // Grade de 300 × 240 pontos no meio de células: a fração coberta, com erro da ordem do passo.
      let covered = 0;
      const nx = 300;
      const nz = 240;
      for (let i = 0; i < nx; i++) {
        for (let k = 0; k < nz; k++) {
          const x = ((i + 0.5) * 1.5) / nx;
          const z = ((k + 0.5) * 1.2) / nz;
          if (polys.some((p) => inside(p, x, z))) covered++;
        }
      }
      expect(covered / (nx * nz)).toBeCloseTo(shadedFraction(scene, s), 2);
    });
  }

  it('sol atrás da fachada: nenhum polígono', () => {
    expect(shadowPolygons(scene, facadeVector(30, 120, 0))).toEqual([]);
  });
});
