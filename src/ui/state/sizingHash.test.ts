import { describe, expect, it } from 'vitest';
import { parseHash } from './hashState';
import { parseDay, sizingFromHash } from './sizingHash';

const from = (hash: string) => sizingFromHash(parseHash(hash));

describe('período do dimensionamento no link', () => {
  it('dias "dd/mm" válidos para o mês', () => {
    expect(parseDay('21/12')).toEqual({ month: 12, day: 21 });
    expect(parseDay(' 1-3 ')).toEqual({ month: 3, day: 1 });
    expect(parseDay('29/2')).toBeNull();
    expect(parseDay('31/4')).toBeNull();
    expect(parseDay('dez')).toBeNull();
  });

  it('período do verão em hora solar, sem afastamento e sem subdivisão', () => {
    const s = from('#dpi=21%2F10&dpf=21%2F2&dhi=9&dhf=15');
    expect(s.defined).toBe(true);
    expect(s.period).toEqual({
      start: { month: 10, day: 21 },
      end: { month: 2, day: 21 },
      startHour: 9,
      endHour: 15,
      timeBase: 'solar',
    });
    expect(s.gap).toBe(0);
    expect(s.count).toBe(1);
  });

  it('hora legal, horas decimais, afastamento e lâminas', () => {
    const s = from('#dpi=1%2F1&dpf=31%2F12&dhi=8%2C5&dhf=16&dtb=l&dbg=0%2C2&dbn=4');
    expect(s.period).toMatchObject({ startHour: 8.5, endHour: 16, timeBase: 'legal' });
    expect(s.gap).toBe(0.2);
    expect(s.count).toBe(4);
  });

  it('campos inválidos marcados; sem período até corrigir', () => {
    expect(from('#dpi=32%2F1&dpf=1%2F2').invalid).toEqual(['start']);
    expect(from('#dpi=1%2F1&dpf=1%2F2&dhi=16&dhf=9').invalid).toEqual(['startHour', 'endHour']);
    expect(from('#dpi=1%2F1&dpf=1%2F2&dbg=-1&dbn=0').invalid).toEqual(['gap', 'count']);
    expect(from('#dpi=1%2F1&dpf=1%2F2&dbn=2%2C5').period).toBeNull();
    expect(from('#local=florianopolis').defined).toBe(false);
  });
});
