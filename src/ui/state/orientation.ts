/**
 * Orientação da fachada digitada (decisão 0044, item c): graus (vírgula ou ponto decimal, com ou sem
 * "°", sinal de menos comum ou tipográfico) ou um rumo, por sigla ou por extenso, em português,
 * espanhol ou inglês ("NO", "noroeste", "NW", "northwest"). Os rumos são os 16 da rosa dos ventos,
 * a cada 22,5°, a partir do Norte no sentido horário (spec 01, seção 1.2).
 */

/** Siglas dos 16 rumos em cada idioma, a partir do Norte no sentido horário. */
const ABBREVIATIONS = [
  'N,NNE,NE,ENE,L,ESE,SE,SSE,S,SSO,SO,OSO,O,ONO,NO,NNO',
  'N,NNE,NE,ENE,E,ESE,SE,SSE,S,SSO,SO,OSO,O,ONO,NO,NNO',
  'N,NNE,NE,ENE,E,ESE,SE,SSE,S,SSW,SW,WSW,W,WNW,NW,NNW',
];

/** Nomes por extenso dos 16 rumos (os mesmos de `compass.names` nos três idiomas). */
const NAMES = [
  'norte,nor-nordeste,nordeste,lés-nordeste,leste,lés-sudeste,sudeste,su-sudeste,sul,su-sudoeste,sudoeste,oés-sudoeste,oeste,oés-noroeste,noroeste,nor-noroeste',
  'norte,nor-noreste,noreste,este-noreste,este,este-sureste,sureste,sur-sureste,sur,sur-suroeste,suroeste,oeste-suroeste,oeste,oeste-noroeste,noroeste,nor-noroeste',
  'north,north-northeast,northeast,east-northeast,east,east-southeast,southeast,south-southeast,south,south-southwest,southwest,west-southwest,west,west-northwest,northwest,north-northwest',
];

/** Sem acentos, sem espaços, hífens e pontos, em minúsculas: "Lés-Nordeste" → "lesnordeste". */
function key(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s.-]+/g, '');
}

const COMPASS = new Map<string, number>();
for (const list of [...ABBREVIATIONS, ...NAMES]) {
  list.split(',').forEach((name, i) => {
    const k = key(name);
    const previous = COMPASS.get(k);
    // Nenhum nome tem dois significados entre os idiomas (conferido no teste).
    if (previous !== undefined && previous !== i * 22.5) throw new Error(`rumo ambíguo: ${name}`);
    COMPASS.set(k, i * 22.5);
  });
}
/** Português: "sul-sudeste" também se escreve assim (além de "su-sudeste"). */
COMPASS.set(key('sul-sudeste'), 157.5);
COMPASS.set(key('sul-sudoeste'), 202.5);

/** Azimute do rumo digitado, ou null se o texto não for um rumo. */
export function compassAzimuth(text: string): number | null {
  const k = key(text);
  return k === '' ? null : (COMPASS.get(k) ?? null);
}

/** Número digitado: vírgula ou ponto decimal, "°" opcional, sinal "−" ou "-". */
export function parseDegrees(text: string): number | null {
  const t = text.trim().replace(/[°º]$/, '').replace('−', '-').replace(',', '.').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Orientação em graus (sem normalizar), pelo número ou pelo rumo; null se não der para ler. */
export function parseOrientation(text: string): number | null {
  return parseDegrees(text) ?? compassAzimuth(text);
}
