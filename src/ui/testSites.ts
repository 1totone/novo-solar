import type { Site } from '../core/chart/sunChart';

export interface TestSite extends Site {
  id: string;
  name: string;
  /** Arquivo TMYx de origem (Climate.OneBuilding.org), para o usuário baixar e carregar. */
  sourceUrl: string;
}

/**
 * Locais de teste: coordenadas, elevação e fuso do cabeçalho dos EPWs de teste
 * (docs/validacao/casos/epw/manifesto.json). A carta não precisa dos dados horários.
 */
export const TEST_SITES: readonly TestSite[] = [
  {
    id: 'florianopolis',
    sourceUrl:
      'https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/SC_Santa_Catarina/BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.zip',
    name: 'Florianópolis (SC)',
    latitude: -27.67,
    longitude: -48.547,
    elevation: 6.1,
    timeZone: -3,
  },
  {
    id: 'brasilia',
    sourceUrl:
      'https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/DF_Distrito_Federal/BRA_DF_Brasilia-Kubitschek.Intl.AP.833780_TMYx.2011-2025.zip',
    name: 'Brasília (DF)',
    latitude: -15.863,
    longitude: -47.913,
    elevation: 1060.4,
    timeZone: -3,
  },
  {
    id: 'belem',
    sourceUrl:
      'https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/PA_Para/BRA_PA_Belem-Val.de.Cans.Intl.AP.821930_TMYx.2011-2025.zip',
    name: 'Belém (PA)',
    latitude: -1.379,
    longitude: -48.476,
    elevation: 16.5,
    timeZone: -3,
  },
  {
    id: 'porto-alegre',
    sourceUrl:
      'https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/RS_Rio_Grande_do_Sul/BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_TMYx.2011-2025.zip',
    name: 'Porto Alegre (RS)',
    latitude: -29.994,
    longitude: -51.171,
    elevation: 3.4,
    timeZone: -3,
  },
  {
    id: 'manaus',
    sourceUrl:
      'https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/AM_Amazonas/BRA_AM_Manaus-Gomes.Intl.AP.821110_TMYx.2011-2025.zip',
    name: 'Manaus (AM)',
    latitude: -3.039,
    longitude: -60.05,
    elevation: 80.5,
    timeZone: -4,
  },
  {
    id: 'concepcion',
    sourceUrl:
      'https://climate.onebuilding.org/WMO_Region_3_South_America/CHL_Chile/BI_Bio-Bio/CHL_BI_Concepcion-Carriel.Sur.Intl.AP.856820_TMYx.2011-2025.zip',
    name: 'Concepción (Chile)',
    latitude: -36.7783,
    longitude: -73.0625,
    elevation: 7.9,
    timeZone: -4,
  },
];
