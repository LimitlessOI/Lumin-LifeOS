/**
 * LifeOS Service Worker
 * Provides offline shell + background sync for the PWA.
 *
 * Strategy:
 * - App shell (HTML, CSS, JS, manifest) — cache-first, update in background
 * - API calls (/api/) — network-first, fallback to offline placeholder
 * - Everything else — network-first, no fallback
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const CACHE_NAME   = 'lifeos-v1';
const OFFLINE_URL  = '/overlay/lifeos-app.html';

// App shell files to pre-cache on install
const PRECACHE = [
  '/overlay/lifeos-app.html',
  '/overlay/lifeos-login.html',
  '/overlay/lifeos-today.html',
  '/overlay/lifeos-mirror.html',
  '/overlay/lifeos-quick-entry.html',
  '/overlay/lifeos-bootstrap.js',
  '/overlay/manifest.json',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting(); // activate immediately — don't wait for old SW to retire
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim(); // take control of all open tabs immediately
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // API calls — network-first, serve offline JSON stub on failure
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // App shell / static assets — cache-first, then network, cache the response
  event.respondWith(cacheFirstWithUpdate(request));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirstWithUpdate(request) {
  const cache    = await caches.open(CACHE_NAME);
  const cached   = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise || offlineShell();
}

async function networkFirstAPI(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Return a structured offline response so the UI can handle it gracefully
    return new Response(
      JSON.stringify({ ok: false, offline: true, error: 'You are offline. This action will be available when reconnected.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function offlineShell() {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(OFFLINE_URL);
}

// ── Background Sync (queue notifications while offline) ───────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'lifeos-sync-queue') {
    event.waitUntil(flushSyncQueue());
  }
});

async function flushSyncQueue() {
  // The sync queue is stored in IndexedDB by lifeos-bootstrap.js
  // when the user performs an action while offline (e.g. quick-entry note).
  // On reconnect, this fires and replays those requests.
  try {
    const db = await openSyncDB();
    const items = await getAllItems(db);
    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        await deleteItem(db, item.id);
      } catch {
        // leave in queue, will retry on next sync
      }
    }
  } catch {
    // IndexedDB not available — skip
  }
}

// ── IndexedDB helpers for sync queue ─────────────────────────────────────────

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('lifeos-sync', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

function getAllItems(db) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('queue', 'readonly');
    const req = tx.objectStore('queue').getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function deleteItem(db, id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('queue', 'readwrite');
    const req = tx.objectStore('queue').delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch { data = { title: 'LifeOS', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'LifeOS', {
      body:    data.body   || '',
      icon:    data.icon   || '/overlay/icons/icon-192.png',
      badge:   data.badge  || '/overlay/icons/icon-192.png',
      tag:     data.tag    || 'lifeos-notification',
      data:    data.url    ? { url: data.url } : {},
      actions: data.actions || [],
      vibrate: [200, 100, 200],
      requireInteraction: data.priority >= 3 ? true : false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/overlay/lifeos-app.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
