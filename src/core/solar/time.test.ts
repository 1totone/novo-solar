import { describe, expect, it } from 'vitest';
import { epwInstantUtc, localStandardToUtc } from './time';

describe('hora legal para UTC com o fuso do arquivo', () => {
  it('UTC−3: 12:00 local = 15:00 UTC', () => {
    expect(new Date(localStandardToUtc(2026, 1, 21, 12, -3)).toISOString()).toBe(
      '2026-01-21T15:00:00.000Z',
    );
  });

  it('UTC−4 e frações de hora', () => {
    expect(new Date(localStandardToUtc(2026, 6, 21, 6.5, -4)).toISOString()).toBe(
      '2026-06-21T10:30:00.000Z',
    );
  });

  it('fuso positivo atravessa o dia', () => {
    expect(new Date(localStandardToUtc(2026, 1, 1, 2, 9)).toISOString()).toBe(
      '2025-12-31T17:00:00.000Z',
    );
  });
});

describe('instante de uma hora do EPW (docs/spec/02, seção 2.2)', () => {
  it('fim do intervalo: hora 13 = 13:00 local', () => {
    expect(new Date(epwInstantUtc(1, 21, 13, -3, 'end')).toISOString()).toBe(
      '2026-01-21T16:00:00.000Z',
    );
  });

  it('meio do intervalo: hora 13 = 12:30 local (radiação)', () => {
    expect(new Date(epwInstantUtc(1, 21, 13, -3, 'middle')).toISOString()).toBe(
      '2026-01-21T15:30:00.000Z',
    );
  });

  it('hora 24 é a meia-noite do dia seguinte', () => {
    expect(new Date(epwInstantUtc(12, 31, 24, -3, 'end')).toISOString()).toBe(
      '2027-01-01T03:00:00.000Z',
    );
  });

  it('usa o ano de referência 2026', () => {
    expect(new Date(epwInstantUtc(3, 1, 1, 0, 'end')).getUTCFullYear()).toBe(2026);
  });
});
