import { describe, expect, it } from 'vitest';
import { parseChangelog } from '../../scripts/changelog.ts';

const SAMPLE = `# Changelog

Texto de abertura.

## [Não lançado]

### Adicionado

- Algo ainda não lançado.

## [0.1.0] - 2026-10-24 (v0.1, Esqueleto funcional)

Portão 1 aprovado.

### Adicionado

- Carta solar.

## [0.0.0] - 2026-10-23 (v0.0, Fundação)

### Adicionado

- Fundação.
`;

describe('parseChangelog', () => {
  it('lê as versões lançadas, da mais nova para a mais antiga, sem a seção "Não lançado"', () => {
    const v = parseChangelog(SAMPLE);
    expect(v.map((x) => x.version)).toEqual(['0.1.0', '0.0.0']);
  });

  it('extrai tag, título, data, linha do cabeçalho e notas', () => {
    const [v01] = parseChangelog(SAMPLE);
    expect(v01).toEqual({
      version: '0.1.0',
      tag: 'v0.1.0',
      date: '2026-10-24',
      title: 'v0.1: Esqueleto funcional',
      heading: '## [0.1.0] - 2026-10-24 (v0.1, Esqueleto funcional)',
      notes: 'Portão 1 aprovado.\n\n### Adicionado\n\n- Carta solar.',
      prerelease: true,
    });
  });

  it('sem nome entre parênteses, o título é a tag', () => {
    const [v] = parseChangelog('## [1.2.3] - 2027-03-01\n\n- x\n');
    expect(v!.title).toBe('v1.2.3');
    expect(v!.prerelease).toBe(false);
  });

  it('o CHANGELOG do repositório é válido', async () => {
    const { readFileSync } = await import('node:fs');
    const v = parseChangelog(readFileSync(new URL('../../CHANGELOG.md', import.meta.url), 'utf-8'));
    expect(v.length).toBeGreaterThan(0);
    for (const x of v) expect(x.notes.length).toBeGreaterThan(0);
  });
});
