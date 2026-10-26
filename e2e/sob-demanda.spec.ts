import { expect, test } from '@playwright/test';

// Carregamento sob demanda (decisão 0039): o caminho básico não baixa o código dos passos 6 e 7
// nem o da vista 3D; abrir o passo baixa o dele, e o passo aparece igual.
test('o caminho básico não baixa os passos avançados; abrir o passo 6 baixa só o dele', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname.split('/').pop()!);
  });
  await page.goto('./#local=florianopolis&o=30&a1=55');
  await expect(page.getByTestId('sun-chart')).toBeVisible();
  await expect(page.getByTestId('geometry-summary')).toHaveText(
    'Janela, brise, aletas e lâminas em metros; corte, vista e sombra na carta.',
  );
  await page.waitForLoadState('networkidle');
  const lazy = /^(GeometryPanel|EffectPanel|View3DPanel|scene3d)-/;
  expect(scripts.filter((s) => lazy.test(s))).toEqual([]);

  // Abrir pelo teclado: o foco continua no resumo do passo depois de o código chegar.
  await page.getByTestId('geometry-panel').locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('geometry-start')).toBeVisible();
  await expect(page.getByTestId('geometry-panel').locator('summary')).toBeFocused();
  expect(scripts.some((s) => s.startsWith('GeometryPanel-'))).toBe(true);
  expect(scripts.some((s) => s.startsWith('EffectPanel-'))).toBe(false);
});

test('um link com a janela abre o passo 6 já carregado, com o resumo da geometria', async ({
  page,
}) => {
  await page.goto('./#local=florianopolis&o=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i');
  await expect(page.getByTestId('geometry-summary')).toHaveText(
    'Janela de 1,50 × 1,20 m · 1 peça(s)',
  );
  await expect(page.getByTestId('geometry-panel').locator('details')).toHaveAttribute('open', '');
});
