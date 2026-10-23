import { describe, expect, it } from 'vitest';
import { buildHash, parseHash } from './hashState';
import { DEFAULT_SITE, hashForSite, siteFromHash } from './siteHash';

describe('local no # da URL', () => {
  it('sem estado: local padrão (Florianópolis)', () => {
    expect(siteFromHash({})).toEqual({ kind: 'test', site: DEFAULT_SITE });
    expect(DEFAULT_SITE.id).toBe('florianopolis');
  });

  it('local de teste pelo id', () => {
    const s = siteFromHash({ local: 'manaus' });
    expect(s.kind).toBe('test');
    expect(s.site.timeZone).toBe(-4);
  });

  it('id desconhecido cai no padrão', () => {
    expect(siteFromHash({ local: 'xyz' }).site).toBe(DEFAULT_SITE);
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
    expect(s).toEqual({ kind: 'test', site: DEFAULT_SITE });
  });

  it('trocar para local de teste limpa as chaves do arquivo', () => {
    const patch = hashForSite({ kind: 'test', site: DEFAULT_SITE });
    expect(buildHash(patch)).toBe('#local=florianopolis');
  });
});
