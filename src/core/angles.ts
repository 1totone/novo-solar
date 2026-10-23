/**
 * Utilidades angulares do núcleo de cálculo.
 *
 * Convenção de azimute (docs/spec): a partir do Norte geográfico, sentido horário,
 * em graus no intervalo [0, 360).
 */

const DEG_PER_RAD = 180 / Math.PI;

export function toRadians(degrees: number): number {
  return degrees / DEG_PER_RAD;
}

export function toDegrees(radians: number): number {
  return radians * DEG_PER_RAD;
}

/** Reduz um ângulo em graus ao intervalo [0, 360). */
export function normalizeDegrees(degrees: number): number {
  const r = degrees % 360;
  const n = r < 0 ? r + 360 : r;
  // Evita -0 e o caso em que r + 360 arredonda para exatamente 360.
  return n === 360 || Object.is(n, -0) ? 0 : n;
}

/** Diferença angular com sinal (b - a), em graus, no intervalo (-180, 180]. */
export function angularDifference(a: number, b: number): number {
  const d = normalizeDegrees(b - a);
  return d > 180 ? d - 360 : d;
}
