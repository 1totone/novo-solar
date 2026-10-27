import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// F4.8: ajuda (decisão 0032). Diálogo com seis partes (a dos exercícios entrou no F4.5), aberto pelo cabeçalho ou pelo link
// (ajuda=<parte>); exemplos resolvidos que abrem numa nova aba com o cartão do passo a passo.

async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}

/** Abre o exemplo pelo link da ajuda e devolve a nova aba. */
async function openExample(page: Page, title: RegExp) {
  const article = page.getByRole('article', { name: title });
  const [tab] = await Promise.all([
    page.context().waitForEvent('page'),
    article.getByRole('link', { name: 'Abrir o exemplo numa nova aba' }).click(),
  ]);
  await tab.waitForLoadState();
  return tab;
}

test.describe('ajuda (F4.8)', () => {
  test('o botão do cabeçalho abre a ajuda; abas pelo teclado; Esc fecha e devolve o foco', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=30');
    const open = page.getByTestId('help-open');
    await open.click();
    const dialog = page.getByRole('dialog', { name: 'Ajuda' });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/ajuda=guia/);
    await expect(dialog.getByRole('tab', { name: 'Guia rápido' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(dialog.getByRole('tabpanel')).toContainText('O caminho básico');
    await dialog.getByRole('tab', { name: 'Guia rápido' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/ajuda=exemplos/);
    await expect(dialog.getByRole('tabpanel')).toContainText('55° ou 57,5°');
    await page.keyboard.press('End');
    await expect(page).toHaveURL(/ajuda=hipoteses/);
    await expect(dialog.getByRole('tabpanel')).toContainText('DNI');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page).not.toHaveURL(/ajuda=/);
    await expect(page).toHaveURL(/local=florianopolis/);
    await expect(open).toBeFocused();
  });

  test('o link abre a parte pedida; perguntas que abrem e fecham; clique fora fecha', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&ajuda=perguntas');
    const dialog = page.getByRole('dialog', { name: 'Ajuda' });
    await expect(dialog.getByRole('tab', { name: 'Perguntas' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const question = dialog.getByText('Esquerda e direita de quem?');
    const answer = dialog.getByText(/De quem está dentro, olhando para fora/);
    await expect(answer).toBeHidden();
    await question.click();
    await expect(answer).toBeVisible();
    await dialog.getByRole('tab', { name: 'Glossário' }).click();
    await expect(dialog.getByRole('tabpanel')).toContainText('α (brise horizontal)');
    await expect(dialog.getByRole('tabpanel')).toContainText('AVS da INI-C');
    // Clique no fundo escurecido, fora da caixa (no celular, a ajuda ocupa a tela e fecha pelo botão).
    if (page.viewportSize()!.width < 640) {
      await dialog.getByRole('button', { name: 'Fechar a ajuda' }).click();
    } else {
      await page.mouse.click(5, 5);
    }
    await expect(dialog).toHaveCount(0);
    await expect(page).not.toHaveURL(/ajuda=/);
  });

  test('exemplo 1: abre numa nova aba com o cartão; ângulos exigidos e brise do período', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0&ajuda=exemplos');
    const tab = await openExample(page, /Ler os ângulos na carta/);
    // A aba de origem não muda.
    await expect(page).toHaveURL(/local=florianopolis/);
    await expect(tab).toHaveURL(/exemplo=angulos/);
    const card = tab.getByTestId('example-card');
    await expect(card).toContainText('Exemplo resolvido 1 de 3');
    await expect(card).toContainText('57,5°');
    await expect(tab.getByLabel('α (brise horizontal), sombra total')).toHaveValue('55');
    await expect(tab.getByTestId('sizing-angles')).toContainText('57,5° (32,5°)');
    await expect(tab.getByTestId('sizing-angles')).toContainText('42,2°');
    await expect(tab.getByTestId('sizing-angles')).toContainText('58,5°');
    await expect(tab.getByTestId('sizing-overhang')).toContainText('1,42 m');
    // "Ver o exemplo na ajuda" abre a ajuda neste exemplo; "Fechar o exemplo" tira o cartão.
    await card.getByRole('button', { name: 'Ver o exemplo na ajuda' }).click();
    const dialog = tab.getByRole('dialog', { name: 'Ajuda' });
    await expect(dialog.getByTestId('help-example-angulos')).toBeInViewport();
    await tab.keyboard.press('Escape');
    await card.getByRole('button', { name: 'Fechar o exemplo' }).click();
    await expect(card).toHaveCount(0);
    await expect(tab).not.toHaveURL(/exemplo=/);
    await expect(tab).toHaveURL(/dpi=1%2F1/);
    await axe(tab);
  });

  test('exemplos 2 e 3: brise da Figura 22 com recuo e brise afastado da Figura 26', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&ajuda=exemplos');
    const recuo = await openExample(page, /Do ângulo às dimensões/);
    await expect(recuo.getByTestId('example-card')).toContainText('Exemplo resolvido 2 de 3');
    const geometry = recuo.getByTestId('geometry-panel');
    await expect(geometry).toContainText('α 55,0°');
    await expect(geometry).toContainText('γ dir. 50,2°');
    await expect(geometry).toContainText('γ esq. 59,5°');
    // Curvas na carta: a de 100% e o ponto da curva de 0% (a normal no horizonte).
    const labels = recuo.getByTestId('contour-label');
    await expect(labels.filter({ hasText: /^100%$/ }).first()).toBeVisible();
    await expect(labels.filter({ hasText: /^0%$/ })).toHaveCount(1);
    await recuo.close();

    await page.bringToFront();
    const afastado = await openExample(page, /Brise afastado da parede/);
    await expect(afastado.getByTestId('example-card')).toContainText('Exemplo resolvido 3 de 3');
    await expect(afastado.getByLabel('α (brise horizontal), sombra total')).toHaveValue('55');
    await afastado.getByText('Mais opções').first().click();
    await expect(afastado.getByLabel('α2 (brise horizontal), sombra total')).toHaveValue('20');
    await expect(afastado.getByLabel('Afastamento da fachada (m)')).toHaveValue('0,28');
  });

  test.describe('em espanhol e em inglês', () => {
    test.use({ locale: 'es-AR' });

    test('a ajuda segue o idioma da interface', async ({ page }) => {
      await page.goto('./#local=florianopolis&ajuda=glossario');
      const dialog = page.getByRole('dialog', { name: 'Ayuda' });
      await expect(dialog.getByRole('tab', { name: 'Glosario' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(dialog.getByRole('tabpanel')).toContainText('α (protección horizontal)');
      await dialog.getByRole('button', { name: 'Cerrar la ayuda' }).click();
      await page.getByTestId('language').selectOption('en');
      await page.getByTestId('help-open').click();
      const en = page.getByRole('dialog', { name: 'Help' });
      await expect(en.getByRole('tab', { name: 'Quick guide' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await en.getByRole('tab', { name: 'Examples' }).click();
      await expect(en.getByRole('tabpanel')).toContainText('55° or 57.5°');
    });
  });

  test('axe nas seis partes; no celular, a ajuda ocupa a tela; não sai na impressão', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&ajuda=guia');
    const dialog = page.getByRole('dialog', { name: 'Ajuda' });
    for (const name of [
      'Guia rápido',
      'Exemplos',
      'Exercícios',
      'Glossário',
      'Perguntas',
      'Hipóteses',
    ]) {
      await dialog.getByRole('tab', { name }).click();
      await axe(page);
    }
    const viewport = page.viewportSize()!;
    const box = (await dialog.boundingBox())!;
    if (viewport.width < 640) {
      expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
    } else {
      expect(box.width).toBeLessThan(viewport.width);
    }
    await page.emulateMedia({ media: 'print' });
    await expect(dialog).toBeHidden();
  });
});
