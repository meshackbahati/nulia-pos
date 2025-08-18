importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js'
);

const { registerRoute } = workbox.routing;
const { CacheFirst, StaleWhileRevalidate, NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { precacheAndRoute } = workbox.precaching;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { BackgroundSyncPlugin } = workbox.backgroundSync;

// Enable debug mode during development
workbox.setConfig({ debug: false });

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache static assets with CacheFirst strategy
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache API responses with NetworkFirst strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5, // Fall back to cache if network doesn't respond in 5s
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Background sync for failed requests
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
      } catch (error) {
        // Put the entry back in the queue and re-throw the error
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Handle POST requests with background sync
registerRoute(
  ({ url, method }) => 
    method === 'POST' && 
    (url.pathname.startsWith('/api/sales') || 
     url.pathname.startsWith('/api/inventory')),
  new NetworkFirst({
    cacheName: 'api-requests',
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Serve offline page when offline
const networkFirst = new NetworkFirst({
  cacheName: 'offline-fallback',
  plugins: [
    new ExpirationPlugin({
      maxEntries: 1,
    }),
  ],
});

const FALLBACK_HTML_URL = '/offline.html';

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For navigation requests, try the network first, then cache, then offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await networkFirst.handle({ event });
          return response || caches.match(FALLBACK_HTML_URL);
        } catch (error) {
          return caches.match(FALLBACK_HTML_URL);
        }
      })()
    );
  }
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== 'static-assets' && cacheName !== 'api-cache') {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'New update';
  const options = {
    body: data.body || 'You have new updates',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
