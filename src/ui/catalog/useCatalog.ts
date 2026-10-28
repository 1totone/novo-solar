import { useEffect, useState } from 'react';
import { loadCatalog, type Catalog } from './catalog';

/** Contornos das UFs projetados (scripts/catalogo/gerar_catalogo.py). */
export interface UfMap {
  fonte: string;
  projecao: { lat0: number };
  viewBox: [number, number, number, number];
  ufs: { uf: string; nome: string; d: string }[];
}

async function loadMap(): Promise<UfMap> {
  const module = await import('../data/catalogo/brasil-ufs.json');
  return module.default as unknown as UfMap;
}

/** Catálogo e mapa, carregados só quando pedidos (`active`), uma vez por sessão. */
export function useCatalog(active: boolean): {
  catalog: Catalog | null;
  map: UfMap | null;
  failed: boolean;
} {
  const [state, setState] = useState<{
    catalog: Catalog | null;
    map: UfMap | null;
    failed: boolean;
  }>({ catalog: null, map: null, failed: false });
  const loaded = state.catalog !== null;
  useEffect(() => {
    if (!active || loaded) return;
    let alive = true;
    Promise.all([loadCatalog(), loadMap()]).then(
      ([catalog, map]) => {
        if (alive) setState({ catalog, map, failed: false });
      },
      () => {
        if (alive) setState((s) => ({ ...s, failed: true }));
      },
    );
    return () => {
      alive = false;
    };
  }, [active, loaded]);
  return state;
}
