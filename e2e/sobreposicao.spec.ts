import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';

const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';

/** Carrega um EPW sintético em que a temperatura de cada hora do arquivo é o número da hora. */
async function loadHourlyEpw(page: Page) {
  await page.getByLabel('Ou carregue um arquivo climático EPW').setInputFiles({
    name: 'floripa.epw',
    mimeType: 'text/plain',
    buffer: Buffer.from(syntheticEpw(FLORIPA, (_m, _d, h) => h)),
  });
  await expect(page.getByTestId('site-info')).toContainText('floripa.epw');
}

test.describe('dados sobre a carta', () => {
  test('sem arquivo carregado, o passo 4 pede o EPW e aponta a fonte da cidade de teste', async ({
    page,
  }) => {
    await page.goto('./#local=manaus');
    const need = page.getByTestId('data-need-file');
    await expect(need).toContainText('carregue no passo 1 o arquivo EPW');
    await expect(need.getByRole('link')).toHaveAttribute('href', /Manaus.*TMYx/);
    await expect(page.getByTestId('overlay')).toHaveCount(0);
  });

  test('temperatura por célula, com faixas padrão, digitadas e legenda', async ({ page }) => {
    await page.goto('./');
    await loadHourlyEpw(page);
    const panel = page.getByTestId('data-panel');
    await panel.getByLabel('Variável').selectOption('tbs');
    await expect(page).toHaveURL(/dado=tbs/);
    const chart = page.getByTestId('sun-chart');
    await expect(chart.locator('.cell').first()).toBeVisible();
    // Temperatura = hora: 12 → "10 a 14" (faixa 1); 15 → "14 a 20" (2); 9 → "até 10" (0).
    await expect(chart.locator('[data-cell="3-12"]')).toHaveAttribute('data-band', '1');
    await expect(chart.locator('[data-cell="3-15"]')).toHaveAttribute('data-band', '2');
    await expect(chart.locator('[data-cell="3-9"]')).toHaveAttribute('data-band', '0');
    await expect(page.getByTestId('overlay-legend')).toContainText('até 10');
    await expect(page.getByTestId('overlay-legend')).toContainText('acima de 25');

    // Valores da célula ao passar o cursor.
    await chart.locator('[data-cell="3-12"]').hover();
    await expect(page.getByTestId('cell-info')).toContainText('1 a 15/fev, hora 12 do arquivo');
    await expect(page.getByTestId('cell-info')).toContainText('média 12,0 °C');
    await expect(page.getByTestId('cell-info')).toContainText('15 horas');

    // Faixas digitadas: 12 passa para "11 a 13".
    await panel.getByTestId('band-1').fill('11');
    await panel.getByTestId('band-2').fill('13');
    await expect(page).toHaveURL(/faixas=11_13_20_25/);
    await expect(chart.locator('[data-cell="3-12"]')).toHaveAttribute('data-band', '1');
    await expect(chart.locator('[data-cell="3-14"]')).toHaveAttribute('data-band', '2');
    await panel.getByRole('button', { name: 'Faixas padrão' }).click();
    await expect(page).not.toHaveURL(/faixas=/);
  });

  test('segundo semestre e frequência de horas acima do limiar', async ({ page }) => {
    await page.goto('./');
    await loadHourlyEpw(page);
    const panel = page.getByTestId('data-panel');
    await panel.getByLabel('Variável').selectOption('tbs');
    await panel.getByRole('radio', { name: '22/jun a 21/dez' }).click();
    await expect(page).toHaveURL(/sem=2/);
    const chart = page.getByTestId('sun-chart');
    await expect(chart.locator('[data-cell="13-12"]')).toHaveCount(1);
    await expect(chart.locator('[data-cell="3-12"]')).toHaveCount(0);

    await panel.getByText('Mais opções').click();
    await panel.getByLabel('Colorir pela frequência de horas acima de um limiar').check();
    // Limiar padrão 26 °C: nenhuma hora acima (faixa 0); com limiar 11, a hora 12 tem 100%.
    await expect(chart.locator('[data-cell="13-12"]')).toHaveAttribute('data-band', '0');
    await panel.getByTestId('threshold').fill('11');
    await expect(page).toHaveURL(/limiar=11/);
    await expect(chart.locator('[data-cell="13-12"]')).toHaveAttribute('data-band', '4');
    await expect(chart.locator('[data-cell="13-10"]')).toHaveAttribute('data-band', '0');
    await expect(page.getByTestId('overlay-legend')).toContainText('Horas acima de 11 °C');
  });
});
