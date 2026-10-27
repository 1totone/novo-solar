import { useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import type { ProjectStatus } from './useProjectActions';

/** Seção "Projeto" do passo 5 (F4.7, spec 11): salvar, abrir e copiar o link. */
export function ProjectSection({
  onSave,
  onOpen,
  onCopyLink,
  fileName,
  fileSizeMb,
}: {
  onSave: () => ProjectStatus;
  onOpen: (file: File) => Promise<ProjectStatus>;
  onCopyLink: () => Promise<boolean>;
  /** Arquivo climático carregado que vai no projeto, e o tamanho dele. */
  fileName: string | null;
  fileSizeMb: number | null;
}) {
  const { t, formatNumber } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);

  return (
    <div data-testid="project-section">
      <h3 className="sub-heading">{t('project.heading')}</h3>
      <div className="button-row">
        <button
          type="button"
          className="btn"
          data-testid="project-save"
          onClick={() => {
            setManualLink(null);
            setStatus(onSave());
          }}
        >
          {t('project.save')}
        </button>
        <button
          type="button"
          className="btn"
          data-testid="project-open"
          onClick={() => input.current?.click()}
        >
          {t('project.open')}
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="project-input"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setManualLink(null);
            setStatus(await onOpen(file));
          }}
        />
        <button
          type="button"
          className="btn"
          data-testid="copy-link"
          onClick={async () => {
            if (await onCopyLink()) {
              setManualLink(null);
              setStatus({ text: t('project.linkCopied'), error: false });
            } else {
              setManualLink(window.location.href);
              setStatus({ text: t('project.linkManual'), error: true });
            }
          }}
        >
          {t('project.copyLink')}
        </button>
      </div>
      <p className="note">
        {t('project.help')}{' '}
        {fileName &&
          fileSizeMb !== null &&
          t('project.helpFile', { file: fileName, size: formatNumber(fileSizeMb, 1) })}
      </p>
      {status && (
        <p
          className={status.error ? 'error' : 'note'}
          role={status.error ? 'alert' : 'status'}
          data-testid="project-status"
        >
          {status.text}
        </p>
      )}
      {manualLink && (
        <input
          className="manual-link"
          type="text"
          readOnly
          value={manualLink}
          aria-label={t('project.linkLabel')}
          onFocus={(e) => e.target.select()}
          data-testid="manual-link"
        />
      )}
    </div>
  );
}
