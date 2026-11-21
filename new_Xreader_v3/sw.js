/**
 * new_Xreader - Service Worker (Offline Cache & PWA Support)
 * Employs Stale-While-Revalidate / Network-First with Cache Fallback for zero-network reading.
 */

const CACHE_NAME = 'xreader-offline-v9.23';

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
  './css/modal.css?v=9.11',
  './js/app.js?v=9.23',
  './js/eventBus.js?v=9.23',
  './js/audio/playerFactory.js?v=9.23',
  './js/audio/silentAudioData.js?v=9.23',
  './js/audio/sleepTimer.js?v=9.23',
  './js/audio/players/iosPlayer.js?v=9.23',
  './js/audio/players/iosPlayerV2.js?v=9.23',
  './js/audio/players/pcPlayer.js?v=9.23',
  './js/core/bahaCrawler.js?v=9.23',
  './js/core/crawler.js?v=9.23',
  './js/core/downloadQueue.js?v=9.23',
  './js/core/logger.js?v=9.23',
  './js/core/segmenter.js?v=9.23',
  './js/core/storage.js?v=9.23',
  './js/core/txtParser.js?v=9.23',
  './js/ui/bookshelfView.js?v=9.23',
  './js/ui/chapterManagerView.js?v=9.23',
  './js/ui/contentEditModal.js?v=9.23',
  './js/ui/crawlerView.js?v=9.23',
  './js/ui/playerBarView.js?v=9.23',
  './js/ui/readerView.js?v=9.23',
  './js/ui/settingsView.js?v=9.23'
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
