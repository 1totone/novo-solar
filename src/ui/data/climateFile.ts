import { parseEpw, type EpwData } from '../../core/epw/parseEpw';
import { parseSolar62, type Solar62Location } from '../../core/epw/parseSolar62';
import type { SelectedSite } from '../state/siteHash';

/** Arquivo climático carregado nesta sessão: não vai para a URL; vai no arquivo de projeto (F4.7). */
export interface LoadedFile {
  fileName: string;
  /** EPW, ou CSV do SOL-AR 6.2 importado pelo usuário. */
  format: 'epw' | 'csv';
  hours: number;
  hasLeapDay: boolean;
  comments: string[];
  /** Dados horários, só na memória do navegador (nada é enviado). */
  data: EpwData;
  /** Texto do arquivo como foi lido, para o arquivo de projeto. */
  text: string;
  /** Local digitado ao abrir um CSV do SOL-AR sem cabeçalho de local. */
  location?: Solar62Location;
}

/**
 * Lê um arquivo climático pelo leitor do passo 1 (EPW, ou CSV do SOL-AR com o local do cabeçalho
 * ou o digitado). Lança EpwParseError se o arquivo não puder ser lido.
 */
export function readClimateFile(
  fileName: string,
  format: 'epw' | 'csv',
  text: string,
  location?: Solar62Location,
): LoadedFile {
  const data = format === 'epw' ? parseEpw(text) : parseSolar62(text, location);
  return {
    fileName,
    format,
    hours: data.hours,
    hasLeapDay: data.hasLeapDay,
    comments: data.comments,
    data,
    text,
    ...(location ? { location } : {}),
  };
}

/** Local de um arquivo carregado, como o passo 1 o grava no link. */
export function fileSite(file: LoadedFile): SelectedSite {
  const loc = file.data.location;
  return {
    kind: 'file',
    site: {
      name: [loc.city, loc.state, loc.country].filter(Boolean).join(', '),
      latitude: loc.latitude,
      longitude: loc.longitude,
      timeZone: loc.timeZone,
      elevation: loc.elevation,
    },
  };
}
