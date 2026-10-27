import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { loadClimateFile, openStep } from './fixtures/steps';

const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';
const RECIFE = 'LOCATION,Recife-Teste,PE,BRA,SRC-Teste,828990,-8.12600,-34.92300,-3.0,10.0';

async function load(page: Page, name: string, text: string) {
  await loadClimateFile(page, {
    name,
    mimeType: 'text/plain',
    buffer: Buffer.from(text),
  });
  await expect(page.getByTestId('site-info')).toContainText(name);
}

/** Radiação global (igual à direta no EPW sintético) das 9 às 16 h do arquivo. */
const daytime = (value: number) => (_m: number, _d: number, h: number) =>
  h >= 9 && h <= 16 ? value : 0;

test.describe('comparação de climas: diferença B − A na mesma carta (F4.2)', () => {
  test('dois arquivos do mesmo local: +3 °C em todas as células, no link e no CSV', async ({
    page,
  }) => {
    await page.goto('./#dado=tbs');
    await load(
      page,
      'a.epw',
      syntheticEpw(FLORIPA, () => 20),
    );
    await openStep(page, '5');
    await page.getByTestId('compare').click();
    await load(
      page,
      'b.epw',
      syntheticEpw(FLORIPA, () => 23),
    );
    await expect(page.getByTestId('compare-view')).toBeVisible();

    const toggle = page.getByTestId('difference-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(page).toHaveURL(/dif=1/);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('compare-view')).toHaveCount(0);
    const view = page.getByTestId('difference-view');
    await expect(view).toContainText('Diferença B − A');
    await expect(view).toContainText('Dados do arquivo a.epw.');
    await expect(view).toContainText('Dados do arquivo b.epw.');
    await expect(view.getByTestId('sun-chart')).toHaveCount(1);
    await expect(page.getByTestId('overlay-legend')).toContainText(
      'B − A: Temperatura de bulbo seco (°C)',
    );
    await expect(page.getByTestId('difference-summary')).toContainText(
      /Média das \d+ células desenhadas: \+3,0 °C \(de \+3,0 a \+3,0\)\./,
    );
    // +3 °C cai na faixa "acima de 2" (a quinta, índice 4).
    const chart = view.getByTestId('sun-chart');
    await expect(chart.locator('[data-cell="3-12"]')).toHaveAttribute('data-band', '4');
    await chart.locator('[data-cell="3-12"]').hover();
    await expect(page.getByTestId('cell-info')).toContainText(
      'B − A: +3,0 °C (média de A: 20,0; de B: 23,0).',
    );

    await openStep(page, '5');
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByTestId('outputs-panel')
        .getByRole('button', { name: 'CSV dos dados mostrados' })
        .click(),
    ]);
    const text = readFileSync((await csv.path())!, 'utf-8');
    expect(text).toContain(
      '# Diferença B − A. A: Dados do arquivo a.epw. B: Dados do arquivo b.epw.',
    );
    expect(text).toContain('media_a,media_b,diferenca_b_menos_a,faixa');
    expect(text).toContain('\n3,01/02,15/02,12,11.5,12.5,15,20,23,3,5\n');

    // O link reabre a diferença; fechar a comparação a desliga.
    await page.reload();
    await expect(page.getByTestId('difference-toggle')).toHaveAttribute('aria-pressed', 'true');
    await openStep(page, '5');
    await page.getByTestId('compare').click();
    await expect(page).not.toHaveURL(/dif=1/);
    await expect(page.getByTestId('difference-toggle')).toHaveCount(0);
  });

  test('radiação: a diferença de tempo entre A e B aparece; sem ela, avisa que é a mesma', async ({
    page,
  }) => {
    await page.goto('./#dado=ghi');
    await load(
      page,
      'a.epw',
      syntheticEpw(FLORIPA, () => 20, 'A', daytime(400)),
    );
    await openStep(page, '5');
    await page.getByTestId('compare').click();
    await load(
      page,
      'b.epw',
      syntheticEpw(FLORIPA, () => 20, 'B', daytime(500)),
    );
    await page.getByTestId('difference-toggle').click();
    await expect(page.getByTestId('difference-summary')).toContainText(
      'Nos dias claros, a radiação de A e a de B diferem menos de 15 min no tempo.',
    );
    // B com a radiação uma hora depois (10 às 17 h): o aviso diz o sentido.
    await load(
      page,
      'b-depois.epw',
      syntheticEpw(
        FLORIPA,
        () => 20,
        'B',
        (_m, _d, h) => (h >= 10 && h <= 17 ? 400 : 0),
      ),
    );
    await expect(page.getByTestId('difference-summary')).toContainText(
      'a radiação de B vem cerca de 60 min depois da de A: só por isso, a diferença fica negativa de manhã e positiva à tarde.',
    );
    // O passo 1 avisa o tempo da radiação de qualquer arquivo carregado (fora do catálogo).
    await expect(page.getByTestId('site-notices')).toContainText(
      /A radiação do arquivo vem cerca de \d+ min depois do sol \(dias claros\)/,
    );
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test('outro local ou sem variável: A e B ficam lado a lado, com o motivo', async ({ page }) => {
    await page.goto('./');
    await load(
      page,
      'a.epw',
      syntheticEpw(FLORIPA, () => 20),
    );
    await openStep(page, '5');
    await page.getByTestId('compare').click();
    await page.getByTestId('difference-toggle').click();
    await expect(page.getByTestId('difference-blocked')).toContainText(
      'escolhida no passo 4; por enquanto, A e B ficam lado a lado.',
    );
    await expect(page.getByTestId('compare-view')).toBeVisible();

    await openStep(page, '4');
    await page.getByTestId('data-panel').getByLabel('Variável').selectOption('tbs');
    await load(
      page,
      'recife.epw',
      syntheticEpw(RECIFE, () => 26),
    );
    await expect(page.getByTestId('difference-blocked')).toContainText(
      'A diferença só vale para o mesmo local',
    );
    await expect(page.getByTestId('compare-view')).toBeVisible();
    await expect(page.getByTestId('difference-view')).toHaveCount(0);
  });

  test('TRY histórico contra um arquivo recente do mesmo lugar', async ({ page }) => {
    await page.goto('./#local=florianopolis&hist=1&dado=tbs');
    await expect(page.getByTestId('overlay-legend')).toBeVisible();
    await openStep(page, '5');
    await page.getByTestId('compare').click();
    await load(
      page,
      'recente.epw',
      syntheticEpw(FLORIPA, () => 40),
    );
    await page.getByTestId('difference-toggle').click();
    const view = page.getByTestId('difference-view');
    await expect(view).toContainText(
      'A: Florianópolis (SC). Dados históricos do SOL-AR 6.2 (TRY, ano de referência escolhido entre 1961 e 1970).',
    );
    await expect(view).toContainText('Dados do arquivo recente.epw.');
    // 40 °C constantes menos a TRY: positiva em todas as células.
    await expect(page.getByTestId('difference-summary')).toContainText(
      /Média das \d+ células desenhadas: \+\d+,\d °C \(de \+\d+,\d a \+\d+,\d\)\./,
    );
    // Impressão: a origem diz as duas fontes.
    await expect(page.locator('.print-details')).toContainText(
      'Diferença B − A. A: Dados históricos do SOL-AR 6.2',
    );
  });
});
