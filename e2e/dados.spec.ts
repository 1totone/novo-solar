import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { chooseSource, isAccordion, loadClimateFile } from './fixtures/steps';

const SOLAR62 = new URL('../docs/validacao/casos/solar-6.2/', import.meta.url);

// As 15 cidades do SOL-AR 6.2: período dos registros das TRY (Goulart, Lamberts e Firmino, 1998).
const CITIES_62: [string, string][] = [
  ['belem', 'entre 1961 e 1970'],
  ['brasilia', 'entre 1961 e 1970'],
  ['concepcion', 'não informado no arquivo'],
  ['curitiba', 'entre 1961 e 1970'],
  ['florianopolis', 'entre 1961 e 1970'],
  ['fortaleza', 'entre 1961 e 1970'],
  ['maceio', 'entre 1961 e 1970'],
  ['natal', 'entre 1951 e 1970'],
  ['porto-alegre', 'entre 1951 e 1970'],
  ['recife', 'entre 1951 e 1970'],
  ['rio-de-janeiro', 'entre 1961 e 1970'],
  ['salvador', 'entre 1961 e 1970'],
  ['sao-luis', 'entre 1961 e 1970'],
  ['sao-paulo', 'entre 1951 e 1970'],
  ['vitoria', 'entre 1961 e 1970'],
];

/**
 * O passo 4 tem dados: o resumo dele não pede mais os dados (decisão 0044); no computador, o passo
 * aberto mostra a escolha da variável (decisão 0050).
 */
async function expectData(page: Page) {
  if (isAccordion(page)) {
    await expect(page.getByTestId('data-summary')).toHaveText('Nenhum dado na carta');
  } else {
    await expect(page.getByTestId('data-panel').getByLabel('Variável')).toBeVisible();
    await expect(page.getByTestId('data-need-file')).toHaveCount(0);
  }
}

test.describe('dados climáticos (F2.7)', () => {
  test('as 15 cidades do 6.2 abrem os dados históricos com origem e período visíveis', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    for (const [id, period] of CITIES_62) {
      await page.goto(`./#local=${id}`);
      const source = page.getByTestId('site-source');
      await expect(source, id).toContainText('nenhum dado horário aberto');
      await chooseSource(page, /^Dados do SOL-AR 6\.2/);
      await expect(source, id).toContainText('dados históricos');
      await expect(source, id).toContainText('SOL-AR 6.2');
      await expect(page.getByTestId('site-period'), id).toContainText(period);
      // O link dos dados recentes fica no "i" das fontes de dados (decisão 0050).
      await expect(page.locator('a', { hasText: /Baixar dados recentes/ })).toHaveAttribute(
        'href',
        /climate\.onebuilding\.org\/.*TMYx\.2011-2025\.zip$/,
      );
      await expectData(page);
      expect(page.url(), id).toContain('hist=1');
    }
  });

  test('avisos dos dados históricos: atraso da radiação (Recife) e radiação incoerente (Concepción)', async ({
    page,
  }) => {
    await page.goto('./#local=recife&hist=1');
    const notices = page.getByTestId('site-notices');
    await expect(notices).toContainText('Radiação estimada por modelo');
    await expect(notices).toContainText('cerca de 54 min depois do sol real');

    await page.goto('./#local=concepcion&hist=1');
    await expect(notices).toContainText('720 horas');
    await expect(notices).toContainText('radiação direta normal (8.760 h)');

    // Florianópolis: o modelo usou a própria longitude; sem aviso de atraso.
    await page.goto('./#local=florianopolis&hist=1');
    await expect(notices).toContainText('Radiação estimada por modelo');
    await expect(notices).not.toContainText('sol real');
  });

  test('o link com hist=1 reabre os dados e a temperatura colore a carta', async ({ page }) => {
    await page.goto('./#dado=tbs&hist=1&local=natal');
    await expect(page.getByTestId('site-period')).toContainText('entre 1951 e 1970');
    await expect(page.getByTestId('overlay')).toHaveCount(1);
    await chooseSource(page, 'Só a carta, sem dados horários');
    await expect(page.getByTestId('overlay')).toHaveCount(0);
    expect(page.url()).not.toContain('hist=1');
  });

  test('importa o CSV do formato "Incluir Nova Cidade" (com cabeçalho), também em Latin-1', async ({
    page,
  }) => {
    await page.goto('./');
    const text = readFileSync(
      new URL('formato-inclusao/CHL_Concepcion_NormaIWEC_SOlAr.csv', SOLAR62),
      'utf-8',
    );
    // O arquivo original do LabEEE é Latin-1 ("Localização", "Elevação").
    await loadClimateFile(page, {
      name: 'CHL_Concepcion_NormaIWEC_SOlAr.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(text, 'latin1'),
    });
    const info = page.getByTestId('site-info');
    await expect(page.getByTestId('site-source')).toContainText(
      'Arquivo CHL_Concepcion_NormaIWEC_SOlAr.csv, no formato do SOL-AR 6.2: 8.760 horas.',
    );
    await expect(info).toContainText('-36,770°');
    await expect(info).toContainText('-73,050°');
    await expect(info).toContainText('UTC−4');
    await expect(page.getByTestId('site-period')).toContainText('não informado no arquivo');
    await expectData(page);
  });

  test('CSV sem cabeçalho pede o local, sem presumir o fuso', async ({ page }) => {
    await page.goto('./#local=recife');
    await loadClimateFile(page, {
      name: 'recife.csv',
      mimeType: 'text/csv',
      buffer: readFileSync(new URL('recife.csv', SOLAR62)),
    });
    const form = page.getByTestId('location-form');
    await expect(form).toContainText('não tem cabeçalho de local');
    await expect(form.getByLabel(/Fuso dos dados/)).toHaveValue('');
    await form.getByRole('button', { name: 'Abrir os dados' }).click();
    await expect(form.getByLabel(/Fuso dos dados/)).toHaveAttribute('aria-invalid', 'true');

    await form.getByLabel(/Latitude/).fill('-8,126');
    await form.getByLabel(/Longitude/).fill('-34,924');
    await form.getByLabel(/Fuso dos dados/).fill('−3');
    await form.getByLabel(/Elevação/).fill('10');
    await form.getByRole('button', { name: 'Abrir os dados' }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByTestId('site-source')).toContainText(
      'recife.csv, no formato do SOL-AR 6.2',
    );
    await expect(page.getByTestId('site-info')).toContainText('-8,126°');
    await expectData(page);

    // O atalho preenche com o local da cidade escolhida, só quando pedido.
    await page.getByLabel('Cidade', { exact: true }).selectOption('recife');
    await loadClimateFile(page, {
      name: 'recife.csv',
      mimeType: 'text/csv',
      buffer: readFileSync(new URL('recife.csv', SOLAR62)),
    });
    await form.getByRole('button', { name: 'Usar o local de Recife (PE)' }).click();
    await expect(form.getByLabel(/Fuso dos dados/)).toHaveValue('-3');
  });

  test('EPW: período de registro do comentário do TMYx', async ({ page }) => {
    await page.goto('./');
    await loadClimateFile(page, {
      name: 'tmyx.epw',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        syntheticEpw(
          'LOCATION,Florianopolis-Luz.Intl.AP,SC,BRA,SRC-TMYx,838990,-27.67000,-48.54700,-3.0,6.1',
          () => 20,
          'NCEI ISD/ERA5 - #years=[15] Period of Record=2011-2025; Jan=2017',
        ),
      ),
    });
    await expect(page.getByTestId('site-period')).toContainText(
      '2011 a 2025 (período de registro informado no arquivo)',
    );
  });
});
