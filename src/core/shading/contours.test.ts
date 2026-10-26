import { describe, expect, it } from 'vitest';
import { project, unproject } from '../chart/stereographic';
import {
  CONTOUR_LEVELS,
  contourThreshold,
  isolineRegion,
  isolines,
  shadingChart,
  shadingContours,
  type SkyDirection,
} from './contours';
import { buildScene } from './geometry';
import { facadeVector, shadedFraction } from './shadedFraction';

const RAD = Math.PI / 180;

type P2 = readonly [number, number];

/** Ponto dentro da região pela regra par-ímpar (raio para +x). */
function insideEvenOdd(rings: readonly (readonly P2[])[], x: number, y: number): boolean {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!;
      const [xj, yj] = ring[j]!;
      if (yi > y !== yj > y && x < xj + ((y - yi) * (xi - xj)) / (yj - yi)) inside = !inside;
    }
  }
  return inside;
}

/** Menor distância do ponto aos lados dos anéis. */
function distanceToRings(rings: readonly (readonly P2[])[], x: number, y: number): number {
  let min = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j]!;
      const [bx, by] = ring[i]!;
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
      min = Math.min(min, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
  }
  return min;
}

/** Gerador pseudoaleatório determinístico (LCG de Park e Miller). */
function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Direção do céu no ponto da carta de raio 1 (x para Leste, y para Norte). */
const chartPoint = (d: SkyDirection): P2 => {
  const c = project(90 - d.altitude, d.azimuth);
  return [c.x, c.y];
};

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

  it('brise infinito: os segmentos desenhados na carta ficam a menos de 0,01° da curva α', () => {
    const H = 1.2;
    const e = 0.1;
    const D = 0.8;
    const scene = buildScene({ width: 1.5, height: H }, [
      { kind: 'overhang', depth: D, above: e, extendLeft: Infinity, extendRight: Infinity },
    ]);
    let max = 0;
    for (const line of shadingContours(scene, 0)) {
      // Plano da curva α: polo (0, −sen α, cos α) no referencial da fachada (spec 01, seção 1.4).
      const alpha = Math.atan((e + contourThreshold(line.level) * H) / D);
      for (let i = 1; i < line.points.length; i++) {
        const a = line.points[i - 1]!;
        const b = line.points[i]!;
        const pa = project(90 - a.altitude, a.azimuth);
        const pb = project(90 - b.altitude, b.azimuth);
        const mid = unproject((pa.x + pb.x) / 2, (pa.y + pb.y) / 2);
        const d = facadeVector(90 - mid.zenith, mid.azimuth, 0);
        const distance = Math.abs(Math.asin(-Math.sin(alpha) * d.y + Math.cos(alpha) * d.z)) / RAD;
        max = Math.max(max, distance);
      }
    }
    expect(max).toBeLessThan(0.01);
  });

  it('aleta infinita à direita: a curva do nível p é a reta β com tan β = (s + p·W) / D', () => {
    const W = 1;
    const s = 0.1;
    const D = 0.6;
    const scene = buildScene({ width: W, height: 1.4 }, [
      {
        kind: 'fin',
        side: 'right',
        depth: D,
        offset: s,
        extendAbove: Infinity,
        extendBelow: Infinity,
      },
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

  it('quadrados marchantes: a sela é resolvida pelo centro da célula (campo analítico)', () => {
    // f = (x − 0,5)·(y − 0,5): cada isolinha f = ±0,001 tem dois ramos de hipérbole, um em cada
    // par de quadrantes opostos. Com 11 células, o ponto de sela fica no centro de uma célula
    // cujos cantos alternam dentro e fora; ligar os cantos errados juntaria ramos de quadrantes
    // diferentes numa linha só.
    const f = (x: number, y: number) => (x - 0.5) * (y - 0.5);
    for (const threshold of [0.001, -0.001]) {
      const lines = isolines(f, 1, 1, 11, 11, [threshold]);
      expect(lines, `limiar ${threshold}`).toHaveLength(2);
      for (const line of lines) {
        const quadrants = new Set(
          line.points.map(([x, y]) => `${Math.sign(x - 0.5)},${Math.sign(y - 0.5)}`),
        );
        expect(quadrants.size, `limiar ${threshold}`).toBe(1);
        for (const [x, y] of line.points) expect(f(x, y)).toBeCloseTo(threshold, 9);
      }
    }
  });

  it('quadrados marchantes: curva fechada repete o primeiro ponto no fim', () => {
    const f = (x: number, y: number) => 1 - Math.hypot(x - 0.5, y - 0.5);
    const [circle, ...rest] = isolines(f, 1, 1, 20, 20, [0.7]);
    expect(rest).toEqual([]);
    expect(circle!.points[0]).toEqual(circle!.points.at(-1));
    for (const [x, y] of circle!.points) expect(Math.hypot(x - 0.5, y - 0.5)).toBeCloseTo(0.3, 9);
  });

  it('sem proteção não há curvas', () => {
    expect(shadingContours(buildScene({ width: 1, height: 1 }, []), 0)).toEqual([]);
  });
});

describe('região de sombra total (spec 07, seção 7.5)', () => {
  const N = 40;
  // Campos analíticos no quadrado unitário: a região {f ≥ 0} conhecida, com a borda reta entre os
  // pontos de cruzamento (o erro de posição cai com o quadrado do passo).
  const disc = (cx: number, cy: number, r: number) => (x: number, y: number) =>
    r * r - ((x - cx) ** 2 + (y - cy) ** 2);
  const fields: [string, (x: number, y: number) => number][] = [
    ['disco no meio (anel fechado)', disc(0.5, 0.5, 0.3)],
    ['meio disco na borda esquerda', disc(0, 0.5, 0.3)],
    ['quadrado menos um disco (furo)', (x, y) => -disc(0.5, 0.5, 0.3)(x, y)],
    ['dois cantos opostos', (x, y) => Math.max(disc(0, 0, 0.4)(x, y), disc(1, 1, 0.4)(x, y))],
    ['faixa de borda a borda', (_x, y) => 0.1 - Math.abs(y - 0.5)],
    ['coroa (anel com furo)', (x, y) => 0.15 ** 2 - (Math.hypot(x - 0.5, y - 0.5) - 0.25) ** 2],
    ['quadrado inteiro', () => 1],
    [
      'três cantos e um furo',
      (x, y) => Math.max(-disc(0.5, 0.5, 0.2)(x, y), 0) - (x < 0.3 && y > 0.7 ? 1 : 0) - 1e-3,
    ],
  ];
  for (const [name, f] of fields) {
    it(`a regra par-ímpar sobre os anéis dá {f ≥ 0}: ${name}`, () => {
      const rings = isolineRegion(f, 1, 1, N, N, 0);
      const next = random(7);
      let checked = 0;
      for (let k = 0; k < 4000; k++) {
        const x = next();
        const y = next();
        // A borda reta entre cruzamentos e o salto em degrau do último campo ficam fora do teste.
        if (rings.length > 0 && distanceToRings(rings, x, y) < 2 / N) continue;
        expect(insideEvenOdd(rings, x, y), `${name} em (${x}, ${y})`).toBe(f(x, y) >= 0);
        checked++;
      }
      expect(checked).toBeGreaterThan(1500);
    });
  }

  it('nada acima do limiar: nenhum anel', () => {
    expect(isolineRegion(() => -1, 1, 1, N, N, 0)).toEqual([]);
  });

  it('a borda da região passa pelos mesmos pontos da curva de mesmo nível', () => {
    const f = disc(0, 0.5, 0.3);
    const [line] = isolines(f, 1, 1, N, N, [0]);
    const ring = isolineRegion(f, 1, 1, N, N, 0)[0]!;
    const onRing = new Set(ring.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of line!.points) expect(onRing.has(`${x},${y}`)).toBe(true);
  });

  const scenes = {
    'brise infinito': {
      window: { width: 1.5, height: 1.2 },
      devices: [
        {
          kind: 'overhang' as const,
          depth: 0.8,
          above: 0.1,
          extendLeft: Infinity,
          extendRight: Infinity,
        },
      ],
      orientation: 25,
    },
    'brise e aletas': {
      window: { width: 1.2, height: 1 },
      devices: [
        {
          kind: 'overhang' as const,
          depth: 0.6,
          above: 0.1,
          extendLeft: 0.3,
          extendRight: 0.3,
        },
        { kind: 'fin' as const, side: 'right' as const, depth: 0.4 },
        { kind: 'fin' as const, side: 'left' as const, depth: 0.4 },
      ],
      orientation: 300,
    },
    'brise da Figura 22 com recuo do vidro': {
      window: { width: 2, height: 1, setback: 0.15 },
      devices: [
        {
          kind: 'overhang' as const,
          depth: 1.28,
          above: 0,
          extendLeft: 1.7,
          extendRight: 1.2,
        },
      ],
      orientation: 30,
    },
    // Lâminas que se sobrepõem de frente (0,4 · sen 60° > 0,3) e passam 0,5 m acima da verga: a
    // normal fica à sombra, e a região passa pelo centro do disco da fachada (a borda degenerada
    // ρ = 0 da grade). Sem o prolongamento, o topo da janela fica ao sol com qualquer altura.
    'lâminas verticais fechadas': {
      window: { width: 1.2, height: 1.4 },
      devices: [
        {
          kind: 'verticalLouvers' as const,
          count: 5,
          chord: 0.4,
          pitch: 0.3,
          angle: 60,
          start: 0,
          extendAbove: 0.5,
        },
      ],
      orientation: 180,
    },
  };
  for (const [name, c] of Object.entries(scenes)) {
    it(`na carta, a região preenchida é a das direções com 100% da janela à sombra: ${name}`, () => {
      const scene = buildScene(c.window, c.devices);
      const chart = shadingChart(scene, c.orientation);
      const rings = chart.fullShade.map((ring) => ring.map(chartPoint));
      expect(rings.length, name).toBeGreaterThan(0);
      // A curva de 100% é borda da região: todos os pontos dela estão nos anéis.
      const full = chart.contours.filter((l) => l.level === 1);
      expect(full.length, name).toBeGreaterThan(0);
      const onRing = new Set(chart.fullShade.flat().map((d) => `${d.altitude},${d.azimuth}`));
      for (const line of full) {
        for (const d of line.points) expect(onRing.has(`${d.altitude},${d.azimuth}`)).toBe(true);
      }
      const next = random(11);
      let inside = 0;
      let checked = 0;
      for (let k = 0; k < 3000; k++) {
        const altitude = 0.5 + 89 * next();
        const azimuth = c.orientation - 89.5 + 179 * next();
        const d = { altitude, azimuth: ((azimuth % 360) + 360) % 360 };
        const [x, y] = chartPoint(d);
        // Margem de 0,01 na carta (0,6° a 1,2°): fora dela, a borda reta não decide nada.
        if (distanceToRings(rings, x, y) < 0.01) continue;
        const f = shadedFraction(scene, facadeVector(d.altitude, d.azimuth, c.orientation));
        const expected = f >= contourThreshold(1);
        expect(insideEvenOdd(rings, x, y), `${name}: h ${altitude}, a ${azimuth}`).toBe(expected);
        if (expected) inside++;
        checked++;
      }
      expect(checked, name).toBeGreaterThan(2000);
      expect(inside, name).toBeGreaterThan(50);
    });
  }

  it('as curvas de shadingChart são as de shadingContours', () => {
    const c = scenes['brise e aletas'];
    const scene = buildScene(c.window, c.devices);
    expect(shadingChart(scene, c.orientation).contours).toEqual(
      shadingContours(scene, c.orientation),
    );
  });

  it('sem proteção não há região', () => {
    expect(shadingChart(buildScene({ width: 1, height: 1 }, []), 0)).toEqual({
      contours: [],
      fullShade: [],
    });
  });
});
