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

/** O passo na coluna (no computador, os passos 4 a 7 ficam na coluna da direita, decisão 0050). */
export function stepPanel(page: Root, id: StepId): Locator {
  return page.locator(`.steps ${SELECTOR[id]}`);
}

/** O `details` do passo na coluna (só no acordeão do celular e nos passos avançados). */
export function stepDetails(page: Root, id: StepId): Locator {
  return page.locator(`.steps ${SELECTOR[id]} > details`);
}

/** O cabeçalho (o `summary`) do passo, que abre e fecha o passo. */
export function stepHeader(page: Root, id: StepId): Locator {
  return stepDetails(page, id).locator('> summary');
}

/**
 * Abre o passo pelo cabeçalho, como quem usa (passos em acordeão, um aberto por vez), se ele ainda
 * não estiver aberto. No computador, os passos 1 a 5 ficam sempre abertos (decisão 0050).
 */
export async function openStep(page: Root, id: StepId) {
  await expect(stepPanel(page, id)).toBeAttached();
  if ((await stepPanel(page, id).locator('> details').count()) === 0) return;
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
    .getByLabel('Abrir arquivo climático (EPW, .zip do TMYx ou CSV do SOL-AR)')
    .setInputFiles(file);
}

/**
 * Passos em acordeão, com os resumos dos fechados: só no celular (abaixo de 52rem, decisão 0050).
 * No computador, os passos 1 a 5 ficam abertos e não têm resumo.
 */
export function isAccordion(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 832;
}

/** Abre "Incluir na impressão" no passo 5 (o que entra na folha fica recolhido, decisão 0050). */
export async function openPrintOptions(page: Root) {
  await openStep(page, '5');
  const details = page.locator('details.print-include');
  if (!(await details.evaluate((d) => (d as HTMLDetailsElement).open))) {
    await details.locator('> summary').click();
  }
}

/** Escolhe uma fonte de dados na lista do passo 1 (decisão 0050), pelo nome dela. */
export async function chooseSource(page: Root, name: string | RegExp) {
  await openStep(page, '1');
  const list = page.getByLabel('Dados horários', { exact: true });
  const labels = await list.locator('option').allTextContents();
  const label = labels.find((l) => (typeof name === 'string' ? l === name : name.test(l)));
  expect(label, `fonte ${String(name)} entre ${labels.join(' | ')}`).toBeDefined();
  await list.selectOption({ label: label! });
}

/** O nome da fonte de dados escolhida na lista do passo 1. */
export function chosenSource(page: Root): Promise<string> {
  return page
    .getByLabel('Dados horários', { exact: true })
    .evaluate((s) => (s as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
}
