import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// F4.6: teclado nas abas e nos grupos de botões (achado 15 da revisão do F2.9), nomes acessíveis
// dos campos de ângulo (achado 16) e contraste da grade da carta (achado 17).

const focused = (page: Page) =>
  page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');

test.describe('acessibilidade (F4.6)', () => {
  test('abas: setas trocam a aba, dando a volta; Home e End; só a aba escolhida no Tab', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis');
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(3);
    await expect(page.getByRole('tab', { name: 'Carta solar' })).toHaveAttribute('tabindex', '0');
    await expect(page.getByRole('tab', { name: 'Vista 3D' })).toHaveAttribute('tabindex', '-1');
    await page.getByRole('tab', { name: 'Carta solar' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Vista 3D' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page).toHaveURL(/aba=3d/);
    expect(await focused(page)).toBe('Vista 3D');
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/aba=rosa/);
    await page.keyboard.press('ArrowRight');
    await expect(page).not.toHaveURL(/aba=/);
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/aba=rosa/);
    await page.keyboard.press('Home');
    await expect(page).not.toHaveURL(/aba=/);
    await page.keyboard.press('End');
    await expect(page).toHaveURL(/aba=rosa/);
    expect(await focused(page)).toBe('Rosa dos ventos');
  });

  test('grupos de opções: setas escolhem a opção (referência dos ângulos e setores da rosa)', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0&a1=40');
    const internal = page.getByRole('radio', { name: 'Interna' });
    await expect(internal).toHaveAttribute('tabindex', '0');
    await expect(page.getByRole('radio', { name: 'Externa' })).toHaveAttribute('tabindex', '-1');
    await internal.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Externa' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page).toHaveURL(/ref=e/);
    await page.keyboard.press('ArrowRight');
    await expect(internal).toHaveAttribute('aria-checked', 'true');
    await expect(page).not.toHaveURL(/ref=/);
    // Na aba da rosa, o grupo de setores responde às setas do mesmo jeito.
    await page.goto('./#local=florianopolis&hist=1&aba=rosa');
    await expect(page.getByTestId('wind-rose')).toBeVisible();
    await page.getByRole('radio', { name: '8', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/setores=16/);
  });

  test('campos de ângulo com nome completo: símbolo, o que descrevem, a sombra e o lado', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0');
    for (const name of [
      'α (brise horizontal), sombra total',
      'β (brises verticais), sombra total, esquerda',
      'β (brises verticais), sombra total, direita',
      'γ (limites laterais), sombra total, esquerda',
    ]) {
      await expect(page.getByRole('textbox', { name, exact: true })).toHaveCount(1);
    }
    await page.getByText('Mais opções').first().click();
    await expect(
      page.getByRole('textbox', { name: 'γa (topo das aletas), sombra parcial, direita' }),
    ).toHaveCount(1);
    await page
      .getByRole('textbox', { name: 'β (brises verticais), sombra total, direita' })
      .fill('30');
    await expect(page).toHaveURL(/bd1=30/);
  });

  test('grade da carta com pelo menos 3:1 sobre o fundo; axe com as opções abertas', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0&a1=40');
    const ratio = await page
      .locator('.sun-chart .altitude')
      .first()
      .evaluate((el) => {
        const lum = (css: string) => {
          const [r, g, b] = css
            .match(/\d+(\.\d+)?/g)!
            .slice(0, 3)
            .map(Number);
          const lin = (c: number) => {
            const s = c / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
        };
        const stroke = getComputedStyle(el).stroke;
        const bg = getComputedStyle(el.closest('svg')!).backgroundColor;
        const [hi, lo] = [lum(stroke), lum(bg)].sort((x, y) => y - x);
        return (hi! + 0.05) / (lo! + 0.05);
      });
    expect(ratio).toBeGreaterThanOrEqual(3);
    await page.getByText('Mais opções').first().click();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
