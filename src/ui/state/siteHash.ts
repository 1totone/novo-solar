import type { Site } from '../../core/chart/sunChart';
import { CITIES, DEFAULT_CITY, type City } from '../cities';
import type { HashState } from './hashState';

/**
 * Local escolhido, guardado no '#' da URL (decisão 0009):
 * - cidade do catálogo: `local=<id>`; com os dados históricos do SOL-AR 6.2 abertos, `hist=1`;
 * - local lido de um arquivo (EPW ou CSV): `local=arquivo&nome=...&lat=...&lon=...&fuso=...&alt=...`;
 * - estação do catálogo nacional (F4.1): `local=estacao&est=<id>&nome=...&lat=...` (as mesmas chaves do
 *   arquivo, para que a carta reabra sem o catálogo).
 * A carta só precisa de coordenadas, fuso e elevação, então o link reabre a mesma carta mesmo sem
 * o arquivo; os dados históricos fazem parte da aplicação e reabrem pelo link.
 */
export type SelectedSite =
  | { kind: 'city'; site: City; historical: boolean }
  | { kind: 'file'; site: Site & { name: string } }
  | { kind: 'station'; id: string; site: Site & { name: string } };

export const DEFAULT_SITE = DEFAULT_CITY;

function num(v: string | undefined, min: number, max: number): number | undefined {
  if (v === undefined || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function siteFromHash(state: HashState): SelectedSite {
  if (state.local === 'arquivo' || (state.local === 'estacao' && /^\d{6}$/.test(state.est ?? ''))) {
    const latitude = num(state.lat, -90, 90);
    const longitude = num(state.lon, -180, 180);
    const timeZone = num(state.fuso, -12, 14);
    const elevation = num(state.alt, -1000, 9000);
    if (
      latitude !== undefined &&
      longitude !== undefined &&
      timeZone !== undefined &&
      elevation !== undefined
    ) {
      const site = { name: state.nome ?? '', latitude, longitude, timeZone, elevation };
      return state.local === 'estacao'
        ? { kind: 'station', id: state.est!, site }
        : { kind: 'file', site };
    }
  }
  const city = CITIES.find((s) => s.id === state.local) ?? DEFAULT_SITE;
  return { kind: 'city', site: city, historical: state.hist === '1' && Boolean(city.historical) };
}

const FILE_KEYS = ['nome', 'lat', 'lon', 'fuso', 'alt', 'est'] as const;

/** Patch do estado na URL para o local dado (limpa as chaves do outro tipo). */
export function hashForSite(selected: SelectedSite): HashState {
  if (selected.kind === 'city') {
    return {
      local: selected.site.id,
      hist: selected.historical ? '1' : '',
      ...Object.fromEntries(FILE_KEYS.map((k) => [k, ''])),
    };
  }
  const s = selected.site;
  return {
    local: selected.kind === 'station' ? 'estacao' : 'arquivo',
    est: selected.kind === 'station' ? selected.id : '',
    hist: '',
    nome: s.name,
    lat: String(s.latitude),
    lon: String(s.longitude),
    fuso: String(s.timeZone),
    alt: String(s.elevation),
  };
}
