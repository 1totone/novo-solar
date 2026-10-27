import type { MessageKey } from '../i18n/i18n';
import { useI18n } from '../i18n/useI18n';
import type { StepId } from './steps';

/** Passos da coluna, na ordem, com o título de cada um (os mesmos dos painéis). */
const STEPS: readonly [StepId, MessageKey][] = [
  ['1', 'site.heading'],
  ['2', 'facade.heading'],
  ['3', 'protection.heading'],
  ['4', 'data.heading'],
  ['5', 'outputs.heading'],
  ['6', 'geometry.heading'],
  ['7', 'effect.heading'],
];

/**
 * Atalho entre passos (decisão 0040): uma barra com os números dos passos, que só aparece com um
 * passo avançado aberto, quando o passo fica longo. No computador, fica fixa no alto da coluna
 * dos passos; no celular, no pé da tela. Com os passos em acordeão (decisão 0044), cada número
 * abre o passo (fechando o atual), leva até ele e põe o foco no cabeçalho; o aberto fica marcado.
 */
export function StepNav({ current, onGo }: { current: StepId | null; onGo: (id: StepId) => void }) {
  const { t } = useI18n();
  return (
    <nav className="step-nav" aria-label={t('stepNav.label')} data-testid="step-nav">
      <span className="step-nav-title" aria-hidden="true">
        {t('stepNav.title')}
      </span>
      <ol>
        {STEPS.map(([n, key]) => (
          <li key={n}>
            <button
              type="button"
              className="step-nav-n"
              aria-label={t('stepNav.go', { n, name: t(key) })}
              title={t(key)}
              aria-current={current === n ? 'step' : undefined}
              data-testid={`step-nav-${n}`}
              onClick={() => onGo(n)}
            >
              {n}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
