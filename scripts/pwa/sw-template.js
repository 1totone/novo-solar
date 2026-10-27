/* Service worker do SOL-AR (F4.6, decisão 0031): a aplicação abre e funciona sem internet.
   O build (scripts/pwa/plugin.ts) preenche a versão e a lista dos arquivos da aplicação. Os dados
   históricos (CSV) ficam guardados no primeiro uso. */
const VERSION = __VERSION__;
const PRECACHE = __PRECACHE__;
const CACHE = `sol-ar-${VERSION}`;
const DATA = 'sol-ar-dados';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Versões anteriores da aplicação saem; os dados históricos ficam.
      for (const key of await caches.keys()) {
        if (key.startsWith('sol-ar-') && key !== CACHE && key !== DATA) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  // As prévias dos PRs (pr/<número>/) têm o próprio service worker.
  if (url.pathname.slice(scope.pathname.length).startsWith('pr/')) return;

  if (request.mode === 'navigate') {
    // A página: da rede quando há internet (versão nova), da cópia guardada quando não há.
    event.respondWith(
      fetch(request).catch(async () => {
        const cached =
          (await caches.match(scope.href)) ??
          (await caches.match(new URL('./index.html', scope).href));
        return cached ?? Response.error();
      }),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && url.pathname.endsWith('.csv')) {
        const cache = await caches.open(DATA);
        await cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
