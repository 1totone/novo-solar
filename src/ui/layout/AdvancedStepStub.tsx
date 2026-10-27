import { useEffect, useId } from 'react';
import { useI18n } from '../i18n/useI18n';
import { rememberFocus, takeFocus } from './focusAfterLoad';

/**
 * Cabeçalho de um passo avançado (6 ou 7) enquanto o código dele não está carregado (decisão
 * 0039): o mesmo título e o mesmo resumo do passo, recolhido. Ao abrir, o passo carrega sob
 * demanda e este cabeçalho fica no lugar, com "Carregando…", até o passo chegar.
 */
export function AdvancedStepStub({
  n = null,
  heading,
  summary,
  testId,
  summaryTestId,
  open,
  onOpenChange,
}: {
  /** Número do passo (sem número, um painel do grupo avançado, como o das projeções). */
  n?: number | null;
  heading: string;
  summary: string;
  testId: string;
  summaryTestId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  return (
    <section className="step-panel advanced-step" aria-labelledby={`${id}-h`} data-testid={testId}>
      <details
        open={open}
        onToggle={(e) => {
          const opening = e.currentTarget.open;
          // Quem abriu pelo teclado continua com o foco no resumo do passo carregado.
          if (opening && e.currentTarget.contains(document.activeElement)) rememberFocus(testId);
          onOpenChange(opening);
        }}
      >
        <summary>
          <h2 id={`${id}-h`}>
            {n !== null && <span className="step-n">{n}</span>}
            {heading}
            <span className="step-badge">{t('advanced.badge')}</span>
          </h2>
          <span className="step-summary" data-testid={summaryTestId}>
            {summary}
          </span>
        </summary>
        {open && (
          <p className="note" role="status">
            {t('advanced.loading')}
          </p>
        )}
      </details>
    </section>
  );
}

/**
 * Devolve o foco ao resumo da parte `testId` quando ela termina de carregar: por padrão, o de um
 * passo (`section > details > summary`); `summary` troca o seletor.
 */
export function RestoreStepFocus({ testId, summary }: { testId: string; summary?: string }) {
  useEffect(() => {
    if (!takeFocus(testId)) return;
    document
      .querySelector<HTMLElement>(summary ?? `[data-testid="${testId}"] > details > summary`)
      ?.focus({ preventScroll: true });
  }, [testId, summary]);
  return null;
}
