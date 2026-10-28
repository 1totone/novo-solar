import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Arquivos de public/ que a aplicação usa e que vão para a cópia guardada no navegador. */
const PUBLIC_FILES = [
  'index.html',
  'manifest.webmanifest',
  'favicon.svg',
  'icone-180.png',
  'icone-192.png',
  'icone-512.png',
  'icone-mascaravel-512.png',
];

/**
 * Gera o sw.js do build (F4.6, decisão 0031) a partir de scripts/pwa/sw-template.js, com a lista
 * dos arquivos da aplicação para guardar na instalação: os do bundle (sem os dados históricos em
 * CSV, guardados no primeiro uso, e sem os wireframes) e os de PUBLIC_FILES. Os caminhos são
 * relativos, como o resto do build portátil (decisão 0004).
 */
export function serviceWorker(version: string): Plugin {
  return {
    name: 'sol-ar-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter(
        (f) =>
          !f.endsWith('.csv') &&
          !f.endsWith('.map') &&
          !f.startsWith('wireframes/') &&
          f !== 'index.html',
      );
      const precache = ['./', ...[...files, ...PUBLIC_FILES].map((f) => `./${f}`)];
      const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf-8');
      const fill = (marker: string, value: string) => {
        if (!template.includes(marker)) throw new Error(`modelo do service worker sem ${marker}`);
        return value;
      };
      const source = template
        .replace(
          'const VERSION = __VERSION__;',
          fill('const VERSION = __VERSION__;', `const VERSION = ${JSON.stringify(version)};`),
        )
        .replace(
          'const PRECACHE = __PRECACHE__;',
          fill(
            'const PRECACHE = __PRECACHE__;',
            `const PRECACHE = ${JSON.stringify(precache, null, 2)};`,
          ),
        );
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
