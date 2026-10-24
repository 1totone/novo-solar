import type { Site } from '../core/chart/sunChart';

/** Dados históricos embutidos: os arquivos climáticos do SOL-AR 6.2 (decisão 0017). */
export interface HistoricalData {
  /** Arquivo em docs/validacao/casos/solar-6.2/, publicado junto com a aplicação. */
  file: string;
  /** TRY de Goulart, Lamberts e Firmino (1998) ou IWEC (Concepción). */
  kind: 'try' | 'iwec';
  /** Período dos registros de onde o ano de referência foi escolhido (TRY). */
  period?: readonly [number, number];
  /**
   * Atraso da radiação do arquivo em relação ao sol real, em minutos (positivo: a radiação vem
   * depois do sol). O modelo que gerou a radiação das TRY pôs o sol na longitude de Florianópolis
   * (48,34° O) em todas as cidades (docs/validacao/relatorios/F2.7-dados.md).
   */
  radiationLagMin: number;
  /** Horas em que a radiação global contradiz a extraterrestre do próprio arquivo. */
  inconsistentGlobalHours: number;
}

export interface City extends Site {
  id: string;
  name: string;
  /** Estação do arquivo TMYx (cabeçalho LOCATION) e código WMO. */
  station: string;
  wmo: string;
  /** Arquivo TMYx 2011 a 2025 (Climate.OneBuilding.org), para o usuário baixar e carregar. */
  sourceUrl: string;
  historical?: HistoricalData;
}

const ONEBUILDING = 'https://climate.onebuilding.org/WMO_Region_3_South_America/';
const TRY_1961: Pick<HistoricalData, 'kind' | 'period' | 'inconsistentGlobalHours'> = {
  kind: 'try',
  period: [1961, 1970],
  inconsistentGlobalHours: 0,
};
const TRY_1951: Pick<HistoricalData, 'kind' | 'period' | 'inconsistentGlobalHours'> = {
  kind: 'try',
  period: [1951, 1970],
  inconsistentGlobalHours: 0,
};

/**
 * As 15 cidades do SOL-AR 6.2 e Manaus (UTC−4), em ordem alfabética. Coordenadas, fuso e elevação
 * do cabeçalho do EPW TMYx da estação do aeroporto, a mesma das TRY (livro de 1998), conferidos em
 * tests/referencia/catalogoCidades.test.ts contra docs/validacao/casos/epw/catalogo-cidades.json.
 */
export const CITIES: readonly City[] = [
  {
    id: 'belem',
    name: 'Belém (PA)',
    station: 'Belem-Val.de.Cans.Intl.AP',
    wmo: '821930',
    latitude: -1.379,
    longitude: -48.476,
    elevation: 16.5,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/PA_Para/BRA_PA_Belem-Val.de.Cans.Intl.AP.821930_TMYx.2011-2025.zip`,
    historical: { file: 'belem.csv', ...TRY_1961, radiationLagMin: 0 },
  },
  {
    id: 'brasilia',
    name: 'Brasília (DF)',
    station: 'Brasilia-Kubitschek.Intl.AP',
    wmo: '833780',
    latitude: -15.863,
    longitude: -47.913,
    elevation: 1060.4,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/DF_Distrito_Federal/BRA_DF_Brasilia-Kubitschek.Intl.AP.833780_TMYx.2011-2025.zip`,
    historical: { file: 'brasilia.csv', ...TRY_1961, radiationLagMin: 2 },
  },
  {
    id: 'concepcion',
    name: 'Concepción (Chile)',
    station: 'Concepcion-Carriel.Sur.Intl.AP',
    wmo: '856820',
    latitude: -36.7783,
    longitude: -73.0625,
    elevation: 7.9,
    timeZone: -4,
    sourceUrl: `${ONEBUILDING}CHL_Chile/BI_Bio-Bio/CHL_BI_Concepcion-Carriel.Sur.Intl.AP.856820_TMYx.2011-2025.zip`,
    historical: {
      file: 'concepcion.csv',
      kind: 'iwec',
      radiationLagMin: 0,
      inconsistentGlobalHours: 720,
    },
  },
  {
    id: 'curitiba',
    name: 'Curitiba (PR)',
    station: 'Curitiba-Pena.Intl.AP',
    wmo: '838400',
    latitude: -25.528,
    longitude: -49.176,
    elevation: 910.7,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/PR_Parana/BRA_PR_Curitiba-Pena.Intl.AP.838400_TMYx.2011-2025.zip`,
    historical: { file: 'curitiba.csv', ...TRY_1961, radiationLagMin: -3 },
  },
  {
    id: 'florianopolis',
    name: 'Florianópolis (SC)',
    station: 'Florianopolis-Luz.Intl.AP',
    wmo: '838990',
    latitude: -27.67,
    longitude: -48.547,
    elevation: 6.1,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/SC_Santa_Catarina/BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.zip`,
    historical: { file: 'florianopolis.csv', ...TRY_1961, radiationLagMin: -1 },
  },
  {
    id: 'fortaleza',
    name: 'Fortaleza (CE)',
    station: 'Fortaleza-Pinto.Martins.Intl.AP',
    wmo: '823980',
    latitude: -3.776,
    longitude: -38.533,
    elevation: 25,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/CE_Ceara/BRA_CE_Fortaleza-Pinto.Martins.Intl.AP.823980_TMYx.2011-2025.zip`,
    historical: { file: 'fortaleza.csv', ...TRY_1961, radiationLagMin: 39 },
  },
  {
    id: 'maceio',
    name: 'Maceió (AL)',
    station: 'Maceio-Palmares.Intl.AP',
    wmo: '829930',
    latitude: -9.511,
    longitude: -35.792,
    elevation: 118,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/AL_Alagoas/BRA_AL_Maceio-Palmares.Intl.AP.829930_TMYx.2011-2025.zip`,
    historical: { file: 'maceio.csv', ...TRY_1961, radiationLagMin: 50 },
  },
  {
    id: 'manaus',
    name: 'Manaus (AM)',
    station: 'Manaus-Gomes.Intl.AP',
    wmo: '821110',
    latitude: -3.039,
    longitude: -60.05,
    elevation: 80.5,
    timeZone: -4,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/AM_Amazonas/BRA_AM_Manaus-Gomes.Intl.AP.821110_TMYx.2011-2025.zip`,
  },
  {
    id: 'natal',
    name: 'Natal (RN)',
    station: 'Natal.Intl.AP',
    wmo: '825990',
    latitude: -5.911,
    longitude: -35.248,
    elevation: 51.5,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/RN_Rio_Grande_do_Norte/BRA_RN_Natal.Intl.AP.825990_TMYx.2011-2025.zip`,
    historical: { file: 'natal.csv', ...TRY_1951, radiationLagMin: 52 },
  },
  {
    id: 'porto-alegre',
    name: 'Porto Alegre (RS)',
    station: 'Porto.Alegre-Salgado.Filho.Intl.AP',
    wmo: '839710',
    latitude: -29.994,
    longitude: -51.171,
    elevation: 3.4,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/RS_Rio_Grande_do_Sul/BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_TMYx.2011-2025.zip`,
    historical: { file: 'porto_alegre.csv', ...TRY_1951, radiationLagMin: -11 },
  },
  {
    id: 'recife',
    name: 'Recife (PE)',
    station: 'Recife-Guararapes-Freyre.Intl.AP',
    wmo: '828990',
    latitude: -8.126,
    longitude: -34.924,
    elevation: 10.1,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/PE_Pernambuco/BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_TMYx.2011-2025.zip`,
    historical: { file: 'recife.csv', ...TRY_1951, radiationLagMin: 54 },
  },
  {
    id: 'rio-de-janeiro',
    name: 'Rio de Janeiro (RJ)',
    station: 'Rio.de.Janeiro-Galeao-Jobim.Intl.AP',
    wmo: '837460',
    latitude: -22.809,
    longitude: -43.244,
    elevation: 8.5,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/RJ_Rio_de_Janeiro/BRA_RJ_Rio.de.Janeiro-Galeao-Jobim.Intl.AP.837460_TMYx.2011-2025.zip`,
    historical: { file: 'rio_de_janeiro.csv', ...TRY_1961, radiationLagMin: 20 },
  },
  {
    id: 'salvador',
    name: 'Salvador (BA)',
    station: 'Salvador-Magalhaes.Intl.AP',
    wmo: '832480',
    latitude: -12.911,
    longitude: -38.331,
    elevation: 19.5,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/BA_Bahia/BRA_BA_Salvador-Magalhaes.Intl.AP.832480_TMYx.2011-2025.zip`,
    historical: { file: 'salvador.csv', ...TRY_1961, radiationLagMin: 40 },
  },
  {
    id: 'sao-luis',
    name: 'São Luís (MA)',
    station: 'Sao.Luis-Machado.Intl.AP',
    wmo: '822810',
    latitude: -2.585,
    longitude: -44.234,
    elevation: 54.3,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/MA_Maranhao/BRA_MA_Sao.Luis-Machado.Intl.AP.822810_TMYx.2011-2025.zip`,
    historical: { file: 'sao_luis.csv', ...TRY_1961, radiationLagMin: 16 },
  },
  {
    id: 'sao-paulo',
    name: 'São Paulo (SP)',
    station: 'Sao.Paulo-Congonhas.AP',
    wmo: '837800',
    latitude: -23.627,
    longitude: -46.655,
    elevation: 801.9,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/SP_Sao_Paulo/BRA_SP_Sao.Paulo-Congonhas.AP.837800_TMYx.2011-2025.zip`,
    historical: { file: 'sao_paulo.csv', ...TRY_1951, radiationLagMin: 7 },
  },
  {
    id: 'vitoria',
    name: 'Vitória (ES)',
    station: 'Vitoria-Aguiar.Salles.AP',
    wmo: '836490',
    latitude: -20.258,
    longitude: -40.286,
    elevation: 3.4,
    timeZone: -3,
    sourceUrl: `${ONEBUILDING}BRA_Brazil/ES_Espirito_Santo/BRA_ES_Vitoria-Aguiar.Salles.AP.836490_TMYx.2011-2025.zip`,
    historical: { file: 'vitoria.csv', ...TRY_1961, radiationLagMin: 32 },
  },
];

export const DEFAULT_CITY = CITIES.find((c) => c.id === 'florianopolis')!;
