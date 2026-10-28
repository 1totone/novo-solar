import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { isAccordion, loadClimateFile } from './fixtures/steps';

// "Compartilhar" no cabeçalho (decisão 0049, item i da 0044; problema 10 do piloto do F2.9: a
// lógica do link não ficou clara). Copia o endereço, diz o que ele reabre e o que não vai nele.

const STATE = '#local=recife&o=315&a1=50&ref=e';

test('copia o link, diz o que ele reabre, e o link reabre a mesma análise', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`./${STATE}`);
  await page.getByRole('button', { name: 'Compartilhar' }).click();
  const panel = page.getByTestId('share-panel');
  await expect(panel.getByRole('status')).toHaveText(
    'Link copiado. Ele reabre esta mesma análise: o local, a fachada, os ângulos, os dados escolhidos e as opções da carta.',
  );
  await expect(panel).toContainText('Tudo fica no próprio endereço, depois do "#"');
  await expect(panel).not.toContainText('arquivo climático');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(page.url());
  await expect(page.getByLabel('Link desta análise')).toHaveValue(copied);

  // Outra aba com o link copiado: a mesma fachada, o mesmo brise e a mesma referência.
  const other = await context.newPage();
  await other.goto(copied);
  if (isAccordion(other)) {
    await expect(other.getByTestId('facade-summary')).toHaveText('Fachada 315° (NO)');
    await expect(other.getByTestId('protection-summary')).toHaveText(
      'Brise α 50° · referência externa',
    );
  } else {
    // No computador, os passos ficam abertos (decisão 0050): os próprios campos.
    await expect(other.getByLabel('Orientação da fachada (azimute da normal externa)')).toHaveValue(
      '315',
    );
    await expect(other.getByTestId('angle-a1')).toHaveValue('50');
    await expect(other.getByRole('radio', { name: 'Externa' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  }
  await expect(other.getByLabel('Cidade')).toHaveValue('recife');
});

test('com arquivo carregado, avisa que o arquivo não vai no link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./#local=recife');
  await loadClimateFile(page, {
    name: 'recife.epw',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      syntheticEpw('LOCATION,Recife,PE,BRA,SRC-Teste,828990,-8.126,-34.923,-3.0,10.0'),
    ),
  });
  await page.getByTestId('share').click();
  await expect(page.getByTestId('share-panel')).toContainText(
    'O arquivo climático carregado não vai no link',
  );
});

test('sem permissão para copiar: o link selecionável e a frase para copiar à mão', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('negado')) },
    });
  });
  await page.goto(`./${STATE}`);
  await page.getByTestId('share').click();
  const panel = page.getByTestId('share-panel');
  await expect(panel.getByRole('alert')).toContainText('selecione o link abaixo e copie');
  const field = page.getByLabel('Link desta análise');
  await expect(field).toHaveValue(page.url());
  await field.focus();
  expect(
    await field.evaluate((el: HTMLInputElement) => el.selectionEnd! - el.selectionStart!),
  ).toBe(page.url().length);
});

test('teclado: Esc fecha o painel; axe; no celular, o painel cabe na tela', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`./${STATE}`);
  const button = page.getByTestId('share');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  const result = await new AxeBuilder({ page })
    .include('header')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  const box = (await page.getByTestId('share-panel').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByLabel('Link desta análise').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('share-panel')).toHaveCount(0);
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
});
