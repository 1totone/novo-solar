import { PERIODS } from '../../core/overlay/overlay';
import type { I18n } from '../i18n/useI18n';

/** "16 a 31/jan" ou "22/dez a 15/jan", no idioma da interface. */
export function periodLabel(index: number, t: I18n['t']): string {
  const p = PERIODS[index - 1]!;
  const months = t('chart.monthsShort').split(',');
  const m1 = months[p.first.month - 1]!;
  const m2 = months[p.last.month - 1]!;
  return p.first.month === p.last.month
    ? t('period.sameMonth', { from: p.first.day, to: p.last.day, month: m2 })
    : t('period.twoMonths', { from: p.first.day, fromMonth: m1, to: p.last.day, toMonth: m2 });
}
