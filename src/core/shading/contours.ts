/**
 * Curvas de percentual sombreado na carta (F3.2): 0, 25, 50, 75 e 100%.
 *
 * Especificação: docs/spec/07-mascara-pela-geometria.md, seção 7.5. As direções diante da fachada
 * são mapeadas no disco da fachada (projeção estereográfica centrada na normal): φ é o ângulo no
 * plano da fachada (0° à direita no horizonte, 90° para cima, 180° à esquerda) e ρ = tan(θ/2), com
 * θ o ângulo de incidência. O quarto de esfera vira o retângulo φ ∈ [0°, 180°], ρ ∈ [0, ρ_máx]; numa
 * grade desse retângulo, quadrados marchantes dão as curvas, com o ponto de cada aresta refinado
 * por bisseção até o percentual exato e as selas resolvidas pelo centro da célula.
 *
 * Validação: casos analíticos (curvas α e β), percentual exato nos vértices e topologia num campo
 * com sela (contours.test.ts).
 */
import type { Scene } from './geometry';
import { MIN_SUN_COSINE, shadedFraction, type FacadeVector } from './shadedFraction';

const DEG = 180 / Math.PI;

/** Níveis padrão das curvas (fração da área da janela à sombra). */
export const CONTOUR_LEVELS: readonly number[] = [0, 0.25, 0.5, 0.75, 1];

/** Limiar numérico de cada nível: 0% é f > 10⁻⁹ e 100% é f ≥ 1 − 10⁻⁹ (seção 7.5). */
export function contourThreshold(level: number): number {
  if (level <= 0) return 1e-9;
  if (level >= 1) return 1 - 1e-9;
  return level;
}

export interface SkyDirection {
  /** Altura, graus. */
  altitude: number;
  /** Azimute a partir do Norte, sentido horário, [0, 360). */
  azimuth: number;
}

export interface ShadingContour {
  level: number;
  points: SkyDirection[];
}

export interface ContourOptions {
  levels?: readonly number[];
  /** Células em φ (padrão 180: 1°). */
  angularSteps?: number;
  /** Células em ρ (padrão 120). */
  radialSteps?: number;
}

export interface Isoline {
  threshold: number;
  /** Pontos [x, y]; numa linha fechada, o último repete o primeiro. */
  points: [number, number][];
}

const BISECTIONS = 34;

/**
 * Isolinhas {f = limiar} de uma função contínua no retângulo [0, xMax] × [0, yMax], por quadrados
 * marchantes numa grade de nx × ny células. A região de dentro é f ≥ limiar; o ponto de cada aresta
 * é refinado por bisseção e a sela é resolvida pelo valor no centro da célula.
 */
export function isolines(
  f: (x: number, y: number) => number,
  xMax: number,
  yMax: number,
  nx: number,
  ny: number,
  thresholds: readonly number[],
): Isoline[] {
  const xAt = (i: number) => (xMax * i) / nx;
  const yAt = (j: number) => (yMax * j) / ny;
  const cols = nx + 1;
  const grid = new Float64Array(cols * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) grid[j * cols + i] = f(xAt(i), yAt(j));
  }
  const value = (i: number, j: number) => grid[j * cols + i]!;
  // Arestas: 2·nó para a horizontal (nó, nó à direita), 2·nó + 1 para a vertical (nó, nó acima).
  const hEdge = (i: number, j: number) => 2 * (j * cols + i);
  const vEdge = (i: number, j: number) => 2 * (j * cols + i) + 1;

  const out: Isoline[] = [];
  for (const threshold of thresholds) {
    const inside = (v: number) => v >= threshold;

    const crossings = new Map<number, [number, number]>();
    const edgePoint = (key: number): [number, number] => {
      const cached = crossings.get(key);
      if (cached) return cached;
      const vertical = key % 2 === 1;
      const node = (key - (key % 2)) / 2;
      const i = node % cols;
      const j = (node - i) / cols;
      const x0 = xAt(i);
      const y0 = yAt(j);
      const x1 = vertical ? x0 : xAt(i + 1);
      const y1 = vertical ? yAt(j + 1) : y0;
      const in0 = inside(value(i, j));
      let a = 0;
      let b = 1;
      for (let k = 0; k < BISECTIONS; k++) {
        const t = (a + b) / 2;
        if (inside(f(x0 + t * (x1 - x0), y0 + t * (y1 - y0))) === in0) a = t;
        else b = t;
      }
      const t = (a + b) / 2;
      const p: [number, number] = [x0 + t * (x1 - x0), y0 + t * (y1 - y0)];
      crossings.set(key, p);
      return p;
    };

    // Segmentos de cada célula, como pares de arestas cortadas (cantos c0 a c3 no sentido
    // anti-horário a partir de (i, j); arestas e0 embaixo, e1 à direita, e2 em cima, e3 à esquerda).
    const segments: [number, number][] = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c0 = inside(value(i, j));
        const c1 = inside(value(i + 1, j));
        const c2 = inside(value(i + 1, j + 1));
        const c3 = inside(value(i, j + 1));
        const code = (c0 ? 1 : 0) | (c1 ? 2 : 0) | (c2 ? 4 : 0) | (c3 ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const e0 = hEdge(i, j);
        const e1 = vEdge(i + 1, j);
        const e2 = hEdge(i, j + 1);
        const e3 = vEdge(i, j);
        switch (code) {
          case 1:
          case 14:
            segments.push([e3, e0]);
            break;
          case 2:
          case 13:
            segments.push([e0, e1]);
            break;
          case 3:
          case 12:
            segments.push([e3, e1]);
            break;
          case 4:
          case 11:
            segments.push([e1, e2]);
            break;
          case 6:
          case 9:
            segments.push([e0, e2]);
            break;
          case 7:
          case 8:
            segments.push([e2, e3]);
            break;
          case 5:
          case 10: {
            // Sela: com o centro do mesmo lado de c0 e c2, as curvas isolam c1 e c3; senão,
            // isolam c0 e c2.
            const center = inside(f(xAt(i + 0.5), yAt(j + 0.5)));
            if (center === c0) segments.push([e0, e1], [e2, e3]);
            else segments.push([e3, e0], [e1, e2]);
            break;
          }
        }
      }
    }

    // Liga os segmentos em linhas pelas arestas em comum (cada aresta tem no máximo dois).
    const byEdge = new Map<number, number[]>();
    segments.forEach(([a, b], s) => {
      for (const e of [a, b]) {
        const list = byEdge.get(e);
        if (list) list.push(s);
        else byEdge.set(e, [s]);
      }
    });
    const used = new Uint8Array(segments.length);
    // Segue a cadeia a partir de uma aresta; devolve as arestas visitadas depois dela.
    const follow = (edge: number): number[] => {
      const edges: number[] = [];
      for (;;) {
        const s = byEdge.get(edge)!.find((u) => !used[u]);
        if (s === undefined) return edges;
        used[s] = 1;
        const [a, b] = segments[s]!;
        edge = a === edge ? b : a;
        edges.push(edge);
      }
    };
    for (let s = 0; s < segments.length; s++) {
      if (used[s]) continue;
      used[s] = 1;
      const [a, b] = segments[s]!;
      const forward = follow(b);
      const backward = follow(a);
      out.push({ threshold, points: [...backward.reverse(), a, b, ...forward].map(edgePoint) });
    }
  }
  return out;
}

/** Raio máximo do disco da fachada: cos θ = MIN_SUN_COSINE. */
const RHO_MAX = Math.tan(Math.acos(MIN_SUN_COSINE) / 2);

function direction(phi: number, rho: number): FacadeVector {
  const theta = 2 * Math.atan(rho);
  const st = Math.sin(theta);
  return { x: st * Math.cos(phi), y: Math.cos(theta), z: st * Math.sin(phi) };
}

function toSky(d: FacadeVector, orientation: number): SkyDirection {
  const altitude = Math.asin(Math.max(-1, Math.min(1, d.z))) * DEG;
  const a = (orientation + Math.atan2(d.x, d.y) * DEG) % 360;
  return { altitude, azimuth: a < 0 ? a + 360 : a };
}

/** Curvas de percentual sombreado de uma cena, na carta da fachada de orientação dada. */
export function shadingContours(
  scene: Scene,
  orientation: number,
  options: ContourOptions = {},
): ShadingContour[] {
  const levels = options.levels ?? CONTOUR_LEVELS;
  const lines = isolines(
    (phi, rho) => shadedFraction(scene, direction(phi, rho)),
    Math.PI,
    RHO_MAX,
    options.angularSteps ?? 180,
    options.radialSteps ?? 120,
    levels.map(contourThreshold),
  );
  return lines.map((line) => ({
    level: levels[levels.map(contourThreshold).indexOf(line.threshold)]!,
    points: line.points.map(([phi, rho]) => toSky(direction(phi, rho), orientation)),
  }));
}
