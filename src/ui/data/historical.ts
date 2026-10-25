import { useEffect, useState } from 'react';
import type { EpwData } from '../../core/epw/parseEpw';
import { parseSolar62 } from '../../core/epw/parseSolar62';
import type { City } from '../cities';

/**
 * Arquivos do SOL-AR 6.2 publicados junto com a aplicação (decisão 0017). O Vite copia cada um
 * para dist/assets/ e devolve o endereço relativo; nada vem de outro servidor.
 */
const URLS = import.meta.glob(
  [
    '../../../docs/validacao/casos/solar-6.2/*.csv',
    '!../../../docs/validacao/casos/solar-6.2/Latitudes.csv',
    '!../../../docs/validacao/casos/solar-6.2/*.ventos.csv',
    // Arquivo de teste do F2.8 (hora em que o 6.2 desenha os dados), não é dado de cidade.
    '!../../../docs/validacao/casos/solar-6.2/teste-hora.csv',
  ],
  { query: '?url', import: 'default', eager: true },
) as Record<string, string>;

export function historicalUrl(file: string): string | undefined {
  return URLS[`../../../docs/validacao/casos/solar-6.2/${file}`];
}

/** Nomes dos arquivos publicados com a aplicação. */
export function publishedHistoricalFiles(): string[] {
  return Object.keys(URLS).map((path) => path.slice(path.lastIndexOf('/') + 1));
}

const cache = new Map<string, Promise<EpwData>>();

/** Lê os dados históricos da cidade, com o local do catálogo (os arquivos não têm cabeçalho). */
export function loadHistorical(city: City): Promise<EpwData> {
  const file = city.historical?.file;
  const url = file ? historicalUrl(file) : undefined;
  if (!file || !url) return Promise.reject(new Error(`sem dados históricos: ${city.id}`));
  let data = cache.get(file);
  if (!data) {
    data = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return r.text();
      })
      .then((text) =>
        parseSolar62(text, {
          name: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
          timeZone: city.timeZone,
          elevation: city.elevation,
        }),
      );
    data.catch(() => cache.delete(file));
    cache.set(file, data);
  }
  return data;
}

export type HistoricalState =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'ready'; data: EpwData }
  | { status: 'error' };

/** Dados históricos da cidade quando `open`; carrega uma vez por arquivo. */
export function useHistorical(city: City | null, open: boolean): HistoricalState {
  const [loaded, setLoaded] = useState<{ file: string; result: HistoricalState } | null>(null);
  const file = open && city?.historical ? city.historical.file : null;

  useEffect(() => {
    if (!file || !city) return;
    let active = true;
    loadHistorical(city).then(
      (data) => active && setLoaded({ file, result: { status: 'ready', data } }),
      () => active && setLoaded({ file, result: { status: 'error' } }),
    );
    return () => {
      active = false;
    };
  }, [file, city]);

  if (!file) return { status: 'off' };
  return loaded?.file === file ? loaded.result : { status: 'loading' };
}
