import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MAP_COLORS } from '../../src/ui/annual/mapData';
import { CLASS_COLORS } from '../../src/ui/effect/classColors';
import { FREQUENCY_COLORS, QUANTITY_COLORS } from '../../src/ui/overlay/palettes';
import { SPEED_COLORS } from '../../src/ui/wind/colors';
import { contrastRatio, deltaE, oklch, parseColor, type Cvd } from './cores';

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../src/ui/${path}`, import.meta.url)), 'utf-8');
const stylesCss = read('styles.css');
const sunChartCss = read('chart/SunChart.css');

// Paleta da carta e dos gráficos (F4.6, decisão 0030): contraste contra o branco e separação das
// cores para quem tem daltonismo (protanopia e deuteranopia simuladas por Machado, Oliveira e
// Fernandes, 2009; ΔE em OKLab ×100, alvo 8, e 15 na visão normal), como no validador de paletas.

const WHITE = parseColor('#ffffff');
const root = /:root\s*\{([^}]*)\}/.exec(stylesCss)![1]!;
const token = (name: string) => {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(root);
  if (!m) throw new Error(`token --${name} ausente em styles.css`);
  return m[1]!.trim();
};
const color = (name: string) => parseColor(token(name));
const cvd = (a: string, b: string) =>
  Math.min(...(['protan', 'deutan'] as Cvd[]).map((k) => deltaE(parseColor(a), parseColor(b), k)));

/** Linhas que podem aparecer juntas na carta, cada uma com a sua cor. */
const LINES: Record<string, string> = {
  'trajetória do sol': token('color-sun'),
  'linhas horárias': token('color-accent'),
  transferidor: token('chart-protractor'),
  'linhas em hora legal': token('chart-legal'),
  'curvas da proteção': token('chart-contour'),
  'contorno do período': token('chart-period'),
  'desenho à mão': token('color-text'),
};

describe('funções de conferência', () => {
  it('contraste, composição com transparência e distância de cor', () => {
    expect(contrastRatio(parseColor('#000000'), WHITE)).toBeCloseTo(21, 9);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 12);
    expect(parseColor('rgb(0 0 0 / 50%)')).toEqual([0.5, 0.5, 0.5]);
    expect(deltaE(WHITE, WHITE)).toBe(0);
    // Vermelho e verde puros quase se confundem na deuteranopia, não na visão normal.
    const [red, green] = [parseColor('#d00000'), parseColor('#007000')];
    expect(deltaE(red, green)).toBeGreaterThan(30);
    expect(deltaE(red, green, 'deutan')).toBeLessThan(deltaE(red, green) / 2);
  });
});

describe('carta: contraste', () => {
  it('grade com pelo menos 3:1 sobre o branco (achado 17 da revisão do F2.9)', () => {
    expect(sunChartCss).toMatch(
      /\.sun-chart \.altitude,\s*\.sun-chart \.azimuth \{\s*stroke: var\(--chart-grid\)/,
    );
    expect(contrastRatio(color('chart-grid'), WHITE)).toBeGreaterThanOrEqual(3);
  });

  it('linhas com pelo menos 3:1 e rótulos com pelo menos 4,5:1 sobre o branco', () => {
    for (const [name, c] of Object.entries(LINES)) {
      expect(contrastRatio(parseColor(c), WHITE), name).toBeGreaterThanOrEqual(3);
    }
    for (const name of [
      'color-sun-text',
      'color-accent',
      'chart-protractor-text',
      'chart-legal',
      'chart-contour-text',
      'color-text',
    ]) {
      expect(contrastRatio(color(name), WHITE), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('carta: cores distintas, também com daltonismo', () => {
  it('cada par de linhas: ΔE de pelo menos 15 na visão normal e 8 na protanopia e na deuteranopia', () => {
    const names = Object.keys(LINES);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const [a, b] = [LINES[names[i]!]!, LINES[names[j]!]!];
        const pair = `${names[i]} × ${names[j]}`;
        expect(deltaE(parseColor(a), parseColor(b)), pair).toBeGreaterThanOrEqual(15);
        expect(cvd(a, b), pair).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('máscara: total e parcial distintas no preenchimento e na hachura', () => {
    expect(cvd(token('mask-total'), token('mask-partial'))).toBeGreaterThanOrEqual(8);
    expect(cvd(token('mask-total-hatch'), token('mask-partial-hatch'))).toBeGreaterThanOrEqual(8);
  });
});

/** Rampa sequencial: um matiz, luminosidade caindo em passos visíveis (≥ 0,06 em OKLCH). */
function expectSequential(ramp: readonly string[], label: string) {
  const lch = ramp.map((c) => oklch(parseColor(c)));
  for (let i = 1; i < lch.length; i++) {
    expect(lch[i - 1]![0] - lch[i]![0], `${label}: passo ${i}`).toBeGreaterThanOrEqual(0.06);
  }
  const hues = lch.map((c) => c[2]);
  const spread = Math.max(...hues) - Math.min(...hues);
  expect(Math.min(spread, 360 - spread), `${label}: matiz`).toBeLessThanOrEqual(10);
}

describe('rampas dos dados, das classes, do mapa e do vento', () => {
  it('sequenciais: um matiz, do claro ao escuro', () => {
    expectSequential(QUANTITY_COLORS.relativeHumidity, 'umidade');
    expectSequential(QUANTITY_COLORS.globalHorizontal, 'radiação');
    expectSequential(FREQUENCY_COLORS, 'frequência');
    expectSequential(MAP_COLORS, 'mapa do ano');
    expectSequential(SPEED_COLORS, 'velocidade do vento');
  });

  it('temperatura: divergente, azul e vermelho com cinza no meio; os dois braços distintos', () => {
    const d = QUANTITY_COLORS.dryBulb;
    expect(d).toHaveLength(5);
    expect(oklch(parseColor(d[2]!))[1]).toBeLessThan(0.02);
    expect(cvd(d[0]!, d[4]!)).toBeGreaterThanOrEqual(8);
    expect(cvd(d[1]!, d[3]!)).toBeGreaterThanOrEqual(8);
    expect(Math.abs(oklch(parseColor(d[0]!))[0] - oklch(parseColor(d[4]!))[0])).toBeLessThan(0.08);
  });

  it('classes das horas: frias e quentes distintas, neutras em cinza', () => {
    expect(cvd(CLASS_COLORS.cold, CLASS_COLORS.hot)).toBeGreaterThanOrEqual(8);
    expect(oklch(parseColor(CLASS_COLORS.neutral))[1]).toBeLessThan(0.02);
  });
});
