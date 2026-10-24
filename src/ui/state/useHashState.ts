import { useCallback, useSyncExternalStore } from 'react';
import { buildHash, parseHash, type HashState } from './hashState';

// Assinantes avisados de forma síncrona quando a própria aplicação muda o '#'; o evento
// 'hashchange' do navegador chega depois e cobre mudanças externas (voltar, editar o link).
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener('hashchange', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('hashchange', onChange);
  };
}

const getHash = () => window.location.hash;

/** Lê e atualiza o estado guardado no '#' da URL. */
export function useHashState(): [HashState, (patch: HashState) => void] {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  const update = useCallback((patch: HashState) => {
    const next = buildHash({ ...parseHash(window.location.hash), ...patch });
    if (next === window.location.hash) return;
    // replaceState não gera entrada no histórico a cada tecla digitada.
    history.replaceState(
      null,
      '',
      next === '' ? window.location.pathname + window.location.search : next,
    );
    for (const l of listeners) l();
  }, []);
  return [parseHash(hash), update];
}
