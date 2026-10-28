import { expect, test } from '@playwright/test';
import { isAccordion } from './fixtures/steps';

// Carregamento sob demanda (decisão 0039): o caminho básico não baixa o código dos passos 6 e 7
// nem o da vista 3D; abrir o passo baixa o dele, e o passo aparece igual.
test('o caminho básico não baixa os passos avançados; abrir o passo 6 baixa só o dele', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname.split('/').pop()!);
  });
  await page.goto('./#local=florianopolis&o=30&a1=55');
  await expect(page.getByTestId('sun-chart')).toBeVisible();
  await expect(page.getByTestId('geometry-summary')).toHaveText(
    'Janela, brise, aletas e lâminas em metros; corte, vista e sombra na carta.',
  );
  await page.waitForLoadState('networkidle');
  const lazy = /^(GeometryPanel|EffectPanel|View3DPanel|scene3d|WindPanel)-/;
  expect(scripts.filter((s) => lazy.test(s))).toEqual([]);

  // Abrir pelo teclado: o foco continua no resumo do passo depois de o código chegar.
  await page.getByTestId('geometry-panel').locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('geometry-start')).toBeVisible();
  await expect(page.getByTestId('geometry-panel').locator('summary')).toBeFocused();
  expect(scripts.some((s) => s.startsWith('GeometryPanel-'))).toBe(true);
  expect(scripts.some((s) => s.startsWith('EffectPanel-'))).toBe(false);
});

// Com o acordeão (decisão 0044), o conteúdo dos passos 2 a 5 sai do bloco inicial e chega no tempo
// ocioso depois da carta: abrir o passo não espera.
test('passos 2 a 5: fora do bloco inicial, chegam depois da carta; o foco fica no passo aberto', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname.split('/').pop()!);
  });
  await page.goto('./#local=florianopolis&o=30&a1=55');
  await expect(page.getByTestId('sun-chart')).toBeVisible();
  const steps = /(FacadePanel|ProtectionPanel|DataPanel|OutputsPanel|ProjectSection)-/;
  // Fora do bloco inicial: a página não os pede (os do bloco estão no HTML como modulepreload;
  // o orçamento confere também as importações estáticas).
  const html = await (await page.request.get('./')).text();
  expect(html).not.toMatch(steps);
  await expect.poll(() => scripts.filter((s) => steps.test(s)).length, { timeout: 10_000 }).toBe(5);

  // No computador, os passos ficam abertos (decisão 0050): o conteúdo chega sozinho.
  if (!isAccordion(page)) {
    await expect(page.getByRole('radio', { name: 'norte (0°)' })).toBeVisible();
    await expect(page.getByTestId('angle-a1')).toHaveValue('55');
    return;
  }
  // No celular, os resumos estão lá desde o início; o conteúdo aparece ao abrir, com o foco no resumo.
  await expect(page.getByTestId('facade-summary')).toHaveText('Fachada 30° (NNE)');
  await expect(page.getByTestId('protection-summary')).toHaveText('Brise α 55°');
  await page.getByTestId('facade-panel').locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('radio', { name: 'norte (0°)' })).toBeVisible();
  await expect(page.getByTestId('facade-panel').locator('summary')).toBeFocused();
  await page.getByTestId('next-step-3').click();
  await expect(page.getByTestId('angle-a1')).toHaveValue('55');
});

test('um link com a janela abre o passo 6 já carregado, com o resumo da geometria', async ({
  page,
}) => {
  await page.goto('./#local=florianopolis&o=0&jl=1%2C5&ja=1%2C2&pc1=b_0%2C8_0%2C1__i_i');
  await expect(page.getByTestId('geometry-summary')).toHaveText(
    'Janela de 1,50 × 1,20 m · 1 peça(s)',
  );
  await expect(page.getByTestId('geometry-panel').locator('details')).toHaveAttribute('open', '');
});

// Fase 4 (decisão 0039): espanhol e inglês, ajuda, modo didático e catálogo também sob demanda.
test('o caminho básico não baixa idiomas, ajuda, modo didático nem catálogo', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname.split('/').pop()!);
  });
  await page.goto('./#local=florianopolis&o=30&a1=55');
  await expect(page.getByTestId('sun-chart')).toBeVisible();
  await page.waitForLoadState('networkidle');
  const lazy =
    /^(messages\.(es|en)|help\.|HelpDialog|ExampleCard|TutorialCard|ExerciseCard|CatalogSection|tmyx-brasil|brasil-ufs)-/;
  expect(scripts.filter((s) => lazy.test(s))).toEqual([]);

  // A ajuda chega ao abrir, no idioma da interface.
  await page.getByTestId('help-open').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(scripts.some((s) => s.startsWith('HelpDialog-'))).toBe(true);
  expect(scripts.some((s) => s.startsWith('help.pt-BR-'))).toBe(true);
  expect(scripts.some((s) => s.startsWith('help.en-'))).toBe(false);
  await page.keyboard.press('Escape');

  // Outro idioma: só o catálogo dele, e a página troca de uma vez.
  await page.getByTestId('language').selectOption('es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByTestId('help-open')).toHaveText('Ayuda');
  expect(scripts.some((s) => s.startsWith('messages.es-'))).toBe(true);
  expect(scripts.some((s) => s.startsWith('messages.en-'))).toBe(false);
});

test('um navegador em inglês abre direto em inglês, sem passar pelo português', async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
  const page = await context.newPage();
  const seen: string[] = [];
  page.on('console', () => {});
  await page.exposeFunction('__seen', (text: string) => seen.push(text));
  await page.addInitScript(() => {
    new MutationObserver(() => {
      const h1 = document.querySelector('.tagline');
      if (h1?.textContent)
        (window as unknown as { __seen: (t: string) => void }).__seen(h1.textContent);
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto(new URL('./#local=florianopolis', test.info().project.use.baseURL).href);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('sun-chart')).toBeVisible();
  // Nenhum texto do cabeçalho apareceu em português antes do inglês.
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.every((t) => !t.startsWith('Carta solar, transferidor'))).toBe(true);
  await context.close();
});

test('o catálogo chega ao abrir, com o mapa dentro do passo 1', async ({ page }) => {
  await page.goto('./#local=florianopolis');
  const catalog = page.getByTestId('catalog');
  await expect(catalog.locator('summary')).toContainText('579');
  await catalog.locator('summary').focus();
  await page.keyboard.press('Enter');
  const map = page.getByTestId('catalog-map');
  await expect(map).toBeVisible({ timeout: 20000 });
  await expect(catalog.locator('summary')).toBeFocused();
  // Com as colunas (decisão 0050), o mapa fica no próprio passo 1, que rola na coluna dele.
  await expect(catalog.getByTestId('catalog-map')).toBeVisible();
});

// A aba da rosa dos ventos também chega só quando escolhida (decisão 0044, espaço no orçamento).
test('a rosa dos ventos é baixada só quando a aba abre', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname.split('/').pop()!);
  });
  await page.goto('./#local=florianopolis&hist=1');
  await expect(page.getByTestId('sun-chart')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(scripts.some((s) => s.startsWith('WindPanel-'))).toBe(false);
  await page.getByRole('tab', { name: 'Rosa dos ventos' }).click();
  await expect(page.getByTestId('wind-rose')).toBeVisible();
  expect(scripts.some((s) => s.startsWith('WindPanel-'))).toBe(true);
});
