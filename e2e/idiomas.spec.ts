import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// F4.6: idiomas (decisão 0029). A interface segue o idioma do navegador; a escolha no seletor fica
// neste navegador e não muda o link.

/** Palavras que só aparecem na interface em português (para achar texto sem tradução). */
const PT_ONLY = [
  'Fachada',
  'Proteção',
  'Rosa dos ventos',
  'Imprimir',
  'Exportar',
  'Dados sobre a carta',
  'Mais opções',
  'transferidor',
  'arquivo climático',
  'horas',
];

async function visibleText(page: Page) {
  return page.locator('main').evaluate((el) => (el as HTMLElement).innerText);
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}

test.describe('idiomas (F4.6)', () => {
  test.describe('navegador em inglês', () => {
    test.use({ locale: 'en-GB' });

    test('abre em inglês, sem texto em português, com ponto decimal e E/W na carta; axe', async ({
      page,
    }) => {
      await page.goto('./#local=florianopolis&o=30&a1=55');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.getByTestId('language')).toHaveValue('en');
      await expect(page.getByRole('heading', { name: 'Location' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Facade' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Wind rose' })).toBeVisible();
      // Números com ponto decimal; pontos cardeais da carta em inglês.
      await expect(page.getByTestId('site-info')).toContainText('-27.6');
      const cardinals = await page.locator('.sun-chart .labels text.cardinal').allTextContents();
      expect(cardinals).toEqual(expect.arrayContaining(['N', 'E', 'S', 'W']));
      expect(cardinals).not.toContain('L');
      const text = await visibleText(page);
      for (const word of PT_ONLY) expect(text, word).not.toContain(word);
      await axe(page);
    });
  });

  test('o seletor troca o idioma, guarda a escolha neste navegador e não mexe no link', async ({
    page,
  }) => {
    const hash = '#a1=55&local=florianopolis&o=30';
    await page.goto(`./${hash}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page.getByRole('heading', { name: 'Fachada' })).toBeVisible();
    await page.getByLabel('Idioma').selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { name: 'Ubicación' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Protección$/ })).toBeVisible();
    expect(new URL(page.url()).hash).toBe(hash);
    // Vírgula decimal em espanhol e Oeste como "O".
    await expect(page.getByTestId('site-info')).toContainText('-27,6');
    // Recarregar mantém o espanhol (preferência deste navegador).
    await page.reload();
    await expect(page.getByLabel('Idioma')).toHaveValue('es');
    await expect(page.getByRole('heading', { name: 'Ubicación' })).toBeVisible();
    await axe(page);
    // De volta ao português, pelo teclado.
    await page.getByLabel('Idioma').focus();
    await page.getByLabel('Idioma').selectOption('pt-BR');
    await expect(page.getByRole('heading', { name: /Local$/ })).toBeVisible();
  });

  test.describe('navegador em espanhol', () => {
    test.use({ locale: 'es-AR' });

    test('ajuda da hora oficial e nota da carta em espanhol, com a hora do relógio em 11:32', async ({
      page,
    }) => {
      await page.goto('./#local=florianopolis&hl=l');
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      const panel = page.getByTestId('chart-options-panel');
      await panel.locator('summary').click();
      // Ao meio-dia oficial, a hora solar vai de 11:32 (11/02) a 12:02 (03/11) em Florianópolis.
      await expect(panel.getByTestId('legal-help')).toContainText('11:32 (11/02)');
      await expect(panel.getByTestId('legal-help')).toContainText('14,2 min por detrás del reloj');
      await expect(page.getByTestId('chart-note')).toContainText('Proyección estereográfica');
    });
  });
});
