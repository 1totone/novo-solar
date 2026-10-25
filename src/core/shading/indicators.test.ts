// Casos à mão da memória de cálculo (docs/validacao/relatorios/F3.5-memoria-de-calculo.md): janela
// de 1 m × 1 m numa fachada Norte, brise horizontal infinito na altura da verga, 2 amostras por hora
// com o sol em posições escolhidas e DNI e classes dadas.
import { describe, expect, it } from 'vitest';
import { HOUR_CLASS } from '../comfort/classification';
import { buildScene } from './geometry';
import { HOURS_PER_YEAR, hourIndex, hourlyShading, type SunSamples } from './hourly';
import {
  beamIndicators,
  compareAlternatives,
  hourlyBeam,
  referenceHourIndices,
  sunUpFraction,
  type EpwRows,
} from './indicators';

const RAD = Math.PI / 180;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function calendar(leap = false): EpwRows {
  const days = [...DAYS_IN_MONTH];
  if (leap) days[1] = 29;
  const month: number[] = [];
  const day: number[] = [];
  const hour: number[] = [];
  days.forEach((n, m) => {
    for (let d = 1; d <= n; d++) {
      for (let h = 1; h <= 24; h++) {
        month.push(m + 1);
        day.push(d);
        hour.push(h);
      }
    }
  });
  return { month, day, hour };
}

/** Amostras do ano com o sol abaixo do horizonte, exceto nas horas dadas (altura, azimute). */
function samples(hours: Record<number, [number, number][]>): SunSamples {
  const n = 2;
  const east = new Float64Array(HOURS_PER_YEAR * n);
  const north = new Float64Array(HOURS_PER_YEAR * n);
  const up = new Float64Array(HOURS_PER_YEAR * n).fill(-1);
  for (const [i, list] of Object.entries(hours)) {
    list.forEach(([alt, az], k) => {
      const j = Number(i) * n + k;
      east[j] = Math.cos(alt * RAD) * Math.sin(az * RAD);
      north[j] = Math.cos(alt * RAD) * Math.cos(az * RAD);
      up[j] = Math.sin(alt * RAD);
    });
  }
  return { samplesPerHour: n, at: 'middle', east, north, up };
}

const H1 = hourIndex(1, 1, 11);
const H2 = H1 + 1;
const H3 = H1 + 2;
const H4 = H1 + 3;
const H5 = H1 + 4;
const H6 = H1 + 5;
const SUN = samples({
  [H1]: [
    [45, 0],
    [30, 0],
  ],
  [H2]: [
    [60, 0],
    [60, 0],
  ],
  [H3]: [
    [30, 180],
    [30, 180],
  ],
  [H4]: [
    [30, 45],
    [30, 45],
  ],
  [H5]: [
    [40, 0],
    [-10, 0],
  ],
  [H6]: [
    [45, 0],
    [45, 0],
  ],
});
const ROWS = calendar();
const DNI = new Float64Array(HOURS_PER_YEAR);
DNI[H1] = 500;
DNI[H2] = 800;
DNI[H3] = 600;
DNI[H4] = 300;
DNI[H5] = 200;
DNI[H6] = NaN; // ausente: fora das somas
const CLASSES = new Int8Array(HOURS_PER_YEAR).fill(HOUR_CLASS.neutral);
CLASSES[H1] = HOUR_CLASS.hot;
CLASSES[H2] = HOUR_CLASS.cold;
CLASSES[H3] = HOUR_CLASS.cold;
CLASSES[H4] = HOUR_CLASS.hot;
CLASSES[H6] = HOUR_CLASS.hot;

const WINDOW = { width: 1, height: 1 };
const brise = (depth: number) =>
  buildScene(WINDOW, [
    { kind: 'overhang', depth, above: 0, extendLeft: Infinity, extendRight: Infinity },
  ]);

const c30 = Math.cos(30 * RAD);
const c45 = Math.cos(45 * RAD);
const c40 = Math.cos(40 * RAD);
const s = (deg: number) => Math.sin(deg * RAD);
const t = (deg: number) => Math.tan(deg * RAD);

describe('memória de cálculo do F3.5 (brise infinito, fachada Norte)', () => {
  const shading = hourlyShading(SUN, brise(0.5), 0);
  const beam = hourlyBeam(shading, ROWS, DNI);

  it('radiação por hora: E₀ = DNI · média de cos θ; E = DNI · média de cos θ · (1 − f_s)', () => {
    // H1: f_s = D · tan α_perfil / H = 0,5 (45°) e 0,5 · tan 30° (30°).
    expect(beam.incident[H1]).toBeCloseTo((500 * (c45 + c30)) / 2, 9);
    expect(beam.admitted[H1]).toBeCloseTo((500 * (c45 * 0.5 + c30 * (1 - 0.5 * t(30)))) / 2, 9);
    // H2: sol a 60°, f_s = 0,5 · tan 60° = 0,866; bloqueado = DNI · (D / H) · sen h.
    expect(beam.incident[H2]).toBeCloseTo(400, 9);
    expect(beam.incident[H2]! - beam.admitted[H2]!).toBeCloseTo(800 * 0.5 * s(60), 9);
    // H3: sol atrás da fachada.
    expect(beam.incident[H3]).toBe(0);
    // H4: sol oblíquo (ψ = 45°): bloqueado = 300 · 0,5 · sen 30° = 75, independente do azimute.
    expect(beam.incident[H4]).toBeCloseTo(300 * c30 * Math.cos(45 * RAD), 9);
    expect(beam.incident[H4]! - beam.admitted[H4]!).toBeCloseTo(75, 9);
    // H5: uma amostra com o sol abaixo do horizonte: conta como zero (DNI constante na hora).
    expect(beam.incident[H5]).toBeCloseTo((200 * c40) / 2, 9);
    expect(Number.isNaN(beam.incident[H6]!)).toBe(true);
  });

  it('somas por classe e percentuais', () => {
    const r = beamIndicators(beam, CLASSES);
    const hotIncident = (500 * (c45 + c30)) / 2 + 300 * c30 * Math.cos(45 * RAD);
    const hotBlocked = (500 * (c45 * 0.5 + c30 * 0.5 * t(30))) / 2 + 75;
    expect(r.byClass.hot.incident).toBeCloseTo(hotIncident, 9);
    expect(r.byClass.hot.blocked).toBeCloseTo(hotBlocked, 9);
    expect(r.blockedInHot).toBeCloseTo(hotBlocked / hotIncident, 12);
    expect(r.blockedInHot).toBeCloseTo(0.391491, 6);
    expect(r.byClass.cold.incident).toBeCloseTo(400, 9);
    expect(r.admittedInCold).toBeCloseTo(1 - s(60), 12); // 800 · 0,5 · (1 − 0,5 · tan 60°) / 400
    expect(r.admittedInCold).toBeCloseTo(0.133975, 6);
    expect(r.byClass.neutral.incident).toBeCloseTo((200 * c40) / 2, 9);
    expect(r.missingDni).toBe(1);
    expect(r.byClass.hot.hours).toBe(2); // H6 sem DNI fica fora
  });

  it('DNI constante enquanto o sol está acima do horizonte: divide pela fração da hora com sol', () => {
    const up = sunUpFraction(SUN);
    expect(up[H5]).toBe(0.5);
    expect(up[H1]).toBe(1);
    const alt = hourlyBeam(shading, ROWS, DNI, { within: 'whileSunUp', sunUp: up });
    expect(alt.incident[H5]).toBeCloseTo(200 * c40, 9);
    expect(alt.incident[H1]).toBeCloseTo(beam.incident[H1]!, 12);
  });

  it('comparação entre alternativas: sem proteção, brise de 0,5 m e de 1,0 m', () => {
    const rows = compareAlternatives(
      SUN,
      0,
      [
        { id: 'sem', scene: buildScene(WINDOW, []) },
        { id: 'brise-0,5', scene: brise(0.5) },
        { id: 'brise-1,0', scene: brise(1) },
      ],
      ROWS,
      DNI,
      CLASSES,
    );
    expect(rows.map((r) => r.id)).toEqual(['sem', 'brise-0,5', 'brise-1,0']);
    expect(rows[0]!.indicators.blockedInHot).toBe(0);
    expect(rows[0]!.indicators.admittedInCold).toBe(1);
    // Brise de 1,0 m: H1 a 45° fica toda à sombra; H2 também; H4: f_s = tan 30° / cos 45°.
    const hotIncident = (500 * (c45 + c30)) / 2 + 300 * c30 * Math.cos(45 * RAD);
    const hotBlocked = (500 * (c45 + c30 * t(30))) / 2 + 300 * s(30);
    expect(rows[2]!.indicators.blockedInHot).toBeCloseTo(hotBlocked / hotIncident, 12);
    expect(rows[2]!.indicators.admittedInCold).toBe(0);
    // Nenhuma domina outra: mais bloqueio no calor custa menos sol no frio.
    expect(rows.map((r) => r.dominated)).toEqual([false, false, false]);
  });
});

describe('alinhamento ao ano de referência', () => {
  it('29 de fevereiro usa a fração ensolarada de 28 de fevereiro', () => {
    const rows = calendar(true);
    const idx = referenceHourIndices(rows.month, rows.day, rows.hour);
    expect(idx.length).toBe(8784);
    const feb29h10 = Array.from(rows.month).findIndex((m, i) => m === 2 && rows.day[i] === 29) + 9;
    expect(idx[feb29h10]).toBe(hourIndex(2, 28, 10));
    expect(idx[feb29h10 + 24]).toBe(hourIndex(3, 1, 10));
    expect(idx[8783]).toBe(8759);
  });

  it('arquivo bissexto: a linha de 29/02 tem a sua DNI e a fração ensolarada de 28/02', () => {
    const rows = calendar(true);
    const dni = new Float64Array(8784);
    const i28 = hourIndex(2, 28, 13); // na tabela de 8784 linhas, 28/02 tem o mesmo índice
    dni[i28] = 100;
    dni[i28 + 24] = 300; // 29/02, 13 h
    const sun = samples({
      [i28]: [
        [45, 0],
        [45, 0],
      ],
    });
    const beam = hourlyBeam(hourlyShading(sun, buildScene(WINDOW, []), 0), rows, dni);
    expect(beam.incident[i28]).toBeCloseTo(100 * c45, 9);
    expect(beam.incident[i28 + 24]).toBeCloseTo(300 * c45, 9);
  });

  it('recusa DNI e linhas de tamanhos diferentes', () => {
    const shading = hourlyShading(SUN, brise(0.5), 0);
    expect(() => hourlyBeam(shading, ROWS, new Float64Array(10))).toThrow(RangeError);
  });
});

describe('dominância', () => {
  it('alternativa com os dois percentuais menores ou iguais (um menor) é dominada', () => {
    // Brise de 0,5 m elevado 0,5 m acima da verga: só faz sombra com perfil acima de 45°; nas horas
    // quentes deste caso (perfis de 30° a 45°) não bloqueia nada, e na fria (60°) tira sol.
    const rows = compareAlternatives(
      SUN,
      0,
      [
        { id: 'sem', scene: buildScene(WINDOW, []) },
        {
          id: 'alto',
          scene: buildScene(WINDOW, [
            {
              kind: 'overhang',
              depth: 0.5,
              above: 0.5,
              extendLeft: Infinity,
              extendRight: Infinity,
            },
          ]),
        },
      ],
      ROWS,
      DNI,
      CLASSES,
    );
    const [, b] = rows;
    expect(b!.indicators.blockedInHot).toBeCloseTo(0, 12);
    expect(b!.indicators.admittedInCold).toBeCloseTo(1 - (0.5 * t(60) - 0.5), 12);
    expect(rows.map((r) => r.dominated)).toEqual([false, true]);
  });
});
