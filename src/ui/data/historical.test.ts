import { describe, expect, it } from 'vitest';
import { CITIES } from '../cities';
import { publishedHistoricalFiles } from './historical';

describe('dados históricos publicados', () => {
  it('são exatamente os arquivos das cidades do catálogo', () => {
    const files = CITIES.flatMap((c) => (c.historical ? [c.historical.file] : []));
    expect(publishedHistoricalFiles().sort()).toEqual([...files].sort());
  });
});
