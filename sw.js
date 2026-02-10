/* Simple Service Worker for GitHub Pages */

// NOTE: bump cache version on updates so installed apps pull the latest assets
const CACHE = 'ayed-step-intensive-2026-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './course.html',
  './seu-step.html',
  './bank-transfer.html',
  './register.html',
  './success.html',
  './assets/css/styles.css',
  './assets/js/config.js',
  './assets/js/app.js',
  './assets/js/utils.js',
  './assets/js/theme.js',
  './assets/js/counters.js',
  './assets/js/share.js',
  './assets/js/assistant.js',
  './assets/js/toasts.js',
  './assets/js/pwa.js',
  './assets/js/register.js',
  './assets/js/quiz-bank.js',
  './assets/img/logo.webp',
  './assets/img/founding-day-bg.webp',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // only cache same-origin
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fallback to offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // If GitHub Pages returns 404 (often happens when start_url/scope are wrong),
          // fall back to the app home instead of showing GitHub's 404 screen.
          if (res.status === 404) {
            return caches.match('./index.html');
          }

          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./offline.html'))
    );
    return;
  }

  // Static: cache first
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(()=>{});
        return res;
      });
    })
  );
});
