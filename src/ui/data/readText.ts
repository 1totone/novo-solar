/**
 * Texto de um arquivo: UTF-8 quando o arquivo é UTF-8 válido; senão, Windows-1252 (Latin-1), a
 * codificação dos CSV originais do SOL-AR 6.2 e de muitas planilhas exportadas no Brasil.
 */
export function decodeText(buffer: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}
