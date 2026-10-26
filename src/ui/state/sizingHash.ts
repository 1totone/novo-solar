import type { DayOfYear, ShadingPeriod } from '../../core/shading/inverse';
import { parseDecimal } from './geometryHash';
import type { HashState } from './hashState';

/**
 * Dimensionamento pelo período (passo 6, F3.6) no '#' da URL, com o texto digitado: dpi e dpf
 * (primeiro e último dia, "dd/mm"), dhi e dhf (primeira e última hora), dtb (l: hora legal; padrão,
 * hora solar), dbg (afastamento do brise, m) e dbn (número de lâminas da subdivisão).
 */
export type SizingField = 'start' | 'end' | 'startHour' | 'endHour' | 'gap' | 'count';

const KEYS: Record<SizingField, string> = {
  start: 'dpi',
  end: 'dpf',
  startHour: 'dhi',
  endHour: 'dhf',
  gap: 'dbg',
  count: 'dbn',
};

export interface SizingState {
  /** Há período no link. */
  defined: boolean;
  timeBase: 'solar' | 'legal';
  raw: Record<SizingField, string>;
  invalid: SizingField[];
  /** Período pronto para o cálculo; null se algum campo for inválido. */
  period: ShadingPeriod | null;
  gap: number;
  count: number;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Dia "dd/mm" (também "dd-mm" ou "dd.mm"); null se inválido. */
export function parseDay(text: string): DayOfYear | null {
  const m = /^\s*(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*$/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1]!)) return null;
  return { month, day };
}

export function sizingFromHash(state: HashState): SizingState {
  const raw = Object.fromEntries(
    (Object.keys(KEYS) as SizingField[]).map((f) => [f, state[KEYS[f]] ?? '']),
  ) as Record<SizingField, string>;
  const defined = raw.start !== '' || raw.end !== '';
  const invalid: SizingField[] = [];
  const start = parseDay(raw.start);
  const end = parseDay(raw.end);
  if (!start) invalid.push('start');
  if (!end) invalid.push('end');
  const hour = (f: 'startHour' | 'endHour', fallback: number) => {
    const v = parseDecimal(raw[f]);
    if (v === undefined) return fallback;
    if (Number.isNaN(v) || v < 0 || v > 24) {
      invalid.push(f);
      return fallback;
    }
    return v;
  };
  const startHour = hour('startHour', 9);
  const endHour = hour('endHour', 15);
  if (startHour > endHour && !invalid.includes('startHour') && !invalid.includes('endHour')) {
    invalid.push('startHour', 'endHour');
  }
  const gapValue = parseDecimal(raw.gap);
  const gap = gapValue === undefined ? 0 : gapValue;
  if (Number.isNaN(gap) || gap < 0) invalid.push('gap');
  const countValue = parseDecimal(raw.count);
  const count = countValue === undefined ? 1 : countValue;
  if (!(Number.isInteger(count) && count >= 1 && count <= 20)) invalid.push('count');
  const timeBase = state.dtb === 'l' ? 'legal' : 'solar';
  return {
    defined,
    timeBase,
    raw,
    invalid,
    period:
      start && end && invalid.length === 0 ? { start, end, startHour, endHour, timeBase } : null,
    gap: Number.isNaN(gap) ? 0 : gap,
    count: Number.isInteger(count) ? count : 1,
  };
}

export const sizingKeyOf = (f: SizingField) => KEYS[f];

/** Período inicial: o verão (21/10 a 21/2), das 9 às 15 h solares. */
export const SUMMER: HashState = { dpi: '21/10', dpf: '21/2', dhi: '9', dhf: '15' };
