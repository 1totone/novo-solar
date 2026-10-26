import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { svgColors } from './fixtures/pixels';

// F3.2: curvas de percentual, região de sombra total e máscara de um ponto na carta.
// Caso analítico (spec 07, seção 7.5): brise infinito rente à fachada, de profundidade D = 0,8 m,
// e = 0,1 m acima da verga, numa janela de 1,50 × 1,20 m. O percentual só depende do ângulo de
// perfil: a curva do nível p passa, no azimute relativo ψ, pela altura h com
// tan h = cos ψ · (e + p·H) / D; a máscara do centro da janela é a região do nível 50%.
// Fachada a 195° em Florianópolis, lida a ψ = 25° (azimute 220°): ali não passam trajetórias nem
// linhas de hora, as linhas de azimute da grade ficam a 10° e os rótulos das curvas (no meio de
// cada uma, sobre a normal) não cobrem a linha.
const ORIENTATION = 195;
const PSI = 25;
const AZIMUTH = ORIENTATION + PSI;
const H = 1.2;
const D = 0.8;
const E = 0.1;
const BRISE = `#local=florianopolis&o=${ORIENTATION}&tr=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i`;
const altitudeOf = (p: number) =>
  (Math.atan((Math.cos((PSI * Math.PI) / 180) * (E + p * H)) / D) * 180) / Math.PI;

type Rgb = [number, number, number];
/**
 * Azul-petróleo das curvas (#4493a1, decisão 0030), também misturado ao branco pela suavização da
 * borda (a linha de 1,25 px cobre uns 60% de um pixel): verde e azul acima do vermelho, na proporção
 * do azul-petróleo (0,85), longe da do azul das linhas de hora (#1f4e79, 0,52) e da grade cinza.
 */
const isContour = ([r, g, b]: Rgb) =>
  r < 175 && b - r > 35 && g - r > 30 && (g - r) / (b - r) > 0.7 && (g - r) / (b - r) < 1;
/** Preenchimento leve da sombra total (azul-petróleo a 20% sobre o branco: 218, 233, 236). */
const isFullShade = ([r, g, b]: Rgb) => r > 185 && r < 230 && g - r > 8 && b - r > 10;
const isWhite = ([r, g, b]: Rgb) => r > 245 && g > 245 && b > 245;
/** Violeta da hachura do ponto (#6f42c1). */
const isViolet = ([r, g, b]: Rgb) => b - g > 60 && r - g > 15;

/** Ponto da carta (coordenadas do SVG, raio 1) na direção dada. */
function chartPoint(altitude: number, azimuth: number) {
  const r = Math.tan(((90 - altitude) * Math.PI) / 360);
  const a = (azimuth * Math.PI) / 180;
  return { x: r * Math.sin(a), y: -r * Math.cos(a) };
}

/** Espera o worker entregar as curvas da geometria atual. */
async function waitForCurves(page: Page) {
  await expect(page.getByTestId('shading-layer')).toBeVisible();
  await expect(page.getByTestId('shading-layer')).not.toHaveAttribute('data-stale');
  await expect(page.getByTestId('shading-pending')).toHaveCount(0);
}

/** Pixels de 1 px numa linha horizontal da carta, de −n a n px em torno do ponto. */
async function rowColors(chart: Locator, altitude: number, azimuth: number, n = 6) {
  const box = (await chart.boundingBox())!;
  const unitPx = box.width / 2.64;
  const c = chartPoint(altitude, azimuth);
  const points = Array.from({ length: 2 * n + 1 }, (_, i) => ({
    x: c.x + (i - n) / unitPx,
    y: c.y,
  }));
  return svgColors(chart, points, 0.2);
}

/**
 * Pixel mais escuro num trecho do raio da carta de −n a n px em torno da direção (passos de
 * 0,5 px): acha a linha mesmo com a suavização da borda.
 */
async function darkestOnRadius(chart: Locator, altitude: number, azimuth: number, n: number) {
  const box = (await chart.boundingBox())!;
  const unitPx = box.width / 2.64;
  const c = chartPoint(altitude, azimuth);
  const len = Math.hypot(c.x, c.y);
  const points = Array.from({ length: 4 * n + 1 }, (_, i) => {
    const d = (i - 2 * n) / 2 / unitPx;
    return { x: c.x + (d * c.x) / len, y: c.y + (d * c.y) / len };
  });
  const colors = await svgColors(chart, points, 0.2);
  return colors.reduce((a, b) => (a[0] + a[1] + a[2] <= b[0] + b[1] + b[2] ? a : b));
}

test.describe('curvas e máscara de um ponto na carta (F3.2)', () => {
  test('brise infinito: cada curva passa pela altura analítica, com rótulo e estilo do nível', async ({
    page,
  }) => {
    const workers: string[] = [];
    page.on('worker', (w) => workers.push(w.url()));
    await page.goto(`./${BRISE}`);
    await waitForCurves(page);
    // O cálculo pesado roda num web worker próprio.
    expect(workers.some((u) => /shading\.worker/.test(u))).toBe(true);
    await expect(page.getByTestId('contour-label')).toHaveText(['0%', '25%', '50%', '75%', '100%']);
    await expect(page.locator('.contour.level-0')).toHaveCSS('stroke-dasharray', /\d/);
    await expect(page.getByTestId('shading-legend')).toContainText(
      'curvas do percentual da janela à sombra',
    );

    const chart = page.getByTestId('sun-chart');
    for (const p of [0.25, 0.5, 0.75, 1]) {
      const h = altitudeOf(p);
      const on = await darkestOnRadius(chart, h, AZIMUTH, 2);
      const below = await darkestOnRadius(chart, h - 3, AZIMUTH, 1);
      const above = await darkestOnRadius(chart, h + 3, AZIMUTH, 1);
      expect(isContour(on), `nível ${p} na altura ${h.toFixed(2)}°: ${on}`).toBe(true);
      expect(isContour(below), `nível ${p}, 3° abaixo: ${below}`).toBe(false);
      expect(isContour(above), `nível ${p}, 3° acima: ${above}`).toBe(false);
    }
    // A curva de 100% é mais grossa que as outras.
    const width = (level: number) =>
      page
        .locator(`.contour.level-${level}`)
        .first()
        .evaluate((el) => getComputedStyle(el).strokeWidth);
    expect(parseFloat(await width(100))).toBeGreaterThan(parseFloat(await width(50)));
  });

  test('região de 100% preenchida e máscara do centro da janela igual à região de 50%', async ({
    page,
  }) => {
    await page.goto(`./${BRISE}`);
    await waitForCurves(page);
    const chart = page.getByTestId('sun-chart');
    const [full, between] = await svgColors(chart, [
      chartPoint(altitudeOf(1) + 6, AZIMUTH),
      chartPoint(altitudeOf(1) - 3.5, AZIMUTH),
    ]);
    expect(isFullShade(full!), `dentro da curva de 100%: ${full}`).toBe(true);
    expect(isWhite(between!), `entre 75% e 100%: ${between}`).toBe(true);
    // Máscara do centro da janela: hachura acima da curva de 50% (e não abaixo dela).
    await page.getByTestId('shading-point-toggle').check();
    await expect(page).toHaveURL(/pt=0%2C75_0%2C6/);
    const inside = await rowColors(chart, altitudeOf(0.5) + 4, AZIMUTH);
    const outside = await rowColors(chart, altitudeOf(0.5) - 4, AZIMUTH);
    expect(inside.some(isViolet), `acima de 50%: ${inside.join(' ')}`).toBe(true);
    expect(outside.some(isViolet), `abaixo de 50%: ${outside.join(' ')}`).toBe(false);
    await expect(page.getByTestId('shading-legend')).toContainText(
      'ponto x = 0,75 m, z = 0,60 m à sombra',
    );
  });

  test('camadas: curvas ocultas pelo passo 6; ponto ligado, digitado e escolhido na vista', async ({
    page,
  }) => {
    await page.goto(`./${BRISE}`);
    await waitForCurves(page);
    const panel = page.getByTestId('geometry-panel');
    await expect(panel.locator('details')).toHaveAttribute('open');
    await page.getByTestId('shading-contours').uncheck();
    await expect(page).toHaveURL(/cs=0/);
    await expect(page.getByTestId('shading-layer')).toHaveCount(0);
    await expect(page.getByTestId('shading-legend')).toHaveCount(0);

    // Máscara de um ponto: começa no centro da janela.
    await page.getByTestId('shading-point-toggle').check();
    await expect(page).toHaveURL(/pt=0%2C75_0%2C6/);
    await expect(page.getByTestId('shading-point')).toHaveCount(1);
    // Sem curvas, nada fica "em cálculo": a máscara do ponto não aparece esmaecida.
    await expect(page.getByTestId('shading-layer')).not.toHaveAttribute('data-stale');
    await expect(page.getByTestId('shading-pending')).toHaveCount(0);
    await page.getByTestId('shading-point-z').fill('1,5');
    await expect(page.getByTestId('shading-point-z')).toHaveAttribute('aria-invalid', 'true');
    await expect(panel.getByRole('alert')).toContainText('O ponto precisa estar na janela');
    await expect(page.getByTestId('shading-point')).toHaveCount(0);

    // Clique na vista de fora: x da lateral esquerda de quem está dentro (X = W − x no desenho).
    const elevation = page.getByTestId('geometry-elevation');
    await elevation.evaluate((el) => el.scrollIntoView({ block: 'end' }));
    const target = await elevation.evaluate((el) => {
      const m = (el as SVGSVGElement).getScreenCTM()!;
      const p = new DOMPoint(0.3, -0.9).matrixTransform(m);
      return { x: p.x, y: p.y };
    });
    await page.mouse.click(target.x, target.y);
    await expect(page).toHaveURL(/pt=1%2C2_0%2C9/);
    await expect(page.getByTestId('shading-point-x')).toHaveValue('1,2');
    // Pixel mais violeta numa vizinhança de ±2 px do ponto (a cruz tem 2 px, com suavização).
    const pxPerM = await elevation.evaluate((el) => (el as SVGSVGElement).getScreenCTM()!.a);
    const near = await svgColors(
      elevation,
      Array.from({ length: 25 }, (_, i) => ({
        x: 0.3 + ((i % 5) - 2) / pxPerM,
        y: -0.9 + (Math.floor(i / 5) - 2) / pxPerM,
      })),
      0.2,
    );
    const marker = near.reduce((a, b) => (b[2] - b[1] > a[2] - a[1] ? b : a));
    expect(isViolet(marker), `marcador do ponto: ${marker}`).toBe(true);

    await page.getByTestId('shading-point-toggle').uncheck();
    expect(page.url()).not.toMatch(/pt=/);
    await page.getByTestId('shading-contours').check();
    expect(page.url()).not.toMatch(/cs=/);
    await waitForCurves(page);
  });

  test('sem peças nem recuo, nada na carta; a carta mostra "calculando" até o worker responder', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&jl=1%2C2&ja=1');
    await expect(page.getByTestId('geometry-panel')).toContainText('Adicione uma peça');
    await expect(page.getByTestId('shading-layer')).toHaveCount(0);
    await page.getByTestId('piece-add').click();
    await waitForCurves(page);
    await expect(page.getByTestId('contour-label').first()).toBeVisible();
  });

  test('impressão leva as curvas; "só o transferidor" as tira', async ({ page }) => {
    await page.goto(`./${BRISE}`);
    await waitForCurves(page);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByTestId('shading-layer')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('checkbox', { name: /Só o transferidor/ }).check();
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByTestId('shading-layer')).toBeHidden();
  });

  test('teclado e acessibilidade (axe) com as camadas ligadas', async ({ page }) => {
    await page.goto(`./${BRISE}&pt=0%2C75_0%2C6`);
    await waitForCurves(page);
    const contours = page.getByTestId('shading-contours');
    await contours.focus();
    await page.keyboard.press('Space');
    await expect(page).toHaveURL(/cs=0/);
    await page.keyboard.press('Space');
    await expect(page).not.toHaveURL(/cs=0/);
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('shading-point-toggle')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('shading-point-x')).toBeFocused();
    await waitForCurves(page);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
