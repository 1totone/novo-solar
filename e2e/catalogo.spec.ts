import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// F4.1: catálogo nacional (decisão 0034). Busca, estação escolhida com os dados e a qualidade do
// arquivo, link oficial, local da obra (lista das mais próximas, avisos) e mapa.

test.describe('catálogo nacional (F4.1)', () => {
  test('busca e escolhe uma estação: dados, qualidade e link oficial; o link reabre', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis');
    await page.getByText(/Catálogo nacional: \d+ estações/).click();
    const search = page.getByTestId('catalog-search');
    await search.fill('joinville');
    const results = page.getByTestId('catalog-results');
    await expect(results).toContainText('Joinville');
    await results.getByRole('button').first().click();
    await expect(page).toHaveURL(/local=estacao/);
    await expect(page).toHaveURL(/est=\d{6}/);
    const info = page.getByTestId('site-info');
    await expect(info).toContainText('Estação Joinville');
    await expect(page.getByTestId('site-period')).toContainText('anos de dados');
    await expect(page.getByTestId('station-quality')).toContainText('valores ausentes');
    await expect(page.getByTestId('station-quality')).toContainText('kWh/m²');
    const href = await page.getByTestId('station-download').getAttribute('href');
    expect(href).toMatch(
      /^https:\/\/climate\.onebuilding\.org\/WMO_Region_3_South_America\/BRA_Brazil\/SC_Santa_Catarina\/BRA_SC_Joinville.*_TMYx\.2011-2025\.zip$/,
    );
    // A carta é a da estação; o link reabre a mesma estação, com o catálogo carregado sob demanda.
    await expect(page.getByTestId('sun-chart').locator('title').first()).toContainText('Joinville');
    await page.reload();
    await expect(page.getByTestId('site-info')).toContainText('Estação Joinville');
    // Qualidade do arquivo nos detalhes do local, abertos pela linha de resumo (decisão 0050).
    await page.getByTestId('site-line').click();
    await expect(page.getByTestId('station-quality')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Cidade' })).toHaveValue('estacao');
  });

  test('local da obra: estações mais próximas, desnível e avisos; o mapa marca o local', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis');
    await page.getByText(/Catálogo nacional/).click();
    await page.getByTestId('catalog-point-lat').fill('-27,67');
    await page.getByTestId('catalog-point-lon').fill('-48,55');
    await page.getByTestId('catalog-point-alt').fill('900');
    await expect(page).toHaveURL(/perto=-27\.67%2C-48\.55%2C900/);
    const nearest = page.getByTestId('catalog-nearest');
    await expect(nearest.getByRole('button').first()).toContainText('Florianopolis');
    await expect(nearest.getByRole('button').first()).toContainText('m abaixo');
    await nearest.getByRole('button').first().click();
    await expect(page.getByTestId('site-notices')).toContainText(
      'abaixo do local da obra: a temperatura e o vento podem ser diferentes',
    );
    await expect(page.getByTestId('catalog-map-selected')).toHaveCount(1);
    await expect(page.getByTestId('catalog-map-point')).toHaveCount(1);
    // Um clique no mapa muda o local da obra.
    const map = page.getByTestId('catalog-map');
    const box = (await map.boundingBox())!;
    await map.click({ position: { x: box.width * 0.5, y: box.height * 0.3 } });
    await expect(page).not.toHaveURL(/perto=-27\.67/);
    await expect(page).toHaveURL(/perto=/);
    await expect(page.getByTestId('catalog-point-lat')).not.toHaveValue('-27,67');
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
