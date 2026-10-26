import {
  ADAPTIVE,
  ADAPTIVE_DEFAULT,
  SHADING_THRESHOLD,
  type ClassificationMethod,
  type HourTemperature,
} from '../../core/comfort/classification';
import { parseDecimal } from './geometryHash';
import type { HashState } from './hashState';

/**
 * Classificação das horas (passo 7, F3.4) no '#' da URL, com o texto digitado: cm (método: em
 * branco, o padrão, limiar de 20 °C da decisão 0024; a faixa adaptativa; l limiares digitados; e
 * temperatura de equilíbrio), ca (aceitabilidade, 80 ou 90), cr (média predominante: e exponencial,
 * padrão; m aritmética), cal (α), cn (dias), cg (acréscimo por ganhos ΔT, °C), tf e tq (limiares
 * frio e quente, °C), te (temperatura de equilíbrio, °C) e ct (temperatura da hora: m média do
 * início e do fim, padrão; f fim).
 *
 * Até a decisão 0024, sem cm valia a faixa adaptativa: um link sem cm e com uma chave só dela (ca,
 * cr, cal, cn ou cg) continua abrindo a faixa adaptativa.
 */
export type MethodKind = 'adaptive' | 'thresholds' | 'balance';

export type ClassificationField = 'alpha' | 'days' | 'gains' | 'cold' | 'hot' | 'balance';

export interface ClassificationState {
  kind: MethodKind;
  /** Limiar padrão de 20 °C, sem cm no link: os campos mostram 20 e não ficam em branco. */
  preset: boolean;
  acceptability: 80 | 90;
  averaging: 'exponential' | 'arithmetic';
  mode: HourTemperature;
  raw: Record<ClassificationField, string>;
  invalid: ClassificationField[];
  /** Método pronto para o cálculo; null se faltar ou houver campo inválido. */
  method: ClassificationMethod | null;
}

export const FIELD_KEY: Record<ClassificationField, string> = {
  alpha: 'cal',
  days: 'cn',
  gains: 'cg',
  cold: 'tf',
  hot: 'tq',
  balance: 'te',
};

/** Chaves que só a faixa adaptativa usa. */
const ADAPTIVE_KEYS = ['ca', 'cr', 'cal', 'cn', 'cg'];
const DEFAULT_RUNNING = ADAPTIVE_DEFAULT.running as {
  averaging: 'exponential';
  alpha: number;
  days: number;
};
const THRESHOLD_TEXT = String(SHADING_THRESHOLD);

function methodKind(state: HashState): MethodKind {
  if (state.cm === 'a') return 'adaptive';
  if (state.cm === 'l') return 'thresholds';
  if (state.cm === 'e') return 'balance';
  return ADAPTIVE_KEYS.some((k) => state[k]) ? 'adaptive' : 'thresholds';
}

export function classificationFromHash(state: HashState): ClassificationState {
  const kind = methodKind(state);
  const preset = kind === 'thresholds' && state.cm !== 'l';
  const acceptability = state.ca === '90' ? 90 : 80;
  const averaging = state.cr === 'm' ? 'arithmetic' : 'exponential';
  const mode: HourTemperature = state.ct === 'f' ? 'end' : 'mean';
  const raw: Record<ClassificationField, string> = {
    alpha: state.cal ?? '',
    days: state.cn ?? '',
    gains: state.cg ?? '',
    cold: state.tf ?? (preset ? THRESHOLD_TEXT : ''),
    hot: state.tq ?? (preset ? THRESHOLD_TEXT : ''),
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
  return { kind, preset, acceptability, averaging, mode, raw, invalid, method };
}

/**
 * Patch que troca o método, sem apagar os valores digitados nos outros. Voltar aos limiares sem
 * nada digitado grava os 20 °C do padrão (sem cm, chaves da faixa adaptativa a reabririam).
 */
export function methodPatch(kind: MethodKind, state: HashState): HashState {
  if (kind === 'adaptive') return { cm: 'a' };
  if (kind === 'balance') return { cm: 'e' };
  if (state.tf || state.tq) return { cm: 'l' };
  return { cm: 'l', tf: THRESHOLD_TEXT, tq: THRESHOLD_TEXT };
}

/**
 * Patch de um campo digitado. A partir do padrão (sem cm), editar um limiar grava cm=l e o outro
 * limiar como está, para que apagar um campo depois signifique "sem limite" e não "20 °C".
 */
export function fieldPatch(
  s: ClassificationState,
  field: ClassificationField,
  value: string,
): HashState {
  if (s.preset && (field === 'cold' || field === 'hot')) {
    const other: ClassificationField = field === 'cold' ? 'hot' : 'cold';
    return { cm: 'l', [FIELD_KEY[field]]: value, [FIELD_KEY[other]]: s.raw[other] };
  }
  return { [FIELD_KEY[field]]: value };
}

/** Chave curta do método (para memorizar a classificação). */
export const methodKey = (s: ClassificationState) => JSON.stringify([s.method, s.mode]);
