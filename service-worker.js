/**
 * Find My Item — Service Worker
 * Cache-first for app shell, network-first for nav, stale-while-revalidate for assets.
 */
const CACHE_VERSION = 'v3';
const APP_SHELL_CACHE = 'fmi-shell-' + CACHE_VERSION;
const STATIC_CACHE = 'fmi-static-' + CACHE_VERSION;
const CDN_CACHE = 'fmi-cdn-' + CACHE_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', function(event) {
  console.log('[SW] Install — caching app shell');
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return caches.open(CDN_CACHE).then(function(cache) {
        return Promise.allSettled(
          CDN_URLS.map(function(url) {
            return fetch(url, { mode: 'no-cors' }).then(function(resp) {
              if (resp.ok || resp.type === 'opaque') {
                return cache.put(url, resp);
              }
            }).catch(function() {
              console.warn('[SW] CDN pre-cache failed (will retry on use):', url);
            });
          })
        );
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Activate — cleaning old caches');
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) {
          return k.startsWith('fmi-') &&
                 k !== APP_SHELL_CACHE &&
                 k !== STATIC_CACHE &&
                 k !== CDN_CACHE;
        }).map(function(k) {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // CDN resources: cache-first (or stale-while-revalidate if already cached)
  if (CDN_URLS.some(function(cdn) { return url.href.startsWith(cdn) || url.href.replace(/@[\d.]+/g, '').startsWith(cdn.replace(/@[\d.]+/g, '')); })) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        var fetchPromise = fetch(event.request).then(function(netResp) {
          if (netResp && netResp.status === 200) {
            var clone = netResp.clone();
            caches.open(CDN_CACHE).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return netResp;
        }).catch(function() {
          return cached;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // App shell files: cache-first
  if (APP_SHELL.some(function(s) { return url.pathname.endsWith(s.replace('./', '')); })) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(netResp) {
          if (netResp && netResp.status === 200) {
            var clone = netResp.clone();
            caches.open(APP_SHELL_CACHE).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return netResp;
        });
      })
    );
    return;
  }

  // Navigation requests (HTML): network-first, fallback to cached index
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match('./index.html').then(function(cached) {
          if (cached) return cached;
          return caches.match('./').then(function(root) {
            return root || new Response('Offline — please connect to the internet.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        });
      })
    );
    return;
  }

  // All other static assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var fetchPromise = fetch(event.request).then(function(netResp) {
        if (netResp && netResp.status === 200) {
          var clone = netResp.clone();
          caches.open(STATIC_CACHE).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return netResp;
      }).catch(function() {
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
