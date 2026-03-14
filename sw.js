self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('healthmate-store').then((cache) => cache.addAll([
      '/',
      '/index.html',
      '/assets/icon.png',
      '/assets/splash.png'
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});