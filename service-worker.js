const CACHE_NAME = 'noki-v5-secure';
const NK_DOMAIN = 'nokimet.netlify.app';
const NK_ALLOWED_ORIGINS = [
  'localhost',
  '127.0.0.1',
  'nokimet.netlify.app',
  'nokimetrics.com',
  'www.nokimetrics.com'
];

// ===================== INSTALLATION =====================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/icon-192.png',
        '/icon-512.png',
        '/badge.png',
        'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
      ]);
    })
  );
  self.skipWaiting();
});

// ===================== ACTIVATION =====================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ===================== FETCH =====================
self.addEventListener('fetch', event => {
  // Stratégie Network First pour les pages HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Cache First pour les assets statiques
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      });
    })
  );
});

// ===================== GESTION DES NOTIFICATIONS =====================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const nokiClient = clientList.find(client => {
        try {
          const clientUrl = new URL(client.url);
          return NK_ALLOWED_ORIGINS.includes(clientUrl.hostname) || 
                 NK_ALLOWED_ORIGINS.some(origin => clientUrl.hostname.endsWith('.' + origin));
        } catch(e) { return false; }
      });
      
      if (nokiClient) {
        nokiClient.navigate(targetUrl);
        return nokiClient.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('push', event => {
  if (event.data) {
    try {
      const data = event.data.json();
      event.waitUntil(
        self.registration.showNotification(data.title, {
          body: data.body,
          icon: '/icon-192.png',
          badge: '/badge.png',
          vibrate: [200, 100, 200],
          data: { url: data.url || '/' },
          ...data.options
        })
      );
    } catch(e) {
      console.log('Push notification error:', e);
    }
  }
});