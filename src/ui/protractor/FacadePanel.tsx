import { useId } from 'react';
import { useI18n } from '../i18n/useI18n';
import type { ProtractorState } from '../state/protractorHash';

function normalize(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r + 0;
}

export function FacadePanel({
  state,
  rawOrientation,
  onChange,
}: {
  state: ProtractorState;
  rawOrientation: string;
  onChange: (patch: Record<string, string>) => void;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const points = t('compass.points').split(',');
  const o = normalize(state.orientation);
  const compass = points[Math.round(o / 22.5) % 16]!;

  return (
    <section className="step-panel" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>
        <span className="step-n">2</span>
        {t('facade.heading')}
      </h2>
      <div className="field">
        <label htmlFor={`${id}-o`}>{t('facade.orientation')}</label>
        <input
          id={`${id}-o`}
          type="text"
          inputMode="decimal"
          value={rawOrientation}
          placeholder="0"
          aria-invalid={!state.orientationValid}
          onChange={(e) => onChange({ o: e.target.value })}
        />
        {state.orientationValid ? (
          <p className="note" data-testid="normal-azimuth">
            {t('facade.normalized', {
              degrees: formatNumber(o, Number.isInteger(o) ? 0 : 1),
              compass,
            })}
          </p>
        ) : (
          <p className="error" role="alert">
            {t('facade.orientationInvalid')}
          </p>
        )}
        <p className="note">{t('facade.orientationHelp')}</p>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={state.show}
          onChange={(e) => onChange({ tr: e.target.checked ? '' : '0' })}
        />
        {t('facade.showProtractor')}
      </label>
    </section>
  );
}
