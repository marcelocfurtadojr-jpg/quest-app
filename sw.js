// Service Worker do QUEST
//
// Estratégia (v2.0+): NETWORK-FIRST AGRESSIVO.
// Antes (v1.x) o SW segurava versão antiga do app em cache mesmo quando tinha
// versão nova na rede — bug clássico de "minhas mudanças não aparecem".
// Agora:
//   1. Toda request da mesma origem (HTML/JS/CSS/imagens) vai pra REDE primeiro,
//      com timeout de 3s. Se a rede responder, atualiza o cache e serve a versão
//      nova. Se a rede falhar OU passar do timeout, cai no cache (offline mode).
//   2. CDN (Tailwind/Google Fonts) continua stale-while-revalidate — esses arquivos
//      raramente mudam e queremos performance.
//   3. skipWaiting + clients.claim → SW novo toma controle imediatamente; o cliente
//      escuta 'controllerchange' (index.html) e recarrega sozinho.
//
// Resultado: se você está online, sempre vê a versão mais recente do app.
// Se você está offline, vê a última versão que foi cacheada (PWA mantém valor).

const CACHE_VERSION = 'vhyx-v2.5.0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION && k !== CACHE_VERSION + '-cdn').map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/** Race entre fetch e timeout. Resolve com a resposta da rede ou rejeita com
 *  Error('timeout') se passar do prazo. Não cancela o fetch — só ignora. */
function fetchWithTimeout(req, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    fetch(req).then((res) => { clearTimeout(t); resolve(res); }).catch((err) => { clearTimeout(t); reject(err); });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // CDNs: stale-while-revalidate. Performance importa, esses não mudam.
  const isCDN =
    url.origin.includes('cdn.tailwindcss.com') ||
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com');

  if (isCDN) {
    event.respondWith(
      caches.open(CACHE_VERSION + '-cdn').then(async (cache) => {
        const cached = await cache.match(req);
        const fetching = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetching;
      })
    );
    return;
  }

  // Cross-origin não-CDN (Firebase, etc): passa direto sem cachear.
  if (url.origin !== self.location.origin) {
    return; // browser default
  }

  // Mesma origem: NETWORK-FIRST com timeout. Versão nova SEMPRE ganha quando
  // a rede está disponível. Cache é fallback puro pra offline.
  event.respondWith((async () => {
    try {
      const res = await fetchWithTimeout(req, NETWORK_TIMEOUT_MS);
      if (res && res.ok) {
        // Atualiza cache em background (não bloqueia resposta)
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (err) {
      // Offline ou rede lenta → tenta cache
      const cached = await caches.match(req);
      if (cached) return cached;
      // Última tentativa pra navegações: serve index.html (SPA fallback)
      if (req.mode === 'navigate' || req.destination === 'document') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      // Sem cache nem shell — propaga erro pro browser mostrar offline padrão
      throw err;
    }
  })());
});
