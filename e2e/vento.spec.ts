import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { svgColors } from './fixtures/pixels';
import { loadClimateFile, openStep } from './fixtures/steps';

// F4.4: rosa dos ventos filtrada pela condição térmica (classificação do passo 7) e com a
// velocidade corrigida para a altura e o terreno (spec 06, seções 6.3, 6.7 e 6.8; decisão 0027).
//
// EPW sintético: das 10 às 17 h do arquivo, ar a 25 °C e vento Norte a 3,0 m/s; nas outras horas,
// 15 °C e vento Sul a 1,2 m/s. Pelo limiar de 20 °C com a média da hora: 11 a 17 h quentes (7 por
// dia, só vento Norte), 10 e 18 h neutras (média de 20 °C; uma Norte e uma Sul), as outras 15 frias
// (só vento Sul).
const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';
const warm = (h: number) => h >= 10 && h <= 17;
const EPW = syntheticEpw(
  FLORIPA,
  (_m, _d, h) => (warm(h) ? 25 : 15),
  'Vento conforme a temperatura (F4.4)',
  () => 0,
  (_m, _d, h) => (warm(h) ? [0, 3] : [180, 1.2]),
);
// Cores das classes de 0,5 a 2 m/s e de 2 a 4 m/s (src/ui/wind/colors.ts).
const CLASS_0 = [134, 182, 239];
const CLASS_1 = [57, 135, 229];

async function openRose(page: Page, hash = '') {
  await page.goto(`./${hash}`);
  await loadClimateFile(page, {
    name: 'vento.epw',
    mimeType: 'text/plain',
    buffer: Buffer.from(EPW),
  });
  await page.getByRole('tab', { name: 'Rosa dos ventos' }).click();
  await expect(page.getByTestId('wind-rose')).toBeVisible();
}

const row = (page: Page, name: RegExp) =>
  page.getByTestId('wind-table').getByRole('row', { name }).getByRole('cell');

async function expectColor(page: Page, point: { x: number; y: number }, rgb: number[]) {
  const [c] = await svgColors(page.getByTestId('wind-rose'), [point]);
  c!.forEach((v, k) => expect(Math.abs(v - rgb[k]!), `${point.x},${point.y}`).toBeLessThan(25));
}

async function expectBlank(page: Page, point: { x: number; y: number }) {
  const [c] = await svgColors(page.getByTestId('wind-rose'), [point]);
  expect(Math.min(...c!), `${point.x},${point.y}`).toBeGreaterThan(235);
}

test.describe('vento avançado (F4.4)', () => {
  test('condição térmica: quentes só com vento Norte, frias só com Sul (tabela e pixels)', async ({
    page,
  }) => {
    await openRose(page);
    const more = page.getByTestId('wind-more');
    await expect(more).not.toHaveAttribute('open');
    await more.locator('summary').click();
    // Sem nada no link, o método do passo 7 é o limiar de 20 °C; as contagens são as do arquivo.
    const method = page.getByTestId('wind-thermal-method');
    await expect(method).toContainText('limiar de 20 °C, de Lamberts, Dutra e Pereira (2014)');
    await expect(method).toContainText('meia hora antes do vento');
    await expect(method).toContainText('2.555 horas quentes, 5.475 frias e 730 neutras');

    await page.getByRole('radio', { name: 'Quentes' }).click();
    await expect(page).toHaveURL(/vh=q/);
    await expect(page.getByTestId('wind-rose')).toHaveAccessibleName(/; horas quentes$/);
    await expect(page.getByTestId('wind-info')).toContainText('2.555 horas válidas de 2.555');
    await page.getByText('Tabela da rosa').click();
    await expect(row(page, /^N /)).toHaveText(['0,0', '100,0', '0,0', '0,0', '100,0', '3,0']);
    await expect(row(page, /^S /)).toHaveText(['0,0', '0,0', '0,0', '0,0', '0,0', 'sem horas']);
    // A cunha do Norte (y < 0 no SVG) tem a cor da classe de 2 a 4 m/s; o setor Sul fica vazio.
    await expectColor(page, { x: 0, y: -0.55 }, CLASS_1);
    await expectBlank(page, { x: 0, y: 0.55 });

    await page.getByRole('radio', { name: 'Frias' }).click();
    await expect(page).toHaveURL(/vh=f/);
    await expect(row(page, /^S /)).toHaveText(['100,0', '0,0', '0,0', '0,0', '100,0', '1,2']);
    await expect(row(page, /^N /)).toHaveText(['0,0', '0,0', '0,0', '0,0', '0,0', 'sem horas']);
    await expectColor(page, { x: 0, y: 0.55 }, CLASS_0);
    await expectBlank(page, { x: 0, y: -0.55 });

    // Neutras: 10 h (Norte, 3,0 m/s) e 18 h (Sul, 1,2 m/s).
    await page.getByRole('radio', { name: 'Neutras' }).click();
    await expect(row(page, /^N /)).toHaveText(['0,0', '50,0', '0,0', '0,0', '50,0', '3,0']);
    await expect(row(page, /^S /)).toHaveText(['50,0', '0,0', '0,0', '0,0', '50,0', '1,2']);

    // Combina com a estação: horas quentes do inverno (jun a ago, 92 dias × 7 horas).
    await page.getByRole('radio', { name: 'Quentes' }).click();
    await page.getByRole('radio', { name: 'Inverno' }).click();
    await expect(page.getByTestId('wind-info')).toContainText('644 horas válidas de 644');

    // Voltar a todas as horas tira a chave do link.
    await page.getByRole('radio', { name: 'Todas as horas' }).click();
    await expect(page).not.toHaveURL(/vh=/);
  });

  test('altura e terreno: cidade a 3 m (k = 0,301) leva o Sul à calmaria e o Norte à primeira classe', async ({
    page,
  }) => {
    await openRose(page);
    await page.getByTestId('wind-more').locator('summary').click();
    await page.getByTestId('wind-height').fill('3');
    await page.getByRole('radio', { name: 'Cidade', exact: true }).click();
    await expect(page).toHaveURL(/va=3/);
    await expect(page).toHaveURL(/vt=c/);
    await expect(page.getByTestId('wind-factor')).toContainText(
      'A 3 m sobre cidade, a velocidade é k = 0,30 vezes a da estação',
    );
    await expect(page.getByTestId('wind-factor')).toContainText('City no EnergyPlus');
    await expect(page.getByTestId('wind-rose')).toHaveAccessibleName(/; a 3 m, cidade$/);
    await expect(page.getByTestId('wind-station-warning')).toContainText(
      'Velocidade levada a 3 m sobre cidade',
    );
    // Sul: 1,2 × 0,301 = 0,36 m/s, calmaria (16 das 24 horas); Norte: 3,0 × 0,301 = 0,90 m/s.
    await expect(page.getByTestId('calm-label')).toHaveText('67%');
    await page.getByText('Tabela da rosa').click();
    await expect(row(page, /^Calmaria/)).toHaveText(['', '66,7', '']);
    await expect(row(page, /^N /)).toHaveText(['33,3', '0,0', '0,0', '0,0', '33,3', '0,9']);
    await expectColor(page, { x: 0, y: -0.75 }, CLASS_0);

    // Com o filtro: horas quentes a 3 m na cidade, 100% Norte de 0,5 a 2 m/s.
    await page.getByRole('radio', { name: 'Quentes' }).click();
    await expect(page.getByTestId('wind-rose')).toHaveAccessibleName(
      /; horas quentes; a 3 m, cidade$/,
    );
    await expect(row(page, /^N /)).toHaveText(['100,0', '0,0', '0,0', '0,0', '100,0', '0,9']);
    // O CSV do passo 5 é a mesma rosa, com o filtro e a correção no cabeçalho.
    await openStep(page, '5');
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByTestId('outputs-panel')
        .getByRole('button', { name: 'CSV dos dados mostrados' })
        .click(),
    ]);
    const text = readFileSync((await csv.path())!, 'utf-8');
    expect(text).toContain(
      '# Condição térmica: horas quentes. Horas quentes e frias pela temperatura',
    );
    expect(text).toContain('# Velocidade a 3 m sobre cidade: k = 0.3014 vezes a da estação');
    const north = text
      .split('\n')
      .find((l) => l.startsWith('N,'))!
      .split(',')
      .map(Number);
    expect(north.slice(1, 7)).toEqual([0, 100, 0, 0, 0, 100]);
    expect(north[7]).toBeCloseTo(3 * 0.30139140050596425, 5); // o CSV grava 6 casas

    // Altura fora da faixa: marcada, e a rosa volta ao vento da estação, com o aviso.
    await page.getByTestId('wind-height').fill('0,5');
    await expect(page.getByTestId('wind-height')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('wind-height-invalid')).toContainText('sem correção');
    await expect(row(page, /^N /)).toHaveText(['0,0', '100,0', '0,0', '0,0', '100,0', '3,0']);
    await expect(page.getByTestId('wind-rose')).toHaveAccessibleName(/; horas quentes$/);
  });

  test('o link reabre as opções; teclado; axe sem violações', async ({ page }) => {
    await openRose(page, '#vh=f&va=4,5&vt=s');
    const more = page.getByTestId('wind-more');
    await expect(more).toHaveAttribute('open');
    await expect(page.getByRole('radio', { name: 'Frias' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByRole('radio', { name: 'Subúrbio' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByTestId('wind-height')).toHaveValue('4,5');
    await expect(page.getByTestId('wind-rose')).toHaveAccessibleName(
      /; horas frias; a 4,5 m, subúrbio$/,
    );
    // Pelo teclado: foco no botão e Enter.
    await page.getByRole('radio', { name: 'Água' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/vt=a/);
    await page.getByRole('radio', { name: 'Todas as horas' }).focus();
    await page.keyboard.press('Space');
    await expect(page).not.toHaveURL(/vh=/);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test('método incompleto no passo 7: filtro desativado e aviso quando o link pede o filtro', async ({
    page,
  }) => {
    // Temperatura de equilíbrio sem valor: não há classificação.
    await openRose(page, '#cm=e');
    await page.getByTestId('wind-more').locator('summary').click();
    await expect(page.getByRole('radio', { name: 'Quentes' })).toBeDisabled();
    await expect(page.getByRole('radio', { name: 'Todas as horas' })).toBeEnabled();
    await expect(page.getByTestId('wind-thermal-unavailable')).toContainText('incompleto');

    await openRose(page, '#cm=e&vh=q');
    await expect(page.getByTestId('wind-thermal-not-applied')).toContainText('não está aplicado');
    await expect(page.getByTestId('wind-rose')).not.toHaveAccessibleName(/horas quentes/);
    // Com o método completo (equilíbrio de 20 °C), o mesmo link filtra.
    await openRose(page, '#cm=e&te=20&vh=q');
    await expect(page.getByTestId('wind-rose')).toHaveAccessibleName(/; horas quentes$/);
    await expect(page.getByTestId('wind-thermal-method')).toContainText(
      'temperatura de equilíbrio de 20,0 °C',
    );
  });

  test('celular: as opções cabem na largura da tela', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    await openRose(page, '#vh=q&va=3&vt=c');
    await expect(page.getByTestId('wind-more')).toHaveAttribute('open');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = (await page.getByTestId('wind-height').boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(40);
  });
});
