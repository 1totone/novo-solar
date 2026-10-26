import { expect, test } from '@playwright/test';

// Resultados ao lado (decisão 0038): no computador, o mapa mês × hora (passo 6) e a classificação
// e os indicadores (passo 7) ficam no painel da direita, abaixo da carta, com a largura dele; no
// celular e nas outras abas, ficam dentro do passo, como antes.
const URL =
  '#local=florianopolis&hist=1&o=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i&cm=l&tf=20&tq=20';

test('no computador, os resultados dos passos 6 e 7 ficam ao lado da carta', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'computador', 'leiaute de duas colunas');
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`./${URL}`);
  const side = page.locator('.chart-section [data-testid="side-results"]');
  const map = side.getByTestId('month-hour-map');
  await expect(map).toBeVisible({ timeout: 20000 });
  await expect(side.getByTestId('classes-results')).toBeVisible({ timeout: 20000 });
  await expect(side.getByTestId('indicators-section')).toBeVisible();
  // Nada disso fica na coluna dos passos: lá ficam só as linhas que levam ao painel.
  const steps = page.locator('.steps');
  await expect(steps.getByTestId('annual-section')).toHaveCount(0);
  await expect(steps.getByTestId('classes-results')).toHaveCount(0);
  await expect(steps.getByTestId('side-pointer-annual')).toBeVisible();
  await expect(steps.getByTestId('side-pointer-effect')).toBeVisible();
  // O mapa tem a largura do painel da direita, mais que o dobro da coluna dos passos.
  const mapBox = await map.boundingBox();
  const stepsBox = await steps.boundingBox();
  expect(mapBox!.width).toBeGreaterThan(2 * stepsBox!.width);
  // As hipóteses da classificação acompanham os resultados (decisão 0020, item 7).
  await expect(side.getByTestId('classes-hypotheses')).toBeVisible();
  // "Ver" leva ao resultado e põe o foco no cabeçalho dele.
  await steps.getByTestId('side-pointer-effect').getByRole('button').click();
  await expect(page.locator('#side-effect-h')).toBeFocused();
  await expect(page.locator('#side-effect-h')).toBeInViewport();
});

test('com o passo fechado ou em outra aba, o resultado volta para dentro do passo', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'computador', 'leiaute de duas colunas');
  await page.goto(`./${URL}`);
  await expect(page.locator('.chart-section').getByTestId('month-hour-map')).toBeVisible({
    timeout: 20000,
  });
  // Passo 7 fechado: nada dele no painel da direita.
  await page.getByTestId('effect-panel').locator('summary').first().click();
  await expect(page.locator('.chart-section').getByTestId('classes-results')).toHaveCount(0);
  // Aba da rosa dos ventos: o mapa volta para o passo 6.
  await page.getByRole('tab', { name: 'Rosa dos ventos' }).click();
  await expect(page.locator('[data-testid="side-results"]')).toHaveCount(0);
  await expect(page.locator('.steps').getByTestId('annual-section')).toHaveCount(1);
});

test('no celular, os resultados continuam dentro dos passos', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'leiaute de uma coluna');
  await page.goto(`./${URL}`);
  await expect(page.locator('.steps').getByTestId('month-hour-map')).toBeAttached({
    timeout: 20000,
  });
  await expect(page.locator('[data-testid="side-results"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="side-pointer"]')).toHaveCount(0);
});
