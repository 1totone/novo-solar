import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { svgColors } from './fixtures/pixels';
import { loadClimateFile } from './fixtures/steps';

// F3.4: classificação das horas no passo 7, com as hipóteses na tela. EPWs sintéticos num local
// como Florianópolis, com radiação direta normal de 600 Wh/m² das 6 às 18 h (linhas 7 a 18).
const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';
const dni = (_m: number, _d: number, h: number) => (h >= 7 && h <= 18 ? 600 : 0);

async function loadEpw(
  page: Page,
  name: string,
  dryBulb: (m: number, d: number, h: number) => number,
) {
  await loadClimateFile(page, {
    name,
    mimeType: 'text/plain',
    buffer: Buffer.from(syntheticEpw(FLORIPA, dryBulb, 'Teste do passo 7', dni)),
  });
  await expect(page.getByTestId('site-info')).toContainText(name);
}

async function openStep7(page: Page) {
  const panel = page.getByTestId('effect-panel');
  if ((await panel.locator('details').first().getAttribute('open')) === null) {
    await panel.locator('summary').first().click();
  }
  return panel;
}

/** Linha da tabela das classes: horas, % das horas, kWh/m², % da radiação. */
async function row(page: Page, cls: 'cold' | 'neutral' | 'hot' | 'none') {
  const cells = await page
    .getByTestId('classes-table')
    .locator(`tr[data-class="${cls}"] td`)
    .allTextContents();
  return cells.map((c) => Number(c.replace(',', '.')));
}

type Rgb = [number, number, number];
const isBlue = ([r, , b]: Rgb) => b - r > 80 && b > 150;
const isRed = ([r, g, b]: Rgb) => r - b > 80 && r > 150 && g < 110;
const isGrey = ([r, g, b]: Rgb) =>
  Math.abs(r - 229) < 12 && Math.abs(g - 228) < 12 && Math.abs(b - 226) < 12;

/** Cores da barra em frações da largura (0 a 1). */
async function barColors(page: Page, testId: string, fractions: number[]) {
  const bar = page.getByTestId(testId);
  await bar.evaluate((el) => el.scrollIntoView({ block: 'end' }));
  return svgColors(
    bar,
    fractions.map((f) => ({ x: 300 * f, y: 11 })),
    1,
  );
}

test.describe('passo 7: classificação das horas (F3.4)', () => {
  test('sem dados horários, o passo pede os dados', async ({ page }) => {
    await page.goto('./#local=manaus');
    await openStep7(page);
    await expect(page.getByTestId('effect-needs-data')).toContainText('dados horários do clima');
    await expect(page.getByTestId('classes-results')).toHaveCount(0);
  });

  test('faixa adaptativa: 22 °C constante é neutra; com ΔT = 8 °C, quente (barra e hipóteses)', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0&cm=a');
    await loadEpw(page, 'constante22.epw', () => 22);
    const panel = await openStep7(page);
    // t_pma = 22 °C: conforto 0,31 · 22 + 17,8 = 24,62 °C, faixa de 80% de 21,12 a 28,12 °C.
    await expect(page.getByTestId('classes-results')).toBeVisible({ timeout: 20000 });
    const hypotheses = page.getByTestId('classes-hypotheses');
    await expect(hypotheses).toContainText('ASHRAE 55-2023, 80% de aceitabilidade');
    await expect(hypotheses).toContainText('tende a subestimar as horas quentes');
    await expect(hypotheses).toContainText('Sem acréscimo por ganhos (ΔT = 0)');
    await expect(hypotheses).toContainText('não das 8760 horas do ano');
    const [hours, share] = await row(page, 'neutral');
    expect(hours).toBeGreaterThan(1000);
    expect(share).toBe(100);
    const [neutral] = await barColors(page, 'class-bar-radiation', [0.5]);
    expect(isGrey(neutral!), `barra neutra: ${neutral}`).toBe(true);

    // ΔT = 8 °C: os limites descem para 13,12 e 20,12 °C, e 22 °C passa a quente.
    await panel.getByTestId('classes-gains').fill('8');
    await expect(page).toHaveURL(/cg=8/);
    await expect(hypotheses).toContainText('os limites descem ΔT = 8,0 °C');
    await expect.poll(async () => (await row(page, 'hot'))[1]).toBe(100);
    expect((await row(page, 'hot'))[0]).toBe(hours);
    const [hot] = await barColors(page, 'class-bar-radiation', [0.5]);
    expect(isRed(hot!), `barra quente: ${hot}`).toBe(true);

    await panel.getByTestId('classes-gains').fill('15');
    await expect(panel.getByRole('alert')).toContainText('campos inválidos');
    await expect(page.getByTestId('classes-results')).toHaveCount(0);
  });

  test('limiar de 20 °C por padrão, com a fonte; partes da barra iguais às da tabela (pixels)', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&o=0');
    // 15 °C até a linha 12 e 25 °C da 13 em diante: com a média do início e do fim da hora, a hora
    // 13 (12 a 13 h) vale 20 °C e empata (neutra), a manhã é fria e a tarde, quente.
    await loadEpw(page, 'manha-tarde.epw', (_m, _d, h) => (h <= 12 ? 15 : 25));
    const panel = await openStep7(page);
    // Padrão (decisão 0024): limiares de 20 °C sem nada no link.
    await expect(panel.getByTestId('classes-method-thresholds')).toBeChecked();
    await expect(panel.getByTestId('classes-cold')).toHaveValue('20');
    await expect(panel.getByTestId('classes-hot')).toHaveValue('20');
    expect(page.url()).not.toMatch(/cm=/);
    await expect(panel).toContainText('Lamberts, Dutra e Pereira (2014');
    const hypotheses = page.getByTestId('classes-hypotheses');
    await expect(hypotheses).toContainText('Limiar de 20 °C (padrão)');
    // Editar um limiar grava os dois no link; apagar um deixa-o sem limite.
    await panel.getByTestId('classes-cold').fill('18');
    await expect(page).toHaveURL(/cm=l/);
    await expect(page).toHaveURL(/tf=18/);
    await expect(page).toHaveURL(/tq=20/);
    await expect(hypotheses).toContainText('hora fria abaixo de 18,0 °C; quente acima de 20,0 °C');
    await panel.getByTestId('classes-cold').fill('');
    await expect(hypotheses).toContainText('Limiares: sem horas frias; quente acima de 20,0 °C');
    await panel.getByTestId('classes-suggest20').click();
    await expect(panel.getByTestId('classes-cold')).toHaveValue('20');
    expect(page.url()).not.toMatch(/cm=|tf=|tq=/);
    await expect(hypotheses).toContainText('Limiar de 20 °C (padrão)');
    await expect(page.getByTestId('classes-results')).toBeVisible({ timeout: 20000 });
    const cold = await row(page, 'cold');
    const neutral = await row(page, 'neutral');
    const hot = await row(page, 'hot');
    expect(cold[0]! > 0 && neutral[0]! > 0 && hot[0]! > 0).toBe(true);
    expect(cold[3]! + neutral[3]! + hot[3]!).toBeGreaterThanOrEqual(99);
    // Barra da radiação: frias, neutras e quentes nessa ordem, cada uma no meio da sua parte.
    const [c, n, q] = [cold[3]! / 100, neutral[3]! / 100, hot[3]! / 100];
    const [blue, grey, red] = await barColors(page, 'class-bar-radiation', [
      c / 2,
      c + n / 2,
      c + n + q / 2,
    ]);
    expect(isBlue(blue!), `frias: ${blue}`).toBe(true);
    expect(isGrey(grey!), `neutras: ${grey}`).toBe(true);
    expect(isRed(red!), `quentes: ${red}`).toBe(true);

    // Temperatura da hora no fim da hora (o valor do arquivo): a hora 13 vale 25 °C e vira quente.
    await panel.getByText('Mais opções').click();
    await panel.getByTestId('classes-hour-end').check();
    await expect(page).toHaveURL(/ct=f/);
    await expect(page.getByTestId('classes-hypotheses')).toContainText('a do fim da hora');
    await expect.poll(async () => (await row(page, 'neutral'))[0]).toBe(0);
  });

  test('temperatura de equilíbrio sem valor padrão; teclado e axe', async ({ page }) => {
    await page.goto('./#local=florianopolis&o=0');
    await loadEpw(page, 'constante22.epw', () => 22);
    const panel = await openStep7(page);
    const radio = panel.getByTestId('classes-method-adaptive');
    await radio.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(panel.getByTestId('classes-method-balance')).toBeChecked();
    await expect(page).toHaveURL(/cm=e/);
    await expect(page.getByTestId('classes-incomplete')).toBeVisible();
    await panel.getByTestId('classes-balance').fill('21');
    await expect(page.getByTestId('classes-hypotheses')).toContainText(
      'Temperatura de equilíbrio de 21,0 °C',
    );
    await expect.poll(async () => (await row(page, 'hot'))[1]).toBe(100);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
