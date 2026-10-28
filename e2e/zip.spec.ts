import { strToU8, zipSync } from 'fflate';
import { expect, test } from '@playwright/test';
import { syntheticEpw } from './fixtures/epw';
import { chosenSource, loadClimateFile } from './fixtures/steps';

// .zip do TMYx carregado direto, sem descompactar (decisão 0048, item g da 0044; problema 6 do
// piloto do F2.9). O .zip do teste tem a estrutura dos do Climate.OneBuilding.org: o .epw e os
// arquivos que o acompanham, comprimidos.

const NAME = 'BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_TMYx.2011-2025';
const RECIFE = 'LOCATION,Recife-Guararapes,PE,BRA,SRC-Teste,828990,-8.12600,-34.92300,-3.0,10.0';

const zip = (files: Record<string, string>) =>
  Buffer.from(
    zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), {
      level: 6,
    }),
  );

test('o .zip do TMYx abre direto: o .epw de dentro, com a cidade, e pinta a carta', async ({
  page,
}) => {
  await page.goto('./#local=recife&dado=tbs');
  // O "i" das fontes de dados diz que o .zip vai direto em "Abrir arquivo" (decisão 0050).
  await page.getByTestId('sources-info').click();
  await expect(
    page.getByText('Carregue o .zip baixado em "Abrir arquivo", sem descompactar.'),
  ).toBeVisible();
  await loadClimateFile(page, {
    name: `${NAME}.zip`,
    mimeType: 'application/zip',
    buffer: zip({
      [`${NAME}.ddy`]: 'ddy',
      [`${NAME}.epw`]: syntheticEpw(RECIFE, () => 27),
      [`${NAME}.stat`]: 'stat',
    }),
  });
  await expect(page).toHaveURL(/local=arquivo/);
  await expect(page.getByTestId('site-source')).toContainText(`${NAME}.epw`);
  expect(await chosenSource(page)).toBe(`Arquivo ${NAME}.epw`);
  await expect(page.getByLabel('Cidade')).toHaveValue('recife');
  // 27 °C o ano todo: todas as células na faixa "acima de 25".
  await expect(page.getByTestId('overlay-legend')).toBeVisible();
  const cell = page.getByTestId('sun-chart').locator('[data-cell="3-12"]');
  await expect(cell).toHaveAttribute('data-band', '4');
});

test('.zip sem .epw, com dois .epw ou corrompido: o aviso diz o que fazer', async ({ page }) => {
  await page.goto('./#local=recife');
  await loadClimateFile(page, {
    name: 'outro.zip',
    mimeType: 'application/zip',
    buffer: zip({ 'leia-me.txt': 'nada' }),
  });
  await expect(page.getByRole('alert')).toHaveText('O .zip não tem nenhum arquivo .epw.');
  await loadClimateFile(page, {
    name: 'dois.zip',
    mimeType: 'application/zip',
    buffer: zip({ 'a.epw': syntheticEpw(RECIFE), 'b.epw': syntheticEpw(RECIFE) }),
  });
  await expect(page.getByRole('alert')).toContainText('mais de um arquivo .epw');
  const broken = zip({ [`${NAME}.epw`]: syntheticEpw(RECIFE) }).subarray(0, 4000);
  await loadClimateFile(page, { name: `${NAME}.zip`, mimeType: 'application/zip', buffer: broken });
  await expect(page.getByRole('alert')).toContainText('incompleto ou corrompido');
  await expect(page).toHaveURL(/local=recife/);
});
