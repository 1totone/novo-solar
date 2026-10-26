// Viés da faixa adaptativa sobre o ar externo (revisão da decisão 0020): classes das horas com sol na
// janela, contadas e ponderadas pela radiação direta incidente sem proteção (DNI · cos θ), em três
// cidades e quatro fachadas, com a faixa adaptativa sem ganhos (o padrão da decisão 0020, trocado
// pelo limiar de 20 °C na decisão 0024) e com as alternativas plausíveis:
// - acréscimo da temperatura interna por ganhos de 2 °C e 4 °C (ordem de grandeza medida em casas
//   ocupadas e ventiladas naturalmente em Florianópolis e Curitiba; Papst de Abreu, 2004);
// - limiar de sombreamento de 20 °C (Lamberts, Dutra e Pereira, 2014, p. 91 e 135).
// Com VIES_TABELA=1, imprime a tabela do relatório do F3.4 (seção 4).
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  classifyHours,
  ADAPTIVE_DEFAULT,
  HOUR_CLASS,
  type ClassificationMethod,
} from '../../src/core/comfort/classification';
import { parseEpw } from '../../src/core/epw/parseEpw';
import { buildScene, type Device } from '../../src/core/shading/geometry';
import { hourlyShading, sunSamples } from '../../src/core/shading/hourly';
import {
  beamIndicators,
  hourlyBeam,
  referenceHourIndices,
} from '../../src/core/shading/indicators';

const root = fileURLToPath(new URL('../../', import.meta.url));
const CITIES = [
  ['Florianópolis', 'BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw'],
  ['Brasília', 'BRA_DF_Brasilia-Kubitschek.Intl.AP.833780_TMYx.2011-2025.epw'],
  ['Porto Alegre', 'BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_TMYx.2011-2025.epw'],
] as const;
const available = CITIES.every(([, f]) => existsSync(`${root}.cache/epw/${f}`));
const FACADES = [
  ['N', 0],
  ['L', 90],
  ['S', 180],
  ['O', 270],
] as const;

const adaptive = ADAPTIVE_DEFAULT;
const VARIANTS: [string, ClassificationMethod][] = [
  ['faixa adaptativa', ADAPTIVE_DEFAULT],
  ['faixa adaptativa, ΔT = 2 °C', { ...adaptive, gains: 2 }],
  ['faixa adaptativa, ΔT = 4 °C', { ...adaptive, gains: 4 }],
  ['limiar de 20 °C (padrão)', { kind: 'thresholds', cold: 20, hot: 20 }],
];

interface Shares {
  hours: number;
  hot: number;
  neutral: number;
  cold: number;
  hotRad: number;
  neutralRad: number;
  coldRad: number;
}

/** Percentuais das classes nas horas com sol na janela (contagem e radiação). */
function shares(classes: Int8Array, sunlit: number[], rad: (r: number) => number): Shares {
  const n = { hot: 0, neutral: 0, cold: 0 };
  const e = { hot: 0, neutral: 0, cold: 0 };
  let total = 0;
  for (const r of sunlit) {
    const c = classes[r];
    const key = c === HOUR_CLASS.hot ? 'hot' : c === HOUR_CLASS.cold ? 'cold' : 'neutral';
    n[key]++;
    e[key] += rad(r);
    total += rad(r);
  }
  const h = sunlit.length;
  return {
    hours: h,
    hot: n.hot / h,
    neutral: n.neutral / h,
    cold: n.cold / h,
    hotRad: e.hot / total,
    neutralRad: e.neutral / total,
    coldRad: e.cold / total,
  };
}

const pct = (v: number) => `${Math.round(100 * v)}%`;
const result = new Map<string, Shares>();
const brise = new Map<string, { blocked: number | null; admitted: number | null }>();

describe.skipIf(!available)('viés da faixa adaptativa sobre o ar externo', () => {
  for (const [name, file] of CITIES) {
    const epw = parseEpw(readFileSync(`${root}.cache/epw/${file}`, 'utf-8'));
    const { latitude, longitude, elevation, timeZone } = epw.location;
    const samples = sunSamples({ latitude, longitude, elevation, timeZone });
    const index = referenceHourIndices(epw.month, epw.day, epw.hour);
    const classes = VARIANTS.map(([, m]) => classifyHours(epw.fields.dryBulb, m).classes);
    for (const [facade, orientation] of FACADES) {
      it(`${name}, fachada ${facade}`, () => {
        const bare = hourlyShading(samples, buildScene({ width: 1.2, height: 1 }, []), orientation);
        const beam = hourlyBeam(bare, epw, epw.fields.directNormal);
        const sunlit: number[] = [];
        for (let r = 0; r < epw.hours; r++) if (bare.exposure[index[r]!]! > 0) sunlit.push(r);
        const rad = (r: number) => (Number.isNaN(beam.incident[r]!) ? 0 : beam.incident[r]!);
        VARIANTS.forEach(([label], k) => {
          const s = shares(classes[k]!, sunlit, rad);
          result.set(`${name}|${facade}|${label}`, s);
          expect(s.hot + s.neutral + s.cold).toBeCloseTo(1, 12);
        });
        if (facade === 'N') {
          // Brise de 0,60 m na verga, prolongamentos de 0,30 m, janela de 1,20 × 1,00 m.
          const device: Device = {
            kind: 'overhang',
            depth: 0.6,
            above: 0,
            extendLeft: 0.3,
            extendRight: 0.3,
          };
          const shaded = hourlyShading(
            samples,
            buildScene({ width: 1.2, height: 1 }, [device]),
            orientation,
          );
          const withBrise = hourlyBeam(shaded, epw, epw.fields.directNormal);
          VARIANTS.forEach(([label], k) => {
            const ind = beamIndicators(withBrise, classes[k]!);
            brise.set(`${name}|${label}`, {
              blocked: ind.blockedInHot,
              admitted: ind.admittedInCold,
            });
          });
        }
      });
    }
  }

  it('a faixa adaptativa deixa como frias horas de sol que, com ganhos ou pelo limiar de 20 °C, não são', () => {
    const get = (city: string, facade: string, label: string) =>
      result.get(`${city}|${facade}|${label}`)!;
    // Florianópolis, Norte: com a faixa adaptativa, 37% das horas com sol (32% da radiação) são frias e só 6%
    // quentes; com ΔT = 4 °C, as frias caem para 8% e as quentes sobem para 34%.
    const flnDefault = get('Florianópolis', 'N', VARIANTS[0]![0]);
    expect(flnDefault.cold).toBeGreaterThan(0.35);
    expect(flnDefault.coldRad).toBeGreaterThan(0.3);
    expect(flnDefault.hot).toBeLessThan(0.08);
    const fln4 = get('Florianópolis', 'N', VARIANTS[2]![0]);
    expect(fln4.cold).toBeLessThan(0.1);
    expect(fln4.hot).toBeGreaterThan(0.3);
    const fln20 = get('Florianópolis', 'N', VARIANTS[3]![0]);
    expect(fln20.hotRad).toBeGreaterThan(0.65);
    // Em todas as cidades e fachadas, ΔT > 0 só aumenta as quentes e diminui as frias.
    for (const [city] of CITIES) {
      for (const [facade] of FACADES) {
        const d = get(city, facade, VARIANTS[0]![0]);
        const g2 = get(city, facade, VARIANTS[1]![0]);
        const g4 = get(city, facade, VARIANTS[2]![0]);
        expect(g2.hot).toBeGreaterThanOrEqual(d.hot);
        expect(g4.hot).toBeGreaterThanOrEqual(g2.hot);
        expect(g2.cold).toBeLessThanOrEqual(d.cold);
        expect(g4.cold).toBeLessThanOrEqual(g2.cold);
      }
    }
    if (process.env.VIES_TABELA) {
      const lines = [
        '| Cidade | Fachada | Horas com sol | Classificação | Quentes | Neutras | Frias |',
      ];
      for (const [city] of CITIES) {
        for (const [facade] of FACADES) {
          for (const [label] of VARIANTS) {
            const s = get(city, facade, label);
            lines.push(
              `| ${city} | ${facade} | ${s.hours} | ${label} | ${pct(s.hot)} (${pct(s.hotRad)}) | ${pct(s.neutral)} (${pct(s.neutralRad)}) | ${pct(s.cold)} (${pct(s.coldRad)}) |`,
            );
          }
        }
      }
      lines.push('', '| Cidade | Classificação | Bloqueada nas quentes | Admitida nas frias |');
      for (const [city] of CITIES) {
        for (const [label] of VARIANTS) {
          const b = brise.get(`${city}|${label}`)!;
          const f = (v: number | null) => (v === null ? 'indefinido' : pct(v));
          lines.push(`| ${city} | ${label} | ${f(b.blocked)} | ${f(b.admitted)} |`);
        }
      }
      console.log(lines.join('\n'));
    }
  });
});
