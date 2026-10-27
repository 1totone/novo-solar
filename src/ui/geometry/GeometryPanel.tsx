import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Site } from '../../core/chart/sunChart';
import { AnnualSection } from '../annual/AnnualSection';
import { SizingSection } from '../sizing/SizingSection';
import type { HashState } from '../state/hashState';
import { downloadBlob, fileSlug, standaloneSvg } from '../export/image';
import { useI18n } from '../i18n/useI18n';
import type { MessageKey } from '../i18n/i18n';
import {
  formatMeters,
  MAX_PIECES,
  newPieceRaw,
  piecesPatch,
  PIECE_FIELDS,
  pointPatch,
  type GeometryState,
  type PieceCode,
  type PieceField,
} from '../state/geometryHash';
import { EnergyPlusSection } from './EnergyPlusSection';
import { GeometryDrawing } from './GeometryDrawing';
import { paperDrawing, SCALES, screenFont } from './layout';

const CODES = Object.keys(PIECE_FIELDS) as PieceCode[];

function fieldLabel(code: PieceCode, field: PieceField): MessageKey {
  if (field === 'above') return code === 'b' ? 'geometry.field.above.b' : 'geometry.field.above.lh';
  if (field === 'angle')
    return code === 'lh' ? 'geometry.field.angle.lh' : 'geometry.field.angle.lv';
  return `geometry.field.${field}` as MessageKey;
}

/** Passo 6: proteção pelas dimensões (F3.1). */
export function GeometryPanel({
  geometry,
  hash,
  scale,
  site,
  orientation,
  onChange,
  open,
  onOpenChange,
}: {
  geometry: GeometryState;
  /** Estado do link (período do dimensionamento e referência dos ângulos do passo 3). */
  hash: HashState;
  scale: number;
  site: Site & { name: string };
  /** Orientação da fachada (passo 2), para o mapa do ano. */
  orientation: number;
  onChange: (patch: Record<string, string>) => void;
  /** Passo aberto (a carta acompanha a rolagem no computador enquanto ele está aberto). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const [addCode, setAddCode] = useState<PieceCode>('b');
  const svgRef = useRef<SVGSVGElement>(null);
  // Ao começar, o botão some: o foco vai para a largura da janela, e não se perde na página.
  const widthRef = useRef<HTMLInputElement>(null);
  const focusWidth = useRef(false);
  useEffect(() => {
    if (focusWidth.current && widthRef.current) {
      widthRef.current.focus();
      focusWidth.current = false;
    }
  });
  const [boxPx, setBoxPx] = useState(300);
  // Largura disponível para o desenho na tela (a letra fica com cerca de 12 px).
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
  const fmt = (v: number) => formatNumber(v, 2);
  const win = geometry.window;
  const pieceList = geometry.pieces.map((p) => ({ code: p.code, raw: p.raw }));
  const piecesText =
    geometry.devices.length > 0
      ? t('geometry.piecesCount', { count: geometry.devices.length })
      : t('geometry.noPieces');
  const title = win
    ? t('geometry.drawingTitle', {
        width: fmt(win.width),
        height: fmt(win.height),
        pieces: piecesText,
      })
    : '';
  const paper = win ? paperDrawing(win, geometry.devices, scale) : null;
  const size = paper;
  const point = geometry.point?.value ?? null;
  const hasPlates = win !== null && (geometry.devices.length > 0 || (win.setback ?? 0) > 0);

  const setPieceField = (i: number, k: number, value: string) => {
    const next = pieceList.map((p, j) =>
      j === i ? { ...p, raw: p.raw.map((v, m) => (m === k ? value : v)) } : p,
    );
    onChange(piecesPatch(next));
  };
  const removePiece = (i: number) => onChange(piecesPatch(pieceList.filter((_, j) => j !== i)));
  const addPiece = () => {
    if (pieceList.length >= MAX_PIECES) return;
    const w = win?.width ?? 1.2;
    const h = win?.height ?? 1;
    onChange(piecesPatch([...pieceList, { code: addCode, raw: newPieceRaw(addCode, w, h) }]));
  };
  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg || !size) return;
    const text = standaloneSvg(svg, title, {
      width: `${size.width.toFixed(2)}cm`,
      height: `${size.height.toFixed(2)}cm`,
    });
    downloadBlob(
      new Blob([text], { type: 'image/svg+xml' }),
      `solar-${fileSlug(site.name)}-corte-e-vista-1-${scale}.svg`,
    );
  };

  const summary = win
    ? t('geometry.summaryDefined', {
        width: fmt(win.width),
        height: fmt(win.height),
        pieces: piecesText,
      })
    : t('geometry.summary');

  return (
    <section
      className="step-panel advanced-step"
      aria-labelledby={`${id}-h`}
      data-testid="geometry-panel"
    >
      <details open={open} onToggle={(e) => onOpenChange(e.currentTarget.open)}>
        <summary>
          <h2 id={`${id}-h`}>
            <span className="step-n">6</span>
            {t('geometry.heading')}
            <span className="step-badge">{t('advanced.badge')}</span>
          </h2>
          <span className="step-summary" data-testid="geometry-summary">
            {summary}
          </span>
        </summary>
        <p className="note">{t('geometry.intro')}</p>
        {!geometry.defined && (
          <button
            type="button"
            className="btn primary"
            data-testid="geometry-start"
            onClick={() => {
              focusWidth.current = true;
              onChange({ jl: '1,2', ja: '1' });
            }}
          >
            {t('geometry.start')}
          </button>
        )}
        {geometry.defined && (
          <>
            <fieldset className="field plain">
              <legend className="field-label">{t('geometry.window')}</legend>
              <div className="piece-grid">
                {(
                  [
                    ['width', 'jl', 'geometry.width'],
                    ['height', 'ja', 'geometry.height'],
                    ['setback', 'jr', 'geometry.setback'],
                  ] as const
                ).map(([k, key, label]) => (
                  <div className="field" key={k}>
                    <label htmlFor={`${id}-${k}`}>{t(label)}</label>
                    <input
                      id={`${id}-${k}`}
                      ref={k === 'width' ? widthRef : undefined}
                      type="text"
                      inputMode="decimal"
                      value={geometry.raw[k]}
                      placeholder={k === 'setback' ? '0' : ''}
                      aria-invalid={geometry.invalid.includes(k)}
                      data-testid={`geometry-${k}`}
                      onChange={(e) => onChange({ [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <p className="note">{t('geometry.setbackHelp')}</p>
              {(geometry.invalid.length > 0 || !win) && (
                <p className="error" role="alert">
                  {t('geometry.windowInvalid')}
                </p>
              )}
            </fieldset>
            <h3 className="sub-heading">{t('geometry.pieces')}</h3>
            <p className="note">{t('geometry.sidesHelp')}</p>
            {geometry.pieces.map((p, i) => {
              const name = t(`geometry.type.${p.code}`);
              return (
                <fieldset className="piece" key={i} data-testid={`piece-${i}`}>
                  <legend>{t('geometry.pieceLegend', { n: i + 1, name })}</legend>
                  <div className="piece-grid">
                    {PIECE_FIELDS[p.code].map((f, k) => (
                      <div className="field" key={f}>
                        <label htmlFor={`${id}-p${i}-${f}`}>{t(fieldLabel(p.code, f))}</label>
                        <input
                          id={`${id}-p${i}-${f}`}
                          type="text"
                          inputMode={f === 'count' ? 'numeric' : 'decimal'}
                          value={p.raw[k] ?? ''}
                          placeholder={
                            f === 'count' || f === 'depth' || f === 'chord' || f === 'pitch'
                              ? ''
                              : '0'
                          }
                          aria-invalid={p.invalid.includes(k)}
                          data-testid={`piece-${i}-${f}`}
                          onChange={(e) => setPieceField(i, k, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn"
                    aria-label={t('geometry.removeLabel', { n: i + 1, name })}
                    data-testid={`piece-${i}-remove`}
                    onClick={() => removePiece(i)}
                  >
                    {t('geometry.remove')}
                  </button>
                </fieldset>
              );
            })}
            {geometry.pieces.some((p) => p.invalid.length > 0) && (
              <p className="error" role="alert">
                {t('geometry.piecesInvalid')}
              </p>
            )}
            <div className="add-piece">
              <label className="visually-hidden" htmlFor={`${id}-add`}>
                {t('geometry.addType')}
              </label>
              <select
                id={`${id}-add`}
                value={addCode}
                data-testid="piece-add-type"
                onChange={(e) => setAddCode(e.target.value as PieceCode)}
              >
                {CODES.map((c) => (
                  <option key={c} value={c}>
                    {t(`geometry.type.${c}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn"
                data-testid="piece-add"
                disabled={pieceList.length >= MAX_PIECES}
                onClick={addPiece}
              >
                {t('geometry.add')}
              </button>
            </div>
            {pieceList.length >= MAX_PIECES && <p className="note">{t('geometry.maxPieces')}</p>}
            {win && (
              <>
                <div className="geometry-screen" ref={boxRef}>
                  {(['section', 'elevation'] as const).map((part) => (
                    <GeometryDrawing
                      key={part}
                      window={win}
                      devices={geometry.devices}
                      title={`${t(part === 'section' ? 'geometry.section' : 'geometry.elevation')}: ${title}`}
                      font={screenFont(win, geometry.devices, part, boxPx)}
                      parts={part}
                      testId={`geometry-${part}`}
                      point={point}
                      onPick={
                        part === 'elevation' && geometry.point
                          ? (p) => onChange(pointPatch(formatMeters(p.x), formatMeters(p.z)))
                          : undefined
                      }
                    />
                  ))}
                </div>
                {paper && (
                  <div className="export-only" aria-hidden="true">
                    <GeometryDrawing
                      ref={svgRef}
                      window={win}
                      devices={geometry.devices}
                      title={title}
                      font={paper.font}
                      size={{
                        width: `${paper.width.toFixed(2)}cm`,
                        height: `${paper.height.toFixed(2)}cm`,
                      }}
                      testId="geometry-export-drawing"
                      point={point}
                    />
                  </div>
                )}
                <p className="note">{t('geometry.elevationHelp')}</p>
                <p className="note">{t('geometry.anglesHelp')}</p>
                <div className="field">
                  <label htmlFor={`${id}-scale`}>{t('geometry.scale')}</label>
                  <select
                    id={`${id}-scale`}
                    value={scale}
                    data-testid="geometry-scale"
                    onChange={(e) =>
                      onChange({ esc: e.target.value === String(50) ? '' : e.target.value })
                    }
                  >
                    {SCALES.map((s) => (
                      <option key={s} value={s}>
                        1:{s}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn"
                  data-testid="geometry-export"
                  onClick={exportSvg}
                >
                  {t('geometry.export')}
                </button>
                {size && (
                  <p className="note">
                    {t('geometry.exportHelp', {
                      width: formatNumber(size.width, 1),
                      height: formatNumber(size.height, 1),
                    })}
                  </p>
                )}
                <EnergyPlusSection
                  window={win}
                  devices={geometry.devices}
                  site={site}
                  orientation={orientation}
                />
                <h3 className="sub-heading">{t('shading.heading')}</h3>
                {!hasPlates && <p className="note">{t('shading.noPlates')}</p>}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={geometry.contours}
                    data-testid="shading-contours"
                    onChange={(e) => onChange({ cs: e.target.checked ? '' : '0' })}
                  />
                  {t('shading.showContours')}
                </label>
                <p className="note">{t('shading.contoursHelp')}</p>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={geometry.point !== null}
                    data-testid="shading-point-toggle"
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? pointPatch(formatMeters(win.width / 2), formatMeters(win.height / 2))
                          : { pt: '' },
                      )
                    }
                  />
                  {t('shading.showPoint')}
                </label>
                {geometry.point && (
                  <>
                    <div className="piece-grid">
                      {(['x', 'z'] as const).map((k) => (
                        <div className="field" key={k}>
                          <label htmlFor={`${id}-pt-${k}`}>
                            {t(k === 'x' ? 'shading.pointX' : 'shading.pointZ')}
                          </label>
                          <input
                            id={`${id}-pt-${k}`}
                            type="text"
                            inputMode="decimal"
                            value={geometry.point!.raw[k]}
                            aria-invalid={geometry.point!.invalid.includes(k)}
                            data-testid={`shading-point-${k}`}
                            onChange={(e) => {
                              const raw = { ...geometry.point!.raw, [k]: e.target.value };
                              onChange(pointPatch(raw.x, raw.z));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {geometry.point.invalid.length > 0 && (
                      <p className="error" role="alert">
                        {t('shading.pointInvalid', {
                          width: fmt(win.width),
                          height: fmt(win.height),
                        })}
                      </p>
                    )}
                    <p className="note">{t('shading.pointHelp')}</p>
                  </>
                )}
                <AnnualSection
                  site={site}
                  geometry={geometry}
                  orientation={orientation}
                  active={open}
                />
                <SizingSection
                  site={site}
                  hash={hash}
                  geometry={geometry}
                  orientation={orientation}
                  active={open}
                  onChange={onChange}
                />
              </>
            )}
          </>
        )}
      </details>
    </section>
  );
}
