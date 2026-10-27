/**
 * new_Xreader - Service Worker (Offline Cache & PWA Support)
 * Employs Stale-While-Revalidate / Network-First with Cache Fallback for zero-network reading.
 */

const CACHE_NAME = 'xreader-offline-v1.2';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './css/main.css?v=9.6',
  './css/tabs.css?v=9.6',
  './css/crawler.css?v=9.6',
  './css/bookshelf.css?v=9.6',
  './css/reader.css?v=9.6',
  './css/modal.css?v=9.7',
  './js/app.js?v=9.6',
  './js/eventBus.js',
  './js/audio/playerFactory.js',
  './js/audio/silentAudioData.js',
  './js/audio/sleepTimer.js',
  './js/audio/players/iosPlayer.js',
  './js/audio/players/pcPlayer.js',
  './js/core/bahaCrawler.js',
  './js/core/crawler.js',
  './js/core/downloadQueue.js',
  './js/core/logger.js',
  './js/core/segmenter.js',
  './js/core/storage.js',
  './js/core/txtParser.js',
  './js/ui/bookshelfView.js',
  './js/ui/chapterManagerView.js',
  './js/ui/contentEditModal.js',
  './js/ui/crawlerView.js',
  './js/ui/playerBarView.js',
  './js/ui/readerView.js',
  './js/ui/settingsView.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core offline assets');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] Some precache assets failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 忽略非 GET 請求、本機代理端點、日誌 API
  if (event.request.method !== 'GET' || url.pathname.includes('/proxy') || url.pathname.includes('/api/')) {
    return;
  }

  // Network-First with Cache Fallback 策略：
  // 有網路時即時獲取最新資源並更新快取；無網路時（飛航模式/斷網）自動從本機快取渲染
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 網路中斷時從本機快取提供
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 若請求頁面失敗且無精確匹配，回退至首頁 index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
