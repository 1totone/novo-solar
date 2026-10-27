import { useId } from 'react';
import type { Site } from '../../core/chart/sunChart';
import type { Extreme, RequiredAngles, SizedFin } from '../../core/shading/inverse';
import { useI18n } from '../i18n/useI18n';
import { piecesPatch, type GeometryState, type PieceCode } from '../state/geometryHash';
import type { HashState } from '../state/hashState';
import { protractorFromHash } from '../state/protractorHash';
import { SUMMER, sizingFromHash, sizingKeyOf, type SizingField } from '../state/sizingHash';
import { timeZoneOffset } from '../timeZoneOffset';
import { useSizing } from './sizingClient';
import { sizingInput } from './sizingInput';

type AngleName = keyof RequiredAngles;
const ANGLES: AngleName[] = [
  'alpha',
  'alphaMax',
  'gammaRight',
  'gammaLeft',
  'betaRight',
  'betaLeft',
  'finGammaRight',
  'finGammaLeft',
];

/** Medida para o passo 6: arredondada para cima, ao centímetro (a peça não fica menor). */
const up = (v: number) => String(Math.ceil(v * 100 - 1e-9) / 100).replace('.', ',');

/** Passo 6, "Dimensionar pelo período" (F3.6). */
export function SizingSection({
  site,
  hash,
  geometry,
  orientation,
  active,
  onChange,
}: {
  site: Site & { name: string };
  hash: HashState;
  geometry: GeometryState;
  orientation: number;
  /** Passo 6 aberto: só então o período é calculado. */
  active: boolean;
  onChange: (patch: Record<string, string>) => void;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const sizing = sizingFromHash(hash);
  const input = active ? sizingInput(site, orientation, geometry, sizing) : null;
  const { result, pending, failed } = useSizing(input);
  const win = geometry.window;
  if (!win) return null;
  const tz = timeZoneOffset(site.timeZone, formatNumber);
  const deg = (v: number) => `${formatNumber(v, 1)}°`;
  const m2 = (v: number) => formatNumber(v, 2);
  const hourText = (h: number) => {
    const hh = Math.floor(h + 1e-9);
    const mm = Math.round((h - hh) * 60);
    return `${hh}h${String(mm).padStart(2, '0')}`;
  };
  const sampleText = (e: Extreme) =>
    t('sizing.sampleAt', {
      date: `${e.sample.day}/${e.sample.month}`,
      hour: `${hourText(e.sample.hour)}${sizing.timeBase === 'solar' ? ' solar' : ''}`,
    });

  const field = (f: SizingField, label: string, placeholder: string) => (
    <div className="field" key={f}>
      <label htmlFor={`${id}-${f}`}>{label}</label>
      <input
        id={`${id}-${f}`}
        type="text"
        inputMode={f === 'start' || f === 'end' ? 'text' : 'decimal'}
        value={sizing.raw[f]}
        placeholder={placeholder}
        aria-invalid={sizing.invalid.includes(f)}
        data-testid={`sizing-${f}`}
        onChange={(e) => onChange({ [sizingKeyOf(f)]: e.target.value })}
      />
    </div>
  );

  const ov = result?.overhang;
  // Aleta que passaria de 3 vezes a largura da janela não serve (o sol passa quase de frente).
  const useful = (f: SizedFin | null | undefined) => (f && f.depth <= 3 * win.width ? f : null);
  const fins = result ? { right: useful(result.fins.right), left: useful(result.fins.left) } : null;
  const finTooBig = (side: 'right' | 'left') =>
    result?.fins[side] !== null && result?.fins[side] !== undefined && !useful(result.fins[side]);
  const tooBig =
    ov?.ok &&
    (ov.device.depth > 3 * win.height ||
      Math.max(ov.device.extendLeft, ov.device.extendRight) > 3 * win.width);

  const applyPieces = (pieces: { code: PieceCode; raw: string[] }[]) =>
    onChange(piecesPatch(pieces));
  const overhangPiece = () =>
    ov?.ok
      ? [
          {
            code: 'b' as const,
            raw: [
              up(ov.device.depth),
              up(ov.device.above),
              up(ov.device.gap),
              up(ov.device.extendLeft),
              up(ov.device.extendRight),
            ],
          },
        ]
      : [];
  const finPieces = () =>
    (
      [
        ['ad', fins?.right],
        ['ae', fins?.left],
      ] as const
    ).flatMap(([code, f]) =>
      f ? [{ code, raw: [up(f.depth), '', '', up(f.extendAbove), ''] as string[] }] : [],
    );
  const useAngles = () => {
    if (!result) return;
    const ref = protractorFromHash(hash).reference;
    const a = result.angles;
    const value = (e: Extreme | null) =>
      e ? formatNumber(ref === 'internal' ? e.internal : e.external, 1) : '';
    // Ângulos de aleta só do lado em que a aleta serve (com o sol de frente, β tende a 0°).
    const fin = (side: 'right' | 'left', e: Extreme | null) => (fins?.[side] ? value(e) : '');
    onChange({
      a1: value(a.alpha),
      a2: sizing.gap > 0 ? value(a.alphaMax) : '',
      gd1: value(a.gammaRight),
      ge1: value(a.gammaLeft),
      bd1: fin('right', a.betaRight),
      be1: fin('left', a.betaLeft),
      gad: fin('right', a.finGammaRight),
      gae: fin('left', a.finGammaLeft),
    });
  };

  return (
    <div className="sizing" data-testid="sizing-section">
      <h3 className="sub-heading">{t('sizing.heading')}</h3>
      <p className="note">{t('sizing.intro')}</p>
      {!sizing.defined ? (
        <button
          type="button"
          className="btn"
          data-testid="sizing-begin"
          onClick={() => onChange(SUMMER)}
        >
          {t('sizing.start')}
        </button>
      ) : (
        <>
          <div className="piece-grid">
            {field('start', t('sizing.from'), '21/10')}
            {field('end', t('sizing.to'), '21/2')}
            {field('startHour', t('sizing.fromHour'), '9')}
            {field('endHour', t('sizing.toHour'), '15')}
          </div>
          <fieldset className="field plain">
            <legend className="field-label">{t('sizing.timeBase')}</legend>
            {(['solar', 'legal'] as const).map((b) => (
              <label className="check" key={b}>
                <input
                  type="radio"
                  name={`${id}-tb`}
                  checked={sizing.timeBase === b}
                  data-testid={`sizing-time-${b}`}
                  onChange={() => onChange({ dtb: b === 'legal' ? 'l' : '' })}
                />
                {b === 'solar'
                  ? t('sizing.timeBase.solar')
                  : t('sizing.timeBase.legal', { timeZone: tz })}
              </label>
            ))}
          </fieldset>
          <div className="piece-grid">
            {field('gap', t('sizing.gap'), '0')}
            {field('count', t('sizing.count'), '1')}
          </div>
          <p className="note">{t('sizing.optionsHelp')}</p>
          {sizing.invalid.length > 0 && (
            <p className="error" role="alert">
              {t('sizing.invalid')}
            </p>
          )}
          {pending && sizing.period && (
            <p className="overlay-pending" role="status" data-testid="sizing-pending">
              {t('sizing.pending')}
            </p>
          )}
          {failed && (
            <p className="error" role="alert">
              {t('sizing.failed')}
            </p>
          )}
          {result && sizing.period && (
            <div className="sizing-results" data-testid="sizing-results">
              <p className="note">
                {t('sizing.samples', { sunny: result.sunny, total: result.total })}
              </p>
              {result.sunny === 0 ? (
                <p className="note" data-testid="sizing-no-sun">
                  {t('sizing.noSun')}
                </p>
              ) : (
                <>
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label={t('sizing.anglesCaption')}
                  >
                    <table className="data-table" data-testid="sizing-angles">
                      <caption>{t('sizing.anglesCaption')}</caption>
                      <thead>
                        <tr>
                          <th scope="col">{t('sizing.col.angle')}</th>
                          <th scope="col">{t('sizing.col.value')}</th>
                          <th scope="col">{t('sizing.col.sample')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ANGLES.filter((a) => result.angles[a] !== null)
                          .filter((a) => a !== 'alphaMax' || sizing.gap > 0)
                          .map((a) => {
                            const e = result.angles[a]!;
                            return (
                              <tr key={a} data-angle={a}>
                                <th scope="row">{t(`sizing.angle.${a}`)}</th>
                                <td>
                                  {deg(e.internal)} ({deg(e.external)})
                                </td>
                                <td>{sampleText(e)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <h4 className="sub-heading">{t('sizing.overhang')}</h4>
                  {ov?.ok ? (
                    <p data-testid="sizing-overhang">
                      {t('sizing.overhangDims', {
                        depth: m2(ov.device.depth),
                        above: m2(ov.device.above),
                        gap: m2(ov.device.gap),
                        left: m2(ov.device.extendLeft),
                        right: m2(ov.device.extendRight),
                      })}
                    </p>
                  ) : ov && !ov.ok && ov.reason === 'setbackSuffices' ? (
                    <p data-testid="sizing-overhang">{t('sizing.setbackSuffices')}</p>
                  ) : null}
                  {result.louvers && (
                    <p data-testid="sizing-louvers">
                      {t('sizing.louvers', {
                        count: result.louvers.count,
                        chord: m2(result.louvers.chord),
                        pitch: m2(result.louvers.pitch),
                        above: m2(result.louvers.above),
                      })}
                    </p>
                  )}
                  <h4 className="sub-heading">{t('sizing.fins')}</h4>
                  <ul className="sizing-fins" data-testid="sizing-fins">
                    {(
                      [
                        ['right', fins?.right, result.angles.betaRight],
                        ['left', fins?.left, result.angles.betaLeft],
                      ] as const
                    ).map(([side, f, beta]) => {
                      const sideText = t(side === 'right' ? 'sizing.right' : 'sizing.left');
                      return (
                        <li key={side}>
                          {f
                            ? t('sizing.fin', {
                                side: sideText,
                                depth: m2(f.depth),
                                above: m2(f.extendAbove),
                              })
                            : finTooBig(side)
                              ? t('sizing.finUseless', {
                                  side: sideText,
                                  beta: deg(beta!.external),
                                })
                              : !beta
                                ? t('sizing.finNone', { side: sideText })
                                : t('sizing.finSetback', { side: sideText })}
                        </li>
                      );
                    })}
                  </ul>
                  {result.finLouvers && (fins?.right || fins?.left) && (
                    <p data-testid="sizing-fin-louvers">
                      {t('sizing.finLouvers', {
                        count: result.finLouvers.count,
                        chord: m2(result.finLouvers.chord),
                        pitch: m2(result.finLouvers.pitch),
                      })}
                    </p>
                  )}
                  {tooBig && (
                    <p className="error" role="alert" data-testid="sizing-too-big">
                      {t('sizing.tooBig')}
                    </p>
                  )}
                  <div className="export-buttons">
                    {ov?.ok && (
                      <button
                        type="button"
                        className="btn"
                        data-testid="sizing-use-overhang"
                        onClick={() => applyPieces(overhangPiece())}
                      >
                        {t('sizing.useOverhang')}
                      </button>
                    )}
                    {ov?.ok && finPieces().length > 0 && (
                      <button
                        type="button"
                        className="btn"
                        data-testid="sizing-use-all"
                        onClick={() => applyPieces([...overhangPiece(), ...finPieces()])}
                      >
                        {t('sizing.useAll')}
                      </button>
                    )}
                    {result.louvers && (
                      <button
                        type="button"
                        className="btn"
                        data-testid="sizing-use-louvers"
                        onClick={() => {
                          const l = result.louvers!;
                          applyPieces([
                            {
                              code: 'lh',
                              raw: [
                                String(l.count),
                                up(l.chord),
                                String(Math.floor(l.pitch * 1e4) / 1e4).replace('.', ','),
                                '',
                                '',
                                up(l.above),
                                up(l.extendLeft ?? 0),
                                up(l.extendRight ?? 0),
                              ],
                            },
                          ]);
                        }}
                      >
                        {t('sizing.useLouvers')}
                      </button>
                    )}
                    {result.finLouvers && (fins?.right || fins?.left) && (
                      <button
                        type="button"
                        className="btn"
                        data-testid="sizing-use-fin-louvers"
                        onClick={() => {
                          const l = result.finLouvers!;
                          applyPieces([
                            {
                              code: 'lv',
                              raw: [
                                String(l.count),
                                up(l.chord),
                                String(Math.floor(l.pitch * 1e4) / 1e4).replace('.', ','),
                                '',
                                '',
                                '',
                                up(l.extendAbove ?? 0),
                                '',
                              ],
                            },
                          ]);
                        }}
                      >
                        {t('sizing.useFinLouvers')}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn"
                      data-testid="sizing-use-angles"
                      onClick={useAngles}
                    >
                      {t('sizing.useAngles')}
                    </button>
                  </div>
                  <p className="note">{t('sizing.useHelp')}</p>
                </>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={hash.dvc !== '0'}
                  data-testid="sizing-show-chart"
                  onChange={(e) => onChange({ dvc: e.target.checked ? '' : '0' })}
                />
                {t('sizing.showOnChart')}
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}
