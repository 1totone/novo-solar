import { describe, expect, it } from 'vitest';
import { overlayCells } from '../../core/overlay/overlay';
import { cellsKey, peekCells, requestCells } from './cellsClient';

const SITE = { latitude: -27.67, longitude: -48.547, elevation: 6.1, timeZone: -3 };

describe('células com cache por local', () => {
  it('a chave só depende do local, do semestre e da convenção de tempo', () => {
    expect(cellsKey(SITE, 1, 'instant')).toBe(cellsKey({ ...SITE }, 1, 'instant'));
    expect(cellsKey(SITE, 1, 'instant')).not.toBe(cellsKey(SITE, 2, 'instant'));
    expect(cellsKey(SITE, 1, 'instant')).not.toBe(
      cellsKey({ ...SITE, timeZone: -4 }, 1, 'instant'),
    );
  });

  it('outro arquivo do mesmo local reaproveita o cálculo; sem worker, calcula na linha principal', async () => {
    expect(peekCells(SITE, 1, 'integrated')).toBeNull();
    const a = requestCells(SITE, 1, 'integrated');
    const b = requestCells({ ...SITE }, 1, 'integrated');
    expect(b).toBe(a);
    const cells = await a;
    expect(peekCells(SITE, 1, 'integrated')).toBe(cells);
    expect(cells).toEqual(overlayCells(SITE, 1, 'integrated'));
  });
});
