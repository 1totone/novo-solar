import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

function gitCommit(): string {
  if (process.env.BUILD_COMMIT) return process.env.BUILD_COMMIT;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'desconhecido';
  }
}

// Build portátil: base relativa ('./'), para que a mesma pasta dist/ funcione no GitHub Pages,
// num subdomínio ou numa subpasta de qualquer servidor estático (decisão 0004).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // O Three.js da vista 3D (F3.7) é um bloco de cerca de 580 kB (145 kB comprimido), carregado
    // só quando a aba "Vista 3D" abre; o resto da aplicação fica abaixo de 500 kB.
    chunkSizeWarningLimit: 600,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_COMMIT__: JSON.stringify(gitCommit().slice(0, 7)),
    __BUILD_LABEL__: JSON.stringify(process.env.BUILD_LABEL ?? 'local'),
  },
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
  },
});
