import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import base from './vite.config.ts';

// Página do teste do F2.9 sem moderador (decisão 0042), num build próprio em dist/teste/.
// Separado do build da aplicação para que este não mude em nada (nem um pedaço compartilhado):
// o teste mede a ferramenta exatamente como ela está na main. Herda a base relativa e as
// constantes da versão, mas nenhum plugin: a página é TypeScript sem React e não tem service
// worker próprio.
export default defineConfig({
  ...base,
  plugins: [],
  root: fileURLToPath(new URL('./teste', import.meta.url)),
  publicDir: false,
  build: {
    outDir: fileURLToPath(new URL('./dist/teste', import.meta.url)),
    emptyOutDir: false,
  },
});
