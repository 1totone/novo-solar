import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEST_SITES } from '../../src/ui/testSites';

describe('locais de teste', () => {
  it('coincidem com o cabeçalho dos EPWs do manifesto', () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL('../../docs/validacao/casos/epw/manifesto.json', import.meta.url),
        'utf-8',
      ),
    ) as {
      arquivos: {
        id: string;
        latitude: number;
        longitude: number;
        elevacao: number;
        fuso: number;
        url: string;
      }[];
    };
    expect(TEST_SITES.map((s) => s.id)).toEqual(manifest.arquivos.map((a) => a.id));
    for (const a of manifest.arquivos) {
      const s = TEST_SITES.find((x) => x.id === a.id)!;
      expect([s.latitude, s.longitude, s.elevation, s.timeZone]).toEqual([
        a.latitude,
        a.longitude,
        a.elevacao,
        a.fuso,
      ]);
      expect(s.sourceUrl).toBe(a.url);
    }
  });
});
