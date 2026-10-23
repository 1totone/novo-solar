/**
 * Estado da aplicação na URL, depois do '#', no formato chave=valor&chave=valor.
 * O '#' nunca chega ao servidor, então o mesmo link funciona em qualquer hospedagem
 * estática, sem rotas de servidor (decisão 0004).
 */
export type HashState = Record<string, string>;

export function parseHash(hash: string): HashState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const state: HashState = {};
  for (const [key, value] of params) {
    if (key !== '') state[key] = value;
  }
  return state;
}

/** Serializa o estado em ordem alfabética de chaves (links estáveis); valores vazios são omitidos. */
export function buildHash(state: HashState): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(state).sort()) {
    const value = state[key];
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const s = params.toString();
  return s === '' ? '' : `#${s}`;
}
