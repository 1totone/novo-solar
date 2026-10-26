import { describe, expect, it } from 'vitest';
import { ADAPTIVE_DEFAULT, DEFAULT_METHOD } from '../../core/comfort/classification';
import { parseHash } from './hashState';
import { classificationFromHash, fieldPatch, methodPatch } from './classificationHash';

const from = (hash: string) => classificationFromHash(parseHash(hash));

describe('classificação das horas no link', () => {
  it('sem chaves: limiar de 20 °C (decisão 0024), com a média da hora', () => {
    const s = from('#local=florianopolis');
    expect(s.kind).toBe('thresholds');
    expect(s.preset).toBe(true);
    expect(s.mode).toBe('mean');
    expect(s.raw.cold).toBe('20');
    expect(s.raw.hot).toBe('20');
    expect(s.method).toEqual(DEFAULT_METHOD);
  });

  it('cm=a: faixa adaptativa com os valores padrão e ΔT = 0', () => {
    const s = from('#cm=a');
    expect(s.kind).toBe('adaptive');
    expect(s.method).toEqual({ ...ADAPTIVE_DEFAULT, gains: 0 });
  });

  it('links antigos da faixa adaptativa (sem cm, com chaves dela) continuam na faixa', () => {
    const s = from('#ca=90&cr=m&cn=7&cg=2&ct=f');
    expect(s.kind).toBe('adaptive');
    expect(s.method).toEqual({
      kind: 'adaptive',
      acceptability: 90,
      running: { averaging: 'arithmetic', days: 7 },
      gains: 2,
    });
    expect(s.mode).toBe('end');
    expect(from('#cg=0').kind).toBe('adaptive');
  });

  it('α fora de 0,6 a 0,9, dias fora de 7 a 30 e ΔT absurdo são inválidos', () => {
    expect(from('#cm=a&cal=0,5').invalid).toEqual(['alpha']);
    expect(from('#cm=a&cn=40').invalid).toEqual(['days']);
    expect(from('#cm=a&cn=7,5').invalid).toEqual(['days']);
    expect(from('#cm=a&cg=x').invalid).toEqual(['gains']);
    expect(from('#cm=a&cg=15').method).toBeNull();
  });

  it('limiares digitados (cm=l): um pode ficar em branco; frio acima do quente é inválido', () => {
    expect(from('#cm=l&tf=18&tq=26').method).toEqual({ kind: 'thresholds', cold: 18, hot: 26 });
    expect(from('#cm=l&tq=20').method).toEqual({ kind: 'thresholds', cold: null, hot: 20 });
    expect(from('#cm=l').method).toBeNull();
    expect(from('#cm=l').preset).toBe(false);
    expect(from('#cm=l&tf=27&tq=26').invalid).toEqual(['cold', 'hot']);
  });

  it('sem cm, limiares no link valem; o que faltar fica em 20 °C', () => {
    expect(from('#tq=24').method).toEqual({ kind: 'thresholds', cold: 20, hot: 24 });
  });

  it('temperatura de equilíbrio sem padrão: só com o valor digitado', () => {
    expect(from('#cm=e').method).toBeNull();
    expect(from('#cm=e&te=21,5').method).toEqual({ kind: 'balance', balance: 21.5 });
  });

  it('trocar de método grava o método no link e materializa os 20 °C', () => {
    expect(methodPatch('adaptive', parseHash(''))).toEqual({ cm: 'a' });
    expect(methodPatch('balance', parseHash(''))).toEqual({ cm: 'e' });
    expect(methodPatch('thresholds', parseHash('#cm=a'))).toEqual({
      cm: 'l',
      tf: '20',
      tq: '20',
    });
    // Limiares já digitados voltam como estavam.
    expect(methodPatch('thresholds', parseHash('#cm=a&tf=18&tq=26'))).toEqual({ cm: 'l' });
  });

  it('editar um limiar a partir do padrão grava cm=l e o outro limiar', () => {
    const s = from('');
    expect(fieldPatch(s, 'cold', '18')).toEqual({ cm: 'l', tf: '18', tq: '20' });
    // Apagar um campo, já com cm=l, deixa-o sem limite (não volta para 20 °C).
    const typed = from('#cm=l&tf=18&tq=20');
    expect(fieldPatch(typed, 'cold', '')).toEqual({ tf: '' });
    expect(classificationFromHash({ cm: 'l', tq: '20' }).method).toEqual({
      kind: 'thresholds',
      cold: null,
      hot: 20,
    });
    expect(fieldPatch(from('#cm=a'), 'gains', '2')).toEqual({ cg: '2' });
  });
});
