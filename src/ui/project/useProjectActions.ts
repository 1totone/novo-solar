import { EpwParseError } from '../../core/epw/parseEpw';
import { readClimateFile, type LoadedFile } from '../data/climateFile';
import { decodeText } from '../data/readText';
import { epwErrorMessage } from '../epwErrorMessage';
import { downloadBlob, fileSlug } from '../export/image';
import type { PrintOptions } from '../export/printOptions';
import { useI18n } from '../i18n/useI18n';
import type { MessageKey } from '../i18n/i18n';
import type { HashState } from '../state/hashState';
import {
  parseProject,
  serializeProject,
  type ClimateFileEntry,
  type ProjectError,
} from '../state/projectFile';

export interface ProjectStatus {
  text: string;
  error: boolean;
}

const INVALID_FIELD: Record<Extract<ProjectError, { kind: 'invalid' }>['field'], MessageKey> = {
  schema: 'project.field.schema',
  state: 'project.field.state',
  climateFile: 'project.field.climateFile',
  compareClimateFile: 'project.field.compareClimateFile',
};

const entryOf = (f: LoadedFile): ClimateFileEntry => ({
  name: f.fileName,
  format: f.format,
  hours: f.hours,
  text: f.text,
  ...(f.location ? { location: f.location } : {}),
});

/**
 * Salvar, abrir e copiar o link (F4.7, spec 11). Abrir troca o '#' inteiro pelo do projeto e
 * recoloca na memória os arquivos climáticos e as opções de impressão.
 */
export function useProjectActions({
  hash,
  setHash,
  placeName,
  liveFile,
  compareFile,
  print,
  onOpened,
}: {
  hash: HashState;
  setHash: (patch: HashState) => void;
  placeName: string;
  /** Arquivo carregado que o estado usa (local = arquivo), ou null. */
  liveFile: LoadedFile | null;
  /** Arquivo da configuração A da comparação, quando ela usa um arquivo carregado. */
  compareFile: LoadedFile | null;
  print: PrintOptions;
  onOpened: (opened: {
    liveFile: LoadedFile | null;
    compareFile: LoadedFile | null;
    print: PrintOptions;
  }) => void;
}) {
  const { t, locale } = useI18n();

  const save = (): ProjectStatus => {
    const climateFile = liveFile ? entryOf(liveFile) : null;
    const compareClimateFile = compareFile
      ? compareFile === liveFile
        ? 'same'
        : entryOf(compareFile)
      : null;
    const text = serializeProject(
      { state: hash, print, climateFile, compareClimateFile },
      { version: __APP_VERSION__, commit: __BUILD_COMMIT__ },
      new Date().toISOString(),
    );
    const fileName = `solar-${fileSlug(placeName)}-projeto.json`;
    downloadBlob(new Blob([text], { type: 'application/json' }), fileName);
    return { text: t('project.saved', { file: fileName }), error: false };
  };

  const open = async (file: File): Promise<ProjectStatus> => {
    const result = parseProject(decodeText(await file.arrayBuffer()));
    if (!result.ok) {
      const e = result.error;
      const text =
        e.kind === 'notProject'
          ? t('project.notProject', { file: file.name })
          : e.kind === 'newer'
            ? t('project.newer', { file: file.name, schema: e.schema })
            : t('project.invalid', { file: file.name, field: t(INVALID_FIELD[e.field]) });
      return { text, error: true };
    }
    const p = result.project;
    const read = (c: ClimateFileEntry) => readClimateFile(c.name, c.format, c.text, c.location);
    let live: LoadedFile | null;
    let compare: LoadedFile | null;
    try {
      live = p.climateFile ? read(p.climateFile) : null;
      compare =
        p.compareClimateFile === 'same'
          ? live
          : p.compareClimateFile
            ? read(p.compareClimateFile)
            : null;
    } catch (err) {
      const detail = err instanceof EpwParseError ? epwErrorMessage(err, t) : String(err);
      return { text: t('project.climateError', { file: file.name, error: detail }), error: true };
    }
    onOpened({ liveFile: live, compareFile: compare, print: p.print });
    // O '#' passa a ser exatamente o do projeto: as chaves que não estão nele são apagadas.
    setHash({ ...Object.fromEntries(Object.keys(hash).map((k) => [k, ''])), ...p.state });
    const date = p.savedAt ? new Date(p.savedAt) : null;
    return {
      text: t('project.opened', {
        file: file.name,
        date:
          date && !Number.isNaN(date.getTime())
            ? new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(
                date,
              )
            : t('project.unknownDate'),
        climate: live ? t('project.openedClimate', { name: live.fileName }) : '',
      }),
      error: false,
    };
  };

  const copyLink = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch {
      return false;
    }
  };

  return { save, open, copyLink };
}
