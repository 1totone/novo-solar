import { useId, useState } from 'react';
import { onRovingKeyDown, rovingTabIndex } from '../a11y/roving';
import { useI18n } from '../i18n/useI18n';
import { NextStep, Step } from '../layout/Step';
import { compassAzimuth } from '../state/orientation';
import type { ProtractorState } from '../state/protractorHash';

function normalize(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r + 0;
}

/**
 * Rumos dos botões, no sentido horário a partir do Norte (a ordem das setas do teclado), e a casa de
 * cada um na rosa 3 × 3 (linha, coluna), com o Norte em cima.
 */
const ROSE: { index: number; row: number; col: number }[] = [
  { index: 0, row: 1, col: 2 },
  { index: 2, row: 1, col: 3 },
  { index: 4, row: 2, col: 3 },
  { index: 6, row: 3, col: 3 },
  { index: 8, row: 3, col: 2 },
  { index: 10, row: 3, col: 1 },
  { index: 12, row: 2, col: 1 },
  { index: 14, row: 1, col: 1 },
];

/**
 * Planta da fachada no centro da rosa: a parede e a seta da normal externa, com o Norte em cima (a
 * mesma orientação da carta).
 */
function FacadePlan({ orientation }: { orientation: number }) {
  return (
    <svg
      className="facade-plan"
      viewBox="-20 -20 40 40"
      aria-hidden="true"
      data-testid="facade-plan"
    >
      <circle r={18.5} className="facade-plan-ring" />
      <g transform={`rotate(${orientation})`}>
        <line x1={-11} y1={4} x2={11} y2={4} className="facade-plan-wall" />
        <line x1={0} y1={2} x2={0} y2={-11} className="facade-plan-normal" />
        <path d="M-4,-9 L0,-15 L4,-9 Z" className="facade-plan-arrow" />
      </g>
    </svg>
  );
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
  const names = t('compass.names').split(',');
  const o = normalize(state.orientation);
  const nearest = Math.round(o / 22.5) % 16;
  const compass = points[nearest]!;
  const degrees = formatNumber(o, Number.isInteger(o) ? 0 : 1);
  const exact = Math.abs(o - Math.round(o / 22.5) * 22.5) < 1e-9;
  // O campo guarda o que foi digitado ("NO"); o link guarda o número (315). Muda por fora quando o
  // link muda (botão de rumo, projeto aberto, tutorial).
  const [text, setText] = useState(rawOrientation);
  const [synced, setSynced] = useState(rawOrientation);
  if (rawOrientation !== synced) {
    setSynced(rawOrientation);
    setText(rawOrientation);
  }
  const setOrientation = (value: string) => {
    setSynced(value);
    onChange({ o: value });
  };
  const onType = (value: string) => {
    setText(value);
    const rumo = compassAzimuth(value);
    setOrientation(rumo === null ? value : String(rumo));
  };
  const anyChecked = state.orientationValid && ROSE.some((r) => r.index * 22.5 === o);
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
        <div className="orientation-row">
          <input
            id={`${id}-o`}
            type="text"
            autoComplete="off"
            value={text}
            placeholder="0"
            aria-invalid={!state.orientationValid}
            aria-describedby={`${id}-n`}
            onChange={(e) => onType(e.target.value)}
          />
          {state.orientationValid && (
            <output id={`${id}-n`} className="orientation-name" data-testid="normal-azimuth">
              {t(exact ? 'facade.normalizedExact' : 'facade.normalizedNear', {
                degrees,
                name: names[nearest]!,
                compass,
              })}
            </output>
          )}
        </div>
        {!state.orientationValid && (
          <p className="error" role="alert" id={`${id}-n`}>
            {t('facade.orientationInvalid')}
          </p>
        )}
      </div>
      <div className="field">
        <span className="field-label" id={`${id}-r`}>
          {t('facade.compass')}
        </span>
        <div className="facade-rose">
          <div
            className="facade-rose-buttons"
            role="radiogroup"
            aria-labelledby={`${id}-r`}
            onKeyDown={(e) => onRovingKeyDown(e, 'radio')}
          >
            {ROSE.map(({ index, row, col }, i) => {
              const azimuth = index * 22.5;
              const checked = state.orientationValid && o === azimuth;
              return (
                <button
                  key={index}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={t('facade.compassButton', {
                    name: names[index]!,
                    degrees: formatNumber(azimuth),
                  })}
                  tabIndex={rovingTabIndex(checked, i, anyChecked)}
                  style={{ gridRow: row, gridColumn: col }}
                  data-testid={`compass-${azimuth}`}
                  onClick={() => {
                    setText(String(azimuth));
                    setOrientation(String(azimuth));
                  }}
                >
                  {points[index]}
                </button>
              );
            })}
            <div className="facade-rose-center" style={{ gridRow: 2, gridColumn: 2 }}>
              <FacadePlan orientation={o} />
            </div>
          </div>
        </div>
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
