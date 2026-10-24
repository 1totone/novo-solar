import { useState } from 'react';
import { maskRegions } from '../core/mask/mask';
import { SunChart } from './chart/SunChart';
import { useI18n } from './i18n/useI18n';
import { DrawingLayer, type Drawing } from './mask/DrawingLayer';
import { MaskLayer } from './mask/MaskLayer';
import { SitePanel, type LoadedFile } from './SitePanel';
import { FacadePanel } from './protractor/FacadePanel';
import { ProtectionPanel } from './protractor/ProtectionPanel';
import { ProtractorOverlay } from './protractor/ProtractorOverlay';
import { DataPanel } from './overlay/DataPanel';
import { CellInfo, OverlayLegend } from './overlay/OverlayInfo';
import { OverlayLayer, type CellView } from './overlay/OverlayLayer';
import { DIGITS, useOverlay } from './overlay/useOverlay';
import { protractorFromHash } from './state/protractorHash';
import { hashForSite, siteFromHash } from './state/siteHash';
import { useHashState } from './state/useHashState';
import { windFromHash } from './state/windHash';
import { WindPanel } from './wind/WindPanel';

const OLD_VERSION_URL = 'https://labeee.ufsc.br/downloads/softwares/analysis-sol-ar';
const ROADMAP_URL = 'https://github.com/1totone/novo-solar/blob/main/docs/ROADMAP.md';

export function App() {
  const { t, formatNumber } = useI18n();
  const [hashState, setHashState] = useHashState();
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const aboutOpen = hashState.painel === 'sobre';
  const selected = siteFromHash(hashState);
  const site = selected.site;
  const protractor = protractorFromHash(hashState);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const { orientation, reference, angles, partial, drawn } = protractor;
  const regions = maskRegions(orientation, reference, angles, partial, drawn);
  const hasMask = regions.total.kind !== 'empty' || regions.partial.kind !== 'empty';
  const epw = selected.kind === 'file' ? (loadedFile?.data ?? null) : null;
  const ov = useOverlay(epw, hashState);
  const [hovered, setHovered] = useState<CellView | null>(null);
  const showOverlay = Boolean(ov.cells && ov.stats && ov.limits && ov.quantity);
  const formatValue = (v: number) => formatNumber(v, ov.quantity ? DIGITS[ov.quantity] : 0);
  // Limites e limiar como digitados: sem casas decimais quando inteiros.
  const formatLimit = (v: number) => formatNumber(v, Number.isInteger(v) ? 0 : 1);
  const wind = windFromHash(hashState);
  const sourceUrl = selected.kind === 'test' ? selected.site.sourceUrl : undefined;
  const hasNoData = showOverlay && ov.cells!.some((c) => !ov.stats!.has(`${c.period}-${c.hour}`));

  return (
    <div className="page">
      <header className="header">
        <h1>{t('app.name')}</h1>
        <p className="tagline">{t('app.tagline')}</p>
      </header>

      <main>
        <div className="workspace">
          <div className="steps">
            <SitePanel
              selected={selected}
              loadedFile={selected.kind === 'file' ? loadedFile : null}
              onSelect={(next, file) => {
                setLoadedFile(file);
                setHashState(hashForSite(next));
              }}
            />
            <FacadePanel
              state={protractor}
              rawOrientation={hashState.o ?? ''}
              onChange={setHashState}
            />
            <ProtectionPanel
              state={protractor}
              hash={hashState}
              onChange={setHashState}
              drawing={drawing}
              onDrawingChange={setDrawing}
            />
            <DataPanel
              overlay={ov.overlay}
              hasData={epw !== null}
              sourceUrl={sourceUrl}
              limits={ov.quantityLimits}
              timeZone={site.timeZone}
              onChange={setHashState}
            />
          </div>
          <section
            className={`chart-section${wind.tab === 'chart' ? ' sticky' : ''}`}
            aria-labelledby="chart-heading"
          >
            <h2 id="chart-heading" className="visually-hidden">
              {t('tabs.label')}
            </h2>
            <div className="tabs" role="tablist" aria-label={t('tabs.label')}>
              {(['chart', 'rose'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`tab-${tab}`}
                  aria-selected={wind.tab === tab}
                  aria-controls={`panel-${tab}`}
                  onClick={() => setHashState({ aba: tab === 'rose' ? 'rosa' : '' })}
                >
                  {t(tab === 'chart' ? 'tabs.chart' : 'tabs.rose')}
                </button>
              ))}
            </div>
            {wind.tab === 'rose' ? (
              <div role="tabpanel" id="panel-rose" aria-labelledby="tab-rose">
                <WindPanel epw={epw} wind={wind} sourceUrl={sourceUrl} onChange={setHashState} />
              </div>
            ) : (
              <div role="tabpanel" id="panel-chart" aria-labelledby="tab-chart">
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
                    drawing ? (
                      <DrawingLayer
                        drawing={drawing}
                        onAdd={(v) =>
                          setDrawing({ ...drawing, vertices: [...drawing.vertices, v] })
                        }
                      />
                    ) : undefined
                  }
                />
                {showOverlay && (
                  <>
                    <OverlayLegend
                      limits={
                        ov.overlay.mode === 'frequency'
                          ? ov.limits!.map((v) => v * 100)
                          : ov.limits!
                      }
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
                    className={`legend${showOverlay ? ' hatched' : ''}`}
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
                <p className="note">{t('chart.note')}</p>
              </div>
            )}
          </section>
        </div>

        <section className="status" aria-labelledby="status-title">
          <h2 id="status-title">{t('status.title')}</h2>
          <p>{t('status.body')}</p>
          <ul className="links">
            <li>
              <a href={OLD_VERSION_URL}>{t('status.oldVersionLink')}</a>
            </li>
            <li>
              <a href={ROADMAP_URL}>{t('status.roadmapLink')}</a>
            </li>
            <li>
              <a href="./wireframes/">{t('status.wireframesLink')}</a>
            </li>
          </ul>
        </section>

        <button
          type="button"
          className="about-toggle"
          aria-expanded={aboutOpen}
          aria-controls="about"
          onClick={() => setHashState({ painel: aboutOpen ? '' : 'sobre' })}
        >
          {aboutOpen ? t('about.toggleClose') : t('about.toggleOpen')}
        </button>

        {aboutOpen && (
          <section id="about" className="about" aria-labelledby="about-title">
            <h2 id="about-title">{t('about.title')}</h2>
            <h3>{t('about.originalTitle')}</h3>
            <ul>
              <li>{t('about.originalResearch')}</li>
              <li>{t('about.originalProgramming')}</li>
            </ul>
            <h3>{t('about.newTitle')}</h3>
            <ul>
              <li>{t('about.newAuthor')}</li>
              <li>{t('about.newAi')}</li>
              <li>{t('about.newMaintenance')}</li>
            </ul>
            <p>{t('about.license')}</p>
          </section>
        )}
      </main>

      <footer className="footer">
        {t('footer.build', {
          version: __APP_VERSION__,
          label: __BUILD_LABEL__,
          commit: __BUILD_COMMIT__,
        })}
      </footer>
    </div>
  );
}
