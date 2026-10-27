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

/** Linha como sequência de arestas cortadas da grade; fechada se a última repete a primeira. */
interface TracedLine {
  edges: number[];
  closed: boolean;
}

/**
 * Grade de quadrados marchantes de uma função contínua no retângulo [0, xMax] × [0, yMax], com
 * nx × ny células: os valores nos nós são calculados uma vez e servem a todos os limiares. A região
 * de dentro é f ≥ limiar; o ponto de cada aresta é refinado por bisseção e a sela é resolvida pelo
 * valor no centro da célula.
 */
class ContourGrid {
  private readonly f: (x: number, y: number) => number;
  private readonly xMax: number;
  private readonly yMax: number;
  private readonly nx: number;
  private readonly ny: number;
  private readonly cols: number;
  private readonly grid: Float64Array;
  private readonly crossings = new Map<number, Map<number, [number, number]>>();

  constructor(
    f: (x: number, y: number) => number,
    xMax: number,
    yMax: number,
    nx: number,
    ny: number,
  ) {
    this.f = f;
    this.xMax = xMax;
    this.yMax = yMax;
    this.nx = nx;
    this.ny = ny;
    this.cols = nx + 1;
    this.grid = new Float64Array(this.cols * (ny + 1));
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) this.grid[j * this.cols + i] = f(this.xAt(i), this.yAt(j));
    }
  }

  private xAt(i: number) {
    return (this.xMax * i) / this.nx;
  }

  private yAt(j: number) {
    return (this.yMax * j) / this.ny;
  }

  private value(i: number, j: number) {
    return this.grid[j * this.cols + i]!;
  }

  // Arestas: 2·nó para a horizontal (nó, nó à direita), 2·nó + 1 para a vertical (nó, nó acima).
  private hEdge(i: number, j: number) {
    return 2 * (j * this.cols + i);
  }

  private vEdge(i: number, j: number) {
    return 2 * (j * this.cols + i) + 1;
  }

  /** Nó inicial (i, j) e se a aresta é vertical. */
  private edgeNode(key: number): [number, number, boolean] {
    const vertical = key % 2 === 1;
    const node = (key - (key % 2)) / 2;
    const i = node % this.cols;
    return [i, (node - i) / this.cols, vertical];
  }

  /** Ponto em que a curva do limiar corta a aresta, refinado por bisseção. */
  point(threshold: number, key: number): [number, number] {
    let cache = this.crossings.get(threshold);
    if (!cache) {
      cache = new Map();
      this.crossings.set(threshold, cache);
    }
    const cached = cache.get(key);
    if (cached) return cached;
    const [i, j, vertical] = this.edgeNode(key);
    const x0 = this.xAt(i);
    const y0 = this.yAt(j);
    const x1 = vertical ? x0 : this.xAt(i + 1);
    const y1 = vertical ? this.yAt(j + 1) : y0;
    const in0 = this.value(i, j) >= threshold;
    let a = 0;
    let b = 1;
    for (let k = 0; k < BISECTIONS; k++) {
      const t = (a + b) / 2;
      if (this.f(x0 + t * (x1 - x0), y0 + t * (y1 - y0)) >= threshold === in0) a = t;
      else b = t;
    }
    const t = (a + b) / 2;
    const p: [number, number] = [x0 + t * (x1 - x0), y0 + t * (y1 - y0)];
    cache.set(key, p);
    return p;
  }

  /** Linhas do limiar como sequências de arestas. */
  trace(threshold: number): TracedLine[] {
    const inside = (v: number) => v >= threshold;
    // Segmentos de cada célula, como pares de arestas cortadas (cantos c0 a c3 no sentido
    // anti-horário a partir de (i, j); arestas e0 embaixo, e1 à direita, e2 em cima, e3 à esquerda).
    const segments: [number, number][] = [];
    for (let j = 0; j < this.ny; j++) {
      for (let i = 0; i < this.nx; i++) {
        const c0 = inside(this.value(i, j));
        const c1 = inside(this.value(i + 1, j));
        const c2 = inside(this.value(i + 1, j + 1));
        const c3 = inside(this.value(i, j + 1));
        const code = (c0 ? 1 : 0) | (c1 ? 2 : 0) | (c2 ? 4 : 0) | (c3 ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const e0 = this.hEdge(i, j);
        const e1 = this.vEdge(i + 1, j);
        const e2 = this.hEdge(i, j + 1);
        const e3 = this.vEdge(i, j);
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
            const center = inside(this.f(this.xAt(i + 0.5), this.yAt(j + 0.5)));
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
    const lines: TracedLine[] = [];
    for (let s = 0; s < segments.length; s++) {
      if (used[s]) continue;
      used[s] = 1;
      const [a, b] = segments[s]!;
      const forward = follow(b);
      const backward = follow(a);
      const edges = [...backward.reverse(), a, b, ...forward];
      lines.push({ edges, closed: edges.length > 2 && edges[0] === edges.at(-1) });
    }
    return lines;
  }

  /**
   * Posição k da aresta no contorno do retângulo, percorrido no sentido anti-horário a partir do
   * nó (0, 0): a aresta k vai do nó de contorno k ao k + 1. Undefined se a aresta é interna.
   */
  private perimeterIndex(key: number): number | undefined {
    const [i, j, vertical] = this.edgeNode(key);
    const { nx, ny } = this;
    if (!vertical && j === 0) return i;
    if (vertical && i === nx) return nx + j;
    if (!vertical && j === ny) return nx + ny + (nx - 1 - i);
    if (vertical && i === 0) return 2 * nx + ny + (ny - 1 - j);
    return undefined;
  }

  /** Nó (i, j) de posição k no contorno. */
  private perimeterNode(k: number): [number, number] {
    const { nx, ny } = this;
    if (k < nx) return [k, 0];
    if (k < nx + ny) return [nx, k - nx];
    if (k < 2 * nx + ny) return [nx - (k - nx - ny), ny];
    return [0, ny - (k - 2 * nx - ny)];
  }

  /**
   * Região {f ≥ limiar} como anéis, para preencher pela regra par-ímpar: as linhas fechadas e, para
   * as abertas, ciclos que alternam uma linha e o trecho do contorno do retângulo que fica dentro
   * da região (entre duas pontas de linha vizinhas no contorno, os nós estão todos dentro ou todos
   * fora). Sem pontas no contorno, o retângulo inteiro entra como anel se o contorno está dentro.
   */
  region(threshold: number): [number, number][][] {
    const lines = this.trace(threshold);
    const point = (key: number) => this.point(threshold, key);
    const node = (k: number): [number, number] => {
      const [i, j] = this.perimeterNode(k);
      return [this.xAt(i), this.yAt(j)];
    };
    const nodeInside = (k: number) => {
      const [i, j] = this.perimeterNode(k);
      return this.value(i, j) >= threshold;
    };
    const total = 2 * (this.nx + this.ny);
    const rings: [number, number][][] = [];
    const ends: { k: number; line: number; first: boolean }[] = [];
    lines.forEach((line, n) => {
      if (line.closed) {
        rings.push(line.edges.map(point));
        return;
      }
      ends.push({ k: this.perimeterIndex(line.edges[0]!)!, line: n, first: true });
      ends.push({ k: this.perimeterIndex(line.edges.at(-1)!)!, line: n, first: false });
    });
    if (ends.length === 0) {
      if (nodeInside(0)) rings.push(Array.from({ length: total }, (_, k) => node(k)));
      return rings;
    }
    ends.sort((a, b) => a.k - b.k);
    const position = new Map(ends.map((e, m) => [`${e.line}:${e.first ? 0 : 1}`, m]));
    const done = new Uint8Array(lines.length);
    for (const start of ends) {
      if (done[start.line] || !start.first) continue;
      const ring: [number, number][] = [];
      let line = start.line;
      let first = true;
      for (;;) {
        done[line] = 1;
        const edges = lines[line]!.edges;
        ring.push(...(first ? edges : [...edges].reverse()).map(point));
        // Sai pela outra ponta e segue o contorno pelo lado de dentro até a ponta vizinha.
        const m = position.get(`${line}:${first ? 1 : 0}`)!;
        const k = ends[m]!.k;
        let next: (typeof ends)[number];
        // Para a frente, os nós k + 1 a k'; para trás, os nós k a k' + 1 (k' da ponta vizinha).
        if (nodeInside((k + 1) % total)) {
          next = ends[(m + 1) % ends.length]!;
          const steps = (next.k - k + total) % total;
          for (let q = 1; q <= steps; q++) ring.push(node((k + q) % total));
        } else {
          next = ends[(m - 1 + ends.length) % ends.length]!;
          const steps = (k - next.k + total) % total;
          for (let q = 0; q < steps; q++) ring.push(node((k - q + total) % total));
        }
        line = next.line;
        first = next.first;
        if (line === start.line) break;
      }
      rings.push(ring);
    }
    return rings;
  }
}

/**
 * Isolinhas {f = limiar} de uma função contínua no retângulo [0, xMax] × [0, yMax], por quadrados
 * marchantes numa grade de nx × ny células (ContourGrid).
 */
export function isolines(
  f: (x: number, y: number) => number,
  xMax: number,
  yMax: number,
  nx: number,
  ny: number,
  thresholds: readonly number[],
): Isoline[] {
  const grid = new ContourGrid(f, xMax, yMax, nx, ny);
  return thresholds.flatMap((threshold) =>
    grid.trace(threshold).map((line) => ({
      threshold,
      points: line.edges.map((e) => grid.point(threshold, e)),
    })),
  );
}

/**
 * Região {f ≥ limiar} no retângulo [0, xMax] × [0, yMax], como anéis de pontos [x, y] a preencher
 * pela regra par-ímpar (ContourGrid.region).
 */
export function isolineRegion(
  f: (x: number, y: number) => number,
  xMax: number,
  yMax: number,
  nx: number,
  ny: number,
  threshold: number,
): [number, number][][] {
  return new ContourGrid(f, xMax, yMax, nx, ny).region(threshold);
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

export interface ShadingChart {
  contours: ShadingContour[];
  /**
   * Direções com a janela inteira à sombra (f ≥ 1 − 10⁻⁹), como anéis a preencher pela regra
   * par-ímpar; a borda passa pelos mesmos pontos da curva de 100%.
   */
  fullShade: SkyDirection[][];
}

function chartGrid(scene: Scene, options: ContourOptions) {
  return new ContourGrid(
    (phi, rho) => shadedFraction(scene, direction(phi, rho)),
    Math.PI,
    RHO_MAX,
    options.angularSteps ?? 180,
    options.radialSteps ?? 120,
  );
}

function contoursOf(
  grid: ContourGrid,
  orientation: number,
  levels: readonly number[],
): ShadingContour[] {
  return levels.flatMap((level) => {
    const threshold = contourThreshold(level);
    return grid.trace(threshold).map((line) => ({
      level,
      points: line.edges.map((e) => {
        const [phi, rho] = grid.point(threshold, e);
        return toSky(direction(phi, rho), orientation);
      }),
    }));
  });
}

/** Curvas de percentual sombreado de uma cena, na carta da fachada de orientação dada. */
export function shadingContours(
  scene: Scene,
  orientation: number,
  options: ContourOptions = {},
): ShadingContour[] {
  if (scene.plates.length === 0) return [];
  return contoursOf(chartGrid(scene, options), orientation, options.levels ?? CONTOUR_LEVELS);
}

/** Curvas e região de sombra total, com a mesma grade (o que a carta desenha no passo 6). */
export function shadingChart(
  scene: Scene,
  orientation: number,
  options: ContourOptions = {},
): ShadingChart {
  if (scene.plates.length === 0) return { contours: [], fullShade: [] };
  const grid = chartGrid(scene, options);
  return {
    contours: contoursOf(grid, orientation, options.levels ?? CONTOUR_LEVELS),
    fullShade: grid
      .region(contourThreshold(1))
      .map((ring) => ring.map(([phi, rho]) => toSky(direction(phi, rho), orientation))),
  };
}
