/**
 * Rótulos da carta sem se atropelar (achado 2b da inspeção visual da Fase 4): rótulos móveis
 * (percentuais das curvas da proteção, nomes dos ângulos do dimensionamento pelo período) têm
 * posições candidatas, e cada um fica na primeira candidata que não cobre nenhum outro texto da
 * carta (horas, meses, grade, transferidor) nem um rótulo móvel já posto. Sem candidata livre,
 * fica na que cobre menos.
 */
export type Box = { x0: number; y0: number; x1: number; y1: number };

/** Posição candidata de um rótulo, em coordenadas da carta, com o alinhamento do texto. */
export type Candidate = { x: number; y: number; anchor?: 'start' | 'middle' | 'end' };

/** Área da interseção de duas caixas, depois de encolher cada uma `margin` de cada lado. */
export function overlapArea(a: Box, b: Box, margin = 0): number {
  const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) - 2 * margin;
  const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) - 2 * margin;
  return dx > 0 && dy > 0 ? dx * dy : 0;
}

/**
 * Índice da candidata escolhida: a primeira sem sobreposição com os obstáculos ou, se todas
 * cobrem algum, a de menor área coberta (a primeira, no empate).
 */
export function chooseCandidate(obstacles: readonly Box[], candidates: readonly Box[], margin = 0) {
  let best = 0;
  let bestArea = Infinity;
  for (let k = 0; k < candidates.length; k++) {
    const area = obstacles.reduce((s, o) => s + overlapArea(candidates[k]!, o, margin), 0);
    if (area === 0) return k;
    if (area < bestArea) {
      bestArea = area;
      best = k;
    }
  }
  return best;
}

/** Candidatas no texto do atributo `data-candidates`: "x,y[,anchor];x,y[,anchor];…". */
export function formatCandidates(candidates: readonly Candidate[]): string {
  return candidates
    .map((c) => [c.x.toFixed(4), c.y.toFixed(4), ...(c.anchor ? [c.anchor] : [])].join(','))
    .join(';');
}

export function parseCandidates(text: string): Candidate[] {
  return text.split(';').flatMap((part) => {
    const [x, y, anchor] = part.split(',');
    const c: Candidate = { x: Number(x), y: Number(y) };
    if (anchor === 'start' || anchor === 'middle' || anchor === 'end') c.anchor = anchor;
    return Number.isFinite(c.x) && Number.isFinite(c.y) ? [c] : [];
  });
}

/** Candidatas em volta de um ponto marcado (direita, esquerda, acima, abaixo e diagonais). */
export function aroundPoint(x: number, y: number, gap: number, rise: number): Candidate[] {
  return [
    { x: x + gap, y, anchor: 'start' },
    { x: x - gap, y, anchor: 'end' },
    { x, y: y - rise, anchor: 'middle' },
    { x, y: y + rise, anchor: 'middle' },
    { x: x + gap, y: y - rise, anchor: 'start' },
    { x: x + gap, y: y + rise, anchor: 'start' },
    { x: x - gap, y: y - rise, anchor: 'end' },
    { x: x - gap, y: y + rise, anchor: 'end' },
  ];
}
