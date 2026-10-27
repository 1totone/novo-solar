/**
 * Catálogo nacional de estações (F4.1, decisão 0034): os arquivos TMYx 2011-2025 do Brasil no
 * Climate.OneBuilding.org, com metadados e indicadores de qualidade gerados por
 * scripts/catalogo/gerar_catalogo.py. Os arquivos não vêm com a aplicação: o usuário baixa o
 * oficial e carrega no passo 1.
 */

/** Indicadores de qualidade do EPW (spec 04, seção 4.3), calculados pelo script. */
export interface StationQuality {
  horas: number;
  /** Valores ausentes, somados em todos os campos. */
  ausentes: number;
  /** Horas com velocidade do vento igual a 0 (%). */
  calmaria: number;
  /**
   * Horas com índice de claridade acima de 0,8 e extraterrestre acima de 200 Wh/m² (a
   * extraterrestre da própria hora, pelo SPA, e não a do arquivo, que vem adiantada).
   */
  kt: number;
  /**
   * Atraso (min) da radiação global do arquivo em relação ao sol, nos 30 dias mais claros:
   * positivo, a radiação vem depois do sol; null se não calculado.
   */
  atraso: number | null;
  /** Percentil 95 de |GHI − (DNI · cos z + DHI)| nas horas de sol (Wh/m²). */
  fechamento: number | null;
  /** Somas anuais (kWh/m²). */
  ghi: number;
  dni: number;
  dhi: number;
  /** Temperatura de bulbo seco: mínima, média e máxima (°C). */
  tbs: [number, number, number];
}

export interface Station {
  /** Identificador do ISD (6 dígitos), o do nome do arquivo. */
  id: string;
  /** Nome no OneBuilding, em ASCII, com pontos no lugar de espaços. */
  nome: string;
  /** UF pelas coordenadas (Natural Earth 1:50m). */
  uf: string;
  /** UF do nome do arquivo, quando diferente da UF pelas coordenadas. */
  ufArquivo?: string;
  lat: number;
  lon: number;
  alt: number;
  fuso: number;
  periodo: [number, number];
  anos: number;
  /** "isd": estação com radiação do ERA5; "era5": só reanálise. */
  fonte: 'isd' | 'era5';
  /** Há arquivos futuros (BrazFuture) para esta estação. */
  futuro?: boolean;
  /** Caminho do zip a partir de `base`. */
  url: string;
  q: StationQuality;
}

export interface Catalog {
  base: string;
  estacoes: Station[];
}

/** Carrega o catálogo sob demanda (um bloco separado do resto da aplicação). */
export async function loadCatalog(): Promise<Catalog> {
  const module = await import('../data/catalogo/tmyx-brasil.json');
  return module.default as Catalog;
}

/**
 * Estação do catálogo pelo nome de um arquivo TMYx 2011-2025 carregado (o nome do zip e do EPW traz
 * o identificador: "BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw"); null se não for.
 */
export function catalogIdFromFileName(fileName: string): string | null {
  const m = /\.(\d{6})_TMYx\.2011-2025(\.epw)?$/i.exec(fileName.trim());
  return m ? m[1]! : null;
}

/** Nome legível: pontos viram espaços ("Florianopolis-Luz.Intl.AP" → "Florianopolis-Luz Intl AP"). */
export const displayName = (s: Pick<Station, 'nome'>) => s.nome.replace(/\./g, ' ');

/** Texto sem acentos, minúsculo, com pontos e hífens como espaços, para a busca. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.\-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Estações que contêm todas as palavras da busca no nome, na sigla ou no nome da UF. Vêm antes as
 * que batem pelo nome (as que começam pela busca primeiro), depois as que batem pela UF; dentro de
 * cada grupo, a ordem alfabética.
 */
export function searchStations(
  stations: readonly Station[],
  query: string,
  ufNames: Readonly<Record<string, string>> = {},
): Station[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const matches = (tokens: string[]) =>
    words.every((w) => tokens.some((token) => token.startsWith(w)));
  const scored: { s: Station; rank: number; name: string }[] = [];
  for (const s of stations) {
    const name = normalize(s.nome);
    const nameTokens = name.split(' ');
    const all = [...nameTokens, s.uf.toLowerCase(), ...normalize(ufNames[s.uf] ?? '').split(' ')];
    if (!matches(all)) continue;
    // Primeiro as que batem só pelo nome e começam pela busca; depois só pelo nome; depois pela UF.
    const rank = matches(nameTokens) ? (name.startsWith(words.join(' ')) ? 0 : 1) : 2;
    scored.push({ s, rank, name });
  }
  scored.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return scored.map((x) => x.s);
}

const EARTH_RADIUS_KM = 6371.0088;

/** Distância (km) pelo círculo máximo, na esfera de raio médio da Terra (haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Local da obra (`perto` no link): latitude, longitude e, se informada, altitude. */
export interface ProjectPoint {
  lat: number;
  lon: number;
  alt: number | null;
}

/** Estações mais próximas do local da obra, com a distância e o desnível. */
export function nearestStations(
  stations: readonly Station[],
  point: ProjectPoint,
  count = 8,
): { station: Station; km: number; dz: number | null }[] {
  return stations
    .map((station) => ({
      station,
      km: distanceKm(point.lat, point.lon, station.lat, station.lon),
      dz: point.alt === null ? null : station.alt - point.alt,
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

/** Limites dos avisos de representatividade (proposta da decisão 0034, sem fonte). */
export const FAR_KM = 50;
/** Atraso da radiação a partir do qual a tela avisa (min; metade do intervalo de 30 min). */
export const LAG_MIN = 15;
export const HIGH_DZ_M = 200;
export const FEW_YEARS = 10;

export interface StationWarnings {
  /** Só reanálise (ERA5), sem dados de estação. */
  reanalysis: boolean;
  /** Menos de FEW_YEARS anos de dados no período. */
  fewYears: boolean;
  /** Distância até o local da obra acima de FAR_KM; null sem local da obra. */
  far: number | null;
  /** Desnível até o local da obra acima de HIGH_DZ_M (estação menos obra, m); null sem altitude. */
  height: number | null;
  /** Atraso da radiação de LAG_MIN minutos ou mais (min); null abaixo disso. */
  lag: number | null;
}

export function stationWarnings(station: Station, point: ProjectPoint | null): StationWarnings {
  const km = point ? distanceKm(point.lat, point.lon, station.lat, station.lon) : null;
  const dz = point && point.alt !== null ? station.alt - point.alt : null;
  return {
    reanalysis: station.fonte === 'era5',
    fewYears: station.anos < FEW_YEARS,
    far: km !== null && km > FAR_KM ? km : null,
    height: dz !== null && Math.abs(dz) > HIGH_DZ_M ? dz : null,
    lag:
      station.q.atraso !== null && Math.abs(station.q.atraso) >= LAG_MIN ? station.q.atraso : null,
  };
}

/** `perto=lat,lon[,alt]` no link; null se ausente ou inválido. */
export function projectPointFromHash(text: string | undefined): ProjectPoint | null {
  if (!text) return null;
  const parts = text.split(',').map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3) return null;
  const [lat, lon, alt] = parts.map((p) => (p === '' ? NaN : Number(p)));
  if (!(Number.isFinite(lat) && lat! >= -90 && lat! <= 90)) return null;
  if (!(Number.isFinite(lon) && lon! >= -180 && lon! <= 180)) return null;
  const altitude = parts.length === 3 && Number.isFinite(alt) ? alt! : null;
  return { lat: lat!, lon: lon!, alt: altitude };
}

export function projectPointToHash(p: ProjectPoint): string {
  const round = (v: number, d: number) => String(Math.round(v * 10 ** d) / 10 ** d);
  return [round(p.lat, 4), round(p.lon, 4), ...(p.alt === null ? [] : [round(p.alt, 1)])].join(',');
}
