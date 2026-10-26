import { describe, expect, it } from 'vitest';
import { describeConfig } from './describe';

const words = {
  orientation: (d: string) => `fachada ${d}°`,
  none: 'sem proteção',
  right: 'd',
  left: 'e',
};
const fmt = (v: number) => String(v).replace('.', ',');

describe('resumo da configuração na comparação', () => {
  it('local, fachada normalizada e ângulos digitados', () => {
    expect(
      describeConfig({ local: 'brasilia', o: '-30', a1: '55', a2: '20', gd1: '50' }, fmt, words),
    ).toBe('Brasília (DF) · fachada 330° · α 55°/20°, γ d 50°');
  });

  it('sem ângulos', () => {
    expect(describeConfig({}, fmt, words)).toBe('Florianópolis (SC) · fachada 0° · sem proteção');
  });
});
