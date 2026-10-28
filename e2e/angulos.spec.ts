import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';
import { svgColors } from './fixtures/pixels';
import { openStep } from './fixtures/steps';

// Onde se mede cada ângulo (decisão 0046, item d da 0044; problema 4 do piloto do F2.9: α, β, γ,
// AVS e AHS confusos). O desenho do ângulo em foco, nas duas referências, com o valor digitado:
// o ângulo é conferido pela geometria do próprio desenho (o raio contra a linha de referência) e
// pelos pixels (a peça e o sol aparecem onde a conta diz).

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

async function line(svg: Locator, part: string): Promise<Line> {
  return svg.locator(`[data-part="${part}"]`).evaluate((el) => ({
    x1: Number(el.getAttribute('x1')),
    y1: Number(el.getAttribute('y1')),
    x2: Number(el.getAttribute('x2')),
    y2: Number(el.getAttribute('y2')),
  }));
}

/** Ângulo, em graus, entre duas linhas que saem do mesmo ponto. */
function between(a: Line, b: Line): number {
  const ua = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
  const ub = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);
  const d = (Math.abs(ua - ub) * 180) / Math.PI;
  return d > 180 ? 360 - d : d;
}

/** Distância do ponto (x, y) à reta do raio, em unidades do desenho. */
function offRay(ray: Line, x: number, y: number): number {
  const dx = ray.x2 - ray.x1;
  const dy = ray.y2 - ray.y1;
  return Math.abs(dx * (y - ray.y1) - dy * (x - ray.x1)) / Math.hypot(dx, dy);
}

test('α no corte: o ângulo desenhado é o digitado, nas duas referências; pixels', async ({
  page,
}) => {
  await page.goto('./#local=recife&o=0&a1=50');
  await openStep(page, '3');
  const svg = page.getByTestId('angle-diagram-alpha');
  await expect(page.getByTestId('angle-view-alpha')).toHaveAttribute('aria-checked', 'true');
  await expect(svg).toHaveAttribute(
    'aria-label',
    'Corte da janela: α 50°, do peitoril até a aresta externa do brise, medido a partir do plano da fachada.',
  );
  // Interna: do plano da fachada (a vertical no corte) até o raio que passa pela aresta do brise.
  let ray = await line(svg, 'ray');
  expect(between(ray, await line(svg, 'reference'))).toBeCloseTo(50, 1);
  const device = await line(svg, 'device');
  expect(offRay(ray, device.x2, device.y2)).toBeLessThan(0.01);
  // Pixels: a peça (escura) na metade do brise e o sol (amarelo) na ponta do raio. No celular, o
  // desenho vai para o pé da tela, abaixo da carta fixa no topo.
  await svg.evaluate((el) => el.scrollIntoView({ block: 'end' }));
  const [onDevice, sun] = await svgColors(
    svg,
    [
      { x: (device.x1 + device.x2) / 2, y: device.y1 },
      { x: ray.x2, y: ray.y2 },
    ],
    1,
  );
  expect(Math.max(...onDevice!)).toBeLessThan(110);
  expect(sun![0]).toBeGreaterThan(180);
  expect(sun![2]).toBeLessThan(80);

  // Externa: o mesmo 50 passa a ser medido da horizontal; o brise fica mais curto.
  await page.getByRole('radio', { name: 'Externa' }).click();
  // O título fica para o leitor de tela; à vista, a legenda do desenho (decisão 0050).
  await expect(
    page.getByRole('heading', { name: 'Onde se mede cada ângulo (referência externa)' }),
  ).toBeAttached();
  await expect(page.getByTestId('angle-caption')).toHaveText('α no corte, referência externa');
  await expect(svg).toHaveAttribute('aria-label', /α 50°.*a partir da horizontal\.$/);
  ray = await line(svg, 'ray');
  const reference = await line(svg, 'reference');
  expect(reference.y2).toBe(reference.y1);
  expect(between(ray, reference)).toBeCloseTo(50, 1);
  const shorter = await line(svg, 'device');
  expect(shorter.x2).toBeLessThan(device.x2);
  expect(offRay(ray, shorter.x2, shorter.y2)).toBeLessThan(0.01);
});

test('β na planta e γ na vista: o desenho segue o campo em foco e o valor digitado', async ({
  page,
}) => {
  await page.goto('./#local=recife&o=0');
  await openStep(page, '3');
  // β à direita: o campo em foco troca o desenho para a planta.
  await page.getByTestId('angle-bd1').fill('30');
  await expect(page.getByTestId('angle-view-beta')).toHaveAttribute('aria-checked', 'true');
  const plan = page.getByTestId('angle-diagram-beta');
  let ray = await line(plan, 'ray-right');
  // Interna: do plano da fachada (a horizontal na planta) até o raio pela ponta da aleta.
  expect(between(ray, { x1: ray.x1, y1: ray.y1, x2: ray.x1 + 10, y2: ray.y1 })).toBeCloseTo(30, 1);
  const fin = await line(plan, 'device-right');
  expect(offRay(ray, fin.x2, fin.y2)).toBeLessThan(0.01);
  // O raio sai da aresta oposta da janela.
  expect(ray.x1).toBeLessThan(fin.x1);
  // β à esquerda também desenhado, com o ângulo dele.
  await page.getByTestId('angle-be1').fill('20');
  const leftRay = await line(plan, 'ray-left');
  expect(
    between(leftRay, { x1: leftRay.x1, y1: leftRay.y1, x2: leftRay.x1 - 10, y2: leftRay.y1 }),
  ).toBeCloseTo(20, 1);
  // Externa: a partir da normal da fachada.
  await page.getByRole('radio', { name: 'Externa' }).click();
  ray = await line(plan, 'ray-right');
  expect(between(ray, await line(plan, 'reference-right'))).toBeCloseTo(30, 1);

  // γ à direita: a vista de dentro para fora; na externa, a partir da horizontal.
  await page.getByTestId('angle-gd1').fill('60');
  await expect(page.getByTestId('angle-view-gamma')).toHaveAttribute('aria-checked', 'true');
  const view = page.getByTestId('angle-diagram-gamma');
  ray = await line(view, 'ray-right');
  const horizontal = await line(view, 'reference-right');
  expect(horizontal.y2).toBe(horizontal.y1);
  expect(between(ray, horizontal)).toBeCloseTo(60, 1);
  await page.getByRole('radio', { name: 'Interna' }).click();
  ray = await line(view, 'ray-right');
  const vertical = await line(view, 'reference-right');
  expect(vertical.x2).toBe(vertical.x1);
  expect(between(ray, vertical)).toBeCloseTo(60, 1);
  await expect(view).toHaveAttribute('aria-label', /a partir da vertical\.$/);
});

test('campo vazio: exemplo de 45° mais claro, sem número; AVS e AHS só na ajuda', async ({
  page,
}) => {
  await page.goto('./#local=recife&o=0');
  await openStep(page, '3');
  const svg = page.getByTestId('angle-diagram-alpha');
  await expect(svg.locator('.device.example')).toHaveCount(1);
  await expect(svg.locator('.angle-label')).toHaveText('α');
  expect(between(await line(svg, 'ray'), await line(svg, 'reference'))).toBeCloseTo(45, 1);
  await expect(page.getByTestId('protection-panel')).not.toContainText('AVS');
  await expect(page.getByTestId('protection-panel')).not.toContainText('AHS');
  await page.getByTestId('help-open').click();
  await page.getByRole('dialog').getByRole('tab', { name: 'Glossário' }).click();
  await expect(page.getByRole('dialog')).toContainText('AVS (ângulo vertical de sombreamento)');
  await expect(page.getByRole('dialog')).toContainText('AHS (ângulo horizontal de sombreamento)');
});

test('teclado: setas trocam o desenho; axe sem violações', async ({ page }) => {
  await page.goto('./#local=recife&o=0&a1=40&bd1=30&gd1=50');
  await openStep(page, '3');
  const alpha = page.getByTestId('angle-view-alpha');
  await alpha.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('angle-view-beta')).toBeFocused();
  await expect(page.getByTestId('angle-diagram-beta')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('angle-diagram-gamma')).toBeVisible();
  const result = await new AxeBuilder({ page })
    .include('[data-step="3"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('celular: o desenho cabe na tela, legível, sem rolagem horizontal', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'só no celular');
  await page.goto('./#local=recife&o=0&a1=50');
  await openStep(page, '3');
  const box = (await page.getByTestId('angle-diagram-alpha').boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(150);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
});
