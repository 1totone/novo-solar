/**
 * Geometria da carta solar (F1.3): trajetórias do sol, linhas horárias em hora solar verdadeira e
 * datas de solstícios e equinócios. Saída em direções (ângulo zenital e azimute); a interface
 * projeta com stereographic.ts. Especificação: docs/spec/02 (seção 2.5) e docs/spec/03.
 */
import { REFERENCE_YEAR } from '../solar/constants';
import { solarPosition } from '../solar/spa';

export interface Site {
  /** Graus, positiva ao Norte. */
  latitude: number;
  /** Graus, positiva a Leste. */
  longitude: number;
  /** Metros. */
  elevation: number;
  /** Fuso do arquivo climático, horas em relação ao UTC. */
  timeZone: number;
}

export interface SkyPoint {
  utcMs: number;
  zenith: number;
  azimuth: number;
}

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

const MS_PER_MIN = 60_000;
const MS_PER_HOUR = 3_600_000;

function at(site: Site, utcMs: number): SkyPoint {
  const p = solarPosition(utcMs, site.latitude, site.longitude, site.elevation);
  return { utcMs, zenith: p.zenith, azimuth: p.azimuth };
}

function wrap180(x: number): number {
  const r = (((x + 180) % 360) + 360) % 360;
  return r - 180;
}

/** Instante, entre a e b, em que o sol cruza o horizonte geométrico (bisseção). */
function horizonCrossing(site: Site, a: SkyPoint, b: SkyPoint): SkyPoint {
  let lo = a;
  let hi = b;
  while (hi.utcMs - lo.utcMs > 1) {
    const mid = at(site, Math.round((lo.utcMs + hi.utcMs) / 2));
    if (mid.zenith < 90 === a.zenith < 90) lo = mid;
    else hi = mid;
  }
  const pick = Math.abs(lo.zenith - 90) < Math.abs(hi.zenith - 90) ? lo : hi;
  return { ...pick, zenith: Math.min(pick.zenith, 90) };
}

/**
 * Trajetória do sol na data civil (hora legal do fuso do local), com o sol acima do horizonte
 * geométrico: amostras a cada `stepMinutes` a partir de 00:00 local e os pontos exatos de
 * nascer e pôr no horizonte geométrico.
 */
export function sunPath(
  site: Site,
  year: number,
  month: number,
  day: number,
  stepMinutes = 5,
): SkyPoint[] {
  const start = Date.UTC(year, month - 1, day) - site.timeZone * MS_PER_HOUR;
  const n = Math.round((24 * 60) / stepMinutes);
  const out: SkyPoint[] = [];
  let prev: SkyPoint | undefined;
  for (let k = 0; k <= n; k++) {
    const p = at(site, start + k * stepMinutes * MS_PER_MIN);
    if (prev && prev.zenith < 90 !== p.zenith < 90) out.push(horizonCrossing(site, prev, p));
    if (p.zenith < 90) out.push(p);
    prev = p;
  }
  return out;
}

/**
 * Linha horária em hora solar verdadeira: para cada data, o ponto em que o ângulo horário do sol
 * é 15° · (hora − 12). Só entram pontos com o sol acima do horizonte geométrico.
 */
export function hourLine(site: Site, solarHour: number, dates: CivilDate[]): SkyPoint[] {
  const target = 15 * (solarHour - 12);
  const out: SkyPoint[] = [];
  for (const { year, month, day } of dates) {
    // Estimativa inicial pela longitude; a equação do tempo é corrigida pelas iterações.
    const lst = solarHour - (4 * (site.longitude - 15 * site.timeZone)) / 60;
    let t = Date.UTC(year, month - 1, day) + (lst - site.timeZone) * MS_PER_HOUR;
    for (let i = 0; i < 6; i++) {
      const h = solarPosition(t, site.latitude, site.longitude, site.elevation).hourAngle;
      const dt = (wrap180(h - target) / 15) * MS_PER_HOUR;
      t -= dt;
      if (Math.abs(dt) < 1) break;
    }
    const p = at(site, t);
    if (p.zenith < 90) out.push(p);
  }
  return out;
}

export interface SeasonInstants {
  marchEquinox: number;
  juneSolstice: number;
  septemberEquinox: number;
  decemberSolstice: number;
}

/** Instante (ms UTC) em que a ascensão reta aparente do sol vale `target`, por bisseção. */
function rightAscensionCrossing(year: number, month: number, target: number): number {
  let lo = Date.UTC(year, month - 1, 10);
  let hi = Date.UTC(year, month - 1, 30);
  const f = (t: number) => wrap180(solarPosition(t, 0, 0, 0).rightAscension - target);
  while (hi - lo > 1000) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

/**
 * Equinócios e solstícios: instantes em que a ascensão reta aparente do sol vale 0°, 90°, 180°
 * e 270° (coincidem com a longitude eclíptica aparente, pois a latitude eclíptica do sol é
 * menor que 1"; diferença de segundos).
 */
export function seasonInstants(year: number = REFERENCE_YEAR): SeasonInstants {
  return {
    marchEquinox: rightAscensionCrossing(year, 3, 0),
    juneSolstice: rightAscensionCrossing(year, 6, 90),
    septemberEquinox: rightAscensionCrossing(year, 9, 180),
    decemberSolstice: rightAscensionCrossing(year, 12, 270),
  };
}

/** Data civil, na hora legal do fuso dado, de um instante UTC. */
export function civilDate(utcMs: number, timeZone: number): CivilDate {
  const d = new Date(utcMs + timeZone * MS_PER_HOUR);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export interface ChartDate extends CivilDate {
  kind: 'equinox' | 'solstice' | 'month21';
}

/**
 * Datas das trajetórias da carta (docs/spec/02, seção 2.5): solstícios e equinócios do ano de
 * referência, na data civil do fuso do local, e dia 21 dos outros oito meses.
 */
export function chartDates(timeZone: number, year: number = REFERENCE_YEAR): ChartDate[] {
  const s = seasonInstants(year);
  const seasons: ChartDate[] = [
    { ...civilDate(s.marchEquinox, timeZone), kind: 'equinox' },
    { ...civilDate(s.juneSolstice, timeZone), kind: 'solstice' },
    { ...civilDate(s.septemberEquinox, timeZone), kind: 'equinox' },
    { ...civilDate(s.decemberSolstice, timeZone), kind: 'solstice' },
  ];
  const seasonMonths = new Set([3, 6, 9, 12]);
  const others: ChartDate[] = [];
  for (let m = 1; m <= 12; m++) {
    if (!seasonMonths.has(m)) others.push({ year, month: m, day: 21, kind: 'month21' });
  }
  return [...seasons, ...others].sort((a, b) => a.month - b.month || a.day - b.day);
}
