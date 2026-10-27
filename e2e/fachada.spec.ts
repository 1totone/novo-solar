import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { maskTints } from './fixtures/pixels';
import { openStep } from './fixtures/steps';

// Fachada por rumos (decisão 0044, item c; problema 3 do piloto do F2.9: 45° digitado para
// "noroeste" sem perceber). Botões de rumo, siglas e nomes aceitos no campo, rumo por extenso ao
// lado do número; a máscara gira com a fachada (pixels da carta).

test('botão "NO": 315° no link, o rumo por extenso e a máscara do lado noroeste', async ({
  page,
}) => {
  await page.goto('./#local=recife&a1=50&tr=0');
  await openStep(page, '2');
  await page.getByRole('radio', { name: 'noroeste (315°)' }).click();
  await expect(page).toHaveURL(/o=315/);
  await expect(page.getByTestId('orientation-name')).toHaveText('noroeste');
  await expect(page.getByTestId('normal-azimuth')).toContainText('Normal externa: 315° (NO)');
  await expect(page.getByRole('radio', { name: 'noroeste (315°)' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByLabel('Orientação da fachada (azimute da normal externa)')).toHaveValue(
    '315',
  );
  // À frente da fachada noroeste, perfil acima de 40° (α interno 50°): sombra; atrás dela, nada.
  expect(
    await maskTints(page, [
      { altitude: 60, azimuth: 315 },
      { altitude: 60, azimuth: 135 },
    ]),
  ).toEqual(['total', 'none']);
  await expect(page.getByTestId('facade-summary')).toHaveText(
    'Fachada 315° (NO) · sem transferidor',
  );
});

test('o campo aceita "NO" e "noroeste"; 45° mostra "nordeste" bem visível', async ({ page }) => {
  await page.goto('./#local=recife');
  await openStep(page, '2');
  const field = page.getByLabel('Orientação da fachada (azimute da normal externa)');
  await field.fill('NO');
  await expect(page).toHaveURL(/o=315/);
  // O campo continua com o que foi digitado; o link guarda o número.
  await expect(field).toHaveValue('NO');
  await expect(page.getByTestId('orientation-name')).toHaveText('noroeste');
  await field.fill('nordeste');
  await expect(page).toHaveURL(/o=45/);
  await field.fill('45');
  await expect(page.getByTestId('orientation-name')).toHaveText('nordeste');
  await expect(page.getByTestId('normal-azimuth')).toContainText('Normal externa: 45° (NE)');
  await expect(page.getByRole('radio', { name: 'nordeste (45°)' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // O nome por extenso fica ao lado do número, em destaque (não abaixo, em letra pequena).
  const fieldBox = (await field.boundingBox())!;
  const nameBox = (await page.getByTestId('orientation-name').boundingBox())!;
  expect(nameBox.x).toBeGreaterThan(fieldBox.x + fieldBox.width);
  expect(nameBox.y).toBeLessThan(fieldBox.y + fieldBox.height);
  const size = await page
    .getByTestId('orientation-name')
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(18);
  // Fora da rosa: aproximação ao rumo mais próximo.
  await field.fill('300');
  await expect(page.getByTestId('orientation-name')).toHaveText('≈ oés-noroeste');
  await expect(page.getByTestId('normal-azimuth')).toContainText('Normal externa: 300° (ONO)');
  await field.fill('noroest');
  await expect(page.getByRole('alert')).toContainText('ou um rumo, como NO ou noroeste');
});

test('teclado: setas percorrem os rumos no sentido horário; axe', async ({ page }) => {
  await page.goto('./#local=recife&o=0');
  await openStep(page, '2');
  const north = page.getByRole('radio', { name: 'norte (0°)' });
  await expect(north).toHaveAttribute('tabindex', '0');
  await north.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/o=45/);
  await expect(page.getByRole('radio', { name: 'nordeste (45°)' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/o=315/);
  const result = await new AxeBuilder({ page })
    .include('[data-step="2"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test('celular: a rosa cabe e os botões têm pelo menos 40 px', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'só no celular');
  await page.goto('./#local=recife');
  await openStep(page, '2');
  const button = (await page.getByRole('radio', { name: 'sudoeste (225°)' }).boundingBox())!;
  expect(button.height).toBeGreaterThanOrEqual(40);
  expect(button.width).toBeGreaterThanOrEqual(40);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
});
