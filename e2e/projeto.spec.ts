import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';

// F4.7: arquivo de projeto e link (spec 11, decisão 0028).

const FLORIPA = 'LOCATION,Florianopolis-Teste,SC,BRA,SRC-Teste,838990,-27.67000,-48.54700,-3.0,6.1';
const EPW = syntheticEpw(
  FLORIPA,
  (_m, _d, h) => (h >= 10 && h <= 17 ? 25 : 15),
  'Arquivo do projeto (F4.7)',
  () => 0,
  (_m, _d, h) => (h >= 10 && h <= 17 ? [0, 3] : [180, 1.2]),
);

async function loadEpw(page: Page) {
  await page.getByLabel('Ou carregue um arquivo climático (EPW ou CSV do SOL-AR)').setInputFiles({
    name: 'projeto.epw',
    mimeType: 'text/plain',
    buffer: Buffer.from(EPW),
  });
}

/** Salva o projeto e devolve o texto do arquivo baixado e o nome dele. */
async function saveProject(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('project-save').click(),
  ]);
  return {
    name: download.suggestedFilename(),
    text: readFileSync((await download.path())!, 'utf-8'),
  };
}

async function openProject(page: Page, name: string, text: string) {
  await page.getByTestId('project-input').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
}

const hashOf = (url: string) => new URL(url).hash;

/** Documento novo (sem nada na memória): mudar só o '#' manteria o estado da página. */
async function freshPage(page: Page, hash = '') {
  await page.goto('about:blank');
  await page.goto(`./${hash}`);
}

test.describe('arquivo de projeto e link (F4.7)', () => {
  test('salvar e abrir: o mesmo link e as opções de impressão', async ({ page }) => {
    const hash = '#a1=55&hl=a&local=florianopolis&o=30&proj=eq&tr=0';
    await page.goto(`./${hash}`);
    await page.getByTestId('print-radius').fill('8');
    const saved = await saveProject(page);
    expect(saved.name).toBe('solar-florianopolis-sc-projeto.json');
    await expect(page.getByTestId('project-status')).toHaveText(
      'Projeto salvo: solar-florianopolis-sc-projeto.json.',
    );
    const json = JSON.parse(saved.text) as Record<string, unknown>;
    expect(json).toMatchObject({
      format: 'sol-ar-project',
      schema: 1,
      state: { a1: '55', hl: 'a', local: 'florianopolis', o: '30', proj: 'eq', tr: '0' },
      print: { radiusCm: 8 },
      climateFile: null,
      compareClimateFile: null,
    });

    // Outra página, outro estado: abrir o projeto troca o link inteiro e o raio da impressão.
    await freshPage(page, '#local=recife&o=200&aba=rosa');
    await expect(page.getByTestId('print-radius')).toHaveValue('6');
    await openProject(page, saved.name, saved.text);
    await expect(page.getByTestId('project-status')).toContainText(
      'Projeto aberto: solar-florianopolis-sc-projeto.json, salvo em',
    );
    await expect.poll(() => hashOf(page.url())).toBe(hash);
    await expect(page.getByTestId('print-radius')).toHaveValue('8');
    await expect(page.getByTestId('sun-chart')).toHaveAttribute('data-projection', 'equidistant');
    await expect(page.getByTestId('mask-total')).toHaveCount(1);
  });

  test('com arquivo climático carregado: o projeto leva o arquivo e reabre sozinho', async ({
    page,
  }) => {
    await page.goto('./#o=90');
    await loadEpw(page);
    await page.getByRole('tab', { name: 'Rosa dos ventos' }).click();
    await page.getByTestId('wind-more').locator('summary').click();
    await page.getByRole('radio', { name: 'Quentes' }).click();
    await expect(page.getByTestId('project-section')).toContainText(
      'Com projeto.epw, o projeto terá cerca de',
    );
    const before = hashOf(page.url());
    expect(before).toContain('local=arquivo');
    const saved = await saveProject(page);
    const json = JSON.parse(saved.text) as {
      climateFile: { name: string; format: string; hours: number; text: string };
    };
    expect(json.climateFile).toMatchObject({ name: 'projeto.epw', format: 'epw', hours: 8760 });
    expect(json.climateFile.text).toBe(EPW);

    // Página nova, sem o arquivo: o projeto traz os dados de volta.
    await freshPage(page);
    await expect(page.getByTestId('site-info')).not.toContainText('projeto.epw');
    await openProject(page, saved.name, saved.text);
    await expect(page.getByTestId('project-status')).toContainText(
      'com o arquivo climático projeto.epw',
    );
    await expect.poll(() => hashOf(page.url())).toBe(before);
    await expect(page.getByTestId('site-info')).toContainText('projeto.epw');
    await expect(page.getByTestId('wind-rose')).toHaveAccessibleName(/; horas quentes$/);
    await expect(page.getByTestId('wind-info')).toContainText('2.555 horas válidas');
  });

  test('comparação: a A com outro arquivo vai no projeto; com dados históricos, vem do link', async ({
    page,
  }) => {
    await page.goto('./#aba=rosa');
    await loadEpw(page);
    await page.getByTestId('compare').click();
    await expect(page).toHaveURL(/cmp=/);
    // A configuração atual (B) volta para uma cidade sem dados: só a A usa o arquivo.
    await page.getByLabel('Cidade').selectOption('recife');
    const compare = page.getByTestId('compare-view');
    await expect(compare.getByTestId('compare-a').getByTestId('wind-rose')).toBeVisible();
    await expect(compare.getByTestId('compare-b').getByTestId('wind-need-file')).toBeVisible();
    const saved = await saveProject(page);
    const json = JSON.parse(saved.text) as {
      climateFile: unknown;
      compareClimateFile: { name: string };
    };
    expect(json.climateFile).toBeNull();
    expect(json.compareClimateFile).toMatchObject({ name: 'projeto.epw' });

    await freshPage(page);
    await openProject(page, saved.name, saved.text);
    await expect(compare.getByTestId('compare-a').getByTestId('wind-rose')).toBeVisible();

    // Um link de comparação com a A em dados históricos abre a A com os dados.
    await freshPage(page, '#aba=rosa&local=florianopolis&cmp=hist%3D1%26local%3Drecife');
    await expect(compare.getByTestId('compare-a').getByTestId('wind-rose')).toBeVisible();
  });

  test('erros: não é projeto, esquema mais novo, arquivo climático corrompido; nada muda', async ({
    page,
  }) => {
    const hash = '#local=recife&o=200';
    await page.goto(`./${hash}`);
    await openProject(page, 'outro.json', '{"nome": "qualquer"}');
    await expect(page.getByTestId('project-status')).toHaveText(
      'O arquivo outro.json não é um projeto do SOL-AR; nada mudou.',
    );
    await openProject(
      page,
      'novo.json',
      JSON.stringify({ format: 'sol-ar-project', schema: 2, state: { o: '30' } }),
    );
    await expect(page.getByTestId('project-status')).toContainText('versão mais nova');
    await expect(page.getByTestId('project-status')).toContainText('esquema 2');
    await openProject(
      page,
      'quebrado.json',
      JSON.stringify({
        format: 'sol-ar-project',
        schema: 1,
        state: { local: 'arquivo', o: '30' },
        climateFile: { name: 'x.epw', format: 'epw', hours: 8760, text: 'LOCATION,só isso' },
      }),
    );
    await expect(page.getByTestId('project-status')).toContainText(
      'O arquivo climático do projeto quebrado.json não pôde ser lido; nada mudou.',
    );
    expect(hashOf(page.url())).toBe(hash);
  });

  test('copiar o link; seção acessível pelo teclado; axe', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('./#local=florianopolis&o=30&a1=55');
    const copy = page.getByTestId('copy-link');
    await copy.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('project-status')).toHaveText('Link copiado.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
    // "Abrir projeto" é um botão de verdade (o campo de arquivo fica escondido).
    await expect(page.getByRole('button', { name: 'Abrir projeto' })).toBeVisible();
    await page.getByTestId('project-section').scrollIntoViewIfNeeded();
    const result = await new AxeBuilder({ page })
      .include('[data-testid="outputs-panel"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});
