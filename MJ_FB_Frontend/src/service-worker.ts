/// <reference lib="webworker" />
import {
  precacheAndRoute,
  type PrecacheEntry as ManifestEntry,
} from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import {
  CacheFirst,
  StaleWhileRevalidate,
  NetworkOnly,
  NetworkFirst,
} from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { clientsClaim } from 'workbox-core'

declare const __BUILD_VERSION__: string

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: ManifestEntry[]
}

// self.__WB_MANIFEST is injected at build time
precacheAndRoute(self.__WB_MANIFEST)

const CACHE_VERSION = typeof __BUILD_VERSION__ === 'string' ? __BUILD_VERSION__ : 'dev'

const DEPRECATED_RUNTIME_CACHE_PREFIXES = [
  'booking-history-api',
  'volunteer-bookings-api',
]

const RUNTIME_CACHE_PREFIXES = [
  'static-assets',
  'schedule-api',
  'profile-api',
  'warehouse-settings-api',
  'notifications-api',
  'app-config-api',
  'booking-history-network-api',
  'volunteer-bookings-network-api',
]

const ALL_RUNTIME_CACHE_PREFIXES = [
  ...RUNTIME_CACHE_PREFIXES,
  ...DEPRECATED_RUNTIME_CACHE_PREFIXES,
]

const versionedCacheName = (name: string) => `${name}-v${CACHE_VERSION}`

const CURRENT_RUNTIME_CACHES = new Set(
  RUNTIME_CACHE_PREFIXES.map((prefix) => versionedCacheName(prefix)),
)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()
      await Promise.all(
        cacheKeys
          .filter((cacheName) =>
            ALL_RUNTIME_CACHE_PREFIXES.some((prefix) =>
              cacheName.startsWith(prefix),
            ),
          )
          .filter((cacheName) => !CURRENT_RUNTIME_CACHES.has(cacheName))
          .map((cacheName) => caches.delete(cacheName)),
      )
      clientsClaim()
    })(),
  )
})

// Cache static assets
registerRoute(
  ({ request }) =>
    ['style', 'script', 'worker', 'image'].includes(request.destination),
  new CacheFirst({
    cacheName: versionedCacheName('static-assets'),
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
)

// Cache schedule-related API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/slots'),
  new StaleWhileRevalidate({
    cacheName: versionedCacheName('schedule-api'),
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Cache booking history
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/bookings/history'),
  new NetworkFirst({
    cacheName: versionedCacheName('booking-history-network-api'),
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Cache profile data
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/users/me'),
  new StaleWhileRevalidate({
    cacheName: versionedCacheName('profile-api'),
    plugins: [
      new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Cache warehouse settings
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/warehouse-settings'),
  new StaleWhileRevalidate({
    cacheName: versionedCacheName('warehouse-settings-api'),
    plugins: [
      new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Cache volunteer booking data
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/volunteer-bookings'),
  new NetworkFirst({
    cacheName: versionedCacheName('volunteer-bookings-network-api'),
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Cache notifications
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/users/me/notifications'),
  new StaleWhileRevalidate({
    cacheName: versionedCacheName('notifications-api'),
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Cache app config
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/app-config'),
  new StaleWhileRevalidate({
    cacheName: versionedCacheName('app-config-api'),
    plugins: [
      new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Offline fallback for navigation requests
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ request }) => {
    try {
      return await fetch(request)
    } catch {
      return (await caches.match('/offline.html')) || Response.error()
    }
  },
)

// Queue booking actions when offline
const bookingQueue = new BackgroundSyncPlugin('booking-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
})

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/bookings'),
  new NetworkOnly({
    fetchOptions: { credentials: 'include' },
    plugins: [bookingQueue],
  }),
  'POST',
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/bookings'),
  new NetworkOnly({
    fetchOptions: { credentials: 'include' },
    plugins: [bookingQueue],
  }),
  'PATCH',
)

const volunteerBookingQueue = new BackgroundSyncPlugin('volunteer-booking-queue', {
  maxRetentionTime: 24 * 60,
})

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/volunteer-bookings'),
  new NetworkOnly({
    fetchOptions: { credentials: 'include' },
    plugins: [volunteerBookingQueue],
  }),
  'POST',
)

