import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import {
  CacheFirst,
  StaleWhileRevalidate,
  NetworkOnly,
} from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

// self.__WB_MANIFEST is injected at build time
precacheAndRoute(self.__WB_MANIFEST)

// Cache static assets
registerRoute(
  ({ request }) =>
    ['style', 'script', 'worker', 'image'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-assets',
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
  ({ url }) => url.pathname.startsWith('/api/slots'),
  new StaleWhileRevalidate({
    cacheName: 'schedule-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Cache booking history
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/bookings/history'),
  new StaleWhileRevalidate({
    cacheName: 'booking-history-api',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
    fetchOptions: { credentials: 'include' },
  }),
  'GET',
)

// Cache profile data
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/users/me'),
  new StaleWhileRevalidate({
    cacheName: 'profile-api',
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
  async ({ event }) => {
    try {
      return await fetch(event.request)
    } catch {
      return await caches.match('/offline.html')
    }
  },
)

// Queue booking actions when offline
const bookingQueue = new BackgroundSyncPlugin('booking-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
})

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/bookings'),
  new NetworkOnly({
    fetchOptions: { credentials: 'include' },
    plugins: [bookingQueue],
  }),
  'POST',
)

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/bookings'),
  new NetworkOnly({
    fetchOptions: { credentials: 'include' },
    plugins: [bookingQueue],
  }),
  'PATCH',
)

