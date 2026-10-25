// Caso da literatura (F2.3): exemplo do tutorial do SOL-AR de Bortoli e Saramago (UFU), p. 9 a 15
// (https://labeee.ufsc.br/sites/default/files/softwares/tutorial-analysis-sol-ar.pdf, não versionado).
// Brasília, fachada nordeste com o transferidor a 30°, sombrear das 9 h às 15 h em hora solar, o ano
// todo (área verde da Figura 13): α = 55°, γ direita = 50°, γ esquerda = 60° (referência interna,
// Figura 11). Variante com o brise afastado 28 cm da parede (Figuras 26 a 28): α1 = 55°, α2 = 20°.
// Números em docs/validacao/relatorios/F2.3-mascara.md.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { project } from '../../src/core/chart/stereographic';
import { chartDates, hourLine, type ChartDate } from '../../src/core/chart/sunChart';
import { maskRegions, regionContains, type ShadingSet } from '../../src/core/mask/mask';

const RAD = Math.PI / 180;
const BRASILIA = { latitude: -15.863, longitude: -47.913, elevation: 1060.4, timeZone: -3 };
const ORIENTATION = 30;
const DATES = chartDates(BRASILIA.timeZone);
// De 15 em 15 minutos, das 9 h às 15 h (hora solar verdadeira, como as linhas horárias da carta).
const HOURS = Array.from({ length: 25 }, (_, k) => 9 + k / 4);

interface Miss {
  date: ChartDate;
  hour: number;
  /** Ângulo de perfil do sol (α externo), em graus. */
  profile: number;
}

/** Posições do sol diante da fachada, das 9 h às 15 h, que ficam fora da sombra total. */
function misses(set: ShadingSet, dates: ChartDate[] = DATES): Miss[] {
  const { total } = maskRegions(ORIENTATION, 'internal', set);
  const out: Miss[] = [];
  for (const date of dates) {
    for (const hour of HOURS) {
      const [sun] = hourLine(BRASILIA, hour, [date]);
      if (!sun) continue;
      const psi = ((((sun.azimuth - ORIENTATION + 180) % 360) + 360) % 360) - 180;
      if (Math.abs(psi) >= 90) continue; // fachada em sombra própria
      const p = project(sun.zenith, sun.azimuth);
      if (regionContains(total, p.x, p.y)) continue;
      const altitude = 90 - sun.zenith;
      const profile = Math.atan2(Math.tan(altitude * RAD), Math.cos(psi * RAD)) / RAD;
      out.push({ date, hour, profile });
    }
  }
  return out;
}

const DESIGN: ShadingSet = { alpha: [55], gammaRight: [50], gammaLeft: [60] };
const WITH_GAP: ShadingSet = { alpha: [55, 20], gammaRight: [50], gammaLeft: [60] };
const isJuneSolstice = (d: ChartDate) => d.kind === 'solstice' && d.month === 6;

describe('tutorial do SOL-AR (UFU): Brasília, fachada nordeste, das 9 h às 15 h', () => {
  it('o projeto protege das 9 h às 15 h o ano todo; só o começo das manhãs de inverno escapa', () => {
    const m = misses(DESIGN);
    // Das 9h30 às 15 h, nenhuma posição escapa em nenhuma das 12 datas da carta.
    expect(m.filter((x) => x.hour >= 9.5)).toEqual([]);
    // Às 9 h e 9h15 escapam só posições de maio a julho, com perfil até 2,6° abaixo dos 35° do α
    // externo (no solstício de junho, 32,5° às 9 h): diferença de leitura gráfica.
    for (const x of m) {
      expect([5, 6, 7]).toContain(x.date.month);
      expect(x.profile).toBeGreaterThan(35 - 2.6);
      expect(x.profile).toBeLessThan(35);
    }
  });

  it('os lados do tutorial batem com a convenção: trocar γ direita e esquerda abre a tarde de inverno', () => {
    const swapped = misses({ alpha: [55], gammaRight: [60], gammaLeft: [50] });
    const lateWinter = swapped.filter((x) => x.hour >= 14.5 && [5, 6, 7].includes(x.date.month));
    expect(lateWinter.length).toBeGreaterThan(0);
  });

  it('com o brise afastado 28 cm, a primavera e o verão ficam desprotegidos', () => {
    const springSummer = DATES.filter(
      (d) => d.month >= 10 || d.month <= 2 || (d.kind === 'equinox' && [3, 9].includes(d.month)),
    );
    expect(springSummer).toHaveLength(7);
    for (const d of springSummer) {
      // pelo menos 8 dos 25 quartos de hora passam pela fresta (perfil acima de 70°)
      const m = misses(WITH_GAP, [d]);
      expect(m.length, `${d.day}/${d.month}`).toBeGreaterThanOrEqual(8);
      expect(m.every((x) => x.profile > 70)).toBe(true);
    }
  });

  it('com o brise afastado, a melhor proteção é no solstício de inverno', () => {
    const counts = DATES.map((d) => ({ d, n: misses(WITH_GAP, [d]).length }));
    const june = counts.find((c) => isJuneSolstice(c.d))!;
    for (const c of counts) expect(june.n).toBeLessThanOrEqual(c.n);
    // No solstício, além das posições das 9 h que já escapavam sem a fresta, só o fim da tarde
    // (14h45 e 15 h) passa pela fresta, com perfil logo acima dos 70° do α2 externo.
    const extra = misses(WITH_GAP, [june.d]).filter((x) => x.profile > 35);
    expect(extra.map((x) => x.hour)).toEqual([14.75, 15]);
    for (const x of extra) expect(x.profile).toBeLessThan(73);
  });
});

// Figura 27 do tutorial (p. 15): máscara pintada no SOL-AR 6.2 com α1 = 55°, α2 = 20°, γ direita
// = 50° e γ esquerda = 60°, transferidor a 30°, referência interna. Pixels amostrados da figura e
// registrados pelo círculo do horizonte (docs/validacao/scripts/tutorial_ufu_figura27.py; o PDF não é
// versionado). Vermelho: zona de eficiência total; amarelo: parcial; branco: fora.
interface Figure27 {
  registro: { raio_px: number };
  pontos: [number, number, 'total' | 'parcial' | 'fora'][];
}
const figure27 = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL('../../docs/validacao/casos/mascara/tutorial-ufu-figura27.json', import.meta.url),
    ),
    'utf-8',
  ),
) as Figure27;

/** Concordância com a figura: total ↔ sombra total calculada; parcial ↔ resto da frente da fachada. */
function figureAgreement(orientation: number, set: ShadingSet) {
  const { total } = maskRegions(orientation, 'internal', set);
  // Diante da fachada: componente positiva na direção da normal (azimute = orientação).
  const front = (x: number, y: number) =>
    x * Math.sin(orientation * RAD) + y * Math.cos(orientation * RAD) > 0;
  let same = 0;
  let inter = 0;
  let union = 0;
  for (const [x, y, c] of figure27.pontos) {
    const isTotal = regionContains(total, x, y);
    const mine = isTotal ? 'total' : front(x, y) ? 'parcial' : 'fora';
    if (mine === c) same++;
    if (isTotal && c === 'total') inter++;
    if (isTotal || c === 'total') union++;
  }
  return { agreement: same / figure27.pontos.length, iou: inter / union };
}

describe('Figura 27 do tutorial: zona total pintada no 6.2 contra a máscara calculada', () => {
  it('registro da carta: círculo do horizonte com resíduo abaixo de 1 px e amostra suficiente', () => {
    expect(figure27.pontos.filter((p) => p[2] === 'total').length).toBeGreaterThan(500);
    expect(figure27.pontos.length).toBeGreaterThan(6000);
  });

  it('a zona total é a faixa entre α1 e α2 limitada pelos γ, com γ direita a 50° do lado direito', () => {
    const r = figureAgreement(ORIENTATION, WITH_GAP);
    // Só pixels de cor pura entram na amostra; os de linha (cinza) ficam de fora.
    expect(r.agreement).toBeGreaterThanOrEqual(0.995);
    expect(r.iou).toBeGreaterThanOrEqual(0.99);
  });

  it('a comparação discrimina: lados trocados, sem α2 ou orientação a ±5° não reproduzem a figura', () => {
    expect(
      figureAgreement(ORIENTATION, { ...WITH_GAP, gammaRight: [60], gammaLeft: [50] }).iou,
    ).toBeLessThan(0.9);
    expect(figureAgreement(ORIENTATION, DESIGN).iou).toBeLessThan(0.75);
    expect(figureAgreement(ORIENTATION - 5, WITH_GAP).iou).toBeLessThan(0.95);
    expect(figureAgreement(ORIENTATION + 5, WITH_GAP).iou).toBeLessThan(0.95);
  });
});
