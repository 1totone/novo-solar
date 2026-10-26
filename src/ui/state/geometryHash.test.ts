import { describe, expect, it } from 'vitest';
import { buildHash, parseHash } from './hashState';
import {
  formatPiece,
  geometryFromHash,
  newPieceRaw,
  parsePiece,
  parsePoint,
  piecesPatch,
  pointPatch,
  PIECE_FIELDS,
} from './geometryHash';

describe('peças no link', () => {
  it('brise com vírgula decimal, prolongamento infinito e campos omitidos no fim', () => {
    const p = parsePiece('b_0,6__0,1_i')!;
    expect(p.invalid).toEqual([]);
    expect(p.device).toEqual({
      kind: 'overhang',
      depth: 0.6,
      above: 0,
      gap: 0.1,
      extendLeft: Infinity,
      extendRight: 0,
    });
    expect(p.raw).toEqual(['0,6', '', '0,1', 'i', '']);
  });

  it('aletas, lâminas horizontais e verticais', () => {
    expect(parsePiece('ae_0.4_0.1')!.device).toMatchObject({
      kind: 'fin',
      side: 'left',
      depth: 0.4,
      offset: 0.1,
    });
    expect(parsePiece('lh_3_0.25_0.33_30_0_-0.1')!.device).toMatchObject({
      kind: 'horizontalLouvers',
      count: 3,
      chord: 0.25,
      pitch: 0.33,
      angle: 30,
      above: -0.1,
    });
    expect(parsePiece('lv_4_0.2_0.3_-15')!.device).toMatchObject({
      kind: 'verticalLouvers',
      count: 4,
      angle: -15,
      start: 0,
    });
  });

  it('campos inválidos: a peça fica sem dispositivo e o campo é marcado', () => {
    expect(parsePiece('b_0')!.invalid).toEqual([0]); // profundidade tem de ser positiva
    expect(parsePiece('b')!.invalid).toEqual([0]); // obrigatória
    expect(parsePiece('b_0,5_-0,1')!.invalid).toEqual([1]); // brise abaixo da verga
    expect(parsePiece('lh_2,5_0,2_0,3')!.invalid).toEqual([0]); // número de lâminas inteiro
    expect(parsePiece('lh_2_0,2_0,3_95')!.invalid).toEqual([3]); // inclinação de −90° a 90°
    expect(parsePiece('ad_0,4_x')!.invalid).toEqual([1]);
    expect(parsePiece('b_0,4')!.device).not.toBeNull();
    expect(parsePiece('zz_1')).toBeNull();
  });

  it('ida e volta pelo link, com as peças renumeradas', () => {
    const patch = piecesPatch([
      { code: 'b', raw: ['0,6', '', '', '0,3', '0,3'] },
      { code: 'ad', raw: ['0,4', '', '', '', ''] },
    ]);
    expect(patch).toMatchObject({ pc1: 'b_0,6___0,3_0,3', pc2: 'ad_0,4', pc3: '' });
    const state = parseHash(buildHash({ jl: '1,2', ja: '1', ...patch }));
    const g = geometryFromHash(state);
    expect(g.window).toEqual({ width: 1.2, height: 1, setback: 0 });
    expect(g.pieces.map((p) => p.code)).toEqual(['b', 'ad']);
    expect(g.devices).toHaveLength(2);
  });

  it('janela: largura e altura positivas, recuo zero ou positivo', () => {
    expect(geometryFromHash({}).defined).toBe(false);
    expect(geometryFromHash({ jl: '1,2' }).window).toBeNull();
    expect(geometryFromHash({ jl: '1,2', ja: '0' }).invalid).toEqual(['height']);
    expect(geometryFromHash({ jl: '1,2', ja: '1', jr: '-0,1' }).invalid).toEqual(['setback']);
    expect(geometryFromHash({ jl: '1,2', ja: '1', jr: '0,15' }).window).toEqual({
      width: 1.2,
      height: 1,
      setback: 0.15,
    });
  });

  it('peça nova já é válida e cabe na janela', () => {
    for (const code of Object.keys(PIECE_FIELDS) as (keyof typeof PIECE_FIELDS)[]) {
      const raw = newPieceRaw(code, 1.2, 1);
      expect(raw).toHaveLength(PIECE_FIELDS[code].length);
      expect(parsePiece(formatPiece(code, raw))!.device).not.toBeNull();
    }
  });
});

describe('camadas da proteção na carta (F3.2)', () => {
  const W = { width: 1.2, height: 1 };

  it('curvas aparecem por padrão; cs=0 oculta', () => {
    expect(geometryFromHash(parseHash('#jl=1,2&ja=1')).contours).toBe(true);
    expect(geometryFromHash(parseHash('#jl=1,2&ja=1&cs=0')).contours).toBe(false);
  });

  it('ponto com vírgula decimal, dentro da janela', () => {
    expect(parsePoint('0,6_0,5', W)).toEqual({
      raw: { x: '0,6', z: '0,5' },
      invalid: [],
      value: { x: 0.6, z: 0.5 },
    });
    expect(parsePoint('0_1', W)!.value).toEqual({ x: 0, z: 1 });
    expect(parsePoint(undefined, W)).toBeNull();
  });

  it('ponto fora da janela, vazio ou sem janela válida fica sem valor', () => {
    expect(parsePoint('1,3_0,5', W)!.invalid).toEqual(['x']);
    expect(parsePoint('0,5_-0,1', W)!.invalid).toEqual(['z']);
    expect(parsePoint('0,5', W)!.invalid).toEqual(['z']);
    expect(parsePoint('a_b', W)!.invalid).toEqual(['x', 'z']);
    expect(parsePoint('0,5_0,5', null)).toEqual({
      raw: { x: '0,5', z: '0,5' },
      invalid: [],
      value: null,
    });
  });

  it('ida e volta pelo link', () => {
    const hash = buildHash({ jl: '1,2', ja: '1', ...pointPatch('0,3 ', '0,8') });
    expect(geometryFromHash(parseHash(hash)).point!.value).toEqual({ x: 0.3, z: 0.8 });
  });
});
