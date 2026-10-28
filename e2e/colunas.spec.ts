import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { stepPanel } from './fixtures/steps';

// Leiaute em colunas (decisão 0050): no computador, a aplicação ocupa a janela inteira, sem rolar a
// página; três colunas a partir de 75rem (passos 1 a 3, a carta, passos 4 a 7), duas de 52rem a
// 75rem. Só as colunas rolam, e só para o que é secundário: os campos principais dos passos 1 a 5
// ficam à vista ao chegar.
const STATE = '#local=florianopolis&hist=1&dado=tbs';
const SCREENS = [
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1920, height: 1080 },
];

/** Altura e largura do documento: iguais às da janela quando a página não rola. */
const documentSize = (page: Page) =>
  page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
  }));

/**
 * A carta desenhada (o viewBox do SVG na tela): o SVG preenche a moldura e o desenho se ajusta a ela
 * sem deformar, então a caixa do elemento pode ser maior que o desenho.
 */
const drawnChart = (page: Page) =>
  page.locator('#panel-chart svg.sun-chart').evaluate((svg: SVGSVGElement) => {
    const m = svg.getScreenCTM()!;
    const vb = svg.viewBox.baseVal;
    const left = m.a * vb.x + m.e;
    const top = m.d * vb.y + m.f;
    return { left, top, width: m.a * vb.width, height: m.d * vb.height };
  });

/**
 * Inteiro à vista sem rolar: dentro da janela e de cada caixa que corta o que passa dela (as colunas
 * que rolam), com as colunas no alto.
 */
const fullyVisible = (locator: Locator) =>
  locator.evaluate((el) => {
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return 'sem tamanho';
    const inside = (r: DOMRect) =>
      box.top >= r.top - 0.5 &&
      box.bottom <= r.bottom + 0.5 &&
      box.left >= r.left - 0.5 &&
      box.right <= r.right + 0.5;
    if (!inside(new DOMRect(0, 0, window.innerWidth, window.innerHeight))) return 'fora da janela';
    for (let p = el.parentElement; p; p = p.parentElement) {
      const style = getComputedStyle(p);
      if (style.overflowY === 'visible' && style.overflowX === 'visible') continue;
      if (p.scrollTop !== 0) return 'coluna rolada';
      if (!inside(p.getBoundingClientRect())) return `cortado por ${p.className}`;
    }
    return 'ok';
  });

/** Campos principais de cada passo do caminho básico (o que a pessoa precisa para fazer o passo). */
function mainFields(page: Page): [string, Locator][] {
  const step = (n: '1' | '2' | '3' | '4' | '5') => stepPanel(page, n);
  return [
    ['cidade', step('1').getByLabel('Cidade', { exact: true })],
    ['dados horários', step('1').getByLabel('Dados horários', { exact: true })],
    ['abrir arquivo', step('1').locator('.file-btn')],
    ['pintar na carta', step('1').getByLabel('Pintar na carta')],
    ['orientação', page.getByLabel('Orientação da fachada (azimute da normal externa)')],
    ['rumo NO', page.getByTestId('compass-315')],
    ['rumo SE', page.getByTestId('compass-135')],
    ['referência', step('3').getByRole('radio', { name: 'Externa' })],
    ['α', page.getByTestId('angle-a1')],
    ['β esquerda', page.getByTestId('angle-be1')],
    ['β direita', page.getByTestId('angle-bd1')],
    ['γ esquerda', page.getByTestId('angle-ge1')],
    ['γ direita', page.getByTestId('angle-gd1')],
    ['variável', step('4').getByLabel('Variável')],
    ['período', step('4').getByRole('radio', { name: '22/jun a 21/dez' })],
    ['faixas', page.getByTestId('band-4')],
    ['raio', page.getByTestId('print-radius')],
    ['imprimir', page.getByRole('button', { name: 'Imprimir ou salvar em PDF' })],
    ['SVG', page.getByTestId('export-svg')],
    ['copiar', page.getByTestId('export-copy')],
  ];
}

test.describe('leiaute em colunas no computador (decisão 0050)', () => {
  test.skip(({ isMobile }) => isMobile, 'leiaute do computador');

  for (const screen of SCREENS) {
    test(`${screen.width} × ${screen.height}: sem rolar a página, carta inteira e grande, campos à vista`, async ({
      page,
    }) => {
      await page.setViewportSize(screen);
      await page.goto(`./${STATE}`);
      await expect(page.getByTestId('overlay-legend')).toBeVisible();
      // O conteúdo dos passos 2 a 5 chega depois da carta (decisão 0039).
      await expect(page.getByTestId('print-radius')).toBeVisible();

      // Página do tamanho da janela, sem rolagem nem largura máxima.
      expect(await documentSize(page)).toEqual(screen);
      const columns = page.locator('.workspace > *');
      await expect(columns).toHaveCount(3);
      const [left, middle, right] = await Promise.all(
        [0, 1, 2].map(async (i) => (await columns.nth(i).boundingBox())!),
      );
      expect(left!.x).toBeLessThan(24);
      expect(right!.x + right!.width).toBeGreaterThan(screen.width - 24);
      expect(left!.x + left!.width).toBeLessThanOrEqual(middle!.x);
      expect(middle!.x + middle!.width).toBeLessThanOrEqual(right!.x);
      // Cabeçalho numa linha só.
      expect((await page.locator('.header').boundingBox())!.height).toBeLessThan(60);

      // Carta inteira na janela, com pelo menos 60% da altura dela.
      const chart = await drawnChart(page);
      expect(chart.top).toBeGreaterThanOrEqual(0);
      expect(chart.left).toBeGreaterThanOrEqual(middle!.x - 1);
      expect(chart.top + chart.height).toBeLessThanOrEqual(screen.height);
      expect(chart.left + chart.width).toBeLessThanOrEqual(middle!.x + middle!.width + 1);
      expect(chart.height).toBeGreaterThanOrEqual(0.6 * screen.height);

      // Campos principais dos passos 1 a 5 à vista, sem rolar nada.
      for (const [name, field] of mainFields(page)) {
        expect(await fullyVisible(field), name).toBe('ok');
      }
    });
  }

  test('passos 1 a 3 à esquerda, 4 a 7 à direita; o teclado vai da esquerda para a direita; axe', async ({
    page,
  }) => {
    await page.setViewportSize(SCREENS[0]!);
    await page.goto(`./${STATE}`);
    await expect(page.getByTestId('print-radius')).toBeVisible();
    const left = page.locator('.steps-left');
    const right = page.locator('.steps-right');
    for (const n of ['1', '2', '3'] as const) {
      await expect(left.locator(`[data-step="${n}"]`)).toHaveCount(1);
    }
    for (const id of ['data-panel', 'outputs-panel', 'geometry-panel', 'effect-panel']) {
      await expect(right.getByTestId(id)).toHaveCount(1);
    }
    // Sem acordeão no computador: os passos 1 a 5 não abrem nem fecham, e não há "Próximo".
    await expect(page.locator('.steps [data-step] > details')).toHaveCount(0);
    await expect(page.locator('[data-testid^="next-step"]')).toHaveCount(0);

    // Ordem do Tab: cabeçalho, coluna da esquerda, carta, coluna da direita, cada uma uma vez só.
    const regions: string[] = [];
    await page.locator('body').focus();
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press('Tab');
      const region = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'fim';
        if (el.closest('.header')) return 'cabeçalho';
        if (el.closest('.steps-left')) return 'esquerda';
        if (el.closest('.chart-section')) return 'carta';
        if (el.closest('.steps-right')) return 'direita';
        return 'outro';
      });
      if (region === 'fim' || (regions.length > 1 && region === 'cabeçalho')) break;
      if (regions.at(-1) !== region) regions.push(region);
    }
    expect(regions).toEqual(['cabeçalho', 'esquerda', 'carta', 'direita']);

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations).toEqual([]);
  });

  test('passo avançado aberto: resultados na coluna da direita, sem rolar a página', async ({
    page,
  }) => {
    await page.setViewportSize(SCREENS[0]!);
    // O link traz a classificação das horas: o passo 7 abre e vem para o alto da coluna dele.
    await page.goto(
      './#local=florianopolis&hist=1&o=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i&cm=l&tf=20&tq=20',
    );
    const right = page.locator('.steps-right');
    await expect(right.getByTestId('classes-results')).toBeAttached({ timeout: 20000 });
    await expect(right.getByTestId('indicators-section')).toBeAttached();
    await expect(
      right.locator('[data-testid="effect-panel"] > details > summary'),
    ).toBeInViewport();
    // A carta continua inteira ao lado, e a página não rola.
    expect(await documentSize(page)).toEqual(SCREENS[0]);
    expect((await drawnChart(page)).height).toBeGreaterThanOrEqual(0.6 * SCREENS[0]!.height);
    // Passo 6: o mapa mês × hora logo abaixo do formulário, na mesma coluna.
    await right.locator('[data-testid="geometry-panel"] > details > summary').click();
    await expect(right.getByTestId('month-hour-map')).toBeAttached({ timeout: 20000 });
    await expect(page.locator('.chart-section').getByTestId('month-hour-map')).toHaveCount(0);
    expect(await documentSize(page)).toEqual(SCREENS[0]);
  });

  test('explicações atrás do botão "i": abrem e fecham sem alongar o passo à toa', async ({
    page,
  }) => {
    await page.setViewportSize(SCREENS[0]!);
    await page.goto(`./${STATE}`);
    const help = page.getByTestId('facade-help');
    await expect(help).toBeHidden();
    const button = page.getByTestId('facade-info');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveAccessibleName('Explicação: Orientação');
    await button.click();
    await expect(help).toBeVisible();
    await expect(help).toContainText('Graus a partir do Norte');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await button.click();
    await expect(help).toBeHidden();
    // Os dados do local numa linha; o resto sob demanda.
    const line = page.getByTestId('site-line');
    await expect(line).toContainText(
      '-27,670°, -48,547° · UTC−3 · 6 m · TRY do SOL-AR 6.2 · 1 aviso',
    );
    await expect(page.getByTestId('site-source')).toBeHidden();
    await line.click();
    await expect(page.getByTestId('site-source')).toBeVisible();
    await expect(page.getByTestId('site-period')).toHaveText(
      'ano de referência escolhido entre 1961 e 1970',
    );
    expect(await documentSize(page)).toEqual(SCREENS[0]);
  });

  test('largura média (1024 × 768): duas colunas, os passos e a carta, sem rolar a página', async ({
    page,
  }) => {
    const screen = { width: 1024, height: 768 };
    await page.setViewportSize(screen);
    await page.goto(`./${STATE}`);
    await expect(page.getByTestId('overlay-legend')).toBeVisible();
    expect(await documentSize(page)).toEqual(screen);
    const steps = (await page.locator('.workspace > .steps').boundingBox())!;
    const chartColumn = (await page.locator('.chart-section').boundingBox())!;
    expect(steps.x + steps.width).toBeLessThanOrEqual(chartColumn.x);
    const chart = await drawnChart(page);
    expect(chart.top + chart.height).toBeLessThanOrEqual(screen.height);
    expect(chart.height).toBeGreaterThanOrEqual(0.6 * screen.height);
    // A coluna dos passos rola sozinha; a carta fica onde está.
    await page.getByTestId('print-radius').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('print-radius')).toBeInViewport();
    expect((await drawnChart(page)).top).toBeCloseTo(chart.top, 0);
    expect(await documentSize(page)).toEqual(screen);
  });
});
