import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { svgColors } from './fixtures/pixels';

// F3.6: dimensionamento pelo período no passo 6. Exemplo de Brasília do tutorial do SOL-AR da UFU
// (Bortoli e Saramago): fachada a 30°, janela de 2,00 × 1,00 m com o vidro 15 cm atrás da face da
// parede, o ano todo, das 9 às 15 h em hora solar. Os ângulos exatos (relatório do F3.6, seção 3,
// conferidos com o pvlib no núcleo) são α 57,52°, γ direita 42,20° e γ esquerda 58,53°.
const TUTORIAL =
  '#local=brasilia&o=30&tr=0&cs=0&jl=2&ja=1&jr=0%2C15&dpi=1%2F1&dpf=31%2F12&dhi=9&dhf=15';

async function results(page: Page, hash: string) {
  await page.goto(`./${hash}`);
  const panel = page.getByTestId('sizing-section');
  await expect(page.getByTestId('sizing-results')).toBeVisible({ timeout: 30000 });
  return panel;
}

const angleRow = (page: Page, a: string) =>
  page.getByTestId('sizing-angles').locator(`tr[data-angle="${a}"]`);

/** Menor distância de um ponto a uma polilinha "x,y x,y ..." do SVG. */
function distanceToPolyline(points: string, x: number, y: number) {
  const pts = points
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number) as [number, number]);
  let min = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]!;
    const [bx, by] = pts[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    min = Math.min(min, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return min;
}

test.describe('passo 6: dimensionamento pelo período (F3.6)', () => {
  test('exemplo de Brasília do tutorial: ângulos, sol que os determina e dimensões do brise', async ({
    page,
  }) => {
    const workers: string[] = [];
    page.on('worker', (w) => workers.push(w.url()));
    const panel = await results(page, TUTORIAL);
    expect(workers.some((u) => /sizing\.worker/.test(u))).toBe(true);
    await expect(panel).toContainText('19712 das 26645 posições do sol');
    await expect(angleRow(page, 'alpha')).toContainText('57,5° (32,5°)');
    await expect(angleRow(page, 'alpha')).toContainText('21/6, 9h00 solar');
    await expect(angleRow(page, 'gammaRight')).toContainText('42,2° (47,8°)');
    await expect(angleRow(page, 'gammaRight')).toContainText('21/12, 9h00 solar');
    await expect(angleRow(page, 'gammaLeft')).toContainText('58,5° (31,5°)');
    await expect(angleRow(page, 'gammaLeft')).toContainText('21/6, 15h00 solar');
    // D = H · cot α_ext − d = 1,572 − 0,15; prolongamentos H · cot γ_ext (sem desconto do recuo).
    await expect(page.getByTestId('sizing-overhang')).toContainText(
      'Profundidade de 1,42 m, 0,00 m acima da verga, afastamento de 0,00 m; prolongamentos de 1,63 m à esquerda e 0,91 m à direita.',
    );
    // Com o sol passando de frente para a janela, aleta nenhuma basta.
    await expect(page.getByTestId('sizing-fins')).toContainText('não serve para este período');
    await expect(page.getByTestId('sizing-use-all')).toHaveCount(0);
  });

  test('na carta: área verde do período e o sol que determina α na trajetória de 21/6, às 9 h', async ({
    page,
  }) => {
    await results(page, TUTORIAL);
    const chart = page.getByTestId('sun-chart');
    await expect(page.getByTestId('period-layer')).toBeVisible();
    await expect(page.getByTestId('period-legend')).toContainText('período a sombrear');
    // Grade de pontos da carta, separados pelo contorno desenhado (com 0,03 de folga): os de
    // dentro ficam em maioria esverdeados (linhas da carta cobrem uma parte), os de fora, quase
    // nunca.
    await chart.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const d = (await page.getByTestId('period-area').getAttribute('d'))!;
    const poly = [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ]);
    const inPoly = (x: number, y: number) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i]!;
        const [xj, yj] = poly[j]!;
        if (yi! > y !== yj! > y && x < xj! + ((y - yj!) * (xi! - xj!)) / (yi! - yj!)) c = !c;
      }
      return c;
    };
    const edge = (x: number, y: number) =>
      Math.min(
        ...poly.map(([px, py], i) => {
          const [qx, qy] = poly[(i + 1) % poly.length]!;
          const dx = qx! - px!;
          const dy = qy! - py!;
          const t = Math.max(
            0,
            Math.min(1, ((x - px!) * dx + (y - py!) * dy) / (dx * dx + dy * dy || 1)),
          );
          return Math.hypot(x - px! - t * dx, y - py! - t * dy);
        }),
      );
    const inside: { x: number; y: number }[] = [];
    const outside: { x: number; y: number }[] = [];
    for (let x = -0.95; x <= 0.95; x += 0.05) {
      for (let y = -0.95; y <= 0.95; y += 0.05) {
        if (Math.hypot(x, y) > 0.95 || edge(x, y) < 0.03) continue;
        (inPoly(x, y) ? inside : outside).push({ x, y });
      }
    }
    expect(inside.length).toBeGreaterThan(40);
    const green = ([r, g, b]: [number, number, number]) => g - r > 12 && g - b > 8 && r > 150;
    const inColors = await svgColors(chart, inside, 0.4);
    const outColors = await svgColors(chart, outside, 0.4);
    const share = (cs: [number, number, number][]) => cs.filter(green).length / cs.length;
    expect(share(inColors)).toBeGreaterThan(0.6);
    expect(share(outColors)).toBeLessThan(0.05);

    // O ponto de α: na trajetória de 21/6 e na linha das 9 h solares da própria carta.
    const geo = await chart.evaluate((svg) => {
      const mark = Array.from(svg.querySelectorAll('[data-testid="period-mark"]')).find((g) =>
        (g.textContent ?? '').split(', ').includes('α'),
      )!;
      const c = mark.querySelector('circle')!;
      const june = svg.querySelector('.sun-path[data-date="21/6"]')!.getAttribute('points')!;
      const nine = Array.from(svg.querySelectorAll('[data-testid="hour-lines"] > g')).find(
        (g) => g.querySelector('text')?.textContent === '9',
      )!;
      return {
        x: Number(c.getAttribute('cx')),
        y: Number(c.getAttribute('cy')),
        june,
        nine: nine.querySelector('polyline')!.getAttribute('points')!,
      };
    });
    expect(distanceToPolyline(geo.june, geo.x, geo.y)).toBeLessThan(0.004);
    expect(distanceToPolyline(geo.nine, geo.x, geo.y)).toBeLessThan(0.004);
    const [mark] = await svgColors(chart, [{ x: geo.x, y: geo.y }], 0.4);
    expect(mark![0] + mark![1] + mark![2], `ponto: ${mark}`).toBeLessThan(200);
  });

  test('usar o brise: o mapa do ano fica 100% à sombra nas horas do período, em todos os meses', async ({
    page,
  }) => {
    await results(page, TUTORIAL);
    await page.getByTestId('sizing-use-overhang').click();
    // Medidas arredondadas para cima, ao centímetro.
    await expect(page).toHaveURL(/pc1=b_1%2C43_0_0_1%2C64_0%2C91/);
    const map = page.getByTestId('month-hour-map');
    await expect(map).toBeVisible({ timeout: 30000 });
    await expect(map).not.toHaveClass(/stale/);
    // Das 10 às 14 h legais (9h34 a 14h04 solares, conforme a equação do tempo): dentro do período.
    const classes = await map.evaluate((svg) =>
      Array.from(svg.querySelectorAll('rect[data-month]'))
        .filter((r) => {
          const h = Number(r.getAttribute('data-hour'));
          return h >= 11 && h <= 14;
        })
        .map(
          (r) =>
            `${r.getAttribute('data-month')}/${r.getAttribute('data-hour')}:${r.getAttribute('data-class')}`,
        ),
    );
    expect(classes).toHaveLength(48);
    const notFull = classes.filter((c) => !/:(5|sem-sol)$/.test(c));
    expect(notFull).toEqual([]);
    expect(classes.filter((c) => c.endsWith(':5')).length).toBeGreaterThan(20);
  });

  test('usar os ângulos no passo 3: α e γ na sombra total; aletas que não servem ficam de fora', async ({
    page,
  }) => {
    await results(page, TUTORIAL);
    await page.getByTestId('sizing-use-angles').click();
    await expect(page).toHaveURL(/a1=57%2C5/);
    await expect(page).toHaveURL(/gd1=42%2C2/);
    await expect(page).toHaveURL(/ge1=58%2C5/);
    expect(page.url()).not.toMatch(/bd1=|be1=|gad=|gae=/);
    await expect(page.getByTestId('mask-total')).toHaveCount(1);
  });

  test('hora legal, lâminas, campos inválidos, teclado e axe', async ({ page }) => {
    const panel = await results(page, `${TUTORIAL}&dtb=l&dbn=3`);
    await expect(angleRow(page, 'alpha')).not.toContainText('solar');
    await expect(panel.getByTestId('sizing-time-legal')).toBeChecked();
    // Lâminas: corda (D + d) / 3 = p · tan α_int, passo 1,00 / 3.
    await expect(page.getByTestId('sizing-louvers')).toContainText('3 lâminas horizontais de');
    await expect(page.getByTestId('sizing-louvers')).toContainText('a cada 0,33 m');
    await panel.getByTestId('sizing-start').fill('31/2');
    await expect(panel.getByTestId('sizing-start')).toHaveAttribute('aria-invalid', 'true');
    await expect(panel.getByRole('alert')).toContainText('Há campos inválidos');
    await panel.getByTestId('sizing-start').fill('21/10');
    await panel.getByTestId('sizing-time-solar').focus();
    await page.keyboard.press('Space');
    await expect(page).not.toHaveURL(/dtb=l/);
    await expect(page.getByTestId('sizing-results')).toBeVisible({ timeout: 30000 });
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
