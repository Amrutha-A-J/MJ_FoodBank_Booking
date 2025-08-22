/**
 * Network-only service worker
 *
 * This service worker clears any existing caches and always serves requests
 * directly from the network. It intentionally avoids caching so the
 * application requires an active internet connection to function.
 */

self.addEventListener('install', () => {
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove any caches left over from previous versions
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always attempt a network request; no offline fallback
  event.respondWith(fetch(event.request));
});
