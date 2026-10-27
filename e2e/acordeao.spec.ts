import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { maskTints } from './fixtures/pixels';
import { openStep, stepDetails, stepHeader } from './fixtures/steps';

// Passos em acordeão (decisão 0044, item a): um aberto por vez, os fechados com o resumo, a carta
// sempre à vista ao lado (computador) ou no topo (celular), sem rolar a página para mexer nos campos.
const STATE = '#local=recife&hist=1&dado=tbs&o=315&a1=50&ref=e';

/** Quantos passos da coluna estão abertos. */
const openCount = (page: Page) => page.locator('.steps .step-panel > details[open]').count();

test('um passo aberto por vez; os fechados mostram o resumo do que foi escolhido', async ({
  page,
}) => {
  await page.goto(`./${STATE}`);
  // Ao chegar, o passo 1 está aberto e os outros mostram o resumo.
  await expect(stepDetails(page, '1')).toHaveAttribute('open', '');
  expect(await openCount(page)).toBe(1);
  await expect(page.getByTestId('facade-summary')).toHaveText('Fachada 315° (NO)');
  await expect(page.getByTestId('protection-summary')).toHaveText(
    'Brise α 50° · referência externa',
  );
  await expect(page.getByTestId('data-summary')).toHaveText(
    'Temperatura de bulbo seco · 22/dez a 21/jun',
  );
  await expect(page.getByTestId('outputs-summary')).toHaveText('Raio de 6 cm · carta completa');
  await expect(page.getByTestId('facade-summary')).toBeVisible();

  // Abrir o passo 3 fecha o 1; o resumo do 1 aparece, o do 3 some (o conteúdo diz o mesmo).
  await stepHeader(page, '3').click();
  await expect(stepDetails(page, '3')).toHaveAttribute('open', '');
  await expect(stepDetails(page, '1')).not.toHaveAttribute('open', '');
  expect(await openCount(page)).toBe(1);
  await expect(page.getByTestId('site-summary')).toHaveText('Recife (PE) · dados de 1951 a 1970');
  await expect(page.getByTestId('site-summary')).toBeVisible();
  await expect(page.getByTestId('protection-summary')).toBeHidden();
  // O conteúdo dos fechados não fica na página.
  await expect(page.getByTestId('angle-a1')).toBeVisible();
  await expect(page.locator('[data-step="1"] select')).toHaveCount(0);

  // Mudar um campo muda o resumo do passo quando ele fecha.
  await page.getByTestId('angle-a1').fill('40');
  await page.getByTestId('angle-bd1').fill('30');
  await stepHeader(page, '3').click();
  expect(await openCount(page)).toBe(0);
  await expect(page.getByTestId('protection-summary')).toHaveText(
    'Brise α 40° · aletas β –/30° · referência externa',
  );

  // Um avançado também fecha o básico aberto.
  await openStep(page, '2');
  await openStep(page, '6');
  await expect(stepDetails(page, '2')).not.toHaveAttribute('open', '');
  expect(await openCount(page)).toBe(1);
});

test('"Próximo" leva ao passo seguinte com o foco no cabeçalho; teclado; axe', async ({ page }) => {
  await page.goto(`./${STATE}`);
  await page.getByTestId('next-step-2').click();
  await expect(stepDetails(page, '2')).toHaveAttribute('open', '');
  await expect(stepHeader(page, '2')).toBeFocused();
  await expect(stepHeader(page, '2')).toBeInViewport();

  // Pelo teclado: Tab chega ao cabeçalho seguinte; Enter abre, Espaço fecha.
  await stepHeader(page, '3').focus();
  await page.keyboard.press('Enter');
  await expect(stepDetails(page, '3')).toHaveAttribute('open', '');
  await expect(stepDetails(page, '2')).not.toHaveAttribute('open', '');
  await page.keyboard.press('Space');
  await expect(stepDetails(page, '3')).not.toHaveAttribute('open', '');

  // Sem violações com os passos fechados e com um aberto.
  const closed = await new AxeBuilder({ page }).include('.steps').analyze();
  expect(closed.violations).toEqual([]);
  await openStep(page, '4');
  const open = await new AxeBuilder({ page }).include('.steps').analyze();
  expect(open.violations).toEqual([]);
});

test('sem rolar: o campo do α e a máscara na carta na mesma tela', async ({ page }) => {
  // A carta fica à vista enquanto se mexe nos campos (o problema 1 do piloto P0). Na tela de um
  // notebook comum e na do celular, o campo do α e a sombra total pintada aparecem juntos.
  await page.goto('./#local=recife&o=315&tr=0');
  await openStep(page, '3');
  const field = page.getByTestId('angle-a1');
  await field.scrollIntoViewIfNeeded();
  await field.fill('50');
  await expect(page.getByTestId('mask-total')).toHaveCount(1);
  await expect(field).toBeInViewport();
  await expect(page.getByTestId('sun-chart')).toBeInViewport({ ratio: 0.9 });
  // A cor na tela: à frente da fachada noroeste, perfil acima de 40° (α interno 50°) à sombra.
  expect(
    await maskTints(page, [
      { altitude: 60, azimuth: 315 },
      { altitude: 10, azimuth: 315 },
    ]),
  ).toEqual(['total', 'none']);
  await expect(field).toBeInViewport();
});

test('a coluna fica curta no computador: os cinco cabeçalhos e o passo aberto cabem na tela', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'computador', 'leiaute de duas colunas');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`./${STATE}`);
  await openStep(page, '2');
  // Passo 2 aberto: do cabeçalho do 1 ao do 5, tudo dentro de uma tela.
  const first = (await stepHeader(page, '1').boundingBox())!;
  const fifth = (await stepHeader(page, '5').boundingBox())!;
  expect(fifth.y + fifth.height - first.y).toBeLessThan(768);
  // A carta fica fixa ao lado ao rolar até o fim da coluna.
  await openStep(page, '5');
  await page.getByTestId('compare').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('sun-chart')).toBeInViewport({ ratio: 0.5 });
});

test('no celular, o cabeçalho tocado fica à vista abaixo da carta fixa', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'leiaute de uma coluna');
  await page.goto(`./${STATE}`);
  // O passo 1 aberto é longo: o 4 fica abaixo dele; ao tocar, o 1 fecha e o 4 sobe.
  await stepHeader(page, '4').scrollIntoViewIfNeeded();
  await stepHeader(page, '4').click();
  await expect(stepDetails(page, '4')).toHaveAttribute('open', '');
  const header = (await stepHeader(page, '4').boundingBox())!;
  const chart = (await page.locator('.chart-section').boundingBox())!;
  expect(header.y).toBeGreaterThanOrEqual(chart.y + chart.height - 1);
  expect(header.y + header.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});
