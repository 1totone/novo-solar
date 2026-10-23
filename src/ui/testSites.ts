import type { Site } from '../core/chart/sunChart';

export interface TestSite extends Site {
  id: string;
  name: string;
}

/**
 * Locais de teste: coordenadas, elevação e fuso do cabeçalho dos EPWs de teste
 * (docs/validacao/casos/epw/manifesto.json). A carta não precisa dos dados horários.
 */
export const TEST_SITES: readonly TestSite[] = [
  {
    id: 'florianopolis',
    name: 'Florianópolis (SC)',
    latitude: -27.67,
    longitude: -48.547,
    elevation: 6.1,
    timeZone: -3,
  },
  {
    id: 'brasilia',
    name: 'Brasília (DF)',
    latitude: -15.863,
    longitude: -47.913,
    elevation: 1060.4,
    timeZone: -3,
  },
  {
    id: 'belem',
    name: 'Belém (PA)',
    latitude: -1.379,
    longitude: -48.476,
    elevation: 16.5,
    timeZone: -3,
  },
  {
    id: 'porto-alegre',
    name: 'Porto Alegre (RS)',
    latitude: -29.994,
    longitude: -51.171,
    elevation: 3.4,
    timeZone: -3,
  },
  {
    id: 'manaus',
    name: 'Manaus (AM)',
    latitude: -3.039,
    longitude: -60.05,
    elevation: 80.5,
    timeZone: -4,
  },
  {
    id: 'concepcion',
    name: 'Concepción (Chile)',
    latitude: -36.7783,
    longitude: -73.0625,
    elevation: 7.9,
    timeZone: -4,
  },
];
