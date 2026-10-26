import { useId, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import type { MessageKey } from '../i18n/i18n';
import { ANGLE_KEYS, type AngleKey, type ProtractorState } from '../state/protractorHash';
import type { HashState } from '../state/hashState';
import { DrawingControls } from '../mask/DrawingControls';
import type { Drawing } from '../mask/DrawingLayer';
import { onRovingKeyDown } from '../a11y/roving';

interface Row {
  label: MessageKey;
  /** O que o ângulo descreve, para o nome acessível do campo (achado 16 da revisão do F2.9). */
  desc: MessageKey;
  symbol: string;
  /** [esquerda, direita]; α tem um campo só. */
  keys: [AngleKey, AngleKey | null];
}

const rows = (p: '' | 'p') => ({
  first: [
    {
      label: 'protection.alpha',
      desc: 'protection.desc.alpha',
      symbol: 'α',
      keys: [`${p}a1`, null],
    },
    {
      label: 'protection.beta',
      desc: 'protection.desc.beta',
      symbol: 'β',
      keys: [`${p}be1`, `${p}bd1`],
    },
    {
      label: 'protection.gamma',
      desc: 'protection.desc.gamma',
      symbol: 'γ',
      keys: [`${p}ge1`, `${p}gd1`],
    },
  ] satisfies Row[],
  second: [
    {
      label: 'protection.alpha',
      desc: 'protection.desc.alpha',
      symbol: 'α2',
      keys: [`${p}a2`, null],
    },
    {
      label: 'protection.beta',
      desc: 'protection.desc.beta',
      symbol: 'β2',
      keys: [`${p}be2`, `${p}bd2`],
    },
    {
      label: 'protection.gamma',
      desc: 'protection.desc.gamma',
      symbol: 'γ2',
      keys: [`${p}ge2`, `${p}gd2`],
    },
  ] satisfies Row[],
  finTop: [
    {
      label: 'protection.finTop',
      desc: 'protection.desc.finTop',
      symbol: 'γa',
      keys: [`${p}gae`, `${p}gad`],
    },
  ] satisfies Row[],
});
const TOTAL = rows('');
const PARTIAL = rows('p');
const ADVANCED_KEYS = ANGLE_KEYS.filter((k) => !['a1', 'be1', 'bd1', 'ge1', 'gd1'].includes(k));

export function ProtectionPanel({
  state,
  hash,
  onChange,
  drawing,
  onDrawingChange,
}: {
  state: ProtractorState;
  hash: HashState;
  onChange: (patch: Record<string, string>) => void;
  drawing: Drawing | null;
  onDrawingChange: (next: Drawing | null) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  // Abre "Mais opções" se o link já traz algum campo avançado ou desenho; depois, quem decide é
  // o usuário (apagar um campo não fecha o painel).
  const [moreOpen, setMoreOpen] = useState(
    () => ADVANCED_KEYS.some((k) => hash[k]) || Boolean(hash.dt || hash.dp),
  );

  const input = (k: AngleKey | null, name: string) => {
    if (!k) return <span />;
    const invalid = state.invalid.includes(k);
    return (
      <input
        type="text"
        inputMode="decimal"
        className="angle"
        aria-label={name}
        aria-invalid={invalid}
        data-testid={`angle-${k}`}
        value={hash[k] ?? ''}
        onChange={(e) => onChange({ [k]: e.target.value })}
      />
    );
  };

  // Nome acessível completo de cada campo (achado 16): símbolo, o que descreve, a sombra e o lado,
  // ex.: "β (brises verticais), sombra total, esquerda".
  const grid = (list: Row[], set: string) => (
    <div className="angle-grid">
      <span />
      <span className="muted">{t('protection.left')}</span>
      <span className="muted">{t('protection.right')}</span>
      {list.map((r) => {
        const single = r.keys[1] === null;
        const base = { symbol: r.symbol, description: t(r.desc), set };
        return (
          <div className="angle-row" key={r.symbol} role="group" aria-label={t(r.label)}>
            <span title={t(r.label)}>{r.symbol}</span>
            {single ? (
              <>
                {input(r.keys[0], t('protection.fieldName', base))}
                <span />
              </>
            ) : (
              <>
                {input(
                  r.keys[0],
                  t('protection.fieldNameSide', { ...base, side: t('sizing.left') }),
                )}
                {input(
                  r.keys[1],
                  t('protection.fieldNameSide', { ...base, side: t('sizing.right') }),
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
  const totalSet = t('protection.setTotal');
  const partialSet = t('protection.setPartial');

  return (
    <section className="step-panel" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>
        <span className="step-n">3</span>
        {t('protection.heading')}
      </h2>
      <div className="field">
        <span className="field-label">{t('protection.reference')}</span>
        <div
          className="segmented"
          role="radiogroup"
          aria-label={t('protection.reference')}
          onKeyDown={(e) => onRovingKeyDown(e, 'radio')}
        >
          {(['internal', 'external'] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              tabIndex={state.reference === r ? 0 : -1}
              aria-checked={state.reference === r}
              onClick={() => onChange({ ref: r === 'external' ? 'e' : '' })}
            >
              {t(r === 'internal' ? 'protection.internal' : 'protection.external')}
            </button>
          ))}
        </div>
        <p className="note">
          {t(
            state.reference === 'internal'
              ? 'protection.referenceHelpInternal'
              : 'protection.referenceHelpExternal',
          )}
        </p>
      </div>
      <h3 className="set-heading">
        <span className="swatch total" aria-hidden="true" />
        {t('protection.totalSet')}
      </h3>
      {grid(TOTAL.first, totalSet)}
      <p className="note">{t('protection.sidesHelp')}</p>
      <p className="note">{t('protection.totalHelp')}</p>
      {state.invalid.length > 0 && (
        <p className="error" role="alert">
          {t('protection.invalid')}
        </p>
      )}
      <details className="more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
        <summary>{t('protection.more')}</summary>
        <h3 className="sub-heading">{t('protection.index2')}</h3>
        {grid(TOTAL.second, totalSet)}
        <p className="note">{t('protection.index2Help')}</p>
        <h3 className="sub-heading">{t('protection.finTop')}</h3>
        {grid(TOTAL.finTop, totalSet)}
        <p className="note">{t('protection.finTopHelp')}</p>
        <p className="note">{t('protection.combinedHelp')}</p>
        <h3 className="sub-heading">
          <span className="swatch partial" aria-hidden="true" />
          {t('protection.partialSet')}
        </h3>
        <p className="note">{t('protection.partialHelp')}</p>
        {grid(PARTIAL.first, partialSet)}
        {grid(PARTIAL.second, partialSet)}
        {grid(PARTIAL.finTop, partialSet)}
        <h3 className="sub-heading">{t('draw.heading')}</h3>
        <DrawingControls
          drawn={state.drawn}
          drawing={drawing}
          onDrawingChange={onDrawingChange}
          onChange={onChange}
        />
      </details>
    </section>
  );
}
