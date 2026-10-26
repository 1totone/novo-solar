import { describe, expect, it } from 'vitest';
import { buildHash, parseHash } from './hashState';
import { chartOptionsFromHash, hourLinesPatch, projectionPatch } from './chartOptionsHash';

describe('opções da carta no link (F4.3)', () => {
  it('sem chaves: estereográfica e hora solar (links antigos abrem igual)', () => {
    expect(chartOptionsFromHash(parseHash('#local=recife&o=315'))).toEqual({
      projection: 'stereographic',
      hourLines: 'solar',
    });
  });

  it('proj e hl', () => {
    expect(chartOptionsFromHash(parseHash('#proj=eq&hl=l'))).toEqual({
      projection: 'equidistant',
      hourLines: 'legal',
    });
    expect(chartOptionsFromHash(parseHash('#proj=cil&hl=a'))).toEqual({
      projection: 'cylindrical',
      hourLines: 'both',
    });
    // Valor desconhecido: o padrão.
    expect(chartOptionsFromHash(parseHash('#proj=x&hl=y'))).toEqual({
      projection: 'stereographic',
      hourLines: 'solar',
    });
  });

  it('o padrão some do link', () => {
    const state = {
      local: 'recife',
      ...projectionPatch('stereographic'),
      ...hourLinesPatch('solar'),
    };
    expect(buildHash(state)).toBe('#local=recife');
    expect(buildHash({ ...projectionPatch('cylindrical'), ...hourLinesPatch('both') })).toBe(
      '#hl=a&proj=cil',
    );
  });
});
