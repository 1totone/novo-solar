// Fração ensolarada hora a hora e mapa mês × hora (F3.3) contra a referência independente
// docs/validacao/scripts/fracao_ensolarada_horaria.py: posição do sol pelo pvlib (NREL SPA) e
// percentual sombreado pelo shapely, no ano inteiro, em 3 locais × 3 cenas, e nas variantes de
// amostragem (fim dos passos, como o EnergyPlus, e uma amostra por hora).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { project } from '../../src/core/chart/stereographic';
import { regionContains } from '../../src/core/mask/mask';
import type { Site } from '../../src/core/chart/sunChart';
import { buildScene, type Device, type WindowGeometry } from '../../src/core/shading/geometry';
import {
  hourlyShading,
  monthHourMap,
  sunSamples,
  type SampleTime,
  type SunSamples,
} from '../../src/core/shading/hourly';
import { pointMask } from '../../src/core/shading/pointMask';
import { facadeFromEnu, shadedFraction, sunOnWindow } from '../../src/core/shading/shadedFraction';

const root = fileURLToPath(new URL('../../', import.meta.url));

interface SceneRef {
  id: string;
  orientacao: number;
  janela: WindowGeometry;
  dispositivos: Device[];
}
interface Combination {
  local: string;
  cena: string;
  amostras_por_hora: number;
  posicao: SampleTime;
  mapa: {
    ensolarada: number[][];
    exposicao: number[][];
    sombreada_com_sol_na_janela: (number | null)[][];
  };
  horas: [number, number, number, number, number][];
  soma_anual: { Fe: number; E: number; Ce: number; C: number };
}
const data = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/mascara/fracao-horaria.json`, 'utf-8'),
) as { locais: Record<string, Site>; cenas: SceneRef[]; combinacoes: Combination[] };

const cache = new Map<string, SunSamples>();
function samplesFor(c: Combination): SunSamples {
  const key = `${c.local}/${c.amostras_por_hora}/${c.posicao}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      sunSamples(data.locais[c.local]!, { samplesPerHour: c.amostras_por_hora, at: c.posicao }),
    );
  }
  return cache.get(key)!;
}
const sceneRef = (id: string) => data.cenas.find((s) => s.id === id)!;
const sceneOf = (id: string) => buildScene(sceneRef(id).janela, sceneRef(id).dispositivos);

const TOL = 1e-6;

describe('fração ensolarada hora a hora contra pvlib e shapely', () => {
  it.each(
    data.combinacoes.map(
      (c) => [`${c.local} / ${c.cena} (N = ${c.amostras_por_hora}, ${c.posicao})`, c] as const,
    ),
  )('%s', (_name, c) => {
    const hourly = hourlyShading(samplesFor(c), sceneOf(c.cena), sceneRef(c.cena).orientacao);
    for (const [i, sunlit, exposure, sunlitIncidence, incidence] of c.horas) {
      expect(hourly.sunlit[i], `hora ${i}`).toBeCloseTo(sunlit, 6);
      expect(Math.abs(hourly.sunlit[i]! - sunlit)).toBeLessThan(TOL);
      expect(Math.abs(hourly.exposure[i]! - exposure)).toBeLessThan(TOL);
      expect(Math.abs(hourly.sunlitIncidence[i]! - sunlitIncidence)).toBeLessThan(TOL);
      expect(Math.abs(hourly.incidence[i]! - incidence)).toBeLessThan(TOL);
    }
    const map = monthHourMap(hourly);
    for (let m = 0; m < 12; m++) {
      for (let h = 0; h < 24; h++) {
        const where = `mês ${m + 1}, hora ${h + 1}`;
        expect(Math.abs(map.sunlit[m]![h]! - c.mapa.ensolarada[m]![h]!), where).toBeLessThan(TOL);
        expect(Math.abs(map.exposure[m]![h]! - c.mapa.exposicao[m]![h]!), where).toBeLessThan(TOL);
        const s = map.shadedWhenExposed[m]![h]!;
        const ref = c.mapa.sombreada_com_sol_na_janela[m]![h]!;
        if (ref === null) expect(s, where).toBeNull();
        else expect(Math.abs(s! - ref), where).toBeLessThan(TOL);
      }
    }
    const sum = (a: Float64Array) => a.reduce((x, y) => x + y, 0);
    expect(Math.abs(sum(hourly.sunlit) - c.soma_anual.Fe)).toBeLessThan(1e-4);
    expect(Math.abs(sum(hourly.exposure) - c.soma_anual.E)).toBeLessThan(1e-4);
    expect(Math.abs(sum(hourly.sunlitIncidence) - c.soma_anual.Ce)).toBeLessThan(1e-4);
    expect(Math.abs(sum(hourly.incidence) - c.soma_anual.C)).toBeLessThan(1e-4);
  });
});

describe('coerência com a máscara em todas as amostras do ano', () => {
  it.each(data.cenas.map((s) => [s.id, s] as const))(
    '%s, em Florianópolis: 100% põe o centro à sombra e 0% o deixa ao sol',
    (id, ref) => {
      const scene = sceneOf(id);
      const samples = samplesFor({ local: 'florianopolis', amostras_por_hora: 6, posicao: 'middle' } as Combination);
      const center = pointMask(scene, { x: scene.width / 2, z: scene.height / 2 }, ref.orientacao);
      let full = 0;
      let none = 0;
      for (let j = 0; j < samples.east.length; j++) {
        const e = samples.east[j]!;
        const n = samples.north[j]!;
        const u = samples.up[j]!;
        const s = facadeFromEnu(e, n, u, ref.orientacao);
        if (!sunOnWindow(s)) continue;
        const f = shadedFraction(scene, s);
        const p = project((Math.acos(Math.min(1, u)) * 180) / Math.PI, (Math.atan2(e, n) * 180) / Math.PI);
        const shaded = regionContains(center, p.x, p.y);
        if (f >= 1 - 1e-9) {
          full++;
          expect(shaded, `amostra ${j}`).toBe(true);
        } else if (f <= 1e-9) {
          none++;
          expect(shaded, `amostra ${j}`).toBe(false);
        }
      }
      // A conferência alcança de fato muitas amostras (com recuo, 0% não acontece com o sol alto).
      expect(full + none).toBeGreaterThan(1000);
    },
  );
});
