/**
 * Máscara de sombra pelos ângulos α, β e γ (F2.3).
 *
 * Especificação: docs/spec/01-convencoes-geometricas.md, seção 1.6. Coordenadas da carta de
 * raio 1: x para Leste, y para Norte (as mesmas de stereographic.ts). Ângulos em graus.
 *
 * Cada borda da máscara é a imagem de um plano que passa pelo observador (seção 3.2 da spec 03):
 * um círculo (α, γ) ou uma reta pelo centro (β, linha da fachada). A região de cada proteção é a
 * interseção dos lados certos dessas curvas; a do conjunto é a união das proteções.
 *
 * Validação: traçado de raios com janela e placas reais (tests/referencia/mascara.test.ts) e casos
 * analíticos (mask.test.ts).
 */

import {
  alphaCircle,
  gammaCircle,
  toExternal,
  type AngleReference,
  type AngleValues,
  type Side,
} from '../protractor/protractor';

const RAD = Math.PI / 180;

/** Região da carta, como árvore de operações sobre semiplanos e discos. */
export type Region =
  | { kind: 'empty' }
  | { kind: 'all' }
  /** Semiplano pelo centro da carta: pontos p com p · (nx, ny) ≥ 0. */
  | { kind: 'halfPlane'; nx: number; ny: number }
  | { kind: 'disc'; cx: number; cy: number; r: number }
  | { kind: 'not'; region: Region }
  | { kind: 'and'; regions: Region[] }
  | { kind: 'or'; regions: Region[] };

/**
 * Ângulos de um conjunto de sombra (total ou parcial), na referência escolhida. Cada campo tem o
 * índice 1 e, opcionalmente, o 2 (brise afastado da parede).
 */
export interface ShadingSet {
  /** Brise horizontal: 1 = aresta externa (a partir da base), 2 = aresta interna (da verga). */
  alpha?: AngleValues;
  /** Aleta à direita: 1 = aresta externa (da aresta oposta), 2 = aresta interna (do mesmo lado). */
  betaRight?: AngleValues;
  betaLeft?: AngleValues;
  /** Limites laterais do brise horizontal. O índice 2 não altera a máscara (seção 1.6). */
  gammaRight?: AngleValues;
  gammaLeft?: AngleValues;
  /** Topo das aletas ("γ das aletas"), medido do canto superior oposto. */
  finTopRight?: AngleValues;
  finTopLeft?: AngleValues;
}

export interface MaskRegions {
  /** Sombra total (100%): a janela inteira à sombra. */
  total: Region;
  /** Região do conjunto parcial (centro da janela à sombra), sem descontar a total. */
  partialSet: Region;
  /** Sombra parcial: região do conjunto parcial menos a total. */
  partial: Region;
}

const EMPTY: Region = { kind: 'empty' };
const HORIZON: Region = { kind: 'disc', cx: 0, cy: 0, r: 1 };

function and(...regions: Region[]): Region {
  if (regions.some((r) => r.kind === 'empty')) return EMPTY;
  const rest = regions.filter((r) => r.kind !== 'all');
  if (rest.length === 0) return { kind: 'all' };
  return rest.length === 1 ? rest[0]! : { kind: 'and', regions: rest };
}

function or(...regions: Region[]): Region {
  if (regions.some((r) => r.kind === 'all')) return { kind: 'all' };
  const rest = regions.filter((r) => r.kind !== 'empty');
  if (rest.length === 0) return EMPTY;
  return rest.length === 1 ? rest[0]! : { kind: 'or', regions: rest };
}

function not(region: Region): Region {
  if (region.kind === 'empty') return { kind: 'all' };
  if (region.kind === 'all') return EMPTY;
  return { kind: 'not', region };
}

/** Semiplano dos pontos à frente de um vetor do referencial da fachada (x à direita, y na normal). */
function facadeHalfPlane(orientation: number, x: number, y: number): Region {
  const c = Math.cos(orientation * RAD);
  const s = Math.sin(orientation * RAD);
  return { kind: 'halfPlane', nx: x * c + y * s, ny: -x * s + y * c };
}

/** Semiplano dos azimutes em [az, az + 180°] (à direita da reta no azimute az, vista do centro). */
function clockwiseOf(az: number): Region {
  return { kind: 'halfPlane', nx: Math.cos(az * RAD), ny: -Math.sin(az * RAD) };
}

/** Semiplano dos azimutes em [az − 180°, az]. */
function counterclockwiseOf(az: number): Region {
  return { kind: 'halfPlane', nx: -Math.cos(az * RAD), ny: Math.sin(az * RAD) };
}

/** Sol com ângulo de perfil α_ext,sol ≥ α_ext (dentro do círculo de α), atrás da fachada incluso. */
function profileAtLeast(orientation: number, alphaExt: number): Region {
  if (alphaExt >= 90) return EMPTY;
  if (alphaExt <= 0) return { kind: 'all' };
  const c = alphaCircle(orientation, alphaExt);
  return { kind: 'disc', cx: c.centerE, cy: c.centerN, r: c.radius };
}

/** Sol do lado dado com γ_ext,sol ≥ γ_ext (dentro do círculo de γ); o outro lado fica inteiro. */
function gammaAtLeast(orientation: number, side: Side, gammaExt: number): Region {
  if (gammaExt <= 0) return { kind: 'all' };
  if (gammaExt >= 90) return EMPTY;
  const c = gammaCircle(orientation, side, gammaExt);
  return { kind: 'disc', cx: c.centerE, cy: c.centerN, r: c.radius };
}

function external(values: AngleValues | undefined, reference: AngleReference) {
  if (!values) return undefined;
  const [v1, v2] = values;
  return {
    first: toExternal(v1, reference),
    second: v2 === undefined ? undefined : toExternal(v2, reference),
  };
}

/**
 * Brise horizontal: perfil entre α1 (aresta externa) e α2 (aresta interna, se houver), limitado
 * por γ de cada lado. γ2 não entra: a aresta lateral é paralela à normal e define um plano só.
 */
function horizontalBrise(orientation: number, reference: AngleReference, set: ShadingSet): Region {
  const alpha = external(set.alpha, reference);
  if (!alpha) return EMPTY;
  const parts: Region[] = [profileAtLeast(orientation, alpha.first)];
  if (alpha.second !== undefined) parts.push(not(profileAtLeast(orientation, alpha.second)));
  const right = external(set.gammaRight, reference);
  if (right) {
    parts.push(
      or(facadeHalfPlane(orientation, -1, 0), gammaAtLeast(orientation, 'right', right.first)),
    );
  }
  const left = external(set.gammaLeft, reference);
  if (left) {
    parts.push(
      or(facadeHalfPlane(orientation, 1, 0), gammaAtLeast(orientation, 'left', left.first)),
    );
  }
  return and(...parts);
}

/**
 * Aleta vertical de um lado: ψ entre β1 (aresta externa) e β2 (aresta interna; sem índice 2, a
 * linha da fachada), abaixo do topo da aleta se o γ das aletas for dado.
 */
function fin(
  orientation: number,
  reference: AngleReference,
  side: Side,
  betaValues: AngleValues | undefined,
  topValues: AngleValues | undefined,
): Region {
  const beta = external(betaValues, reference);
  if (!beta || beta.first >= 90) return EMPTY;
  const sign = side === 'right' ? 1 : -1;
  const a1 = orientation + sign * beta.first;
  const parts: Region[] = [side === 'right' ? clockwiseOf(a1) : counterclockwiseOf(a1)];
  if (beta.second !== undefined && beta.second < 90) {
    const a2 = orientation + sign * beta.second;
    parts.push(side === 'right' ? counterclockwiseOf(a2) : clockwiseOf(a2));
  }
  const top = external(topValues, reference);
  if (top) parts.push(not(gammaAtLeast(orientation, side, top.first)));
  return and(...parts);
}

/** Região sombreada por um conjunto de ângulos: união do brise e das aletas, à frente da fachada. */
export function shadingRegion(
  orientation: number,
  reference: AngleReference,
  set: ShadingSet,
): Region {
  const devices = or(
    horizontalBrise(orientation, reference, set),
    fin(orientation, reference, 'right', set.betaRight, set.finTopRight),
    fin(orientation, reference, 'left', set.betaLeft, set.finTopLeft),
  );
  if (devices.kind === 'empty') return EMPTY;
  return and(HORIZON, facadeHalfPlane(orientation, 0, 1), devices);
}

/** Regiões de sombra total e parcial (decisão 0014). */
export function maskRegions(
  orientation: number,
  reference: AngleReference,
  total: ShadingSet,
  partial: ShadingSet = {},
): MaskRegions {
  const totalRegion = shadingRegion(orientation, reference, total);
  const partialSet = shadingRegion(orientation, reference, partial);
  return { total: totalRegion, partialSet, partial: and(partialSet, not(totalRegion)) };
}

/** O ponto (x para Leste, y para Norte, carta de raio 1) está na região? Bordas incluídas. */
export function regionContains(region: Region, x: number, y: number): boolean {
  switch (region.kind) {
    case 'empty':
      return false;
    case 'all':
      return true;
    case 'halfPlane':
      return x * region.nx + y * region.ny >= 0;
    case 'disc':
      return (x - region.cx) ** 2 + (y - region.cy) ** 2 <= region.r ** 2;
    case 'not':
      return !regionContains(region.region, x, y);
    case 'and':
      return region.regions.every((r) => regionContains(r, x, y));
    case 'or':
      return region.regions.some((r) => regionContains(r, x, y));
  }
}
