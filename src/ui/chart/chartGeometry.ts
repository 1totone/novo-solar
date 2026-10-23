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

export interface ChartGeometry {
  altitudeCircles: { altitude: number; radius: number }[];
  paths: PathGeometry[];
  hourLines: HourLineGeometry[];
}

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
  return { altitudeCircles, paths, hourLines };
}
