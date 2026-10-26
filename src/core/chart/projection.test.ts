import { describe, expect, it } from 'vitest';
import { maskRegions, regionContains, type Region } from '../mask/mask';
import {
  densify,
  makeProjection,
  projectDirection,
  projectRegion,
  projectedRegionContains,
  projectPath,
  unprojectPoint,
  type Direction,
  type ProjectionKind,
} from './projection';
import { project as stereo } from './stereographic';

const DEG = Math.PI / 180;

function vec(d: Direction): [number, number, number] {
  return [
    Math.sin(d.zenith * DEG) * Math.sin(d.azimuth * DEG),
    Math.sin(d.zenith * DEG) * Math.cos(d.azimuth * DEG),
    Math.cos(d.zenith * DEG),
  ];
}

function angle(a: Direction, b: Direction): number {
  const u = vec(a);
  const v = vec(b);
  const c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return Math.atan2(Math.hypot(...c), u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / DEG;
}

/** Gerador pseudoaleatório com semente fixa (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Direção sorteada uniforme na esfera (ou só acima do horizonte). */
function randomDirection(r: () => number, upper = false): Direction {
  const u = upper ? r() : 2 * r() - 1;
  return { zenith: Math.acos(u) / DEG, azimuth: 360 * r() };
}

describe('fórmulas das projeções (spec 03, seção 3.5)', () => {
  it('equidistante: r = z / 90°, Norte para cima, Leste à direita', () => {
    const p = makeProjection('equidistant');
    expect(projectDirection(p, 0, 123)).toEqual({ x: 0, y: 0 });
    const h = projectDirection(p, 90, 90);
    expect(h.x).toBeCloseTo(1, 12);
    expect(h.y).toBeCloseTo(0, 12);
    const n45 = projectDirection(p, 45, 0);
    expect(n45.x).toBeCloseTo(0, 12);
    expect(n45.y).toBeCloseTo(0.5, 12);
  });

  it('cilíndrica centrada na normal: x = ψ / 180°, y = h / 90°, com ψ em [−180°, 180°)', () => {
    const p = makeProjection('cylindrical', 30);
    expect(projectDirection(p, 90, 30)).toEqual({ x: 0, y: 0 });
    const right = projectDirection(p, 45, 120);
    expect(right.x).toBeCloseTo(0.5, 12);
    expect(right.y).toBeCloseTo(0.5, 12);
    expect(projectDirection(p, 90, 210).x).toBeCloseTo(-1, 12);
    expect(projectDirection(p, 90, 300).x).toBeCloseTo(-0.5, 12);
    expect(projectDirection(p, 0, 77).y).toBeCloseTo(1, 12);
  });

  it('ida e volta em direções sorteadas, nas três projeções', () => {
    const r = rng(7);
    for (const kind of ['stereographic', 'equidistant', 'cylindrical'] as ProjectionKind[]) {
      const p = makeProjection(kind, 135);
      let worst = 0;
      for (let i = 0; i < 2000; i++) {
        const d = randomDirection(r);
        if (d.zenith > 179) continue;
        const c = projectDirection(p, d.zenith, d.azimuth);
        const back = unprojectPoint(p, c.x, c.y)!;
        worst = Math.max(worst, angle(d, back));
      }
      expect(worst, kind).toBeLessThan(1e-9);
    }
  });

  it('a inversa recusa pontos fora do domínio', () => {
    expect(unprojectPoint(makeProjection('equidistant'), 2.1, 0)).toBeNull();
    expect(unprojectPoint(makeProjection('cylindrical'), 0, 1.2)).toBeNull();
    expect(unprojectPoint(makeProjection('cylindrical'), 1.2, 0.5)).toBeNull();
  });
});

describe('polilinhas (spec 03, seção 3.5.3)', () => {
  it('densificar: arcos de no máximo 0,5° na esfera, com as pontas preservadas', () => {
    const a = { zenith: 80, azimuth: 10 };
    const b = { zenith: 20, azimuth: 200 };
    const pts = densify([a, b], 0.5);
    expect(pts[0]).toEqual(a);
    expect(angle(pts.at(-1)!, b)).toBeLessThan(1e-9);
    for (let i = 1; i < pts.length; i++)
      expect(angle(pts[i - 1]!, pts[i]!)).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it('cilíndrica: trajetória que cruza a costura sai cortada nas duas bordas (cópias de ±2)', () => {
    const p = makeProjection('cylindrical', 0);
    // De 170° a 190° de azimute, a 30° de altura: atravessa ψ = ±180°.
    const dirs = [170, 175, 180, 185, 190].map((a) => ({ zenith: 60, azimuth: a }));
    const pieces = projectPath(p, dirs, false);
    // Há um traço que chega a x = 1 e outro (cópia) que sai de x = −1.
    const xs = pieces.flatMap((l) => l.map((q) => q.x));
    expect(Math.max(...xs)).toBeGreaterThan(1);
    expect(Math.min(...xs)).toBeLessThan(-1);
    for (const l of pieces) {
      for (let i = 1; i < l.length; i++) expect(Math.abs(l[i]!.x - l[i - 1]!.x)).toBeLessThan(0.05);
    }
  });

  it('cilíndrica: arco que passa rente ao zênite é subdividido (sem salto de meia volta)', () => {
    const p = makeProjection('cylindrical', 0);
    const pieces = projectPath(
      p,
      [
        // As amostras de 0,5° caem a 0,25° do zênite, uma de cada lado (salto de 180°).
        { zenith: 0.75, azimuth: 10 },
        { zenith: 1.25, azimuth: 190.001 },
      ],
      false,
    );
    for (const l of pieces) {
      for (let i = 1; i < l.length; i++) expect(Math.abs(l[i]!.x - l[i - 1]!.x)).toBeLessThan(0.51);
      expect(Math.max(...l.map((q) => q.y))).toBeGreaterThan(0.9999);
    }
  });

  it('cilíndrica: passagem perto do zênite corre junto à borda de cima', () => {
    const p = makeProjection('cylindrical', 0);
    const pieces = projectPath(
      p,
      [
        { zenith: 2, azimuth: 80 },
        { zenith: 0.3, azimuth: 30 },
        { zenith: 2, azimuth: 300 },
      ],
      false,
    );
    for (const l of pieces) {
      for (let i = 1; i < l.length; i++) expect(Math.abs(l[i]!.x - l[i - 1]!.x)).toBeLessThan(0.6);
    }
  });
});

describe('regiões da máscara fora da estereográfica (spec 03, seção 3.5.3)', () => {
  /** Mesma classificação da região exata, exceto a menos de 0,5° da borda. */
  function checkRegion(region: Region, kind: ProjectionKind, center: number, seed: number) {
    const proj = makeProjection(kind, center);
    const projected = projectRegion(region, proj);
    const r = rng(seed);
    let wrong = 0;
    let tested = 0;
    const inside = (d: Direction) => {
      const s = stereo(d.zenith, d.azimuth);
      return regionContains(region, s.x, s.y);
    };
    for (let i = 0; i < 3000; i++) {
      const d = randomDirection(r, true);
      const exact = inside(d);
      const c = projectDirection(proj, d.zenith, d.azimuth);
      if (projectedRegionContains(projected, c.x, c.y) === exact) {
        tested++;
        continue;
      }
      // Discordância só é aceita perto da borda: algum vizinho a 0,5° muda de classe.
      let nearBorder = false;
      for (let k = 0; k < 24 && !nearBorder; k++) {
        const t = (k * 15 * Math.PI) / 180;
        const q = {
          zenith: Math.min(179.9, Math.max(0, d.zenith + 0.5 * Math.cos(t))),
          azimuth: d.azimuth + (0.5 * Math.sin(t)) / Math.max(1e-6, Math.sin(d.zenith * DEG)),
        };
        if (inside(q) !== exact) nearBorder = true;
      }
      if (!nearBorder) wrong++;
      tested++;
    }
    expect(tested).toBe(3000);
    expect(wrong).toBe(0);
  }

  const cases: [string, Region][] = [
    [
      'brise com γ e aletas, fachada a 30°',
      maskRegions(30, 'internal', {
        alpha: [40],
        gammaRight: [60],
        gammaLeft: [50],
        betaRight: [70],
        betaLeft: [60],
        finTopLeft: [30],
      }).total,
    ],
    [
      'brise afastado (α1 e α2), fachada Sul',
      maskRegions(180, 'external', { alpha: [40, 75] }).total,
    ],
    [
      'parcial menos total, fachada a −30°',
      maskRegions(-30, 'internal', { alpha: [45] }, { alpha: [60], betaRight: [45] }).partial,
    ],
    [
      'desenho à mão que cobre o zênite e cruza a costura',
      maskRegions(
        0,
        'internal',
        {},
        {},
        {
          total: [
            [
              { azimuth: 150, altitude: 10 },
              { azimuth: 210, altitude: 10 },
              { azimuth: 330, altitude: 40 },
              { azimuth: 30, altitude: 40 },
            ],
          ],
          partial: [],
        },
      ).total,
    ],
  ];
  for (const [name, region] of cases) {
    for (const kind of ['equidistant', 'cylindrical'] as const) {
      for (const center of kind === 'cylindrical' ? [0, 30, 180, 330] : [0]) {
        it(`${name}: ${kind}${kind === 'cylindrical' ? `, centro ${center}°` : ''}`, () => {
          checkRegion(region, kind, center, 11 + center);
        });
      }
    }
  }
});
