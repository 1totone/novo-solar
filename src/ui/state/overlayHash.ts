import {
  OVERLAY_QUANTITIES,
  type OverlayQuantity,
  type Semester,
} from '../../core/overlay/overlay';
import type { HashState } from './hashState';

/**
 * Dados sobre a carta no '#' da URL: dado (tbs, ur, ghi, dni, dhi; ausente = desligado),
 * sem (1: 22/12 a 21/06; 2: 22/06 a 21/12), faixas (4 limites separados por '_', ou "arquivo"
 * para os percentis do arquivo), modo=freq (frequência acima do limiar) e limiar.
 */
export const DATA_KEYS = ['tbs', 'ur', 'ghi', 'dni', 'dhi'] as const;
export type DataKey = (typeof DATA_KEYS)[number];

export const QUANTITY_OF: Record<DataKey, OverlayQuantity> = {
  tbs: 'dryBulb',
  ur: 'relativeHumidity',
  ghi: 'globalHorizontal',
  dni: 'directNormal',
  dhi: 'diffuseHorizontal',
};

/** Limiar padrão do modo de frequência, na unidade da grandeza. */
export const DEFAULT_THRESHOLD: Record<DataKey, number> = {
  tbs: 26,
  ur: 80,
  ghi: 500,
  dni: 500,
  dhi: 200,
};

export interface OverlayState {
  key?: DataKey;
  semester: Semester;
  /** Faixas: padrão da grandeza, digitadas no link ou pelos percentis do arquivo. */
  bands: { source: 'default' } | { source: 'custom'; limits: number[] } | { source: 'file' };
  /** Texto das faixas no link era inválido (caiu nas padrão). */
  bandsInvalid: boolean;
  mode: 'mean' | 'frequency';
  threshold: number;
}

function parseLimits(text: string): number[] | undefined {
  const parts = text.split('_').map((s) => Number(s.replace(',', '.')));
  if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v))) return undefined;
  for (let i = 1; i < 4; i++) if (parts[i]! <= parts[i - 1]!) return undefined;
  return parts;
}

export function formatLimits(limits: readonly number[]): string {
  return limits.map((v) => String(v)).join('_');
}

export function overlayFromHash(state: HashState): OverlayState {
  const key = (DATA_KEYS as readonly string[]).includes(state.dado ?? '')
    ? (state.dado as DataKey)
    : undefined;
  let bands: OverlayState['bands'] = { source: 'default' };
  let bandsInvalid = false;
  if (state.faixas === 'arquivo') bands = { source: 'file' };
  else if (state.faixas) {
    const limits = parseLimits(state.faixas);
    if (limits) bands = { source: 'custom', limits };
    else bandsInvalid = true;
  }
  const t = Number((state.limiar ?? '').replace(',', '.'));
  return {
    key,
    semester: state.sem === '2' ? 2 : 1,
    bands,
    bandsInvalid,
    mode: state.modo === 'freq' ? 'frequency' : 'mean',
    threshold:
      state.limiar !== undefined && state.limiar.trim() !== '' && Number.isFinite(t)
        ? t
        : key
          ? DEFAULT_THRESHOLD[key]
          : 0,
  };
}

/** Limites padrão da grandeza escolhida. */
export function defaultLimits(key: DataKey): readonly number[] {
  return OVERLAY_QUANTITIES[QUANTITY_OF[key]].bands;
}
