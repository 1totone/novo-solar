import { describe, expect, it } from 'vitest';
import { protractorFromHash } from './protractorHash';

describe('fachada e ângulos no # da URL', () => {
  it('padrão: orientação 0°, transferidor visível, referência interna, sem ângulos', () => {
    const p = protractorFromHash({});
    expect(p).toMatchObject({ orientation: 0, show: true, reference: 'internal', invalid: [] });
    expect(p.angles.alpha).toBeUndefined();
  });

  it('lê orientação negativa, vírgula decimal e índices 1 e 2', () => {
    const p = protractorFromHash({ o: '-30', ref: 'e', a1: '45', a2: '12,5', bd1: '30' });
    expect(p.orientation).toBe(-30);
    expect(p.reference).toBe('external');
    expect(p.angles.alpha).toEqual([45, 12.5]);
    expect(p.angles.betaRight).toEqual([30]);
  });

  it('marca valores fora de 0° a 90° e não os usa', () => {
    const p = protractorFromHash({ a1: '95', be1: 'x', gd1: '20' });
    expect(p.invalid).toEqual(['a1', 'be1']);
    expect(p.angles.alpha).toBeUndefined();
    expect(p.angles.gammaRight).toEqual([20]);
  });

  it('índice 2 sem índice 1 não desenha nada', () => {
    expect(protractorFromHash({ a2: '30' }).angles.alpha).toBeUndefined();
  });

  it('orientação inválida cai em 0° e é sinalizada', () => {
    const p = protractorFromHash({ o: 'norte' });
    expect(p.orientation).toBe(0);
    expect(p.orientationValid).toBe(false);
  });
});
