import type { Device, WindowGeometry } from '../../core/shading/geometry';
import type { HashState } from './hashState';

/**
 * Janela e peças da proteção pelas dimensões (passo 6, F3.1) no '#' da URL: jl, ja (largura e
 * altura da janela, m), jr (recuo do vidro, m) e pc1 a pc9, uma peça cada, como "tipo_v1_v2_...",
 * com o texto digitado em cada campo (vírgula decimal preservada; "i" é prolongamento infinito).
 */
export const MAX_PIECES = 9;

export type PieceCode = 'b' | 'ad' | 'ae' | 'lh' | 'lv';

/** Campos de cada tipo de peça, na ordem do link. */
export const PIECE_FIELDS = {
  b: ['depth', 'above', 'gap', 'extendLeft', 'extendRight'],
  ad: ['depth', 'offset', 'gap', 'extendAbove', 'extendBelow'],
  ae: ['depth', 'offset', 'gap', 'extendAbove', 'extendBelow'],
  lh: ['count', 'chord', 'pitch', 'angle', 'gap', 'above', 'extendLeft', 'extendRight'],
  lv: ['count', 'chord', 'pitch', 'angle', 'gap', 'start', 'extendAbove', 'extendBelow'],
} as const satisfies Record<PieceCode, readonly string[]>;

export type PieceField = (typeof PIECE_FIELDS)[PieceCode][number];

type Rule = 'positive' | 'nonNegative' | 'extent' | 'finite' | 'angle' | 'count';

/** Regra de cada campo e se ele pode ficar em branco (valor padrão 0). */
const RULES: Record<PieceField, { rule: Rule; required: boolean }> = {
  depth: { rule: 'positive', required: true },
  chord: { rule: 'positive', required: true },
  pitch: { rule: 'positive', required: true },
  count: { rule: 'count', required: true },
  above: { rule: 'finite', required: false },
  gap: { rule: 'nonNegative', required: false },
  offset: { rule: 'nonNegative', required: false },
  extendLeft: { rule: 'extent', required: false },
  extendRight: { rule: 'extent', required: false },
  extendAbove: { rule: 'extent', required: false },
  extendBelow: { rule: 'extent', required: false },
  angle: { rule: 'angle', required: false },
  start: { rule: 'finite', required: false },
};

export interface PieceState {
  code: PieceCode;
  /** Texto de cada campo, na ordem de PIECE_FIELDS[code]. */
  raw: string[];
  /** Campos com valor inválido (índices). */
  invalid: number[];
  /** Peça pronta para o cálculo; null se algum campo for inválido. */
  device: Device | null;
}

export interface GeometryState {
  /** Há janela no link (largura e altura digitadas). */
  defined: boolean;
  raw: { width: string; height: string; setback: string };
  invalid: ('width' | 'height' | 'setback')[];
  /** Janela pronta para o cálculo; null se faltar ou for inválida. */
  window: WindowGeometry | null;
  pieces: PieceState[];
  /** Peças válidas, na ordem do link. */
  devices: Device[];
}

/** Número digitado com vírgula ou ponto; undefined se vazio. */
export function parseDecimal(text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === '') return undefined;
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function fieldValue(field: PieceField, text: string | undefined): number | null {
  const { rule, required } = RULES[field];
  const t = text?.trim() ?? '';
  if (t === '') return required ? null : 0;
  if (rule === 'extent' && (t === 'i' || t === '∞')) return Infinity;
  const v = parseDecimal(t);
  if (v === undefined || Number.isNaN(v)) return null;
  switch (rule) {
    case 'positive':
      return v > 0 ? v : null;
    case 'nonNegative':
    case 'extent':
      return v >= 0 ? v : null;
    case 'angle':
      return v >= -90 && v <= 90 ? v : null;
    case 'count':
      return Number.isInteger(v) && v >= 1 && v <= 50 ? v : null;
    case 'finite':
      return v;
  }
}

const CODES = new Set<string>(Object.keys(PIECE_FIELDS));

export function parsePiece(text: string | undefined): PieceState | null {
  if (!text) return null;
  const [code, ...raw] = text.split('_');
  if (!code || !CODES.has(code)) return null;
  const c = code as PieceCode;
  const fields = PIECE_FIELDS[c];
  const values: Record<string, number> = {};
  const invalid: number[] = [];
  fields.forEach((f, i) => {
    const v = fieldValue(f, raw[i]);
    if (v === null) invalid.push(i);
    else values[f] = v;
  });
  const padded = fields.map((_, i) => raw[i] ?? '');
  let device: Device | null = null;
  if (invalid.length === 0) {
    if (c === 'b') {
      device = {
        kind: 'overhang',
        depth: values.depth!,
        above: Math.max(0, values.above!),
        gap: values.gap,
        extendLeft: values.extendLeft,
        extendRight: values.extendRight,
      };
      // O brise fica acima da verga: altura negativa é inválida.
      if (values.above! < 0) {
        invalid.push((fields as readonly string[]).indexOf('above'));
        device = null;
      }
    } else if (c === 'ad' || c === 'ae') {
      device = {
        kind: 'fin',
        side: c === 'ad' ? 'right' : 'left',
        depth: values.depth!,
        offset: values.offset,
        gap: values.gap,
        extendAbove: values.extendAbove,
        extendBelow: values.extendBelow,
      };
    } else if (c === 'lh') {
      device = {
        kind: 'horizontalLouvers',
        count: values.count!,
        chord: values.chord!,
        pitch: values.pitch!,
        angle: values.angle,
        gap: values.gap,
        above: values.above!,
        extendLeft: values.extendLeft,
        extendRight: values.extendRight,
      };
    } else {
      device = {
        kind: 'verticalLouvers',
        count: values.count!,
        chord: values.chord!,
        pitch: values.pitch!,
        angle: values.angle,
        gap: values.gap,
        start: values.start!,
        extendAbove: values.extendAbove,
        extendBelow: values.extendBelow,
      };
    }
  }
  return { code: c, raw: padded, invalid, device };
}

/** Texto da peça para o link: campos vazios do fim são omitidos. */
export function formatPiece(code: PieceCode, raw: readonly string[]): string {
  const values = [...raw];
  while (values.length > 0 && values[values.length - 1]!.trim() === '') values.pop();
  return [code, ...values.map((v) => v.trim().replaceAll('_', ''))].join('_');
}

export const pieceKey = (i: number) => `pc${i + 1}`;

export function geometryFromHash(state: HashState): GeometryState {
  const raw = { width: state.jl ?? '', height: state.ja ?? '', setback: state.jr ?? '' };
  const invalid: GeometryState['invalid'] = [];
  const width = parseDecimal(raw.width);
  const height = parseDecimal(raw.height);
  const setback = parseDecimal(raw.setback);
  if (width !== undefined && !(width > 0)) invalid.push('width');
  if (height !== undefined && !(height > 0)) invalid.push('height');
  if (setback !== undefined && !(setback >= 0)) invalid.push('setback');
  const defined = width !== undefined || height !== undefined;
  const window =
    width !== undefined && height !== undefined && width > 0 && height > 0 && invalid.length === 0
      ? { width, height, setback: setback ?? 0 }
      : null;
  const pieces: PieceState[] = [];
  for (let i = 0; i < MAX_PIECES; i++) {
    const p = parsePiece(state[pieceKey(i)]);
    if (p) pieces.push(p);
  }
  return {
    defined,
    raw,
    invalid,
    window,
    pieces,
    devices: pieces.flatMap((p) => (p.device ? [p.device] : [])),
  };
}

/** Patch do link que grava a lista de peças em pc1, pc2, ... e apaga as chaves que sobrarem. */
export function piecesPatch(pieces: readonly { code: PieceCode; raw: readonly string[] }[]) {
  const patch: HashState = {};
  for (let i = 0; i < MAX_PIECES; i++) {
    const p = pieces[i];
    patch[pieceKey(i)] = p ? formatPiece(p.code, p.raw) : '';
  }
  return patch;
}

/** Valores iniciais de uma peça nova, para a janela dada (a peça já aparece no desenho). */
export function newPieceRaw(code: PieceCode, width: number, height: number): string[] {
  const fmt = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');
  switch (code) {
    case 'b':
      return [fmt(Math.max(0.1, height / 2)), '', '', '', ''];
    case 'ad':
    case 'ae':
      return [fmt(Math.max(0.1, width / 3)), '', '', '', ''];
    case 'lh':
      return ['3', fmt(height / 4), fmt(height / 3), '', '', '', '', ''];
    case 'lv':
      return ['4', fmt(width / 4), fmt(width / 3), '', '', '', '', ''];
  }
}
