const CACHE_NAME = 'taskflow-shell-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/habit.html',
  '/brain.html',
  '/english.html',
  '/schedule.html',
  '/settings.html',
  '/auth.html',
  '/auth.js',
  '/style.css',
  '/global-utils.css',
  '/global-utils.js',
  '/pwa.js',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
  '/offline.html'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  const request = event.request;
  const isNavigation = request.mode === 'navigate';
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && request.destination !== 'document') {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request).then(cached => {
      if (cached) return cached;
      return isNavigation ? caches.match('/offline.html') : Response.error();
    }))
  );
});
