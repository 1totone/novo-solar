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
    const about = page.getByRole('region', { name: 'Sobre' });
    await expect(about).toContainText('Roberto Lamberts e Alexandra Albuquerque Maciel');
    await expect(about).toContainText('Edson T. Ono');

    // O estado sobrevive ao recarregamento: o link reabre a mesma tela.
    await page.reload();
    await expect(page.getByRole('region', { name: 'Sobre' })).toBeVisible();

    await page.getByRole('button', { name: 'Fechar "Sobre"' }).click();
    await expect(page.getByRole('region', { name: 'Sobre' })).toHaveCount(0);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('cabe na largura da tela, sem rolagem horizontal', async ({ page }) => {
    await page.goto('./');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
