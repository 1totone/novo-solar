import {
  formatPiece,
  geometryFromHash,
  MAX_PIECES,
  pieceKey,
  type GeometryState,
} from './geometryHash';
import type { HashState } from './hashState';

/**
 * Alternativas de proteção guardadas (passo 7, F3.5) no '#' da URL: alter1 a alter6, cada uma como
 * "nome|largura|altura|recuo|peça1~peça2~...", com o texto da janela e das peças do passo 6 (o
 * mesmo das chaves jl, ja, jr e pc1 a pc9).
 */
export const MAX_ALTERNATIVES = 6;

export interface AlternativeState {
  /** Chave no link (alter1 a alter6). */
  key: string;
  label: string;
  /** Texto guardado (para comparar com a proteção atual). */
  code: string;
  geometry: GeometryState;
}

const altKey = (i: number) => `alter${i + 1}`;
const clean = (v: string) => v.replaceAll('|', '').replaceAll('~', '');

/** Texto da proteção do passo 6 (sem o nome). */
export function geometryCode(state: HashState): string {
  const pieces: string[] = [];
  for (let i = 0; i < MAX_PIECES; i++) {
    const p = state[pieceKey(i)];
    if (p) pieces.push(clean(p));
  }
  return [...[state.jl ?? '', state.ja ?? '', state.jr ?? ''].map(clean), pieces.join('~')].join(
    '|',
  );
}

/** Estado do passo 6 equivalente a um texto de proteção. */
function hashOfCode(code: string): HashState {
  const [jl = '', ja = '', jr = '', pieces = ''] = code.split('|');
  const state: HashState = { jl, ja, jr };
  pieces
    .split('~')
    .filter(Boolean)
    .slice(0, MAX_PIECES)
    .forEach((p, i) => (state[pieceKey(i)] = p));
  return state;
}

export function alternativesFromHash(state: HashState): AlternativeState[] {
  const out: AlternativeState[] = [];
  for (let i = 0; i < MAX_ALTERNATIVES; i++) {
    const text = state[altKey(i)];
    if (!text) continue;
    const bar = text.indexOf('|');
    if (bar < 0) continue;
    const label = text.slice(0, bar);
    const code = text.slice(bar + 1);
    out.push({ key: altKey(i), label, code, geometry: geometryFromHash(hashOfCode(code)) });
  }
  return out;
}

/** Patch que grava a lista de alternativas em alter1, alter2, ... e apaga as chaves que sobrarem. */
export function alternativesPatch(list: readonly { label: string; code: string }[]): HashState {
  const patch: HashState = {};
  for (let i = 0; i < MAX_ALTERNATIVES; i++) {
    const a = list[i];
    patch[altKey(i)] = a ? `${clean(a.label).trim() || `Alternativa ${i + 1}`}|${a.code}` : '';
  }
  return patch;
}

/** Patch que leva uma alternativa para o passo 6 (janela e peças). */
export function applyAlternativePatch(code: string): HashState {
  const state = hashOfCode(code);
  const patch: HashState = { jl: state.jl ?? '', ja: state.ja ?? '', jr: state.jr ?? '' };
  for (let i = 0; i < MAX_PIECES; i++) patch[pieceKey(i)] = state[pieceKey(i)] ?? '';
  return patch;
}

export { formatPiece };
