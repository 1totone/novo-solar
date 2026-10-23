import { describe, expect, it } from 'vitest';
import { formatNumber, isLocale, translate } from './i18n';

describe('translate', () => {
  it('devolve o texto do catálogo', () => {
    expect(translate('pt-BR', 'status.title')).toBe('Em construção');
  });

  it('substitui parâmetros e preserva marcadores sem valor', () => {
    expect(translate('pt-BR', 'footer.build', { version: '0.0.0', label: 'main' })).toBe(
      'Versão 0.0.0 · main · {commit}',
    );
  });
});

describe('formatNumber', () => {
  it('usa vírgula decimal e ponto de milhar em português', () => {
    expect(formatNumber('pt-BR', 1234.5, 1)).toBe('1.234,5');
    expect(formatNumber('pt-BR', -0.25, 2)).toBe('-0,25');
  });
});

describe('isLocale', () => {
  it('reconhece apenas idiomas disponíveis', () => {
    expect(isLocale('pt-BR')).toBe(true);
    expect(isLocale('en')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
