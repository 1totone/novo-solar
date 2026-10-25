import { describe, expect, it } from 'vitest';
import { formatNumber } from './i18n/i18n';
import { timeZoneOffset } from './timeZoneOffset';

const fmt = (v: number, d: number) => formatNumber('pt-BR', v, d);

describe('timeZoneOffset', () => {
  it('mantém o fuso inteiro negativo como antes (Brasil)', () => {
    expect(timeZoneOffset(-3, fmt)).toBe('−3');
    expect(timeZoneOffset(-4, fmt, '-')).toBe('-4');
  });

  it('escreve o sinal de fuso positivo e a fração com vírgula', () => {
    expect(timeZoneOffset(5.5, fmt)).toBe('+5,5');
    expect(timeZoneOffset(-3.5, fmt)).toBe('−3,5');
    expect(timeZoneOffset(9, fmt, '-')).toBe('+9');
  });

  it('não escreve deslocamento no fuso 0', () => {
    expect(timeZoneOffset(0, fmt)).toBe('');
  });
});
