import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { epwFromZip, looksLikeZip, ZipFileError } from './zipFile';

const EPW = 'LOCATION,Recife,PE,BRA,TMYx,828990,-8.126,-34.923,-3.0,10.0\n';
const NAME = 'BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_TMYx.2011-2025';

const problem = async (bytes: Uint8Array) => {
  try {
    await epwFromZip(bytes);
  } catch (e) {
    return e instanceof ZipFileError ? e.problem : 'outro erro';
  }
  return 'sem erro';
};

describe('.zip aberto direto (decisão 0048)', () => {
  it('como os do TMYx: tira só o .epw, comprimido, entre os outros arquivos', async () => {
    const zip = zipSync(
      {
        [`${NAME}.ddy`]: strToU8('ddy'),
        [`${NAME}.epw`]: strToU8(EPW.repeat(200)),
        [`${NAME}.stat`]: strToU8('stat'),
      },
      { level: 9 },
    );
    expect(looksLikeZip(zip)).toBe(true);
    const { fileName, content } = await epwFromZip(zip);
    expect(fileName).toBe(`${NAME}.epw`);
    expect(new TextDecoder().decode(content)).toBe(EPW.repeat(200));
  });

  it('numa pasta, e sem as cópias do macOS', async () => {
    const zip = zipSync({
      'recife/recife.EPW': strToU8(EPW),
      '__MACOSX/recife/._recife.EPW': strToU8('lixo'),
    });
    expect((await epwFromZip(zip)).fileName).toBe('recife.EPW');
  });

  it('sem .epw, com mais de um ou corrompido: o motivo', async () => {
    expect(await problem(zipSync({ 'a.csv': strToU8('x') }))).toBe('noEpw');
    expect(await problem(zipSync({ 'a.epw': strToU8(EPW), 'b.epw': strToU8(EPW) }))).toBe(
      'manyEpw',
    );
    const broken = zipSync({ 'a.epw': strToU8(EPW.repeat(50)) }, { level: 9 }).slice(0, 60);
    expect(await problem(broken)).toBe('corrupt');
    expect(looksLikeZip(strToU8(EPW))).toBe(false);
  });
});
