import type { Site } from '../../core/chart/sunChart';
import type { SkyPolygon } from '../../core/mask/mask';
import { useHelpContent } from '../help/useHelpContent';
import { useI18n } from '../i18n/useI18n';
import type { HashState } from '../state/hashState';
import { useExercise } from './exerciseClient';
import { EXERCISE_IDS, EXERCISES, type ExerciseId } from './exercises';

/** Leitura proposta da coincidência (spec 12, seção 12.3; decisão 0033). */
const GOOD = 0.9;
const ALMOST = 0.75;

/**
 * Cartão do exercício de máscara (F4.5, spec 12, seção 12.2), no alto dos passos: o enunciado,
 * desenhar, conferir (no worker) e o resultado, com a resposta hachurada na carta.
 */
export function ExerciseCard({
  id,
  site,
  orientation,
  drawn,
  checked,
  onChange,
  onStartDrawing,
}: {
  id: ExerciseId;
  /** Local do exercício (as posições do sol da comparação). */
  site: Site;
  /** Orientação atual do passo 2 (para avisar se mudou). */
  orientation: number;
  /** Polígonos da sombra total desenhados (dt). */
  drawn: SkyPolygon[];
  checked: boolean;
  onChange: (patch: HashState) => void;
  onStartDrawing: () => void;
}) {
  const { t, formatNumber } = useI18n();
  const e = useHelpContent().exercises.items[id];
  const def = EXERCISES[id];
  const n = EXERCISE_IDS.indexOf(id) + 1;
  const { result, pending, failed } = useExercise(checked ? { id, site, drawn } : null);
  const percent = (v: number | null) => formatNumber(100 * (v ?? 0), 0);
  const shape = result?.shape.jaccard ?? null;
  const changed = ((orientation % 360) + 360) % 360 !== def.orientation;
  return (
    <section
      className="example-card exercise-card"
      aria-labelledby="exercise-card-title"
      data-testid="exercise-card"
    >
      <p className="example-card-label">{t('exercise.label', { n, total: EXERCISE_IDS.length })}</p>
      <h2 id="exercise-card-title">{e.title}</h2>
      <p>{e.statement}</p>
      <p className="note">{t('exercise.drawn', { count: drawn.length })}</p>
      {changed && (
        <p className="error" role="alert">
          {t('exercise.orientationChanged', { orientation: def.orientation })}
        </p>
      )}
      <div className="button-row">
        <button type="button" className="btn" onClick={onStartDrawing}>
          {t('exercise.startDrawing')}
        </button>
        <button type="button" className="btn primary" onClick={() => onChange({ conferir: '1' })}>
          {t('exercise.check')}
        </button>
      </div>
      {checked && (
        <div className="exercise-result" aria-live="polite" data-testid="exercise-result">
          {pending && <p role="status">{t('exercise.pending')}</p>}
          {failed && (
            <p className="error" role="alert">
              {t('exercise.failed')}
            </p>
          )}
          {result && (
            <>
              <p className="exercise-score" data-testid="exercise-score">
                {t('exercise.shape', { value: percent(shape) })}
              </p>
              <p>
                {t(
                  shape !== null && shape >= GOOD
                    ? 'exercise.good'
                    : shape !== null && shape >= ALMOST
                      ? 'exercise.almost'
                      : 'exercise.retry',
                )}
              </p>
              <ul>
                <li>{t('exercise.missed', { value: percent(result.shape.missed) })}</li>
                <li>{t('exercise.extra', { value: percent(result.shape.extra) })}</li>
                {result.sun && (
                  <li data-testid="exercise-sun">
                    {t('exercise.sun', { value: percent(result.sun.jaccard) })}
                  </li>
                )}
              </ul>
              <p className="note">{t('exercise.legend')}</p>
            </>
          )}
        </div>
      )}
      <div className="button-row">
        <button
          type="button"
          className="btn"
          onClick={() => onChange({ dt: '', dp: '', conferir: '' })}
        >
          {t('exercise.redo')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onChange({ exercicio: '', conferir: '' })}
        >
          {t('exercise.close')}
        </button>
      </div>
    </section>
  );
}
