import { useI18n } from '../i18n/useI18n';
import { useHelpContent } from '../help/useHelpContent';
import type { HashState } from '../state/hashState';
import { TUTORIAL_STEPS } from './tutorial';

/**
 * Cartão do tutorial guiado (F4.5, spec 12, seção 12.1), no alto dos passos: o texto curto da
 * etapa, se a ação já foi feita, "Fazer por mim" e a navegação entre as etapas.
 */
export function TutorialCard({
  step,
  hash,
  onChange,
}: {
  /** Etapa atual, de 1 ao número de etapas. */
  step: number;
  hash: HashState;
  onChange: (patch: HashState) => void;
}) {
  const { t } = useI18n();
  const text = useHelpContent().tutorial.steps[step - 1]!;
  const def = TUTORIAL_STEPS[step - 1]!;
  const total = TUTORIAL_STEPS.length;
  const done = def.done ? def.done(hash) : null;
  const last = step === total;
  return (
    <section
      className="example-card tutorial-card"
      aria-labelledby="tutorial-card-title"
      data-testid="tutorial-card"
    >
      <p className="example-card-label">{t('tutorial.label', { n: step, total })}</p>
      <h2 id="tutorial-card-title">{text.title}</h2>
      <p>{text.text}</p>
      {done === true && (
        <p className="tutorial-done" role="status" data-testid="tutorial-done">
          {t('tutorial.done')}
        </p>
      )}
      <div className="button-row">
        {done === false && def.patch && (
          <button type="button" className="btn" onClick={() => onChange(def.patch!)}>
            {t('tutorial.doIt')}
          </button>
        )}
        {step > 1 && (
          <button
            type="button"
            className="btn"
            onClick={() => onChange({ tutorial: String(step - 1) })}
          >
            {t('tutorial.previous')}
          </button>
        )}
        <button
          type="button"
          className="btn primary"
          onClick={() => onChange({ tutorial: last ? '' : String(step + 1) })}
        >
          {t(last ? 'tutorial.finish' : 'tutorial.next')}
        </button>
        {!last && (
          <button type="button" className="btn" onClick={() => onChange({ tutorial: '' })}>
            {t('tutorial.close')}
          </button>
        )}
      </div>
    </section>
  );
}
