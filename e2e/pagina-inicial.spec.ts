import { expect, test } from '@playwright/test';

test.describe('página inicial', () => {
  test('abre numa subpasta, sem erros e sem recursos faltando', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
    });
    page.on('pageerror', (err) => problems.push(`página: ${err.message}`));
    page.on('response', (res) => {
      if (res.status() >= 400) problems.push(`${res.status()} ${res.url()}`);
    });

    await page.goto('./');

    await expect(page).toHaveTitle('SOL-AR');
    await expect(page.getByRole('heading', { level: 1, name: 'SOL-AR' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Em construção' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    expect(problems).toEqual([]);
  });

  test('créditos da versão original na tela "Sobre", com estado no # da URL', async ({ page }) => {
    await page.goto('./');
    const toggle = page.getByRole('button', { name: 'Sobre' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(page).toHaveURL(/#painel=sobre$/);
    const about = page.getByRole('region', { name: 'Sobre', exact: true });
    await expect(about).toContainText('Roberto Lamberts e Alexandra Albuquerque Maciel');
    await expect(about).toContainText('Edson T. Ono');

    // O estado sobrevive ao recarregamento: o link reabre a mesma tela.
    await page.reload();
    await expect(page.getByRole('region', { name: 'Sobre', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Fechar "Sobre"' }).click();
    await expect(page.getByRole('region', { name: 'Sobre', exact: true })).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('cabe na largura da tela, sem rolagem horizontal', async ({ page }) => {
    await page.goto('./');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('mostra a carta solar estereográfica do local de teste', async ({ page }) => {
    await page.goto('./');
    const chart = page.getByTestId('sun-chart');
    await expect(chart).toBeVisible();
    await expect(chart.locator('title')).toContainText('Florianópolis');
    // Solstícios, equinócios e dia 21 dos outros oito meses.
    await expect(chart.locator('.sun-path')).toHaveCount(12);
    await expect(chart.locator('.sun-path.solstice')).toHaveCount(2);
    await expect(chart.locator('.sun-path.equinox')).toHaveCount(2);
    // Linhas horárias de 6 h a 18 h em hora solar verdadeira.
    await expect(chart.locator('.hour-line')).toHaveCount(13);
    for (const label of ['N', 'L', 'S', 'O']) {
      await expect(chart.locator('.cardinal', { hasText: new RegExp(`^${label}$`) })).toHaveCount(
        1,
      );
    }
  });

  test('wireframes da Fase 2 abrem a partir da página, numa subpasta, e navegam entre telas', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./');
    await page.getByRole('link', { name: /wireframes da Fase 2/ }).click();
    await expect(page).toHaveTitle(/wireframes da Fase 2/);
    await expect(page.getByRole('heading', { name: '0. Fluxo básico' })).toBeVisible();
    await page.getByRole('link', { name: '3. Fachada e proteção' }).click();
    await expect(page.getByRole('heading', { name: /Passos 2 e 3/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: '0. Fluxo básico' })).toBeHidden();
    expect(errors).toEqual([]);
  });
});
