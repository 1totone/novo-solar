import { useId, useMemo, useState } from 'react';
import type { EpwData } from '../../core/epw/parseEpw';
import type { TerrainKey } from '../../core/wind/windProfile';
import {
  SPEED_CLASSES,
  speedResolution,
  type DayPeriodKey,
  type SeasonKey,
} from '../../core/wind/windRose';
import { useI18n } from '../i18n/useI18n';
import type { MessageKey } from '../i18n/i18n';
import type { ClassificationState } from '../state/classificationHash';
import {
  DAY_PERIOD_KEYS,
  SEASON_KEYS,
  TERRAIN_KEYS,
  THERMAL_KEYS,
  terrainPatch,
  thermalPatch,
  type ThermalKey,
  type WindState,
} from '../state/windHash';
import { SPEED_COLORS } from './colors';
import { useMethodSentence, useWindRose } from './useWindRose';
import { WindRoseChart } from './WindRoseChart';

const SEASON_NAMES_SOUTH: Record<SeasonKey, MessageKey> = {
  'dez-fev': 'wind.summer',
  'mar-mai': 'wind.autumn',
  'jun-ago': 'wind.winter',
  'set-nov': 'wind.spring',
};
const SEASON_NAMES_NORTH: Record<SeasonKey, MessageKey> = {
  'dez-fev': 'wind.winter',
  'mar-mai': 'wind.spring',
  'jun-ago': 'wind.summer',
  'set-nov': 'wind.autumn',
};
const SEASON_MONTHS_LABEL: Record<SeasonKey, MessageKey> = {
  'dez-fev': 'wind.months.dezfev',
  'mar-mai': 'wind.months.marmai',
  'jun-ago': 'wind.months.junago',
  'set-nov': 'wind.months.setnov',
};
const PERIOD_NAMES: Record<DayPeriodKey, MessageKey> = {
  madrugada: 'wind.dawn',
  manha: 'wind.morning',
  tarde: 'wind.afternoon',
  noite: 'wind.night',
};
const THERMAL_NAMES: Record<ThermalKey, MessageKey> = {
  hot: 'wind.thermal.hot',
  cold: 'wind.thermal.cold',
  neutral: 'wind.thermal.neutral',
};
const THERMAL_TITLE: Record<ThermalKey, MessageKey> = {
  hot: 'wind.titleThermal.hot',
  cold: 'wind.titleThermal.cold',
  neutral: 'wind.titleThermal.neutral',
};
const TERRAIN_NAMES: Record<TerrainKey, MessageKey> = {
  country: 'wind.terrain.country',
  suburbs: 'wind.terrain.suburbs',
  city: 'wind.terrain.city',
  ocean: 'wind.terrain.ocean',
};
const TERRAIN_SHORT: Record<TerrainKey, MessageKey> = {
  country: 'wind.terrainShort.country',
  suburbs: 'wind.terrainShort.suburbs',
  city: 'wind.terrainShort.city',
  ocean: 'wind.terrainShort.ocean',
};
const TERRAIN_HELP: Record<TerrainKey, MessageKey> = {
  country: 'wind.terrainHelp.country',
  suburbs: 'wind.terrainHelp.suburbs',
  city: 'wind.terrainHelp.city',
  ocean: 'wind.terrainHelp.ocean',
};

function Segmented<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented wrap" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={o.disabled}
            onClick={() => onSelect(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WindPanel({
  epw,
  wind,
  classification,
  sourceUrl,
  onChange,
  readOnly = false,
}: {
  epw: EpwData | null;
  wind: WindState;
  /** Classificação das horas do passo 7, para o filtro pela condição térmica (F4.4). */
  classification: ClassificationState;
  sourceUrl?: string;
  onChange: (patch: Record<string, string>) => void;
  /** Sem os controles (configuração A da comparação). */
  readOnly?: boolean;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const [moreOpen, setMoreOpen] = useState(wind.advanced);
  const methodSentence = useMethodSentence(classification);
  const { rose, classes, thermal } = useWindRose(epw, wind, classification, {
    withClasses: moreOpen && !readOnly,
  });
  const resolution = useMemo(() => (epw ? speedResolution(epw) : null), [epw]);
  if (!epw || !rose || resolution === null) {
    return (
      <p className="note" data-testid="wind-need-file">
        {t('wind.needFile')} {sourceUrl && <a href={sourceUrl}>{t('data.sourceLink')}</a>}
      </p>
    );
  }
  const names = epw.location.latitude < 0 ? SEASON_NAMES_SOUTH : SEASON_NAMES_NORTH;
  const compass = t('compass.points').split(',');
  const sectorName = (k: number) => compass[(k * 16) / rose.sectors]!;
  const pct = (v: number) => formatNumber(v, 1);
  const classLabels = SPEED_CLASSES.map((a, i) =>
    i + 1 < SPEED_CLASSES.length
      ? t('wind.classRange', {
          a: formatNumber(a, a % 1 ? 1 : 0),
          b: formatNumber(SPEED_CLASSES[i + 1]!),
        })
      : t('wind.classAbove', { a: formatNumber(a) }),
  );
  const seasonLabel = wind.season
    ? `${t(names[wind.season])} (${t(SEASON_MONTHS_LABEL[wind.season])})`
    : t('wind.year');
  const periodLabel = wind.period ? t(PERIOD_NAMES[wind.period]) : t('wind.allDay');
  const height = formatNumber(wind.height, wind.height % 1 ? 1 : 0);
  const terrainShort = t(TERRAIN_SHORT[wind.terrain]);
  const factor = formatNumber(wind.speedFactor, 2);
  const title = [
    t('wind.title', {
      place: [epw.location.city, epw.location.state].filter(Boolean).join(', '),
      season: seasonLabel,
      period: periodLabel,
    }),
    thermal && t(THERMAL_TITLE[thermal]),
    wind.corrected && t('wind.titleCorrection', { height, terrain: terrainShort }),
  ]
    .filter(Boolean)
    .join('; ');

  return (
    <div className="wind-panel" data-testid="wind-panel">
      {!readOnly && (
        <div className="wind-controls">
          <Segmented
            label={t('wind.show')}
            value={wind.show}
            options={[
              { value: 'frequency', label: t('wind.frequency') },
              { value: 'speed', label: t('wind.speed') },
            ]}
            onSelect={(v) => onChange({ rosa: v === 'speed' ? 'vel' : '' })}
          />
          <Segmented
            label={t('wind.sectors')}
            value={String(wind.sectors) as '8' | '16'}
            options={[
              { value: '8', label: '8' },
              { value: '16', label: '16' },
            ]}
            onSelect={(v) => onChange({ setores: v === '16' ? '16' : '' })}
          />
          <Segmented
            label={t('wind.season')}
            value={wind.season ?? 'ano'}
            options={[
              { value: 'ano', label: t('wind.year') },
              ...SEASON_KEYS.map((s) => ({ value: s, label: t(names[s]) })),
            ]}
            onSelect={(v) => onChange({ estacao: v === 'ano' ? '' : v })}
          />
          <Segmented
            label={t('wind.period')}
            value={wind.period ?? 'todos'}
            options={[
              { value: 'todos', label: t('wind.allDay') },
              ...DAY_PERIOD_KEYS.map((p) => ({ value: p, label: t(PERIOD_NAMES[p]) })),
            ]}
            onSelect={(v) => onChange({ periodo: v === 'todos' ? '' : v })}
          />
        </div>
      )}
      {!readOnly && (
        <details
          className="more wind-more"
          open={moreOpen}
          onToggle={(e) => setMoreOpen(e.currentTarget.open)}
          data-testid="wind-more"
        >
          <summary>{t('wind.more')}</summary>
          <Segmented
            label={t('wind.thermal')}
            value={wind.thermal ?? 'all'}
            options={[
              { value: 'all', label: t('wind.thermal.all') },
              ...THERMAL_KEYS.map((k) => ({
                value: k,
                label: t(THERMAL_NAMES[k]),
                disabled: !classification.method,
              })),
            ]}
            onSelect={(v) => onChange(thermalPatch(v === 'all' ? undefined : v))}
          />
          {classification.method ? (
            <p className="note" data-testid="wind-thermal-method">
              {methodSentence}{' '}
              {classes &&
                t('wind.thermalCounts', {
                  hot: formatNumber(classes.counts.hot),
                  cold: formatNumber(classes.counts.cold),
                  neutral: formatNumber(classes.counts.neutral),
                  none:
                    classes.counts.none > 0
                      ? t('wind.thermalNone', { count: formatNumber(classes.counts.none) })
                      : '',
                })}{' '}
              {t('wind.thermalWhere')}
            </p>
          ) : (
            !wind.thermal && (
              <p className="note" data-testid="wind-thermal-unavailable">
                {t('wind.thermalUnavailable')}
              </p>
            )
          )}
          <div className="field">
            <label htmlFor={`${id}-height`}>{t('wind.height')}</label>
            <input
              id={`${id}-height`}
              className="wind-height"
              type="text"
              inputMode="decimal"
              placeholder="10"
              value={wind.heightText}
              aria-invalid={wind.heightInvalid || undefined}
              aria-describedby={`${id}-height-help`}
              onChange={(e) => onChange({ va: e.target.value })}
              data-testid="wind-height"
            />
            <span id={`${id}-height-help`} className="muted">
              {t('wind.heightHelp')}
            </span>
          </div>
          {wind.heightInvalid && (
            <p className="error" role="status" data-testid="wind-height-invalid">
              {t('wind.heightInvalid')}
            </p>
          )}
          <Segmented
            label={t('wind.terrain')}
            value={wind.terrain}
            options={TERRAIN_KEYS.map((k) => ({ value: k, label: t(TERRAIN_NAMES[k]) }))}
            onSelect={(v) => onChange(terrainPatch(v))}
          />
          <p className="note" data-testid="wind-factor">
            {t(TERRAIN_HELP[wind.terrain])}{' '}
            {t('wind.factor', { height, terrain: terrainShort, factor })}
          </p>
        </details>
      )}
      {wind.thermal && !thermal && (
        <p className="error" role="status" data-testid="wind-thermal-not-applied">
          {t('wind.thermalNotApplied')}
        </p>
      )}
      <WindRoseChart rose={rose} show={wind.show} labels={compass} title={title} />
      {rose.valid === 0 && (
        <p className="error" role="status" data-testid="wind-empty">
          {t('wind.emptyFilter')}
        </p>
      )}
      {wind.show === 'frequency' ? (
        <div className="legend" data-testid="wind-legend">
          <span className="legend-title">{t('wind.legendTitle')}</span>
          {classLabels.map((l, i) => (
            <span key={i} className="legend-item">
              <span className="swatch" style={{ background: SPEED_COLORS[i] }} aria-hidden="true" />
              {l}
            </span>
          ))}
        </div>
      ) : (
        <p className="note">{t('wind.speedNote')}</p>
      )}
      <p className="note" data-testid="wind-info">
        {t('wind.info', {
          valid: formatNumber(rose.valid),
          hours: formatNumber(rose.hours),
          missing: formatNumber(rose.hours - rose.valid),
          calm: pct(rose.calm),
          resolution: formatNumber(resolution, resolution < 1 ? (resolution < 0.1 ? 2 : 1) : 0),
        })}
      </p>
      {resolution >= 0.5 && wind.speedFactor === 1 && (
        <p className="error" role="status" data-testid="wind-bias">
          {t('wind.resolutionWarning', {
            resolution: formatNumber(resolution, resolution < 1 ? 1 : 0),
          })}
        </p>
      )}
      <p className="note" data-testid="wind-station-warning">
        {t('wind.stationWarning')}
        {wind.corrected &&
          ` ${t('wind.correctionWarning', { height, terrain: terrainShort, factor })}`}
      </p>
      <details className="more">
        <summary>{t('wind.table')}</summary>
        <div className="table-scroll">
          <table className="data-table wind-table" data-testid="wind-table">
            <caption>{title}</caption>
            <thead>
              <tr>
                <th scope="col">{t('wind.sector')}</th>
                {classLabels.map((l, i) => (
                  <th key={i} scope="col">
                    {l}
                  </th>
                ))}
                <th scope="col">{t('wind.total')}</th>
                <th scope="col">{t('wind.meanSpeed')}</th>
              </tr>
            </thead>
            <tbody>
              {rose.frequency.map((row, k) => (
                <tr key={k}>
                  <th scope="row">{sectorName(k)}</th>
                  {row.map((v, i) => (
                    <td key={i}>{pct(v)}</td>
                  ))}
                  <td>{pct(row.reduce((a, b) => a + b, 0))}</td>
                  <td>
                    {rose.meanSpeed[k] === null
                      ? t('wind.noHours')
                      : formatNumber(rose.meanSpeed[k]!, 1)}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row">{t('wind.calm')}</th>
                <td colSpan={4} />
                <td>{pct(rose.calm)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
