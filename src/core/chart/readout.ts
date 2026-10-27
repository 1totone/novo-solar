/**
 * Leitura de um ponto da carta (decisão 0045; docs/spec/03-projecoes.md, seção 3.6): para uma
 * direção do céu, a altura, o azimute e quando o sol passa por ela. Usada pela interface ao passar
 * o mouse ou tocar na carta.
 *
 * A direção dá a declinação δ e o ângulo horário H que levam o sol até ela (triângulo de posição,
 * com o centro da Terra como origem: a paralaxe do sol, de no máximo 0,0024°, fica de fora). H dá a
 * hora solar verdadeira; δ dá as datas, pela declinação do sol ao longo do ano de referência,
 * calculada pelo SPA a cada 0 h UT e interpolada. A declinação passa por cada valor entre os
 * extremos duas vezes por ano; além do extremo (trajetória do solstício), nenhuma, salvo a menos
 * do raio do disco solar, quando o disco ainda cobre o ponto no solstício.
 *
 * Validação: tests/referencia/leituraCarta.test.ts (linhas horárias do pvlib em 6 locais) e
 * readout.test.ts (ida e volta pelo SPA e casos-limite).
 */
import { REFERENCE_YEAR } from '../solar/constants';
import { solarPosition } from '../solar/spa';
import { civilDate, type CivilDate, type Site } from './sunChart';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

/**
 * Raio angular médio do disco solar: o raio nominal do Sol (IAU 2015, Resolução B3) visto a 1 UA,
 * 959,63″. Varia de 0,262° a 0,271° ao longo do ano; a diferença não muda a leitura.
 */
export const SUN_RADIUS_DEG = 959.63 / 3600;

export interface SunPassage {
  /**
   * Instante UTC (ms) da passagem: a hora solar do ponto no dia em que a trajetória do sol passa
   * mais perto dele (a menos de 0,2°, dentro do disco).
   */
  utcMs: number;
  /** Data civil na hora legal do fuso do local. */
  date: CivilDate;
  /** Hora legal no fuso do local, em horas decimais de 0 a 24. */
  legalHour: number;
}

export interface DirectionReading {
  /** Declinação que leva o sol à direção, em graus. */
  declination: number;
  /** Ângulo horário, em graus, positivo à tarde, em [−180°, 180°). */
  hourAngle: number;
  /** Hora solar verdadeira, em horas decimais de 0 a 24. */
  solarHour: number;
  /**
   * Passagens do sol pela direção no ano de referência, em ordem: duas, uma (o ponto está além da
   * trajetória do solstício, a menos do raio do disco: o disco o cobre no solstício) ou nenhuma (o
   * sol nunca chega ao ponto).
   */
  passages: SunPassage[];
  /**
   * Verdadeiro quando o ponto fica além da trajetória do solstício: a passagem única é a do disco,
   * que ainda cobre o ponto, e não a do centro.
   */
  solsticeEdge: boolean;
}

interface YearTable {
  /** Instante UTC de 0 h UT do dia 0 (1º de janeiro) do ano. */
  start: number;
  /** Declinação geocêntrica (graus) e equação do tempo (min) a cada 0 h UT, dias −1 a 367. */
  declination: Float64Array;
  equationOfTime: Float64Array;
}

const tables = new Map<number, YearTable>();

function yearTable(year: number): YearTable {
  let t = tables.get(year);
  if (t) return t;
  const start = Date.UTC(year, 0, 1);
  const n = 369;
  const declination = new Float64Array(n);
  const equationOfTime = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const p = solarPosition(start + (k - 1) * MS_PER_DAY, 0, 0, 0);
    declination[k] = p.declination;
    equationOfTime[k] = p.equationOfTime;
  }
  t = { start, declination, equationOfTime };
  tables.set(year, t);
  return t;
}

/**
 * Valor da tabela no instante dado, pela parábola dos três dias mais próximos (erro abaixo de
 * 10⁻⁵° na declinação, também perto dos solstícios, onde a reta entre dois dias corta o pico).
 */
function interpolate(table: YearTable, values: Float64Array, utc: number): number {
  const x = (utc - table.start) / MS_PER_DAY + 1;
  const k = Math.max(1, Math.min(values.length - 2, Math.round(x)));
  const f = x - k;
  const [a, b, c] = [values[k - 1]!, values[k]!, values[k + 1]!];
  return b + (f * (c - a)) / 2 + (f * f * (a - 2 * b + c)) / 2;
}

/** Instante UTC em que a hora solar verdadeira vale `solarHour` no dia `day` do ano (0 = 1º/1). */
function solarInstant(table: YearTable, longitude: number, day: number, solarHour: number): number {
  const base = table.start + day * MS_PER_DAY + (solarHour - longitude / 15) * MS_PER_HOUR;
  // A equação do tempo muda menos de 0,5 min por dia: duas iterações bastam.
  let t = base;
  for (let i = 0; i < 2; i++) {
    t = base - (interpolate(table, table.equationOfTime, t) / 60) * MS_PER_HOUR;
  }
  return t;
}

function passage(utcMs: number, timeZone: number): SunPassage {
  const local = utcMs + timeZone * MS_PER_HOUR;
  const dayStart = Math.floor(local / MS_PER_DAY) * MS_PER_DAY;
  return {
    utcMs,
    date: civilDate(utcMs, timeZone),
    legalHour: (local - dayStart) / MS_PER_HOUR,
  };
}

/**
 * Leitura da direção (ângulo zenital e azimute a partir do Norte, sentido horário, em graus) para
 * o local, no ano de referência das trajetórias da carta.
 */
export function readDirection(
  site: Site,
  zenith: number,
  azimuth: number,
  year: number = REFERENCE_YEAR,
): DirectionReading {
  const phi = site.latitude * RAD;
  const z = zenith * RAD;
  const a = azimuth * RAD;
  const east = Math.sin(z) * Math.sin(a);
  const north = Math.sin(z) * Math.cos(a);
  const up = Math.cos(z);
  const declination =
    Math.asin(Math.max(-1, Math.min(1, up * Math.sin(phi) + north * Math.cos(phi)))) * DEG;
  const hourAngle = Math.atan2(-east, up * Math.cos(phi) - north * Math.sin(phi)) * DEG;
  const solarHour = (((12 + hourAngle / 15) % 24) + 24) % 24;

  const table = yearTable(year);
  // Declinação do sol, menos a pedida, no instante dessa hora solar em cada dia do ano.
  const instants: number[] = [];
  const f: number[] = [];
  for (let day = 0; day <= 365; day++) {
    const t = solarInstant(table, site.longitude, day, solarHour);
    instants.push(t);
    f.push(interpolate(table, table.declination, t) - declination);
  }
  // Entre dois dias seguidos em que a diferença muda de sinal, o ponto fica entre as trajetórias
  // dos dois dias: o disco do sol passa por ele no dia mais próximo (a declinação muda até 0,41°
  // por dia; a meio caminho, 0,2°, menos que o raio do disco), naquela hora solar.
  const passages: SunPassage[] = [];
  for (let day = 0; day < 365; day++) {
    const f0 = f[day]!;
    const f1 = f[day + 1]!;
    if (f0 === 0 || f0 < 0 !== f1 < 0) {
      if (f0 !== 0 && f1 === 0) continue; // a raiz cai no dia seguinte
      const nearest = Math.abs(f0) <= Math.abs(f1) ? day : day + 1;
      passages.push(passage(instants[nearest]!, site.timeZone));
    }
  }
  // Sem cruzamento, o ponto fica além da trajetória do solstício: o disco ainda o cobre no dia em
  // que a trajetória passa mais perto, se a distância for menor que o raio dele (a distância de um
  // ponto ao paralelo de declinação, na mesma hora solar, é a diferença de δ).
  let solsticeEdge = false;
  if (passages.length === 0) {
    let m = 0;
    for (let day = 1; day < 365; day++) if (Math.abs(f[day]!) < Math.abs(f[m]!)) m = day;
    if (Math.abs(f[m]!) <= SUN_RADIUS_DEG) {
      passages.push(passage(instants[m]!, site.timeZone));
      solsticeEdge = true;
    }
  }
  return { declination, hourAngle, solarHour, passages, solsticeEdge };
}
