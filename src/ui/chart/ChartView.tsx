import { useState } from 'react';
import type { EpwData } from '../../core/epw/parseEpw';
import { maskRegions } from '../../core/mask/mask';
import { useI18n } from '../i18n/useI18n';
import { DrawingLayer, type Drawing } from '../mask/DrawingLayer';
import { MaskLayer } from '../mask/MaskLayer';
import { CellInfo, OverlayLegend } from '../overlay/OverlayInfo';
import { OverlayLayer, type CellView } from '../overlay/OverlayLayer';
import { CellTable } from '../overlay/CellTable';
import { DIGITS, useOverlay } from '../overlay/useOverlay';
import { ProtractorOverlay } from '../protractor/ProtractorOverlay';
import type { HashState } from '../state/hashState';
import { protractorFromHash } from '../state/protractorHash';
import { siteFromHash } from '../state/siteHash';
import { SunChart } from './SunChart';

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
}: {
  hash: HashState;
  epw: EpwData | null;
  drawing?: Drawing | null;
  onDrawingAdd?: (vertex: { altitude: number; azimuth: number }) => void;
}) {
  const { t, formatNumber } = useI18n();
  const site = siteFromHash(hash).site;
  const protractor = protractorFromHash(hash);
  const { orientation, reference, angles, partial, drawn } = protractor;
  const regions = maskRegions(orientation, reference, angles, partial, drawn);
  const hasMask = regions.total.kind !== 'empty' || regions.partial.kind !== 'empty';
  const ov = useOverlay(epw, hash);
  const [hovered, setHovered] = useState<CellView | null>(null);
  const showOverlay = Boolean(ov.cells && ov.stats && ov.limits && ov.quantity);
  const formatValue = (v: number) => formatNumber(v, ov.quantity ? DIGITS[ov.quantity] : 0);
  // Limites e limiar como digitados: sem casas decimais quando inteiros.
  const formatLimit = (v: number) => formatNumber(v, Number.isInteger(v) ? 0 : 1);
  const hasNoData = showOverlay && ov.cells!.some((c) => !ov.stats!.has(`${c.period}-${c.hour}`));

  return (
    <div className="chart-view">
      <SunChart
        site={site}
        title={t('chart.title', {
          place: site.name,
          latitude: formatNumber(site.latitude, 2),
          longitude: formatNumber(site.longitude, 2),
          timeZone: formatNumber(site.timeZone),
        })}
        underlay={
          showOverlay ? (
            <OverlayLayer
              cells={ov.cells!}
              stats={ov.stats!}
              limits={ov.limits!}
              colors={ov.colors}
              mode={ov.overlay.mode}
              onHover={setHovered}
            />
          ) : undefined
        }
        overlay={
          <>
            <MaskLayer regions={regions} hatched={showOverlay} />
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
          drawing && onDrawingAdd ? (
            <DrawingLayer drawing={drawing} onAdd={onDrawingAdd} />
          ) : undefined
        }
      />
      {showOverlay && (
        <>
          <OverlayLegend
            limits={ov.overlay.mode === 'frequency' ? ov.limits!.map((v) => v * 100) : ov.limits!}
            colors={ov.colors}
            unit={ov.overlay.mode === 'frequency' ? '%' : ov.unit}
            title={
              ov.overlay.mode === 'frequency'
                ? t('legend.frequencyTitle', {
                    threshold: formatLimit(ov.overlay.threshold),
                    unit: ov.unit,
                  })
                : t(`data.short.${ov.overlay.key!}`)
            }
            hasNoData={hasNoData}
            format={formatLimit}
          />
          <CellInfo
            view={hovered}
            unit={ov.unit}
            mode={ov.overlay.mode}
            threshold={ov.overlay.threshold}
            format={formatValue}
          />
        </>
      )}
      {hasMask && (
        <p
          className={`legend mask-legend${showOverlay ? ' hatched' : ''}`}
          aria-label={t('mask.legend')}
        >
          <span className="legend-item">
            <span className="swatch total" aria-hidden="true" />
            {t('mask.total')}
          </span>
          <span className="legend-item">
            <span className="swatch partial" aria-hidden="true" />
            {t('mask.partial')}
          </span>
        </p>
      )}
      {showOverlay && (
        <CellTable
          cells={ov.cells!}
          stats={ov.stats!}
          mode={ov.overlay.mode}
          unit={ov.unit}
          format={formatValue}
        />
      )}
    </div>
  );
}
