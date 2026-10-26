import { describe, expect, it } from 'vitest';
import { solidAngle } from '../../core/mask/compare';
import { parseHash } from '../state/hashState';
import { protractorFromHash } from '../state/protractorHash';
import { siteFromHash } from '../state/siteHash';
import { answerRegion, EXERCISE_IDS, EXERCISES, exerciseFromHash, exerciseHref } from './exercises';
import { TUTORIAL_HREF, TUTORIAL_STEPS, tutorialStepFromHash } from './tutorial';

describe('tutorial guiado (spec 12, seção 12.1)', () => {
  it('cada etapa com ação: o "Fazer por mim" deixa a etapa feita; antes, não', () => {
    let state = parseHash(TUTORIAL_HREF.slice(2));
    expect(tutorialStepFromHash(state)).toBe(1);
    for (const step of TUTORIAL_STEPS) {
      if (!step.done) continue;
      expect(step.done(state), step.id).toBe(false);
      state = { ...state, ...step.patch };
      expect(step.done(state), step.id).toBe(true);
    }
    // No fim, o estado é o do caso de Brasília (o mesmo dos exemplos da ajuda).
    expect(state).toMatchObject({ local: 'brasilia', o: '30', a1: '55', gd1: '50', ge1: '60' });
  });

  it('a etapa vem do link, limitada ao número de etapas', () => {
    expect(tutorialStepFromHash({})).toBeNull();
    expect(tutorialStepFromHash({ tutorial: '0' })).toBeNull();
    expect(tutorialStepFromHash({ tutorial: 'x' })).toBeNull();
    expect(tutorialStepFromHash({ tutorial: '3' })).toBe(3);
    expect(tutorialStepFromHash({ tutorial: '99' })).toBe(TUTORIAL_STEPS.length);
  });

  it('as condições aceitam valores equivalentes (vírgula, volta inteira)', () => {
    const facade = TUTORIAL_STEPS.find((s) => s.id === 'fachada')!;
    expect(facade.done!({ o: '390' })).toBe(true);
    expect(facade.done!({ o: '30,0' })).toBe(true);
    expect(facade.done!({ o: '' })).toBe(false);
    const alpha = TUTORIAL_STEPS.find((s) => s.id === 'alfa')!;
    expect(alpha.done!({ a1: '55', ref: 'e' })).toBe(false);
  });
});

describe('exercícios de máscara (spec 12, seção 12.2)', () => {
  it('o link traz o local e a fachada, sem os ângulos da resposta', () => {
    for (const id of EXERCISE_IDS) {
      const state = parseHash(exerciseHref(id).slice(2));
      expect(exerciseFromHash(state)).toBe(id);
      expect(siteFromHash(state).kind).toBe('city');
      const p = protractorFromHash(state);
      expect(p.orientation).toBe(EXERCISES[id].orientation);
      expect(Object.values(p.angles).every((v) => v === undefined)).toBe(true);
    }
    expect(exerciseFromHash({ exercicio: 'outro' })).toBeNull();
  });

  it('cada resposta é uma região de sombra com tamanho razoável (de 5% a 70% do céu diante da fachada)', () => {
    for (const id of EXERCISE_IDS) {
      const e = EXERCISES[id];
      const share = solidAngle(answerRegion(id), e.orientation) / Math.PI;
      expect(share, id).toBeGreaterThan(0.05);
      expect(share, id).toBeLessThan(0.7);
    }
  });
});
