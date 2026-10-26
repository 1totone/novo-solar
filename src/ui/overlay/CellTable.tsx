import { cellKey, type CellStats, type OverlayCell } from '../../core/overlay/overlay';
import { useI18n } from '../i18n/useI18n';
import { periodLabel } from './periodLabel';

/**
 * Tabela com os valores das células desenhadas (quinzenas × horas do arquivo), para ler sem o
 * mouse e sem depender das cores (decisão 0015).
 */
export function CellTable({
  cells,
  stats,
  mode,
  unit,
  format,
}: {
  cells: OverlayCell[];
  stats: Map<string, CellStats>;
  mode: 'mean' | 'frequency' | 'difference';
  unit: string;
  format: (v: number) => string;
}) {
  const { t, formatNumber } = useI18n();
  const periods = [...new Set(cells.map((c) => c.period))].sort((a, b) => a - b);
  const hours = [...new Set(cells.map((c) => c.hour))].sort((a, b) => a - b);
  const drawn = new Set(cells.map((c) => cellKey(c.period, c.hour)));
  const value = (period: number, hour: number) => {
    const k = cellKey(period, hour);
    if (!drawn.has(k)) return '';
    const s = stats.get(k);
    if (!s) return t('legend.noData');
    if (mode === 'frequency') return formatNumber(Math.round((s.above ?? 0) * 100));
    return mode === 'difference' && s.mean > 0 ? `+${format(s.mean)}` : format(s.mean);
  };
  return (
    <details className="more cell-table">
      <summary>{t('cells.table')}</summary>
      <div className="table-scroll">
        <table className="data-table" data-testid="cell-table">
          <caption>
            {mode === 'frequency'
              ? t('cells.captionFrequency')
              : mode === 'difference'
                ? t('cells.captionDifference', { unit })
                : t('cells.captionMean', { unit })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('cells.period')}</th>
              {hours.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <th scope="row">{periodLabel(p, t)}</th>
                {hours.map((h) => (
                  <td key={h}>{value(p, h)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
