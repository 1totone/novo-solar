import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { I18nProvider } from './ui/i18n/I18nProvider';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

// Instalável e sem internet (F4.6, decisão 0031): o service worker guarda a aplicação no navegador.
// Só no build de produção; nada sai do navegador.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Sem service worker (navegador antigo, modo privado), a aplicação só não funciona offline.
    });
  });
}

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
