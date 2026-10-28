import { describe, expect, it } from 'vitest';
import type { LoadedFile } from './climateFile';
import { cityOfFile, fileMatches, withFile } from './sources';

/** Só o que a correspondência usa: nome, texto e local do cabeçalho. */
const file = (fileName: string, latitude: number, longitude: number, timeZone = -3, text = 'x') =>
  ({ fileName, text, data: { location: { latitude, longitude, timeZone } } }) as LoadedFile;

const RECIFE_TMYX = 'BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_TMYx.2011-2025.epw';

describe('fontes de dados de um lugar (decisão 0047)', () => {
  it('arquivo TMYx: pelo código da estação no nome', () => {
    expect(cityOfFile(file(RECIFE_TMYX, -8.13, -34.92))?.id).toBe('recife');
    // Outra estação perto de Recife não é a da cidade, mesmo a menos de 0,1°.
    expect(cityOfFile(file('BRA_PE_Recife.819580_TMYx.2011-2025.epw', -8.06, -34.95))).toBeNull();
  });

  it('outros arquivos: pelas coordenadas (até 0,1°) e pelo fuso', () => {
    expect(cityOfFile(file('recife_futuro.epw', -8.05, -34.95))?.id).toBe('recife');
    expect(cityOfFile(file('recife_utc.epw', -8.05, -34.95, 0))).toBeNull();
    expect(cityOfFile(file('caruaru.epw', -8.28, -35.97))).toBeNull();
    expect(
      fileMatches(file('a.epw', -27.6, -48.5), {
        latitude: -27.67,
        longitude: -48.55,
        timeZone: -3,
      }),
    ).toBe(true);
  });

  it('a lista da sessão não repete o mesmo arquivo e guarda a ordem', () => {
    const a = file('a.epw', 0, 0);
    const b = file('b.epw', 1, 1);
    const again = file('a.epw', 0, 0);
    expect(withFile([a, b], again)).toEqual([again, b]);
    expect(withFile([a, b], again)[0]).toBe(again);
    expect(withFile([a], file('a.epw', 0, 0, -3, 'outro texto'))).toHaveLength(2);
  });
});
