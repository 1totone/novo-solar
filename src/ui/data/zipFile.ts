/**
 * Arquivo .zip aberto direto no passo 1 (decisão 0048, item g da 0044): o .epw de dentro é
 * descompactado no navegador, sem servidor, pelo fflate (MIT), que só é baixado quando a pessoa
 * escolhe um .zip. Os .zip do TMYx (Climate.OneBuilding.org) trazem um .epw e os arquivos que o
 * acompanham (.ddy, .stat, .clm, .wea, .pvsyst, .rain); só o .epw é descompactado.
 */
export type ZipProblem = 'noEpw' | 'manyEpw' | 'corrupt';

export class ZipFileError extends Error {
  readonly problem: ZipProblem;
  constructor(problem: ZipProblem) {
    super(`zip: ${problem}`);
    this.problem = problem;
  }
}

/** O arquivo começa com a assinatura de um .zip ("PK\x03\x04")? */
export function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** O único .epw de um .zip: nome (sem as pastas) e conteúdo. */
export async function epwFromZip(
  bytes: Uint8Array,
): Promise<{ fileName: string; content: Uint8Array }> {
  const { unzipSync } = await import('fflate');
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      // Só o .epw é descompactado; as cópias que o macOS põe em __MACOSX/ ficam de fora.
      filter: (f) => /\.epw$/i.test(f.name) && !/(^|\/)__MACOSX\//.test(f.name),
    });
  } catch {
    throw new ZipFileError('corrupt');
  }
  const names = Object.keys(entries);
  if (names.length === 0) throw new ZipFileError('noEpw');
  if (names.length > 1) throw new ZipFileError('manyEpw');
  const name = names[0]!;
  return { fileName: name.split('/').pop()!, content: entries[name]! };
}
