import { describe, expect, it } from 'vitest';
import { CITIES } from '../cities';
import { buildHash, parseHash } from './hashState';
import { DEFAULT_SITE, hashForSite, siteFromHash } from './siteHash';

describe('local no # da URL', () => {
  it('sem estado: local padrão (Florianópolis), sem dados históricos', () => {
    expect(siteFromHash({})).toEqual({ kind: 'city', site: DEFAULT_SITE, historical: false });
    expect(DEFAULT_SITE.id).toBe('florianopolis');
  });

  it('cidade pelo id', () => {
    const s = siteFromHash({ local: 'manaus' });
    expect(s.kind).toBe('city');
    expect(s.site.timeZone).toBe(-4);
  });

  it('id desconhecido cai no padrão', () => {
    expect(siteFromHash({ local: 'xyz' }).site).toBe(DEFAULT_SITE);
  });

  it('dados históricos: só em cidade do 6.2', () => {
    expect(siteFromHash({ local: 'recife', hist: '1' })).toMatchObject({ historical: true });
    expect(siteFromHash({ local: 'recife', hist: 'x' })).toMatchObject({ historical: false });
    // Manaus não estava no 6.2.
    expect(siteFromHash({ local: 'manaus', hist: '1' })).toMatchObject({ historical: false });
  });

  it('cidade com dados históricos faz ida e volta pela URL', () => {
    const recife = CITIES.find((c) => c.id === 'recife')!;
    const selected = { kind: 'city' as const, site: recife, historical: true };
    const hash = buildHash(hashForSite(selected));
    expect(hash).toBe('#hist=1&local=recife');
    expect(siteFromHash(parseHash(hash))).toEqual(selected);
  });

  it('local de arquivo faz ida e volta pela URL', () => {
    const selected = {
      kind: 'file' as const,
      site: {
        name: 'Recife & região',
        latitude: -8.05,
        longitude: -34.9,
        timeZone: -3,
        elevation: 7,
      },
    };
    const hash = buildHash(hashForSite(selected));
    expect(siteFromHash(parseHash(hash))).toEqual(selected);
  });

  it('coordenadas inválidas no link caem no padrão', () => {
    const s = siteFromHash({ local: 'arquivo', lat: '95', lon: '0', fuso: '0', alt: '0' });
    expect(s).toEqual({ kind: 'city', site: DEFAULT_SITE, historical: false });
  });

  it('trocar para uma cidade limpa as chaves do arquivo e dos dados históricos', () => {
    const patch = hashForSite({ kind: 'city', site: DEFAULT_SITE, historical: false });
    expect(buildHash(patch)).toBe('#local=florianopolis');
    const fromFile = hashForSite({
      kind: 'file',
      site: { name: 'x', latitude: 0, longitude: 0, timeZone: 0, elevation: 0 },
    });
    expect(fromFile.hist).toBe('');
  });
});
