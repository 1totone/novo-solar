import { describe, expect, it } from 'vitest';
import { windFromHash } from './windHash';

describe('rosa dos ventos no # da URL', () => {
  it('padrão: carta, 8 setores, ano todo, dia todo, frequência', () => {
    expect(windFromHash({})).toEqual({
      tab: 'chart',
      sectors: 8,
      season: undefined,
      period: undefined,
      show: 'frequency',
    });
  });

  it('lê aba, setores, estação, período e modo; ignora valores desconhecidos', () => {
    expect(
      windFromHash({
        aba: 'rosa',
        setores: '16',
        estacao: 'jun-ago',
        periodo: 'tarde',
        rosa: 'vel',
      }),
    ).toEqual({ tab: 'rose', sectors: 16, season: 'jun-ago', period: 'tarde', show: 'speed' });
    expect(windFromHash({ setores: '12', estacao: 'verao', periodo: 'x' })).toMatchObject({
      sectors: 8,
      season: undefined,
      period: undefined,
    });
  });
});
