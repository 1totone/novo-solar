/**
 * Diferença entre dois climas na mesma carta (F4.2, spec 05, seção 5.5): a média de cada célula
 * em B menos a média em A, na mesma quinzena e hora do arquivo.
 */
import type { CellStats, OverlayQuantity } from './overlay';

/** Estatística da célula na diferença: `mean` é B − A; `a` e `b`, as médias de cada clima. */
export interface DifferenceStats extends CellStats {
  a: number;
  b: number;
}

/**
 * Diferença célula a célula. Só entram as células com valor nos dois climas; `n` é o menor número
 * de horas dos dois. Cada média é a das horas válidas do próprio arquivo.
 */
export function cellDifference(
  a: ReadonlyMap<string, CellStats>,
  b: ReadonlyMap<string, CellStats>,
): Map<string, DifferenceStats> {
  const out = new Map<string, DifferenceStats>();
  for (const [key, sb] of b) {
    const sa = a.get(key);
    if (!sa) continue;
    const d = sb.mean - sa.mean;
    out.set(key, { n: Math.min(sa.n, sb.n), mean: d, min: d, max: d, a: sa.mean, b: sb.mean });
  }
  return out;
}

/**
 * Faixas da diferença (proposta da spec 05, seção 5.5): simétricas em torno de zero, com a faixa
 * do meio para as diferenças pequenas.
 */
export const DIFFERENCE_BANDS: Record<OverlayQuantity, readonly number[]> = {
  dryBulb: [-2, -0.5, 0.5, 2],
  relativeHumidity: [-10, -3, 3, 10],
  globalHorizontal: [-100, -25, 25, 100],
  directNormal: [-100, -25, 25, 100],
  diffuseHorizontal: [-50, -15, 15, 50],
};

/** Mesmo local para a diferença: até 0,1° de latitude e de longitude e o mesmo fuso. */
export function sameLocation(
  a: { latitude: number; longitude: number; timeZone: number },
  b: { latitude: number; longitude: number; timeZone: number },
): boolean {
  return (
    Math.abs(a.latitude - b.latitude) <= 0.1 &&
    Math.abs(a.longitude - b.longitude) <= 0.1 &&
    a.timeZone === b.timeZone
  );
}
