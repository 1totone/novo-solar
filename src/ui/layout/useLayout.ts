import { useEffect, useState } from 'react';

/**
 * Leiaute da página pela largura da janela (decisão 0050):
 * - `wide`, a partir de 75rem (1200 px): a janela inteira, sem rolagem da página, em três colunas
 *   (passos 1 a 3, a carta, passos 4 a 7);
 * - `medium`, de 52rem a 75rem: duas colunas (os passos, a carta), ainda sem rolagem da página;
 * - `mobile`, abaixo de 52rem: a carta fixa no topo e os passos em acordeão por baixo (decisões
 *   0013 e 0044).
 */
export type Layout = 'mobile' | 'medium' | 'wide';

/** Larguras dos leiautes (as mesmas de `styles.css`). */
export const MEDIUM_QUERY = '(min-width: 52rem)';
export const WIDE_QUERY = '(min-width: 75rem)';

function currentLayout(): Layout {
  if (typeof window === 'undefined' || !window.matchMedia) return 'wide';
  if (window.matchMedia(WIDE_QUERY).matches) return 'wide';
  return window.matchMedia(MEDIUM_QUERY).matches ? 'medium' : 'mobile';
}

/** O leiaute de agora; acompanha a largura da janela. */
export function useLayout(): Layout {
  const [layout, setLayout] = useState(currentLayout);
  useEffect(() => {
    if (!window.matchMedia) return;
    const queries = [window.matchMedia(MEDIUM_QUERY), window.matchMedia(WIDE_QUERY)];
    const update = () => setLayout(currentLayout());
    update();
    for (const q of queries) q.addEventListener('change', update);
    return () => {
      for (const q of queries) q.removeEventListener('change', update);
    };
  }, []);
  return layout;
}
