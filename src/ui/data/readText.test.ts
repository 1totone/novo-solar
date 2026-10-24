import { describe, expect, it } from 'vitest';
import { decodeText } from './readText';

describe('decodeText', () => {
  it('lê UTF-8 (com acentos)', () => {
    expect(decodeText(new TextEncoder().encode('Localização,Elevação').buffer)).toBe(
      'Localização,Elevação',
    );
  });

  it('cai para Windows-1252 quando o arquivo não é UTF-8 válido (CSV original do 6.2)', () => {
    // "Localização" em Latin-1: ç = 0xE7, ã = 0xE3.
    const latin1 = Uint8Array.from([76, 111, 99, 97, 108, 105, 122, 97, 0xe7, 0xe3, 111]);
    expect(decodeText(latin1.buffer)).toBe('Localização');
  });
});
