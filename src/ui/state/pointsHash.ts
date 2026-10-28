import type { HashState } from './hashState';

/**
 * Pontos marcados na carta (decisão 0051) no '#' da URL: pm1, pm2 e pm3, um por número, como
 * "altura_azimute" em graus, com ponto decimal e até uma casa (0,1° é cerca de 0,3 px numa carta
 * de 600 px). O número de cada ponto fica fixo: remover o 2 não renumera o 3, e o próximo ponto
 * marcado ocupa o menor número livre.
 */
export const MAX_POINTS = 3;

export type PointNumber = 1 | 2 | 3;

export const POINT_NUMBERS: readonly PointNumber[] = [1, 2, 3];

export interface MarkedPoint {
  n: PointNumber;
  /** Altura, de 0° a 90°. */
  altitude: number;
  /** Azimute a partir do Norte, sentido horário, em [0°, 360°). */
  azimuth: number;
}

const key = (n: PointNumber) => `pm${n}`;

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Azimute em [0°, 360°), com uma casa (359,96° vira 0°). */
function normalizeAzimuth(azimuth: number): number {
  const a = round1((((azimuth % 360) + 360) % 360) + 0);
  return a >= 360 ? 0 : a;
}

/** Pontos do link, em ordem de número; valores fora do céu ou ilegíveis ficam de fora. */
export function pointsFromHash(state: HashState): MarkedPoint[] {
  const out: MarkedPoint[] = [];
  for (const n of POINT_NUMBERS) {
    const parts = state[key(n)]?.split('_');
    if (parts?.length !== 2) continue;
    const [altitude, azimuth] = parts.map(Number) as [number, number];
    if (!Number.isFinite(altitude) || !Number.isFinite(azimuth)) continue;
    if (altitude < 0 || altitude > 90) continue;
    out.push({ n, altitude: round1(altitude), azimuth: normalizeAzimuth(azimuth) });
  }
  return out;
}

/** Menor número livre; null com os três ocupados. */
export function nextPointNumber(points: readonly MarkedPoint[]): PointNumber | null {
  return POINT_NUMBERS.find((n) => !points.some((p) => p.n === n)) ?? null;
}

/** Marca (ou, com null, remove) o ponto de número n. */
export function pointPatch(
  n: PointNumber,
  direction: { altitude: number; azimuth: number } | null,
): HashState {
  if (!direction) return { [key(n)]: '' };
  const altitude = Math.min(90, Math.max(0, round1(direction.altitude)));
  return { [key(n)]: `${altitude}_${normalizeAzimuth(direction.azimuth)}` };
}

/** Remove os três pontos. */
export function clearPointsPatch(): HashState {
  return Object.fromEntries(POINT_NUMBERS.map((n) => [key(n), '']));
}
