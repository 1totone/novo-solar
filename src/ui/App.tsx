import { useMemo, useState, type CSSProperties } from 'react';
import type { EpwData } from '../core/epw/parseEpw';
import { OVERLAY_QUANTITIES } from '../core/overlay/overlay';
import { windRose } from '../core/wind/windRose';
import { ChartView } from './chart/ChartView';
import type { City } from './cities';
import { describeConfig } from './compare/describe';
import { useHistorical } from './data/historical';
import { overlayCsv, windCsv } from './export/dataCsv';
import { downloadBlob, fileSlug, standaloneSvg, svgToPng } from './export/image';
import { OutputsPanel } from './export/OutputsPanel';
import { DEFAULT_PRINT, type PrintOptions } from './export/printOptions';
import { useI18n } from './i18n/useI18n';
import type { Drawing } from './mask/DrawingLayer';
import { SideResultsProvider, useWideLayout } from './layout/sideResultsContext';
import { DataPanel } from './overlay/DataPanel';
import { useOverlay } from './overlay/useOverlay';
import { SitePanel, type LoadedFile } from './SitePanel';
import { timeZoneOffset } from './timeZoneOffset';
import { GeometryDrawing } from './geometry/GeometryDrawing';
import { EffectPanel } from './effect/EffectPanel';
import { View3DPanel } from './view3d/View3DPanel';
import { GeometryPanel } from './geometry/GeometryPanel';
import { paperDrawing, scaleFromHash } from './geometry/layout';
import { FacadePanel } from './protractor/FacadePanel';
import { ProtectionPanel } from './protractor/ProtectionPanel';
import { geometryFromHash } from './state/geometryHash';
import { buildHash, parseHash, type HashState } from './state/hashState';
import { protractorFromHash } from './state/protractorHash';
import { hasHourlyData, hashForSite, siteFromHash } from './state/siteHash';
import { useHashState } from './state/useHashState';
import { windFromHash } from './state/windHash';
import { WindPanel } from './wind/WindPanel';

const OLD_VERSION_URL = 'https://labeee.ufsc.br/downloads/softwares/analysis-sol-ar';
const ROADMAP_URL = 'https://github.com/1totone/novo-solar/blob/main/docs/ROADMAP.md';
/** Largura do viewBox da carta em raios: a carta impressa tem 2,64 vezes o raio pedido. */
const CHART_SPAN = 2.64;
/** Lado do PNG exportado, em pixels. */
const PNG_PIXELS = 2400;

/** Régua de 5 cm impressa ao lado da carta, para conferir a escala. */
function PrintRuler({ label }: { label: string }) {
  return (
    <div className="print-ruler" aria-hidden="true">
      <svg viewBox="0 0 50 6" className="ruler">
        <line x1={0} y1={5.5} x2={50} y2={5.5} />
        {Array.from({ length: 51 }, (_, mm) => (
          <line
            key={mm}
            x1={mm}
            y1={5.5}
            x2={mm}
            y2={mm % 10 === 0 ? 0.5 : mm % 5 === 0 ? 2.5 : 4}
          />
        ))}
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function App() {
  const { t, formatNumber } = useI18n();
  const [hashState, setHashState] = useHashState();
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [print, setPrint] = useState<PrintOptions>(DEFAULT_PRINT);
  const [compareEpw, setCompareEpw] = useState<EpwData | null>(null);
  const aboutOpen = hashState.painel === 'sobre';
  const selected = siteFromHash(hashState);
  const site = selected.site;
  const city: City | null = selected.kind === 'city' ? selected.site : null;
  const historical = useHistorical(city, selected.kind === 'city' && selected.historical);
  const protractor = protractorFromHash(hashState);
  const epw =
    selected.kind === 'file'
      ? (loadedFile?.data ?? null)
      : historical.status === 'ready'
        ? historical.data
        : null;
  const ov = useOverlay(epw, hashState);
  const geometry = geometryFromHash(hashState);
  // Passo 6 aberto: no computador, a carta acompanha a rolagem (as curvas da Fase 3 ficam à vista).
  const [geometryOpen, setGeometryOpen] = useState(() => geometry.defined);
  // Passo 7 aberto: o link traz uma escolha da classificação das horas.
  const [effectOpen, setEffectOpen] = useState(() =>
    ['cm', 'ca', 'cr', 'cal', 'cn', 'cg', 'tf', 'tq', 'te', 'ct', 'alter1'].some(
      (k) => hashState[k],
    ),
  );
  const geometryScale = scaleFromHash(hashState.esc);
  const geometryPrint = geometry.window
    ? paperDrawing(geometry.window, geometry.devices, geometryScale)
    : null;
  const wind = windFromHash(hashState);
  // Resultados ao lado (decisão 0038): no computador, com a aba da carta, os resultados pesados
  // dos passos 6 e 7 vão para o painel da direita, abaixo da carta.
  const wide = useWideLayout();
  const sideOn = wide && wind.tab === 'chart';
  const [annualSlot, setAnnualSlot] = useState<HTMLElement | null>(null);
  const [effectSlot, setEffectSlot] = useState<HTMLElement | null>(null);
  const sideSlots = useMemo(
    () => (sideOn ? { annual: annualSlot, effect: effectSlot } : {}),
    [sideOn, annualSlot, effectSlot],
  );
  const sourceUrl = city?.sourceUrl;
  const rose = useMemo(
    () =>
      epw && wind.tab === 'rose'
        ? windRose(epw, { sectors: wind.sectors, season: wind.season, period: wind.period })
        : null,
    [epw, wind.tab, wind.sectors, wind.season, wind.period],
  );
  // Comparação: a configuração A fica no link (cmp) e o arquivo dela, na memória.
  const hashA: HashState | null = hashState.cmp ? parseHash(hashState.cmp) : null;
  const epwA = hashA && hasHourlyData(siteFromHash(hashA)) ? compareEpw : null;
  const words = {
    orientation: (degrees: string) => t('compare.orientation', { degrees }),
    none: t('compare.none'),
  };
  const fmt = (v: number) => formatNumber(v, Number.isInteger(v) ? 0 : 1);
  // Origem dos dados históricos em poucas palavras (impressão e CSV).
  const historicalWhat = (c: City) =>
    c.historical?.period
      ? `TRY, ${t('site.periodTry', { start: c.historical.period[0], end: c.historical.period[1] })}`
      : 'IWEC';

  const csvAvailable =
    wind.tab === 'rose' ? rose !== null : Boolean(ov.cells && ov.stats && ov.quantity);

  const header = (what: string): string[] => {
    const lines = [
      t('csv.title', { what }),
      t('csv.site', {
        place: site.name,
        latitude: String(site.latitude),
        longitude: String(site.longitude),
        timeZone: `${site.timeZone < 0 ? '-' : '+'}${Math.abs(site.timeZone)}`,
      }),
    ];
    if (epw && selected.kind === 'file' && loadedFile) {
      lines.push(t('csv.file', { file: loadedFile.fileName, hours: String(loadedFile.hours) }));
    } else if (epw && city?.historical) {
      lines.push(
        t('csv.historical', {
          file: city.historical.file,
          hours: String(epw.hours),
          what: historicalWhat(city),
        }),
      );
    }
    return lines;
  };

  const visibleSvg = (): SVGSVGElement | null =>
    document.querySelector<SVGSVGElement>(
      wind.tab === 'rose' ? '#panel-rose .wind-rose' : '#panel-chart .sun-chart',
    );

  const exportCsv = (): string | null => {
    if (wind.tab === 'rose') {
      if (!rose) return null;
      return windCsv({
        header: [
          ...header(t('csv.rose')),
          t('csv.filters', {
            season: wind.season ?? t('wind.year'),
            period: wind.period ?? t('wind.allDay'),
            sectors: String(wind.sectors),
          }),
          t('csv.hypotheses'),
        ],
        rose,
        sectorNames: t('compass.points')
          .split(',')
          .filter((_, k) => k % (16 / wind.sectors) === 0),
      });
    }
    if (!ov.cells || !ov.stats || !ov.quantity || !ov.limits || !ov.overlay.key) return null;
    const info = OVERLAY_QUANTITIES[ov.quantity];
    return overlayCsv({
      header: [
        ...header(t('csv.cells')),
        t('csv.quantity', {
          quantity: t(`data.short.${ov.overlay.key}`),
          unit: info.unit,
          what: t(ov.overlay.mode === 'frequency' ? 'data.colorFrequency' : 'data.colorMean'),
        }),
        t('csv.semester', {
          semester: t(ov.overlay.semester === 1 ? 'data.semester1' : 'data.semester2'),
          interval: t(
            info.timing === 'integrated' ? 'data.intervalIntegrated' : 'data.intervalInstant',
          ),
        }),
        t('csv.bands', { limits: ov.limits.join('; ') }),
      ],
      cells: ov.cells,
      stats: ov.stats,
      mode: ov.overlay.mode,
      limits: ov.limits,
    });
  };

  const onExport = async (kind: 'svg' | 'png' | 'csv' | 'copy'): Promise<string | null> => {
    const base = `solar-${fileSlug(site.name)}-${wind.tab === 'rose' ? 'rosa' : 'carta'}`;
    if (kind === 'csv') {
      const text = exportCsv();
      if (!text) return t('outputs.csvNone');
      downloadBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
      return null;
    }
    const svg = visibleSvg();
    if (!svg) return null;
    const description = svg.querySelector('title')?.textContent ?? site.name;
    if (kind === 'svg') {
      // A carta sai com o tamanho da impressão (raio pedido); a rosa, sem escala.
      const size =
        wind.tab === 'rose' ? undefined : `${(print.radiusCm * CHART_SPAN).toFixed(2)}cm`;
      const text = standaloneSvg(svg, description, size);
      downloadBlob(new Blob([text], { type: 'image/svg+xml' }), `${base}.svg`);
      return null;
    }
    const png = await svgToPng(standaloneSvg(svg, description, String(PNG_PIXELS)), PNG_PIXELS);
    if (kind === 'png') {
      downloadBlob(png, `${base}.png`);
      return null;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      return t('outputs.copied');
    } catch {
      return t('outputs.copyFailed');
    }
  };

  const onCompare = (start: boolean) => {
    if (start) {
      const current = { ...hashState };
      delete current.cmp;
      setCompareEpw(epw);
      setHashState({ cmp: buildHash(current).replace(/^#/, '') });
    } else {
      setCompareEpw(null);
      setHashState({ cmp: '' });
    }
  };

  const sectionClass = [
    'chart-section',
    wind.tab === 'chart' && !hashA ? 'sticky' : '',
    hashA ? 'comparing' : '',
    print.protractor ? '' : 'print-no-protractor',
    print.mask ? '' : 'print-no-mask',
    print.data ? '' : 'print-no-data',
    print.legend ? '' : 'print-no-legend',
    print.protractorOnly ? 'print-protractor-only' : '',
    (geometryOpen || effectOpen) && wind.tab === 'chart' && !hashA ? 'follow' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const printStyle = { '--print-radius': String(print.radiusCm) } as CSSProperties;
  let source: string;
  if (epw && selected.kind === 'file' && loadedFile) {
    source = t('print.sourceFile', { file: loadedFile.fileName });
  } else if (epw && city?.historical) {
    source = t('print.sourceHistorical', { what: historicalWhat(city) });
  } else if (city) {
    source = t('print.sourceCity', { station: city.station });
  } else source = '';

  const live =
    wind.tab === 'rose' ? (
      <div role="tabpanel" id="panel-rose" aria-labelledby="tab-rose">
        <WindPanel epw={epw} wind={wind} sourceUrl={sourceUrl} onChange={setHashState} />
      </div>
    ) : wind.tab === '3d' ? (
      <div role="tabpanel" id="panel-3d" aria-labelledby="tab-3d">
        <View3DPanel hash={hashState} onChange={setHashState} />
      </div>
    ) : (
      <div role="tabpanel" id="panel-chart" aria-labelledby="tab-chart">
        <ChartView
          hash={hashState}
          epw={epw}
          drawing={drawing}
          onDrawingAdd={(v) =>
            drawing && setDrawing({ ...drawing, vertices: [...drawing.vertices, v] })
          }
        />
        <PrintRuler label={t('print.ruler')} />
        <p className="note">{t('chart.note')}</p>
      </div>
    );

  return (
    <div className="page">
      <header className="header">
        <h1>{t('app.name')}</h1>
        <p className="tagline">{t('app.tagline')}</p>
      </header>

      <main>
        <SideResultsProvider value={sideSlots}>
          <div className="workspace">
            <div className="steps">
              <SitePanel
                selected={selected}
                loadedFile={selected.kind === 'file' ? loadedFile : null}
                historical={historical}
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
              <OutputsPanel
                print={print}
                onPrintChange={setPrint}
                onPrint={() => window.print()}
                onExport={onExport}
                csvAvailable={csvAvailable}
                comparing={hashA !== null}
                onCompare={onCompare}
                geometryAvailable={geometry.window !== null}
              />
              <p className="steps-group">{t('advanced.group')}</p>
              <GeometryPanel
                geometry={geometry}
                hash={hashState}
                scale={geometryScale}
                site={site}
                orientation={protractor.orientation}
                onChange={setHashState}
                open={geometryOpen}
                onOpenChange={setGeometryOpen}
              />
              <EffectPanel
                epw={epw}
                hash={hashState}
                geometry={geometry}
                orientation={protractor.orientation}
                onChange={setHashState}
                open={effectOpen}
                onOpenChange={setEffectOpen}
              />
            </div>
            <section className={sectionClass} style={printStyle} aria-labelledby="chart-heading">
              <h2 id="chart-heading" className="visually-hidden">
                {t('tabs.label')}
              </h2>
              <div className="print-header">
                <p className="print-title">{t('print.title', { place: site.name })}</p>
                <p className="print-details">
                  {t('print.details', {
                    latitude: formatNumber(site.latitude, 3),
                    longitude: formatNumber(site.longitude, 3),
                    timeZone: timeZoneOffset(site.timeZone, formatNumber),
                    source,
                    date: new Date().toLocaleDateString('pt-BR'),
                    radius: fmt(print.radiusCm),
                  })}
                </p>
              </div>
              <div className="tabs" role="tablist" aria-label={t('tabs.label')}>
                {(['chart', '3d', 'rose'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    id={`tab-${tab}`}
                    aria-selected={wind.tab === tab}
                    aria-controls={`panel-${tab}`}
                    onClick={() =>
                      setHashState({ aba: tab === 'rose' ? 'rosa' : tab === '3d' ? '3d' : '' })
                    }
                  >
                    {t(tab === 'chart' ? 'tabs.chart' : tab === '3d' ? 'tabs.view3d' : 'tabs.rose')}
                  </button>
                ))}
              </div>
              {hashA ? (
                <div className="compare" data-testid="compare-view">
                  <div className="compare-col" data-testid="compare-a">
                    <h3 className="compare-label">
                      {t('compare.a')}: {describeConfig(hashA, fmt, words)}
                    </h3>
                    {wind.tab === 'rose' ? (
                      <WindPanel
                        epw={epwA}
                        wind={windFromHash(hashA)}
                        onChange={() => {}}
                        readOnly
                      />
                    ) : (
                      <ChartView hash={hashA} epw={epwA} />
                    )}
                  </div>
                  <div className="compare-col" data-testid="compare-b">
                    <h3 className="compare-label">
                      {t('compare.b')}: {describeConfig(hashState, fmt, words)}
                    </h3>
                    {live}
                  </div>
                </div>
              ) : (
                live
              )}
              {sideOn && (
                <div className="side-results" data-testid="side-results">
                  <div ref={setAnnualSlot} />
                  <div ref={setEffectSlot} />
                </div>
              )}
              {geometry.window && geometryPrint && print.geometry && (
                <div className="print-geometry" data-testid="print-geometry">
                  <p className="print-title">
                    {t('geometry.printTitle', { scale: geometryScale })}
                  </p>
                  <GeometryDrawing
                    window={geometry.window}
                    devices={geometry.devices}
                    title={t('geometry.printTitle', { scale: geometryScale })}
                    font={geometryPrint.font}
                    size={{
                      width: `${geometryPrint.width.toFixed(2)}cm`,
                      height: `${geometryPrint.height.toFixed(2)}cm`,
                    }}
                    testId="print-geometry-drawing"
                    point={geometry.point?.value ?? null}
                  />
                </div>
              )}
            </section>
          </div>
        </SideResultsProvider>

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
            <li>
              <a href="./wireframes/fase-3.html">{t('status.wireframes3Link')}</a>
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
