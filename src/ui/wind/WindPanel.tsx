import { useMemo } from 'react';
import type { EpwData } from '../../core/epw/parseEpw';
import {
  SPEED_CLASSES,
  speedResolution,
  windRose,
  type DayPeriodKey,
  type SeasonKey,
} from '../../core/wind/windRose';
import { useI18n } from '../i18n/useI18n';
import type { MessageKey } from '../i18n/i18n';
import { DAY_PERIOD_KEYS, SEASON_KEYS, type WindState } from '../state/windHash';
import { SPEED_COLORS } from './colors';
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

function Segmented<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
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
  sourceUrl,
  onChange,
  readOnly = false,
}: {
  epw: EpwData | null;
  wind: WindState;
  sourceUrl?: string;
  onChange: (patch: Record<string, string>) => void;
  /** Sem os controles (configuração A da comparação). */
  readOnly?: boolean;
}) {
  const { t, formatNumber } = useI18n();
  const rose = useMemo(
    () =>
      epw
        ? windRose(epw, { sectors: wind.sectors, season: wind.season, period: wind.period })
        : null,
    [epw, wind.sectors, wind.season, wind.period],
  );
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
  const title = t('wind.title', {
    place: [epw.location.city, epw.location.state].filter(Boolean).join(', '),
    season: seasonLabel,
    period: periodLabel,
  });

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
      <WindRoseChart rose={rose} show={wind.show} labels={compass} title={title} />
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
      {resolution >= 0.5 && (
        <p className="error" role="status" data-testid="wind-bias">
          {t('wind.resolutionWarning', {
            resolution: formatNumber(resolution, resolution < 1 ? 1 : 0),
          })}
        </p>
      )}
      <p className="note">{t('wind.stationWarning')}</p>
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
