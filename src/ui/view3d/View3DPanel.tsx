import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { buildScene } from '../../core/shading/geometry';
import {
  facadeVector,
  shadedFraction,
  shadowPolygons,
  sunOnWindow,
} from '../../core/shading/shadedFraction';
import { REFERENCE_YEAR } from '../../core/solar/constants';
import { solarPosition } from '../../core/solar/spa';
import { localStandardToUtc } from '../../core/solar/time';
import { useI18n } from '../i18n/useI18n';
import { geometryFromHash, parseDecimal } from '../state/geometryHash';
import type { HashState } from '../state/hashState';
import { protractorFromHash } from '../state/protractorHash';
import { siteFromHash } from '../state/siteHash';
import { timeZoneOffset } from '../timeZoneOffset';
import type { Scene3D } from './scene3d';

const MIN_HOUR = 4;
const MAX_HOUR = 20;

/**
 * Aba "Vista 3D" (F3.7): janela, peças, sol e a sombra do cálculo no dia 21 do mês e na hora
 * escolhidos, com animação do dia. Estado no link: v3m (mês), v3h (hora legal), v3v=f (de frente).
 */
export function View3DPanel({
  hash,
  onChange,
}: {
  hash: HashState;
  onChange: (patch: Record<string, string>) => void;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const geometry = geometryFromHash(hash);
  const site = siteFromHash(hash).site;
  const { orientation } = protractorFromHash(hash);
  const m = Number(hash.v3m);
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : 12;
  const h = parseDecimal(hash.v3h);
  const savedHour = h !== undefined && h >= MIN_HOUR && h <= MAX_HOUR ? h : 10;
  const view = hash.v3v === 'f' ? 'front' : 'perspective';
  const [playing, setPlaying] = useState<number | null>(null);
  const hour = playing ?? savedHour;
  const win = geometry.window;
  const geometryKey = JSON.stringify([win, geometry.devices], (_k, v: unknown) =>
    v === Infinity ? 'inf' : v,
  );
  const scene = useMemo(
    () => (win ? buildScene(win, geometry.devices) : null),
    // A chave representa a janela e as peças.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometryKey],
  );

  const instant = localStandardToUtc(REFERENCE_YEAR, month, 21, hour, site.timeZone);
  const sun = solarPosition(instant, site.latitude, site.longitude, site.elevation);
  const s = facadeVector(sun.elevation, sun.azimuth, orientation);
  const onWindow = sunOnWindow(s);
  const shadows = scene && onWindow ? shadowPolygons(scene, s) : [];
  const shaded = scene && onWindow ? shadedFraction(scene, s) : null;

  const tz = timeZoneOffset(site.timeZone, formatNumber);
  const months = t('annual.monthsLong').split(',');
  const hh = Math.floor(hour + 1e-9);
  const hourText = `${hh}h${String(Math.round((hour - hh) * 60)).padStart(2, '0')} (UTC${tz})`;
  const dateText = t('view3d.dayOption', { month: months[month - 1]! });
  const status =
    sun.elevation <= 0
      ? t('view3d.night', { date: dateText, hour: hourText })
      : !onWindow
        ? t('view3d.behind', { date: dateText, hour: hourText })
        : t('view3d.status', {
            date: dateText,
            hour: hourText,
            altitude: formatNumber(sun.elevation, 1),
            azimuth: formatNumber(sun.azimuth, 1),
            shaded: formatNumber((shaded ?? 0) * 100, 1),
            sunlit: formatNumber((1 - (shaded ?? 0)) * 100, 1),
          });

  // Cena 3D: o Three.js só é carregado aqui, quando a aba abre.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scene3d = useRef<Scene3D | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [size, setSize] = useState<[number, number]>([300, 240]);
  const canvasCallback = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    if (!el) return;
    const measure = () => {
      const w = el.parentElement?.clientWidth || 300;
      setSize([w, Math.round(Math.min(0.75 * w, 480))]);
    };
    measure();
    if (typeof ResizeObserver === 'undefined' || !el.parentElement) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    let alive = true;
    import('./scene3d')
      .then((mod) => {
        if (!alive || !canvasRef.current) return;
        try {
          scene3d.current = new mod.Scene3D(canvasRef.current);
          setState('ready');
        } catch {
          setState('failed');
        }
      })
      .catch(() => alive && setState('failed'));
    return () => {
      alive = false;
      scene3d.current?.dispose();
      scene3d.current = null;
    };
  }, []);
  useEffect(() => {
    scene3d.current?.setSize(size[0], size[1]);
  }, [state, size]);
  const sunKey = `${s.x},${s.y},${s.z},${sun.elevation > 0}`;
  useEffect(() => {
    if (!scene3d.current || !scene) return;
    scene3d.current.update({
      scene,
      setback: win?.setback ?? 0,
      sun: sun.elevation > 0 ? s : null,
      shadows,
      view,
    });
    // As chaves representam a cena, o sol e a vista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, scene, sunKey, view]);

  // Animação: 10 minutos a cada 120 ms, das 4 às 20 h, de novo do começo.
  useEffect(() => {
    if (playing === null) return;
    const timer = setInterval(() => {
      setPlaying((p) => (p === null ? null : p + 1 / 6 > MAX_HOUR ? MIN_HOUR : p + 1 / 6));
    }, 120);
    return () => clearInterval(timer);
  }, [playing === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = () => {
    if (playing !== null)
      onChange({ v3h: String(Math.round(playing * 100) / 100).replace('.', ',') });
    setPlaying(null);
  };

  if (!scene) {
    return (
      <p className="note" data-testid="view3d-needs-window">
        {t('view3d.needsWindow')}
      </p>
    );
  }
  return (
    <div className="view3d" data-testid="view3d">
      <div className="view3d-controls">
        <div className="field">
          <label htmlFor={`${id}-m`}>{t('view3d.month')}</label>
          <select
            id={`${id}-m`}
            value={month}
            data-testid="view3d-month"
            onChange={(e) => onChange({ v3m: e.target.value === '12' ? '' : e.target.value })}
          >
            {months.map((name, i) => (
              <option key={name} value={i + 1}>
                {t('view3d.dayOption', { month: name })}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-h`}>{t('view3d.hour', { timeZone: tz })}</label>
          <input
            id={`${id}-h`}
            type="range"
            min={MIN_HOUR}
            max={MAX_HOUR}
            step={0.25}
            value={hour}
            aria-valuetext={hourText}
            data-testid="view3d-hour"
            onChange={(e) => {
              setPlaying(null);
              onChange({ v3h: e.target.value.replace('.', ',') });
            }}
          />
        </div>
        <button
          type="button"
          className="btn"
          data-testid="view3d-play"
          aria-pressed={playing !== null}
          onClick={() => (playing === null ? setPlaying(hour) : stop())}
        >
          {playing === null ? t('view3d.play') : t('view3d.pause')}
        </button>
        <fieldset className="field plain">
          <legend className="field-label">{t('view3d.view')}</legend>
          {(['perspective', 'front'] as const).map((v) => (
            <label className="check" key={v}>
              <input
                type="radio"
                name={`${id}-v`}
                checked={view === v}
                data-testid={`view3d-${v}`}
                onChange={() => onChange({ v3v: v === 'front' ? 'f' : '' })}
              />
              {t(v === 'front' ? 'view3d.front' : 'view3d.perspective')}
            </label>
          ))}
        </fieldset>
      </div>
      <p className="view3d-status" role="status" data-testid="view3d-status">
        {status}
      </p>
      <div className="view3d-canvas">
        <canvas
          ref={canvasCallback}
          role="img"
          aria-label={t('view3d.label', { status })}
          data-testid="view3d-canvas"
          data-shaded={shaded === null ? '' : String(shaded)}
          data-state={state}
          style={{ width: `${size[0]}px`, height: `${size[1]}px` }}
        />
        {state === 'loading' && <p className="overlay-pending">{t('view3d.loading')}</p>}
        {state === 'failed' && (
          <p className="error" role="alert">
            {t('view3d.failed')}
          </p>
        )}
      </div>
      <p className="note">{t('view3d.note')}</p>
    </div>
  );
}
