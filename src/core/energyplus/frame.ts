/**
 * Referencial da fachada no mundo do EnergyPlus e leitura da janela colada (F5.2).
 *
 * Especificação: docs/spec/13-exportacao-energyplus.md, seções 13.1 e 13.3. Mundo: X para o
 * Leste, Y para o Norte, Z para cima (GlobalGeometryRules World, Building North Axis 0). Fachada
 * (spec 07, seção 7.1): x à direita de quem está dentro olhando para fora, y na normal externa,
 * z para cima, origem no canto inferior da janela do lado x = 0.
 */
import type { Vec3 } from '../shading/geometry';

const RAD = Math.PI / 180;

export interface FacadeFrame {
  /** Canto da janela (x = 0, z = 0) no mundo. */
  origin: Vec3;
  /** Direita de quem está dentro olhando para fora. */
  ex: Vec3;
  /** Normal externa. */
  ey: Vec3;
  ez: Vec3;
}

/** Fachada de azimute θ (normal externa, a partir do Norte, sentido horário), janela na origem. */
export function frameFromAzimuth(azimuth: number, origin: Vec3 = [0, 0, 0]): FacadeFrame {
  const g = azimuth * RAD;
  return {
    origin,
    ex: [Math.cos(g), -Math.sin(g), 0],
    ey: [Math.sin(g), Math.cos(g), 0],
    ez: [0, 0, 1],
  };
}

/** Ponto da fachada no mundo: O + x · e_x + y · n + z · e_z. */
export function toWorld(f: FacadeFrame, p: Vec3): Vec3 {
  const c = (i: 0 | 1 | 2) => f.origin[i] + p[0] * f.ex[i] + p[1] * f.ey[i] + p[2] * f.ez[i];
  return [c(0), c(1), c(2)];
}

/** Azimute da normal externa, de 0 a 360°. */
export function azimuthOf(f: FacadeFrame): number {
  const a = Math.atan2(f.ey[0], f.ey[1]) / RAD;
  return ((a % 360) + 360) % 360;
}

export interface PastedWindow {
  name: string;
  baseSurface: string;
  vertices: Vec3[];
}

export type PasteError =
  | 'notFenestration'
  | 'fieldCount'
  | 'notFourVertices'
  | 'badNumber'
  | 'notPlanar'
  | 'notVertical'
  | 'notRectangle';

export class WindowPasteError extends Error {
  readonly code: PasteError;
  constructor(code: PasteError) {
    super(code);
    this.code = code;
  }
}

/**
 * Lê um objeto FenestrationSurface:Detailed colado de um IDF: nome, parede-base e vértices.
 * Campos: Name, Surface Type, Construction Name, Building Surface Name, Outside Boundary
 * Condition Object, View Factor to Ground, Frame and Divider Name, Multiplier, Number of
 * Vertices e os vértices (X, Y, Z).
 */
export function parseFenestration(text: string): PastedWindow {
  const clean = text
    .split(/\r?\n/)
    .map((line) => line.replace(/!.*$/, ''))
    .join(' ');
  const start = clean.search(/FenestrationSurface:Detailed\s*,/i);
  if (start < 0) throw new WindowPasteError('notFenestration');
  const body = clean.slice(start).split(';')[0]!;
  const fields = body.split(',').map((f) => f.trim());
  // fields[0] é o tipo do objeto.
  if (fields.length < 10) throw new WindowPasteError('fieldCount');
  const declared = fields[9]!.toLowerCase();
  const coords = fields.slice(10).filter((f) => f !== '');
  if (
    coords.length !== 12 ||
    (declared !== '' && declared !== 'autocalculate' && declared !== '4')
  ) {
    throw new WindowPasteError('notFourVertices');
  }
  const nums = coords.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) throw new WindowPasteError('badNumber');
  const vertices: Vec3[] = [0, 1, 2, 3].map(
    (i) => [nums[3 * i]!, nums[3 * i + 1]!, nums[3 * i + 2]!] as const,
  );
  return { name: fields[1]!, baseSurface: fields[4]!, vertices };
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Normal de Newell, unitária. */
export function newellNormal(vs: readonly Vec3[]): Vec3 {
  let n: Vec3 = [0, 0, 0];
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i]!;
    const b = vs[(i + 1) % vs.length]!;
    n = [
      n[0] + (a[1] - b[1]) * (a[2] + b[2]),
      n[1] + (a[2] - b[2]) * (a[0] + b[0]),
      n[2] + (a[0] - b[0]) * (a[1] + b[1]),
    ];
  }
  return scale(n, 1 / norm(n));
}

export interface WindowPlacement {
  frame: FacadeFrame;
  width: number;
  height: number;
}

/** Tolerâncias da leitura da janela colada (spec 13, seção 13.3). */
const PLANE_TOL = 1e-3;
const VERTICAL_TOL = 1e-3;

/**
 * Referencial da fachada a partir dos 4 vértices da janela colada. A normal externa sai da ordem
 * dos vértices (anti-horária vista de fora, o padrão do GlobalGeometryRules; ou horária).
 */
export function placementFromVertices(
  vertices: readonly Vec3[],
  clockwise = false,
): WindowPlacement {
  if (vertices.length !== 4) throw new WindowPasteError('notFourVertices');
  let n = newellNormal(vertices);
  if (clockwise) n = scale(n, -1);
  if (Math.abs(n[2]) > VERTICAL_TOL) throw new WindowPasteError('notVertical');
  const ey: Vec3 = scale([n[0], n[1], 0], 1 / Math.hypot(n[0], n[1]));
  const ez: Vec3 = [0, 0, 1];
  const ex = cross(ey, ez);
  const v0 = vertices[0]!;
  for (const v of vertices) {
    if (Math.abs(dot(sub(v, v0), ey)) > PLANE_TOL) throw new WindowPasteError('notPlanar');
  }
  const xs = vertices.map((v) => dot(sub(v, v0), ex));
  const zs = vertices.map((v) => dot(sub(v, v0), ez));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  // Retângulo alinhado: cada vértice num dos quatro cantos, cada canto usado uma vez.
  const corners = vertices.map((_, i) => {
    const cx = Math.abs(xs[i]! - x0) <= PLANE_TOL ? 0 : Math.abs(xs[i]! - x1) <= PLANE_TOL ? 1 : -1;
    const cz = Math.abs(zs[i]! - z0) <= PLANE_TOL ? 0 : Math.abs(zs[i]! - z1) <= PLANE_TOL ? 1 : -1;
    return cx < 0 || cz < 0 ? -1 : cx * 2 + cz;
  });
  if (corners.includes(-1) || new Set(corners).size !== 4) {
    throw new WindowPasteError('notRectangle');
  }
  const origin: Vec3 = [
    v0[0] + x0 * ex[0] + z0 * ez[0],
    v0[1] + x0 * ex[1] + z0 * ez[1],
    v0[2] + x0 * ex[2] + z0 * ez[2],
  ];
  return { frame: { origin, ex, ey, ez }, width: x1 - x0, height: z1 - z0 };
}
