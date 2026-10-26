import { useState, type CSSProperties } from 'react';
import { onRovingKeyDown } from './a11y/roving';
import { OVERLAY_QUANTITIES } from '../core/overlay/overlay';
import { ChartOptionsPanel } from './chart/ChartOptionsPanel';
import { ChartView } from './chart/ChartView';
import { chartFrame } from './chart/projectionContext';
import type { City } from './cities';
import { describeConfig } from './compare/describe';
import { useHistorical } from './data/historical';
import { exampleFromHash, helpSectionFromHash } from './help/content';
import { ExampleCard } from './help/ExampleCard';
import { HelpDialog } from './help/HelpDialog';
import { overlayCsv, windCsv } from './export/dataCsv';
import { downloadBlob, fileSlug, standaloneSvg, svgToPng } from './export/image';
import { OutputsPanel } from './export/OutputsPanel';
import { DEFAULT_PRINT, type PrintOptions } from './export/printOptions';
import { LanguageSelect } from './i18n/LanguageSelect';
import { useI18n } from './i18n/useI18n';
import type { Drawing } from './mask/DrawingLayer';
import { DataPanel } from './overlay/DataPanel';
import { useOverlay } from './overlay/useOverlay';
import { SitePanel, type LoadedFile } from './SitePanel';
import { ProjectSection } from './project/ProjectSection';
import { useProjectActions } from './project/useProjectActions';
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
import { hashForSite, siteFromHash } from './state/siteHash';
import { useHashState } from './state/useHashState';
import { classificationFromHash } from './state/classificationHash';
import { windFromHash } from './state/windHash';
import { chartOptionsFromHash } from './state/chartOptionsHash';
import { useMethodSentence, useWindRose } from './wind/useWindRose';
import { WindPanel } from './wind/WindPanel';

const OLD_VERSION_URL = 'https://labeee.ufsc.br/downloads/softwares/analysis-sol-ar';
const ROADMAP_URL = 'https://github.com/1totone/novo-solar/blob/main/docs/ROADMAP.md';
/** Largura do PNG exportado, em pixels (a altura segue a proporção da carta). */
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
  const { t, formatNumber, formatDate } = useI18n();
  const [hashState, setHashState] = useHashState();
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [print, setPrint] = useState<PrintOptions>(DEFAULT_PRINT);
  // Arquivo carregado da configuração A da comparação (só quando a A usa um arquivo).
  const [compareFile, setCompareFile] = useState<LoadedFile | null>(null);
  const aboutOpen = hashState.painel === 'sobre';
  // Ajuda (F4.8): ajuda=<parte> abre o diálogo; exemplo=<id> mostra o cartão do exemplo resolvido.
  const helpSection = helpSectionFromHash(hashState);
  const example = exampleFromHash(hashState);
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
  // Opções da carta (F4.3) abertas: o link traz uma projeção ou um tipo de linha horária.
  const [chartOptionsOpen, setChartOptionsOpen] = useState(() =>
    Boolean(hashState.proj || hashState.hl),
  );
  const geometryScale = scaleFromHash(hashState.esc);
  const geometryPrint = geometry.window
    ? paperDrawing(geometry.window, geometry.devices, geometryScale)
    : null;
  const wind = windFromHash(hashState);
  // Projeção da carta (F4.3): a moldura dá o tamanho impresso em raios (2,64 nas azimutais).
  const chartOptions = chartOptionsFromHash(hashState);
  const frame = chartFrame(chartOptions.projection);
  const sourceUrl = city?.sourceUrl;
  // A mesma rosa da tela (filtro térmico e correção do F4.4), para o CSV.
  const classification = classificationFromHash(hashState);
  const { rose, thermal: roseThermal } = useWindRose(epw, wind, classification, {
    active: wind.tab === 'rose',
  });
  const roseMethod = useMethodSentence(classification);
  // Comparação: a configuração A fica no link (cmp); os dados dela vêm do próprio link (dados
  // históricos de uma cidade) ou do arquivo carregado guardado na memória (ou no projeto, F4.7).
  const hashA: HashState | null = hashState.cmp ? parseHash(hashState.cmp) : null;
  const selectedA = hashA ? siteFromHash(hashA) : null;
  const historicalA = useHistorical(
    selectedA?.kind === 'city' ? selectedA.site : null,
    selectedA?.kind === 'city' && selectedA.historical,
  );
  const epwA =
    selectedA?.kind === 'file'
      ? (compareFile?.data ?? null)
      : historicalA.status === 'ready'
        ? historicalA.data
        : null;
  const liveFile = selected.kind === 'file' ? loadedFile : null;
  const project = useProjectActions({
    hash: hashState,
    setHash: setHashState,
    placeName: site.name,
    liveFile,
    compareFile: selectedA?.kind === 'file' ? compareFile : null,
    print,
    onOpened: (opened) => {
      setLoadedFile(opened.liveFile);
      setCompareFile(opened.compareFile);
      setPrint(opened.print);
      setDrawing(null);
    },
  });
  const projectFiles = [liveFile, selectedA?.kind === 'file' ? compareFile : null].filter(
    (f, i, all): f is LoadedFile => f !== null && all.indexOf(f) === i,
  );
  const words = {
    orientation: (degrees: string) => t('compare.orientation', { degrees }),
    none: t('compare.none'),
    right: t('sides.rightShort'),
    left: t('sides.leftShort'),
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
          roseThermal
            ? t('csv.thermal', {
                thermal: t(`wind.titleThermal.${roseThermal}`),
                method: roseMethod,
              })
            : t('csv.thermalAll'),
          wind.corrected
            ? t('csv.correction', {
                height: String(wind.height),
                terrain: t(`wind.terrainShort.${wind.terrain}`),
                factor: wind.speedFactor.toFixed(4),
              })
            : t('csv.noCorrection'),
          t('csv.hypotheses'),
          t('csv.separator'),
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
        t('csv.separator'),
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
        wind.tab === 'rose'
          ? undefined
          : {
              width: `${(print.radiusCm * frame.span.x).toFixed(2)}cm`,
              height: `${(print.radiusCm * frame.span.y).toFixed(2)}cm`,
            };
      const text = standaloneSvg(svg, description, size);
      downloadBlob(new Blob([text], { type: 'image/svg+xml' }), `${base}.svg`);
      return null;
    }
    // PNG: 2400 pixels de largura; a carta cilíndrica é mais baixa que larga.
    const pngHeight =
      wind.tab === 'rose' ? PNG_PIXELS : Math.round((PNG_PIXELS * frame.span.y) / frame.span.x);
    const png = await svgToPng(
      standaloneSvg(svg, description, { width: String(PNG_PIXELS), height: String(pngHeight) }),
      PNG_PIXELS,
      pngHeight,
    );
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
      setCompareFile(liveFile);
      setHashState({ cmp: buildHash(current).replace(/^#/, '') });
    } else {
      setCompareFile(null);
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
    (geometryOpen || effectOpen || chartOptionsOpen) && wind.tab === 'chart' && !hashA
      ? 'follow'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  const printStyle = {
    '--print-radius': String(print.radiusCm),
    '--chart-span-x': String(frame.span.x),
    '--chart-span-y': String(frame.span.y),
  } as CSSProperties;
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
        <WindPanel
          epw={epw}
          wind={wind}
          classification={classification}
          sourceUrl={sourceUrl}
          onChange={setHashState}
        />
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
        <p className="note" data-testid="chart-note">
          {[
            t(`chart.noteProjection.${chartOptions.projection}`, {
              orientation: fmt(protractor.orientation),
            }),
            t(chartOptions.projection === 'cylindrical' ? 'chart.noteDatesTop' : 'chart.noteDates'),
            t(`chart.noteHours.${chartOptions.hourLines}`),
          ].join(' ')}
        </p>
      </div>
    );

  return (
    <div className="page">
      <header className="header">
        <div className="header-row">
          <h1>{t('app.name')}</h1>
          <div className="header-tools">
            <button
              type="button"
              className="btn"
              aria-haspopup="dialog"
              data-testid="help-open"
              onClick={() => setHashState({ ajuda: 'guia' })}
            >
              {t('help.open')}
            </button>
            <LanguageSelect />
          </div>
        </div>
        <p className="tagline">{t('app.tagline')}</p>
      </header>

      <main>
        <div className="workspace">
          <div className="steps">
            {example && (
              <ExampleCard
                id={example}
                onClose={() => setHashState({ exemplo: '' })}
                onMore={() => setHashState({ ajuda: 'exemplos' })}
              />
            )}
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
            >
              <ProjectSection
                onSave={project.save}
                onOpen={project.open}
                onCopyLink={project.copyLink}
                fileName={projectFiles.map((f) => f.fileName).join(', ') || null}
                fileSizeMb={
                  projectFiles.length > 0
                    ? projectFiles.reduce((a, f) => a + f.text.length, 0) / 1e6
                    : null
                }
              />
            </OutputsPanel>
            <p className="steps-group">{t('advanced.group')}</p>
            <ChartOptionsPanel
              hash={hashState}
              site={site}
              placeName={site.name}
              onChange={setHashState}
              open={chartOptionsOpen}
              onOpenChange={setChartOptionsOpen}
            />
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
                  date: formatDate(new Date()),
                  scale: t(
                    chartOptions.projection === 'cylindrical'
                      ? 'print.scaleHeight'
                      : 'print.scaleRadius',
                    { radius: fmt(print.radiusCm) },
                  ),
                })}
              </p>
            </div>
            <div
              className="tabs"
              role="tablist"
              aria-label={t('tabs.label')}
              onKeyDown={(e) => onRovingKeyDown(e, 'tab')}
            >
              {(['chart', '3d', 'rose'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`tab-${tab}`}
                  tabIndex={wind.tab === tab ? 0 : -1}
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
                      classification={classificationFromHash(hashA)}
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
            {geometry.window && geometryPrint && print.geometry && (
              <div className="print-geometry" data-testid="print-geometry">
                <p className="print-title">{t('geometry.printTitle', { scale: geometryScale })}</p>
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

      {helpSection && (
        <HelpDialog
          section={helpSection}
          example={example}
          onSection={(s) => setHashState({ ajuda: s })}
          onClose={() => setHashState({ ajuda: '' })}
        />
      )}

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
