import {
  ADAPTIVE,
  DEFAULT_METHOD,
  type ClassificationMethod,
  type HourTemperature,
} from '../../core/comfort/classification';
import { parseDecimal } from './geometryHash';
import type { HashState } from './hashState';

/**
 * Classificação das horas (passo 7, F3.4) no '#' da URL, com o texto digitado: cm (método: a faixa
 * adaptativa, padrão; l limiares; e temperatura de equilíbrio), ca (aceitabilidade, 80 ou 90), cr
 * (média predominante: e exponencial, padrão; m aritmética), cal (α), cn (dias), cg (acréscimo por
 * ganhos ΔT, °C), tf e tq (limiares frio e quente, °C), te (temperatura de equilíbrio, °C) e ct
 * (temperatura da hora: m média do início e do fim, padrão; f fim).
 */
export type MethodKind = 'adaptive' | 'thresholds' | 'balance';

export type ClassificationField = 'alpha' | 'days' | 'gains' | 'cold' | 'hot' | 'balance';

export interface ClassificationState {
  kind: MethodKind;
  acceptability: 80 | 90;
  averaging: 'exponential' | 'arithmetic';
  mode: HourTemperature;
  raw: Record<ClassificationField, string>;
  invalid: ClassificationField[];
  /** Método pronto para o cálculo; null se faltar ou houver campo inválido. */
  method: ClassificationMethod | null;
}

const DEFAULT_RUNNING = (DEFAULT_METHOD as Extract<ClassificationMethod, { kind: 'adaptive' }>)
  .running as { averaging: 'exponential'; alpha: number; days: number };

export function classificationFromHash(state: HashState): ClassificationState {
  const kind: MethodKind =
    state.cm === 'l' ? 'thresholds' : state.cm === 'e' ? 'balance' : 'adaptive';
  const acceptability = state.ca === '90' ? 90 : 80;
  const averaging = state.cr === 'm' ? 'arithmetic' : 'exponential';
  const mode: HourTemperature = state.ct === 'f' ? 'end' : 'mean';
  const raw: Record<ClassificationField, string> = {
    alpha: state.cal ?? '',
    days: state.cn ?? '',
    gains: state.cg ?? '',
    cold: state.tf ?? '',
    hot: state.tq ?? '',
    balance: state.te ?? '',
  };
  const invalid: ClassificationField[] = [];
  const num = (field: ClassificationField) => {
    const v = parseDecimal(raw[field]);
    if (v !== undefined && Number.isNaN(v)) invalid.push(field);
    return v === undefined || Number.isNaN(v) ? undefined : v;
  };
  let method: ClassificationMethod | null = null;
  if (kind === 'adaptive') {
    const alpha = num('alpha') ?? DEFAULT_RUNNING.alpha;
    const days = num('days') ?? (averaging === 'exponential' ? DEFAULT_RUNNING.days : 7);
    const gains = num('gains') ?? 0;
    if (
      averaging === 'exponential' &&
      !(alpha >= ADAPTIVE.minAlpha && alpha <= ADAPTIVE.maxAlpha)
    ) {
      if (!invalid.includes('alpha')) invalid.push('alpha');
    }
    if (!(Number.isInteger(days) && days >= ADAPTIVE.minDays && days <= ADAPTIVE.maxDays)) {
      if (!invalid.includes('days')) invalid.push('days');
    }
    if (!(Math.abs(gains) <= 10)) {
      if (!invalid.includes('gains')) invalid.push('gains');
    }
    if (invalid.length === 0) {
      method = {
        kind: 'adaptive',
        acceptability,
        running:
          averaging === 'exponential'
            ? { averaging: 'exponential', alpha, days }
            : { averaging: 'arithmetic', days },
        gains,
      };
    }
  } else if (kind === 'thresholds') {
    const cold = num('cold');
    const hot = num('hot');
    if (cold !== undefined && hot !== undefined && cold > hot) invalid.push('cold', 'hot');
    if (invalid.length === 0 && (cold !== undefined || hot !== undefined)) {
      method = { kind: 'thresholds', cold: cold ?? null, hot: hot ?? null };
    }
  } else {
    const balance = num('balance');
    if (invalid.length === 0 && balance !== undefined) method = { kind: 'balance', balance };
  }
  return { kind, acceptability, averaging, mode, raw, invalid, method };
}

/** Patch que troca o método, sem apagar os valores digitados nos outros. */
export const methodPatch = (kind: MethodKind) => ({
  cm: kind === 'adaptive' ? '' : kind === 'thresholds' ? 'l' : 'e',
});

/** Chave curta do método (para memorizar a classificação). */
export const methodKey = (s: ClassificationState) => JSON.stringify([s.method, s.mode]);
