import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { onRovingKeyDown } from './a11y/roving';
import type { EpwData } from '../core/epw/hourly';
import { cellDifference, DIFFERENCE_BANDS, sameLocation } from '../core/overlay/difference';
import { cellStatistics, OVERLAY_QUANTITIES } from '../core/overlay/overlay';
import { ChartOptionsPanel } from './chart/ChartOptionsPanel';
import { ChartView } from './chart/ChartView';
import { chartFrame } from './chart/projectionContext';
import type { City } from './cities';
import { projectPointFromHash } from './catalog/catalog';
import { describeConfig } from './compare/describe';
import { useHistorical } from './data/historical';
import { exampleFromHash, helpSectionFromHash } from './help/content';
import { answerRegion, exerciseFromHash, EXERCISES } from './didactic/exercises';
import { TUTORIAL_STEPS, tutorialStepFromHash } from './didactic/tutorial';
import { overlayCsv, windCsv } from './export/dataCsv';
import { downloadBlob, fileSlug, standaloneSvg, svgToPng } from './export/image';
import { DEFAULT_PRINT, type PrintOptions } from './export/printOptions';
import { LanguageSelect } from './i18n/LanguageSelect';
import { useI18n } from './i18n/useI18n';
import type { Drawing } from './mask/DrawingLayer';
import { useOverlay } from './overlay/useOverlay';
import { SitePanel, type LoadedFile } from './SitePanel';
import { useProjectActions } from './project/useProjectActions';
import { timeZoneOffset } from './timeZoneOffset';
import { AdvancedStepStub, RestoreStepFocus } from './layout/AdvancedStepStub';
import { SideResultsProvider, useWideLayout } from './layout/sideResultsContext';
import { StepNav } from './layout/StepNav';
import { initialStep, revealStep, type StepId } from './layout/steps';
import { paperDrawing, scaleFromHash } from './geometry/layout';
import { protectionSummary } from './protractor/summary';
import { dataSummary, facadeSummary, outputsSummary } from './layout/stepSummaries';
import { NextStep, Step } from './layout/Step';
import { geometryFromHash } from './state/geometryHash';
import { buildHash, parseHash, type HashState } from './state/hashState';
import { protractorFromHash } from './state/protractorHash';
import { hashForSite, siteFromHash, type SelectedSite } from './state/siteHash';
import { useHashState } from './state/useHashState';
import { classificationFromHash } from './state/classificationHash';
import { windFromHash } from './state/windHash';
import { chartOptionsFromHash } from './state/chartOptionsHash';
import { useMethodSentence, useWindRose } from './wind/useWindRose';

// Fora do caminho básico, carregados sob demanda (decisão 0039): os passos 6 e 7, só quando
// abertos, e a aba da vista 3D, só quando escolhida.
const GeometryPanel = lazy(() =>
  import('./geometry/GeometryPanel').then((m) => ({ default: m.GeometryPanel })),
);
const EffectPanel = lazy(() =>
  import('./effect/EffectPanel').then((m) => ({ default: m.EffectPanel })),
);
// A aba da rosa dos ventos, só quando escolhida (decisão 0044: espaço no orçamento para o
// redesenho depois do piloto do F2.9).
// Conteúdo dos passos 2 a 5, fora do bloco inicial (decisões 0039 e 0044): o cabeçalho e o resumo
// de cada passo ficam nele; o conteúdo chega no tempo ocioso depois da carta, para quem abre o passo
// não esperar.
const loadFacade = () => import('./protractor/FacadePanel');
const loadProtection = () => import('./protractor/ProtectionPanel');
const loadData = () => import('./overlay/DataPanel');
const loadOutputs = () => import('./export/OutputsPanel');
const loadProject = () => import('./project/ProjectSection');
const FacadePanel = lazy(() => loadFacade().then((m) => ({ default: m.FacadePanel })));
const ProtectionPanel = lazy(() => loadProtection().then((m) => ({ default: m.ProtectionPanel })));
const DataPanel = lazy(() => loadData().then((m) => ({ default: m.DataPanel })));
const OutputsPanel = lazy(() => loadOutputs().then((m) => ({ default: m.OutputsPanel })));
const ProjectSection = lazy(() => loadProject().then((m) => ({ default: m.ProjectSection })));
function preloadBasicSteps() {
  for (const load of [loadFacade, loadProtection, loadData, loadOutputs, loadProject]) {
    load().catch(() => {});
  }
}
const WindPanel = lazy(() => import('./wind/WindPanel').then((m) => ({ default: m.WindPanel })));
const View3DPanel = lazy(() =>
  import('./view3d/View3DPanel').then((m) => ({ default: m.View3DPanel })),
);
// Corte e vista da impressão (F3.1): só com uma janela no link.
const GeometryDrawing = lazy(() =>
  import('./geometry/GeometryDrawing').then((m) => ({ default: m.GeometryDrawing })),
);
// Ajuda e modo didático (F4.8, F4.5): só quando abertos pelo botão ou pelo link.
const HelpDialog = lazy(() => import('./help/HelpDialog').then((m) => ({ default: m.HelpDialog })));
const ExampleCard = lazy(() =>
  import('./help/ExampleCard').then((m) => ({ default: m.ExampleCard })),
);
const TutorialCard = lazy(() =>
  import('./didactic/TutorialCard').then((m) => ({ default: m.TutorialCard })),
);
const ExerciseCard = lazy(() =>
  import('./didactic/ExerciseCard').then((m) => ({ default: m.ExerciseCard })),
);

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
  const { t, locale, formatNumber, formatDate } = useI18n();
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
  // Modo didático (F4.5): tutorial=<etapa> e exercicio=<id> (com conferir=1 depois de conferir).
  const tutorialStep = tutorialStepFromHash(hashState);
  const tutorialTarget = tutorialStep ? TUTORIAL_STEPS[tutorialStep - 1]!.target : null;
  const exercise = exerciseFromHash(hashState);
  const exerciseChecked = exercise !== null && hashState.conferir === '1';
  const geometry = geometryFromHash(hashState);
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
  // Passos como acordeão (decisão 0044): um aberto por vez; fechados, cada um mostra o resumo.
  const [openStep, setOpenStep] = useState<StepId | null>(() =>
    initialStep(hashState, geometry.defined, tutorialTarget),
  );
  // Passo aberto pelo usuário: depois de desenhar, o cabeçalho dele vai para a vista (e, com
  // `focus`, recebe o foco: botões "Próximo" e atalho entre passos).
  const pendingReveal = useRef<{ id: StepId; focus: boolean } | null>(null);
  useEffect(() => {
    const r = pendingReveal.current;
    if (!r) return;
    pendingReveal.current = null;
    revealStep(r.id, r.focus);
  });
  const stepProps = (id: StepId) => ({
    open: openStep === id,
    // Os passos avançados avisam também o "toggle" do details já aberto ao montar: só uma mudança
    // de verdade abre o passo e o traz para a vista.
    onOpenChange: (open: boolean) => {
      if (open === (openStep === id)) return;
      setOpenStep((current) => (open ? id : current === id ? null : current));
      if (open) pendingReveal.current = { id, focus: false };
    },
  });
  const goToStep = (id: StepId) => {
    if (openStep === id) {
      revealStep(id, true);
      return;
    }
    pendingReveal.current = { id, focus: true };
    setOpenStep(id);
  };
  const stepLoading = <p className="note">{t('advanced.loading')}</p>;
  useEffect(() => {
    // Navegador sem requestIdleCallback (o Safari, até a versão 18): um pouco depois da carta.
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(preloadBasicSteps, { timeout: 3000 });
    } else setTimeout(preloadBasicSteps, 1500);
  }, []);
  const geometryOpen = openStep === '6';
  const effectOpen = openStep === '7';
  // O tutorial (F4.5) abre o passo que ele realça; um desenho começado (exercício) abre o passo 3.
  const [seenTutorial, setSeenTutorial] = useState(tutorialStep);
  if (seenTutorial !== tutorialStep) {
    setSeenTutorial(tutorialStep);
    if (tutorialTarget && tutorialTarget !== 'carta') setOpenStep(tutorialTarget);
  }
  const drawingActive = drawing !== null;
  const [seenDrawing, setSeenDrawing] = useState(drawingActive);
  if (seenDrawing !== drawingActive) {
    setSeenDrawing(drawingActive);
    if (drawingActive) setOpenStep('3');
  }
  useEffect(() => {
    const root = document.documentElement;
    if (!tutorialTarget) {
      delete root.dataset.tutorial;
      return;
    }
    root.dataset.tutorial = tutorialTarget;
    document
      .querySelector(`[data-step="${tutorialTarget}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => {
      delete root.dataset.tutorial;
    };
  }, [tutorialStep, tutorialTarget]);
  const geometryScale = scaleFromHash(hashState.esc);
  const geometryPrint = geometry.window
    ? paperDrawing(geometry.window, geometry.devices, geometryScale)
    : null;
  const wind = windFromHash(hashState);
  // Resultados ao lado (decisão 0038): no computador, com a aba da carta, os resultados pesados
  // dos passos 6 e 7 vão para o painel da direita, abaixo da carta.
  const wide = useWideLayout();
  const sideOn = wide && wind.tab === 'chart';
  const [catalogSlot, setCatalogSlot] = useState<HTMLElement | null>(null);
  const [annualSlot, setAnnualSlot] = useState<HTMLElement | null>(null);
  const [effectSlot, setEffectSlot] = useState<HTMLElement | null>(null);
  const sideSlots = useMemo(
    () => (sideOn ? { catalog: catalogSlot, annual: annualSlot, effect: effectSlot } : {}),
    [sideOn, catalogSlot, annualSlot, effectSlot],
  );
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

  // Origem dos dados de cada lado da comparação: a mesma frase da impressão.
  const sourceOf = (sel: SelectedSite | null, file: LoadedFile | null, data: EpwData | null) => {
    if (!sel || !data) return '';
    if (sel.kind === 'file' && file) return t('print.sourceFile', { file: file.fileName });
    if (sel.kind === 'city' && sel.site.historical) {
      return t('print.sourceHistorical', { what: historicalWhat(sel.site) });
    }
    return '';
  };
  const sourceA = sourceOf(selectedA, compareFile, epwA);
  const sourceB = sourceOf(selected, loadedFile, epw);
  // Diferença B − A na mesma carta (F4.2, `dif=1`, spec 05, seção 5.5): só na carta, com dados
  // nos dois lados, uma variável no passo 4 e o mesmo local.
  const differenceAsked = hashA !== null && hashState.dif === '1' && wind.tab === 'chart';
  let differenceBlocked: 'needData' | 'otherPlace' | null = null;
  if (differenceAsked) {
    if (!epw || !epwA || !ov.quantity) differenceBlocked = 'needData';
    else if (!sameLocation(epw.location, epwA.location)) differenceBlocked = 'otherPlace';
  }
  const differenceOn = differenceAsked && differenceBlocked === null;

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
    if (differenceOn && epwA) {
      const limits = DIFFERENCE_BANDS[ov.quantity];
      return overlayCsv({
        header: [
          ...header(t('csv.cells')),
          t('difference.print', { a: sourceA, b: sourceB }),
          t('csv.quantity', {
            quantity: t(`data.short.${ov.overlay.key}`),
            unit: info.unit,
            what: t('difference.csvWhat'),
          }),
          t('csv.semester', {
            semester: t(ov.overlay.semester === 1 ? 'data.semester1' : 'data.semester2'),
            interval: t(
              info.timing === 'integrated' ? 'data.intervalIntegrated' : 'data.intervalInstant',
            ),
          }),
          t('csv.bands', { limits: limits.join('; ') }),
          t('csv.separator'),
        ],
        cells: ov.cells,
        stats: cellDifference(cellStatistics(epwA, ov.quantity), ov.stats),
        mode: 'difference',
        limits,
      });
    }
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
      setHashState({ cmp: '', dif: '' });
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
    // No computador, a carta fica sempre à vista ao lado dos passos (decisão 0044).
    'follow',
  ]
    .filter(Boolean)
    .join(' ');
  const printStyle = {
    '--print-radius': String(print.radiusCm),
    '--chart-span-x': String(frame.span.x),
    '--chart-span-y': String(frame.span.y),
  } as CSSProperties;
  let source: string;
  if (differenceOn) {
    source = t('difference.print', { a: sourceA, b: sourceB });
  } else if (epw && selected.kind === 'file' && loadedFile) {
    source = t('print.sourceFile', { file: loadedFile.fileName });
  } else if (epw && city?.historical) {
    source = t('print.sourceHistorical', { what: historicalWhat(city) });
  } else if (city) {
    source = t('print.sourceCity', { station: city.station });
  } else if (selected.kind === 'station') {
    source = t('print.sourceStation', { station: site.name });
  } else source = '';

  // Passos 6 e 7 recolhidos: só o cabeçalho, sem carregar o código do passo (decisão 0039).
  const piecesText =
    geometry.devices.length > 0
      ? t('geometry.piecesCount', { count: geometry.devices.length })
      : t('geometry.noPieces');
  const geometryStub = (
    <AdvancedStepStub
      n={6}
      heading={t('geometry.heading')}
      summary={
        geometry.window
          ? t('geometry.summaryDefined', {
              width: formatNumber(geometry.window.width, 2),
              height: formatNumber(geometry.window.height, 2),
              pieces: piecesText,
            })
          : t('geometry.summary')
      }
      testId="geometry-panel"
      summaryTestId="geometry-summary"
      {...stepProps('6')}
    />
  );
  const effectStub = (
    <AdvancedStepStub
      n={7}
      heading={t('effect.heading')}
      summary={t('effect.summary')}
      testId="effect-panel"
      {...stepProps('7')}
    />
  );

  const live =
    wind.tab === 'rose' ? (
      <div role="tabpanel" id="panel-rose" aria-labelledby="tab-rose">
        <Suspense fallback={<p className="note">{t('wind.loading')}</p>}>
          <WindPanel
            epw={epw}
            wind={wind}
            classification={classification}
            sourceUrl={sourceUrl}
            onChange={setHashState}
          />
        </Suspense>
      </div>
    ) : wind.tab === '3d' ? (
      <div role="tabpanel" id="panel-3d" aria-labelledby="tab-3d">
        <Suspense fallback={<p className="note">{t('view3d.loading')}</p>}>
          <View3DPanel hash={hashState} onChange={setHashState} />
        </Suspense>
      </div>
    ) : (
      <div role="tabpanel" id="panel-chart" aria-labelledby="tab-chart">
        <ChartView
          hash={hashState}
          epw={epw}
          difference={differenceOn ? epwA : null}
          answer={exerciseChecked ? answerRegion(exercise) : null}
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
            t('readout.hint'),
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
        <SideResultsProvider value={sideSlots}>
          <div className="workspace">
            <div className="steps">
              {/* Atalho entre passos (decisão 0040): só com um passo avançado aberto. */}
              {(geometryOpen || effectOpen) && <StepNav current={openStep} onGo={goToStep} />}
              {tutorialStep && (
                <Suspense fallback={null}>
                  <TutorialCard step={tutorialStep} hash={hashState} onChange={setHashState} />
                </Suspense>
              )}
              {exercise && (
                <Suspense fallback={null}>
                  <ExerciseCard
                    id={exercise}
                    site={siteFromHash(EXERCISES[exercise].state).site}
                    orientation={protractor.orientation}
                    drawn={protractor.drawn.total}
                    checked={exerciseChecked}
                    onChange={setHashState}
                    onStartDrawing={() => setDrawing({ kind: 'total', vertices: [] })}
                  />
                </Suspense>
              )}
              {example && (
                <Suspense fallback={null}>
                  <ExampleCard
                    id={example}
                    onClose={() => setHashState({ exemplo: '' })}
                    onMore={() => setHashState({ ajuda: 'exemplos' })}
                  />
                </Suspense>
              )}
              <SitePanel
                selected={selected}
                loadedFile={selected.kind === 'file' ? loadedFile : null}
                historical={historical}
                onSelect={(next, file) => {
                  setLoadedFile(file);
                  setHashState(hashForSite(next));
                }}
                projectPoint={projectPointFromHash(hashState.perto)}
                onProjectPointChange={(value) => setHashState({ perto: value })}
                {...stepProps('1')}
                onNext={() => goToStep('2')}
              />
              <Step
                n={2}
                heading={t('facade.heading')}
                summary={facadeSummary(protractor, t, formatNumber)}
                summaryTestId="facade-summary"
                testId="facade-panel"
                dataStep="2"
                {...stepProps('2')}
              >
                <Suspense fallback={stepLoading}>
                  <FacadePanel
                    state={protractor}
                    rawOrientation={hashState.o ?? ''}
                    onChange={setHashState}
                  />
                </Suspense>
                <NextStep n={3} heading={t('protection.heading')} onClick={() => goToStep('3')} />
              </Step>
              <Step
                n={3}
                heading={t('protection.heading')}
                summary={protectionSummary(hashState, protractor, t, (v) =>
                  formatNumber(v, Number.isInteger(v) ? 0 : 1),
                )}
                summaryTestId="protection-summary"
                testId="protection-panel"
                dataStep="3"
                {...stepProps('3')}
              >
                <Suspense fallback={stepLoading}>
                  <ProtectionPanel
                    state={protractor}
                    hash={hashState}
                    onChange={setHashState}
                    drawing={drawing}
                    onDrawingChange={setDrawing}
                  />
                </Suspense>
                <NextStep n={4} heading={t('data.heading')} onClick={() => goToStep('4')} />
              </Step>
              <Step
                n={4}
                heading={t('data.heading')}
                summary={dataSummary(ov.overlay, epw !== null, t, formatNumber)}
                summaryTestId="data-summary"
                testId="data-panel"
                dataStep="4"
                {...stepProps('4')}
              >
                <Suspense fallback={stepLoading}>
                  <DataPanel
                    overlay={ov.overlay}
                    hasData={epw !== null}
                    sourceUrl={sourceUrl}
                    limits={ov.quantityLimits}
                    timeZone={site.timeZone}
                    onChange={setHashState}
                  />
                </Suspense>
                <NextStep n={5} heading={t('outputs.heading')} onClick={() => goToStep('5')} />
              </Step>
              <Step
                n={5}
                heading={t('outputs.heading')}
                summary={outputsSummary(print, hashA !== null, t, formatNumber, locale)}
                summaryTestId="outputs-summary"
                testId="outputs-panel"
                dataStep="5"
                {...stepProps('5')}
              >
                <Suspense fallback={stepLoading}>
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
                </Suspense>
              </Step>
              <p className="steps-group">{t('advanced.group')}</p>
              <ChartOptionsPanel
                hash={hashState}
                site={site}
                placeName={site.name}
                onChange={setHashState}
                {...stepProps('opcoes')}
              />
              {geometryOpen ? (
                <Suspense fallback={geometryStub}>
                  <GeometryPanel
                    geometry={geometry}
                    hash={hashState}
                    scale={geometryScale}
                    site={site}
                    orientation={protractor.orientation}
                    onChange={setHashState}
                    {...stepProps('6')}
                  />
                  <RestoreStepFocus testId="geometry-panel" />
                </Suspense>
              ) : (
                geometryStub
              )}
              {effectOpen ? (
                <Suspense fallback={effectStub}>
                  <EffectPanel
                    epw={epw}
                    hash={hashState}
                    geometry={geometry}
                    orientation={protractor.orientation}
                    onChange={setHashState}
                    {...stepProps('7')}
                  />
                  <RestoreStepFocus testId="effect-panel" />
                </Suspense>
              ) : (
                effectStub
              )}
            </div>
            <section
              className={sectionClass}
              style={printStyle}
              aria-labelledby="chart-heading"
              data-step="carta"
            >
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
              {/* O mapa do catálogo (passo 1) fica acima da carta, à altura do passo (decisão 0038). */}
              {sideOn && (
                <div className="side-results side-results-top" data-testid="side-results-top">
                  <div ref={setCatalogSlot} />
                </div>
              )}
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
              {hashA && wind.tab === 'chart' && (
                <p className="difference-toggle">
                  <button
                    type="button"
                    className="btn"
                    aria-pressed={differenceAsked}
                    data-testid="difference-toggle"
                    onClick={() => setHashState({ dif: differenceAsked ? '' : '1' })}
                  >
                    {t('difference.toggle')}
                  </button>
                </p>
              )}
              {differenceBlocked && (
                <p className="note difference-blocked" data-testid="difference-blocked">
                  {t(`difference.${differenceBlocked}`)}
                </p>
              )}
              {differenceOn && hashA ? (
                <div className="difference" data-testid="difference-view">
                  <h3 className="compare-label">{t('difference.title')}</h3>
                  <ul className="difference-sources">
                    <li>
                      {t('compare.a')}: {siteFromHash(hashA).site.name}. {sourceA}
                    </li>
                    <li>
                      {t('compare.b')}: {site.name}. {sourceB}
                    </li>
                  </ul>
                  <p className="note">{t('difference.note')}</p>
                  {live}
                </div>
              ) : hashA ? (
                <div className="compare" data-testid="compare-view">
                  <div className="compare-col" data-testid="compare-a">
                    <h3 className="compare-label">
                      {t('compare.a')}: {describeConfig(hashA, fmt, words)}
                    </h3>
                    {wind.tab === 'rose' ? (
                      <Suspense fallback={<p className="note">{t('wind.loading')}</p>}>
                        <WindPanel
                          epw={epwA}
                          wind={windFromHash(hashA)}
                          classification={classificationFromHash(hashA)}
                          onChange={() => {}}
                          readOnly
                        />
                      </Suspense>
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
                  <Suspense fallback={null}>
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
                  </Suspense>
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

      {helpSection && (
        <Suspense fallback={null}>
          <HelpDialog
            section={helpSection}
            example={example}
            onSection={(s) => setHashState({ ajuda: s })}
            onClose={() => setHashState({ ajuda: '' })}
          />
        </Suspense>
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
