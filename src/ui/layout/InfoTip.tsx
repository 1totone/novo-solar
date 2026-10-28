import type { ReactNode } from 'react';
import type { Info } from './useInfo';

/**
 * Botão "i" ao lado de um campo: mostra e esconde a explicação dele (`InfoText`), para que o passo
 * fique curto e o texto continue a um clique (decisão 0050). `label` é o nome acessível, ex.:
 * "Explicação: orientação da fachada".
 */
export function InfoButton({
  info,
  label,
  testId,
}: {
  info: Info;
  label: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      className="info-btn"
      aria-expanded={info.open}
      aria-controls={info.id}
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={info.toggle}
    >
      <span aria-hidden="true">i</span>
    </button>
  );
}

/** O texto que o `InfoButton` mostra; escondido, sai também da árvore de acessibilidade. */
export function InfoText({
  info,
  testId,
  children,
}: {
  info: Info;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div id={info.id} className="info-text" hidden={!info.open} data-testid={testId}>
      {children}
    </div>
  );
}
