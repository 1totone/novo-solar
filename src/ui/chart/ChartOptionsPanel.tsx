import { useId, useMemo } from 'react';
import type { ProjectionKind } from '../../core/chart/projection';
import { legalNoonSolarOffsets, type Site } from '../../core/chart/sunChart';
import { useI18n } from '../i18n/useI18n';
import {
  chartOptionsFromHash,
  hourLinesPatch,
  projectionPatch,
  type HourLinesMode,
} from '../state/chartOptionsHash';
import type { HashState } from '../state/hashState';

const PROJECTIONS: ProjectionKind[] = ['stereographic', 'equidistant', 'cylindrical'];
const HOUR_LINES: HourLinesMode[] = ['solar', 'legal', 'both'];

/** Hora e minuto de um deslocamento em minutos a partir das 12h00 (ex.: −28,4 → 11 h 32 min). */
function clockParts(minutes: number): [number, number] {
  const total = Math.round(12 * 60 + minutes);
  const h = Math.floor(total / 60);
  return [h, total - 60 * h];
}

/** Dia e mês do dia do ano de referência (0 = 1º de janeiro). */
function dayParts(day: number): [number, number] {
  const d = new Date(Date.UTC(2026, 0, 1 + day));
  return [d.getUTCDate(), d.getUTCMonth() + 1];
}

/**
 * Projeção da carta e linhas horárias (F4.3, decisão 0025): painel recolhido no grupo "Avançado",
 * antes do passo 6. Não muda nada para quem não o abre.
 */
export function ChartOptionsPanel({
  hash,
  site,
  placeName,
  onChange,
  open,
  onOpenChange,
}: {
  hash: HashState;
  site: Site;
  placeName: string;
  onChange: (patch: HashState) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, formatNumber, formatClock, formatDayMonth } = useI18n();
  const clock = (minutes: number) => formatClock(...clockParts(minutes));
  const dayLabel = (day: number) => formatDayMonth(...dayParts(day));
  const id = useId();
  const options = chartOptionsFromHash(hash);
  const changed = Boolean(hash.proj || hash.hl);
  const offsets = useMemo(
    () => (options.hourLines === 'solar' ? null : legalNoonSolarOffsets(site)),
    [site, options.hourLines],
  );
  const radio = (
    name: string,
    value: string,
    checked: boolean,
    label: string,
    onSelect: () => void,
    testId: string,
  ) => (
    <label className="check" key={value}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        data-testid={testId}
        onChange={onSelect}
      />
      {label}
    </label>
  );
  return (
    <section
      className="step-panel advanced-step"
      aria-labelledby={`${id}-h`}
      data-testid="chart-options-panel"
    >
      <details open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)}>
        <summary>
          <h2 id={`${id}-h`}>
            {t('chartOptions.heading')}
            <span className="step-badge">{t('advanced.badge')}</span>
          </h2>
          <span className="step-summary">
            {changed
              ? t('chartOptions.summaryDefined', {
                  projection: t(`chartOptions.projectionShort.${options.projection}`),
                  hours: t(`chartOptions.hoursShort.${options.hourLines}`),
                })
              : t('chartOptions.summary')}
          </span>
        </summary>
        <fieldset className="field plain">
          <legend className="field-label">{t('chartOptions.projection')}</legend>
          {PROJECTIONS.map((k) =>
            radio(
              `${id}-proj`,
              k,
              options.projection === k,
              t(`chartOptions.projection.${k}`),
              () => onChange(projectionPatch(k)),
              `projection-${k}`,
            ),
          )}
        </fieldset>
        <p className="note" data-testid="projection-help">
          {t(`chartOptions.projectionHelp.${options.projection}`)}
        </p>
        <fieldset className="field plain">
          <legend className="field-label">{t('chartOptions.hourLines')}</legend>
          {HOUR_LINES.map((m) =>
            radio(
              `${id}-hl`,
              m,
              options.hourLines === m,
              t(`chartOptions.hourLines.${m}`),
              () => onChange(hourLinesPatch(m)),
              `hour-lines-${m}`,
            ),
          )}
        </fieldset>
        {offsets && (
          <p className="note" data-testid="legal-help">
            {t('chartOptions.legalHelp', {
              place: placeName,
              longitude: formatNumber(Math.abs(offsets.longitudeMinutes), 1),
              direction: t(
                offsets.longitudeMinutes < 0 ? 'chartOptions.behind' : 'chartOptions.ahead',
              ),
              min: clock(offsets.min.minutes),
              minDate: dayLabel(offsets.min.day),
              max: clock(offsets.max.minutes),
              maxDate: dayLabel(offsets.max.day),
            })}
          </p>
        )}
        <p className="note">{t('chartOptions.printScale')}</p>
      </details>
    </section>
  );
}
