import { beforeAll, describe, expect, it } from 'vitest';
import { en } from './messages.en';
import { es } from './messages.es';
import { ptBR } from './messages.pt-BR';
import {
  detectLocale,
  formatClock,
  formatDayMonth,
  formatNumber,
  isLocale,
  isLocaleLoaded,
  loadLocale,
  LOCALES,
  translate,
  type MessageKey,
} from './i18n';

// Espanhol e inglês vêm sob demanda (decisão 0039).
beforeAll(async () => {
  await loadLocale('es');
  await loadLocale('en');
});

describe('carregamento dos idiomas', () => {
  it('português já carregado; espanhol e inglês depois de loadLocale', () => {
    expect(isLocaleLoaded('pt-BR')).toBe(true);
    expect(isLocaleLoaded('es')).toBe(true);
    expect(isLocaleLoaded('en')).toBe(true);
  });
});

describe('translate', () => {
  it('devolve o texto do catálogo do idioma', () => {
    expect(translate('pt-BR', 'status.title')).toBe('Em construção');
    expect(translate('es', 'status.title')).toBe('En construcción');
    expect(translate('en', 'status.title')).toBe('Under construction');
  });

  it('substitui parâmetros e preserva marcadores sem valor', () => {
    expect(translate('pt-BR', 'footer.build', { version: '0.0.0', label: 'main' })).toBe(
      'Versão 0.0.0 · main · {commit}',
    );
  });
});

describe('formatos por idioma', () => {
  it('números: vírgula decimal em português e espanhol, ponto em inglês', () => {
    expect(formatNumber('pt-BR', 1234.5, 1)).toBe('1.234,5');
    expect(formatNumber('pt-BR', -0.25, 2)).toBe('-0,25');
    expect(formatNumber('es', -27.67, 2)).toBe('-27,67');
    expect(formatNumber('en', 1234.5, 1)).toBe('1,234.5');
  });

  it('hora do relógio e dia e mês', () => {
    expect(formatClock('pt-BR', 11, 2)).toBe('11h02');
    expect(formatClock('es', 11, 32)).toBe('11:32');
    expect(formatClock('en', 9, 0)).toBe('9:00');
    expect(formatDayMonth('pt-BR', 11, 2)).toBe('11/02');
    expect(formatDayMonth('es', 3, 11)).toBe('03/11');
    expect(formatDayMonth('en', 11, 2)).toBe('11 Feb');
  });
});

describe('idiomas', () => {
  it('reconhece apenas os idiomas disponíveis', () => {
    expect(LOCALES).toEqual(['pt-BR', 'es', 'en']);
    expect(isLocale('pt-BR')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it('idioma do navegador: o primeiro disponível, de qualquer região; senão, português', () => {
    expect(detectLocale(['es-AR', 'en'])).toBe('es');
    expect(detectLocale(['fr-FR', 'en-GB'])).toBe('en');
    expect(detectLocale(['pt-PT'])).toBe('pt-BR');
    expect(detectLocale(['de'])).toBe('pt-BR');
    expect(detectLocale([])).toBe('pt-BR');
  });
});

// Estrutura de tradução (F4.6): os três catálogos têm as mesmas chaves, os mesmos marcadores e
// nenhum texto vazio; nada de travessão; nenhuma frase longa ficou sem traduzir.
const CATALOGS = { 'pt-BR': ptBR, es, en } as const;
const KEYS = Object.keys(ptBR) as MessageKey[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('catálogos', () => {
  it('as mesmas chaves nos três idiomas', () => {
    for (const catalog of [es, en]) expect(Object.keys(catalog).sort()).toEqual([...KEYS].sort());
  });

  it('os mesmos marcadores {nome} em cada chave', () => {
    for (const key of KEYS) {
      for (const [locale, catalog] of Object.entries(CATALOGS)) {
        expect(placeholders(catalog[key]), `${locale} ${key}`).toEqual(placeholders(ptBR[key]));
      }
    }
  });

  it('nenhum texto vazio e nenhum travessão', () => {
    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      for (const key of KEYS) {
        const text: string = catalog[key];
        expect(text.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
        expect(text, `${locale} ${key}`).not.toMatch(/[\u2013\u2014]/);
      }
    }
  });

  // Em espanhol, muitos termos técnicos são iguais aos do português ("Temperatura de bulbo seco");
  // uma frase igual com mais de 3 palavras de 4 letras ou mais indica texto sem tradução.
  it('textos iguais ao português só quando curtos (símbolos, nomes próprios, palavras iguais)', () => {
    for (const [locale, catalog] of [
      ['es', es],
      ['en', en],
    ] as const) {
      for (const key of KEYS) {
        if (catalog[key] !== ptBR[key]) continue;
        const words = ptBR[key].split(/\s+/).filter((w) => /\p{L}{4,}/u.test(w));
        expect(words.length, `${locale} ${key}: "${ptBR[key]}"`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('listas separadas por vírgula com o mesmo número de itens', () => {
    for (const key of ['chart.monthsShort', 'annual.monthsLong', 'compass.points'] as const) {
      for (const catalog of [es, en]) {
        expect(catalog[key].split(',')).toHaveLength(ptBR[key].split(',').length);
      }
    }
  });
});
