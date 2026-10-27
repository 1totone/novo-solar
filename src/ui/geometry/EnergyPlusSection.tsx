import { useId, useMemo, useState } from 'react';
import type { Site } from '../../core/chart/sunChart';
import {
  azimuthOf,
  frameFromAzimuth,
  parseFenestration,
  placementFromVertices,
  WindowPasteError,
  type WindowPlacement,
} from '../../core/energyplus/frame';
import { invalidName, modelIdf, objectsIdf, type ExportMeta } from '../../core/energyplus/idf';
import { planExport, type ExportItem } from '../../core/energyplus/plan';
import type { Device, WindowGeometry } from '../../core/shading/geometry';
import { downloadBlob, fileSlug } from '../export/image';
import type { MessageKey } from '../i18n/i18n';
import { useI18n } from '../i18n/useI18n';
import { drawingsDxf } from './dxf';

/** Diferença angular em graus, de 0 a 180. */
const angleDiff = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/**
 * Passo 6, "EnergyPlus e CAD" (F5.2; spec 13): objetos para o modelo do usuário, modelo para
 * conferir e corte e vista em DXF. A física está em src/core/energyplus; aqui, só os nomes, a
 * janela colada e os botões.
 */
export function EnergyPlusSection({
  window: win,
  devices,
  site,
  orientation,
}: {
  window: WindowGeometry;
  devices: readonly Device[];
  site: Site & { name: string };
  orientation: number;
}) {
  const { t, formatNumber } = useI18n();
  const id = useId();
  const [windowName, setWindowName] = useState('JANELA');
  const [wallName, setWallName] = useState('PAREDE');
  const [pasteText, setPasteText] = useState('');
  const [clockwise, setClockwise] = useState(false);
  const fmt = (v: number, d = 2) => formatNumber(v, d);

  const pasted = useMemo(():
    | { ok: true; name: string; wall: string; placement: WindowPlacement }
    | { ok: false; error: MessageKey }
    | null => {
    if (pasteText.trim() === '') return null;
    try {
      const w = parseFenestration(pasteText);
      return {
        ok: true,
        name: w.name,
        wall: w.baseSurface,
        placement: placementFromVertices(w.vertices, clockwise),
      };
    } catch (e) {
      if (e instanceof WindowPasteError) {
        return { ok: false, error: `energyplus.pasteError.${e.code}` as MessageKey };
      }
      throw e;
    }
  }, [pasteText, clockwise]);

  const names = pasted?.ok
    ? { window: pasted.name, wall: pasted.wall }
    : { window: windowName, wall: wallName };
  const namesValid = !invalidName(names.window) && !invalidName(names.wall);
  const plan = useMemo(() => planExport(win, devices, names.window), [win, devices, names.window]);

  const warnings: string[] = [];
  if (pasted?.ok) {
    const p = pasted.placement;
    if (Math.abs(p.width - win.width) > 1e-3 || Math.abs(p.height - win.height) > 1e-3) {
      warnings.push(
        t('energyplus.warnSize', {
          width: fmt(p.width),
          height: fmt(p.height),
          width6: fmt(win.width),
          height6: fmt(win.height),
        }),
      );
    }
    const az = azimuthOf(p.frame);
    if (angleDiff(az, orientation) > 0.5) {
      warnings.push(
        t('energyplus.warnAzimuth', { azimuth: fmt(az, 1), orientation: fmt(orientation, 1) }),
      );
    }
  }

  const meta = (): ExportMeta => ({
    source: `SOL-AR ${__APP_VERSION__} (${__BUILD_COMMIT__}), ${new Date().toISOString().slice(0, 10)}`,
    siteName: site.name,
    orientation,
    link: window.location.href,
  });
  const slug = `solar-${fileSlug(site.name)}`;
  const save = (text: string, name: string, type: string) =>
    downloadBlob(new Blob([text], { type }), name);

  const exportObjects = () =>
    save(
      objectsIdf({
        window: win,
        devices,
        names,
        frame: pasted?.ok ? pasted.placement.frame : frameFromAzimuth(orientation),
        pasted: Boolean(pasted?.ok),
        meta: meta(),
        warnings,
      }),
      `${slug}-objetos-energyplus.idf`,
      'text/plain',
    );
  const exportModel = () =>
    save(
      modelIdf({
        window: win,
        devices,
        names,
        site: { ...site, name: site.name },
        meta: meta(),
      }),
      `${slug}-modelo-energyplus.idf`,
      'text/plain',
    );
  const exportDxf = () =>
    save(
      drawingsDxf(win, devices, { title: site.name }),
      `${slug}-corte-e-vista.dxf`,
      'application/dxf',
    );

  const typesOf = (items: ExportItem[]) => [...new Set(items.map((i) => i.type))].join(', ');
  const revealItems = plan.items.filter((i) => i.pieces.length === 0);

  return (
    <details className="more" data-testid="energyplus-section">
      <summary>{t('energyplus.heading')}</summary>
      <p className="note">{t('energyplus.intro')}</p>
      <div className="piece-grid">
        <div className="field">
          <label htmlFor={`${id}-w`}>{t('energyplus.windowName')}</label>
          <input
            id={`${id}-w`}
            type="text"
            value={pasted?.ok ? pasted.name : windowName}
            disabled={Boolean(pasted?.ok)}
            aria-invalid={invalidName(names.window)}
            data-testid="energyplus-window-name"
            onChange={(e) => setWindowName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-p`}>{t('energyplus.wallName')}</label>
          <input
            id={`${id}-p`}
            type="text"
            value={pasted?.ok ? pasted.wall : wallName}
            disabled={Boolean(pasted?.ok)}
            aria-invalid={invalidName(names.wall)}
            data-testid="energyplus-wall-name"
            onChange={(e) => setWallName(e.target.value)}
          />
        </div>
      </div>
      {!namesValid && (
        <p className="error" role="alert">
          {t('energyplus.nameInvalid')}
        </p>
      )}
      <div className="field">
        <label htmlFor={`${id}-paste`}>{t('energyplus.paste')}</label>
        <textarea
          id={`${id}-paste`}
          rows={4}
          spellCheck={false}
          value={pasteText}
          data-testid="energyplus-paste"
          onChange={(e) => setPasteText(e.target.value)}
        />
      </div>
      <p className="note">{t('energyplus.pasteHelp')}</p>
      {pasteText.trim() !== '' && (
        <div className="field">
          <label htmlFor={`${id}-order`}>{t('energyplus.order')}</label>
          <select
            id={`${id}-order`}
            value={clockwise ? 'cw' : 'ccw'}
            onChange={(e) => setClockwise(e.target.value === 'cw')}
          >
            <option value="ccw">{t('energyplus.order.ccw')}</option>
            <option value="cw">{t('energyplus.order.cw')}</option>
          </select>
        </div>
      )}
      {pasted && !pasted.ok && (
        <p className="error" role="alert" data-testid="energyplus-paste-status">
          {t(pasted.error)}
        </p>
      )}
      {pasted?.ok && (
        <p className="note" data-testid="energyplus-paste-status">
          {t('energyplus.pasteOk', {
            name: pasted.name,
            wall: pasted.wall,
            width: fmt(pasted.placement.width),
            height: fmt(pasted.placement.height),
            azimuth: fmt(azimuthOf(pasted.placement.frame), 1),
          })}
        </p>
      )}
      {warnings.map((w) => (
        <p className="note" key={w} data-testid="energyplus-warning">
          {w}
        </p>
      ))}
      <h4 className="sub-heading">{t('energyplus.plan')}</h4>
      <ul className="note" data-testid="energyplus-plan">
        {revealItems.length > 0 && (
          <li>{t('energyplus.planReveal', { types: typesOf(revealItems) })}</li>
        )}
        {devices.map((_, i) => (
          <li key={i}>
            {t('energyplus.planPiece', {
              n: i + 1,
              types: typesOf(plan.items.filter((it) => it.pieces.includes(i))),
            })}
          </li>
        ))}
        {plan.capped.map((c) => (
          <li key={`c${c.piece}`}>
            {t('energyplus.capped', { n: c.piece + 1, length: fmt(c.length, 1) })}
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button
          type="button"
          className="btn"
          disabled={!namesValid || (pasted !== null && !pasted.ok)}
          data-testid="energyplus-objects"
          onClick={exportObjects}
        >
          {t('energyplus.objects')}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!namesValid}
          data-testid="energyplus-model"
          onClick={exportModel}
        >
          {t('energyplus.model')}
        </button>
        <button type="button" className="btn" data-testid="energyplus-dxf" onClick={exportDxf}>
          {t('energyplus.dxf')}
        </button>
      </div>
      <p className="note">{t('energyplus.objectsHelp')}</p>
      <p className="note">{t('energyplus.modelHelp')}</p>
      <p className="note">{t('energyplus.dxfHelp')}</p>
    </details>
  );
}
