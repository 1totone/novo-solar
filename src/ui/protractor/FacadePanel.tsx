import { useId } from 'react';
import { useI18n } from '../i18n/useI18n';
import { NextStep, Step } from '../layout/Step';
import type { ProtractorState } from '../state/protractorHash';

function normalize(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r + 0;
}

export function FacadePanel({
  state,
  rawOrientation,
  onChange,
  open,
  onOpenChange,
  onNext,
}: {
  state: ProtractorState;
  rawOrientation: string;
  onChange: (patch: Record<string, string>) => void;
  /** Passo aberto no acordeão (decisão 0044). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNext: () => void;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const points = t('compass.points').split(',');
  const o = normalize(state.orientation);
  const compass = points[Math.round(o / 22.5) % 16]!;
  const degrees = formatNumber(o, Number.isInteger(o) ? 0 : 1);
  const summary = state.orientationValid
    ? [
        t('steps.facade', { degrees, compass }),
        ...(state.show ? [] : [t('steps.facade.noProtractor')]),
      ].join(' · ')
    : t('steps.facade.invalid');

  return (
    <Step
      n={2}
      heading={t('facade.heading')}
      summary={summary}
      summaryTestId="facade-summary"
      open={open}
      onOpenChange={onOpenChange}
      testId="facade-panel"
      dataStep="2"
    >
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
            {t('facade.normalized', { degrees, compass })}
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
      <NextStep n={3} heading={t('protection.heading')} onClick={onNext} />
    </Step>
  );
}
