const CACHE_NAME = 'cohana-cache-v6.5H2';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/api.js',
  '/js/live.js',
  '/js/ui-core.js',
  '/js/ui-render.js',
  '/js/logic.js',
  'IMG_6101.png',
  'logo.png',
  // External resources for better offline reliability
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js',
  'https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js'
];

// Event: Install
// Caches the core assets of the application.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      console.log('Service Worker: Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );
});

// Event: Activate
// Cleans up old caches and claims control of the page immediately.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Vital for the update flow: ensures the new SW takes control immediately
      return self.clients.claim();
    })
  );
});

// Event: Fetch
// Serves assets from the cache first for an offline-first approach.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      // If the request is in the cache, return it.
      if (response) {
        return response;
      }
      // Otherwise, fetch it from the network.
      return fetch(event.request);
    })
  );
});

// Event: Message
// Listens for the "skipWaiting" message sent from the frontend "Update" button
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});