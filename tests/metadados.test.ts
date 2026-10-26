// Metadados de citação (F4.10, preparação): CITATION.cff e .zenodo.json coerentes com o
// package.json, a licença e os créditos da versão original (CLAUDE.md, "Nunca").
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, 'utf-8');
const pkg = JSON.parse(read('package.json')) as { version: string; license: string };
const cff = read('CITATION.cff');
const zenodo = JSON.parse(read('.zenodo.json')) as {
  upload_type: string;
  license: string;
  creators: { name: string }[];
  contributors: { name: string }[];
  description: string;
};

describe('metadados de citação', () => {
  it('CITATION.cff: versão do package.json, licença MIT e repositório', () => {
    expect(cff).toMatch(/^cff-version: 1\.2\.0$/m);
    expect(cff).toMatch(new RegExp(`^version: ['"]${pkg.version.replace(/\./g, '\\.')}['"]$`, 'm'));
    expect(cff).toMatch(/^license: MIT$/m);
    expect(pkg.license).toBe('MIT');
    expect(read('LICENSE')).toMatch(/^MIT License/);
    expect(cff).toMatch(/^repository-code: ['"]https:\/\/github\.com\/1totone\/novo-solar['"]$/m);
  });

  it('autor da nova versão e créditos da versão original nos dois arquivos', () => {
    expect(cff).toMatch(/family-names: Aliardi\n\s+given-names: Anthony/);
    for (const [family, given] of [
      ['Lamberts', 'Roberto'],
      ['Maciel', 'Alexandra Albuquerque'],
      ['Ono', 'Edson T.'],
    ] as const) {
      expect(cff).toContain(`family-names: ${family}\n        given-names: ${given}`);
      expect(zenodo.contributors.map((c) => c.name)).toContain(`${family}, ${given}`);
    }
    expect(zenodo.creators.map((c) => c.name)).toEqual(['Aliardi, Anthony']);
    expect(zenodo.description).toContain('Roberto Lamberts e Alexandra Albuquerque Maciel');
    expect(zenodo.description).toContain('Edson T. Ono');
  });

  it('.zenodo.json: software com licença MIT', () => {
    expect(zenodo.upload_type).toBe('software');
    expect(zenodo.license).toBe('MIT');
  });
});
