import { expect, test, type Page } from '@playwright/test';
import { stepDetails, stepHeader } from './fixtures/steps';

// Atalho entre passos (decisão 0040): só aparece com um passo avançado aberto; cada número abre o
// passo (acordeão, decisão 0044), sem ele ficar escondido sob a carta (celular) ou sob a própria
// barra (computador).
const ADVANCED = '#local=florianopolis&o=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i';

/** O título do passo está na tela e não fica sob o que é fixo no alto. */
async function headingUncovered(page: Page, n: number) {
  const heading = page
    .locator('.steps .step-panel h2')
    .filter({ hasText: String(n) })
    .first();
  await expect(heading).toBeInViewport();
  const box = (await heading.boundingBox())!;
  const covers = await page.evaluate(() =>
    ['.chart-section', '.step-nav'].flatMap((s) => {
      const el = document.querySelector(s);
      if (!el || getComputedStyle(el).position !== 'sticky') return [];
      const r = el.getBoundingClientRect();
      return [{ top: r.top, bottom: r.bottom, left: r.left, right: r.right }];
    }),
  );
  for (const c of covers) {
    const overlapX = Math.min(box.x + box.width, c.right) - Math.max(box.x, c.left);
    const overlapY = Math.min(box.y + box.height, c.bottom) - Math.max(box.y, c.top);
    expect(overlapX > 0 && overlapY > 0, `título do passo ${n} sob uma área fixa`).toBe(false);
  }
}

test('no caminho básico, sem passo avançado aberto, a barra não aparece', async ({ page }) => {
  await page.goto('./#local=florianopolis&o=30&a1=55');
  await expect(page.getByTestId('sun-chart')).toBeVisible();
  await expect(page.getByTestId('step-nav')).toHaveCount(0);
});

test('com o passo 6 aberto, a barra abre cada passo e marca o aberto', async ({ page }) => {
  await page.goto(`./${ADVANCED}`);
  // Espera o mapa do ano, que muda a altura do passo 6 quando chega.
  await expect(page.getByTestId('month-hour-map')).toBeAttached({ timeout: 20000 });
  await expect(page.getByTestId('annual-pending')).toHaveCount(0);
  const nav = page.getByTestId('step-nav');
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('button')).toHaveCount(7);
  await expect(page.getByTestId('step-nav-6')).toHaveAttribute('aria-current', 'step');

  // Passos em acordeão (decisão 0044): o número abre o passo e fecha o aberto.
  await page.getByTestId('step-nav-7').click();
  await expect(stepDetails(page, '7')).toHaveAttribute('open', '');
  await expect(stepDetails(page, '6')).not.toHaveAttribute('open', '');
  await expect(stepHeader(page, '7')).toBeFocused();
  await expect(page.getByTestId('step-nav-7')).toHaveAttribute('aria-current', 'step');
  await headingUncovered(page, 7);
  await expect(nav).toBeInViewport();

  // Um passo do caminho básico: abre, recebe o foco, e a barra sai (nenhum avançado aberto).
  await page.getByTestId('step-nav-4').click();
  await expect(stepDetails(page, '4')).toHaveAttribute('open', '');
  await expect(stepHeader(page, '4')).toBeFocused();
  await headingUncovered(page, 4);
  await expect(nav).toHaveCount(0);
});

test('no celular, a barra fica no pé da tela', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'leiaute de uma coluna');
  // Com dados, o passo 7 é longo (classificação e indicadores): a barra fica presa ao pé da tela.
  await page.goto(`./${ADVANCED}&hist=1`);
  await page.getByTestId('step-nav-7').click();
  await expect(stepDetails(page, '7')).toHaveAttribute('open', '');
  const box = (await page.getByTestId('step-nav').boundingBox())!;
  const height = page.viewportSize()!.height;
  expect(Math.abs(box.y + box.height - height)).toBeLessThan(2);
  // Botões de pelo menos 40 px para o dedo.
  const button = (await page.getByTestId('step-nav-5').boundingBox())!;
  expect(button.height).toBeGreaterThanOrEqual(40);
});
