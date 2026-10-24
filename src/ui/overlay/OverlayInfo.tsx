import { useI18n } from '../i18n/useI18n';
import type { CellView } from './OverlayLayer';
import { periodLabel } from './periodLabel';

/** Hora legal decimal como "13 h" ou "13h30". */
function clock(h: number): string {
  const hh = Math.floor(h) % 24;
  return Number.isInteger(h) ? `${hh} h` : `${hh}h30`;
}

/** Legenda das faixas: cores e intervalos, com a unidade. */
export function OverlayLegend({
  limits,
  colors,
  unit,
  title,
  hasNoData,
  format,
}: {
  limits: readonly number[];
  colors: readonly string[];
  unit: string;
  title: string;
  hasNoData: boolean;
  format: (v: number) => string;
}) {
  const { t } = useI18n();
  const labels = colors.map((_, i) => {
    if (i === 0) return t('legend.upTo', { v: format(limits[0]!) });
    if (i === colors.length - 1) return t('legend.above', { v: format(limits[i - 1]!) });
    return t('legend.between', { a: format(limits[i - 1]!), b: format(limits[i]!) });
  });
  return (
    <div className="legend overlay-legend" data-testid="overlay-legend">
      <span className="legend-title">
        {title} ({unit})
      </span>
      {labels.map((label, i) => (
        <span key={i} className="legend-item">
          <span className="swatch" style={{ background: colors[i] }} aria-hidden="true" />
          {label}
        </span>
      ))}
      {hasNoData && (
        <span className="legend-item">
          <span className="swatch no-data" aria-hidden="true" />
          {t('legend.noData')}
        </span>
      )}
    </div>
  );
}

/** Valores da célula sob o cursor (ou tocada). */
export function CellInfo({
  view,
  unit,
  mode,
  threshold,
  format,
}: {
  view: CellView | null;
  unit: string;
  mode: 'mean' | 'frequency';
  threshold: number;
  format: (v: number) => string;
}) {
  const { t, formatNumber } = useI18n();
  if (!view) {
    return (
      <p className="note cell-info" data-testid="cell-info">
        <span className="hint-hover">{t('cell.hint')}</span>
        <span className="hint-touch">{t('cell.hintTouch')}</span>
      </p>
    );
  }
  const { cell, stats } = view;
  return (
    <p className="note cell-info" data-testid="cell-info" aria-live="polite">
      <strong>
        {t('cell.where', {
          period: periodLabel(cell.period),
          hour: String(cell.hour),
          start: clock(cell.start),
          end: clock(cell.end),
        })}
      </strong>{' '}
      {!stats
        ? t('cell.noData')
        : mode === 'frequency'
          ? t('cell.above', {
              count: formatNumber(Math.round((stats.above ?? 0) * stats.n)),
              n: formatNumber(stats.n),
              threshold: formatNumber(threshold, Number.isInteger(threshold) ? 0 : 1),
              unit,
              percent: formatNumber(Math.round((stats.above ?? 0) * 100)),
            })
          : t('cell.mean', {
              mean: format(stats.mean),
              min: format(stats.min),
              max: format(stats.max),
              unit,
              n: formatNumber(stats.n),
            })}
    </p>
  );
}
