import { expect, test } from '@playwright/test';

// F4.6: instalável e funcionando sem internet, sem requisições externas, no build portátil servido
// numa subpasta (decisão 0031).

test.describe('instalável e sem internet (F4.6)', () => {
  test('manifesto com os ícones, escopo e início relativos (build portátil)', async ({
    page,
    request,
  }) => {
    await page.goto('./');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBe('./manifest.webmanifest');
    const base = page.url();
    const manifest = await (await request.get(new URL(href!, base).href)).json();
    expect(manifest).toMatchObject({
      name: 'SOL-AR',
      start_url: './',
      scope: './',
      display: 'standalone',
    });
    const sizes = (manifest.icons as { sizes: string; type: string; purpose?: string }[]).map(
      (i) => `${i.sizes} ${i.type}${i.purpose ? ` ${i.purpose}` : ''}`,
    );
    expect(sizes).toEqual(
      expect.arrayContaining([
        '192x192 image/png',
        '512x512 image/png',
        '512x512 image/png maskable',
      ]),
    );
    for (const icon of manifest.icons as { src: string }[]) {
      const response = await request.get(new URL(icon.src, new URL(href!, base)).href);
      expect(response.ok(), icon.src).toBe(true);
    }
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#1f4e79');
  });

  test('nenhuma requisição para fora do endereço da aplicação', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const external: string[] = [];
    page.on('request', (r) => {
      const url = r.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        external.push(url);
      }
    });
    await page.goto('./#local=florianopolis&hist=1&dado=tbs&o=30&a1=55');
    await expect(page.getByTestId('site-info')).toContainText('dados históricos');
    await page.getByRole('tab', { name: 'Rosa dos ventos' }).click();
    await expect(page.getByTestId('wind-rose')).toBeVisible();
    await page.goto('./#local=florianopolis&aba=3d&jl=1%2C2&ja=1&pc1=b_0%2C5');
    await expect(page.getByTestId('view3d-canvas')).toHaveAttribute('data-state', 'ready');
    expect(external).toEqual([]);
  });

  test.describe('com o service worker', () => {
    test.use({ serviceWorkers: 'allow' });

    test('sem internet, a aplicação abre de novo com a carta, os dados históricos já abertos e a vista 3D', async ({
      page,
      context,
    }) => {
      const hash = '#local=florianopolis&hist=1&dado=tbs&o=30&a1=55';
      await page.goto(`./${hash}`);
      // O service worker se instala e passa a controlar a página.
      await page.evaluate(() => navigator.serviceWorker.ready);
      await expect
        .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
        .toBe(true);
      // Com a página controlada, os dados históricos passam pelo service worker e ficam guardados.
      await page.reload();
      await expect(page.getByTestId('site-info')).toContainText('dados históricos');
      await expect(page.locator('.sun-chart .cell').first()).toBeVisible();

      await context.setOffline(true);
      await page.reload();
      await expect(page.getByRole('heading', { name: /Local$/ })).toBeVisible();
      await expect(page.getByTestId('sun-chart')).toBeVisible();
      await expect(page.getByTestId('site-info')).toContainText('dados históricos');
      await expect(page.locator('.sun-chart .cell').first()).toBeVisible();
      await expect(page.getByTestId('mask-total')).toHaveCount(1);
      // O bloco da vista 3D (carregado sob demanda) também foi guardado na instalação.
      await page.goto('./#local=florianopolis&aba=3d&jl=1%2C2&ja=1&pc1=b_0%2C5');
      await expect(page.getByTestId('view3d-canvas')).toHaveAttribute('data-state', 'ready');
      await context.setOffline(false);
    });
  });
});
