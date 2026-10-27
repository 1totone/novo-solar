import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { svgColors } from './fixtures/pixels';
import { loadClimateFile, openStep } from './fixtures/steps';

// Fontes de dados no passo 1 (decisão 0047, itens e, f e h da 0044; problemas 5, 6, 7 e 8 do piloto
// do F2.9): os dados do SOL-AR 6.2 com nome claro, o que pintar ali mesmo, os arquivos carregados
// que não somem ao trocar de cidade e a comparação com outros dados, com a diferença na carta.

const RECIFE_TMYX = 'BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_TMYx.2011-2025.epw';
const RECIFE = 'LOCATION,Recife-Guararapes,PE,BRA,SRC-Teste,828990,-8.12600,-34.92300,-3.0,10.0';
const CARUARU = 'LOCATION,Caruaru,PE,BRA,SRC-Teste,000000,-8.28300,-35.97600,-3.0,545.0';
/** Centro de uma célula dos dados, nas coordenadas da carta. */
async function cellCenter(chart: Locator, cell: string) {
  return chart.locator(`[data-cell="${cell}"]`).evaluate((el) => {
    const box = (el as SVGGraphicsElement).getBBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
}

const epw = (location: string, celsius = 20) =>
  Buffer.from(
    syntheticEpw(location, () => celsius, 'Arquivo sintético dos testes de ponta a ponta'),
  );

test('dados do SOL-AR 6.2 e o que pintar, no passo 1; a carta pinta a temperatura', async ({
  page,
}) => {
  await page.goto('./#local=recife');
  const sources = page.getByTestId('data-sources');
  await expect(
    sources.getByRole('radio', { name: 'Só a carta, sem dados horários' }),
  ).toBeChecked();
  await sources
    .getByRole('radio', { name: 'Dados do SOL-AR 6.2 (ano de referência de 1951 a 1970)' })
    .check();
  await expect(page).toHaveURL(/hist=1/);
  await expect(page.getByTestId('site-period')).toContainText('entre 1951 e 1970');
  // O que pintar aparece com os dados, ali mesmo.
  await page.getByLabel('Pintar na carta').selectOption('tbs');
  await expect(page).toHaveURL(/dado=tbs/);
  await expect(page.getByTestId('overlay-legend')).toContainText('Temperatura de bulbo seco');
  await expect(page.getByTestId('site-summary')).toHaveText('Recife (PE) · dados de 1951 a 1970');
  // Pixels: a célula do meio-dia do período 3 aparece colorida (não o cinza do meio da escala).
  const chart = page.getByTestId('sun-chart');
  const [r, g, b] = (await svgColors(chart, [await cellCenter(chart, '3-12')], 1))[0]!;
  expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeGreaterThan(40);
  // "Abrir o passo 4" leva às outras opções dos dados.
  await page.getByRole('button', { name: 'Abrir o passo 4' }).click();
  await expect(page.getByTestId('data-panel').locator('details').first()).toHaveAttribute(
    'open',
    '',
  );
});

test('o arquivo carregado não some: trocar de cidade e voltar; outro lugar na lista', async ({
  page,
}) => {
  await page.goto('./#local=recife');
  await loadClimateFile(page, { name: RECIFE_TMYX, mimeType: 'text/plain', buffer: epw(RECIFE) });
  await expect(page).toHaveURL(/local=arquivo/);
  // O arquivo de Recife fica com a cidade: a lista continua em Recife, ao lado dos dados antigos.
  const city = page.getByLabel('Cidade');
  await expect(city).toHaveValue('recife');
  const fileRadio = page.getByRole('radio', { name: `Arquivo ${RECIFE_TMYX}` });
  await expect(fileRadio).toBeChecked();
  await city.selectOption('sao-paulo');
  await expect(fileRadio).toHaveCount(0);
  await city.selectOption('recife');
  await expect(fileRadio).not.toBeChecked();
  await fileRadio.check();
  await expect(page.getByTestId('site-source')).toContainText(RECIFE_TMYX);
  // Os dados antigos também continuam a um clique.
  await page.getByRole('radio', { name: /^Dados do SOL-AR 6\.2/ }).check();
  await expect(page).toHaveURL(/local=recife.*hist=1|hist=1.*local=recife/);

  // Um arquivo de outro lugar entra na lista de cidades, e volta por ela.
  await loadClimateFile(page, {
    name: 'caruaru.epw',
    mimeType: 'text/plain',
    buffer: epw(CARUARU),
  });
  await expect(page.getByTestId('site-source')).toContainText('caruaru.epw');
  await city.selectOption('recife');
  await expect(city.locator('option', { hasText: 'Arquivo: Caruaru, PE, BRA' })).toHaveCount(1);
  await city.selectOption({ label: 'Arquivo: Caruaru, PE, BRA' });
  await expect(page.getByTestId('site-source')).toContainText('caruaru.epw');
  await expect(page.getByRole('radio', { name: 'Arquivo caruaru.epw' })).toBeChecked();
});

test('comparar com outros dados: A guarda os antigos, B o arquivo, e a diferença vai à carta', async ({
  page,
}) => {
  await page.goto('./#local=recife&hist=1&dado=tbs');
  await expect(page.getByTestId('overlay-legend')).toBeVisible();
  await page.getByTestId('compare-data').click();
  await expect(page).toHaveURL(/cmp=/);
  await expect(page).toHaveURL(/dif=1/);
  await expect(page.getByTestId('compare-data-note')).toContainText(
    'A: Dados históricos do SOL-AR 6.2',
  );
  // B: um arquivo de Recife a 10 °C o ano todo, bem mais frio que os dados antigos.
  await loadClimateFile(page, {
    name: RECIFE_TMYX,
    mimeType: 'text/plain',
    buffer: epw(RECIFE, 10),
  });
  await expect(page.getByTestId('difference-view')).toBeVisible();
  await expect(page.getByTestId('difference-blocked')).toHaveCount(0);
  // A célula do meio-dia na faixa mais fria da diferença e, nos pixels, em azul.
  const chart = page.getByTestId('difference-view').getByTestId('sun-chart');
  await expect(chart.locator('[data-cell="3-12"]')).toHaveAttribute('data-band', '0');
  const [r, , b] = (await svgColors(chart, [await cellCenter(chart, '3-12')], 1))[0]!;
  expect(b).toBeGreaterThan(r + 40);
  await page.getByTestId('compare-data').click();
  await expect(page).not.toHaveURL(/cmp=/);
});

test('teclado e axe no passo 1 com as fontes de dados; celular sem rolagem lateral', async ({
  page,
}) => {
  await page.goto('./#local=recife&hist=1&dado=tbs');
  await loadClimateFile(page, { name: RECIFE_TMYX, mimeType: 'text/plain', buffer: epw(RECIFE) });
  const historical = page.getByRole('radio', { name: /^Dados do SOL-AR 6\.2/ });
  await historical.check();
  await historical.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: `Arquivo ${RECIFE_TMYX}` })).toBeChecked();
  await expect(page).toHaveURL(/local=arquivo/);
  await openStep(page, '1');
  const result = await new AxeBuilder({ page })
    .include('[data-step="1"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
});
