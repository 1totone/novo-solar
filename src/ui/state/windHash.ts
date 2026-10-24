import type { DayPeriodKey, SeasonKey } from '../../core/wind/windRose';
import type { HashState } from './hashState';

/**
 * Aba e rosa dos ventos no '#' da URL: aba=rosa (ausente = carta), setores=16 (padrão 8, como no
 * SOL-AR 6.2), estacao (dez-fev, mar-mai, jun-ago, set-nov), periodo (madrugada, manha, tarde,
 * noite) e rosa=vel (velocidade média por setor em vez da frequência).
 */
export const SEASON_KEYS: readonly SeasonKey[] = ['dez-fev', 'mar-mai', 'jun-ago', 'set-nov'];
export const DAY_PERIOD_KEYS: readonly DayPeriodKey[] = ['madrugada', 'manha', 'tarde', 'noite'];

export interface WindState {
  tab: 'chart' | 'rose';
  sectors: 8 | 16;
  season?: SeasonKey;
  period?: DayPeriodKey;
  show: 'frequency' | 'speed';
}

export function windFromHash(state: HashState): WindState {
  return {
    tab: state.aba === 'rosa' ? 'rose' : 'chart',
    sectors: state.setores === '16' ? 16 : 8,
    season: SEASON_KEYS.find((s) => s === state.estacao),
    period: DAY_PERIOD_KEYS.find((p) => p === state.periodo),
    show: state.rosa === 'vel' ? 'speed' : 'frequency',
  };
}
