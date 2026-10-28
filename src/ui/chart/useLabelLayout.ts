import { useLayoutEffect, type RefObject } from 'react';
import { chooseCandidate, parseCandidates, type Box, type Candidate } from './labelLayout';

/** Folga, em pixels da tela, para dois textos não contarem como sobrepostos. */
const MARGIN_PX = 0.5;

/** Última disposição de cada carta, para não medir de novo quando nada mudou (ex.: cursor). */
const cache = new WeakMap<SVGSVGElement, { key: string; choice: number[] }>();

const rectOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
};

function apply(el: SVGTextElement, c: Candidate) {
  el.setAttribute('x', String(c.x));
  el.setAttribute('y', String(c.y));
  el.style.textAnchor = c.anchor ?? '';
}

/**
 * Põe cada texto com `data-candidates` da carta na primeira posição candidata que não cobre outro
 * texto nem uma marca com `data-label-obstacle` (os pontos do sol do período, por exemplo; ver
 * labelLayout.ts). Roda depois de cada desenho, antes da pintura; mede só quando os textos
 * mudaram.
 */
export function layoutLabels(svg: SVGSVGElement) {
  const texts = [...svg.querySelectorAll('text')].filter((el) => (el.textContent ?? '') !== '');
  const movable = texts.filter((el) => el.dataset.candidates);
  if (movable.length === 0) return;
  const fixed = texts.filter((el) => !el.dataset.candidates);
  const key = [
    ...fixed.map(
      (el) =>
        `${el.getAttribute('x')},${el.getAttribute('y')},${el.textContent},${el.parentElement?.getAttribute('transform') ?? ''}`,
    ),
    ...movable.map((el) => `${el.dataset.candidates}|${el.textContent}`),
  ].join(';');
  const candidates = movable.map((el) => parseCandidates(el.dataset.candidates!));
  const cached = cache.get(svg);
  if (cached && cached.key === key) {
    movable.forEach((el, i) => apply(el, candidates[i]![cached.choice[i]!]!));
    return;
  }
  const marks = [...svg.querySelectorAll('[data-label-obstacle]')];
  const obstacles = [...fixed, ...marks].map(rectOf).filter((b) => b.x1 > b.x0 && b.y1 > b.y0);
  const choice = movable.map((el, i) => {
    const cands = candidates[i]!;
    const boxes = cands.map((c) => {
      apply(el, c);
      return rectOf(el);
    });
    const k = chooseCandidate(obstacles, boxes, MARGIN_PX);
    apply(el, cands[k]!);
    obstacles.push(boxes[k]!);
    return k;
  });
  cache.set(svg, { key, choice });
}

/** Dispõe os rótulos móveis da carta a cada desenho. */
export function useLabelLayout(ref: RefObject<SVGSVGElement | null>) {
  useLayoutEffect(() => {
    if (ref.current) layoutLabels(ref.current);
  });
}
