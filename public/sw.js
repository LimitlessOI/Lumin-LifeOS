/**
 * LifeOS Service Worker
 *
 * Enables PWA install on iOS, Android, and desktop.
 * Strategy: network-only for API; stale-while-revalidate for a small shell list.
 * Operator overlays (e.g. ClientCare billing) bypass the SW entirely — caching
 * there hid fresh HTML/JS after deploy (symptom: “no insurance card upload”).
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

const CACHE_NAME = 'lifeos-shell-v3';

// The app shell — files that make the UI work offline
const SHELL_FILES = [
  '/lifeos',
  '/overlay/lifeos-app.html',
  '/overlay/lifeos-today.html',
  '/lifeos-today.html',
  '/overlay/lifeos.webmanifest',
  '/overlay/icons/icon-192.png',
  '/overlay/icons/icon-512.png',
  '/manifest.json',
];

// ── Install: cache the shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best-effort — don't fail install if a page isn't cached yet
      return Promise.allSettled(
        SHELL_FILES.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy ────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: always network, never cache
  if (url.pathname.startsWith('/api/')) {
    return; // let browser handle normally
  }

  // High-churn operator HTML/JS: never intercept — stale cache mimics “deploy didn’t work”
  if (url.pathname === '/clientcare-billing' || url.pathname.startsWith('/clientcare-billing/')) {
    return;
  }

  // UI shell: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline fallback

      return cached || networkFetch;
    })
  );
});
