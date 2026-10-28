/**
 * Transferidor nas projeções equidistante e cilíndrica (docs/spec/03-projecoes.md, seção 3.5;
 * decisão 0025): cada curva de α e de γ é um círculo máximo, amostrado na esfera e projetado; as
 * retas de β são semicírculos verticais, do zênite ao horizonte. Na estereográfica, a interface
 * continua desenhando os círculos exatos de protractor.ts.
 *
 * Validação: tests/referencia/projecoes.test.ts (pontos das fórmulas fechadas da seção 3.5.2).
 */
import {
  capBoundary,
  discCap,
  projectDirection,
  projectPath,
  type ChartPoint,
  type Direction,
  type Projection,
} from '../chart/projection';
import {
  protractorCurves,
  type AngleReference,
  type Circle,
  type ProtractorAngles,
  type ProtractorCurve,
} from './protractor';

const RAD = Math.PI / 180;
/** Zênite do rótulo das retas de β: o mesmo ponto do céu que na estereográfica (raio 0,9). */
const BETA_LABEL_ZENITH = (2 * Math.atan(0.9)) / RAD;

export interface ProjectedCurve extends ProtractorCurve {
  /** Polilinhas na carta (na cilíndrica, com as cópias da costura). */
  lines: ChartPoint[][];
  /** Ponto do rótulo (antes do deslocamento do texto); null se a curva não tiver rótulo. */
  label: ChartPoint | null;
}

/** Círculo máximo de um disco da carta estereográfica, como polilinha fechada da projeção. */
export function circleLines(p: Projection, c: Circle): ChartPoint[][] {
  const { n, d } = discCap(c.centerE, c.centerN, c.radius);
  return projectPath(p, capBoundary(n, d), true);
}

/** Semicírculo vertical do zênite ao horizonte no azimute dado (retas de β, normal, fachada). */
export function verticalLines(p: Projection, azimuth: number, maxZenith = 90): ChartPoint[][] {
  const dirs: Direction[] = [];
  for (let z = 0; z < maxZenith; z += 1) dirs.push({ zenith: z, azimuth });
  dirs.push({ zenith: maxZenith, azimuth });
  return projectPath(p, dirs, false);
}

function labelDirection(c: ProtractorCurve, orientation: number): Direction | null {
  if (c.geometry.kind === 'ray') {
    if (c.externalAngle >= 90) return null;
    return { zenith: BETA_LABEL_ZENITH, azimuth: c.geometry.azimuth };
  }
  if (c.family === 'alpha') return { zenith: 90 - c.externalAngle, azimuth: orientation };
  // γ das aletas mais perto da fachada, onde fica a sombra da aleta (como na estereográfica).
  const psi = c.family === 'finTop' ? 70 : 45;
  const h = Math.atan(Math.tan(c.externalAngle * RAD) * Math.sin(psi * RAD)) / RAD;
  return { zenith: 90 - h, azimuth: orientation + (c.side === 'right' ? psi : -psi) };
}

/** Curvas do transferidor para os ângulos digitados, na projeção dada. */
export function protractorPolylines(
  p: Projection,
  orientation: number,
  reference: AngleReference,
  angles: ProtractorAngles,
): ProjectedCurve[] {
  return protractorCurves(orientation, reference, angles).map((c) => {
    const lines =
      c.geometry.kind === 'ray' ? verticalLines(p, c.geometry.azimuth) : circleLines(p, c.geometry);
    const dir = labelDirection(c, orientation);
    return { ...c, lines, label: dir ? projectDirection(p, dir.zenith, dir.azimuth) : null };
  });
}
