// Cria no GitHub as releases que constam do CHANGELOG.md e ainda não existem (decisão 0012).
// Cada release aponta para o commit da main que introduziu o cabeçalho da versão no CHANGELOG.
// Uso (no workflow .github/workflows/release.yml): node scripts/release.ts
// Requer: gh autenticado (GH_TOKEN com contents: write) e histórico completo do git.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseChangelog } from './changelog.ts';

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: 'utf-8' }).trim();
}

function releaseExists(tag: string): boolean {
  try {
    run('gh', ['release', 'view', tag, '--json', 'tagName']);
    return true;
  } catch {
    return false;
  }
}

const entries = parseChangelog(readFileSync('CHANGELOG.md', 'utf-8'));
// Da mais antiga para a mais nova, para a mais nova ficar como "latest".
for (const e of [...entries].reverse()) {
  if (releaseExists(e.tag)) {
    console.log(`${e.tag}: já existe`);
    continue;
  }
  const commit = run('git', [
    'log',
    '--reverse',
    '--format=%H',
    `-S${e.heading}`,
    '--',
    'CHANGELOG.md',
  ]).split('\n')[0];
  if (!commit) throw new Error(`Commit que introduziu "${e.heading}" não encontrado.`);
  const notesFile = join(tmpdir(), `notas-${e.tag}.md`);
  writeFileSync(notesFile, `${e.notes}\n`);
  const args = [
    'release',
    'create',
    e.tag,
    '--target',
    commit,
    '--title',
    e.title,
    '--notes-file',
    notesFile,
  ];
  if (e.prerelease) args.push('--prerelease');
  run('gh', args);
  console.log(`${e.tag}: criada em ${commit.slice(0, 7)}`);
}
