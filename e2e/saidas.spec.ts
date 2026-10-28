import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { loadClimateFile, openPrintOptions, openStep } from './fixtures/steps';

const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';
const CM_PER_PX = 2.54 / 96;

/** Raio geométrico do horizonte na mídia de impressão, em cm (r do círculo × escala do SVG). */
async function printedRadiusCm(page: Page): Promise<number> {
  await page.emulateMedia({ media: 'print' });
  const px = await page
    .locator('#panel-chart .sun-chart .horizon')
    .evaluate(
      (c) => (c as SVGCircleElement).r.baseVal.value * (c as SVGGraphicsElement).getScreenCTM()!.a,
    );
  await page.emulateMedia({ media: 'screen' });
  return px * CM_PER_PX;
}

test.describe('imprimir e exportar', () => {
  test('impressão em escala: o horizonte tem o raio pedido e a régua 5 cm', async ({ page }) => {
    await page.goto('./#o=30&a1=55');
    await openStep(page, '5');
    expect(await printedRadiusCm(page)).toBeCloseTo(6, 3);
    await page.getByTestId('print-radius').fill('4,5');
    expect(await printedRadiusCm(page)).toBeCloseTo(4.5, 3);
    await page.getByTestId('print-radius').fill('8');
    await expect(page.getByTestId('radius-note')).toContainText('até 7 cm de raio');

    await page.emulateMedia({ media: 'print' });
    const ruler = await page.locator('.print-ruler .ruler').boundingBox();
    expect(ruler!.width * CM_PER_PX).toBeCloseTo(5, 2);
    await expect(page.locator('.steps:visible')).toHaveCount(0);
    await expect(page.locator('.print-header')).toContainText('Florianópolis');
    // Sem o transferidor na impressão.
    await page.emulateMedia({ media: 'screen' });
    await openPrintOptions(page);
    await page.getByLabel('Transferidor', { exact: true }).uncheck();
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#panel-chart .protractor')).toBeHidden();
  });

  test('SVG em escala com estilos embutidos e PNG de 2400 px', async ({ page }) => {
    await page.goto('./#o=30&a1=55');
    await openStep(page, '5');
    const outputs = page.getByTestId('outputs-panel');
    const [svgDownload] = await Promise.all([
      page.waitForEvent('download'),
      outputs.getByRole('button', { name: 'SVG' }).click(),
    ]);
    expect(svgDownload.suggestedFilename()).toBe('solar-florianopolis-sc-carta.svg');
    const svg = readFileSync((await svgDownload.path())!, 'utf-8');
    expect(svg).toContain('width="15.84cm"');
    expect(svg).toContain('<desc>Carta solar de Florianópolis');
    expect(svg).toMatch(/class="horizon"[^>]*style="[^"]*stroke:/);

    const [pngDownload] = await Promise.all([
      page.waitForEvent('download'),
      outputs.getByRole('button', { name: 'PNG' }).click(),
    ]);
    const png = readFileSync((await pngDownload.path())!);
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([2400, 2400]);
  });

  test('CSV dos dados mostrados e tabela das células', async ({ page }) => {
    await page.goto('./');
    await loadClimateFile(page, {
      name: 'floripa.epw',
      mimeType: 'text/plain',
      buffer: Buffer.from(syntheticEpw(FLORIPA, (_m, _d, h) => h)),
    });
    const outputs = page.getByTestId('outputs-panel');
    await openStep(page, '5');
    await expect(outputs.getByRole('button', { name: 'CSV dos dados mostrados' })).toBeDisabled();
    await openStep(page, '4');
    await page.getByTestId('data-panel').getByLabel('Variável').selectOption('tbs');
    await openStep(page, '5');
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      outputs.getByRole('button', { name: 'CSV dos dados mostrados' }).click(),
    ]);
    const text = readFileSync((await csv.path())!, 'utf-8');
    expect(text).toContain('# Separador: vírgula; decimal: ponto.');
    expect(text).toContain('# Arquivo: floripa.epw (8760 horas)');
    expect(text).toContain('# Variável: Temperatura de bulbo seco (°C)');
    // período 3 (01/02 a 15/02), hora 12: 15 horas, média 12, faixa 2 ("10 a 14")
    expect(text).toContain('\n3,01/02,15/02,12,11.5,12.5,15,12,12,12,,2\n');

    await page.getByText('Tabela dos valores das células').click();
    const row = page.getByTestId('cell-table').getByRole('row', { name: /^1 a 15\/fev/ });
    await expect(row).toContainText('12,0');
  });

  test('comparar lado a lado: A congelada, B editável, no link', async ({ page }) => {
    await page.goto('./#o=30&a1=55');
    await openStep(page, '5');
    await page.getByTestId('compare').click();
    await expect(page).toHaveURL(/cmp=/);
    const view = page.getByTestId('compare-view');
    await expect(view.getByTestId('compare-a')).toContainText(
      'A: Florianópolis (SC) · fachada 30° · α 55°',
    );
    await openStep(page, '2');
    await page.getByLabel('Orientação da fachada (azimute da normal externa)').fill('120');
    await expect(view.getByTestId('compare-b')).toContainText('fachada 120°');
    await expect(view.getByTestId('compare-a')).toContainText('fachada 30°');
    await expect(view.getByTestId('sun-chart')).toHaveCount(2);

    await page.reload();
    await expect(page.getByTestId('compare-a')).toContainText('fachada 30°');
    await openStep(page, '5');
    await page.getByTestId('compare').click();
    await expect(page).not.toHaveURL(/cmp=/);
    await expect(page.getByTestId('compare-view')).toHaveCount(0);
  });
});
