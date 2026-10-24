// Caso da literatura (F2.3): exemplo do tutorial do SOL-AR de Bortoli e Saramago (UFU), p. 13 a 15.
// Brasília, fachada nordeste com o transferidor a 30°, sombrear das 9 h às 15 h (hora solar):
// α = 55°, γ direita = 50°, γ esquerda = 60° (referência interna, como na Figura 11). Variante com
// o brise afastado 28 cm da parede: α1 = 55°, α2 = 20°. Verificação qualitativa, porque o tutorial
// não dá a geometria nem a hora a hora; números em docs/validacao/relatorios/F2.3-mascara.md.
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
