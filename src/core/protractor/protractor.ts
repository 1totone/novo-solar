/**
 * Transferidor de ângulos de sombra (F2.2).
 *
 * Especificação: docs/spec/01-convencoes-geometricas.md (seções 1.2 a 1.4) e
 * docs/spec/03-projecoes.md (seção 3.3). Coordenadas da carta de raio 1: x para Leste, y para
 * Norte (as mesmas de stereographic.ts). Ângulos em graus.
 *
 * Validação: casos analíticos (protractor.test.ts) e regressão contra o SOL-AR 6.2
 * (tests/referencia/transferidor62.test.ts).
 */

const RAD = Math.PI / 180;

export type AngleReference = 'internal' | 'external';
export type Side = 'right' | 'left';

/** Valores digitados para cada ângulo: [índice 1, índice 2 opcional]. */
export type AngleValues = readonly [number, number?];

export interface ProtractorAngles {
  alpha?: AngleValues;
  betaRight?: AngleValues;
  betaLeft?: AngleValues;
  gammaRight?: AngleValues;
  gammaLeft?: AngleValues;
}

export interface Circle {
  kind: 'circle';
  centerE: number;
  centerN: number;
  radius: number;
}

export interface Ray {
  kind: 'ray';
  /** Azimute da reta que sai do centro da carta (Norte, sentido horário), [0, 360). */
  azimuth: number;
}

export interface ProtractorCurve {
  family: 'alpha' | 'beta' | 'gamma';
  side?: Side;
  index: 1 | 2;
  /** Ângulo na referência externa (α a partir da horizontal, β da normal, γ da horizontal). */
  externalAngle: number;
  geometry: Circle | Ray;
}

function mod360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r + 0;
}

/** Ângulo na referência externa: externo = 90° − interno (decisão 0011). */
export function toExternal(angle: number, reference: AngleReference): number {
  return reference === 'internal' ? 90 - angle : angle;
}

/** Converte um vetor do referencial da fachada (x à direita, y na normal) para (Leste, Norte). */
function facadeToMap(orientation: number, x: number, y: number): { e: number; n: number } {
  const c = Math.cos(orientation * RAD);
  const s = Math.sin(orientation * RAD);
  return { e: x * c + y * s, n: -x * s + y * c };
}

/** Curva de α (ângulo de perfil α_ext): centro (0, −tan α) no referencial da fachada, raio 1/cos α. */
export function alphaCircle(orientation: number, alphaExt: number): Circle {
  const d = Math.tan(alphaExt * RAD);
  const c = facadeToMap(orientation, 0, -d);
  return { kind: 'circle', centerE: c.e, centerN: c.n, radius: 1 / Math.cos(alphaExt * RAD) };
}

/** Curva de γ do lado dado: centro (∓tan γ, 0) no referencial da fachada, raio 1/cos γ. */
export function gammaCircle(orientation: number, side: Side, gammaExt: number): Circle {
  const d = Math.tan(gammaExt * RAD);
  const c = facadeToMap(orientation, side === 'right' ? -d : d, 0);
  return { kind: 'circle', centerE: c.e, centerN: c.n, radius: 1 / Math.cos(gammaExt * RAD) };
}

/** Reta de β: azimuth = orientação ± β_ext (direita: sentido horário a partir da normal). */
export function betaRayAzimuth(orientation: number, side: Side, betaExt: number): number {
  return mod360(orientation + (side === 'right' ? betaExt : -betaExt));
}

/**
 * Valores externos dos índices 1 e 2, do menor para o maior, como o SOL-AR 6.2 os desenha.
 * Sem índice 2, β ganha a linha da fachada (90°) como segundo limite; α e γ ficam com uma curva.
 */
function externalPair(
  values: AngleValues,
  reference: AngleReference,
  closeWithFacade: boolean,
): number[] {
  const [v1, v2] = values;
  const a = toExternal(v1, reference);
  if (v2 === undefined) return closeWithFacade ? [a, 90] : [a];
  return [a, toExternal(v2, reference)].sort((x, y) => x - y);
}

/** Todas as curvas do transferidor para uma fachada e os ângulos digitados. */
export function protractorCurves(
  orientation: number,
  reference: AngleReference,
  angles: ProtractorAngles,
): ProtractorCurve[] {
  const out: ProtractorCurve[] = [];
  const index = (k: number) => (k === 0 ? 1 : 2) as 1 | 2;
  if (angles.alpha) {
    externalPair(angles.alpha, reference, false).forEach((a, k) =>
      out.push({
        family: 'alpha',
        index: index(k),
        externalAngle: a,
        geometry: alphaCircle(orientation, a),
      }),
    );
  }
  for (const [side, values] of [
    ['right', angles.betaRight],
    ['left', angles.betaLeft],
  ] as const) {
    if (!values) continue;
    externalPair(values, reference, true).forEach((b, k) =>
      out.push({
        family: 'beta',
        side,
        index: index(k),
        externalAngle: b,
        geometry: { kind: 'ray', azimuth: betaRayAzimuth(orientation, side, b) },
      }),
    );
  }
  for (const [side, values] of [
    ['right', angles.gammaRight],
    ['left', angles.gammaLeft],
  ] as const) {
    if (!values) continue;
    externalPair(values, reference, false).forEach((g, k) =>
      out.push({
        family: 'gamma',
        side,
        index: index(k),
        externalAngle: g,
        geometry: gammaCircle(orientation, side, g),
      }),
    );
  }
  return out;
}

export interface ProtractorGrid {
  /** Curvas de α de 5° em 5° (5° a 85°). */
  alpha: { externalAngle: number; circle: Circle }[];
  /** Azimutes das retas de β de 10° em 10°, a partir da normal (36 retas, ou 18 diâmetros). */
  betaAzimuths: number[];
  /** Azimute da normal externa e das duas pontas da linha da fachada. */
  normalAzimuth: number;
  facadeAzimuths: [number, number];
}

/** Grade de fundo do transferidor, como a do SOL-AR 6.2. */
export function protractorGrid(orientation: number): ProtractorGrid {
  const alpha = Array.from({ length: 17 }, (_, k) => {
    const a = 5 + 5 * k;
    return { externalAngle: a, circle: alphaCircle(orientation, a) };
  });
  const betaAzimuths = Array.from({ length: 36 }, (_, k) => mod360(orientation + 10 * k));
  return {
    alpha,
    betaAzimuths,
    normalAzimuth: mod360(orientation),
    facadeAzimuths: [mod360(orientation - 90), mod360(orientation + 90)],
  };
}
