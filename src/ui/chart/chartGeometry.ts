import { altitudeRadius, project } from '../../core/chart/stereographic';
import {
  makeProjection,
  projectDirection,
  projectPath,
  type ChartPoint,
  type Projection,
} from '../../core/chart/projection';
import {
  chartDates,
  civilDate,
  hourLine,
  legalHourLine,
  seasonInstants,
  sunPath,
  type AnalemmaPoint,
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
  /** Pontos na carta estereográfica (SVG), como antes do F4.3. */
  points: SvgPoint[];
  /** Polilinhas na projeção da carta (y para cima; na cilíndrica, com as cópias da costura). */
  lines: ChartPoint[][];
}

export interface HourLineGeometry {
  hour: number;
  points: SvgPoint[];
  lines: ChartPoint[][];
  /** Posição do rótulo (SVG). */
  label: SvgPoint;
}

/** Linha horária em hora legal (analema, F4.3), fechada ao longo do ano. */
export interface AnalemmaGeometry {
  hour: number;
  lines: ChartPoint[][];
  /** Posição do rótulo (SVG); null se o analema não tiver trecho acima do horizonte. */
  label: SvgPoint | null;
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
  analemmas: AnalemmaGeometry[];
}

/** Raio dos rótulos das datas: logo fora do horizonte (raio 1). */
export const DATE_LABEL_RADIUS = 1.035;
/** Na cilíndrica, os rótulos das datas ficam logo acima e à direita do meio-dia de cada trajetória. */
const DATE_LABEL_SHIFT = 0.04;
const DATE_LABEL_RAISE = 0.018;
/** Horas das linhas horárias (solar e legal). */
const HOURS = Array.from({ length: 15 }, (_, k) => 5 + k);

const DAY_MS = 86_400_000;
const STEREO = makeProjection('stereographic');

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

/** O ponto do pôr do sol: no horizonte geométrico, do lado oeste (azimute entre 180° e 360°). */
function sunsetOf(points: SkyPoint[]): SkyPoint | undefined {
  return points.find((q) => q.azimuth > 180 && Math.abs(q.zenith - 90) < 0.01);
}

/**
 * Um rótulo por grupo de trajetórias. Nas azimutais, no ponto de pôr do sol, levado para fora do
 * horizonte; trajetórias sem pôr do sol (dia ou noite polar) ficam sem rótulo. Na cilíndrica, os
 * poentes ficam juntos demais numa linha só: o rótulo vai logo acima do ponto mais alto da
 * trajetória (o meio-dia), onde as trajetórias ficam mais separadas.
 */
function pathLabels(sky: { date: ChartDate; points: SkyPoint[] }[], p: Projection): PathLabel[] {
  const groups = new Map<number, { months: number[]; x: number; y: number; n: number }>();
  for (const path of sky) {
    let c: ChartPoint;
    if (p.kind === 'cylindrical') {
      if (path.points.length === 0) continue;
      const top = path.points.reduce((a, b) => (b.zenith < a.zenith ? b : a));
      c = projectDirection(p, top.zenith, top.azimuth);
    } else {
      const sunset = sunsetOf(path.points);
      if (!sunset) continue;
      c = project(90, sunset.azimuth);
    }
    const key = groupOf(path.date.month);
    const g = groups.get(key) ?? { months: [], x: 0, y: 0, n: 0 };
    g.months.push(path.date.month);
    g.x += c.x;
    g.y += -c.y;
    g.n += 1;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, g]) => {
      if (p.kind === 'cylindrical') {
        return {
          months: g.months.sort((a, b) => a - b),
          x: g.x / g.n + DATE_LABEL_SHIFT,
          y: g.y / g.n - DATE_LABEL_RAISE,
        };
      }
      const k = DATE_LABEL_RADIUS / Math.hypot(g.x, g.y);
      return { months: g.months.sort((a, b) => a - b), x: g.x * k, y: g.y * k };
    });
}

/** Parte da carta que só depende do local: trajetórias e linhas horárias no céu. */
export interface ChartSky {
  paths: { date: ChartDate; points: SkyPoint[] }[];
  hourLines: { hour: number; points: SkyPoint[] }[];
}

export function chartSky(site: Site): ChartSky {
  const paths = chartDates(site.timeZone).map((date) => ({
    date,
    points: sunPath(site, date.year, date.month, date.day, 10),
  }));
  const dates = hourLineDates(site.timeZone);
  const hourLines: ChartSky['hourLines'] = [];
  for (const hour of HOURS) {
    const points = hourLine(site, hour, dates);
    if (points.length >= 2) hourLines.push({ hour, points });
  }
  return { paths, hourLines };
}

/**
 * Analemas das horas legais de 5 a 19 h (spec 02, seção 2.5.1): só os que têm algum ponto acima do
 * horizonte. Rótulo junto do ponto do solstício de inverno do local (21/06 com latitude negativa,
 * 21/12 com positiva), ou do ponto visível mais baixo se esse estiver abaixo do horizonte.
 */
export function analemmaSky(
  site: Site,
): { hour: number; points: AnalemmaPoint[]; labelAt: AnalemmaPoint }[] {
  const winterDay = site.latitude < 0 ? 171 : 354;
  const out: { hour: number; points: AnalemmaPoint[]; labelAt: AnalemmaPoint }[] = [];
  for (const hour of HOURS) {
    const points = legalHourLine(site, hour, 3);
    const visible = points.filter((q) => q.zenith < 90);
    if (visible.length < 2) continue;
    const winter = points.find((q) => q.day === winterDay);
    const labelAt =
      winter && winter.zenith < 90
        ? winter
        : visible.reduce((a, b) => (b.zenith > a.zenith ? b : a));
    out.push({ hour, points, labelAt });
  }
  return out;
}

/** Afastamento dos rótulos das linhas horárias e dos analemas (unidades da carta). */
const HOUR_LABEL_OFFSET = 0.05;
const ANALEMMA_LABEL_OFFSET = 0.045;

function analemmaLabel(p: Projection, q: SkyPoint): SvgPoint {
  const c = projectDirection(p, q.zenith, q.azimuth);
  if (p.kind === 'cylindrical') return { x: c.x, y: -c.y + ANALEMMA_LABEL_OFFSET };
  // Azimutais: para fora do laço, na direção do horizonte.
  const r = Math.hypot(c.x, c.y);
  const k = r > 0 ? (r + ANALEMMA_LABEL_OFFSET) / r : 1;
  return { x: c.x * k, y: -c.y * k };
}

/** Abscissa equivalente dentro da carta cilíndrica (cópias de ±2 unidades). */
function wrapX(x: number): number {
  return ((((x + 1) % 2) + 2) % 2) - 1;
}

/**
 * Geometria da carta para um local, na projeção dada (sem física na interface). Na estereográfica,
 * as trajetórias e as linhas horárias são as mesmas de antes do F4.3.
 */
export function chartGeometry(
  site: Site,
  projection: Projection = STEREO,
  withAnalemmas = false,
  sky: ChartSky = chartSky(site),
): ChartGeometry {
  const radius = (altitude: number) =>
    projection.kind === 'equidistant' ? (90 - altitude) / 90 : altitudeRadius(altitude);
  const altitudeCircles = [10, 20, 30, 40, 50, 60, 70, 80].map((altitude) => ({
    altitude,
    radius: radius(altitude),
  }));
  const paths = sky.paths.map(({ date, points }) => ({
    date,
    points: points.map(toSvg),
    lines: projectPath(projection, points, false),
  }));
  const hourLines = sky.hourLines.map(({ hour, points }) => {
    const mid = points[Math.floor(points.length / 2)]!;
    const c = projectDirection(projection, mid.zenith, mid.azimuth);
    const x = projection.kind === 'cylindrical' ? wrapX(c.x) : c.x;
    return {
      hour,
      points: points.map(toSvg),
      lines: projectPath(projection, points, false),
      label: { x, y: -c.y + HOUR_LABEL_OFFSET },
    };
  });
  const analemmas = withAnalemmas
    ? analemmaSky(site).map(({ hour, points, labelAt }) => {
        const label = analemmaLabel(projection, labelAt);
        return {
          hour,
          lines: projectPath(projection, points, true),
          label: projection.kind === 'cylindrical' ? { x: wrapX(label.x), y: label.y } : label,
        };
      })
    : [];
  return {
    altitudeCircles,
    paths,
    hourLines,
    pathLabels: pathLabels(sky.paths, projection),
    analemmas,
  };
}
