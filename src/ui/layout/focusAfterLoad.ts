/** Parte aberta pelo teclado antes de o código dela chegar (decisão 0039). */
let pending: string | null = null;

/** Guarda que a parte `testId` foi aberta pelo teclado: o foco volta ao resumo quando chegar. */
export function rememberFocus(testId: string) {
  pending = testId;
}

/** Verdadeiro (uma vez) se a parte `testId` estava esperando o foco. */
export function takeFocus(testId: string): boolean {
  if (pending !== testId) return false;
  pending = null;
  return true;
}
