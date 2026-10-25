/**
 * Corte e vista esquemáticos da janela e das peças (F3.1), a partir das mesmas placas que o núcleo
 * usa no cálculo da sombra (buildScene): o desenho mostra exatamente a geometria calculada.
 *
 * Coordenadas em metros. Vista: de fora, olhando para a fachada; X = W − x, então o lado direito de
 * quem está dentro olhando para fora aparece à esquerda do desenho (como na Figura 22 do tutorial
 * da UFU), e Z = z. Corte: plano vertical pelo meio da janela (x = W / 2), com Y = y (para fora) e
 * Z = z; peças que não cruzam o plano aparecem "em vista", além do corte.
 */
import {
  buildScene,
  INFINITE_EXTENT,
  type Device,
  type Plate,
  type Vec3,
  type WindowGeometry,
} from '../../core/shading/geometry';

export type Point2 = readonly [number, number];

export interface Shape {
  points: Point2[];
  /** Peça cortada ou vista; parede; vidro; peça além do plano do corte. */
  role: 'piece' | 'wall' | 'glass' | 'beyond';
  /** Polígono de área nula (placa vista de perfil): desenhar como linha. */
  edge: boolean;
}

export interface AngleMark {
  kind: 'alpha' | 'gammaRight' | 'gammaLeft';
  /** Ângulo interno (do plano da fachada), em graus. */
  degrees: number;
  from: Point2;
  to: Point2;
}

export interface Dimension {
  kind: 'width' | 'height' | 'depth' | 'above' | 'setback';
  value: number;
  from: Point2;
  to: Point2;
}

export interface Drawing {
  shapes: Shape[];
  angles: AngleMark[];
  dimensions: Dimension[];
  /** Pontos cortados por estarem no infinito (prolongamento infinito). */
  infinite: Point2[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

const RAD = Math.PI / 180;
/** Coordenadas além disto são de prolongamentos infinitos (INFINITE_EXTENT = 10⁶ m). */
const FAR = INFINITE_EXTENT / 10;

function area2(points: readonly Point2[]): number {
  let a = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    a += points[j]![0] * points[i]![1] - points[i]![0] * points[j]![1];
  }
  return a / 2;
}

/** Remove vértices repetidos (projeções de arestas paralelas à direção de projeção). */
function dedupe(points: Point2[]): Point2[] {
  const out: Point2[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last[0] - p[0]) > 1e-12 || Math.abs(last[1] - p[1]) > 1e-12) out.push(p);
  }
  if (out.length > 1) {
    const a = out[0]!;
    const b = out[out.length - 1]!;
    if (Math.abs(a[0] - b[0]) <= 1e-12 && Math.abs(a[1] - b[1]) <= 1e-12) out.pop();
  }
  return out;
}

/** Interseção da placa com o plano x = x0: segmento no plano (y, z), ou null. */
function cutAtX(plate: Plate, x0: number): [Point2, Point2] | null {
  const pts: Point2[] = [];
  for (let i = 0; i < plate.length; i++) {
    const a = plate[i]!;
    const b = plate[(i + 1) % plate.length]!;
    const da = a[0] - x0;
    const db = b[0] - x0;
    if (Math.abs(da) < 1e-12) pts.push([a[1], a[2]]);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      pts.push([a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]);
    }
  }
  if (pts.length < 2) return null;
  // Segmento entre os dois pontos mais afastados (placa convexa).
  let best: [Point2, Point2] = [pts[0]!, pts[1]!];
  let bestD = -1;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i]![0] - pts[j]![0], pts[i]![1] - pts[j]![1]);
      if (d > bestD) {
        bestD = d;
        best = [pts[i]!, pts[j]!];
      }
    }
  }
  return best;
}

function isReveal(plate: Plate, W: number, H: number, d: number): boolean {
  if (d === 0) return false;
  return plate.every(
    (v) =>
      v[1] >= -1e-12 &&
      v[1] <= d + 1e-12 &&
      v[0] >= -1e-12 &&
      v[0] <= W + 1e-12 &&
      v[2] >= -1e-12 &&
      v[2] <= H + 1e-12,
  );
}

/** Limita coordenadas de prolongamentos infinitos a uma margem além do resto do desenho. */
function clampFar(points: Point2[], lim: Drawing['bounds'], infinite: Point2[]): Point2[] {
  return points.map(([x, y]) => {
    const cx = x > FAR ? lim.maxX : x < -FAR ? lim.minX : x;
    const cy = y > FAR ? lim.maxY : y < -FAR ? lim.minY : y;
    if (cx !== x || cy !== y) infinite.push([cx, cy]);
    return [cx, cy];
  });
}

function boundsOf(points: Point2[], fallback: Drawing['bounds']): Drawing['bounds'] {
  const finite = points.filter(([x, y]) => Math.abs(x) < FAR && Math.abs(y) < FAR);
  if (finite.length === 0) return fallback;
  return {
    minX: Math.min(fallback.minX, ...finite.map((p) => p[0])),
    maxX: Math.max(fallback.maxX, ...finite.map((p) => p[0])),
    minY: Math.min(fallback.minY, ...finite.map((p) => p[1])),
    maxY: Math.max(fallback.maxY, ...finite.map((p) => p[1])),
  };
}

function expand(b: Drawing['bounds'], margin: number): Drawing['bounds'] {
  return {
    minX: b.minX - margin,
    maxX: b.maxX + margin,
    minY: b.minY - margin,
    maxY: b.maxY + margin,
  };
}

const project = (plate: Plate, f: (v: Vec3) => Point2) => dedupe(plate.map(f));

/** Vista de fora: janela, parede em volta e peças projetadas no plano da fachada. */
export function elevationDrawing(window: WindowGeometry, devices: readonly Device[]): Drawing {
  const { width: W, height: H } = window;
  const d = window.setback ?? 0;
  const scene = buildScene(window, devices);
  const toView = (v: Vec3): Point2 => [W - v[0], v[2]];
  const plates = scene.plates.filter((p) => !isReveal(p, W, H, d)).map((p) => project(p, toView));
  const margin = 0.25 * Math.max(W, H);
  const lim = expand(boundsOf(plates.flat(), { minX: 0, maxX: W, minY: 0, maxY: H }), margin);
  const infinite: Point2[] = [];
  const shapes: Shape[] = [
    {
      role: 'wall',
      edge: false,
      points: [
        [lim.minX, lim.minY],
        [lim.maxX, lim.minY],
        [lim.maxX, lim.maxY],
        [lim.minX, lim.maxY],
      ],
    },
    {
      role: 'glass',
      edge: false,
      points: [
        [0, 0],
        [W, 0],
        [W, H],
        [0, H],
      ],
    },
    ...plates.map((points): Shape => {
      const clamped = clampFar(points, lim, infinite);
      return { role: 'piece', edge: Math.abs(area2(clamped)) < 1e-9, points: clamped };
    }),
  ];
  // γ de cada brise: do canto inferior do mesmo lado à ponta do brise (seção 1.6 da spec 01).
  const angles: AngleMark[] = [];
  for (const dev of devices) {
    if (dev.kind !== 'overhang') continue;
    const zb = H + dev.above;
    const right = dev.extendRight ?? 0;
    const left = dev.extendLeft ?? 0;
    if (right > 0 && right < FAR) {
      // Direita de quem está dentro: à esquerda do desenho (X = W − x).
      angles.push({
        kind: 'gammaRight',
        degrees: Math.atan2(right, zb) / RAD,
        from: [0, 0],
        to: [-right, zb],
      });
    }
    if (left > 0 && left < FAR) {
      angles.push({
        kind: 'gammaLeft',
        degrees: Math.atan2(left, zb) / RAD,
        from: [W, 0],
        to: [W + left, zb],
      });
    }
  }
  const dimensions: Dimension[] = [
    { kind: 'width', value: W, from: [0, -0.08 * margin * 4], to: [W, -0.08 * margin * 4] },
    { kind: 'height', value: H, from: [W + 0.32 * margin, 0], to: [W + 0.32 * margin, H] },
  ];
  return { shapes, angles, dimensions, infinite, bounds: lim };
}

/** Corte pelo meio da janela: parede, vidro, peças cortadas e, além do corte, as demais. */
export function sectionDrawing(window: WindowGeometry, devices: readonly Device[]): Drawing {
  const { width: W, height: H } = window;
  const d = window.setback ?? 0;
  const scene = buildScene(window, devices);
  const xc = W / 2;
  const cuts: [Point2, Point2][] = [];
  const beyond: Point2[][] = [];
  for (const plate of scene.plates) {
    if (isReveal(plate, W, H, d)) continue;
    const seg = cutAtX(plate, xc);
    if (seg) cuts.push(seg);
    else beyond.push(project(plate, (v) => [v[1], v[2]]));
  }
  const all = [...cuts.flat(), ...beyond.flat()];
  const inner = Math.max(0.1, 0.12 * H); // face interna da parede (esquemática)
  const lim0 = boundsOf(all, { minX: -inner, maxX: Math.max(d, 0.1), minY: 0, maxY: H });
  const margin = 0.25 * Math.max(H, lim0.maxX - lim0.minX);
  const lim = expand(lim0, margin);
  lim.minX = -inner - 0.05 * H;
  const infinite: Point2[] = [];
  const wall = (z0: number, z1: number): Shape => ({
    role: 'wall',
    edge: false,
    points: [
      [-inner, z0],
      [d, z0],
      [d, z1],
      [-inner, z1],
    ],
  });
  const shapes: Shape[] = [
    wall(lim.minY, 0),
    wall(H, lim.maxY),
    {
      role: 'glass',
      edge: true,
      points: [
        [0, 0],
        [0, H],
      ],
    },
    ...beyond.map((points): Shape => ({
      role: 'beyond',
      edge: Math.abs(area2(points)) < 1e-9,
      points: clampFar(points, lim, infinite),
    })),
    ...cuts.map((seg): Shape => ({
      role: 'piece',
      edge: true,
      points: clampFar([...seg], lim, infinite),
    })),
  ];
  // α de cada brise e da lâmina mais baixa: do peitoril, no vidro, à aresta externa.
  const angles: AngleMark[] = [];
  const dimensions: Dimension[] = [
    { kind: 'height', value: H, from: [-inner - 0.03 * H, 0], to: [-inner - 0.03 * H, H] },
  ];
  if (d > 0) {
    dimensions.push({ kind: 'setback', value: d, from: [0, H + 0.04 * H], to: [d, H + 0.04 * H] });
  }
  for (const dev of devices) {
    if (dev.kind === 'overhang') {
      const z = H + dev.above;
      const y0 = d + (dev.gap ?? 0);
      const y1 = y0 + dev.depth;
      angles.push({ kind: 'alpha', degrees: Math.atan2(y1, z) / RAD, from: [0, 0], to: [y1, z] });
      dimensions.push({
        kind: 'depth',
        value: dev.depth,
        from: [y0, z + 0.06 * H],
        to: [y1, z + 0.06 * H],
      });
      if (dev.above > 0) {
        dimensions.push({
          kind: 'above',
          value: dev.above,
          from: [y1 + 0.05 * H, H],
          to: [y1 + 0.05 * H, z],
        });
      }
    } else if (dev.kind === 'horizontalLouvers') {
      const t = (dev.angle ?? 0) * RAD;
      const yIn = d + (dev.gap ?? 0);
      const zIn = H + dev.above - (dev.count - 1) * dev.pitch;
      const yOut = yIn + dev.chord * Math.cos(t);
      const zOut = zIn - dev.chord * Math.sin(t);
      if (zOut > 0) {
        angles.push({
          kind: 'alpha',
          degrees: Math.atan2(yOut, zOut) / RAD,
          from: [0, 0],
          to: [yOut, zOut],
        });
      }
    }
  }
  return { shapes, angles, dimensions, infinite, bounds: lim };
}
