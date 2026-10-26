import { useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/useI18n';
import { SideResultsContext, type SideSlotName } from './sideResultsContext';

/**
 * Mostra `children` no lugar `slot` do painel da direita, quando ele existe, e deixa na coluna
 * dos passos uma linha que leva até lá; sem o lugar, mostra `children` ali mesmo.
 */
export function SideSlot({
  slot,
  active,
  step,
  stepName,
  title,
  children,
}: {
  slot: SideSlotName;
  /** Passo aberto: com ele fechado, o resultado fica escondido dentro do passo. */
  active: boolean;
  /** Número do passo de onde o resultado vem. */
  step: number;
  /** Nome do passo, no cabeçalho do bloco ao lado. */
  stepName: string;
  /** Nome do resultado, na linha deixada no passo. */
  title: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const target = useContext(SideResultsContext)[slot] ?? null;
  if (!target || !active) return <>{children}</>;
  const headingId = `side-${slot}-h`;
  return (
    <>
      <p className="side-pointer" data-testid={`side-pointer-${slot}`}>
        {t('side.pointer', { title })}{' '}
        <button
          type="button"
          className="btn small"
          onClick={() => {
            const heading = document.getElementById(headingId);
            heading?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            heading?.focus({ preventScroll: true });
          }}
        >
          {t('side.go')}
        </button>
      </p>
      {createPortal(
        <section
          className="side-result"
          aria-labelledby={headingId}
          data-testid={`side-result-${slot}`}
        >
          <h3 className="side-result-heading" id={headingId} tabIndex={-1}>
            {t('side.heading', { step, name: stepName })}
          </h3>
          {children}
        </section>,
        target,
      )}
    </>
  );
}
