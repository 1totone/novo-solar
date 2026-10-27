import { describe, expect, it } from 'vitest';
import { EXERCISE_IDS } from '../didactic/exercises';
import { TUTORIAL_STEPS } from '../didactic/tutorial';
import { geometryFromHash } from '../state/geometryHash';
import { parseHash } from '../state/hashState';
import { protractorFromHash } from '../state/protractorHash';
import { siteFromHash } from '../state/siteHash';
import { sizingFromHash } from '../state/sizingHash';
import {
  EXAMPLE_IDS,
  EXAMPLES,
  exampleFromHash,
  exampleHref,
  helpSectionFromHash,
  type HelpContent,
} from './content';
import { helpEn } from './help.en';
import { helpEs } from './help.es';
import { helpPtBR } from './help.pt-BR';

const LOCALES: [string, HelpContent][] = [
  ['es', helpEs],
  ['en', helpEn],
];

/** Todas as frases de um conteúdo, para as verificações de texto. */
function texts(c: HelpContent): string[] {
  return [
    c.tutorial.title,
    c.tutorial.intro,
    ...c.tutorial.steps.flatMap((i) => [i.title, i.text]),
    c.exercises.intro,
    c.exercises.metric,
    ...c.exercises.howTo,
    ...EXERCISE_IDS.flatMap((id) => [c.exercises.items[id].title, c.exercises.items[id].statement]),
    c.guide.intro,
    ...[...c.guide.steps, ...c.guide.advanced, ...c.guide.tabs].flatMap((i) => [i.title, i.text]),
    ...c.guide.tips,
    c.examples.intro,
    c.examples.source,
    ...EXAMPLE_IDS.flatMap((id) => {
      const e = c.examples.items[id];
      return [e.title, e.problem, ...e.steps, e.lesson];
    }),
    ...c.glossary.flatMap((g) => [g.title, ...g.terms.flatMap((t) => [t.term, t.definition])]),
    ...c.faq.flatMap((q) => [q.question, q.answer]),
    c.hypotheses.intro,
    ...c.hypotheses.groups.flatMap((g) => [g.title, ...g.items]),
  ];
}

/** Ângulos, percentuais e medidas de um exemplo, com ponto decimal, para comparar os idiomas. */
function quantities(c: HelpContent, id: (typeof EXAMPLE_IDS)[number]): string[] {
  const e = c.examples.items[id];
  const all = [e.title, e.problem, ...e.steps, e.lesson].join(' ');
  return (all.match(/\d+(?:[.,]\d+)?\s?(?:°|%|mm\b|cm\b|m\b)/g) ?? [])
    .map((s) => s.replace(',', '.').replace(/\s/g, ''))
    .sort();
}

describe('ajuda: mesma estrutura nos três idiomas', () => {
  for (const [locale, c] of LOCALES) {
    it(`${locale}: tutorial, exercícios, guia, exemplos, glossário, perguntas e hipóteses com as mesmas partes`, () => {
      expect(c.tutorial.steps).toHaveLength(TUTORIAL_STEPS.length);
      expect(c.exercises.howTo).toHaveLength(helpPtBR.exercises.howTo.length);
      for (const id of EXERCISE_IDS) {
        // Os ângulos do enunciado são os mesmos nos três idiomas.
        const angles = (text: string) => text.match(/\d+°/g);
        expect(angles(c.exercises.items[id].statement), id).toEqual(
          angles(helpPtBR.exercises.items[id].statement),
        );
      }
      expect(c.guide.steps).toHaveLength(helpPtBR.guide.steps.length);
      expect(c.guide.advanced).toHaveLength(helpPtBR.guide.advanced.length);
      expect(c.guide.tabs).toHaveLength(helpPtBR.guide.tabs.length);
      expect(c.guide.tips).toHaveLength(helpPtBR.guide.tips.length);
      for (const id of EXAMPLE_IDS) {
        expect(c.examples.items[id].steps).toHaveLength(helpPtBR.examples.items[id].steps.length);
      }
      expect(c.glossary.map((g) => g.terms.length)).toEqual(
        helpPtBR.glossary.map((g) => g.terms.length),
      );
      expect(c.faq).toHaveLength(helpPtBR.faq.length);
      expect(c.hypotheses.groups.map((g) => g.items.length)).toEqual(
        helpPtBR.hypotheses.groups.map((g) => g.items.length),
      );
    });

    it(`${locale}: os exemplos trazem os mesmos ângulos, percentuais e medidas do português`, () => {
      for (const id of EXAMPLE_IDS) {
        expect(quantities(c, id), id).toEqual(quantities(helpPtBR, id));
      }
    });
  }

  it('o tutorial em português tem uma etapa para cada etapa do código', () => {
    expect(helpPtBR.tutorial.steps).toHaveLength(TUTORIAL_STEPS.length);
  });

  it('o glossário define α, β e γ nos três idiomas, com as letras gregas', () => {
    for (const c of [helpPtBR, helpEs, helpEn]) {
      const terms = c.glossary.flatMap((g) => g.terms.map((t) => t.term));
      for (const symbol of ['α', 'β', 'γ']) {
        expect(terms.some((t) => t.startsWith(`${symbol} (`))).toBe(true);
      }
    }
  });

  it('sem travessões, sem espaços duplos e sem texto vazio', () => {
    for (const c of [helpPtBR, helpEs, helpEn]) {
      for (const text of texts(c)) {
        expect(text.trim(), text).not.toBe('');
        expect(text, text).not.toMatch(/[—–]/);
        expect(text, text).not.toMatch(/ {2}/);
      }
    }
  });
});

describe('ajuda: links e chaves', () => {
  it('cada exemplo é um estado válido: Brasília, fachada a 30°, ângulos e peças sem erro', () => {
    for (const id of EXAMPLE_IDS) {
      const state = EXAMPLES[id];
      const site = siteFromHash(state);
      expect(site.kind).toBe('city');
      expect(site.site.name).toMatch(/Brasília/);
      const p = protractorFromHash(state);
      expect(p.orientation).toBe(30);
      expect(p.invalid).toEqual([]);
      const g = geometryFromHash(state);
      expect(g.window).not.toBeNull();
      expect(g.invalid).toEqual([]);
      expect(g.pieces.every((piece) => piece.invalid.length === 0)).toBe(true);
    }
    const sizing = sizingFromHash(EXAMPLES.angulos);
    expect(sizing.invalid).toEqual([]);
    expect(sizing.period).not.toBeNull();
  });

  it('o link do exemplo é relativo e traz exemplo=<id>', () => {
    for (const id of EXAMPLE_IDS) {
      const href = exampleHref(id);
      expect(href.startsWith('./#')).toBe(true);
      const state = parseHash(href.slice(2));
      expect(state.exemplo).toBe(id);
      expect(exampleFromHash(state)).toBe(id);
      expect({ ...state, exemplo: undefined }).toEqual({ ...EXAMPLES[id], exemplo: undefined });
    }
    expect(exampleFromHash({ exemplo: 'outro' })).toBeNull();
  });

  it('ajuda=<parte> abre a parte; valor desconhecido abre o guia; sem a chave, fechada', () => {
    expect(helpSectionFromHash({})).toBeNull();
    expect(helpSectionFromHash({ ajuda: 'glossario' })).toBe('glossario');
    expect(helpSectionFromHash({ ajuda: 'x' })).toBe('guia');
  });
});
