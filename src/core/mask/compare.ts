/**
 * Comparação de duas máscaras (F4.5, exercício de máscara): índice de Jaccard em ângulo sólido no
 * quarto de esfera diante da fachada e nas posições do sol do ano.
 *
 * Especificação: docs/spec/12-modo-didatico.md, seção 12.3. Validação: casos analíticos e contagem
 * independente em tests/referencia/exercicioMascara.test.ts.
 */

import type { SunSamples } from '../shading/hourly';
import { regionContains, type Region } from './mask';

const RAD = Math.PI / 180;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Pontos da grade padrão na esfera inteira (cerca de 15 000 caem no quarto diante da fachada). */
export const SPHERE_POINTS = 60_000;

/** Índice de Jaccard e as duas diferenças, relativas à região calculada. */
export interface Comparison {
  /** Interseção sobre união (0 a 1); null se as duas regiões forem vazias. */
  jaccard: number | null;
  /** Parte da região calculada que o desenho deixou de fora; null se ela for vazia. */
  missed: number | null;
  /** Desenho fora da região calculada, relativo ao tamanho dela; null se ela for vazia. */
  extra: number | null;
}

export interface MaskComparison {
  /** Em ângulo sólido (a forma). */
  shape: Comparison;
  /** Nas posições do sol diante da fachada; null sem as posições. */
  sun: Comparison | null;
}

const gridCache = new Map<number, Float64Array>();

/**
 * Direções quase uniformes em ângulo sólido (espiral de Fibonacci), como (Leste, Norte, Cima), só
 * as acima do horizonte. Guardadas por tamanho.
 */
export function fibonacciDirections(n: number = SPHERE_POINTS): Float64Array {
  const cached = gridCache.get(n);
  if (cached) return cached;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const up = 1 - (2 * i + 1) / n;
    if (up <= 0) continue;
    const r = Math.sqrt(1 - up * up);
    const theta = i * GOLDEN_ANGLE;
    out.push(r * Math.cos(theta), r * Math.sin(theta), up);
  }
  const grid = Float64Array.from(out);
  gridCache.set(n, grid);
  return grid;
}

interface Counts {
  student: number;
  answer: number;
  both: number;
  /** Direções do universo (no quarto de esfera diante da fachada). */
  universe: number;
}

function comparison({ student, answer, both }: Counts): Comparison {
  const union = student + answer - both;
  return {
    jaccard: union === 0 ? null : both / union,
    missed: answer === 0 ? null : (answer - both) / answer,
    extra: answer === 0 ? null : (student - both) / answer,
  };
}

/** Conta as direções diante da fachada e acima do horizonte em cada região. */
function count(
  student: Region,
  answer: Region,
  orientation: number,
  east: ArrayLike<number>,
  north: ArrayLike<number>,
  up: ArrayLike<number>,
): Counts {
  const nx = Math.sin(orientation * RAD);
  const ny = Math.cos(orientation * RAD);
  const counts: Counts = { student: 0, answer: 0, both: 0, universe: 0 };
  for (let i = 0; i < up.length; i++) {
    const u = up[i]!;
    const e = east[i]!;
    const n = north[i]!;
    if (u <= 0 || e * nx + n * ny <= 0) continue;
    counts.universe++;
    // Carta estereográfica de raio 1 no horizonte: (L, N) / (1 + C).
    const x = e / (1 + u);
    const y = n / (1 + u);
    const s = regionContains(student, x, y);
    const a = regionContains(answer, x, y);
    if (s) counts.student++;
    if (a) counts.answer++;
    if (s && a) counts.both++;
  }
  return counts;
}

function gridCounts(student: Region, answer: Region, orientation: number, n: number): Counts {
  const grid = fibonacciDirections(n);
  const m = grid.length / 3;
  const east = new Float64Array(m);
  const north = new Float64Array(m);
  const up = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    east[i] = grid[3 * i]!;
    north[i] = grid[3 * i + 1]!;
    up[i] = grid[3 * i + 2]!;
  }
  return count(student, answer, orientation, east, north, up);
}

/** Ângulo sólido (sr) da região dentro do quarto de esfera diante da fachada (ângulo sólido π). */
export function solidAngle(region: Region, orientation: number, n: number = SPHERE_POINTS): number {
  const c = gridCounts(region, region, orientation, n);
  return (Math.PI * c.answer) / c.universe;
}

/**
 * Compara o desenho do aluno com a máscara calculada: em ângulo sólido (seção 12.3) e, com as
 * posições do sol do ano, nas horas de sol.
 */
export function compareRegions(
  student: Region,
  answer: Region,
  orientation: number,
  sun: SunSamples | null = null,
  n: number = SPHERE_POINTS,
): MaskComparison {
  return {
    shape: comparison(gridCounts(student, answer, orientation, n)),
    sun: sun ? comparison(count(student, answer, orientation, sun.east, sun.north, sun.up)) : null,
  };
}
