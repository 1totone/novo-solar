import { useRef, useState, type FormEvent } from 'react';
import { readDirection } from '../../core/chart/readout';
import type { Site } from '../../core/chart/sunChart';
import { directionAngles } from '../../core/protractor/pointAngles';
import type { AngleReference } from '../../core/protractor/protractor';
import { useI18n } from '../i18n/useI18n';
import type { HourLinesMode } from '../state/chartOptionsHash';
import { parseDegrees, parseOrientation } from '../state/orientation';
import type { MarkedPoint, PointNumber } from '../state/pointsHash';
import { PointBadge } from './PointMarkers';
import { useReadingText } from './readingText';

/** Aviso ou confirmação depois de marcar, remover ou limpar. */
export type PointsMessage =
  | { kind: 'marked'; n: PointNumber }
  | { kind: 'removed'; n: PointNumber }
  | { kind: 'cleared' }
  | { kind: 'full' };

/**
 * Tabela dos pontos marcados na carta (decisão 0051), embaixo dela: altura, azimute, quando o sol
 * passa ali (como na leitura) e α e β do transferidor na referência do passo 3, para a fachada do
 * passo 2. Cada ponto tem um botão para remover; "Limpar pontos" tira todos. Para quem não usa o
 * mouse, um ponto também se marca digitando a altura e o azimute.
 */
export function PointsPanel({
  points,
  site,
  orientation,
  reference,
  hourLines,
  message,
  onAdd,
  onRemove,
  onClear,
}: {
  points: readonly MarkedPoint[];
  site: Site;
  orientation: number;
  reference: AngleReference;
  hourLines: HourLinesMode;
  message: PointsMessage | null;
  onAdd: (direction: { altitude: number; azimuth: number }) => void;
  onRemove: (n: PointNumber) => void;
  onClear: () => void;
}) {
  const { t, formatNumber } = useI18n();
  const text = useReadingText(hourLines);
  const [typing, setTyping] = useState(false);
  const [raw, setRaw] = useState({ altitude: '', azimuth: '' });
  const [invalid, setInvalid] = useState<('altitude' | 'azimuth')[]>([]);
  const panel = useRef<HTMLElement>(null);
  const typeToggle = useRef<HTMLButtonElement>(null);
  const altitudeField = useRef<HTMLInputElement>(null);
  const side = { right: t('sides.rightShort'), left: t('sides.leftShort') };
  const degrees = (v: number) => `${formatNumber(Math.round(v))}°`;
  const compass = t('compass.points').split(',');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const altitude = parseDegrees(raw.altitude);
    const azimuth = parseOrientation(raw.azimuth);
    const bad: ('altitude' | 'azimuth')[] = [];
    if (altitude === null || altitude < 0 || altitude > 90) bad.push('altitude');
    if (azimuth === null) bad.push('azimuth');
    setInvalid(bad);
    if (bad.length > 0) return;
    onAdd({ altitude: altitude!, azimuth: azimuth! });
    if (points.length < 3) setRaw({ altitude: '', azimuth: '' });
  };

  // Ao remover, o foco vai para o botão de remover do ponto seguinte (ou do anterior); sem pontos,
  // para o botão de digitar um ponto (o de remover e o de limpar saem da tela).
  const remove = (n: PointNumber) => {
    const i = points.findIndex((p) => p.n === n);
    const neighbor = points[i + 1] ?? points[i - 1];
    onRemove(n);
    requestAnimationFrame(() => {
      const next = neighbor
        ? panel.current?.querySelector<HTMLElement>(`[data-remove="${neighbor.n}"]`)
        : typeToggle.current;
      next?.focus();
    });
  };
  const clear = () => {
    onClear();
    requestAnimationFrame(() => typeToggle.current?.focus());
  };

  const status = message
    ? message.kind === 'full'
      ? t('points.full')
      : message.kind === 'cleared'
        ? t('points.cleared')
        : t(message.kind === 'marked' ? 'points.marked' : 'points.removed', { n: message.n })
    : '';

  const referenceName = t(reference === 'internal' ? 'points.internal' : 'points.external');
  // Sem pontos e sem o formulário aberto, o painel não ocupa espaço embaixo da carta (decisão 0051):
  // o título e o botão de digitar aparecem quando o botão recebe o foco pelo teclado.
  const shown = points.length > 0 || typing;
  return (
    <section
      ref={panel}
      className={`points${shown ? '' : ' empty'}`}
      aria-labelledby="points-heading"
      data-testid="points-panel"
    >
      <div className="points-head">
        <h3 id="points-heading" className="points-title">
          {t('points.heading')}
        </h3>
        {points.length > 0 && (
          <span className="points-reference" data-testid="points-reference">
            {t('points.reference', { reference: referenceName })}
          </span>
        )}
        <span className="points-actions">
          <button
            ref={typeToggle}
            type="button"
            className="btn small"
            aria-expanded={typing}
            aria-controls="points-form"
            data-testid="points-type"
            onClick={() => {
              setTyping(!typing);
              // Ao abrir, o foco vai para a altura.
              if (!typing) requestAnimationFrame(() => altitudeField.current?.focus());
            }}
          >
            {t('points.typeButton')}
          </button>
          {points.length > 0 && (
            <button type="button" className="btn small" data-testid="points-clear" onClick={clear}>
              {t('points.clear')}
            </button>
          )}
        </span>
      </div>
      <form
        id="points-form"
        className="points-form"
        hidden={!typing}
        onSubmit={submit}
        noValidate
        data-testid="points-form"
      >
        <label>
          {t('points.altitude')}
          <span className="visually-hidden">{t('points.altitudeDetail')}</span>
          <input
            ref={altitudeField}
            type="text"
            inputMode="decimal"
            value={raw.altitude}
            aria-invalid={invalid.includes('altitude')}
            aria-describedby={invalid.includes('altitude') ? 'points-altitude-error' : undefined}
            onChange={(e) => setRaw({ ...raw, altitude: e.target.value })}
            data-testid="points-altitude"
          />
          <span aria-hidden="true">°</span>
        </label>
        <label>
          {t('points.azimuth')}
          <span className="visually-hidden">{t('points.azimuthDetail')}</span>
          <input
            type="text"
            value={raw.azimuth}
            aria-invalid={invalid.includes('azimuth')}
            aria-describedby={invalid.includes('azimuth') ? 'points-azimuth-error' : undefined}
            onChange={(e) => setRaw({ ...raw, azimuth: e.target.value })}
            data-testid="points-azimuth"
          />
          <span aria-hidden="true">°</span>
        </label>
        <button type="submit" className="btn small" data-testid="points-add">
          {t('points.add')}
        </button>
        {invalid.includes('altitude') && (
          <p id="points-altitude-error" className="error">
            {t('points.altitudeError')}
          </p>
        )}
        {invalid.includes('azimuth') && (
          <p id="points-azimuth-error" className="error">
            {t('points.azimuthError')}
          </p>
        )}
      </form>
      <p
        role="status"
        className={message?.kind === 'full' ? 'points-warning' : 'visually-hidden'}
        data-testid="points-status"
      >
        {status}
      </p>
      {points.length > 0 && (
        <table className="points-table" data-testid="points-table">
          {/* Na tela, a referência fica ao lado do título e a fachada, no passo 2; para o leitor de
              tela e na folha impressa, a legenda diz as duas. */}
          <caption className="points-caption">
            {t('points.caption', {
              reference: referenceName,
              orientation: formatNumber(Math.round(orientation) % 360),
              compass: compass[Math.round(orientation / 22.5) % 16]!,
            })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('points.point')}</th>
              <th scope="col">{t('points.altitude')}</th>
              <th scope="col">{t('points.azimuth')}</th>
              <th scope="col">{t('points.sunColumn')}</th>
              <th scope="col">α</th>
              <th scope="col">β</th>
              <th scope="col">
                <span className="visually-hidden">{t('points.removeColumn')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => {
              const reading = readDirection(site, 90 - p.altitude, p.azimuth);
              const a = text.angles(p.altitude, p.azimuth);
              const legal = text.legal(reading);
              const angles = directionAngles(orientation, reference, p.altitude, p.azimuth);
              return (
                <tr key={p.n} data-testid="points-row" data-point={p.n}>
                  <th scope="row">
                    <PointBadge n={p.n} />
                    <span className="visually-hidden">{t('points.name', { n: p.n })}</span>
                  </th>
                  <td data-testid="points-altitude-cell">{a.altitude}°</td>
                  <td data-testid="points-azimuth-cell">
                    {a.azimuth}° {a.compass}
                  </td>
                  <td className="points-sun" data-testid="points-sun-cell">
                    {text.sun(reading, true)}
                    {legal && <span className="points-legal">{legal}</span>}
                  </td>
                  {angles.front ? (
                    <>
                      <td data-testid="points-alpha-cell">{degrees(angles.alpha!)}</td>
                      <td data-testid="points-beta-cell">
                        {degrees(angles.beta!)}
                        {angles.side && ` ${side[angles.side]}`}
                      </td>
                    </>
                  ) : (
                    <td colSpan={2} className="points-behind" data-testid="points-behind-cell">
                      {t('points.behind')}
                    </td>
                  )}
                  <td>
                    <button
                      type="button"
                      className="point-remove"
                      aria-label={t('points.remove', { n: p.n })}
                      title={t('points.remove', { n: p.n })}
                      data-remove={p.n}
                      data-testid="points-remove"
                      onClick={() => remove(p.n)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
