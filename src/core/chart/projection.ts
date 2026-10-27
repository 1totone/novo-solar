/**
 * Projeções da carta solar (docs/spec/03-projecoes.md, seção 3.5; decisão 0025): estereográfica
 * (padrão), equidistante polar e cilíndrica centrada na normal da fachada. Coordenadas da carta: x
 * para a direita e y para cima, com R = 1 (raio do horizonte nas azimutais; altura da faixa de 0° a
 * 90° na cilíndrica).
 *
 * Todas as camadas da carta são definidas por direções do céu. Na estereográfica, as polilinhas e as
 * regiões são desenhadas como antes (arcos e retas exatos, spec 03, seção 3.2). Nas outras, as
 * polilinhas são densificadas na esfera (arcos de círculo máximo de no máximo 0,5°) e as regiões da
 * máscara (discos e semiplanos da carta estereográfica) viram polígonos (seção 3.5.3).
 *
 * Validação: projection.test.ts (fórmulas, ida e volta, regiões contra a região exata) e
 * tests/referencia/projecoes.test.ts (pvlib e fórmulas fechadas num script independente).
 */
import type { Region } from '../mask/mask';
import { project as stereo, unproject as unstereo, type ChartPoint } from './stereographic';

export type { ChartPoint };

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
/** Passo máximo das polilinhas na esfera, em graus (seção 3.5.3). */
export const MAX_STEP = 0.5;
/** Passo das arestas dos polígonos desenhados à mão, na carta estereográfica de raio 1. */
const POLYGON_STEP = 0.004;

export type ProjectionKind = 'stereographic' | 'equidistant' | 'cylindrical';

export interface Projection {
  readonly kind: ProjectionKind;
  /** Azimute no centro da cilíndrica (a normal da fachada), em [0, 360); 0 nas azimutais. */
  readonly center: number;
}

/** Direção do céu: ângulo zenital e azimute (Norte, sentido horário), em graus. */
export interface Direction {
  zenith: number;
  azimuth: number;
}

type Vec3 = [number, number, number];

function mod360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r + 0;
}

/** Ângulo reduzido a [−180°, 180°). */
export function wrap180(a: number): number {
  return mod360(a + 180) - 180;
}

export function makeProjection(kind: ProjectionKind, center = 0): Projection {
  return { kind, center: kind === 'cylindrical' ? mod360(center) : 0 };
}

export const isAzimuthal = (p: Projection) => p.kind !== 'cylindrical';

/** Direção para o ponto da carta. Na cilíndrica, x = ψ / 180° com ψ em [−180°, 180°). */
export function projectDirection(p: Projection, zenith: number, azimuth: number): ChartPoint {
  switch (p.kind) {
    case 'stereographic':
      return stereo(zenith, azimuth);
    case 'equidistant': {
      const r = zenith / 90;
      if (r === 0) return { x: 0, y: 0 };
      return { x: r * Math.sin(azimuth * RAD), y: r * Math.cos(azimuth * RAD) };
    }
    case 'cylindrical':
      return { x: wrap180(azimuth - p.center) / 180, y: (90 - zenith) / 90 };
  }
}

/** Ponto da carta para a direção; null fora do domínio da projeção. */
export function unprojectPoint(p: Projection, x: number, y: number): Direction | null {
  switch (p.kind) {
    case 'stereographic':
      return unstereo(x, y);
    case 'equidistant': {
      const rho = Math.hypot(x, y);
      if (rho > 2) return null;
      const a = Math.atan2(x, y) * DEG;
      return { zenith: 90 * rho, azimuth: mod360(a) };
    }
    case 'cylindrical': {
      if (Math.abs(x) > 1 + 1e-12 || Math.abs(y) > 1 + 1e-12) return null;
      return { zenith: 90 - 90 * y, azimuth: mod360(p.center + 180 * x) };
    }
  }
}

export function toVector(d: Direction): Vec3 {
  const z = d.zenith * RAD;
  const a = d.azimuth * RAD;
  return [Math.sin(z) * Math.sin(a), Math.sin(z) * Math.cos(a), Math.cos(z)];
}

function fromVector(v: Vec3): Direction {
  const len = Math.hypot(v[0], v[1], v[2]);
  const z = Math.acos(Math.max(-1, Math.min(1, v[2] / len))) * DEG;
  return { zenith: z, azimuth: mod360(Math.atan2(v[0], v[1]) * DEG) };
}

const dot = (u: Vec3, v: Vec3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

function angleBetween(u: Vec3, v: Vec3): number {
  const c: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return Math.atan2(Math.hypot(...c), dot(u, v));
}

/** Ponto do arco de círculo máximo de u a v (ângulo θ entre eles), na fração t. */
function slerp(u: Vec3, v: Vec3, theta: number, t: number): Vec3 {
  const s = Math.sin(theta);
  const a = Math.sin((1 - t) * theta) / s;
  const b = Math.sin(t * theta) / s;
  return [a * u[0] + b * v[0], a * u[1] + b * v[1], a * u[2] + b * v[2]];
}

/**
 * Densifica uma polilinha de direções: entre duas vizinhas, o arco de círculo máximo, em passos de
 * no máximo `maxStep` graus. As direções dadas ficam como estão; com `closed`, o arco de volta ao
 * início também é densificado (sem repetir o primeiro ponto).
 */
export function densify(dirs: Direction[], maxStep = MAX_STEP, closed = false): Direction[] {
  if (dirs.length === 0) return [];
  const out: Direction[] = [dirs[0]!];
  const n = closed ? dirs.length : dirs.length - 1;
  for (let i = 0; i < n; i++) {
    const a = dirs[i]!;
    const b = dirs[(i + 1) % dirs.length]!;
    const u = toVector(a);
    const v = toVector(b);
    const theta = angleBetween(u, v);
    const steps = Math.ceil((theta * DEG) / maxStep);
    // Arco nulo ou quase antipodal: sem pontos intermediários.
    if (steps > 1 && Math.sin(theta) > 1e-12) {
      for (let k = 1; k < steps; k++) out.push(fromVector(slerp(u, v, theta, k / steps)));
    }
    if (!closed || i < n - 1) out.push(b);
  }
  return out;
}

/**
 * Na cilíndrica, perto do zênite o azimute muda depressa: subdivide os arcos com salto de azimute
 * maior que 90° (até a precisão de ponto flutuante) e dá às direções no zênite o azimute da vizinha.
 */
function refineNearZenith(dirs: Direction[], closed: boolean): Direction[] {
  if (dirs.length === 0) return [];
  const seq = closed ? [...dirs, dirs[0]!] : dirs;
  const out: Direction[] = [seq[0]!];
  const pushArc = (a: Direction, b: Direction, depth: number) => {
    const jump = Math.abs(wrap180(b.azimuth - a.azimuth));
    const u = toVector(a);
    const v = toVector(b);
    const theta = angleBetween(u, v);
    if (jump <= 90 || depth >= 20 || theta < 1e-12 || Math.sin(theta) < 1e-12) {
      out.push(b);
      return;
    }
    const m = fromVector(slerp(u, v, theta, 0.5));
    pushArc(a, m, depth + 1);
    pushArc(m, b, depth + 1);
  };
  for (let i = 1; i < seq.length; i++) pushArc(out[out.length - 1]!, seq[i]!, 0);
  if (closed) out.pop();
  // Direções no zênite (azimute indefinido) ficam com o azimute da vizinha.
  for (let i = 0; i < out.length; i++) {
    if (out[i]!.zenith < 1e-9) {
      const ref = out[i - 1] ?? out[i + 1];
      if (ref) out[i] = { zenith: out[i]!.zenith, azimuth: ref.azimuth };
    }
  }
  return out;
}

/** Abscissas da cilíndrica sem saltos (cada passo pelo menor ângulo), a partir de ψ ∈ [−180, 180). */
function unwrappedX(p: Projection, dirs: Direction[]): number[] {
  const xs: number[] = [];
  let prev = 0;
  dirs.forEach((d, i) => {
    const psi = wrap180(d.azimuth - p.center);
    prev = i === 0 ? psi : prev + wrap180(psi - wrap180(prev));
    xs.push(prev / 180);
  });
  return xs;
}

/** Cópias deslocadas de 2 unidades (uma volta) que alcançam a carta (−1 ≤ x ≤ 1). */
function periodicCopies(lines: ChartPoint[][]): ChartPoint[][] {
  const out: ChartPoint[][] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    let lo = Infinity;
    let hi = -Infinity;
    for (const q of line) {
      lo = Math.min(lo, q.x);
      hi = Math.max(hi, q.x);
    }
    const kMin = Math.ceil((-1 - hi) / 2);
    const kMax = Math.floor((1 - lo) / 2);
    for (let k = kMin; k <= kMax; k++) {
      out.push(k === 0 ? line : line.map((q) => ({ x: q.x + 2 * k, y: q.y })));
    }
  }
  return out;
}

/**
 * Polilinha de direções na carta. Na estereográfica, os pontos projetados, sem densificar; na
 * equidistante, densificados na esfera; na cilíndrica, densificados, sem saltos na costura e com as
 * cópias que alcançam a carta (a interface recorta). Com `closed`, o anel volta ao início.
 */
export function projectPath(p: Projection, dirs: Direction[], closed: boolean): ChartPoint[][] {
  if (dirs.length === 0) return [];
  if (p.kind === 'stereographic') {
    const line = dirs.map((d) => stereo(d.zenith, d.azimuth));
    return [closed ? [...line, line[0]!] : line];
  }
  const dense = densify(dirs, MAX_STEP, closed);
  if (p.kind === 'equidistant') {
    const line = dense.map((d) => projectDirection(p, d.zenith, d.azimuth));
    return [closed ? [...line, line[0]!] : line];
  }
  const refined = refineNearZenith(dense, closed);
  const path = closed ? [...refined, refined[0]!] : refined;
  const xs = unwrappedX(p, path);
  const line = path.map((d, i) => ({ x: xs[i]!, y: (90 - d.zenith) / 90 }));
  return periodicCopies([line]);
}

/**
 * Anel de direções como polígono(s) da carta, para preencher. Na cilíndrica, um anel que dá a volta
 * em torno do eixo vertical é fechado pela borda de cima (a região contém o zênite) ou de baixo (o
 * nádir), conforme `containsZenith`.
 */
export function projectRing(
  p: Projection,
  dirs: Direction[],
  containsZenith = true,
): ChartPoint[][] {
  if (dirs.length < 3) return [];
  if (p.kind !== 'cylindrical') return [projectPath(p, dirs, true)[0]!.slice(0, -1)];
  const refined = refineNearZenith(densify(dirs, MAX_STEP, true), true);
  const path = [...refined, refined[0]!];
  const xs = unwrappedX(p, path);
  const ring = path.map((d, i) => ({ x: xs[i]!, y: (90 - d.zenith) / 90 }));
  const winding = ring[ring.length - 1]!.x - ring[0]!.x;
  if (Math.abs(winding) > 1) {
    const cap = containsZenith ? 1.1 : -1.1;
    ring.push({ x: ring[ring.length - 1]!.x, y: cap }, { x: ring[0]!.x, y: cap });
  } else {
    ring.pop();
  }
  return periodicCopies([ring]);
}

// ---------------------------------------------------------------------------------------------
// Regiões da máscara (spec 01, seção 1.6) em outras projeções.

/** Região projetada: anéis pela regra par-ímpar, com complemento opcional. */
export type ProjectedRegion =
  | { kind: 'empty' }
  | { kind: 'all' }
  | { kind: 'shape'; rings: ChartPoint[][]; complement: boolean }
  | { kind: 'not'; region: ProjectedRegion }
  | { kind: 'and'; regions: ProjectedRegion[] }
  | { kind: 'or'; regions: ProjectedRegion[] };

/**
 * Calota da esfera {s : n · s > d} de um disco da carta estereográfica (centro (cx, cy), raio r).
 * Com s = (2X, 2Y, 1 − ρ²) / (1 + ρ²): dentro do disco ⇔ ρ² − 2(cx X + cy Y) + k < 0, com
 * k = cx² + cy² − r², ⇔ n · s > d com n = (cx, cy, (1 − k) / 2) e d = (1 + k) / 2.
 */
export function discCap(cx: number, cy: number, r: number): { n: Vec3; d: number } {
  const k = cx * cx + cy * cy - r * r;
  const n: Vec3 = [cx, cy, (1 - k) / 2];
  const len = Math.hypot(n[0], n[1], n[2]);
  return { n: [n[0] / len, n[1] / len, n[2] / len], d: (1 + k) / 2 / len };
}

/** Círculo de borda de uma calota, amostrado a cada `step` graus. */
export function capBoundary(n: Vec3, d: number, step = MAX_STEP): Direction[] {
  const rho = Math.acos(Math.max(-1, Math.min(1, d)));
  // Base ortonormal do plano perpendicular a n.
  const helper: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let u: Vec3 = [
    helper[1] * n[2] - helper[2] * n[1],
    helper[2] * n[0] - helper[0] * n[2],
    helper[0] * n[1] - helper[1] * n[0],
  ];
  const ul = Math.hypot(...u);
  u = [u[0] / ul, u[1] / ul, u[2] / ul];
  const v: Vec3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const count = Math.max(8, Math.ceil(360 / step));
  const c = Math.cos(rho);
  const s = Math.sin(rho);
  const out: Direction[] = [];
  for (let i = 0; i < count; i++) {
    const t = (2 * Math.PI * i) / count;
    const w: Vec3 = [
      c * n[0] + s * (u[0] * Math.cos(t) + v[0] * Math.sin(t)),
      c * n[1] + s * (u[1] * Math.cos(t) + v[1] * Math.sin(t)),
      c * n[2] + s * (u[2] * Math.cos(t) + v[2] * Math.sin(t)),
    ];
    out.push(fromVector(w));
  }
  return out;
}

/** Retângulo grande (em unidades da carta) que cobre a carta de qualquer projeção. */
const BIG_RING: ChartPoint[] = [
  { x: -3, y: -3 },
  { x: 3, y: -3 },
  { x: 3, y: 3 },
  { x: -3, y: 3 },
];

function halfPlaneShape(p: Projection, nx: number, ny: number): ProjectedRegion {
  if (p.kind !== 'cylindrical') {
    const len = Math.hypot(nx, ny);
    const n = { x: nx / len, y: ny / len };
    const d = { x: -n.y, y: n.x };
    const L = 3;
    return {
      kind: 'shape',
      complement: false,
      rings: [
        [
          { x: L * d.x, y: L * d.y },
          { x: L * d.x + 2 * L * n.x, y: L * d.y + 2 * L * n.y },
          { x: -L * d.x + 2 * L * n.x, y: -L * d.y + 2 * L * n.y },
          { x: -L * d.x, y: -L * d.y },
        ],
      ],
    };
  }
  // Plano vertical: faixa de 180° de azimute em torno do azimute de (nx, ny).
  const a0 = Math.atan2(nx, ny) * DEG;
  const x0 = wrap180(a0 - 90 - p.center) / 180;
  const band = [
    { x: x0, y: -1.1 },
    { x: x0 + 1, y: -1.1 },
    { x: x0 + 1, y: 1.1 },
    { x: x0, y: 1.1 },
  ];
  return { kind: 'shape', complement: false, rings: periodicCopies([band]) };
}

function insidePolygon(points: ChartPoint[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!;
    const b = points[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** Arestas do polígono desenhado à mão: retas na carta estereográfica, amostradas e desprojetadas. */
function polygonDirections(points: ChartPoint[]): Direction[] {
  const out: Direction[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / POLYGON_STEP));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      out.push(unstereo(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)));
    }
  }
  return out;
}

/** Converte a região da carta estereográfica (spec 01, seção 1.6) para a projeção dada. */
export function projectRegion(region: Region, p: Projection): ProjectedRegion {
  switch (region.kind) {
    case 'empty':
    case 'all':
      return { kind: region.kind };
    case 'not':
      return { kind: 'not', region: projectRegion(region.region, p) };
    case 'and':
    case 'or':
      return { kind: region.kind, regions: region.regions.map((r) => projectRegion(r, p)) };
    case 'halfPlane':
      return halfPlaneShape(p, region.nx, region.ny);
    case 'disc': {
      const { n, d } = discCap(region.cx, region.cy, region.r);
      const zenith = n[2] > d;
      const nadir = -n[2] > d;
      const boundary = capBoundary(n, d);
      if (p.kind === 'cylindrical') {
        // Uma das duas pontas dentro: o círculo dá a volta e é fechado pela borda certa.
        if (zenith !== nadir) {
          return { kind: 'shape', complement: false, rings: projectRing(p, boundary, zenith) };
        }
        return { kind: 'shape', complement: zenith, rings: projectRing(p, boundary) };
      }
      // Azimutais: a calota com o nádir é o lado de fora da curva.
      return { kind: 'shape', complement: nadir, rings: projectRing(p, boundary) };
    }
    case 'polygon': {
      const dirs = polygonDirections(region.points);
      const zenith = insidePolygon(region.points, 0, 0);
      return { kind: 'shape', complement: false, rings: projectRing(p, dirs, zenith) };
    }
  }
}

/** O ponto da carta está na região projetada? (Testes e cliques.) */
export function projectedRegionContains(r: ProjectedRegion, x: number, y: number): boolean {
  switch (r.kind) {
    case 'empty':
      return false;
    case 'all':
      return true;
    case 'shape': {
      let inside = false;
      for (const ring of r.rings) if (insidePolygon(ring, x, y)) inside = !inside;
      return inside !== r.complement;
    }
    case 'not':
      return !projectedRegionContains(r.region, x, y);
    case 'and':
      return r.regions.every((c) => projectedRegionContains(c, x, y));
    case 'or':
      return r.regions.some((c) => projectedRegionContains(c, x, y));
  }
}

/** Anel do retângulo grande, para pintar complementos (regra par-ímpar). */
export const BIG_CHART_RING = BIG_RING;
