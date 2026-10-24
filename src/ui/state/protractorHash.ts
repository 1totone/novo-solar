import type { AngleReference, ProtractorAngles } from '../../core/protractor/protractor';
import type { DrawnMask, SkyPolygon } from '../../core/mask/mask';
import type { HashState } from './hashState';

/**
 * Fachada, ângulos e máscara no '#' da URL: o (orientação), tr=0 (transferidor oculto), ref=e
 * (externa); sombra total: a1, a2, bd1, bd2, be1, be2, gd1, gd2, ge1, ge2 (α; β e γ à direita e
 * à esquerda; índices 1 e 2) e gad, gae (γ das aletas); sombra parcial: as mesmas chaves com o
 * prefixo p; desenho à mão: dt (total) e dp (parcial).
 */
const SET_KEYS = [
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
  'gad',
  'gae',
] as const;
type SetKey = (typeof SET_KEYS)[number];
export const ANGLE_KEYS = [...SET_KEYS, ...SET_KEYS.map((k) => `p${k}` as `p${SetKey}`)] as const;
export type AngleKey = (typeof ANGLE_KEYS)[number];

export interface ProtractorState {
  orientation: number;
  /** Texto digitado da orientação, inválido se não for número. */
  orientationValid: boolean;
  show: boolean;
  reference: AngleReference;
  /** Ângulos da sombra total (100%). */
  angles: ProtractorAngles;
  /** Ângulos da sombra parcial (50%, medidos do centro da janela). */
  partial: ProtractorAngles;
  drawn: DrawnMask;
  /** Campos com valor digitado fora de 0° a 90° ou não numérico. */
  invalid: AngleKey[];
}

function parseNumber(text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === '') return undefined;
  const n = Number(text.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Polígonos desenhados à mão no '#': vértices "azimute_altura" (graus, ponto decimal) separados
 * por '-', polígonos separados por '*'. Só caracteres que a URL não precisa codificar.
 */
export function parsePolygons(text: string | undefined): SkyPolygon[] {
  if (!text) return [];
  const out: SkyPolygon[] = [];
  for (const chunk of text.split('*')) {
    const polygon: SkyPolygon = [];
    for (const vertex of chunk.split('-')) {
      const [az, alt] = vertex.split('_').map(Number);
      if (az === undefined || alt === undefined || !Number.isFinite(az) || !Number.isFinite(alt)) {
        continue;
      }
      if (alt < 0 || alt > 90) continue;
      polygon.push({ azimuth: ((az % 360) + 360) % 360, altitude: alt });
    }
    if (polygon.length >= 3) out.push(polygon);
  }
  return out;
}

const round1 = (x: number) => String(Math.round(x * 10) / 10);

export function formatPolygons(polygons: SkyPolygon[]): string {
  return polygons
    .map((p) => p.map((v) => `${round1(v.azimuth)}_${round1(v.altitude)}`).join('-'))
    .join('*');
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
  const pair = (k1: AngleKey, k2?: AngleKey): [number, number?] | undefined => {
    const v1 = value(k1);
    const v2 = k2 ? value(k2) : undefined;
    if (v1 === undefined) return undefined;
    return v2 === undefined ? [v1] : [v1, v2];
  };
  const set = (p: '' | 'p'): ProtractorAngles => ({
    alpha: pair(`${p}a1`, `${p}a2`),
    betaRight: pair(`${p}bd1`, `${p}bd2`),
    betaLeft: pair(`${p}be1`, `${p}be2`),
    gammaRight: pair(`${p}gd1`, `${p}gd2`),
    gammaLeft: pair(`${p}ge1`, `${p}ge2`),
    finTopRight: pair(`${p}gad`),
    finTopLeft: pair(`${p}gae`),
  });
  return {
    orientation: o === undefined || Number.isNaN(o) ? 0 : o,
    orientationValid: o === undefined || !Number.isNaN(o),
    show: state.tr !== '0',
    reference: state.ref === 'e' ? 'external' : 'internal',
    angles: set(''),
    partial: set('p'),
    drawn: { total: parsePolygons(state.dt), partial: parsePolygons(state.dp) },
    invalid,
  };
}
