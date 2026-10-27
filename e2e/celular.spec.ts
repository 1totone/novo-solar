import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { loadClimateFile, openStep } from './fixtures/steps';

// Leiaute do celular em pé (decisão 0013): a carta fica fixa no topo e os passos rolam por baixo,
// mas a área fixa não pode tomar a tela. Revisão antes do teste com usuários (F2.9).
const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';

async function chartWithData(page: Page) {
  await page.goto('./#a1=50&o=315');
  await loadClimateFile(page, {
    name: 'floripa.epw',
    mimeType: 'text/plain',
    buffer: Buffer.from(syntheticEpw(FLORIPA, (_m, _d, h) => h)),
  });
  await openStep(page, '4');
  await page.getByTestId('data-panel').getByLabel('Variável').selectOption('tbs');
  await expect(page.getByTestId('overlay-legend')).toBeVisible();
}

const section = (page: Page) =>
  page.locator('.chart-section').evaluate((s) => ({
    position: getComputedStyle(s).position,
    height: s.getBoundingClientRect().height,
  }));

test.describe('carta fixa no celular', () => {
  test.skip(({ isMobile }) => !isMobile, 'só no celular');

  test('com dados, a área fixa deixa ao menos 30% da tela para os passos', async ({ page }) => {
    await chartWithData(page);
    const s = await section(page);
    expect(s.position).toBe('sticky');
    // Pixel 7 com dados: 65% (era 68%); a folga cobre diferenças de fonte entre máquinas.
    expect(s.height / page.viewportSize()!.height).toBeLessThan(0.7);
    // Na tela de toque, a dica é a curta.
    await expect(page.getByTestId('cell-info')).toHaveText(/Toque numa célula/, {
      useInnerText: true,
    });
  });

  test('com a tabela das células aberta, a carta rola com a página', async ({ page }) => {
    await chartWithData(page);
    await page.getByText('Tabela dos valores das células').click();
    await expect(page.getByTestId('cell-table')).toBeVisible();
    expect((await section(page)).position).toBe('static');
    // Os passos continuam alcançáveis: o passo 4 aparece na tela ao rolar até ele.
    await page.getByTestId('data-panel').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('data-panel')).toBeInViewport();
  });

  test('com o celular deitado, nada fica fixo', async ({ page }) => {
    await page.setViewportSize({ width: 740, height: 360 });
    await chartWithData(page);
    expect((await section(page)).position).toBe('static');
  });
});
