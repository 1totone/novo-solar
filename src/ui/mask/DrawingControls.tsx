import type { DrawnMask } from '../../core/mask/mask';
import { useI18n } from '../i18n/useI18n';
import { formatPolygons } from '../state/protractorHash';
import type { Drawing } from './DrawingLayer';

/** Botões do desenho à mão (o modo do SOL-AR 6.2): marcar vértices na carta e fechar polígonos. */
export function DrawingControls({
  drawn,
  drawing,
  onDrawingChange,
  onChange,
}: {
  drawn: DrawnMask;
  drawing: Drawing | null;
  onDrawingChange: (next: Drawing | null) => void;
  onChange: (patch: Record<string, string>) => void;
}) {
  const { t } = useI18n();
  const hasDrawn = drawn.total.length + drawn.partial.length > 0;

  const finish = () => {
    if (!drawing || drawing.vertices.length < 3) return;
    const key = drawing.kind === 'total' ? 'dt' : 'dp';
    onChange({ [key]: formatPolygons([...drawn[drawing.kind], drawing.vertices]) });
    onDrawingChange({ ...drawing, vertices: [] });
  };

  return (
    <div className="draw-controls">
      <p className="note">{t('draw.help')}</p>
      {drawing === null ? (
        <button
          type="button"
          className="btn"
          onClick={() => onDrawingChange({ kind: 'total', vertices: [] })}
        >
          {t('draw.start')}
        </button>
      ) : (
        <>
          <div className="segmented" role="radiogroup" aria-label={t('draw.kind')}>
            {(['total', 'partial'] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={drawing.kind === k}
                onClick={() => onDrawingChange({ ...drawing, kind: k })}
              >
                {t(k === 'total' ? 'draw.total' : 'draw.partial')}
              </button>
            ))}
          </div>
          <p className="note" role="status">
            {t('draw.helpActive', { count: String(drawing.vertices.length) })}
          </p>
          <div className="button-row">
            <button
              type="button"
              className="btn"
              disabled={drawing.vertices.length === 0}
              onClick={() =>
                onDrawingChange({ ...drawing, vertices: drawing.vertices.slice(0, -1) })
              }
            >
              {t('draw.undo')}
            </button>
            <button
              type="button"
              className="btn"
              disabled={drawing.vertices.length < 3}
              onClick={finish}
            >
              {t('draw.finish')}
            </button>
            <button type="button" className="btn" onClick={() => onDrawingChange(null)}>
              {t('draw.stop')}
            </button>
          </div>
        </>
      )}
      {hasDrawn && (
        <button type="button" className="btn" onClick={() => onChange({ dt: '', dp: '' })}>
          {t('draw.clear')}
        </button>
      )}
    </div>
  );
}
