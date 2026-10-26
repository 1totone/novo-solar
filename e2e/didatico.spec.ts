import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// F4.5: modo didático (spec 12, decisão 0033). Tutorial guiado com etapas, condições, "Fazer por
// mim" e realce do painel; exercício de máscara desenhado com o mouse e conferido.

async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}

/** Abre um link da ajuda que vai para uma nova aba e devolve a aba. */
async function openInNewTab(page: Page, link: ReturnType<Page['getByRole']>) {
  const [tab] = await Promise.all([page.context().waitForEvent('page'), link.click()]);
  await tab.waitForLoadState();
  return tab;
}

/** Clica na carta (estereográfica) nas direções dadas, pela matriz do próprio SVG. */
async function clickSky(page: Page, dirs: { altitude: number; azimuth: number }[]) {
  const chart = page.getByTestId('sun-chart');
  await chart.scrollIntoViewIfNeeded();
  const points = await chart.evaluate((svg, list) => {
    const m = (svg as SVGSVGElement).getScreenCTM()!;
    return list.map(({ altitude, azimuth }) => {
      const r = Math.tan(((90 - altitude) * Math.PI) / 180 / 2);
      const a = (azimuth * Math.PI) / 180;
      const p = new DOMPoint(r * Math.sin(a), -r * Math.cos(a)).matrixTransform(m);
      return { x: p.x, y: p.y };
    });
  }, dirs);
  for (const p of points) await page.mouse.click(p.x, p.y);
}

/** Vértices sobre a curva de α externo de um brise infinito, de uma ponta à outra da fachada. */
function alphaCurve(orientation: number, alphaExt: number, n = 25) {
  return Array.from({ length: n }, (_, i) => {
    const psi = -90 + (180 * i) / (n - 1);
    const h =
      (Math.atan(Math.tan((alphaExt * Math.PI) / 180) * Math.cos((psi * Math.PI) / 180)) * 180) /
      Math.PI;
    return { altitude: Math.max(0, h), azimuth: (((orientation + psi) % 360) + 360) % 360 };
  });
}

test.describe('modo didático (F4.5)', () => {
  test('tutorial: abre pela ajuda numa nova aba; etapas, realce, "Fazer por mim" e fim', async ({
    page,
  }) => {
    await page.goto('./#local=recife&o=200&ajuda=guia');
    const tab = await openInNewTab(
      page,
      page.getByRole('link', { name: 'Começar o tutorial guiado numa nova aba' }),
    );
    // A aba de origem não muda.
    await expect(page).toHaveURL(/local=recife/);
    const card = tab.getByTestId('tutorial-card');
    await expect(card).toContainText('Tutorial, etapa 1 de 8');
    await card.getByRole('button', { name: 'Próxima' }).click();
    await expect(card).toContainText('etapa 2 de 8');
    // Etapa do local: o passo 1 fica realçado; a ação ainda não foi feita.
    await expect(tab.locator('html')).toHaveAttribute('data-tutorial', '1');
    const outline = await tab
      .locator('[data-step="1"]')
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe('solid');
    await expect(tab.getByTestId('tutorial-done')).toHaveCount(0);
    await card.getByRole('button', { name: 'Fazer por mim' }).click();
    await expect(tab).toHaveURL(/local=brasilia/);
    await expect(tab.getByTestId('tutorial-done')).toHaveText('Feito.');
    await expect(card.getByRole('button', { name: 'Fazer por mim' })).toHaveCount(0);
    // Carta e fachada: o aluno digita a orientação ele mesmo.
    await card.getByRole('button', { name: 'Próxima' }).click();
    await expect(tab.locator('html')).toHaveAttribute('data-tutorial', 'carta');
    await card.getByRole('button', { name: 'Próxima' }).click();
    await expect(card).toContainText('etapa 4 de 8');
    await tab.getByLabel('Orientação da fachada (azimute da normal externa)').fill('30');
    await expect(tab.getByTestId('tutorial-done')).toBeVisible();
    // α pelo "Fazer por mim": a sombra total aparece na carta.
    await card.getByRole('button', { name: 'Próxima' }).click();
    await card.getByRole('button', { name: 'Fazer por mim' }).click();
    await expect(tab).toHaveURL(/a1=55/);
    await expect(tab.getByTestId('mask-total')).toHaveCount(1);
    await axe(tab);
    // Até o fim: "Concluir o tutorial" tira o cartão e o realce.
    for (let i = 0; i < 3; i++) await card.getByRole('button', { name: 'Próxima' }).click();
    await expect(card).toContainText('etapa 8 de 8');
    await expect(tab.locator('html')).toHaveAttribute('data-tutorial', '5');
    await card.getByRole('button', { name: 'Concluir o tutorial' }).click();
    await expect(card).toHaveCount(0);
    await expect(tab).not.toHaveURL(/tutorial=/);
    await expect(tab.locator('html')).not.toHaveAttribute('data-tutorial', /.*/);
  });

  test('exercício: sem a resposta na carta; desenho pela curva de α, conferido com a resposta hachurada', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&ajuda=exercicios');
    const dialog = page.getByRole('dialog', { name: 'Ajuda' });
    await expect(dialog.getByRole('tabpanel')).toContainText('interseção dividida pela união');
    const tab = await openInNewTab(
      page,
      dialog
        .getByRole('article', { name: '1. Brise horizontal infinito' })
        .getByRole('link', { name: 'Abrir o exercício numa nova aba' }),
    );
    const card = tab.getByTestId('exercise-card');
    await expect(card).toContainText('Exercício 1 de 4');
    await expect(card).toContainText('α = 45°');
    // A carta não mostra a resposta: nenhuma máscara e o campo de α vazio.
    await expect(tab.getByTestId('mask-total')).toHaveCount(0);
    await expect(tab.getByLabel('α (brise horizontal), sombra total')).toHaveValue('');
    await card.getByRole('button', { name: 'Começar a desenhar' }).click();
    // O painel do passo 3 abre "Mais opções" com os botões do desenho.
    await expect(tab.getByRole('button', { name: 'Concluir polígono' })).toBeVisible();
    await clickSky(tab, alphaCurve(0, 45));
    await tab.getByRole('button', { name: 'Concluir polígono' }).click();
    await expect(tab).toHaveURL(/dt=/);
    await expect(card).toContainText('Polígonos desenhados: 1.');
    await card.getByRole('button', { name: 'Conferir' }).click();
    await expect(tab).toHaveURL(/conferir=1/);
    const score = tab.getByTestId('exercise-score');
    await expect(score).toBeVisible({ timeout: 15_000 });
    const value = Number((await score.textContent())!.match(/(\d+)%/)![1]);
    expect(value).toBeGreaterThanOrEqual(95);
    await expect(card).toContainText('A máscara coincide com a calculada.');
    await expect(tab.getByTestId('exercise-sun')).toBeVisible();
    await expect(tab.getByTestId('mask-answer-layer')).toHaveCount(1);
    await expect(tab.getByText('máscara calculada (resposta do exercício)')).toBeVisible();
    await axe(tab);

    // De novo, com um triângulo pequeno perto do zênite: pouca coincidência.
    await tab.getByRole('button', { name: 'Parar de desenhar' }).click();
    await card.getByRole('button', { name: 'Apagar o desenho e tentar de novo' }).click();
    await expect(tab).not.toHaveURL(/dt=|conferir=/);
    await expect(tab.getByTestId('mask-answer-layer')).toHaveCount(0);
    await card.getByRole('button', { name: 'Começar a desenhar' }).click();
    await clickSky(tab, [
      { altitude: 70, azimuth: 330 },
      { altitude: 70, azimuth: 30 },
      { altitude: 80, azimuth: 0 },
    ]);
    await tab.getByRole('button', { name: 'Concluir polígono' }).click();
    await card.getByRole('button', { name: 'Conferir' }).click();
    await expect(card).toContainText('Confira as curvas do transferidor e desenhe de novo.', {
      timeout: 15_000,
    });
    await card.getByRole('button', { name: 'Sair do exercício' }).click();
    await expect(card).toHaveCount(0);
    await expect(tab).not.toHaveURL(/exercicio=/);
  });
});
