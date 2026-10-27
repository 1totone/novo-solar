import { useI18n } from '../i18n/useI18n';
import { EXAMPLE_IDS, type ExampleId } from './content';
import { useHelpContent } from './useHelpContent';

/**
 * Cartão de um exemplo resolvido (F4.8), no alto dos passos quando o link traz exemplo=<id>: o
 * passo a passo fica à vista enquanto o aluno confere a carta e os passos.
 */
export function ExampleCard({
  id,
  onClose,
  onMore,
}: {
  id: ExampleId;
  onClose: () => void;
  onMore: () => void;
}) {
  const { t } = useI18n();
  const e = useHelpContent().examples.items[id];
  const n = EXAMPLE_IDS.indexOf(id) + 1;
  return (
    <section
      className="example-card"
      aria-labelledby="example-card-title"
      data-testid="example-card"
    >
      <p className="example-card-label">{t('example.label', { n, total: EXAMPLE_IDS.length })}</p>
      <h2 id="example-card-title">{e.title}</h2>
      <p>{e.problem}</p>
      <ol>
        {e.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>
        <strong>{t('help.example.lesson')}:</strong> {e.lesson}
      </p>
      <div className="button-row">
        <button type="button" className="btn" onClick={onMore}>
          {t('example.more')}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          {t('example.close')}
        </button>
      </div>
    </section>
  );
}
