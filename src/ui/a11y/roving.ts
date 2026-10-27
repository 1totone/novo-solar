import type { KeyboardEvent } from 'react';

/**
 * Setas do teclado num grupo de opções (role="radio") ou de abas (role="tab"), como nos padrões do
 * WAI-ARIA APG (achado 15 da revisão do F2.9): a seta leva o foco à opção seguinte ou anterior,
 * dando a volta, e a escolhe; Home e End vão à primeira e à última. Nos grupos de opções, as quatro
 * setas valem; nas abas, só a esquerda e a direita. Use com rovingTabIndex, para que só a opção
 * escolhida fique na sequência do Tab.
 */
export function onRovingKeyDown(e: KeyboardEvent<HTMLElement>, role: 'radio' | 'tab'): void {
  const next = role === 'tab' ? ['ArrowRight'] : ['ArrowRight', 'ArrowDown'];
  const previous = role === 'tab' ? ['ArrowLeft'] : ['ArrowLeft', 'ArrowUp'];
  if (![...next, ...previous, 'Home', 'End'].includes(e.key)) return;
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>(`[role="${role}"]:not(:disabled)`),
  );
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (i < 0 || items.length === 0) return;
  const n = items.length;
  const j = next.includes(e.key)
    ? (i + 1) % n
    : previous.includes(e.key)
      ? (i - 1 + n) % n
      : e.key === 'Home'
        ? 0
        : n - 1;
  e.preventDefault();
  items[j]!.focus();
  if (j !== i) items[j]!.click();
}

/** tabIndex itinerante: 0 na opção escolhida (ou na primeira, se nenhuma estiver), −1 nas demais. */
export function rovingTabIndex(checked: boolean, index: number, anyChecked: boolean): 0 | -1 {
  return checked || (!anyChecked && index === 0) ? 0 : -1;
}
