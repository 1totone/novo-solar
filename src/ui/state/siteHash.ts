import type { Site } from '../../core/chart/sunChart';
import { TEST_SITES, type TestSite } from '../testSites';
import type { HashState } from './hashState';

/**
 * Local escolhido, guardado no '#' da URL (decisão 0009):
 * - local de teste: `local=<id>`;
 * - local lido de um EPW: `local=arquivo&nome=...&lat=...&lon=...&fuso=...&alt=...`.
 * A carta só precisa de coordenadas, fuso e elevação, então o link reabre a mesma carta
 * mesmo sem o arquivo.
 */
export type SelectedSite =
  { kind: 'test'; site: TestSite } | { kind: 'file'; site: Site & { name: string } };

export const DEFAULT_SITE = TEST_SITES[0]!;

function num(v: string | undefined, min: number, max: number): number | undefined {
  if (v === undefined || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function siteFromHash(state: HashState): SelectedSite {
  if (state.local === 'arquivo') {
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
      return {
        kind: 'file',
        site: { name: state.nome ?? '', latitude, longitude, timeZone, elevation },
      };
    }
  }
  const test = TEST_SITES.find((s) => s.id === state.local);
  return { kind: 'test', site: test ?? DEFAULT_SITE };
}

const FILE_KEYS = ['nome', 'lat', 'lon', 'fuso', 'alt'] as const;

/** Patch do estado na URL para o local dado (limpa as chaves do outro tipo). */
export function hashForSite(selected: SelectedSite): HashState {
  if (selected.kind === 'test') {
    return { local: selected.site.id, ...Object.fromEntries(FILE_KEYS.map((k) => [k, ''])) };
  }
  const s = selected.site;
  return {
    local: 'arquivo',
    nome: s.name,
    lat: String(s.latitude),
    lon: String(s.longitude),
    fuso: String(s.timeZone),
    alt: String(s.elevation),
  };
}
