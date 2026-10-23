// Leitura do CHANGELOG.md (formato Keep a Changelog) para criar releases.

export interface ReleaseEntry {
  version: string;
  tag: string;
  date: string;
  title: string;
  /** Linha do cabeçalho, usada para achar o commit que lançou a versão. */
  heading: string;
  notes: string;
  /** Versões 0.x são pré-lançamentos (SemVer). */
  prerelease: boolean;
}

const HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})(?: \(([^,)]+)(?:, ([^)]+))?\))?\s*$/;

export function parseChangelog(text: string): ReleaseEntry[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: ReleaseEntry[] = [];
  let current: { entry: Omit<ReleaseEntry, 'notes'>; body: string[] } | null = null;
  const flush = () => {
    if (current) out.push({ ...current.entry, notes: current.body.join('\n').trim() });
    current = null;
  };
  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      const m = HEADING.exec(line);
      if (m) {
        const [, version, date, short, name] = m as unknown as [
          string,
          string,
          string,
          string?,
          string?,
        ];
        const tag = `v${version}`;
        current = {
          entry: {
            version,
            tag,
            date,
            title: name ? `${short}: ${name}` : tag,
            heading: line.trimEnd(),
            prerelease: version.startsWith('0.'),
          },
          body: [],
        };
      }
      continue;
    }
    current?.body.push(line);
  }
  flush();
  return out;
}
