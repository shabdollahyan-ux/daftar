// دفتر بدهی‌ها — Service Worker
// نسخه cache را هر بار که فایل‌ها تغییر کنند بالا ببرید
const CACHE_NAME = 'daftar-bedahi-v1';

const CORE_FILES = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // فونت از گوگل — اگر آفلاین بود، مرورگر از فونت سیستم استفاده می‌کند
];

// نصب: فایل‌های اصلی را cache می‌کند
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll با خطا کامل می‌شکند؛ هر فایل را جداگانه cache می‌کنیم
      // تا اگر فونت آنلاین نبود، بقیه فایل‌ها cache شوند
      return Promise.allSettled(
        CORE_FILES.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Could not cache:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// فعال‌سازی: cache قدیمی را پاک می‌کند
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// درخواست‌ها: اول از cache، اگر نبود از شبکه
self.addEventListener('fetch', event => {
  // فقط GET و همان origin را مدیریت می‌کند
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // درخواست‌های خارجی (CDN فونت) را cache-then-network می‌کند
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // فونت آفلاین: پاسخ خالی — مرورگر از فونت جایگزین استفاده می‌کند
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // فایل‌های اصلی: Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // آفلاین و در cache نیست — index.html را برمی‌گردانیم
        return caches.match('./index.html');
      });
    })
  );
});
