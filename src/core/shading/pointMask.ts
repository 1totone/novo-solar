/**
 * Máscara de um ponto da janela pela geometria (F3.2).
 *
 * Especificação: docs/spec/07-mascara-pela-geometria.md, seção 7.4. As direções em que o ponto Q
 * fica à sombra de uma placa convexa formam um cone convexo: a interseção dos semiespaços
 * {d : m_i · d ≥ 0}, com m_i a normal ao plano que passa por Q e pela aresta i, orientada para
 * dentro da placa. Na carta, cada semiespaço é um disco, o exterior de um disco ou um semiplano
 * pelo centro (spec 03, seção 3.3); a máscara é uma região exata, do mesmo tipo das da máscara
 * pelos ângulos (src/core/mask/mask.ts).
 *
 * Validação: traçado de raios (tests/referencia/mascaraGeometria.test.ts) e casos analíticos
 * (pointMask.test.ts).
 */
import { and, EMPTY, facadeHalfPlane, HORIZON, not, or, type Region } from '../mask/mask';
import type { Scene } from './geometry';

const RAD = Math.PI / 180;

type V = [number, number, number];

const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V) => Math.hypot(a[0], a[1], a[2]);

/**
 * Abaixo deste |m_U| (normal unitária), o círculo máximo é tratado como reta pelo centro: o erro de
 * posição na carta de raio 1 fica perto de 10⁻⁸ dos dois lados do limite.
 */
const VERTICAL_PLANE = 1e-8;

/** Região da carta das direções d com m · d ≥ 0 (m no referencial da fachada, unitário). */
function hemisphere(m: V, orientation: number): Region {
  const c = Math.cos(orientation * RAD);
  const s = Math.sin(orientation * RAD);
  const e = m[0] * c + m[1] * s;
  const n = -m[0] * s + m[1] * c;
  const u = m[2];
  if (Math.abs(u) < VERTICAL_PLANE) return { kind: 'halfPlane', nx: e, ny: n };
  const disc: Region = { kind: 'disc', cx: e / u, cy: n / u, r: 1 / Math.abs(u) };
  return u > 0 ? disc : not(disc);
}

/**
 * Região da carta (raio 1, x para Leste, y para Norte) das direções do sol em que o ponto
 * (x, z) da janela fica à sombra de alguma placa, acima do horizonte e diante da fachada.
 */
export function pointMask(
  scene: Scene,
  point: { x: number; z: number },
  orientation: number,
): Region {
  const cones: Region[] = [];
  for (const plate of scene.plates) {
    const rel: V[] = plate.map((v) => [v[0] - point.x, v[1], v[2] - point.z]);
    // Normal da placa (Newell) e teste de placa vista de perfil (plano pelo ponto).
    const normal: V = [0, 0, 0];
    let size = 0;
    rel.forEach((a, i) => {
      const b = rel[(i + 1) % rel.length]!;
      normal[0] += (a[1] - b[1]) * (a[2] + b[2]);
      normal[1] += (a[2] - b[2]) * (a[0] + b[0]);
      normal[2] += (a[0] - b[0]) * (a[1] + b[1]);
      size = Math.max(size, norm(a));
    });
    const nn = norm(normal);
    if (nn === 0 || Math.abs(dot(normal, rel[0]!)) <= 1e-12 * nn * size) continue;
    // Direção interna do cone: o centroide dos vértices.
    const center: V = [0, 0, 0];
    for (const a of rel) {
      center[0] += a[0] / rel.length;
      center[1] += a[1] / rel.length;
      center[2] += a[2] / rel.length;
    }
    const sides: Region[] = [];
    rel.forEach((a, i) => {
      const m = cross(a, rel[(i + 1) % rel.length]!);
      const len = norm(m);
      if (len === 0) return;
      const sign = dot(m, center) >= 0 ? 1 : -1;
      sides.push(
        hemisphere([(sign * m[0]) / len, (sign * m[1]) / len, (sign * m[2]) / len], orientation),
      );
    });
    cones.push(and(...sides));
  }
  if (cones.length === 0) return EMPTY;
  return and(HORIZON, facadeHalfPlane(orientation, 0, 1), or(...cones));
}
