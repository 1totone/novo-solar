import {
  HEIGHT_RANGE,
  STATION,
  windSpeedFactor,
  type TerrainKey,
} from '../../core/wind/windProfile';
import type { DayPeriodKey, SeasonKey, ThermalFilter } from '../../core/wind/windRose';
import { parseDecimal } from './geometryHash';
import type { HashState } from './hashState';

/**
 * Aba e rosa dos ventos no '#' da URL: aba=rosa ou aba=3d (ausente = carta), setores=16 (padrão 8, como no
 * SOL-AR 6.2), estacao (dez-fev, mar-mai, jun-ago, set-nov), periodo (madrugada, manha, tarde,
 * noite) e rosa=vel (velocidade média por setor em vez da frequência). Vento avançado (F4.4,
 * decisão 0027): vh (condição térmica: q quentes, f frias, n neutras), va (altura em m, com o texto
 * digitado) e vt (terreno: s subúrbio, c cidade, a água; em branco, campo aberto).
 */
export const SEASON_KEYS: readonly SeasonKey[] = ['dez-fev', 'mar-mai', 'jun-ago', 'set-nov'];
export const DAY_PERIOD_KEYS: readonly DayPeriodKey[] = ['madrugada', 'manha', 'tarde', 'noite'];
export type ThermalKey = ThermalFilter['keep'];
export const THERMAL_KEYS: readonly ThermalKey[] = ['hot', 'cold', 'neutral'];
export const TERRAIN_KEYS: readonly TerrainKey[] = ['country', 'suburbs', 'city', 'ocean'];

const THERMAL_CODE: Record<ThermalKey, string> = { hot: 'q', cold: 'f', neutral: 'n' };
const TERRAIN_CODE: Record<TerrainKey, string> = {
  country: '',
  suburbs: 's',
  city: 'c',
  ocean: 'a',
};

export interface WindState {
  tab: 'chart' | 'rose' | '3d';
  sectors: 8 | 16;
  season?: SeasonKey;
  period?: DayPeriodKey;
  show: 'frequency' | 'speed';
  thermal?: ThermalKey;
  /** Altura como digitada (va). */
  heightText: string;
  /** Altura em uso (m): a digitada, se válida, ou a da estação. */
  height: number;
  heightInvalid: boolean;
  terrain: TerrainKey;
  /** Fator da altura e do terreno (spec 06, seção 6.7); 1 com a altura inválida. */
  speedFactor: number;
  /** A correção muda a velocidade (fora da própria estação, com a altura válida). */
  corrected: boolean;
  /** O link traz uma chave do vento avançado: o grupo "Mais opções" abre sozinho. */
  advanced: boolean;
}

export function windFromHash(state: HashState): WindState {
  const thermal = THERMAL_KEYS.find((k) => THERMAL_CODE[k] === state.vh);
  const terrain =
    TERRAIN_KEYS.find((k) => k !== 'country' && TERRAIN_CODE[k] === state.vt) ?? 'country';
  const heightText = state.va ?? '';
  const typed = parseDecimal(heightText);
  const heightInvalid =
    typed !== undefined && !(typed >= HEIGHT_RANGE.min && typed <= HEIGHT_RANGE.max);
  const height = typed === undefined || heightInvalid ? STATION.height : typed;
  const speedFactor = heightInvalid ? 1 : windSpeedFactor(height, terrain);
  return {
    tab: state.aba === 'rosa' ? 'rose' : state.aba === '3d' ? '3d' : 'chart',
    sectors: state.setores === '16' ? 16 : 8,
    season: SEASON_KEYS.find((s) => s === state.estacao),
    period: DAY_PERIOD_KEYS.find((p) => p === state.periodo),
    show: state.rosa === 'vel' ? 'speed' : 'frequency',
    thermal,
    heightText,
    height,
    heightInvalid,
    terrain,
    speedFactor,
    corrected: speedFactor !== 1,
    advanced: Boolean(state.vh || state.va || state.vt),
  };
}

export const thermalPatch = (k: ThermalKey | undefined): HashState => ({
  vh: k ? THERMAL_CODE[k] : '',
});
export const terrainPatch = (k: TerrainKey): HashState => ({ vt: TERRAIN_CODE[k] });
