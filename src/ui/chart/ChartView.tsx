import { useMemo, useState } from 'react';
import { makeProjection } from '../../core/chart/projection';
import type { EpwData } from '../../core/epw/parseEpw';
import { EMPTY, maskRegions, type Region } from '../../core/mask/mask';
import { cellDifference, DIFFERENCE_BANDS } from '../../core/overlay/difference';
import { cellKey, cellStatistics, type OverlayQuantity } from '../../core/overlay/overlay';
import { buildScene } from '../../core/shading/geometry';
import { pointMask } from '../../core/shading/pointMask';
import { useI18n } from '../i18n/useI18n';
import { DrawingLayer, type Drawing } from '../mask/DrawingLayer';
import { MaskLayer } from '../mask/MaskLayer';
import { CellInfo, OverlayLegend } from '../overlay/OverlayInfo';
import { OverlayLayer, type CellView } from '../overlay/OverlayLayer';
import { CellTable } from '../overlay/CellTable';
import { DIFFERENCE_COLORS } from '../overlay/palettes';
import { fileRadiationLag } from '../overlay/radiationLag';
import { DIGITS, useOverlay } from '../overlay/useOverlay';
import { ProtractorOverlay } from '../protractor/ProtractorOverlay';
import { ShadingLayer } from '../shading/ShadingLayer';
import { PeriodArea, PeriodMarks } from '../sizing/PeriodLayer';
import { useSizing } from '../sizing/sizingClient';
import { sizingInput } from '../sizing/sizingInput';
import { sizingFromHash } from '../state/sizingHash';
import { useShadingChart } from '../shading/useShadingChart';
import { geometryFromHash } from '../state/geometryHash';
import type { HashState } from '../state/hashState';
import { protractorFromHash } from '../state/protractorHash';
import { siteFromHash } from '../state/siteHash';
import { chartOptionsFromHash } from '../state/chartOptionsHash';
import { SunChart } from './SunChart';
import { timeZoneOffset } from '../timeZoneOffset';

const RADIATION: ReadonlySet<OverlayQuantity> = new Set([
  'globalHorizontal',
  'directNormal',
  'diffuseHorizontal',
]);
/** Diferença de tempo da radiação entre A e B a partir da qual a tela avisa (min, como no F4.1). */
const LAG_WARNING_MIN = 15;

/**
 * A carta com todas as camadas (dados, máscara, transferidor, desenho à mão), as legendas e os
 * valores da célula, a partir de um estado do link e do arquivo carregado. Usada na tela, na
 * impressão e na comparação lado a lado.
 */
export function ChartView({
  hash,
  epw,
  drawing,
  onDrawingAdd,
  answer = null,
  difference = null,
}: {
  hash: HashState;
  epw: EpwData | null;
  drawing?: Drawing | null;
  onDrawingAdd?: (vertex: { altitude: number; azimuth: number }) => void;
  /** Máscara calculada de um exercício conferido (F4.5), hachurada sobre o desenho do aluno. */
  answer?: Region | null;
  /** Dados de A na comparação de climas (F4.2): as células mostram B − A (spec 05, seção 5.5). */
  difference?: EpwData | null;
}) {
  const { t, formatNumber } = useI18n();
  const site = siteFromHash(hash).site;
  const protractor = protractorFromHash(hash);
  const { orientation, reference, angles, partial, drawn } = protractor;
  const regions = maskRegions(orientation, reference, angles, partial, drawn);
  // Projeção e linhas horárias (F4.3): a cilíndrica fica centrada na normal da fachada.
  const options = chartOptionsFromHash(hash);
  const projection = useMemo(
    () => makeProjection(options.projection, orientation),
    [options.projection, orientation],
  );
  const hasMask = regions.total.kind !== 'empty' || regions.partial.kind !== 'empty';
  const ov = useOverlay(epw, hash);
  const [hovered, setHovered] = useState<CellView | null>(null);
  // Diferença B − A (F4.2): as médias das células de A na mesma grandeza de B.
  const statsA = useMemo(
    () => (difference && ov.quantity ? cellStatistics(difference, ov.quantity) : null),
    [difference, ov.quantity],
  );
  const diffStats = useMemo(
    () => (statsA && ov.stats ? cellDifference(statsA, ov.stats) : null),
    [statsA, ov.stats],
  );
  const isDifference = diffStats !== null && ov.quantity !== undefined;
  const stats = isDifference ? diffStats : ov.stats;
  const limits = isDifference ? DIFFERENCE_BANDS[ov.quantity!] : ov.limits;
  const colors = isDifference ? DIFFERENCE_COLORS : ov.colors;
  const cellMode = isDifference ? 'difference' : ov.overlay.mode;
  const showOverlay = Boolean(ov.cells && stats && limits && ov.quantity);
  // Resumo da diferença nas células desenhadas e, na radiação, a diferença de tempo entre A e B
  // (spec 05, seção 5.5).
  const differenceSummary = useMemo(() => {
    if (!isDifference || !ov.cells || !diffStats) return null;
    const keys = new Set(ov.cells.map((c) => cellKey(c.period, c.hour)));
    const values = [...keys].flatMap((k) => {
      const s = diffStats.get(k);
      return s ? [s.mean] : [];
    });
    if (values.length === 0) return null;
    return {
      n: values.length,
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [isDifference, ov.cells, diffStats]);
  const lagShift = useMemo(() => {
    if (!isDifference || !epw || !difference || !RADIATION.has(ov.quantity!)) return null;
    const a = fileRadiationLag(difference);
    const b = fileRadiationLag(epw);
    return a === null || b === null ? null : b - a;
  }, [isDifference, epw, difference, ov.quantity]);
  const formatValue = (v: number) => formatNumber(v, ov.quantity ? DIGITS[ov.quantity] : 0);
  const formatSigned = (v: number) => `${v > 0 ? '+' : ''}${formatValue(v)}`;
  // Limites e limiar como digitados: sem casas decimais quando inteiros.
  const formatLimit = (v: number) => formatNumber(v, Number.isInteger(v) ? 0 : 1);
  const hasNoData = showOverlay && ov.cells!.some((c) => !stats!.has(`${c.period}-${c.hour}`));

  // Proteção pelas dimensões (passo 6, F3.2): curvas no worker, máscara de um ponto aqui (é leve).
  const geometry = geometryFromHash(hash);
  const win = geometry.window;
  const hasPlates = win !== null && (geometry.devices.length > 0 || (win.setback ?? 0) > 0);
  const shading = useShadingChart(
    hasPlates && geometry.contours ? { window: win, devices: geometry.devices, orientation } : null,
  );
  const point = hasPlates ? (geometry.point?.value ?? null) : null;
  const pointKey = point ? JSON.stringify([win, geometry.devices, point, orientation]) : null;
  const pointRegion = useMemo(
    () => (point && win ? pointMask(buildScene(win, geometry.devices), point, orientation) : null),
    // A chave representa a janela, as peças, o ponto e a orientação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pointKey],
  );
  // Dimensionamento pelo período (F3.6): a área do período e o sol que determina cada ângulo.
  const sizing = sizingFromHash(hash);
  const sized = useSizing(
    hash.dvc !== '0' ? sizingInput(site, orientation, geometry, sizing) : null,
  ).result;
  const shown = shading.chart ?? shading.stale;
  const hasContours = Boolean(shown && shown.contours.length > 0);
  const hasFull = Boolean(shown && shown.fullShade.length > 0);
  const hasPoint = pointRegion !== null && pointRegion.kind !== 'empty';

  return (
    <div className="chart-view">
      <SunChart
        site={site}
        projection={projection}
        hourLines={options.hourLines}
        title={t('chart.title', {
          place: site.name,
          latitude: formatNumber(site.latitude, 2),
          longitude: formatNumber(site.longitude, 2),
          // Hífen no fuso negativo, como antes (o título vai no SVG exportado).
          timeZone: timeZoneOffset(site.timeZone, formatNumber, '-'),
        })}
        underlay={
          showOverlay ? (
            <OverlayLayer
              cells={ov.cells!}
              stats={stats!}
              limits={limits!}
              colors={colors}
              mode={isDifference ? 'mean' : ov.overlay.mode}
              onHover={setHovered}
            />
          ) : undefined
        }
        overlay={
          <>
            <MaskLayer regions={regions} hatched={showOverlay} />
            {answer && (
              <MaskLayer regions={{ total: answer, partial: EMPTY, partialSet: EMPTY }} answer />
            )}
            {(shown || hasPoint) && (
              <ShadingLayer
                chart={shown}
                stale={shading.pending}
                point={hasPoint ? pointRegion : null}
                hatched={showOverlay}
              />
            )}
            {sized && sized.sunny > 0 && <PeriodArea outline={sized.outline} />}
            {protractor.show && (
              <ProtractorOverlay
                orientation={orientation}
                reference={reference}
                angles={angles}
                partial={partial}
                sideLabels={{ right: 'd', left: 'e' }}
              />
            )}
          </>
        }
        top={
          <>
            {sized && sized.sunny > 0 && (
              <PeriodMarks angles={sized.angles} showAlphaMax={sizing.gap > 0} />
            )}
            {drawing && onDrawingAdd && <DrawingLayer drawing={drawing} onAdd={onDrawingAdd} />}
          </>
        }
      />
      {showOverlay && (
        <>
          <OverlayLegend
            limits={cellMode === 'frequency' ? limits!.map((v) => v * 100) : limits!}
            colors={colors}
            unit={cellMode === 'frequency' ? '%' : ov.unit}
            title={
              cellMode === 'difference'
                ? t('difference.legend', { quantity: t(`data.short.${ov.overlay.key!}`) })
                : cellMode === 'frequency'
                  ? t('legend.frequencyTitle', {
                      threshold: formatLimit(ov.overlay.threshold),
                      unit: ov.unit,
                    })
                  : t(`data.short.${ov.overlay.key!}`)
            }
            hasNoData={hasNoData}
            format={formatLimit}
          />
          {differenceSummary && (
            <p className="note" data-testid="difference-summary">
              {t('difference.summary', {
                n: formatNumber(differenceSummary.n),
                mean: formatSigned(differenceSummary.mean),
                min: formatSigned(differenceSummary.min),
                max: formatSigned(differenceSummary.max),
                unit: ov.unit,
              })}
              {lagShift !== null &&
                ` ${
                  Math.abs(lagShift) < LAG_WARNING_MIN
                    ? t('difference.lagSame')
                    : t(lagShift > 0 ? 'difference.lagLate' : 'difference.lagEarly', {
                        minutes: formatNumber(Math.round(Math.abs(lagShift))),
                      })
                }`}
            </p>
          )}
          <CellInfo
            view={hovered}
            unit={ov.unit}
            mode={cellMode}
            threshold={ov.overlay.threshold}
            format={formatValue}
          />
        </>
      )}
      {options.hourLines === 'both' && (
        <p
          className="legend hour-lines-legend"
          role="group"
          aria-label={t('chartOptions.hourLinesLegend')}
          data-testid="hour-lines-legend"
        >
          <span className="legend-item">
            <span className="swatch solar-hour-line" aria-hidden="true" />
            {t('chartOptions.legendSolar')}
          </span>
          <span className="legend-item">
            <span className="swatch legal-hour-line" aria-hidden="true" />
            {t('chartOptions.legendLegal')}
          </span>
        </p>
      )}
      {(hasMask || answer) && (
        <p
          className={`legend mask-legend${showOverlay ? ' hatched' : ''}`}
          role="group"
          aria-label={t('mask.legend')}
        >
          {regions.total.kind !== 'empty' && (
            <span className="legend-item">
              <span className="swatch total" aria-hidden="true" />
              {t('mask.total')}
            </span>
          )}
          {regions.partial.kind !== 'empty' && (
            <span className="legend-item">
              <span className="swatch partial" aria-hidden="true" />
              {t('mask.partial')}
            </span>
          )}
          {answer && (
            <span className="legend-item">
              <span className="swatch answer" aria-hidden="true" />
              {t('mask.answer')}
            </span>
          )}
        </p>
      )}
      {(hasContours || hasPoint) && (
        <p
          className={`legend shading-legend${showOverlay ? ' hatched' : ''}`}
          role="group"
          aria-label={t('shading.legend')}
          data-testid="shading-legend"
        >
          {hasContours && (
            <span className="legend-item">
              <span className="swatch contour-line" aria-hidden="true" />
              {t('shading.legendContours')}
            </span>
          )}
          {hasFull && (
            <span className="legend-item">
              <span className="swatch full-shade" aria-hidden="true" />
              {t('shading.legendFull')}
            </span>
          )}
          {hasPoint && point && (
            <span className="legend-item">
              <span className="swatch point-mask" aria-hidden="true" />
              {t('shading.legendPoint', {
                x: formatNumber(point.x, 2),
                z: formatNumber(point.z, 2),
              })}
            </span>
          )}
        </p>
      )}
      {sized && sized.sunny > 0 && (
        <p
          className="legend period-legend"
          role="group"
          aria-label={t('sizing.heading')}
          data-testid="period-legend"
        >
          <span className="legend-item">
            <span className="swatch period-area" aria-hidden="true" />
            {t('sizing.legend')}
          </span>
          <span className="legend-item">
            <span className="swatch period-mark" aria-hidden="true" />
            {t('sizing.legendPoints')}
          </span>
        </p>
      )}
      {shading.pending && (
        <p className="shading-pending" role="status" data-testid="shading-pending">
          {t('shading.pending')}
        </p>
      )}
      {shading.failed && (
        <p className="error" role="alert" data-testid="shading-failed">
          {t('shading.failed')}
        </p>
      )}
      {ov.pending && ov.quantity && (
        <p className="overlay-pending" role="status" data-testid="overlay-pending">
          {t('chart.overlayPending')}
        </p>
      )}
      {showOverlay && (
        <CellTable
          cells={ov.cells!}
          stats={stats!}
          mode={cellMode}
          unit={ov.unit}
          format={formatValue}
        />
      )}
    </div>
  );
}
