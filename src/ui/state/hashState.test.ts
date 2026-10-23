import { describe, expect, it } from 'vitest';
import { buildHash, parseHash } from './hashState';

describe('parseHash', () => {
  it('lê pares chave=valor com ou sem #', () => {
    expect(parseHash('#painel=sobre&lat=-27.6')).toEqual({ painel: 'sobre', lat: '-27.6' });
    expect(parseHash('painel=sobre')).toEqual({ painel: 'sobre' });
  });

  it('trata hash vazio', () => {
    expect(parseHash('')).toEqual({});
    expect(parseHash('#')).toEqual({});
  });

  it('decodifica caracteres especiais', () => {
    expect(parseHash('#cidade=Florian%C3%B3polis%20SC')).toEqual({ cidade: 'Florianópolis SC' });
  });
});

describe('buildHash', () => {
  it('ordena as chaves e omite valores vazios', () => {
    expect(buildHash({ painel: 'sobre', b: '', a: '1' })).toBe('#a=1&painel=sobre');
  });

  it('devolve string vazia para estado vazio', () => {
    expect(buildHash({})).toBe('');
  });

  it('faz ida e volta sem perda', () => {
    const state = { cidade: 'Belém & região', lat: '-1.38', painel: 'sobre' };
    expect(parseHash(buildHash(state))).toEqual(state);
  });
});
