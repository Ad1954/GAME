/**
 * new_Xreader - Main Application Bootstrap
 * Orchestrates TAG navigation, modular views, and event bus.
 */

import { storage } from './core/storage.js';
import { player } from './audio/playerFactory.js';
import { eventBus } from './eventBus.js';

import { CrawlerView } from './ui/crawlerView.js';
import { BookshelfView } from './ui/bookshelfView.js';
import { ReaderView } from './ui/readerView.js';
import { PlayerBarView } from './ui/playerBarView.js';
import { SettingsView } from './ui/settingsView.js';

class App {
  constructor() {
    this.crawlerView = new CrawlerView();
    this.bookshelfView = new BookshelfView();
    this.readerView = new ReaderView();
    this.playerBarView = new PlayerBarView();
    this.settingsView = new SettingsView();
    this.storage = storage;
    this.player = player;

    this.navTabs = document.querySelectorAll('.nav-tab');
    this.tabPanels = document.querySelectorAll('.tab-panel');
    this.toastContainer = document.getElementById('toast-container');
  }

  async init() {
    console.log('[App] Initializing new_Xreader...');

    // 1. Initialize DB
    await storage.init();

    // 2. Initialize Audio Engine
    await player.init();

    // 3. Initialize Views
    this.crawlerView.init();
    this.bookshelfView.init();
    this.readerView.init();
    this.playerBarView.init();
    this.settingsView.init();

    // 4. Setup Navigation & Toasts
    this.bindNavigation();
    this.bindToast();

    console.log('[App] new_Xreader ready!');
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

    // If switching to crawler tab, clear URL input per Story 1, GWT 1.1
    if (tabId === 'tab-crawler') {
      this.crawlerView.clearUrlInput();
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

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app;
  window.eventBus = eventBus;
  app.init().catch(err => {
    console.error('[App] Fatal initialization error:', err);
  });
});
