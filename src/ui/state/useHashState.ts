import { useCallback, useSyncExternalStore } from 'react';
import { buildHash, parseHash, type HashState } from './hashState';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getHash = () => window.location.hash;

/** Lê e atualiza o estado guardado no '#' da URL. */
export function useHashState(): [HashState, (patch: HashState) => void] {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  const update = useCallback((patch: HashState) => {
    const next = buildHash({ ...parseHash(window.location.hash), ...patch });
    if (next === window.location.hash) return;
    if (next === '') {
      // Remove o '#' sem recarregar a página e avisa os assinantes.
      history.replaceState(null, '', window.location.pathname + window.location.search);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = next;
    }
  }, []);
  return [parseHash(hash), update];
}
