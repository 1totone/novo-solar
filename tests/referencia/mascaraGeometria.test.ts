// Máscara pela geometria (F3.2) contra referências independentes:
// - docs/validacao/scripts/mascara_geometria.py: placas montadas em Python a partir dos mesmos
//   parâmetros, percentual sombreado pela área da união com shapely (GEOS) e traçado de raios numa
//   grade de 400 × 400 (sem projeção), sombra de pontos isolados por traçado de raios;
// - docs/validacao/scripts/mascara_tracado_raios.py (F2.3): traçado de raios numa grade de 41 × 41
//   e a máscara pelos ângulos, que a máscara pela geometria tem de reproduzir onde é exata.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { project } from '../../src/core/chart/stereographic';
import { maskRegions, regionContains, type ShadingSet } from '../../src/core/mask/mask';
import { buildScene, type Device, type Plate, type WindowGeometry } from '../../src/core/shading/geometry';
import { pointMask } from '../../src/core/shading/pointMask';
import { facadeVector, shadedFraction } from '../../src/core/shading/shadedFraction';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => JSON.parse(readFileSync(`${root}${path}`, 'utf-8')) as unknown;

interface SceneRef {
  id: string;
  origem: string;
  janela: WindowGeometry;
  dispositivos: Record<string, unknown>[];
  placas: number[][][];
  pontos: [number, number][];
  amostras: [number, number, number, number, number][];
  tracado_raios: [number, number, number, number][];
}
const geometry = read('docs/validacao/casos/mascara/geometria.json') as { cenas: SceneRef[] };

interface CaseF23 {
  id: string;
  orientacao: number;
  total: ShadingSet;
  parcial: ShadingSet;
  uniao_exata: boolean;
  amostras: [number, number, number, number, number][];
}
const f23 = read('docs/validacao/casos/mascara/tracado-raios.json') as { casos: CaseF23[] };

/** Dispositivos do JSON: prolongamento infinito vem como null. */
function devices(ref: SceneRef): Device[] {
  return ref.dispositivos.map(
    (d) =>
      Object.fromEntries(
        Object.entries(d).map(([k, v]) => [k, v === null ? Infinity : v]),
      ) as unknown as Device,
  );
}

const scenes = new Map(geometry.cenas.map((c) => [c.id, buildScene(c.janela, devices(c))]));
const FULL = 1 - 1e-9;

/** Vértices de uma placa em ordem lexicográfica (a comparação não depende da ordem). */
const sortedVertices = (plate: Plate | number[][]) =>
  [...plate].map((v) => [...v]).sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!);

describe('máscara pela geometria contra shapely e traçado de raios', () => {
  it.each(geometry.cenas.map((c) => [c.id, c] as const))('%s: placas', (id, ref) => {
    const plates = scenes.get(id)!.plates;
    expect(plates).toHaveLength(ref.placas.length);
    plates.forEach((plate, i) => {
      const a = sortedVertices(plate);
      const b = sortedVertices(ref.placas[i]!);
      expect(a).toHaveLength(b.length);
      a.forEach((v, j) =>
        v.forEach((c, k) => {
          const e = b[j]![k]!;
          expect(Math.abs(c - e), `placa ${i}`).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(e)));
        }),
      );
    });
  });

  it.each(geometry.cenas.map((c) => [c.id, c] as const))(
    '%s: percentual sombreado igual ao do shapely (10⁻⁹)',
    (id, ref) => {
      const scene = scenes.get(id)!;
      let max = 0;
      for (const [h, psi, f] of ref.amostras) {
        max = Math.max(max, Math.abs(shadedFraction(scene, facadeVector(h, psi, 0)) - f));
      }
      expect(max).toBeLessThan(1e-9);
    },
  );

  it.each(geometry.cenas.map((c) => [c.id, c] as const))(
    '%s: percentual sombreado igual ao do traçado de raios (0,002)',
    (id, ref) => {
      const scene = scenes.get(id)!;
      for (const [h, psi, , rays] of ref.tracado_raios) {
        expect(Math.abs(shadedFraction(scene, facadeVector(h, psi, 0)) - rays)).toBeLessThan(0.002);
      }
    },
  );

  it.each(geometry.cenas.map((c) => [c.id, c] as const))(
    '%s: máscara de dois pontos igual à do traçado de raios',
    (id, ref) => {
      const scene = scenes.get(id)!;
      ref.pontos.forEach(([x, z], k) => {
        const region = pointMask(scene, { x, z }, 0);
        const wrong = ref.amostras.filter(([h, psi, , ...flags]) => {
          const p = project(90 - h, psi);
          return regionContains(region, p.x, p.y) !== (flags[k] === 1);
        });
        expect(wrong, `ponto ${k + 1}`).toEqual([]);
      });
    },
  );
});

describe('máscara pela geometria contra o F2.3 (traçado de raios e máscara pelos ângulos)', () => {
  // A "grelha com γ" tem a mesma geometria da grelha (só os ângulos digitados mudam).
  const sceneOf = (id: string) => scenes.get(id === 'grelha-com-gama' ? 'grelha' : id)!;
  const centerOf = (id: string) =>
    geometry.cenas.find((c) => c.id === (id === 'grelha-com-gama' ? 'grelha' : id))!.janela;

  it.each(f23.casos.map((c) => [c.id, c] as const))(
    '%s: sombra total igual à da grade de 41 × 41 e fração a 0,05',
    (id, c) => {
      const scene = sceneOf(id);
      for (const [h, az, total, , fraction] of c.amostras) {
        const f = shadedFraction(scene, facadeVector(h, az, c.orientacao));
        expect(f >= FULL, `h = ${h}, A = ${az}`).toBe(total === 1);
        expect(Math.abs(f - fraction)).toBeLessThanOrEqual(0.05);
      }
    },
  );

  it.each(f23.casos.map((c) => [c.id, c] as const))(
    '%s: máscara do centro igual ao critério de 50% (traçado de raios e ângulos)',
    (id, c) => {
      const w = centerOf(id);
      const region = pointMask(sceneOf(id), { x: w.width / 2, z: w.height / 2 }, c.orientacao);
      const angles = maskRegions(c.orientacao, 'external', c.total, c.parcial);
      for (const [h, az, , center] of c.amostras) {
        const p = project(90 - h, az);
        const inMask = regionContains(region, p.x, p.y);
        expect(inMask, `h = ${h}, A = ${az}`).toBe(center === 1);
        expect(regionContains(angles.partialSet, p.x, p.y), `h = ${h}, A = ${az}`).toBe(inMask);
      }
    },
  );

  it.each(f23.casos.map((c) => [c.id, c] as const))(
    '%s: sombra total pelos ângulos igual à exata onde a união é exata; nunca maior',
    (id, c) => {
      const scene = sceneOf(id);
      const angles = maskRegions(c.orientacao, 'external', c.total, c.parcial);
      for (const [h, az] of c.amostras) {
        const p = project(90 - h, az);
        const byAngles = regionContains(angles.total, p.x, p.y);
        const full = shadedFraction(scene, facadeVector(h, az, c.orientacao)) >= FULL;
        if (c.uniao_exata) expect(byAngles, `h = ${h}, A = ${az}`).toBe(full);
        else if (byAngles) expect(full, `h = ${h}, A = ${az}`).toBe(true);
      }
    },
  );
});
