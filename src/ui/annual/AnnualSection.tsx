import { useCallback, useMemo, useRef, useState } from 'react';
import type { Site } from '../../core/chart/sunChart';
import { monthHourMap } from '../../core/shading/hourly';
import { downloadBlob, fileSlug, standaloneSvg } from '../export/image';
import { useI18n } from '../i18n/useI18n';
import type { GeometryState } from '../state/geometryHash';
import { timeZoneOffset } from '../timeZoneOffset';
import { useAnnualShading } from './annualClient';
import { hourlyCsv, MAP_COLORS, mapCsv } from './mapData';
import { MonthHourMapView } from './MonthHourMapView';

/** Largura do mapa exportado em SVG, em px. */
const EXPORT_WIDTH = 720;

/**
 * Passo 6, "Sombra ao longo do ano" (F3.3): mapa mês × hora do percentual da janela à sombra com
 * sol na janela, legenda, tabela e exportações. O ano é calculado no worker só com o passo aberto.
 */
export function AnnualSection({
  site,
  geometry,
  orientation,
  active,
}: {
  site: Site & { name: string };
  geometry: GeometryState;
  orientation: number;
  /** Passo 6 aberto: só então o ano é calculado. */
  active: boolean;
}) {
  const { t, formatNumber } = useI18n();
  const win = geometry.window;
  const hasPlates = win !== null && (geometry.devices.length > 0 || (win.setback ?? 0) > 0);
  const { latitude, longitude, elevation, timeZone } = site;
  const annual = useAnnualShading(
    active && hasPlates && win
      ? {
          site: { latitude, longitude, elevation, timeZone },
          window: win,
          devices: geometry.devices,
          orientation,
        }
      : null,
  );
  const hourly = annual.result ?? annual.stale;
  const map = useMemo(() => (hourly ? monthHourMap(hourly) : null), [hourly]);
  // Exportações só do mapa da geometria atual (não do anterior, mostrado esmaecido).
  const fresh = annual.result !== null && map !== null;
  const [boxPx, setBoxPx] = useState(300);
  const boxRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    setBoxPx(el.clientWidth || 300);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setBoxPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const exportRef = useRef<SVGSVGElement>(null);
  if (!win) return null;

  const tz = timeZoneOffset(timeZone, formatNumber);
  const fmt = (v: number) => formatNumber(v, 2);
  const pieces =
    geometry.devices.length > 0
      ? t('geometry.piecesCount', { count: geometry.devices.length })
      : t('geometry.noPieces');
  const title = t('annual.mapTitle', {
    place: site.name,
    orientation: formatNumber(orientation, Number.isInteger(orientation) ? 0 : 1),
    pieces,
  });
  const months = t('chart.monthsShort').split(',');
  const header = (what: string) => [
    t('csv.title', { what }),
    t('csv.site', {
      place: site.name,
      latitude: String(latitude),
      longitude: String(longitude),
      timeZone: `${timeZone < 0 ? '-' : '+'}${Math.abs(timeZone)}`,
    }),
    t('annual.csvGeometry', {
      orientation: String(orientation),
      width: fmt(win.width),
      height: fmt(win.height),
      setback: fmt(win.setback ?? 0),
      pieces,
    }),
    t('annual.csvLink', { url: globalThis.location?.href ?? '' }),
    t('annual.csvHypotheses'),
    t('csv.separator'),
  ];
  const base = `solar-${fileSlug(site.name)}`;
  const download = (text: string, name: string, type: string) =>
    downloadBlob(new Blob([text], { type }), name);
  const legend = [
    '0%',
    t('annual.range', { from: 0, to: 25 }),
    t('annual.range', { from: 25, to: 50 }),
    t('annual.range', { from: 50, to: 75 }),
    t('annual.range', { from: 75, to: 100 }),
    '100%',
  ];

  return (
    <div className="annual" data-testid="annual-section">
      <h3 className="sub-heading">{t('annual.heading')}</h3>
      {!hasPlates ? (
        <p className="note">{t('annual.needsPieces')}</p>
      ) : (
        <>
          <p className="note">{t('annual.intro')}</p>
          <div className="annual-map" ref={boxRef}>
            {annual.pending && (
              <p className="shading-pending" role="status" data-testid="annual-pending">
                {t('annual.pending')}
              </p>
            )}
            {map && (
              <MonthHourMapView
                map={map}
                width={boxPx}
                title={title}
                hourAxis={t('annual.hourAxis', { timeZone: tz })}
                stale={annual.result === null}
              />
            )}
          </div>
          {annual.failed && (
            <p className="error" role="alert">
              {t('annual.failed')}
            </p>
          )}
          {map && (
            <>
              <p
                className="legend annual-legend"
                role="group"
                aria-label={t('annual.legend')}
                data-testid="annual-legend"
              >
                {legend.map((label, k) => (
                  <span className="legend-item" key={label}>
                    <span
                      className="swatch"
                      style={{ background: MAP_COLORS[k] }}
                      aria-hidden="true"
                    />
                    {label}
                  </span>
                ))}
                <span className="legend-item">
                  <span className="swatch no-sun" aria-hidden="true" />
                  {t('annual.noSun')}
                </span>
              </p>
              <p className="note">{t('annual.hypotheses', { timeZone: tz })}</p>
              <details className="more annual-table">
                <summary>{t('annual.table')}</summary>
                {/* Área rolável: focável para rolar pelo teclado. */}
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label={t('annual.table')}
                >
                  <table className="data-table" data-testid="annual-table">
                    <caption>{t('annual.tableCaption')}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('annual.month')}</th>
                        {Array.from({ length: 24 }, (_, h) => (
                          <th key={h} scope="col">
                            {h + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {map.shadedWhenExposed.map((row, m) => (
                        <tr key={m}>
                          <th scope="row">{months[m]}</th>
                          {row.map((s, h) => (
                            <td key={h} className={s === null ? 'no-sun' : undefined}>
                              {s === null ? '' : formatNumber(Math.round(s * 100))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <div className="export-only" aria-hidden="true">
                <MonthHourMapView
                  ref={exportRef}
                  map={map}
                  width={EXPORT_WIDTH}
                  title={title}
                  hourAxis={t('annual.hourAxis', { timeZone: tz })}
                  testId="annual-export-map"
                />
              </div>
              <div className="export-buttons">
                <button
                  type="button"
                  className="btn"
                  data-testid="annual-export-svg"
                  disabled={!fresh}
                  onClick={() => {
                    if (!exportRef.current) return;
                    download(
                      standaloneSvg(exportRef.current, title),
                      `${base}-mapa-sombra.svg`,
                      'image/svg+xml',
                    );
                  }}
                >
                  {t('annual.exportSvg')}
                </button>
                <button
                  type="button"
                  className="btn"
                  data-testid="annual-export-csv"
                  disabled={!fresh}
                  onClick={() =>
                    download(
                      mapCsv(map, header(t('annual.csvMap')), months),
                      `${base}-mapa-sombra.csv`,
                      'text/csv;charset=utf-8',
                    )
                  }
                >
                  {t('annual.exportCsv')}
                </button>
                <button
                  type="button"
                  className="btn"
                  data-testid="annual-export-hourly"
                  disabled={!fresh}
                  onClick={() =>
                    annual.result &&
                    download(
                      hourlyCsv(annual.result, header(t('annual.csvHourly'))),
                      `${base}-fracao-ensolarada.csv`,
                      'text/csv;charset=utf-8',
                    )
                  }
                >
                  {t('annual.exportHourly')}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
