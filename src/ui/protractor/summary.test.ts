import { describe, expect, it } from 'vitest';
import { translate, type MessageKey } from '../i18n/i18n';
import { parseHash } from '../state/hashState';
import { protractorFromHash } from '../state/protractorHash';
import { protectionSummary } from './summary';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translate('pt-BR', key, params);
const fmt = (v: number) => String(v).replace('.', ',');
const summary = (hash: string) => {
  const state = parseHash(hash);
  return protectionSummary(state, protractorFromHash(state), t, fmt);
};

describe('resumo do passo 3 fechado (decisão 0044)', () => {
  it('sem ângulos: sem proteção', () => {
    expect(summary('#o=30')).toBe('Sem proteção');
  });

  it('brise, aletas e γ da sombra total, esquerda/direita', () => {
    expect(summary('#a1=50')).toBe('Brise α 50°');
    expect(summary('#a1=55&be1=30&bd1=30&ge1=60&gd1=50')).toBe(
      'Brise α 55° · aletas β 30°/30° · γ 60°/50°',
    );
    expect(summary('#bd1=22,5')).toBe('Aletas β –/22,5°');
  });

  it('referência externa, ângulos de "Mais opções" e ângulo inválido', () => {
    expect(summary('#a1=50&ref=e')).toBe('Brise α 50° · referência externa');
    expect(summary('#a1=40&a2=15')).toBe('Brise α 40° · e mais ângulos');
    expect(summary('#pa1=60')).toBe('Ângulos em "Mais opções"');
    expect(summary('#dt=0_80-90_80-180_80')).toBe('Ângulos em "Mais opções"');
    expect(summary('#a1=120')).toBe('Sem proteção · ângulo inválido');
  });
});
