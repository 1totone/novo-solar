import { altitudeRadius, project } from '../../core/chart/stereographic';
import {
  chartDates,
  hourLine,
  seasonInstants,
  sunPath,
  civilDate,
  type ChartDate,
  type CivilDate,
  type Site,
  type SkyPoint,
} from '../../core/chart/sunChart';

/** Ponto em coordenadas do SVG (raio 1, eixo y para baixo). */
export interface SvgPoint {
  x: number;
  y: number;
}

export interface PathGeometry {
  date: ChartDate;
  points: SvgPoint[];
}

export interface HourLineGeometry {
  hour: number;
  points: SvgPoint[];
}

/** Rótulo das datas de uma trajetória (ou de duas quase iguais), no poente. */
export interface PathLabel {
  /** Meses do grupo, em ordem: datas simétricas em relação ao solstício de junho têm quase a
   * mesma trajetória e um rótulo só (ex.: 21/1 e 21/11). */
  months: number[];
  x: number;
  y: number;
}

export interface ChartGeometry {
  altitudeCircles: { altitude: number; radius: number }[];
  paths: PathGeometry[];
  hourLines: HourLineGeometry[];
  pathLabels: PathLabel[];
}

/** Raio dos rótulos das datas: logo fora do horizonte (raio 1). */
export const DATE_LABEL_RADIUS = 1.035;

const DAY_MS = 86_400_000;

function toSvg(p: SkyPoint): SvgPoint {
  const c = project(p.zenith, p.azimuth);
  return { x: c.x, y: -c.y };
}

/** Datas entre o solstício de junho e o de dezembro: a declinação é monótona nesse intervalo. */
function hourLineDates(timeZone: number): CivilDate[] {
  const s = seasonInstants();
  const out: CivilDate[] = [];
  for (let t = s.juneSolstice; t < s.decemberSolstice; t += 3 * DAY_MS) {
    out.push(civilDate(t, timeZone));
  }
  out.push(civilDate(s.decemberSolstice, timeZone));
  return out;
}

/** Grupo de uma data: o mês e o seu simétrico em relação ao solstício de junho (12 − mês). */
const groupOf = (month: number) => (month === 12 ? 12 : Math.min(month, 12 - month));

/**
 * Um rótulo por grupo de trajetórias, no ponto de pôr do sol (no horizonte, lado oeste), levado
 * para fora do horizonte. Trajetórias sem pôr do sol (dia ou noite polar) ficam sem rótulo.
 */
function pathLabels(paths: PathGeometry[]): PathLabel[] {
  const groups = new Map<number, { months: number[]; x: number; y: number; n: number }>();
  for (const p of paths) {
    const sunset = p.points.find((q) => q.x < 0 && Math.abs(Math.hypot(q.x, q.y) - 1) < 1e-3);
    if (!sunset) continue;
    const key = groupOf(p.date.month);
    const g = groups.get(key) ?? { months: [], x: 0, y: 0, n: 0 };
    g.months.push(p.date.month);
    g.x += sunset.x;
    g.y += sunset.y;
    g.n += 1;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, g]) => {
      const k = DATE_LABEL_RADIUS / Math.hypot(g.x, g.y);
      return { months: g.months.sort((a, b) => a - b), x: g.x * k, y: g.y * k };
    });
}

/** Geometria completa da carta estereográfica para um local (sem física na interface). */
export function chartGeometry(site: Site): ChartGeometry {
  const altitudeCircles = [10, 20, 30, 40, 50, 60, 70, 80].map((altitude) => ({
    altitude,
    radius: altitudeRadius(altitude),
  }));
  const paths = chartDates(site.timeZone).map((date) => ({
    date,
    points: sunPath(site, date.year, date.month, date.day, 10).map(toSvg),
  }));
  const dates = hourLineDates(site.timeZone);
  const hourLines: HourLineGeometry[] = [];
  for (let hour = 5; hour <= 19; hour++) {
    const points = hourLine(site, hour, dates).map(toSvg);
    if (points.length >= 2) hourLines.push({ hour, points });
  }
  return { altitudeCircles, paths, hourLines, pathLabels: pathLabels(paths) };
}
