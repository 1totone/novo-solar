// Verificação contra o EnergyPlus (F3.8; spec 07, seção 7.8): fração ensolarada da janela
// ("Surface Outside Face Sunlit Fraction", ShadowCalculation por passo de tempo, 6 passos por hora)
// em 8 cenas e 5 locais, gerada por docs/validacao/scripts/energyplus_fracao_ensolarada.py com o
// EnergyPlus 26.2.0 (modelos em docs/validacao/casos/energyplus/modelos/). Três comparações:
// - geometria por passo de tempo: o mesmo sol do EnergyPlus, nos dias 1, 11 e 21 de cada mês;
// - geometria hora a hora: o mesmo sol, no ano inteiro;
// - ponta a ponta hora a hora: o sol da aplicação (SPA) contra o do EnergyPlus, no ano inteiro.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Site } from '../../src/core/chart/sunChart';
import { buildScene, type Device, type WindowGeometry } from '../../src/core/shading/geometry';
import { HOURS_PER_YEAR, hourlyShading, sunSamples } from '../../src/core/shading/hourly';
import {
  facadeFromEnu,
  sunlitFraction,
  sunOnWindow,
  type FacadeVector,
} from '../../src/core/shading/shadedFraction';

const root = fileURLToPath(new URL('../../', import.meta.url));

interface SceneRef {
  id: string;
  local: string;
  orientacao: number;
  janela: WindowGeometry;
  dispositivos: Device[];
  /** Média dos 6 passos de cada hora do ano (8760). */
  horaria: number[];
  /** Cada passo de tempo dos dias de dias_passos, na ordem dia, hora, passo. */
  passos: number[];
  /** Passo do ano (0 a 52 559) e cossenos de saída: parede direita, janela e cobertura. */
  cossenos: [number, number, number, number][];
}
const data = JSON.parse(
  readFileSync(`${root}docs/validacao/casos/energyplus/fracao-ensolarada.json`, 'utf-8'),
) as {
  passos_por_hora: number;
  dias_passos: number[];
  locais: Record<string, Site>;
  cenas: SceneRef[];
};
const STEPS = data.passos_por_hora;
const SUN_IS_UP = 1e-5;
const RAD = Math.PI / 180;

// Sol do EnergyPlus 26.2 (SolarShading.cc). SUN3: seno da declinação e equação do tempo (horas) do
// dia, por séries de Fourier ajustadas; SUN4: direção do sol no instante, com o ângulo horário pelo
// meridiano do fuso; FigureSunCosines: com mais de um passo por hora, o instante é o fim do passo.
const DECLINATION = [
  0.005618, 0.0657911, -0.392779, 0.0006444, -0.00618495, -0.00010101, -0.00007951, -0.00011691,
  0.00002096,
];
const EQUATION_OF_TIME = [
  0.00021971, -0.122649, 0.00762856, -0.156308, -0.0530028, -0.00388702, -0.00123978, -0.00270502,
  -0.00167992,
];

function sun3(day: number): [number, number] {
  const x = 0.017167 * day;
  const s1 = Math.sin(x);
  const c1 = Math.cos(x);
  const s2 = s1 * c1 * 2;
  const c2 = c1 * c1 - s1 * s1;
  const base = [
    1,
    s1,
    c1,
    s2,
    c2,
    s1 * c2 + c1 * s2,
    c1 * c2 - s1 * s2,
    2 * s2 * c2,
    c2 * c2 - s2 * s2,
  ];
  const series = (coef: number[]) => coef.reduce((sum, a, i) => sum + a * base[i]!, 0);
  return [series(DECLINATION), series(EQUATION_OF_TIME)];
}

/** Sol do EnergyPlus no fim do passo (1 a N) da hora (1 a 24) do dia do ano; null abaixo do horizonte. */
function energyPlusSun(
  site: Site,
  orientation: number,
  day: number,
  hour: number,
  step: number,
): FacadeVector | null {
  const [sinDec, equationOfTime] = sun3(day);
  const cosDec = Math.sqrt(1 - sinDec * sinDec);
  const time = hour - 1 + step / STEPS;
  const h = (15 * (12 - (time + equationOfTime)) + (site.timeZone * 15 - site.longitude)) * RAD;
  const sinLat = Math.sin(site.latitude * RAD);
  const cosLat = Math.cos(site.latitude * RAD);
  const up = sinDec * sinLat + cosDec * cosLat * Math.cos(h);
  if (up < SUN_IS_UP) return null;
  const north = sinDec * cosLat - cosDec * sinLat * Math.cos(h);
  const east = cosDec * Math.sin(h);
  return facadeFromEnu(east, north, up, orientation);
}

/** Fração ensolarada com as regras de saída do EnergyPlus: abaixo de 10⁻⁵ vale 0. */
function sunlit(scene: ReturnType<typeof buildScene>, s: FacadeVector | null): number {
  if (!s) return 0;
  const f = sunlitFraction(scene, s);
  return f < SUN_IS_UP ? 0 : Math.min(f, 1);
}

/** Fração ensolarada de cada passo do ano com o sol do EnergyPlus, e o cos θ (0 sem sol na janela). */
const yearCache = new Map<string, { f: Float64Array; cos: Float64Array }>();
function energyPlusSunYear(ref: SceneRef) {
  const cached = yearCache.get(ref.id);
  if (cached) return cached;
  const site = data.locais[ref.local]!;
  const scene = buildScene(ref.janela, ref.dispositivos);
  const f = new Float64Array(365 * 24 * STEPS);
  const cos = new Float64Array(365 * 24 * STEPS);
  let i = 0;
  for (let day = 1; day <= 365; day++) {
    for (let hour = 1; hour <= 24; hour++) {
      for (let step = 1; step <= STEPS; step++, i++) {
        const s = energyPlusSun(site, ref.orientacao, day, hour, step);
        f[i] = sunlit(scene, s);
        cos[i] = s && sunOnWindow(s) ? s.y : 0;
      }
    }
  }
  yearCache.set(ref.id, { f, cos });
  return { f, cos };
}

const samplesCache = new Map<string, ReturnType<typeof sunSamples>>();
function appSamples(local: string) {
  if (!samplesCache.has(local)) {
    samplesCache.set(local, sunSamples(data.locais[local]!, { samplesPerHour: STEPS, at: 'end' }));
  }
  return samplesCache.get(local)!;
}

const hourlyMean = (v: Float64Array, hour: number) => {
  let sum = 0;
  for (let k = 0; k < STEPS; k++) sum += v[hour * STEPS + k]!;
  return sum / STEPS;
};

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
};

const rms = (values: number[]) => Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);

describe('verificação contra o EnergyPlus 26.2 (F3.8)', () => {
  it('a referência tem 8 cenas e o ano inteiro', () => {
    expect(data.cenas).toHaveLength(8);
    for (const ref of data.cenas) {
      expect(ref.horaria).toHaveLength(HOURS_PER_YEAR);
      expect(ref.passos).toHaveLength(data.dias_passos.length * 24 * STEPS);
    }
  });

  it('o sol do EnergyPlus reproduzido aqui é o das saídas (cossenos de incidência)', () => {
    let worst = 0;
    for (const ref of data.cenas) {
      const site = data.locais[ref.local]!;
      for (const [index, x, y, z] of ref.cossenos) {
        const day = Math.floor(index / (24 * STEPS)) + 1;
        const hour = Math.floor((index % (24 * STEPS)) / STEPS) + 1;
        const step = (index % STEPS) + 1;
        const s = energyPlusSun(site, ref.orientacao, day, hour, step)!;
        worst = Math.max(worst, Math.abs(s.x - x), Math.abs(s.y - y), Math.abs(s.z - z));
      }
    }
    expect(worst).toBeLessThanOrEqual(1e-12);
  });

  describe.each(data.cenas)('$id ($local, fachada a $orientacao°)', (ref) => {
    const site = data.locais[ref.local]!;
    const scene = buildScene(ref.janela, ref.dispositivos);

    it('geometria por passo de tempo, com o sol do EnergyPlus', () => {
      let k = 0;
      let worst = 0;
      let grazing = 0;
      let litWithoutSun = 0;
      const diffs: number[] = [];
      for (const day of data.dias_passos) {
        for (let hour = 1; hour <= 24; hour++) {
          for (let step = 1; step <= STEPS; step++, k++) {
            const s = energyPlusSun(site, ref.orientacao, day, hour, step);
            const ep = ref.passos[k]!;
            const d = Math.abs(sunlit(scene, s) - ep);
            const cos = s && sunOnWindow(s) ? s.y : 0;
            if (cos === 0) {
              if (ep !== 0) litWithoutSun++;
            } else if (cos >= 1e-3) {
              worst = Math.max(worst, d);
              diffs.push(d);
            } else {
              // Sol rasante à fachada: o EnergyPlus perde a sombra (ver relatório do F3.8).
              grazing = Math.max(grazing, d * cos);
            }
          }
        }
      }
      expect(litWithoutSun).toBe(0);
      expect(diffs.length).toBeGreaterThan(500);
      expect(worst).toBeLessThanOrEqual(5e-4);
      expect(percentile(diffs, 99)).toBeLessThanOrEqual(5e-5);
      expect(grazing).toBeLessThanOrEqual(5e-4);
    });

    it('geometria hora a hora no ano, com o sol do EnergyPlus', () => {
      const { f, cos } = energyPlusSunYear(ref);
      let worst = 0;
      let grazingHours = 0;
      for (let hour = 0; hour < HOURS_PER_YEAR; hour++) {
        let grazing = false;
        for (let k = 0; k < STEPS; k++) {
          const c = cos[hour * STEPS + k]!;
          if (c > 0 && c < 1e-3) grazing = true;
        }
        if (grazing) {
          grazingHours++;
          continue;
        }
        worst = Math.max(worst, Math.abs(hourlyMean(f, hour) - ref.horaria[hour]!));
      }
      expect(worst).toBeLessThanOrEqual(1e-4);
      expect(grazingHours).toBeLessThanOrEqual(0.01 * HOURS_PER_YEAR);
    });

    it('ponta a ponta hora a hora no ano, com o sol da aplicação (SPA)', () => {
      const app = hourlyShading(appSamples(ref.local), scene, ref.orientacao);
      const { f, cos } = energyPlusSunYear(ref);
      const total: number[] = [];
      const sunOnly: number[] = [];
      for (let hour = 0; hour < HOURS_PER_YEAR; hour++) {
        const exposedEp = hourlyMean(cos, hour) > 0;
        if (!(app.exposure[hour]! > 0 || exposedEp)) continue;
        total.push(app.sunlit[hour]! - ref.horaria[hour]!);
        sunOnly.push(app.sunlit[hour]! - hourlyMean(f, hour));
      }
      const bias = total.reduce((a, b) => a + b, 0) / total.length;
      expect(rms(total)).toBeLessThanOrEqual(0.03);
      expect(Math.abs(bias)).toBeLessThanOrEqual(0.002);
      // A diferença é a da posição do sol: a mesma geometria com os dois sóis dá o mesmo RMSE.
      expect(Math.abs(rms(total) - rms(sunOnly))).toBeLessThanOrEqual(0.002);
    });
  });
});
