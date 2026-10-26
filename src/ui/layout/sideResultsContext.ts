import { createContext, useEffect, useState } from 'react';

/**
 * Resultados ao lado (decisão 0038): no computador, com duas colunas e a aba da carta aberta, os
 * resultados pesados dos passos (mapa mês × hora do passo 6, classificação e indicadores do
 * passo 7) aparecem no painel da direita, abaixo da carta, em vez de espremidos na coluna dos
 * passos. No celular, e nas abas da vista 3D e da rosa, ficam onde estavam.
 */
export type SideSlotName = 'annual' | 'effect';

type Slots = Partial<Record<SideSlotName, HTMLElement | null>>;

export const SideResultsContext = createContext<Slots>({});

export const SideResultsProvider = SideResultsContext.Provider;

/** Largura a partir da qual a página tem duas colunas (a mesma de `styles.css`). */
export const WIDE_QUERY = '(min-width: 52rem)';

/** Verdadeiro com a página em duas colunas; acompanha a largura da janela. */
export function useWideLayout(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(WIDE_QUERY).matches === true,
  );
  useEffect(() => {
    const query = window.matchMedia?.(WIDE_QUERY);
    if (!query) return;
    const update = () => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
}
