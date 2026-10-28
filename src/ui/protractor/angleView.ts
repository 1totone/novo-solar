/** Desenho de um ângulo do passo 3 (decisão 0046): α no corte, β na planta, γ na vista. */
export type AngleView = 'alpha' | 'beta' | 'gamma';
export const ANGLE_VIEWS: AngleView[] = ['alpha', 'beta', 'gamma'];

/** Desenho do campo em foco: α (e α2) no corte, β na planta, γ na vista; null nos outros. */
export function viewOfKey(key: string): AngleView | null {
  if (/^p?a\d$/.test(key)) return 'alpha';
  if (/^p?b[de]\d$/.test(key)) return 'beta';
  if (/^p?g[de]\d$/.test(key)) return 'gamma';
  return null;
}
