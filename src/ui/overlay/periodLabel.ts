import { PERIODS } from '../../core/overlay/overlay';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "16 a 31/jan" ou "22/dez a 15/jan". */
export function periodLabel(index: number): string {
  const p = PERIODS[index - 1]!;
  const m1 = MONTHS[p.first.month - 1]!;
  const m2 = MONTHS[p.last.month - 1]!;
  return p.first.month === p.last.month
    ? `${p.first.day} a ${p.last.day}/${m2}`
    : `${p.first.day}/${m1} a ${p.last.day}/${m2}`;
}
