import { readFileSync } from 'node:fs';
import { strToU8, zipSync } from 'fflate';
import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { chooseSource, loadClimateFile, openStep } from './fixtures/steps';

// Página do teste do F2.9 sem moderador (decisão 0042): o roteiro inteiro, feito como um
// participante faria, e o arquivo de resultados nas colunas de docs/ux/F2.9-registro.csv.

const RECIFE = 'LOCATION,Recife-Teste,PE,BRA,SRC-Teste,828990,-8.12600,-34.92400,-3.0,10.1';
const COLUMNS =
  'participante,perfil,ja_usou_6_2,aparelho,tarefa,resultado,tempo_min,resposta,observacao,gravidade';

/** Separa uma linha de CSV com campos entre aspas. */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

async function startTask(page: Page, id: string) {
  const card = page.getByTestId(`tarefa-${id}`);
  await expect(card).toHaveAttribute('data-fase', 'ler');
  // Antes de "Comecei", a ferramenta fica coberta.
  await expect(page.locator('#cobertura')).toBeVisible();
  await card.getByTestId('comecei').click();
  await expect(page.locator('#cobertura')).toBeHidden();
  return card;
}

async function finishTask(page: Page, id: string, seq: number, how: 'terminei' | 'desisti') {
  const card = page.getByTestId(`tarefa-${id}`);
  await card.getByTestId(how).click();
  await expect(card).toHaveAttribute('data-fase', 'avaliar');
  await expect(page.locator('#cobertura')).toBeVisible();
  await card.getByRole('radio', { name: String(seq), exact: true }).check();
  await card.getByLabel(/O que te confundiu/).fill(`confusão na tarefa ${id}`);
  await card.getByTestId('proxima').click();
}

async function begin(page: Page) {
  await page.goto('./teste/#p=P3');
  await expect(page.getByLabel('Seu código')).toHaveValue('P3');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('alert')).toContainText('concorda em participar');
  await page.getByLabel('Li o que está acima e concordo em participar.').check();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByRole('radio', { name: 'aluno' }).check();
  await page.getByLabel('Semestre do curso (número)').fill('7');
  await page.getByRole('radiogroup').nth(1).getByRole('radio', { name: 'sim' }).check();
  await page
    .getByRole('radiogroup')
    .nth(2)
    .getByRole('radio', { name: 'não', exact: true })
    .check();
  await page.getByRole('radio', { name: 'computador' }).check();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Ir para a tarefa 1' }).click();
}

test.describe('teste sem moderador (F2.9)', () => {
  test('roteiro inteiro, conferência pelo endereço e arquivo de resultados', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'computador', 'roteiro completo só no computador');
    test.setTimeout(120_000);
    await begin(page);
    const app = page.frameLocator('#app');

    // 1. Recife e a leitura da carta.
    let card = await startTask(page, '1');
    await app.getByLabel('Cidade').selectOption('recife');
    await card.getByLabel('Direção').fill('nordeste');
    await card.getByLabel('Altura').fill('36°');
    await finishTask(page, '1', 6, 'terminei');

    // 2. Fachada noroeste (o transferidor já aparece).
    await startTask(page, '2');
    await openStep(app, '2');
    await app.getByLabel('Orientação da fachada (azimute da normal externa)').fill('315');
    await finishTask(page, '2', 5, 'terminei');

    // 3. α = 50°.
    card = await startTask(page, '3');
    await openStep(app, '3');
    await app.getByTestId('angle-a1').fill('50');
    await card.getByRole('radio', { name: 'sim' }).check();
    await finishTask(page, '3', 4, 'terminei');

    // 4. Referência externa.
    card = await startTask(page, '4');
    await app.getByRole('radio', { name: 'Externa' }).click();
    await card.getByLabel('O que mudou na carta?').fill('a máscara ficou menor');
    await finishTask(page, '4', 3, 'terminei');

    // 5. Dados históricos e temperatura.
    card = await startTask(page, '5');
    await openStep(app, '1');
    await chooseSource(app, /Dados do SOL-AR 6\.2/);
    await app.getByLabel('Pintar na carta').selectOption('tbs');
    await card.getByLabel('Período dos dados').fill('entre 1951 e 1970');
    await card.getByLabel('Horas com mais de 25 °C e sol na janela').fill('à tarde');
    await finishTask(page, '5', 5, 'terminei');

    // 6. Arquivo recente: a preparação fica antes de "Comecei", com o link do .zip, que a
    // ferramenta abre sem descompactar; "Comparar com outros dados" mostra a diferença.
    await expect(
      page.getByRole('link', { name: /Baixar o arquivo recente de Recife/ }),
    ).toHaveAttribute('href', /Recife.*TMYx\.2011-2025\.zip$/);
    await expect(page.getByTestId('tarefa-6')).toContainText('cerca de 380 kB');
    await expect(page.getByTestId('tarefa-6')).not.toContainText('megabytes');
    card = await startTask(page, '6');
    await openStep(app, '1');
    await app.getByTestId('compare-data').click();
    const name = 'BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_TMYx.2011-2025';
    await loadClimateFile(app, {
      name: `${name}.zip`,
      mimeType: 'application/zip',
      buffer: Buffer.from(
        zipSync({
          [`${name}.epw`]: strToU8(syntheticEpw(RECIFE)),
          [`${name}.ddy`]: strToU8('ddy'),
        }),
      ),
    });
    await expect(page.locator('#endereco')).toHaveValue(/local=arquivo/);
    await expect(app.getByTestId('difference-view')).toBeVisible();
    await card.getByLabel('As horas quentes mudaram? Como?').fill('quase iguais');
    await finishTask(page, '6', 2, 'terminei');

    // 7. Rosa dos ventos do verão, com os dados antigos de novo.
    card = await startTask(page, '7');
    await openStep(app, '1');
    await app.getByTestId('compare-data').click();
    await app.getByLabel('Cidade').selectOption('recife');
    await chooseSource(app, /Dados do SOL-AR 6\.2/);
    await app.getByRole('tab', { name: 'Rosa dos ventos' }).click();
    await app.getByRole('radio', { name: 'Verão' }).click();
    await card.getByLabel('Direção').fill('leste');
    await finishTask(page, '7', 6, 'terminei');

    // 8. A carta em imagem para a aula (PNG exportado no passo 5).
    card = await startTask(page, '8');
    await app.getByRole('tab', { name: 'Carta solar' }).click();
    await openStep(app, '5');
    const [png] = await Promise.all([
      page.waitForEvent('download'),
      app.getByRole('button', { name: 'PNG' }).click(),
    ]);
    expect(png.suggestedFilename()).toMatch(/\.png$/);
    await card.getByLabel('Como você salvou? (PDF, imagem ou outro jeito)').fill('PNG');
    await finishTask(page, '8', 4, 'terminei');

    // 9. Link: o participante usa "Compartilhar" no cabeçalho da ferramenta.
    card = await startTask(page, '9');
    await app.getByTestId('share').click();
    const link = await app.getByLabel('Link desta análise').inputValue();
    await card.getByLabel('Cole aqui o link que você mandaria').fill(link);
    await finishTask(page, '9', 7, 'terminei');

    // SUS e perguntas abertas (sem a do 6.2 nem a do professor).
    const sus = [5, 1, 4, 2, 4, 1, 5, 1, 4, 2];
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('alert')).toContainText('Falta responder: 1, 2');
    for (const [i, v] of sus.entries()) {
      await page
        .getByTestId(`sus-${i + 1}`)
        .getByRole('radio', { name: String(v) })
        .check();
    }
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText('O que ficou melhor e o que ficou pior')).toHaveCount(0);
    await page.getByLabel('O que foi mais útil ou mais fácil?').fill('a máscara,\ncalculada');
    await page.getByRole('button', { name: 'Ver os resultados' }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('baixar').click(),
    ]);
    expect(download.suggestedFilename()).toBe('F2.9-P3-resultados.csv');
    const text = readFileSync((await download.path())!, 'utf-8').replace(/^\uFEFF/, '');
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe(COLUMNS);
    const rows = lines.slice(1).map(splitCsv);
    for (const r of rows) {
      expect(r).toHaveLength(10);
      expect(r.slice(0, 4)).toEqual(['P3', 'aluno 7º semestre', 'não', 'computador']);
    }
    const byTask = Object.fromEntries(rows.map((r) => [r[4], r]));
    expect(rows.map((r) => r[4])).toEqual([
      'sessao',
      ...['1', '2', '3', '4', '5', '6', '7', '8', '9'],
      'sus',
      'aberta1',
      'aberta2',
      'aberta3',
      'aberta5',
    ]);
    expect(byTask.sessao![7]).toContain('consentimento: sim');
    expect(byTask.sessao![8]).toContain('carta solar em aula: sim');
    for (const id of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      const r = byTask[id]!;
      expect(r[5], id).toBe('S');
      expect(Number(r[6]), id).toBeGreaterThanOrEqual(0);
      expect(r[8], id).toMatch(/^conferência: ok \(/);
      expect(r[8], id).toContain(`confundiu: confusão na tarefa ${id}`);
    }
    expect(byTask['1']![7]).toBe('Direção: nordeste; Altura: 36°');
    for (const id of ['1', '3', '5', '7']) expect(byTask[id]![8], id).toContain('resposta: ok');
    expect(byTask['1']![8]).toContain('SEQ 6');
    expect(byTask['6']![8]).toContain('comparou com outros dados sim, com a diferença na carta');
    expect(byTask['8']![8]).toContain('imagem PNG; Recife sim; com a carta sim');
    expect(byTask['8']![7]).toContain('PNG');
    expect(byTask['9']![8]).toContain('mesmo estado sim');
    expect(byTask['9']![8]).toContain('estado: #');
    expect(byTask.sus![7]).toBe('5,1,4,2,4,1,5,1,4,2');
    expect(byTask.sus![8]).toBe('nota 87.5');
    expect(byTask.aberta1![7]).toBe('a máscara, / calculada');

    // Copiar dá o mesmo texto (sem o BOM do arquivo).
    await expect(page.getByTestId('texto-resultados')).toHaveValue(text);
  });

  test('a tarefa 6 aceita "Desisti" sem travar o resto, e a página recarregada continua', async ({
    page,
  }) => {
    await begin(page);
    for (const id of ['1', '2', '3', '4', '5']) {
      await startTask(page, id);
      await finishTask(page, id, 4, 'terminei');
    }
    await startTask(page, '6');
    await page.reload();
    // Recarregar não perde a tarefa em andamento.
    await expect(page.getByTestId('tarefa-6')).toHaveAttribute('data-fase', 'fazer');
    await finishTask(page, '6', 1, 'desisti');
    await expect(page.getByTestId('tarefa-7')).toHaveAttribute('data-fase', 'ler');
    await expect(page.getByRole('heading', { name: 'Tarefa 7 de 9' })).toBeVisible();
  });

  test('no celular, o roteiro fica em cima e a ferramenta embaixo', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'celular', 'leiaute do celular');
    await begin(page);
    await startTask(page, '1');
    const roteiro = await page.locator('.roteiro').boundingBox();
    const frame = await page.locator('#app').boundingBox();
    expect(roteiro!.y + roteiro!.height).toBeLessThanOrEqual(frame!.y + 1);
    expect(frame!.height).toBeGreaterThan(300);
    await page.getByRole('button', { name: 'Esconder roteiro' }).click();
    const frame2 = await page.locator('#app').boundingBox();
    expect(frame2!.height).toBeGreaterThan(frame!.height + 100);
  });

  // Decisão 0050: durante a tarefa, o roteiro estreita para a ferramenta ter pelo menos 1200 px e
  // mostrar as três colunas; fora dela (ferramenta coberta), o roteiro tem os 23rem de sempre.
  for (const screen of [
    { width: 1366, height: 768, panel: 166 },
    { width: 1920, height: 1080, panel: 368 },
  ]) {
    test(`${screen.width} × ${screen.height}: a ferramenta em três colunas durante a tarefa`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'computador', 'leiaute do computador');
      await page.setViewportSize(screen);
      await begin(page);
      await expect(page.locator('.roteiro')).toHaveCSS('width', '368px');
      await startTask(page, '1');
      const panel = (await page.locator('.roteiro').boundingBox())!;
      const frame = (await page.locator('#app').boundingBox())!;
      expect(panel.width).toBeCloseTo(screen.panel, 0);
      expect(frame.width).toBeGreaterThanOrEqual(1200);
      const app = page.frameLocator('#app');
      await expect(app.locator('.steps-left')).toBeVisible();
      await expect(app.locator('.steps-right')).toBeVisible();
      // Sem rolar: o γ do passo 3 e o raio do passo 5 à vista dentro da ferramenta.
      for (const id of ['angle-gd1', 'print-radius']) {
        await expect(app.getByTestId(id)).toBeInViewport({ ratio: 1 });
      }
      await expect(app.locator('.steps-left')).toHaveJSProperty('scrollTop', 0);
    });
  }
});
