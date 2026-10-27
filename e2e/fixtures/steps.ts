import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

/** A página da ferramenta, ou ela dentro do iframe da página do teste. */
type Root = Page | FrameLocator;

/** Passos da coluna (decisão 0044): os cinco do caminho básico, as projeções e os avançados. */
export type StepId = '1' | '2' | '3' | '4' | '5' | 'opcoes' | '6' | '7';

const SELECTOR: Record<StepId, string> = {
  '1': '[data-step="1"]',
  '2': '[data-step="2"]',
  '3': '[data-step="3"]',
  '4': '[data-step="4"]',
  '5': '[data-step="5"]',
  opcoes: '[data-testid="chart-options-panel"]',
  '6': '[data-testid="geometry-panel"]',
  '7': '[data-testid="effect-panel"]',
};

/** O `details` do passo na coluna. */
export function stepDetails(page: Root, id: StepId): Locator {
  return page.locator(`.steps ${SELECTOR[id]} > details`);
}

/** O cabeçalho (o `summary`) do passo, que abre e fecha o passo. */
export function stepHeader(page: Root, id: StepId): Locator {
  return stepDetails(page, id).locator('> summary');
}

/**
 * Abre o passo pelo cabeçalho, como quem usa (passos em acordeão, um aberto por vez), se ele ainda
 * não estiver aberto.
 */
export async function openStep(page: Root, id: StepId) {
  const details = stepDetails(page, id);
  if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open))) {
    await stepHeader(page, id).click();
  }
  await expect(details).toHaveAttribute('open', '');
}

/** Arquivo para o campo de arquivo do passo 1. */
export interface ClimateFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** Carrega um arquivo climático pelo passo 1, como quem usa (abre o passo, se preciso). */
export async function loadClimateFile(page: Root, file: ClimateFile) {
  await openStep(page, '1');
  await page
    .getByLabel('Ou carregue um arquivo climático (EPW ou CSV do SOL-AR)')
    .setInputFiles(file);
}
