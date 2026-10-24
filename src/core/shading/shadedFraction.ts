/**
 * Percentual sombreado exato da janela e fração ensolarada (F3.2).
 *
 * Especificação: docs/spec/07-mascara-pela-geometria.md, seções 7.2 e 7.3. Cada placa é projetada
 * no plano do vidro na direção do sol, (x, y, z) ↦ (x − y · s_x / s_y, z − y · s_z / s_y); a
 * sombra é recortada pela janela (Sutherland e Hodgman) e a área da união das sombras é calculada
 * sem aproximação pelo método das faixas verticais.
 *
 * Validação: área da união com shapely e traçado de raios (tests/referencia/mascaraGeometria.test.ts)
 * e casos analíticos (shadedFraction.test.ts).
 */
import type { Plate, Scene } from './geometry';

const RAD = Math.PI / 180;

/**
 * Menor seno da altura solar e menor cosseno do ângulo de incidência com que o sol chega à janela
 * (o SunIsUpValue do EnergyPlus; spec 07, seção 7.2).
 */
export const MIN_SUN_COSINE = 1e-5;

/** Vetor no referencial da fachada: x à direita de quem olha para fora, y na normal, z para cima. */
export interface FacadeVector {
  x: number;
  y: number;
  z: number;
}

/** Direção do sol (altura e azimute, graus) no referencial de uma fachada de orientação dada. */
export function facadeVector(altitude: number, azimuth: number, orientation: number): FacadeVector {
  const h = altitude * RAD;
  const psi = (azimuth - orientation) * RAD;
  return { x: Math.cos(h) * Math.sin(psi), y: Math.cos(h) * Math.cos(psi), z: Math.sin(h) };
}

/** Vetor de componentes Leste, Norte e Cima no referencial da fachada. */
export function facadeFromEnu(
  east: number,
  north: number,
  up: number,
  orientation: number,
): FacadeVector {
  const c = Math.cos(orientation * RAD);
  const s = Math.sin(orientation * RAD);
  return { x: east * c - north * s, y: east * s + north * c, z: up };
}

/** O sol está acima do horizonte e diante da fachada (seção 7.2)? */
export function sunOnWindow(s: FacadeVector): boolean {
  return s.y >= MIN_SUN_COSINE && s.z >= MIN_SUN_COSINE;
}

/** Ponto do plano do vidro: [x, z]. */
type Point = [number, number];

/** Área com sinal (fórmula do polígono). */
function signedArea(poly: readonly Point[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j]![0] * poly[i]![1] - poly[i]![0] * poly[j]![1];
  }
  return a / 2;
}

/** Recorta o polígono pelo semiplano coord[axis] ≥ bound (sign = 1) ou ≤ bound (sign = −1). */
function clip(poly: readonly Point[], axis: 0 | 1, bound: number, sign: 1 | -1): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const da = sign * (a[axis] - bound);
    const db = sign * (b[axis] - bound);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      const p: Point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      p[axis] = bound;
      out.push(p);
    }
  }
  return out;
}

/** Sombra de uma placa recortada pela janela, ou null se não houver área. */
function shadow(plate: Plate, kx: number, kz: number, W: number, H: number): Point[] | null {
  let poly: Point[] = plate.map((v) => [v[0] - v[1] * kx, v[2] - v[1] * kz]);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of poly) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  if (maxX <= 0 || minX >= W || maxZ <= 0 || minZ >= H) return null;
  if (minX < 0) poly = clip(poly, 0, 0, 1);
  if (maxX > W) poly = clip(poly, 0, W, -1);
  if (minZ < 0) poly = clip(poly, 1, 0, 1);
  if (maxZ > H) poly = clip(poly, 1, H, -1);
  return poly.length >= 3 && signedArea(poly) !== 0 ? poly : null;
}

/** Intervalo [z mín, z máx] em que a reta vertical x corta o polígono convexo, ou null. */
function crossSection(poly: readonly Point[], x: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    if ((a[0] - x) * (b[0] - x) < 0) {
      const z = a[1] + ((x - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
      lo = Math.min(lo, z);
      hi = Math.max(hi, z);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

/** Abscissa da interseção dos segmentos ab e cd, ou null se não se cruzam (ou são paralelos). */
function intersectionX(a: Point, b: Point, c: Point, d: Point): number | null {
  const rx = b[0] - a[0];
  const rz = b[1] - a[1];
  const sx = d[0] - c[0];
  const sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (den === 0) return null;
  const qx = c[0] - a[0];
  const qz = c[1] - a[1];
  const t = (qx * sz - qz * sx) / den;
  const u = (qx * rz - qz * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? a[0] + t * rx : null;
}

interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function boxOf(poly: readonly Point[]): Box {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

const overlap = (a: Box, b: Box) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

/**
 * Área da união de polígonos convexos (seção 7.3). Entre abscissas consecutivas de vértices e de
 * cruzamentos de arestas, o comprimento da união dos cortes verticais é linear em x; a área de cada
 * faixa é o comprimento no meio da faixa vezes a largura, sem aproximação.
 */
function unionArea(polys: readonly Point[][]): number {
  const boxes = polys.map(boxOf);
  const pairs: [number, number][] = [];
  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      if (overlap(boxes[i]!, boxes[j]!)) pairs.push([i, j]);
    }
  }
  if (pairs.length === 0) return polys.reduce((sum, p) => sum + Math.abs(signedArea(p)), 0);

  const xs: number[] = [];
  for (const poly of polys) for (const p of poly) xs.push(p[0]);
  for (const [i, j] of pairs) {
    const p = polys[i]!;
    const q = polys[j]!;
    for (let a = 0; a < p.length; a++) {
      for (let c = 0; c < q.length; c++) {
        const x = intersectionX(p[a]!, p[(a + 1) % p.length]!, q[c]!, q[(c + 1) % q.length]!);
        if (x !== null) xs.push(x);
      }
    }
  }
  xs.sort((a, b) => a - b);

  let area = 0;
  const cuts: [number, number][] = [];
  for (let k = 0; k + 1 < xs.length; k++) {
    const x0 = xs[k]!;
    const x1 = xs[k + 1]!;
    if (!(x1 > x0)) continue;
    const xm = (x0 + x1) / 2;
    cuts.length = 0;
    polys.forEach((poly, i) => {
      const box = boxes[i]!;
      if (xm <= box.minX || xm >= box.maxX) return;
      const cut = crossSection(poly, xm);
      if (cut) cuts.push(cut);
    });
    if (cuts.length === 0) continue;
    cuts.sort((a, b) => a[0] - b[0]);
    let length = 0;
    let [lo, hi] = cuts[0]!;
    for (let i = 1; i < cuts.length; i++) {
      const [a, b] = cuts[i]!;
      if (a > hi) {
        length += hi - lo;
        lo = a;
        hi = b;
      } else if (b > hi) {
        hi = b;
      }
    }
    length += hi - lo;
    area += length * (x1 - x0);
  }
  return area;
}

/**
 * Percentual sombreado: fração da área da janela à sombra das placas, de 0 a 1 (seção 7.3).
 * Definido para o sol diante do plano da fachada (s_y > 0); NaN caso contrário. Não aplica os
 * limites de sol na janela: para a fração ensolarada, use sunlitFraction.
 */
export function shadedFraction(scene: Scene, s: FacadeVector): number {
  if (!(s.y > 0)) return Number.NaN;
  const kx = s.x / s.y;
  const kz = s.z / s.y;
  const W = scene.width;
  const H = scene.height;
  const shadows: Point[][] = [];
  for (const plate of scene.plates) {
    const poly = shadow(plate, kx, kz, W, H);
    if (poly) shadows.push(poly);
  }
  if (shadows.length === 0) return 0;
  return Math.min(1, unionArea(shadows) / (W * H));
}

/**
 * Fração ensolarada da janela (a "Surface Outside Face Sunlit Fraction" do EnergyPlus): 1 menos o
 * percentual sombreado com o sol na janela, 0 com o sol atrás da fachada ou abaixo do horizonte.
 */
export function sunlitFraction(scene: Scene, s: FacadeVector): number {
  return sunOnWindow(s) ? 1 - shadedFraction(scene, s) : 0;
}
