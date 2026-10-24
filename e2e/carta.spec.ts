import { expect, test } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';

const RECIFE = 'LOCATION,Recife-Guararapes,PE,BRA,SRC-Teste,828990,-8.12600,-34.92300,-3.0,10.0';
const MADRID = 'LOCATION,Madrid,M,ESP,SRC-Teste,082210,40.41700,-3.70000,1.0,667.0';

test.describe('carta solar', () => {
  test('troca a cidade de teste e guarda a escolha no link', async ({ page }) => {
    await page.goto('./');
    await page.getByLabel('Cidade', { exact: true }).selectOption('manaus');
    const chart = page.getByTestId('sun-chart');
    await expect(chart.locator('title')).toContainText('Manaus');
    await expect(page.getByTestId('site-info')).toContainText('UTC−4');
    await expect(page.getByTestId('site-info')).toContainText('-3,039°');
    await expect(page).toHaveURL(/#local=manaus$/);

    await page.reload();
    await expect(chart.locator('title')).toContainText('Manaus');
    await expect(chart.locator('.sun-path')).toHaveCount(12);
  });

  test('cada trajetória tem o mês no poente, do lado oeste da carta', async ({ page }) => {
    await page.goto('./#local=recife');
    const labels = page.getByTestId('date-labels').locator('text');
    await expect(labels).toHaveText([
      'jan/nov',
      'fev/out',
      'mar/set',
      'abr/ago',
      'mai/jul',
      'jun',
      'dez',
    ]);
    const chart = await page.getByTestId('sun-chart').boundingBox();
    const centerX = chart!.x + chart!.width / 2;
    for (const box of await Promise.all((await labels.all()).map((l) => l.boundingBox()))) {
      expect(box!.x + box!.width).toBeLessThan(centerX);
    }
    // Recife (8° S): o rótulo de junho fica ao norte (acima) do de dezembro.
    const june = await labels.nth(5).boundingBox();
    const december = await labels.nth(6).boundingBox();
    expect(june!.y).toBeLessThan(december!.y);
  });

  test('carrega um EPW e desenha a carta do local do arquivo', async ({ page }) => {
    await page.goto('./');
    await page.getByLabel('Ou carregue um arquivo climático (EPW ou CSV do SOL-AR)').setInputFiles({
      name: 'recife.epw',
      mimeType: 'text/plain',
      buffer: Buffer.from(syntheticEpw(RECIFE)),
    });
    const info = page.getByTestId('site-info');
    await expect(info).toContainText('-8,126°');
    await expect(info).toContainText('recife.epw: 8.760 horas');
    await expect(info).toContainText('Arquivo sintético dos testes');
    await expect(page.getByTestId('sun-chart').locator('title')).toContainText('Recife');
    await expect(page).toHaveURL(/local=arquivo/);

    // O link reabre a mesma carta sem o arquivo, e avisa que ele não está carregado.
    await page.reload();
    await expect(page.getByTestId('sun-chart').locator('title')).toContainText('Recife');
    await expect(info).toContainText('arquivo não está carregado');
  });

  test('desenha a carta de um local no hemisfério Norte', async ({ page }) => {
    await page.goto('./');
    await page.getByLabel('Ou carregue um arquivo climático (EPW ou CSV do SOL-AR)').setInputFiles({
      name: 'madrid.epw',
      mimeType: 'text/plain',
      buffer: Buffer.from(syntheticEpw(MADRID)),
    });
    const chart = page.getByTestId('sun-chart');
    await expect(chart.locator('title')).toContainText('Madrid');
    await expect(chart.locator('.sun-path')).toHaveCount(12);
    await expect(page.getByTestId('site-info')).toContainText('UTC+1');
  });

  test('rejeita arquivo corrompido com mensagem útil e mantém a carta anterior', async ({
    page,
  }) => {
    await page.goto('./#local=belem');
    const broken = syntheticEpw(RECIFE).split('\n').slice(0, 5000).join('\n');
    await page.getByLabel('Ou carregue um arquivo climático (EPW ou CSV do SOL-AR)').setInputFiles({
      name: 'quebrado.epw',
      mimeType: 'text/plain',
      buffer: Buffer.from(broken),
    });
    await expect(page.getByRole('alert')).toContainText('não tem um ano completo');
    await expect(page.getByTestId('sun-chart').locator('title')).toContainText('Belém');

    await page.getByLabel('Ou carregue um arquivo climático (EPW ou CSV do SOL-AR)').setInputFiles({
      name: 'planilha.csv',
      mimeType: 'text/plain',
      buffer: Buffer.from('mes,dia,hora\n1,1,1\n'),
    });
    await expect(page.getByRole('alert')).toContainText('não parece ser um CSV do SOL-AR');
  });
});
