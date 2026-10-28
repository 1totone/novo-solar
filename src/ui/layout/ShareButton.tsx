import { useId, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';

/**
 * "Compartilhar" no cabeçalho (decisão 0049, item i da 0044; problema 10 do piloto do F2.9): copia
 * o endereço, que guarda a análise depois do "#", e diz o que ele reabre e o que não vai nele. O
 * endereço fica à vista, para conferir e copiar à mão quando o navegador não deixa copiar.
 */
export function ShareButton({ hasFile }: { hasFile: boolean }) {
  const { t } = useI18n();
  const id = useId();
  const [shared, setShared] = useState<{ link: string; copied: boolean } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  // Ao fechar, o foco volta ao botão (e não para o começo da página).
  const close = () => {
    setShared(null);
    button.current?.focus();
  };

  const share = async () => {
    const link = window.location.href;
    // Fora de HTTPS, `navigator.clipboard` nem existe: o erro vira "não copiou".
    const copied = await Promise.resolve()
      .then(() => navigator.clipboard.writeText(link))
      .then(
        () => true,
        () => false,
      );
    setShared({ link, copied });
  };

  return (
    <>
      <button
        type="button"
        className="btn"
        aria-expanded={shared !== null}
        aria-controls={`${id}-panel`}
        data-testid="share"
        ref={button}
        onClick={share}
      >
        {t('share.button')}
      </button>
      {shared && (
        <div
          className="share-panel"
          id={`${id}-panel`}
          data-testid="share-panel"
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
        >
          <p role={shared.copied ? 'status' : 'alert'} className={shared.copied ? 'note' : 'error'}>
            {t(shared.copied ? 'share.copied' : 'share.manual')}
          </p>
          <p className="note">
            {t('share.how')} {hasFile && t('share.file')}
          </p>
          <label className="field-label" htmlFor={`${id}-link`}>
            {t('share.label')}
          </label>
          <input
            id={`${id}-link`}
            className="manual-link"
            type="text"
            readOnly
            value={shared.link}
            onFocus={(e) => e.target.select()}
            data-testid="share-link"
          />
          <p>
            <button type="button" className="btn small" onClick={close}>
              {t('share.close')}
            </button>
          </p>
        </div>
      )}
    </>
  );
}
