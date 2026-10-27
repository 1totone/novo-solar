import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { svgColors } from './fixtures/pixels';

// F3.1: passo 6, proteção pelas dimensões. Caso da Figura 22 do tutorial do SOL-AR da UFU: janela
// de 2,00 × 1,00 m com o vidro 15 cm atrás da face da parede, brise de 1,28 m na verga,
// prolongamentos de 1,20 m (direita) e 1,70 m (esquerda): α 55°, γ direita 50°, γ esquerda 60°.
const TUTORIAL = '#local=brasilia&o=30&jl=2&ja=1&jr=0%2C15&pc1=b_1%2C28___1%2C7_1%2C2';

type Rgb = [number, number, number];
const isDark = ([r, g, b]: Rgb) => r + g + b < 300;
const isGlass = ([r, g, b]: Rgb) => b > 245 && r < 235 && g > 230;
const isWall = ([r, g, b]: Rgb) =>
  Math.abs(r - 234) < 10 && Math.abs(g - 238) < 10 && Math.abs(b - 242) < 10;
const isWhite = ([r, g, b]: Rgb) => r > 250 && g > 250 && b > 250;
const isGlassLine = ([r, , b]: Rgb) => b > 170 && r < 90;

/**
 * Rola o desenho para a parte de baixo da tela (no celular, a carta fixa ocupa o topo), depois que
 * as curvas da carta chegam do worker: a legenda delas muda a altura da área fixa.
 */
async function reveal(svg: Locator) {
  const page = svg.page();
  await expect(page.getByTestId('shading-pending')).toHaveCount(0);
  await svg.evaluate((el) => el.scrollIntoView({ block: 'end' }));
}

/** Abre o passo 6 se estiver fechado (ele abre sozinho quando o link já traz uma janela). */
async function openStep6(page: Page) {
  const panel = page.getByTestId('geometry-panel');
  if ((await panel.locator('details').first().getAttribute('open')) === null) {
    await panel.locator('summary').click();
  }
  return panel;
}

test.describe('passo 6: proteção pelas dimensões (F3.1)', () => {
  test('o fluxo básico não muda: passos 6 e 7 recolhidos no fim, sem chaves novas no link', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis');
    const headings = page.locator('.steps h2');
    await expect(headings).toHaveText([
      /1\s*Local/,
      /2\s*Fachada/,
      /3\s*Proteção/,
      /4\s*Dados sobre a carta/,
      /5\s*Imprimir e exportar/,
      // F4.3 (decisão 0025): opções da carta no grupo "Avançado", sem número, antes do passo 6.
      /Projeção e linhas horárias/,
      /6\s*Proteção pelas dimensões/,
      /7\s*Efeito no ano/,
    ]);
    const panel = page.getByTestId('geometry-panel');
    await expect(panel.locator('details').first()).not.toHaveAttribute('open');
    await expect(page.getByTestId('effect-panel').locator('details').first()).not.toHaveAttribute(
      'open',
    );
    await expect(page.getByTestId('chart-options-panel').locator('details')).not.toHaveAttribute(
      'open',
    );
    await expect(page.getByTestId('geometry-start')).toBeHidden();
    await expect(page.getByTestId('geometry-summary')).toContainText('Janela, brise');
    expect(page.url()).not.toMatch(/jl=|pc1=|proj=|hl=/);
  });

  test('janela e brise do tutorial: corte e vista com os ângulos, as cotas e as cores', async ({
    page,
  }) => {
    await page.goto('./#local=brasilia&o=30');
    await openStep6(page);
    await page.getByTestId('geometry-start').click();
    await expect(page).toHaveURL(/jl=1%2C2/);
    await expect(page).toHaveURL(/ja=1/);
    await page.getByTestId('geometry-width').fill('2');
    await page.getByTestId('geometry-setback').fill('0,15');
    await page.getByTestId('piece-add-type').selectOption('b');
    await page.getByTestId('piece-add').click();
    await page.getByTestId('piece-0-depth').fill('1,28');
    await page.getByTestId('piece-0-extendLeft').fill('1,7');
    await page.getByTestId('piece-0-extendRight').fill('1,2');
    await expect(page).toHaveURL(/pc1=b_1%2C28___1%2C7_1%2C2/);
    await expect(page.getByTestId('geometry-summary')).toHaveText(
      'Janela de 2,00 × 1,00 m · 1 peça(s)',
    );

    const section = page.getByTestId('geometry-section');
    const elevation = page.getByTestId('geometry-elevation');
    await expect(section.getByText('α 55,0°')).toBeVisible();
    await expect(elevation.getByText('γ dir. 50,2°')).toBeVisible();
    await expect(elevation.getByText('γ esq. 59,5°')).toBeVisible();
    await expect(section.getByTestId('gd-dim-depth')).toContainText('1,28');
    await expect(section.getByTestId('gd-dim-setback')).toContainText('0,15');

    // Corte (x = y para fora, y = −z): brise de 0,15 a 1,43 m na verga, vidro em y = 0.
    await reveal(section);
    const [brise, glass, below] = await svgColors(
      section,
      [
        { x: 0.8, y: -1 },
        { x: 0, y: -0.5 },
        { x: 0.8, y: -0.25 },
      ],
      1,
    );
    expect(isDark(brise!)).toBe(true);
    expect(isGlassLine(glass!)).toBe(true);
    expect(isWhite(below!)).toBe(true);

    // Vista de fora (X = W − x): o prolongamento direito (1,20 m) fica à esquerda do desenho e o
    // esquerdo (1,70 m) à direita; além das pontas, a parede.
    await reveal(elevation);
    const [overWindow, rightExt, leftExt, beyondRight, glassCenter, wall] = await svgColors(
      elevation,
      [
        { x: 1, y: -1 },
        { x: -0.6, y: -1 },
        { x: 2.85, y: -1 },
        { x: -1.5, y: -1 },
        { x: 1, y: -0.5 },
        { x: -0.9, y: -0.25 },
      ],
      1,
    );
    expect(isDark(overWindow!)).toBe(true);
    expect(isDark(rightExt!)).toBe(true);
    expect(isDark(leftExt!)).toBe(true);
    expect(isWall(beyondRight!)).toBe(true);
    expect(isGlass(glassCenter!)).toBe(true);
    expect(isWall(wall!)).toBe(true);
  });

  test('aletas e lâminas: campos inválidos marcados, peça removida e renumerada', async ({
    page,
  }) => {
    await page.goto('./#local=florianopolis&jl=1%2C2&ja=1&pc1=ad_0%2C4&pc2=lh_x_0%2C2_0%2C3');
    await openStep6(page);
    await expect(page.getByTestId('piece-1-count')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toContainText('campos inválidos');
    await page.getByTestId('piece-1-count').fill('3');
    await expect(page.getByTestId('piece-1-count')).toHaveAttribute('aria-invalid', 'false');
    await expect(page.getByTestId('geometry-summary')).toContainText('2 peça(s)');
    await page.getByTestId('piece-0-remove').click();
    await expect(page).toHaveURL(/pc1=lh_3_0%2C2_0%2C3/);
    expect(page.url()).not.toMatch(/pc2=/);
    await expect(page.getByTestId('piece-0')).toContainText('1. Lâminas horizontais');
    // Lâminas: na vista, três faixas escuras sobre o vidro.
    const elevation = page.getByTestId('geometry-elevation');
    await reveal(elevation);
    const [louver] = await svgColors(elevation, [{ x: 0.6, y: -1 }], 1);
    expect(isDark(louver!)).toBe(true);
  });

  test('exportação em SVG na escala escolhida e impressão em escala', async ({ page }) => {
    await page.goto(`./${TUTORIAL}`);
    await expect(page.getByTestId('geometry-panel').locator('details').first()).toHaveAttribute(
      'open',
    );
    await page.getByTestId('geometry-scale').selectOption('20');
    await expect(page).toHaveURL(/esc=20/);
    const download = page.waitForEvent('download');
    await page.getByTestId('geometry-export').click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('solar-brasilia-df-corte-e-vista-1-20.svg');
    const text = readFileSync((await file.path())!, 'utf-8');
    const vb = text.match(/viewBox="([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+)"/)!;
    const width = text.match(/ width="([\d.]+)cm"/)!;
    const height = text.match(/ height="([\d.]+)cm"/)!;
    // 1:20: 1 m do desenho vira 5 cm no papel.
    expect(Number(width[1])).toBeCloseTo((Number(vb[3]) * 100) / 20, 1);
    expect(Number(height[1])).toBeCloseTo((Number(vb[4]) * 100) / 20, 1);
    // Letra de 2,5 mm no papel: 0,05 m do desenho em 1:20.
    expect(text).toMatch(/font-size="0\.05"/);
    expect(text).toContain('α 55,0°');

    // Impressão: o desenho sai com o tamanho em cm da escala (96 px por 2,54 cm).
    await page.emulateMedia({ media: 'print' });
    const printed = page.getByTestId('print-geometry-drawing');
    await expect(printed).toBeVisible();
    const box = (await printed.boundingBox())!;
    expect(box.width).toBeCloseTo((Number(width[1]) * 96) / 2.54, 0);
    await page.emulateMedia({ media: 'screen' });
    // Sem a opção no passo 5, o desenho não vai para a impressão.
    await page.getByRole('checkbox', { name: /Corte e vista da proteção/ }).uncheck();
    await expect(page.getByTestId('print-geometry')).toHaveCount(0);
  });

  test('teclado e acessibilidade (axe) com o passo 6 aberto', async ({ page }) => {
    await page.goto('./#local=florianopolis');
    const summary = page.getByTestId('geometry-panel').locator('summary');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('geometry-start')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('geometry-start')).toBeFocused();
    await page.keyboard.press('Enter');
    // O botão some ao começar: o foco vai para a largura da janela.
    await expect(page.getByTestId('geometry-width')).toBeFocused();
    await page.getByTestId('piece-add').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('piece-0')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
