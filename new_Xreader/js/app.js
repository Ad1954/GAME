/**
 * new_Xreader - Main Application Bootstrap
 * Orchestrates TAG navigation, modular views, and event bus.
 */

import { storage } from './core/storage.js';
import { player, currentPlatform } from './audio/playerFactory.js';
import { crawler, diffOnlineChapters } from './core/crawler.js';
import { eventBus } from './eventBus.js';
import { logger } from './core/logger.js';

import { CrawlerView } from './ui/crawlerView.js';
import { BookshelfView } from './ui/bookshelfView.js';
import { ReaderView } from './ui/readerView.js';
import { PlayerBarView } from './ui/playerBarView.js';
import { SettingsView } from './ui/settingsView.js';
import { ChapterManagerView } from './ui/chapterManagerView.js';
import { ContentEditModal } from './ui/contentEditModal.js';

class App {
  constructor() {
    this.crawlerView = new CrawlerView();
    this.bookshelfView = new BookshelfView();
    this.readerView = new ReaderView();
    this.playerBarView = new PlayerBarView();
    this.settingsView = new SettingsView();
    this.chapterManagerView = new ChapterManagerView();
    this.contentEditModal = new ContentEditModal();
    this.storage = storage;
    this.player = player;
    this.crawler = crawler;
    this.diffOnlineChapters = diffOnlineChapters;

    this.navTabs = document.querySelectorAll('.nav-tab');
    this.tabPanels = document.querySelectorAll('.tab-panel');
    this.toastContainer = document.getElementById('toast-container');
  }

  async init() {
    const t0 = performance.now();
    console.log('[App] Initializing new_Xreader...');

    // 0. Initialize Logger & Platform Class
    logger.init();
    const platClass = `platform-${currentPlatform.toLowerCase()}`;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add(platClass);
      document.body.classList.add(platClass);
    }

    // 1. MUST bind navigation and toasts immediately (0ms) so UI is fully responsive!
    this.bindNavigation();
    this.bindToast();
    logger.info('Navigation', `頂部導航已即時綁定 (${(performance.now() - t0).toFixed(1)}ms)`);

    // 2. Initialize Views (DOM structure & UI listeners) with safe isolation
    const safeInit = (name, view) => {
      try {
        if (view && typeof view.init === 'function') view.init();
      } catch (e) {
        console.error(`[App] Error in ${name}.init:`, e);
        logger.error('App', `視圖 ${name} 初始化異常: ${e.message}`);
      }
    };

    safeInit('crawlerView', this.crawlerView);
    safeInit('bookshelfView', this.bookshelfView);
    safeInit('readerView', this.readerView);
    safeInit('playerBarView', this.playerBarView);
    safeInit('settingsView', this.settingsView);
    safeInit('chapterManagerView', this.chapterManagerView);
    safeInit('contentEditModal', this.contentEditModal);

    // 3. Connect to IndexedDB and Audio asynchronously without blocking UI interaction
    storage.init().then(() => {
      const elapsed = (performance.now() - t0).toFixed(1);
      logger.info('Storage', `IndexedDB 資料庫就緒 (${elapsed}ms)`);
      if (this.bookshelfView) this.bookshelfView.loadBooks();
      if (this.crawlerView) this.crawlerView.renderCrawlerRecords();
    }).catch(err => {
      console.error('[App] Storage initialization error:', err);
      logger.error('Storage', `IndexedDB 初始化失敗: ${err.message}`);
    });

    player.init().then(() => {
      const elapsed = (performance.now() - t0).toFixed(1);
      logger.info('Audio', `語音引擎就緒 (${elapsed}ms)`);
    }).catch(err => {
      console.error('[App] Player initialization error:', err);
    });

    console.log(`[App] new_Xreader ready in ${(performance.now() - t0).toFixed(1)}ms!`);
  }

  bindNavigation() {
    this.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;
        this.switchTab(targetId);
      });
    });

    eventBus.on('nav:switchTab', (tabId) => this.switchTab(tabId));
  }

  switchTab(tabId) {
    this.navTabs.forEach(t => {
      if (t.dataset.tab === tabId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    this.tabPanels.forEach(p => {
      if (p.id === tabId) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    logger.info('Navigation', `切換分頁至: ${tabId}`);

    // If switching to crawler tab, clear URL input per Story 1, GWT 1.1 and refresh options
    try {
      if (tabId === 'tab-crawler' && this.crawlerView) {
        this.crawlerView.clearUrlInput();
        this.crawlerView.renderCategoryOptions();
        this.crawlerView.renderCrawlerRecords();
      } else if (tabId === 'tab-bookshelf' && this.bookshelfView) {
        this.bookshelfView.loadBooks();
      }
    } catch (err) {
      console.error(`[App] Error in switchTab hooks for ${tabId}:`, err);
    }
  }

  bindToast() {
    eventBus.on('toast', ({ message, actionLabel, onAction }) => {
      if (!this.toastContainer) return;

      const toast = document.createElement('div');
      toast.className = 'toast-item';

      const msgSpan = document.createElement('span');
      msgSpan.textContent = message;
      toast.appendChild(msgSpan);

      if (actionLabel && onAction) {
        const actionBtn = document.createElement('button');
        actionBtn.className = 'toast-action-btn';
        actionBtn.textContent = actionLabel;
        actionBtn.addEventListener('click', () => {
          onAction();
          toast.remove();
        });
        toast.appendChild(actionBtn);
      }

      this.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, 4000);
    });
  }
}

function startApp() {
  const app = new App();
  window.app = app;
  window.eventBus = eventBus;
  app.init().catch(err => {
    console.error('[App] Fatal initialization error:', err);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
