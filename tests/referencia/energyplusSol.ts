// Sol do EnergyPlus 26.2 e regras de saída da fração ensolarada, reproduzidos para comparar a
// geometria com o mesmo sol (F3.8, spec 07, seção 7.10; F5.2, spec 13, seção 13.6).
import type { Site } from '../../src/core/chart/sunChart';
import type { buildScene } from '../../src/core/shading/geometry';
import {
  facadeFromEnu,
  sunlitFraction,
  type FacadeVector,
} from '../../src/core/shading/shadedFraction';

export const SUN_IS_UP = 1e-5;
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

export function sun3(day: number): [number, number] {
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
export function energyPlusSun(
  site: Site,
  orientation: number,
  day: number,
  hour: number,
  step: number,
  steps: number,
): FacadeVector | null {
  const [sinDec, equationOfTime] = sun3(day);
  const cosDec = Math.sqrt(1 - sinDec * sinDec);
  const time = hour - 1 + step / steps;
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
export function sunlit(scene: ReturnType<typeof buildScene>, s: FacadeVector | null): number {
  if (!s) return 0;
  const f = sunlitFraction(scene, s);
  return f < SUN_IS_UP ? 0 : Math.min(f, 1);
}
