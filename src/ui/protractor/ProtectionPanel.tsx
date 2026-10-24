import { useId } from 'react';
import { useI18n } from '../i18n/useI18n';
import type { MessageKey } from '../i18n/i18n';
import type { AngleKey, ProtractorState } from '../state/protractorHash';
import type { HashState } from '../state/hashState';

interface Row {
  label: MessageKey;
  symbol: string;
  keys: [AngleKey | null, AngleKey | null];
}

const ROWS_1: Row[] = [
  { label: 'protection.alpha', symbol: 'α', keys: ['a1', null] },
  { label: 'protection.beta', symbol: 'β', keys: ['be1', 'bd1'] },
  { label: 'protection.gamma', symbol: 'γ', keys: ['ge1', 'gd1'] },
];
const ROWS_2: Row[] = [
  { label: 'protection.alpha', symbol: 'α2', keys: ['a2', null] },
  { label: 'protection.beta', symbol: 'β2', keys: ['be2', 'bd2'] },
  { label: 'protection.gamma', symbol: 'γ2', keys: ['ge2', 'gd2'] },
];

export function ProtectionPanel({
  state,
  hash,
  onChange,
}: {
  state: ProtractorState;
  hash: HashState;
  onChange: (patch: Record<string, string>) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const hasIndex2 = ROWS_2.some((r) => r.keys.some((k) => k && hash[k]));

  const input = (k: AngleKey | null, rowLabel: string, side: string) => {
    if (!k) return <span />;
    const invalid = state.invalid.includes(k);
    return (
      <input
        type="text"
        inputMode="decimal"
        className="angle"
        aria-label={`${rowLabel} ${side}`.trim()}
        aria-invalid={invalid}
        data-testid={`angle-${k}`}
        value={hash[k] ?? ''}
        onChange={(e) => onChange({ [k]: e.target.value })}
      />
    );
  };

  const grid = (rows: Row[]) => (
    <div className="angle-grid">
      <span />
      <span className="muted">{t('protection.left')}</span>
      <span className="muted">{t('protection.right')}</span>
      {rows.map((r) => {
        const single = r.keys[1] === null;
        return (
          <div className="angle-row" key={r.symbol} role="group" aria-label={t(r.label)}>
            <span title={t(r.label)}>{r.symbol}</span>
            {single ? (
              <>
                {input(r.keys[0], r.symbol, '')}
                <span />
              </>
            ) : (
              <>
                {input(r.keys[0], r.symbol, t('protection.left'))}
                {input(r.keys[1], r.symbol, t('protection.right'))}
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="step-panel" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>
        <span className="step-n">3</span>
        {t('protection.heading')}
      </h2>
      <div className="field">
        <span className="field-label">{t('protection.reference')}</span>
        <div className="segmented" role="radiogroup" aria-label={t('protection.reference')}>
          {(['internal', 'external'] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
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
      {grid(ROWS_1)}
      <p className="note">{t('protection.sidesHelp')}</p>
      {state.invalid.length > 0 && (
        <p className="error" role="alert">
          {t('protection.invalid')}
        </p>
      )}
      <details className="more" open={hasIndex2}>
        <summary>{t('protection.index2')}</summary>
        {grid(ROWS_2)}
        <p className="note">{t('protection.index2Help')}</p>
      </details>
    </section>
  );
}
