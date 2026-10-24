import { expect, test } from '@playwright/test';

test.describe('transferidor', () => {
  test('orientação e ângulos desenham as curvas sobre a carta e ficam no link', async ({
    page,
  }) => {
    await page.goto('./');
    await page.getByLabel('Orientação da fachada (azimute da normal externa)').fill('-30');
    await expect(page.getByTestId('normal-azimuth')).toContainText('330°');
    await expect(page.getByTestId('normal-azimuth')).toContainText('NNO');

    await page.getByTestId('angle-a1').fill('45');
    await page.getByTestId('angle-bd1').fill('30');
    await page.getByTestId('angle-ge1').fill('20');
    const chart = page.getByTestId('sun-chart');
    await expect(chart.getByTestId('facade-line')).toBeVisible();
    await expect(chart.getByTestId('curve-alpha--1')).toHaveCount(1);
    // β à direita sem índice 2: a reta de β e a linha da fachada como segundo limite.
    await expect(chart.getByTestId('curve-beta-right-1')).toHaveCount(1);
    await expect(chart.getByTestId('curve-beta-right-2')).toHaveCount(1);
    await expect(chart.getByTestId('curve-gamma-left-1')).toHaveCount(1);
    await expect(page).toHaveURL(/a1=45/);
    await expect(page).toHaveURL(/o=-30/);

    // α interno 45° = externo 45°: raio 1/cos 45°.
    const r45 = Number(await chart.getByTestId('curve-alpha--1').getAttribute('r'));
    expect(r45).toBeCloseTo(Math.SQRT2, 6);

    // Referência externa: o mesmo número passa a ser medido a partir da horizontal.
    await page.getByLabel('α', { exact: true }).fill('60');
    await page.getByRole('radio', { name: 'Externa' }).click();
    const r60 = Number(await chart.getByTestId('curve-alpha--1').getAttribute('r'));
    expect(r60).toBeCloseTo(2, 6);
    await expect(page).toHaveURL(/ref=e/);

    await page.reload();
    await expect(page.getByRole('radio', { name: 'Externa' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(chart.getByTestId('curve-alpha--1')).toHaveCount(1);
  });

  test('valor fora de 0° a 90° é sinalizado e não desenha curva', async ({ page }) => {
    await page.goto('./#a1=120');
    await expect(page.getByRole('alert')).toContainText('de 0° a 90°');
    await expect(page.getByTestId('angle-a1')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('curve-alpha--1')).toHaveCount(0);
  });

  test('índices 2 ficam recolhidos e desenham a segunda curva', async ({ page }) => {
    await page.goto('./#a1=40');
    await page.getByText('Índices 2 (brise afastado da parede)').click();
    await page.getByTestId('angle-a2').fill('15');
    await expect(page.getByTestId('curve-alpha--2')).toHaveCount(1);
  });

  test('ocultar o transferidor', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('protractor')).toHaveCount(1);
    await page.getByLabel('Mostrar o transferidor sobre a carta').uncheck();
    await expect(page.getByTestId('protractor')).toHaveCount(0);
    await expect(page).toHaveURL(/tr=0/);
  });
});
