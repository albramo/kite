/*
 * Service Worker - Cache Assets for Faster Return Visits
 * Caches: logo, favicon, fonts, CSS, JS, and images
 */

const CACHE_NAME = 'theme-cache-v1';
const PRECACHE_URLS = [];

// Install: pre-cache critical assets passed from the page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Ignore individual failures - some assets may not exist yet
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-GET requests and Chrome extensions
  if (!url.protocol.startsWith('http')) return;

  // Cache strategy: Cache First for static assets, Network First for pages
  const isStaticAsset =
    url.pathname.includes('/assets/') ||
    url.pathname.includes('/files/') ||
    url.hostname.includes('cdn.shopify.com') ||
    url.hostname.includes('fonts.shopifycdn.com') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp');

  if (isStaticAsset) {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Don't cache bad responses
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cache the new response
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // If both cache and network fail, return a fallback for images
          if (event.request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#eee" width="200" height="200"/></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
        });
      })
    );
  } else {
    // Network-first strategy for HTML pages
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

// Listen for messages from the main page to pre-cache specific URLs
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRECACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME).then((cache) => {
      urls.forEach((url) => {
        fetch(url, { mode: 'no-cors' }).then((response) => {
          if (response) {
            cache.put(url, response);
          }
        }).catch(() => {});
      });
    });
  }
});
