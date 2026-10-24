import type { AngleReference, ProtractorAngles } from '../../core/protractor/protractor';
import type { HashState } from './hashState';

/**
 * Fachada e ângulos no '#' da URL: o (orientação), tr=0 (transferidor oculto), ref=e (externa),
 * a1, a2, bd1, bd2, be1, be2, gd1, gd2, ge1, ge2 (α; β e γ à direita e à esquerda; índices 1 e 2).
 */
export const ANGLE_KEYS = [
  'a1',
  'a2',
  'bd1',
  'bd2',
  'be1',
  'be2',
  'gd1',
  'gd2',
  'ge1',
  'ge2',
] as const;
export type AngleKey = (typeof ANGLE_KEYS)[number];

export interface ProtractorState {
  orientation: number;
  /** Texto digitado da orientação, inválido se não for número. */
  orientationValid: boolean;
  show: boolean;
  reference: AngleReference;
  angles: ProtractorAngles;
  /** Campos com valor digitado fora de 0° a 90° ou não numérico. */
  invalid: AngleKey[];
}

function parseNumber(text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === '') return undefined;
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function protractorFromHash(state: HashState): ProtractorState {
  const o = parseNumber(state.o);
  const invalid: AngleKey[] = [];
  const value = (k: AngleKey): number | undefined => {
    const v = parseNumber(state[k]);
    if (v === undefined) return undefined;
    if (Number.isNaN(v) || v < 0 || v > 90) {
      invalid.push(k);
      return undefined;
    }
    return v;
  };
  const pair = (k1: AngleKey, k2: AngleKey): [number, number?] | undefined => {
    const v1 = value(k1);
    const v2 = value(k2);
    if (v1 === undefined) return undefined;
    return v2 === undefined ? [v1] : [v1, v2];
  };
  return {
    orientation: o === undefined || Number.isNaN(o) ? 0 : o,
    orientationValid: o === undefined || !Number.isNaN(o),
    show: state.tr !== '0',
    reference: state.ref === 'e' ? 'external' : 'internal',
    angles: {
      alpha: pair('a1', 'a2'),
      betaRight: pair('bd1', 'bd2'),
      betaLeft: pair('be1', 'be2'),
      gammaRight: pair('gd1', 'gd2'),
      gammaLeft: pair('ge1', 'ge2'),
    },
    invalid,
  };
}
