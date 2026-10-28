import { useId, type ReactNode } from 'react';
import { useI18n } from '../i18n/useI18n';

/**
 * Um passo da coluna. No celular, como acordeão (decisão 0044): o cabeçalho com o número, o título e,
 * fechado, um resumo de uma linha do que já foi escolhido; aberto, o conteúdo. Quem abre e fecha é a
 * aplicação (um passo aberto por vez); o conteúdo só existe com o passo aberto. No computador
 * (`fixed`, decisão 0050), sempre aberto: só o cabeçalho e o conteúdo, sem resumo.
 */
export function Step({
  n = null,
  heading,
  summary,
  open,
  onOpenChange,
  testId,
  summaryTestId,
  dataStep,
  advanced = false,
  fixed = false,
  children,
}: {
  /** Número do passo (sem número, um painel do grupo avançado, como o das projeções). */
  n?: number | null;
  heading: string;
  summary: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId?: string;
  summaryTestId?: string;
  /** Alvo do tutorial (F4.5): `data-step` do painel. */
  dataStep?: string;
  advanced?: boolean;
  /** Sempre aberto, sem acordeão (computador, decisão 0050). */
  fixed?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  if (fixed) {
    return (
      <section
        className="step-panel fixed"
        aria-labelledby={`${id}-h`}
        data-testid={testId}
        data-step={dataStep}
      >
        {/* Alvo do foco do atalho entre passos (decisão 0040), no leiaute de duas colunas. */}
        <h2 id={`${id}-h`} className="step-heading" tabIndex={-1}>
          {n !== null && <span className="step-n">{n}</span>}
          <span className="step-title">{heading}</span>
        </h2>
        <div className="step-body">{children}</div>
      </section>
    );
  }
  return (
    <section
      className={`step-panel${advanced ? ' advanced-step' : ''}`}
      aria-labelledby={`${id}-h`}
      data-testid={testId}
      data-step={dataStep}
    >
      <details
        open={open}
        // O evento também chega quando a aplicação fecha este passo para abrir outro: só avisa
        // quando o estado do elemento difere do pedido.
        onToggle={(e) => {
          if (e.currentTarget.open !== open) onOpenChange(e.currentTarget.open);
        }}
      >
        <summary>
          <h2 id={`${id}-h`}>
            {n !== null && <span className="step-n">{n}</span>}
            <span className="step-title">{heading}</span>
            {advanced && <span className="step-badge">{t('advanced.badge')}</span>}
            <span className="step-toggle" aria-hidden="true" />
          </h2>
          <span
            className="step-summary"
            data-testid={summaryTestId}
            title={typeof summary === 'string' ? summary : undefined}
          >
            {summary}
          </span>
        </summary>
        {open && <div className="step-body">{children}</div>}
      </details>
    </section>
  );
}

/** Botão no fim de um passo que abre o seguinte (o caminho básico em sequência). */
export function NextStep({
  n,
  heading,
  onClick,
}: {
  n: number;
  heading: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <p className="next-step">
      <button type="button" className="btn" data-testid={`next-step-${n}`} onClick={onClick}>
        {t('steps.next', { n, name: heading })}
      </button>
    </p>
  );
}
