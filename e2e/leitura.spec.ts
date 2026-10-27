import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { decodeScreenshot } from './fixtures/pixels';
import { openStep } from './fixtures/steps';

// Leitura de um ponto da carta (decisão 0045, spec 03, seção 3.6). Ponto de referência do pvlib
// (linhas-horarias.csv): Florianópolis, 21/04 às 9 h solares, ângulo zenital 58,913° e azimute
// 53,880°: altura 31°, azimute 54° (NE). A outra passagem, simétrica ao solstício de junho, é no fim
// de agosto. A posição na tela vem da fórmula da projeção estereográfica (spec 03, seção 3.1).
const REF = { zenith: 58.91268079, azimuth: 53.88044674 };

/** Posição na tela de uma direção do céu (projeção estereográfica). */
async function screenPoint(page: Page, zenith: number, azimuth: number) {
  return page.getByTestId('sun-chart').evaluate(
    (svg, { z, a }) => {
      const r = Math.tan((z * Math.PI) / 180 / 2);
      const p = new DOMPoint(
        r * Math.sin((a * Math.PI) / 180),
        -r * Math.cos((a * Math.PI) / 180),
      ).matrixTransform((svg as SVGSVGElement).getScreenCTM()!);
      return { x: p.x, y: p.y };
    },
    { z: zenith, a: azimuth },
  );
}

/** Pixels escuros (marca da leitura) num quadrado de 16 px em volta do ponto. */
async function darkPixels(page: Page, x: number, y: number) {
  const img = decodeScreenshot(
    await page.screenshot({ clip: { x: x - 8, y: y - 8, width: 16, height: 16 } }),
  );
  let n = 0;
  for (let i = 0; i < img.width * img.height; i++) {
    const k = i * img.channels;
    if (img.data[k]! + img.data[k + 1]! + img.data[k + 2]! < 3 * 80) n++;
  }
  return n;
}

test('mouse: altura, azimute, hora solar e as duas datas do ponto; a marca na tela', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'computador', 'mouse');
  await page.goto('./#local=florianopolis&tr=0');
  const chart = page.getByTestId('sun-chart');
  await chart.scrollIntoViewIfNeeded();
  const p = await screenPoint(page, REF.zenith, REF.azimuth);
  const before = await darkPixels(page, p.x, p.y);
  await page.mouse.move(p.x, p.y);
  const box = page.getByTestId('chart-readout');
  await expect(box).toBeVisible();
  await expect(page.getByTestId('readout-position')).toHaveText('Altura 31° · azimute 54° (NE)');
  await expect(page.getByTestId('readout-sun')).toHaveText(
    /^O sol passa aqui às (8h5\d|9h0\d) \(hora solar\) em (19|20|21|22|23)\/04 e (19|2\d)\/08\.$/,
  );
  // A marca aparece em cima do ponto (pixels escuros a mais) e a caixa não o cobre.
  expect(await darkPixels(page, p.x, p.y)).toBeGreaterThan(before + 8);
  const b = (await box.boundingBox())!;
  const covers = p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
  expect(covers).toBe(false);
  // Fora da carta, a leitura some.
  await page.mouse.move(5, 5);
  await expect(box).toHaveCount(0);
});

test('com os analemas, a hora legal de cada passagem; o sol nunca passa no Sul alto', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'computador', 'mouse');
  await page.goto('./#local=florianopolis&tr=0&hl=a');
  await page.getByTestId('sun-chart').scrollIntoViewIfNeeded();
  const p = await screenPoint(page, REF.zenith, REF.azimuth);
  await page.mouse.move(p.x, p.y);
  // Hora legal (UTC−3) da passagem de abril: 12h12 UTC, 9h12 legal (o pvlib dá 12:12:52 UTC).
  await expect(page.getByTestId('readout-legal')).toHaveText(
    /^Hora legal: 9h1\d em (19|20|21|22|23)\/04 e \d+h\d\d em (19|2\d)\/08\.$/,
  );
  const south = await screenPoint(page, 30, 180);
  await page.mouse.move(south.x, south.y);
  await expect(page.getByTestId('readout-sun')).toHaveText('O sol nunca passa por aqui.');
});

test('toque: a leitura fica no ponto tocado; fora do céu, some', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'toque');
  await page.goto('./#local=florianopolis&tr=0');
  await page.getByTestId('sun-chart').scrollIntoViewIfNeeded();
  const p = await screenPoint(page, REF.zenith, REF.azimuth);
  await page.touchscreen.tap(p.x, p.y);
  await expect(page.getByTestId('readout-position')).toHaveText('Altura 31° · azimute 54° (NE)');
  // A caixa fica acima do dedo.
  const b = (await page.getByTestId('chart-readout').boundingBox())!;
  expect(b.y + b.height).toBeLessThan(p.y);
  // Tocar fora do horizonte tira a leitura.
  const chart = (await page.getByTestId('sun-chart').boundingBox())!;
  await page.touchscreen.tap(chart.x + 4, chart.y + 4);
  await expect(page.getByTestId('chart-readout')).toHaveCount(0);
});

test('a marca da leitura não vai para o SVG exportado', async ({ page }, info) => {
  // No toque, a leitura fica na tela enquanto se exporta.
  test.skip(info.project.name !== 'celular', 'toque');
  await page.goto('./#local=florianopolis');
  await page.getByTestId('sun-chart').scrollIntoViewIfNeeded();
  const p = await screenPoint(page, REF.zenith, REF.azimuth);
  await page.touchscreen.tap(p.x, p.y);
  await expect(page.getByTestId('readout-marker')).toHaveCount(1);
  await openStep(page, '5');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SVG', exact: true }).click();
  await expect(page.getByTestId('readout-marker')).toHaveCount(1);
  const text = readFileSync(await (await download).path(), 'utf-8');
  expect(text).toContain('sun-paths');
  expect(text).not.toContain('readout-marker');
});
