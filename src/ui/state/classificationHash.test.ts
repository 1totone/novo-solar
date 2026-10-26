import { describe, expect, it } from 'vitest';
import { DEFAULT_METHOD } from '../../core/comfort/classification';
import { parseHash } from './hashState';
import { classificationFromHash } from './classificationHash';

const from = (hash: string) => classificationFromHash(parseHash(hash));

describe('classificação das horas no link', () => {
  it('sem chaves: faixa adaptativa padrão, com ΔT = 0 e a média da hora', () => {
    const s = from('#local=florianopolis');
    expect(s.kind).toBe('adaptive');
    expect(s.mode).toBe('mean');
    expect(s.method).toEqual({ ...DEFAULT_METHOD, gains: 0 });
  });

  it('faixa adaptativa 90%, média aritmética de 7 dias, ΔT de 2 °C e fim da hora', () => {
    const s = from('#ca=90&cr=m&cn=7&cg=2&ct=f');
    expect(s.method).toEqual({
      kind: 'adaptive',
      acceptability: 90,
      running: { averaging: 'arithmetic', days: 7 },
      gains: 2,
    });
    expect(s.mode).toBe('end');
  });

  it('α fora de 0,6 a 0,9, dias fora de 7 a 30 e ΔT absurdo são inválidos', () => {
    expect(from('#cal=0,5').invalid).toEqual(['alpha']);
    expect(from('#cn=40').invalid).toEqual(['days']);
    expect(from('#cn=7,5').invalid).toEqual(['days']);
    expect(from('#cg=x').invalid).toEqual(['gains']);
    expect(from('#cg=15').method).toBeNull();
  });

  it('limiares: um pode ficar em branco; frio acima do quente é inválido', () => {
    expect(from('#cm=l&tf=18&tq=26').method).toEqual({ kind: 'thresholds', cold: 18, hot: 26 });
    expect(from('#cm=l&tq=20').method).toEqual({ kind: 'thresholds', cold: null, hot: 20 });
    expect(from('#cm=l').method).toBeNull();
    expect(from('#cm=l&tf=27&tq=26').invalid).toEqual(['cold', 'hot']);
  });

  it('temperatura de equilíbrio sem padrão: só com o valor digitado', () => {
    expect(from('#cm=e').method).toBeNull();
    expect(from('#cm=e&te=21,5').method).toEqual({ kind: 'balance', balance: 21.5 });
  });
});
