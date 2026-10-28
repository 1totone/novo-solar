import { useId, useState } from 'react';
import type { HourClassification } from '../../core/comfort/classification';
import type { EpwData } from '../../core/epw/parseEpw';
import type { HourlyShading } from '../../core/shading/hourly';
import {
  beamIndicators,
  dominators,
  hourlyBeam,
  type BeamIndicators,
} from '../../core/shading/indicators';
import { annualQueue } from '../annual/annualClient';
import { useI18n } from '../i18n/useI18n';
import {
  alternativesFromHash,
  alternativesPatch,
  geometryCode,
  MAX_ALTERNATIVES,
  applyAlternativePatch,
} from '../state/alternativesHash';
import type { GeometryState } from '../state/geometryHash';
import type { HashState } from '../state/hashState';
import { useQueuedAll } from '../workers/useQueued';
import { AlternativesPlot, type PlotPoint } from './AlternativesPlot';

interface Row {
  id: string;
  label: string;
  code: string;
  geometry: GeometryState;
  saved: boolean;
}

/** Indicadores já calculados, por arquivo, fração ensolarada e classificação. */
const cache = new WeakMap<
  EpwData,
  WeakMap<HourlyShading, WeakMap<HourClassification, BeamIndicators>>
>();

function indicatorsOf(
  epw: EpwData,
  hourly: HourlyShading,
  classes: HourClassification,
): BeamIndicators {
  let byHourly = cache.get(epw);
  if (!byHourly) cache.set(epw, (byHourly = new WeakMap()));
  let byClasses = byHourly.get(hourly);
  if (!byClasses) byHourly.set(hourly, (byClasses = new WeakMap()));
  let ind = byClasses.get(classes);
  if (!ind) {
    ind = beamIndicators(hourlyBeam(hourly, epw, epw.fields.directNormal), classes.classes);
    byClasses.set(classes, ind);
  }
  return ind;
}

const hasPlates = (g: GeometryState) =>
  g.window !== null && (g.devices.length > 0 || (g.window.setback ?? 0) > 0);

/** Passo 7, F3.5: radiação direta bloqueada e admitida da proteção atual e das alternativas. */
export function IndicatorsSection({
  epw,
  classes,
  hash,
  geometry,
  orientation,
  onChange,
}: {
  epw: EpwData;
  classes: HourClassification | null;
  hash: HashState;
  geometry: GeometryState;
  orientation: number;
  onChange: (patch: Record<string, string>) => void;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const [name, setName] = useState('');
  const alternatives = alternativesFromHash(hash);
  const currentCode = geometryCode(hash);
  const saved = alternatives.find((a) => a.code === currentCode);
  const rows: Row[] = alternatives.map((a) => ({
    id: a.key,
    label: a.label,
    code: a.code,
    geometry: a.geometry,
    saved: true,
  }));
  if (hasPlates(geometry) && !saved) {
    rows.push({
      id: 'atual',
      label: t('alternatives.current'),
      code: currentCode,
      geometry,
      saved: false,
    });
  }
  const valid = rows.filter((r) => hasPlates(r.geometry));
  const site = {
    latitude: epw.location.latitude,
    longitude: epw.location.longitude,
    elevation: epw.location.elevation,
    timeZone: epw.location.timeZone,
  };
  const { results } = useQueuedAll(
    annualQueue,
    valid.map((r) => ({
      site,
      window: r.geometry.window!,
      devices: r.geometry.devices,
      orientation,
    })),
  );
  const indicators = new Map<string, BeamIndicators>();
  if (classes) {
    valid.forEach((r, i) => {
      const hourly = results[i];
      if (hourly) indicators.set(r.id, indicatorsOf(epw, hourly, classes));
    });
  }

  const pct = (v: number | null) => (v === null ? '' : `${formatNumber(v * 100, 1)}%`);
  const kwh = (v: number) => formatNumber(v / 1000, 1);
  const currentId = saved?.key ?? 'atual';
  const current = indicators.get(currentId) ?? null;
  // Sem proteção: tudo o que chega é admitido (0% bloqueado, 100% admitido onde há radiação).
  const any = [...indicators.values()][0] ?? null;
  const none = any
    ? {
        blockedInHot: any.byClass.hot.incident > 0 ? 0 : null,
        admittedInCold: any.byClass.cold.incident > 0 ? 1 : null,
      }
    : null;
  const compared = [
    ...(none ? [{ id: 'sem', indicators: none }] : []),
    ...[...indicators.entries()].map(([rid, ind]) => ({ id: rid, indicators: ind })),
  ];
  const beaten = dominators(compared);
  const beatenBy = new Map(compared.map((c, i) => [c.id, beaten[i]!]));
  const labelOf = (rid: string) =>
    rid === 'sem' ? t('alternatives.none') : (rows.find((r) => r.id === rid)?.label ?? rid);
  const status = (rid: string) => {
    const by = beatenBy.get(rid);
    if (!by) return t('alternatives.calculating');
    return by.length === 0
      ? t('alternatives.notDominated')
      : t('alternatives.dominatedBy', { names: by.map(labelOf).join(', ') });
  };
  const win = geometry.window;
  const sameWindow = (g: GeometryState) =>
    win !== null &&
    g.window !== null &&
    g.window.width === win.width &&
    g.window.height === win.height &&
    (g.window.setback ?? 0) === (win.setback ?? 0);

  const points: PlotPoint[] = compared
    .filter((c) => c.indicators.blockedInHot !== null && c.indicators.admittedInCold !== null)
    .map((c) => ({
      id: c.id,
      label: labelOf(c.id),
      x: c.indicators.admittedInCold!,
      y: c.indicators.blockedInHot!,
      dominated: (beatenBy.get(c.id)?.length ?? 0) > 0,
      current: c.id === currentId,
    }));

  const save = () => {
    if (alternatives.length >= MAX_ALTERNATIVES || !hasPlates(geometry) || saved) return;
    onChange(
      alternativesPatch([
        ...alternatives.map((a) => ({ label: a.label, code: a.code })),
        { label: name.trim(), code: currentCode },
      ]),
    );
    setName('');
  };

  return (
    <div className="indicators" data-testid="indicators-section">
      <h3 className="sub-heading">{t('indicators.heading')}</h3>
      {!hasPlates(geometry) && alternatives.length === 0 ? (
        <p className="note" data-testid="indicators-needs-geometry">
          {t('indicators.needsGeometry')}
        </p>
      ) : !classes ? (
        <p className="note">{t('indicators.needsClasses')}</p>
      ) : (
        <>
          {current && (
            <>
              <div className="indicator-tiles" data-testid="indicator-tiles">
                {(
                  [
                    ['blockedInHot', current.blockedInHot, current.byClass.hot.incident],
                    ['admittedInCold', current.admittedInCold, current.byClass.cold.incident],
                  ] as const
                ).map(([k, v, incident]) => (
                  <div className="indicator-tile" key={k} data-testid={`indicator-${k}`}>
                    <p className="tile-label">{t(`indicators.${k}`)}</p>
                    <p className="tile-value">
                      {v === null ? t('indicators.undefinedValue') : pct(v)}
                    </p>
                    <p className="tile-note">
                      {v === null
                        ? t('indicators.undefined')
                        : t('indicators.ofIncident', { incident: kwh(incident) })}
                    </p>
                  </div>
                ))}
              </div>
              <p className="note">{t('indicators.ideal')}</p>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label={t('indicators.tableCaption')}
              >
                <table className="data-table" data-testid="indicators-table">
                  <caption>{t('indicators.tableCaption')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('classes.col.class')}</th>
                      <th scope="col">{t('indicators.col.incident')}</th>
                      <th scope="col">{t('indicators.col.admitted')}</th>
                      <th scope="col">{t('indicators.col.blocked')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['cold', 'neutral', 'hot', 'none'] as const).map((c) => (
                      <tr key={c} data-class={c}>
                        <th scope="row">{t(`classes.class.${c}`)}</th>
                        <td>{kwh(current.byClass[c].incident)}</td>
                        <td>{kwh(current.byClass[c].admitted)}</td>
                        <td>{kwh(current.byClass[c].blocked)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {current.missingDni > 0 && (
                <p className="note">{t('indicators.missingDni', { count: current.missingDni })}</p>
              )}
            </>
          )}
          <p className="note">{t('indicators.hypotheses')}</p>

          <h3 className="sub-heading">{t('alternatives.heading')}</h3>
          <p className="note">{t('alternatives.intro')}</p>
          <div className="add-piece">
            <label className="visually-hidden" htmlFor={`${id}-name`}>
              {t('alternatives.name')}
            </label>
            <input
              id={`${id}-name`}
              type="text"
              value={name}
              placeholder={t('alternatives.name')}
              maxLength={40}
              data-testid="alternative-name"
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              data-testid="alternative-save"
              disabled={alternatives.length >= MAX_ALTERNATIVES || !hasPlates(geometry) || !!saved}
              onClick={save}
            >
              {t('alternatives.save')}
            </button>
          </div>
          {saved && <p className="note">{t('alternatives.alreadySaved', { name: saved.label })}</p>}
          {alternatives.length >= MAX_ALTERNATIVES && (
            <p className="note">{t('alternatives.max')}</p>
          )}
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={t('alternatives.tableCaption')}
          >
            <table className="data-table alternatives-table" data-testid="alternatives-table">
              <caption>{t('alternatives.tableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('alternatives.col.name')}</th>
                  <th scope="col">{t('alternatives.col.blocked')}</th>
                  <th scope="col">{t('alternatives.col.admitted')}</th>
                </tr>
              </thead>
              <tbody>
                {none && (
                  <tr data-row="sem">
                    <th scope="row">
                      {t('alternatives.none')}
                      <span className="note block" data-testid="alternative-status-sem">
                        {status('sem')}
                      </span>
                    </th>
                    <td>{pct(none.blockedInHot)}</td>
                    <td>{pct(none.admittedInCold)}</td>
                  </tr>
                )}
                {rows.map((r) => {
                  const ind = indicators.get(r.id);
                  return (
                    <tr key={r.id} data-row={r.id} className={r.id === currentId ? 'current' : ''}>
                      <th scope="row">
                        {r.label}
                        <span className="note block" data-testid={`alternative-status-${r.id}`}>
                          {!hasPlates(r.geometry)
                            ? t('alternatives.invalid')
                            : ind
                              ? status(r.id)
                              : t('alternatives.calculating')}
                        </span>
                        {!sameWindow(r.geometry) && r.geometry.window && (
                          <span className="note block">{t('alternatives.differentWindow')}</span>
                        )}
                        {r.saved && (
                          <span className="row-actions">
                            <button
                              type="button"
                              className="btn small"
                              aria-label={t('alternatives.useLabel', { name: r.label })}
                              data-testid={`alternative-use-${r.id}`}
                              disabled={r.id === currentId}
                              onClick={() => onChange(applyAlternativePatch(r.code))}
                            >
                              {t('alternatives.use')}
                            </button>
                            <button
                              type="button"
                              className="btn small"
                              aria-label={t('alternatives.removeLabel', { name: r.label })}
                              data-testid={`alternative-remove-${r.id}`}
                              onClick={() =>
                                onChange(
                                  alternativesPatch(
                                    alternatives
                                      .filter((a) => a.key !== r.id)
                                      .map((a) => ({ label: a.label, code: a.code })),
                                  ),
                                )
                              }
                            >
                              {t('alternatives.remove')}
                            </button>
                          </span>
                        )}
                      </th>
                      <td>{ind ? pct(ind.blockedInHot) : ''}</td>
                      <td>{ind ? pct(ind.admittedInCold) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note">{t('alternatives.dominanceHelp')}</p>
          {points.length > 0 && <AlternativesPlot points={points} />}
        </>
      )}
    </div>
  );
}
