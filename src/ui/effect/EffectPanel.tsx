import { useId } from 'react';
import { ADAPTIVE, SHADING_THRESHOLD } from '../../core/comfort/classification';
import type { EpwData } from '../../core/epw/parseEpw';
import { SideSlot } from '../layout/SideResults';
import { useI18n } from '../i18n/useI18n';
import {
  classificationFromHash,
  fieldPatch,
  methodPatch,
  type ClassificationField,
  type MethodKind,
} from '../state/classificationHash';
import type { GeometryState } from '../state/geometryHash';
import type { HashState } from '../state/hashState';
import { ClassBar } from './ClassBar';
import { IndicatorsSection } from './IndicatorsSection';
import { CLASS_ORDER, type ClassName } from './classColors';
import { useYearEffect } from './useYearEffect';

/** Passo 7: efeito no ano (F3.4: classificação das horas, com as hipóteses na tela). */
export function EffectPanel({
  epw,
  hash,
  geometry,
  orientation,
  onChange,
  open,
  onOpenChange,
}: {
  epw: EpwData | null;
  hash: HashState;
  geometry: GeometryState;
  orientation: number;
  onChange: (patch: Record<string, string>) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const cls = classificationFromHash(hash);
  const { annual, shares, classes } = useYearEffect(epw, geometry, orientation, cls, open);
  const fmt1 = (v: number) => formatNumber(v, 1);
  const pct = (v: number) => formatNumber(Math.round(v * 100));

  const field = (f: ClassificationField, label: string) => (
    <div className="field" key={f}>
      <label htmlFor={`${id}-${f}`}>{label}</label>
      <input
        id={`${id}-${f}`}
        type="text"
        inputMode="decimal"
        value={cls.raw[f]}
        placeholder={
          f === 'alpha'
            ? '0,8'
            : f === 'days'
              ? cls.averaging === 'exponential'
                ? '30'
                : '7'
              : f === 'gains'
                ? '0'
                : ''
        }
        aria-invalid={cls.invalid.includes(f)}
        data-testid={`classes-${f}`}
        onChange={(e) => onChange(fieldPatch(cls, f, e.target.value))}
      />
    </div>
  );

  const radio = (
    name: string,
    value: string,
    checked: boolean,
    label: string,
    patch: Record<string, string>,
    testId: string,
  ) => (
    <label className="check" key={value}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        data-testid={testId}
        onChange={() => onChange(patch)}
      />
      {label}
    </label>
  );

  const method = cls.method;
  const hypotheses: string[] = [t('classes.h1')];
  if (method?.kind === 'adaptive') {
    hypotheses.push(
      t('classes.h2.adaptive', {
        acceptability: method.acceptability,
        half: formatNumber(ADAPTIVE.halfWidth[method.acceptability], 1),
        averaging:
          method.running.averaging === 'exponential'
            ? t('classes.averagingDetail.exponential', {
                alpha: formatNumber(method.running.alpha, 2),
                days: method.running.days,
              })
            : t('classes.averagingDetail.arithmetic', { days: method.running.days }),
      }),
      method.gains
        ? t('classes.h2.gains', { gains: formatNumber(method.gains, 1) })
        : t('classes.h2.noGains'),
    );
    if (shares) {
      hypotheses.push(t('classes.h3', { count: shares.byClass.none.hours, hours: shares.hours }));
    }
  } else if (method?.kind === 'thresholds') {
    if (method.cold === SHADING_THRESHOLD && method.hot === SHADING_THRESHOLD) {
      hypotheses.push(t('classes.h2.threshold20'));
    } else {
      hypotheses.push(
        t('classes.h2.thresholds', {
          cold:
            method.cold === null
              ? t('classes.h2.noCold')
              : t('classes.h2.coldBelow', { value: formatNumber(method.cold, 1) }),
          hot:
            method.hot === null
              ? t('classes.h2.noHot')
              : t('classes.h2.hotAbove', { value: formatNumber(method.hot, 1) }),
        }),
      );
    }
  } else if (method?.kind === 'balance') {
    hypotheses.push(t('classes.h2.balance', { balance: formatNumber(method.balance, 1) }));
  }
  hypotheses.push(t(cls.mode === 'end' ? 'classes.h4.end' : 'classes.h4.mean'));
  if (shares) {
    hypotheses.push(
      t('classes.h5', {
        hours: shares.hours,
        orientation: formatNumber(orientation, Number.isInteger(orientation) ? 0 : 1),
      }),
    );
  }

  const hourShares =
    shares && shares.hours > 0
      ? (Object.fromEntries(
          CLASS_ORDER.map((c) => [c, shares.byClass[c].hours / shares.hours]),
        ) as Record<ClassName, number>)
      : null;
  const radShares =
    shares && shares.incident > 0
      ? (Object.fromEntries(
          CLASS_ORDER.map((c) => [c, shares.byClass[c].incident / shares.incident]),
        ) as Record<ClassName, number>)
      : null;

  return (
    <section
      className="step-panel advanced-step"
      aria-labelledby={`${id}-h`}
      data-testid="effect-panel"
    >
      <details open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)}>
        <summary>
          <h2 id={`${id}-h`}>
            <span className="step-n">7</span>
            {t('effect.heading')}
            <span className="step-badge">{t('advanced.badge')}</span>
          </h2>
          <span className="step-summary">{t('effect.summary')}</span>
        </summary>
        {!epw ? (
          <p className="note" data-testid="effect-needs-data">
            {t('effect.needsData')}
          </p>
        ) : (
          <>
            {!geometry.window && <p className="note">{t('effect.noWindow')}</p>}
            <h3 className="sub-heading">{t('classes.heading')}</h3>
            <fieldset className="field plain">
              <legend className="field-label">{t('classes.method')}</legend>
              {(['adaptive', 'thresholds', 'balance'] as MethodKind[]).map((k) =>
                radio(
                  `${id}-method`,
                  k,
                  cls.kind === k,
                  t(`classes.method.${k}`),
                  methodPatch(k, hash),
                  `classes-method-${k}`,
                ),
              )}
            </fieldset>
            {cls.kind === 'adaptive' && (
              <>
                <div className="piece-grid">
                  <div className="field">
                    <label htmlFor={`${id}-acc`}>{t('classes.acceptability')}</label>
                    <select
                      id={`${id}-acc`}
                      value={cls.acceptability}
                      data-testid="classes-acceptability"
                      onChange={(e) => onChange({ ca: e.target.value === '90' ? '90' : '' })}
                    >
                      <option value={80}>80%</option>
                      <option value={90}>90%</option>
                    </select>
                  </div>
                  {field('gains', t('classes.gains'))}
                </div>
                <p className="note">{t('classes.gainsHelp')}</p>
              </>
            )}
            {cls.kind === 'thresholds' && (
              <>
                <div className="piece-grid">
                  {field('cold', t('classes.cold'))}
                  {field('hot', t('classes.hot'))}
                </div>
                <p className="note">{t('classes.thresholdsHelp')}</p>
                <button
                  type="button"
                  className="btn"
                  data-testid="classes-suggest20"
                  onClick={() => onChange({ cm: '', tf: '', tq: '' })}
                >
                  {t('classes.suggest20')}
                </button>
                <p className="note">{t('classes.suggest20Source')}</p>
              </>
            )}
            {cls.kind === 'balance' && (
              <>
                <div className="piece-grid">{field('balance', t('classes.balance'))}</div>
                <p className="note">{t('classes.balanceHelp')}</p>
              </>
            )}
            <details className="more">
              <summary>{t('classes.more')}</summary>
              {cls.kind === 'adaptive' && (
                <fieldset className="field plain">
                  <legend className="field-label">{t('classes.averaging')}</legend>
                  {radio(
                    `${id}-avg`,
                    'e',
                    cls.averaging === 'exponential',
                    t('classes.averaging.exponential'),
                    { cr: '' },
                    'classes-averaging-exponential',
                  )}
                  {radio(
                    `${id}-avg`,
                    'm',
                    cls.averaging === 'arithmetic',
                    t('classes.averaging.arithmetic'),
                    { cr: 'm' },
                    'classes-averaging-arithmetic',
                  )}
                  <div className="piece-grid">
                    {cls.averaging === 'exponential' && field('alpha', t('classes.alpha'))}
                    {field('days', t('classes.days'))}
                  </div>
                </fieldset>
              )}
              <fieldset className="field plain">
                <legend className="field-label">{t('classes.hourTemp')}</legend>
                {radio(
                  `${id}-ht`,
                  'm',
                  cls.mode === 'mean',
                  t('classes.hourTemp.mean'),
                  { ct: '' },
                  'classes-hour-mean',
                )}
                {radio(
                  `${id}-ht`,
                  'f',
                  cls.mode === 'end',
                  t('classes.hourTemp.end'),
                  { ct: 'f' },
                  'classes-hour-end',
                )}
              </fieldset>
            </details>
            {cls.invalid.length > 0 && (
              <p className="error" role="alert">
                {t('classes.invalid')}
              </p>
            )}
            {cls.invalid.length === 0 && !method && (
              <p className="note" data-testid="classes-incomplete">
                {t('classes.incomplete')}
              </p>
            )}
            <SideSlot
              slot="effect"
              active={open}
              step={7}
              stepName={t('effect.heading')}
              title={t('side.effect')}
            >
              <h4 className="sub-heading">{t('classes.hypotheses')}</h4>
              <ul className="hypotheses" data-testid="classes-hypotheses">
                {hypotheses.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              {annual.pending && (
                <p className="overlay-pending" role="status" data-testid="effect-pending">
                  {t('effect.pending')}
                </p>
              )}
              {shares && method && (
                <div className="class-results" data-testid="classes-results">
                  {(
                    [
                      ['radiation', radShares, 'classes.radiationShares'],
                      ['hours', hourShares, 'classes.hoursShares'],
                    ] as const
                  ).map(
                    ([kind, part, title]) =>
                      part && (
                        <div key={kind} className="class-share">
                          <p className="field-label">{t(title)}</p>
                          <ClassBar shares={part} label={t(title)} testId={`class-bar-${kind}`} />
                          <p className="legend class-legend" aria-hidden="true">
                            {CLASS_ORDER.filter((c) => part[c] > 0).map((c) => (
                              <span className="legend-item" key={c}>
                                <span className={`swatch class-${c}`} />
                                {t('classes.barLabel', {
                                  name: t(`classes.class.${c}`),
                                  share: pct(part[c]),
                                })}
                              </span>
                            ))}
                          </p>
                        </div>
                      ),
                  )}
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label={t('classes.tableCaption')}
                  >
                    <table className="data-table" data-testid="classes-table">
                      <caption>{t('classes.tableCaption')}</caption>
                      <thead>
                        <tr>
                          <th scope="col">{t('classes.col.class')}</th>
                          <th scope="col">{t('classes.col.hours')}</th>
                          <th scope="col">{t('classes.col.share')}</th>
                          <th scope="col">{t('classes.col.radiation')}</th>
                          <th scope="col">{t('classes.col.share')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CLASS_ORDER.map((c) => (
                          <tr key={c} data-class={c}>
                            <th scope="row">{t(`classes.class.${c}`)}</th>
                            <td>{shares.byClass[c].hours}</td>
                            <td>{hourShares ? pct(hourShares[c]) : ''}</td>
                            <td>{fmt1(shares.byClass[c].incident / 1000)}</td>
                            <td>{radShares ? pct(radShares[c]) : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {shares.missingDni > 0 && (
                    <p className="note">{t('classes.missingDni', { count: shares.missingDni })}</p>
                  )}
                </div>
              )}
              {open && (
                <IndicatorsSection
                  epw={epw}
                  classes={classes}
                  hash={hash}
                  geometry={geometry}
                  orientation={orientation}
                  onChange={onChange}
                />
              )}
            </SideSlot>
          </>
        )}
      </details>
    </section>
  );
}
