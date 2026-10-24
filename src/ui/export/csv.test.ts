import { describe, expect, it } from 'vitest';
import { csvDocument, csvField } from './csv';

describe('CSV exportado', () => {
  it('ponto decimal, aspas quando preciso, vazio para ausente', () => {
    expect(csvField(12.5)).toBe('12.5');
    expect(csvField(1 / 3)).toBe('0.333333');
    expect(csvField('22/dez a 15/jan')).toBe('22/dez a 15/jan');
    expect(csvField('a, b')).toBe('"a, b"');
    expect(csvField('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvField(null)).toBe('');
    expect(csvField(NaN)).toBe('');
  });

  it('cabeçalho com # e a convenção de separador e decimal', () => {
    const text = csvDocument(['Local: Teste'], ['a', 'b'], [[1, 2.25]]);
    expect(
      text.startsWith('﻿# Local: Teste\n# Separador: vírgula; decimal: ponto.\na,b\n1,2.25\n'),
    ).toBe(true);
  });
});
