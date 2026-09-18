/**
 * new_Xreader - CrawlerView (Story 1, Story 8, Story 27, Story 28)
 * Handles Web sequential crawler, file ingestion, paste text, crawler history records, and incremental updates.
 */

import { crawler, DEFAULT_PROXIES, diffOnlineChapters, isLocalEnvironment } from '../core/crawler.js';
import { bahaCrawler } from '../core/bahaCrawler.js';
import { storage } from '../core/storage.js';
import { TextSegmenter } from '../core/segmenter.js';
import { TxtParser } from '../core/txtParser.js';
import { eventBus } from '../eventBus.js';

export class CrawlerView {
  constructor() {
    this.container = document.getElementById('crawler-container');
    this.urlInput = document.getElementById('crawler-url');
    this.proxySelect = document.getElementById('crawler-proxy');
    this.customProxyGroup = document.getElementById('crawler-custom-proxy-group');
    this.customProxyInput = document.getElementById('crawler-custom-proxy');
    this.delaySlider = document.getElementById('crawler-delay');
    this.delayLabel = document.getElementById('crawler-delay-val');
    this.btnStart = document.getElementById('btn-start-crawl');
    this.btnCancel = document.getElementById('btn-cancel-crawl');
    this.progressContainer = document.getElementById('crawler-progress-box');
    this.progressFill = document.getElementById('crawler-progress-fill');
    this.statusText = document.getElementById('crawler-status-text');
    this.logBox = document.getElementById('crawler-log');

    // Category Selectors (Story 28)
    this.crawlerCategorySelect = document.getElementById('crawler-target-category');
    this.btnCrawlerAddCat = document.getElementById('btn-crawler-add-cat');
    this.bahaCategorySelect = document.getElementById('baha-target-category');
    this.btnBahaAddCat = document.getElementById('btn-baha-add-cat');

    // Bahamut Gamer Home Elements
    this.bahaUrlInput = document.getElementById('baha-url');
    this.bahaTitleInput = document.getElementById('baha-book-title');
    this.bahaSortOrder = document.getElementById('baha-sort-order');
    this.bahaPageMode = document.getElementById('baha-page-mode');
    this.bahaPagesGroup = document.getElementById('baha-custom-pages-group');
    this.bahaStartPage = document.getElementById('baha-start-page');
    this.bahaEndPage = document.getElementById('baha-end-page');
    this.bahaProxySelect = document.getElementById('baha-proxy');
    this.bahaCustomProxyGroup = document.getElementById('baha-custom-proxy-group');
    this.bahaCustomProxyInput = document.getElementById('baha-custom-proxy');
    this.btnStartBaha = document.getElementById('btn-start-baha-crawl');
    this.btnCancelBaha = document.getElementById('btn-cancel-baha-crawl');

    // Bahamut Progress Elements (Story 38)
    this.bahaProgressContainer = document.getElementById('baha-progress-box');
    this.bahaProgressFill = document.getElementById('baha-progress-fill');
    this.bahaStatusText = document.getElementById('baha-status-text');
    this.bahaLogBox = document.getElementById('baha-log');

    // Crawler History Records (Story 27)
    this.recordsList = document.getElementById('crawler-records-list');
    this.recordsEmpty = document.getElementById('crawler-records-empty');
    this.recordsCountBadge = document.getElementById('crawler-records-count-badge');
    this.btnRefreshRecords = document.getElementById('btn-refresh-crawler-records');
    this.crawlerRecordsCard = this.recordsList ? this.recordsList.closest('.card') : null;
    this.currentSubTab = 'sub-panel-web'; // Story 38: 追蹤當前子分頁

    // Crawler Re-download Modal (Story 37)
    this.redownloadModal = document.getElementById('crawler-redownload-modal');
    this.redownloadBookTitle = document.getElementById('redownload-book-title');
    this.btnCancelRedownload = document.getElementById('btn-cancel-redownload');
    this.btnCloseRedownload = document.getElementById('btn-close-redownload-modal');
    this.btnConfirmRedownload = document.getElementById('btn-confirm-redownload');
    this.pendingRedownload = null;

    // Incremental Update Modal Elements (Story 27)
    this.updateModal = document.getElementById('crawler-update-modal');
    this.updateModalTitle = document.getElementById('crawler-update-modal-title');
    this.updateBookTitle = document.getElementById('crawler-update-book-title');
    this.updateChaptersList = document.getElementById('crawler-update-chapters-list');
    this.chkUpdateSelectAll = document.getElementById('chk-update-select-all');
    this.btnUpdateSortToggle = document.getElementById('btn-update-sort-toggle');
    this.updateSelectedCount = document.getElementById('crawler-update-selected-count');
    this.updateTotalCount = document.getElementById('crawler-update-total-count');
    this.btnConfirmUpdate = document.getElementById('btn-confirm-crawler-update');
    this.btnCancelUpdate = document.getElementById('btn-cancel-crawler-update');
    this.btnCloseUpdate = document.getElementById('btn-close-crawler-update');

    this.pendingUpdate = null;

    // File Ingestion Elements
    this.fileInput = document.getElementById('file-upload-input');
    this.dropzone = document.getElementById('file-dropzone');
    this.fileStatus = document.getElementById('file-upload-status');

    // Paste Text Elements
    this.pasteInboxMode = document.getElementById('paste-inbox-mode');
    this.pasteTitle = document.getElementById('paste-book-title');
    this.pasteContent = document.getElementById('paste-book-content');
    this.btnLoadPaste = document.getElementById('btn-load-paste');

    // Sub-segment Tabs inside Ingestion
    this.subTabs = document.querySelectorAll('.ingest-tab-btn');
    this.subPanels = document.querySelectorAll('.ingest-panel');
  }

  init() {
    this.clearUrlInput(); // Mandatory auto-clear on launch (Story 1, GWT 1.1)
    this.initProxySettings();
    this.renderCategoryOptions();
    this.renderCrawlerRecords();
    this.bindEvents();

    eventBus.on('bookshelf:refresh', () => {
      this.renderCategoryOptions();
      this.renderCrawlerRecords();
    });
    eventBus.on('category:changed', () => {
      this.renderCategoryOptions();
    });
  }

  clearUrlInput() {
    if (this.urlInput) {
      this.urlInput.value = '';
      this.urlInput.setAttribute('autocomplete', 'off');
    }
    if (this.bahaUrlInput) {
      this.bahaUrlInput.value = '';
      this.bahaUrlInput.setAttribute('autocomplete', 'off');
    }
  }

  initProxySettings() {
    const isLocal = isLocalEnvironment();
    let savedMode = localStorage.getItem('activeProxyMode');

    // 本機環境（.bat 啟動）預設 local，雲端環境（GitHub Pages/手機）預設 dedicated
    if (!savedMode) {
      savedMode = isLocal ? 'local' : 'dedicated';
    } else if (!isLocal && savedMode === 'local') {
      // 雲端環境若先前殘留 local，自動校正切換為 dedicated 避免 404
      savedMode = 'dedicated';
    }
    localStorage.setItem('activeProxyMode', savedMode);

    const savedCustom = localStorage.getItem('customProxyTemplate') || '';

    // 動態填入代理選項
    const renderProxyOptions = (selectEl) => {
      if (!selectEl) return;
      selectEl.innerHTML = '';

      if (isLocal) {
        // 本機模式 (.bat 啟動)
        selectEl.innerHTML = `
          <option value="local">本地伺服器直通代理 (住宅 IP/免 403 封鎖/推薦)</option>
          <option value="dedicated">專屬 Cloudflare 代理 (遠端/機房 IP: flat-dust-dbde)</option>
          <option value="allorigins">AllOrigins (公開備用節點)</option>
          <option value="custom">自訂代理 URL (持久記憶)</option>
        `;
      } else {
        // 雲端託管模式 (GitHub Pages / 手機等)
        selectEl.innerHTML = `
          <option value="dedicated">專屬 Cloudflare 代理 (雲端預設/推薦/免設定)</option>
          <option value="allorigins">AllOrigins (公開備用節點)</option>
          <option value="custom">自訂代理 URL (持久記憶)</option>
          <option value="local" disabled>本地伺服器直通代理 (⚠️ 僅限本機 bat 啟動)</option>
        `;
      }
      selectEl.value = savedMode;
    };

    renderProxyOptions(this.proxySelect);
    renderProxyOptions(this.bahaProxySelect);

    if (this.customProxyInput) this.customProxyInput.value = savedCustom;
    if (this.bahaCustomProxyInput) this.bahaCustomProxyInput.value = savedCustom;

    this.toggleCustomProxyUI(savedMode === 'custom');
  }

  toggleCustomProxyUI(show) {
    if (this.customProxyGroup) {
      this.customProxyGroup.style.display = show ? 'block' : 'none';
    }
    if (this.bahaCustomProxyGroup) {
      this.bahaCustomProxyGroup.style.display = show ? 'block' : 'none';
    }
  }

  bindEvents() {
    // Ingestion Sub-Tabs
    this.subTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.panel;
        this.subTabs.forEach(b => b.classList.remove('active'));
        this.subPanels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const p = document.getElementById(target);
        if (p) p.classList.add('active');

        // Story 38: 紀錄當前子分頁並即時依分頁過濾歷史紀錄
        this.currentSubTab = target;
        this.renderCrawlerRecords();
      });
    });

    // 代理切換雙向連動 (Story 30)
    const handleProxyChange = (mode) => {
      localStorage.setItem('activeProxyMode', mode);
      if (this.proxySelect) this.proxySelect.value = mode;
      if (this.bahaProxySelect) this.bahaProxySelect.value = mode;
      this.toggleCustomProxyUI(mode === 'custom');
    };

    if (this.proxySelect) {
      this.proxySelect.addEventListener('change', (e) => handleProxyChange(e.target.value));
    }
    if (this.bahaProxySelect) {
      this.bahaProxySelect.addEventListener('change', (e) => handleProxyChange(e.target.value));
    }

    // 自訂代理輸入雙向連動 (Story 30)
    const handleCustomProxyInput = (val) => {
      localStorage.setItem('customProxyTemplate', val);
      if (this.customProxyInput && this.customProxyInput.value !== val) {
        this.customProxyInput.value = val;
      }
      if (this.bahaCustomProxyInput && this.bahaCustomProxyInput.value !== val) {
        this.bahaCustomProxyInput.value = val;
      }
    };

    if (this.customProxyInput) {
      this.customProxyInput.addEventListener('input', (e) => handleCustomProxyInput(e.target.value.trim()));
    }
    if (this.bahaCustomProxyInput) {
      this.bahaCustomProxyInput.addEventListener('input', (e) => handleCustomProxyInput(e.target.value.trim()));
    }

    // Delay slider
    if (this.delaySlider && this.delayLabel) {
      this.delaySlider.addEventListener('input', (e) => {
        this.delayLabel.textContent = `${parseFloat(e.target.value).toFixed(1)} 秒`;
      });
    }

    // Crawl Action
    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => this.handleStartCrawl());
    }

    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', () => {
        crawler.cancel();
        this.appendLog('🛑 使用者已按下取消。');
      });
    }

    // Bahamut Gamer Home Crawl Action
    if (this.bahaPageMode && this.bahaPagesGroup) {
      this.bahaPageMode.addEventListener('change', (e) => {
        this.bahaPagesGroup.style.display = (e.target.value === 'range') ? 'block' : 'none';
      });
    }

    if (this.btnStartBaha) {
      this.btnStartBaha.addEventListener('click', () => this.handleStartBahaCrawl());
    }

    if (this.btnCancelBaha) {
      this.btnCancelBaha.addEventListener('click', () => {
        bahaCrawler.cancel();
        this.appendBahaLog('🛑 使用者已按下取消巴哈抓取。');
      });
    }

    // Category Quick Add Buttons
    const handleQuickAddCat = () => {
      const newCat = storage.createCategory();
      this.renderCategoryOptions();
      if (this.crawlerCategorySelect) {
        this.crawlerCategorySelect.value = newCat.id;
        localStorage.setItem('xreader_last_crawler_cat', newCat.id);
      }
      if (this.bahaCategorySelect) {
        this.bahaCategorySelect.value = newCat.id;
        localStorage.setItem('xreader_last_baha_cat', newCat.id);
      }
      eventBus.emit('category:changed');
      eventBus.emit('bookshelf:refresh');
      eventBus.emit('toast', { message: `已建立書櫃分類「${newCat.name}」！` });
    };

    if (this.btnCrawlerAddCat) this.btnCrawlerAddCat.addEventListener('click', handleQuickAddCat);
    if (this.btnBahaAddCat) this.btnBahaAddCat.addEventListener('click', handleQuickAddCat);

    // Auto reload categories on select focus/click & persist selection (Story 36)
    if (this.crawlerCategorySelect) {
      this.crawlerCategorySelect.addEventListener('focus', () => this.renderCategoryOptions());
      this.crawlerCategorySelect.addEventListener('mousedown', () => this.renderCategoryOptions());
      this.crawlerCategorySelect.addEventListener('change', (e) => {
        localStorage.setItem('xreader_last_crawler_cat', e.target.value);
      });
    }
    if (this.bahaCategorySelect) {
      this.bahaCategorySelect.addEventListener('focus', () => this.renderCategoryOptions());
      this.bahaCategorySelect.addEventListener('mousedown', () => this.renderCategoryOptions());
      this.bahaCategorySelect.addEventListener('change', (e) => {
        localStorage.setItem('xreader_last_baha_cat', e.target.value);
      });
    }

    // Refresh Crawler Records
    if (this.btnRefreshRecords) {
      this.btnRefreshRecords.addEventListener('click', () => {
        this.renderCrawlerRecords();
        eventBus.emit('toast', { message: '爬蟲紀錄清單已重新整理' });
      });
    }

    // Incremental Update Modal Events
    if (this.chkUpdateSelectAll) {
      this.chkUpdateSelectAll.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const checkboxes = this.updateChaptersList?.querySelectorAll('input[type="checkbox"]');
        checkboxes?.forEach(cb => cb.checked = checked);
        this.updateSelectedCountBadge();
      });
    }

    if (this.btnUpdateSortToggle) {
      this.btnUpdateSortToggle.addEventListener('click', () => {
        if (!this.pendingUpdate) return;
        this.pendingUpdate.sortAsc = !this.pendingUpdate.sortAsc;
        this.pendingUpdate.newChapters.reverse();
        this.btnUpdateSortToggle.textContent = this.pendingUpdate.sortAsc ? '🔄 順序: 正序 (由舊到新)' : '🔄 順序: 倒序 (由新到舊)';
        this.renderUpdateChaptersList();
      });
    }

    if (this.btnCancelUpdate) {
      this.btnCancelUpdate.addEventListener('click', () => this.closeUpdateModal());
    }
    if (this.btnCloseUpdate) {
      this.btnCloseUpdate.addEventListener('click', () => this.closeUpdateModal());
    }
    if (this.btnConfirmUpdate) {
      this.btnConfirmUpdate.addEventListener('click', () => this.executeIncrementalUpdate());
    }

    // Re-download Modal Events (Story 37)
    if (this.btnCancelRedownload) {
      this.btnCancelRedownload.addEventListener('click', () => this.closeRedownloadModal());
    }
    if (this.btnCloseRedownload) {
      this.btnCloseRedownload.addEventListener('click', () => this.closeRedownloadModal());
    }
    if (this.btnConfirmRedownload) {
      this.btnConfirmRedownload.addEventListener('click', () => this.executeRedownload());
    }

    // File Dropzone
    this.bindFileEvents();

    // Paste Text
    if (this.btnLoadPaste) {
      this.btnLoadPaste.addEventListener('click', () => this.handlePasteImport());
    }
  }

  async handleStartBahaCrawl() {
    const rawInput = (this.bahaUrlInput ? this.bahaUrlInput.value : '').trim();
    if (!rawInput) {
      alert('請先輸入巴哈小屋創作網址或屋主帳號！');
      return;
    }

    // 檢查是否已存在巴哈爬蟲紀錄 (防重複抓取提示與追更導流)
    const records = storage.getCrawlerRecords();
    let inputParsed = null;
    try {
      inputParsed = bahaCrawler.parseInput(rawInput);
    } catch (_) {}

    const existingBahaRec = records.find(r => {
      if (r.sourceType !== 'bahamut') return false;
      if (r.sourceUrl === rawInput) return true;
      if (inputParsed && inputParsed.owner) {
        try {
          const recParsed = bahaCrawler.parseInput(r.sourceUrl);
          if (recParsed.owner && recParsed.owner.toLowerCase() === inputParsed.owner.toLowerCase()) {
            return true;
          }
        } catch (_) {}
      }
      return false;
    });

    if (existingBahaRec) {
      const confirmUpdate = confirm(
        `偵測到本機已存在《${existingBahaRec.bookTitle}》的巴哈爬蟲紀錄！\n\n【確定】：改為「檢查更新 (追更)」僅抓取新發布章節\n【取消】：重新抓取整部小說（可能建立重複書籍）`
      );
      if (confirmUpdate) {
        this.handleCheckUpdate(existingBahaRec);
        return;
      }
    }

    // Validate custom proxy if selected
    const activeMode = localStorage.getItem('activeProxyMode') || (isLocalEnvironment() ? 'local' : 'dedicated');
    if (activeMode === 'custom') {
      const customUrl = (this.customProxyInput?.value || this.bahaCustomProxyInput?.value || '').trim();
      if (!customUrl || !customUrl.includes('{url}')) {
        alert('自訂代理 URL 必須包含 {url} 變數佔位符！');
        return;
      }
    }

    if (this.bahaProgressContainer) this.bahaProgressContainer.style.display = 'block';
    if (this.btnStartBaha) this.btnStartBaha.disabled = true;
    if (this.btnCancelBaha) this.btnCancelBaha.style.display = 'inline-block';
    if (this.bahaLogBox) this.bahaLogBox.innerHTML = '';
    if (this.bahaProgressFill) this.bahaProgressFill.style.width = '0%';
    if (this.bahaStatusText) this.bahaStatusText.textContent = '連線巴哈姆特 API 中...';

    const delay = parseFloat(this.delaySlider ? this.delaySlider.value : 1.5);
    const customTitle = (this.bahaTitleInput ? this.bahaTitleInput.value : '').trim();
    const sortOrder = (this.bahaSortOrder ? this.bahaSortOrder.value : 'asc');
    const isRange = (this.bahaPageMode && this.bahaPageMode.value === 'range');
    const startPage = isRange && this.bahaStartPage ? parseInt(this.bahaStartPage.value, 10) || 1 : 1;
    const endPage = isRange && this.bahaEndPage ? parseInt(this.bahaEndPage.value, 10) || null : null;
    const targetCategory = this.bahaCategorySelect ? this.bahaCategorySelect.value : 'uncategorized';

    try {
      const book = await bahaCrawler.crawlBaha(rawInput, {
        delay,
        customTitle,
        sortOrder,
        startPage,
        endPage,
        categoryId: targetCategory,
        onProgress: (info) => {
          if (info.status === 'fetching_catalog') {
            if (this.bahaStatusText) this.bahaStatusText.textContent = info.message;
            this.appendBahaLog(info.message);
          } else if (info.status === 'downloading') {
            if (this.bahaProgressFill) this.bahaProgressFill.style.width = `${info.percent}%`;
            if (this.bahaStatusText) this.bahaStatusText.textContent = `[${info.percent}%] ${info.message}`;
            if (info.title) this.appendBahaLog(`✔ 已下載: ${info.title}`);
          } else if (info.status === 'completed') {
            if (this.bahaProgressFill) this.bahaProgressFill.style.width = '100%';
            if (this.bahaStatusText) this.bahaStatusText.textContent = info.message;
            this.appendBahaLog(`🎉 ${info.message}`);
            eventBus.emit('bookshelf:refresh');
            this.renderCrawlerRecords();
            const bTitle = (info && info.book && info.book.title) ? info.book.title : '巴哈創作集';
            eventBus.emit('toast', {
              message: `《${bTitle}》下載完畢！`,
              actionLabel: '前往書櫃閱讀',
              onAction: () => eventBus.emit('nav:switchTab', 'tab-bookshelf')
            });
          } else if (info.status === 'cancelled') {
            if (this.bahaStatusText) this.bahaStatusText.textContent = info.message;
            this.appendBahaLog(`🛑 ${info.message}`);
          }
        }
      });
    } catch (err) {
      console.error('Baha Crawler Error:', err);
      if (this.bahaStatusText) this.bahaStatusText.textContent = `錯誤: ${err.message}`;
      this.appendBahaLog(`❌ 失敗: ${err.message}`);
      alert(`巴哈小屋抓取失敗: ${err.message}`);
    } finally {
      if (this.btnStartBaha) this.btnStartBaha.disabled = false;
      if (this.btnCancelBaha) this.btnCancelBaha.style.display = 'none';
    }
  }

  async handleStartCrawl() {
    const url = this.urlInput.value.trim();
    if (!url) {
      alert('請先輸入小說目錄網址！');
      return;
    }

    // 檢查是否已存在通用爬蟲紀錄 (防重複抓取提示與追更導流)
    const records = storage.getCrawlerRecords();
    const normalizeUrl = (u) => (u || '').trim().replace(/\/+$/, '').toLowerCase();
    const existingRec = records.find(r => r.sourceType !== 'bahamut' && normalizeUrl(r.sourceUrl) === normalizeUrl(url));
    if (existingRec) {
      const confirmUpdate = confirm(
        `偵測到本機已存在《${existingRec.bookTitle}》的爬蟲紀錄！\n\n【確定】：改為「檢查更新 (追更)」僅抓取新發布章節\n【取消】：重新抓取整部小說（可能建立重複書籍）`
      );
      if (confirmUpdate) {
        this.handleCheckUpdate(existingRec);
        return;
      }
    }

    // Validate custom proxy if selected
    const activeMode = localStorage.getItem('activeProxyMode') || (isLocalEnvironment() ? 'local' : 'dedicated');
    if (activeMode === 'custom') {
      const customUrl = (this.customProxyInput?.value || this.bahaCustomProxyInput?.value || '').trim();
      if (!customUrl || !customUrl.includes('{url}')) {
        alert('自訂代理 URL 必須包含 {url} 變數佔位符！');
        return;
      }
    }

    this.progressContainer.style.display = 'block';
    this.btnStart.disabled = true;
    this.btnCancel.style.display = 'inline-block';
    this.logBox.innerHTML = '';
    this.progressFill.style.width = '0%';

    const delay = parseFloat(this.delaySlider ? this.delaySlider.value : 2.0);
    const targetCategory = this.crawlerCategorySelect ? this.crawlerCategorySelect.value : 'uncategorized';

    try {
      const book = await crawler.crawlBook(url, {
        delay,
        categoryId: targetCategory,
        onProgress: (info) => {
          if (info.status === 'parsing_catalog') {
            this.statusText.textContent = info.message;
            this.appendLog(info.message);
          } else if (info.status === 'downloading') {
            this.progressFill.style.width = `${info.percent}%`;
            this.statusText.textContent = `[${info.percent}%] ${info.message}`;
            this.appendLog(`✔ 已儲存: ${info.title}`);
          } else if (info.status === 'completed') {
            this.progressFill.style.width = '100%';
            this.statusText.textContent = info.message;
            this.appendLog(`🎉 ${info.message}`);
            eventBus.emit('bookshelf:refresh');
            this.renderCrawlerRecords();
            const bookTitle = (info && info.book && info.book.title) ? info.book.title : '小說';
            eventBus.emit('toast', {
              message: `《${bookTitle}》下載完畢！`,
              actionLabel: '前往書櫃閱讀',
              onAction: () => eventBus.emit('nav:switchTab', 'tab-bookshelf')
            });
          } else if (info.status === 'cancelled') {
            this.statusText.textContent = info.message;
          }
        }
      });
    } catch (err) {
      console.error('Crawler Error:', err);
      this.statusText.textContent = `錯誤: ${err.message}`;
      this.appendLog(`❌ 失敗: ${err.message}`);
      alert(`爬取失敗: ${err.message}`);
    } finally {
      this.btnStart.disabled = false;
      this.btnCancel.style.display = 'none';
    }
  }

  bindFileEvents() {
    if (!this.dropzone || !this.fileInput) return;

    this.dropzone.addEventListener('click', () => this.fileInput.click());

    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('dragover');
    });

    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('dragover');
    });

    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.processFile(e.dataTransfer.files[0]);
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.processFile(e.target.files[0]);
      }
    });
  }

  async processFile(file) {
    this.fileStatus.style.display = 'block';
    this.fileStatus.textContent = `正在處理檔案: ${file.name}...`;

    const progressModal = document.getElementById('import-progress-modal');
    const progressTitle = document.getElementById('import-progress-title');
    const progressFill = document.getElementById('import-progress-fill');
    const progressStatus = document.getElementById('import-progress-status');

    const showProgress = (title) => {
      if (progressModal) {
        if (progressTitle) progressTitle.textContent = title;
        if (progressFill) progressFill.style.width = '0%';
        if (progressStatus) progressStatus.textContent = '準備寫入資料庫...';
        progressModal.classList.add('active');
      }
    };

    const updateProgress = (done, total) => {
      const pct = Math.round((done / total) * 100);
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressStatus) progressStatus.textContent = `正在寫入章節：${done} / ${total} 章 (${pct}%)`;
    };

    const hideProgress = () => {
      if (progressModal) progressModal.classList.remove('active');
    };

    try {
      if (file.name.endsWith('.json')) {
        // Backup JSON import
        showProgress(`正在還原書籍資料: 《${file.name.replace(/\.[^/.]+$/, '')}》...`);
        const text = await file.text();
        const book = await storage.importBookFromJson(text, (done, total) => {
          updateProgress(done, total);
        });
        hideProgress();
        this.fileStatus.textContent = `已成功還原備份書籍: 《${book.title}》（共 ${book.totalChapters} 章）！`;
        eventBus.emit('bookshelf:refresh');
        eventBus.emit('toast', {
          message: `備份書籍《${book.title}》還原成功！`,
          actionLabel: '前往閱讀',
          onAction: () => eventBus.emit('reader:openBook', book.id)
        });
        eventBus.emit('reader:openBook', book.id);
      } else if (file.name.endsWith('.txt')) {
        // Plain text file with smart encoding detection & strategy parsing
        showProgress(`正在解析純文字小說: 《${file.name}》...`);
        const text = await TxtParser.readTextFileWithEncoding(file);
        const bookTitle = file.name.replace(/\.[^/.]+$/, '');
        const bookId = `book_txt_${Date.now()}`;
        const chapters = TxtParser.parse(text, bookId);

        const book = {
          id: bookId,
          title: bookTitle,
          author: '本地匯入',
          sourceType: 'file',
          totalChapters: chapters.length,
          downloadedChaptersCount: chapters.length,
          lastChapterIndex: 0,
          lastSentenceIndex: 0
        };

        await storage.saveBook(book);
        for (const chap of chapters) {
          await storage.saveChapter(chap);
        }

        this.fileStatus.textContent = `《${bookTitle}》已成功入庫（共 ${chapters.length} 章）！`;
        eventBus.emit('bookshelf:refresh');
        eventBus.emit('toast', {
          message: `書籍《${bookTitle}》匯入成功！`,
          actionLabel: '前往書櫃閱讀',
          onAction: () => eventBus.emit('nav:switchTab', 'tab-bookshelf')
        });
      } else {
        alert('目前支援 .txt 與 .json 備份檔案，EPUB 請先轉為 TXT 或透過備份檔匯入。');
        this.fileStatus.style.display = 'none';
      }
    } catch (err) {
      console.error('File import error:', err);
      alert(`檔案處理失敗: ${err.message}`);
      this.fileStatus.textContent = '處理失敗';
    } finally {
      if (this.fileInput) this.fileInput.value = '';
    }
  }

  async handlePasteImport() {
    const content = (this.pasteContent ? this.pasteContent.value : '').trim();
    if (!content) {
      alert('請先貼入文章內容！');
      return;
    }

    const rawTitle = (this.pasteTitle ? this.pasteTitle.value : '').trim();
    const isInbox = this.pasteInboxMode ? this.pasteInboxMode.checked : true;

    if (isInbox) {
      // 集中存入常駐「📋 臨時剪貼簿」
      const INBOX_BOOK_ID = 'book_inbox_clipboard';
      let inboxBook = await storage.getBook(INBOX_BOOK_ID);
      if (!inboxBook) {
        inboxBook = {
          id: INBOX_BOOK_ID,
          title: '📋 臨時剪貼簿',
          author: '手動收集箱',
          sourceType: 'paste',
          categoryId: 'uncategorized',
          totalChapters: 0,
          downloadedChaptersCount: 0,
          lastChapterIndex: 0,
          lastSentenceIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await storage.saveBook(inboxBook);
      }

      // 章節標題自動摘要 (若未填寫或維持預設則自動擷取內文前 20 字)
      let chapTitle = rawTitle;
      if (!chapTitle || chapTitle === '自訂文字朗讀' || chapTitle === '貼上文字朗讀') {
        const cleanSnippet = content.replace(/\s+/g, ' ').trim().slice(0, 20);
        chapTitle = cleanSnippet.length > 0 ? `${cleanSnippet}...` : `篇章 ${inboxBook.totalChapters + 1}`;
      }

      const { paragraphs, flatSentences } = TextSegmenter.segment(content);
      const newChapterData = {
        title: chapTitle,
        content,
        paragraphs,
        sentencesCount: flatSentences.length
      };

      const appendRes = await storage.appendChaptersToBook(INBOX_BOOK_ID, [newChapterData]);
      const targetBook = appendRes.book;
      const newChapIndex = Math.max(0, targetBook.totalChapters - 1);

      // 更新進度鎖定於最新章節起點，並保存
      targetBook.lastChapterIndex = newChapIndex;
      targetBook.lastSentenceIndex = 0;
      await storage.saveBook(targetBook);

      this.pasteContent.value = '';
      if (this.pasteTitle) this.pasteTitle.value = '';

      eventBus.emit('bookshelf:refresh');
      eventBus.emit('toast', {
        message: `已存入《📋 臨時剪貼簿》第 ${targetBook.totalChapters} 篇（${chapTitle}）！`,
        actionLabel: '前往閱讀',
        onAction: () => eventBus.emit('reader:openBook', INBOX_BOOK_ID)
      });

      // 直接跳轉至閱讀器並開啟該最新篇章朗讀
      eventBus.emit('reader:openBook', INBOX_BOOK_ID);
    } else {
      // 獨立建立新書
      const title = rawTitle || '自訂文字朗讀';
      const bookId = `book_paste_${Date.now()}`;
      const { paragraphs, flatSentences } = TextSegmenter.segment(content);

      const chapter = {
        id: `${bookId}_0`,
        bookId,
        index: 0,
        title: '全文',
        content,
        paragraphs,
        sentencesCount: flatSentences.length
      };

      const book = {
        id: bookId,
        title,
        author: '手動貼上',
        sourceType: 'paste',
        categoryId: 'uncategorized',
        totalChapters: 1,
        downloadedChaptersCount: 1,
        lastChapterIndex: 0,
        lastSentenceIndex: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await storage.saveBook(book);
      await storage.saveChapter(chapter);

      this.pasteContent.value = '';
      if (this.pasteTitle) this.pasteTitle.value = '';

      eventBus.emit('bookshelf:refresh');
      eventBus.emit('toast', {
        message: `已新增獨立文本《${title}》！`,
        actionLabel: '前往閱讀',
        onAction: () => eventBus.emit('reader:openBook', book.id)
      });
      eventBus.emit('reader:openBook', book.id);
    }
  }

  appendLog(msg) {
    if (!this.logBox) return;
    const p = document.createElement('div');
    p.textContent = msg;
    this.logBox.appendChild(p);
    this.logBox.scrollTop = this.logBox.scrollHeight;
  }

  appendBahaLog(msg) {
    if (!this.bahaLogBox) return;
    const p = document.createElement('div');
    p.textContent = msg;
    this.bahaLogBox.appendChild(p);
    this.bahaLogBox.scrollTop = this.bahaLogBox.scrollHeight;
  }

  // ==========================================================
  // 目標分類下拉選單管理 (Story 28 & Story 36)
  // ==========================================================
  renderCategoryOptions() {
    const categories = storage.getCategories();
    const updateSelect = (selectEl, storageKey) => {
      if (!selectEl) return;
      const currentVal = selectEl.value;
      const savedVal = localStorage.getItem(storageKey);
      selectEl.innerHTML = '';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name + (c.isDefault ? ' (預設)' : '');
        selectEl.appendChild(opt);
      });
      if (currentVal && categories.some(c => c.id === currentVal)) {
        selectEl.value = currentVal;
      } else if (savedVal && categories.some(c => c.id === savedVal)) {
        selectEl.value = savedVal;
      }
    };

    updateSelect(this.crawlerCategorySelect, 'xreader_last_crawler_cat');
    updateSelect(this.bahaCategorySelect, 'xreader_last_baha_cat');
  }

  // ==========================================================
  // 爬蟲歷史紀錄與追更管理 (Story 27, 36, 37, 38)
  // ==========================================================
  async renderCrawlerRecords() {
    if (!this.recordsList) return;
    const records = storage.getCrawlerRecords();
    const categories = storage.getCategories();
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    // Pre-fetch all books to resolve live category (Story 36)
    const allBooks = await storage.getAllBooks();
    const bookMap = new Map(allBooks.map(b => [b.id, b]));

    // Story 38: 依子分頁過濾爬蟲紀錄
    let filteredRecords = records;
    let badgeSuffix = '筆紀錄';
    let emptyMsg = '尚無爬蟲紀錄。使用上方爬蟲完成抓取後，系統將自動儲存來源網址與對應書籍，讓您隨時一鍵追更！';

    if (this.currentSubTab === 'sub-panel-web') {
      if (this.crawlerRecordsCard) this.crawlerRecordsCard.style.display = 'block';
      filteredRecords = records.filter(r => r.sourceType !== 'bahamut');
      badgeSuffix = '筆網頁紀錄';
      emptyMsg = '尚無網頁爬蟲紀錄。使用上方小說目錄網址完成抓取後，系統將自動儲存紀錄！';
    } else if (this.currentSubTab === 'sub-panel-baha') {
      if (this.crawlerRecordsCard) this.crawlerRecordsCard.style.display = 'block';
      filteredRecords = records.filter(r => r.sourceType === 'bahamut');
      badgeSuffix = '筆巴哈紀錄';
      emptyMsg = '尚無巴哈爬蟲紀錄。使用上方巴哈小屋創作網址完成抓取後，系統將自動儲存紀錄！';
    } else {
      // 本地檔案匯入或手動貼上文字分頁時隱藏爬蟲歷史
      if (this.crawlerRecordsCard) this.crawlerRecordsCard.style.display = 'none';
      return;
    }

    if (this.recordsCountBadge) {
      this.recordsCountBadge.textContent = `${filteredRecords.length} ${badgeSuffix}`;
    }

    if (filteredRecords.length === 0) {
      this.recordsList.innerHTML = '';
      if (this.recordsEmpty) {
        this.recordsEmpty.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; opacity: 0.5;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>${emptyMsg}</div>
        `;
        this.recordsEmpty.style.display = 'block';
      }
      return;
    }

    if (this.recordsEmpty) this.recordsEmpty.style.display = 'none';
    this.recordsList.innerHTML = '';

    filteredRecords.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'crawler-record-card';

      const typeLabel = rec.sourceType === 'bahamut' ? '巴哈創作' : '線上網頁';

      // Story 36: Live category resolution from bookshelf
      const liveBook = rec.bookId ? bookMap.get(rec.bookId) : null;
      const effectiveCatId = liveBook ? (liveBook.categoryId || 'uncategorized') : (rec.targetCategoryId || 'uncategorized');
      const catName = catMap.get(effectiveCatId) || '未分類';
      if (liveBook && rec.targetCategoryId !== effectiveCatId) {
        storage.updateCrawlerRecordCategory(rec.bookId, effectiveCatId);
      }

      const dateStr = rec.lastCrawlTime ? new Date(rec.lastCrawlTime).toLocaleString('zh-TW', { hour12: false }) : '未知';

      card.innerHTML = `
        <div class="crawler-record-info">
          <div class="crawler-record-title-row">
            <h4 class="crawler-record-title">${rec.bookTitle || '未命名書籍'}</h4>
            <span class="book-card-badge">${typeLabel}</span>
            <span class="book-card-badge" style="background-color: var(--bg-surface); color: var(--accent-primary); border: 1px solid var(--border-color);">${catName}</span>
          </div>
          <div class="crawler-record-url" title="${rec.sourceUrl || ''}">
            來源: ${rec.sourceUrl || '無網址'}
          </div>
          <div class="crawler-record-meta">
            <span>📚 總章節: ${rec.totalChaptersCrawled || 0} 章</span>
            <span>🕒 最後更新: ${dateStr}</span>
          </div>
        </div>
        <div class="crawler-record-actions">
          <button class="btn btn-primary btn-sm btn-check-update" title="檢查線上目錄是否有新發布章節">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            檢查更新
          </button>
          <button class="btn btn-secondary btn-sm btn-redownload-record" title="重新下載整部書籍 (支援覆蓋原書或另存新書)">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            重新下載
          </button>
          <button class="btn btn-danger btn-sm btn-delete-record" title="刪除此筆爬蟲紀錄">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            刪除
          </button>
        </div>
      `;

      card.querySelector('.btn-check-update').addEventListener('click', () => {
        this.handleCheckUpdate(rec);
      });

      card.querySelector('.btn-redownload-record').addEventListener('click', () => {
        this.openRedownloadModal(rec);
      });

      card.querySelector('.btn-delete-record').addEventListener('click', () => {
        this.handleDeleteRecord(rec);
      });

      this.recordsList.appendChild(card);
    });
  }

  async handleDeleteRecord(rec) {
    const choice = confirm(`確定要刪除爬蟲紀錄《${rec.bookTitle}》嗎？\n\n【確定】：連同刪除已建立之本機書籍與所有章節內容\n【取消】：進入下一選項（可選擇僅刪除紀錄、保留書籍）`);
    if (choice) {
      await storage.deleteCrawlerRecord(rec.id, true);
      this.renderCrawlerRecords();
      eventBus.emit('bookshelf:refresh');
      eventBus.emit('toast', { message: `已刪除紀錄與書籍《${rec.bookTitle}》` });
    } else {
      if (confirm(`是否「僅刪除爬蟲紀錄」，而保留本機書籍《${rec.bookTitle}》？`)) {
        await storage.deleteCrawlerRecord(rec.id, false);
        this.renderCrawlerRecords();
        eventBus.emit('toast', { message: `已移除爬蟲紀錄（書籍已保留）` });
      }
    }
  }

  // ==========================================================
  // 重新下載管理 (Story 37)
  // ==========================================================
  openRedownloadModal(record) {
    this.pendingRedownload = record;
    if (this.redownloadBookTitle) {
      this.redownloadBookTitle.textContent = `《${record.bookTitle}》`;
    }
    const defaultRadio = this.redownloadModal?.querySelector('input[name="redownload-mode"][value="overwrite"]');
    if (defaultRadio) defaultRadio.checked = true;

    if (this.redownloadModal) {
      this.redownloadModal.classList.add('active');
    }
  }

  closeRedownloadModal() {
    this.pendingRedownload = null;
    if (this.redownloadModal) {
      this.redownloadModal.classList.remove('active');
    }
  }

  async executeRedownload() {
    if (!this.pendingRedownload) return;
    const rec = this.pendingRedownload;
    const selectedRadio = this.redownloadModal?.querySelector('input[name="redownload-mode"]:checked');
    const mode = selectedRadio ? selectedRadio.value : 'overwrite';
    this.closeRedownloadModal();

    const isBaha = (rec.sourceType === 'bahamut');
    const pContainer = isBaha ? this.bahaProgressContainer : this.progressContainer;
    const pFill = isBaha ? this.bahaProgressFill : this.progressFill;
    const pStatus = isBaha ? this.bahaStatusText : this.statusText;
    const pLog = isBaha ? this.bahaLogBox : this.logBox;
    const logFn = isBaha ? (m) => this.appendBahaLog(m) : (m) => this.appendLog(m);

    // 切換至對應分頁以展示進度 (Story 38)
    const targetSubTab = isBaha ? 'sub-panel-baha' : 'sub-panel-web';
    const tabBtn = Array.from(this.subTabs).find(b => b.dataset.panel === targetSubTab);
    if (tabBtn) tabBtn.click();

    if (pContainer) pContainer.style.display = 'block';
    if (pFill) pFill.style.width = '0%';
    if (pLog) pLog.innerHTML = '';
    if (pStatus) pStatus.textContent = `準備重新下載《${rec.bookTitle}》...`;
    logFn(`🔄 啟動【${mode === 'overwrite' ? '模式 A：覆蓋並重整原書' : '模式 B：另存為新書'}】...`);

    const delay = parseFloat(this.delaySlider ? this.delaySlider.value : (isBaha ? 1.5 : 2.0));

    try {
      if (mode === 'overwrite') {
        // 模式 A：清空原有章節，從第 1 章重新下載進原書
        logFn(`🧹 正在清空原書現有章節以重整排版...`);
        await storage.clearBookChapters(rec.bookId);

        const progressCb = (info) => {
          if (info.status === 'downloading') {
            if (pFill) pFill.style.width = `${info.percent}%`;
            if (pStatus) pStatus.textContent = `[${info.percent}%] ${info.message}`;
            if (info.title) logFn(`✔ 已下載: ${info.title}`);
          } else if (info.status === 'completed') {
            if (pFill) pFill.style.width = '100%';
            if (pStatus) pStatus.textContent = info.message;
            logFn(`🎉 ${info.message}`);
            eventBus.emit('bookshelf:refresh');
            this.renderCrawlerRecords();
            eventBus.emit('toast', {
              message: `《${rec.bookTitle}》已成功重整並重新下載完成！`,
              actionLabel: '前往閱讀',
              onAction: () => eventBus.emit('reader:openBook', rec.bookId)
            });
          } else if (info.status === 'cancelled') {
            if (pStatus) pStatus.textContent = info.message;
            logFn(`🛑 ${info.message}`);
          }
        };

        if (isBaha) {
          await bahaCrawler.crawlBaha(rec.sourceUrl, {
            delay,
            targetBookId: rec.bookId,
            recordId: rec.id,
            onProgress: progressCb
          });
        } else {
          await crawler.crawlBook(rec.sourceUrl, {
            delay,
            targetBookId: rec.bookId,
            recordId: rec.id,
            onProgress: progressCb
          });
        }
      } else {
        // 模式 B：另存為新書，爬蟲紀錄追更移轉至新書
        const newTitle = `${rec.bookTitle} (重新下載)`;
        logFn(`📚 正在建立新書《${newTitle}》...`);

        const progressCb = (info) => {
          if (info.status === 'downloading') {
            if (pFill) pFill.style.width = `${info.percent}%`;
            if (pStatus) pStatus.textContent = `[${info.percent}%] ${info.message}`;
            if (info.title) logFn(`✔ 已下載: ${info.title}`);
          } else if (info.status === 'completed') {
            if (pFill) pFill.style.width = '100%';
            if (pStatus) pStatus.textContent = info.message;
            logFn(`🎉 ${info.message}`);
            eventBus.emit('bookshelf:refresh');
            this.renderCrawlerRecords();
            const newBookId = info.book ? info.book.id : rec.bookId;
            eventBus.emit('toast', {
              message: `新書《${newTitle}》已建立並完成下載！追更已移轉至新書。`,
              actionLabel: '前往閱讀',
              onAction: () => eventBus.emit('reader:openBook', newBookId)
            });
          } else if (info.status === 'cancelled') {
            if (pStatus) pStatus.textContent = info.message;
            logFn(`🛑 ${info.message}`);
          }
        };

        if (isBaha) {
          await bahaCrawler.crawlBaha(rec.sourceUrl, {
            delay,
            customTitle: newTitle,
            recordId: rec.id,
            categoryId: rec.targetCategoryId || 'uncategorized',
            onProgress: progressCb
          });
        } else {
          await crawler.crawlBook(rec.sourceUrl, {
            delay,
            customTitle: newTitle,
            recordId: rec.id,
            categoryId: rec.targetCategoryId || 'uncategorized',
            onProgress: progressCb
          });
        }
      }
    } catch (err) {
      console.error('Redownload failed:', err);
      if (pStatus) pStatus.textContent = `重新下載失敗: ${err.message}`;
      logFn(`❌ 失敗: ${err.message}`);
      alert(`重新下載失敗: ${err.message}`);
    }
  }

  async handleCheckUpdate(rec) {
    const isBaha = (rec.sourceType === 'bahamut');
    const pContainer = isBaha ? this.bahaProgressContainer : this.progressContainer;
    const pStatus = isBaha ? this.bahaStatusText : this.statusText;
    const pLog = isBaha ? this.bahaLogBox : this.logBox;
    const logFn = isBaha ? (m) => this.appendBahaLog(m) : (m) => this.appendLog(m);

    if (pContainer) pContainer.style.display = 'block';
    if (pStatus) pStatus.textContent = `正在連線探測《${rec.bookTitle}》線上最新目錄...`;
    if (pLog) pLog.innerHTML = '';
    logFn(`🔍 開始探測來源: ${rec.sourceUrl}`);

    try {
      let onlineChapters = [];
      let totalOnline = 0;

      if (isBaha) {
        const catalog = await bahaCrawler.fetchCatalog(rec.sourceUrl, {
          sortOrder: 'asc',
          onProgress: (info) => {
            if (pStatus) pStatus.textContent = info.message;
            logFn(info.message);
          }
        });
        onlineChapters = catalog.articles || [];
        totalOnline = catalog.totalArticles || onlineChapters.length;
      } else {
        const catalog = await crawler.parseCatalog(rec.sourceUrl);
        onlineChapters = catalog.chapters || [];
        totalOnline = onlineChapters.length;
      }

      // 取得現有書籍章節
      const existingChaps = await storage.getChaptersByBook(rec.bookId);

      // 套用四級規則智慧過濾與拓撲排序 (Story 27)
      const diffResult = diffOnlineChapters(onlineChapters, existingChaps, rec.historicalKeys || []);
      const newChapters = diffResult.newChapters;

      if (newChapters.length === 0) {
        if (pStatus) pStatus.textContent = `《${rec.bookTitle}》已是最新狀態！`;
        logFn(`✅ 線上目錄共 ${totalOnline} 篇，目前已全數收錄，無新發布章節。`);
        eventBus.emit('toast', {
          message: `🎉《${rec.bookTitle}》目前已是最新狀態，無新發布內容！`
        });
        return;
      }

      logFn(`✨ 偵測到 ${newChapters.length} 篇全新章節！開啟確認彈窗...`);
      this.openUpdateModal(rec, newChapters, totalOnline);
    } catch (err) {
      console.error('Check update failed:', err);
      if (pStatus) pStatus.textContent = `檢查更新失敗: ${err.message}`;
      logFn(`❌ 錯誤: ${err.message}`);
      alert(`檢查更新失敗: ${err.message}`);
    }
  }

  openUpdateModal(record, newChapters, totalOnline) {
    this.pendingUpdate = {
      record,
      newChapters: [...newChapters],
      sortAsc: true
    };

    if (this.updateBookTitle) {
      this.updateBookTitle.textContent = `《${record.bookTitle}》 (線上最新總數: ${totalOnline} 篇，發現 ${newChapters.length} 篇新內容)`;
    }

    if (this.btnUpdateSortToggle) {
      this.btnUpdateSortToggle.textContent = '🔄 順序: 正序 (由舊到新)';
    }

    if (this.chkUpdateSelectAll) {
      this.chkUpdateSelectAll.checked = true;
    }

    this.renderUpdateChaptersList();

    if (this.updateModal) {
      this.updateModal.classList.add('active');
    }
  }

  closeUpdateModal() {
    this.pendingUpdate = null;
    if (this.updateModal) {
      this.updateModal.classList.remove('active');
    }
  }

  renderUpdateChaptersList() {
    if (!this.updateChaptersList || !this.pendingUpdate) return;
    this.updateChaptersList.innerHTML = '';

    const chapters = this.pendingUpdate.newChapters;

    chapters.forEach((ch, idx) => {
      const item = document.createElement('div');
      item.className = 'crawler-update-item';

      const numBadge = ch.parsedNumber !== null && ch.parsedNumber !== undefined
        ? `<span class="crawler-update-badge">#${ch.parsedNumber}</span>`
        : '';

      item.innerHTML = `
        <input type="checkbox" id="up-ch-${idx}" data-idx="${idx}" checked style="cursor: pointer;">
        <label for="up-ch-${idx}" style="cursor: pointer; flex: 1; display: flex; align-items: center; gap: 6px;">
          ${numBadge}
          <span>${ch.title}</span>
        </label>
      `;

      item.querySelector('input[type="checkbox"]').addEventListener('change', () => {
        this.updateSelectedCountBadge();
      });

      this.updateChaptersList.appendChild(item);
    });

    this.updateSelectedCountBadge();
  }

  updateSelectedCountBadge() {
    if (!this.updateChaptersList) return;
    const all = this.updateChaptersList.querySelectorAll('input[type="checkbox"]');
    const checked = this.updateChaptersList.querySelectorAll('input[type="checkbox"]:checked');

    if (this.updateSelectedCount) this.updateSelectedCount.textContent = checked.length;
    if (this.updateTotalCount) this.updateTotalCount.textContent = all.length;

    if (this.btnConfirmUpdate) {
      this.btnConfirmUpdate.disabled = (checked.length === 0);
    }
  }

  async executeIncrementalUpdate() {
    if (!this.pendingUpdate) return;
    const { record, newChapters } = this.pendingUpdate;

    // 收集所有勾選的章節 (保持目前畫面上展示之順序)
    const checkedBoxes = this.updateChaptersList.querySelectorAll('input[type="checkbox"]:checked');
    const selectedChapters = [];
    checkedBoxes.forEach(cb => {
      const idx = parseInt(cb.dataset.idx, 10);
      if (!isNaN(idx) && newChapters[idx]) {
        selectedChapters.push(newChapters[idx]);
      }
    });

    if (selectedChapters.length === 0) {
      alert('請至少勾選一篇欲追更下載的章節！');
      return;
    }

    this.closeUpdateModal();

    const isBaha = (record.sourceType === 'bahamut');
    const pContainer = isBaha ? this.bahaProgressContainer : this.progressContainer;
    const pFill = isBaha ? this.bahaProgressFill : this.progressFill;
    const pStatus = isBaha ? this.bahaStatusText : this.statusText;
    const pLog = isBaha ? this.bahaLogBox : this.logBox;
    const logFn = isBaha ? (m) => this.appendBahaLog(m) : (m) => this.appendLog(m);

    // 切換至對應分頁以展示進度 (Story 38)
    const targetSubTab = isBaha ? 'sub-panel-baha' : 'sub-panel-web';
    const tabBtn = Array.from(this.subTabs).find(b => b.dataset.panel === targetSubTab);
    if (tabBtn) tabBtn.click();

    // 啟動進度面板
    if (pContainer) pContainer.style.display = 'block';
    if (pLog) pLog.innerHTML = '';
    if (pFill) pFill.style.width = '0%';
    if (pStatus) pStatus.textContent = `準備追更下載 ${selectedChapters.length} 篇新章節...`;
    logFn(`🚀 開始增量追更《${record.bookTitle}》共 ${selectedChapters.length} 篇...`);

    const delay = parseFloat(this.delaySlider ? this.delaySlider.value : 1.5);

    try {
      const progressCb = (info) => {
        if (info.status === 'downloading') {
          if (pFill) pFill.style.width = `${info.percent}%`;
          if (pStatus) pStatus.textContent = `[${info.percent}%] ${info.message}`;
          if (info.title) logFn(`✔ 已追加: ${info.title}`);
        } else if (info.status === 'completed') {
          if (pFill) pFill.style.width = '100%';
          if (pStatus) pStatus.textContent = info.message;
          logFn(`🎉 ${info.message}`);
          eventBus.emit('bookshelf:refresh');
          this.renderCrawlerRecords();
          eventBus.emit('toast', {
            message: `《${record.bookTitle}》追更完成（新增 ${info.appendedCount} 篇）！`,
            actionLabel: '前往閱讀',
            onAction: () => eventBus.emit('reader:openBook', record.bookId)
          });
        } else if (info.status === 'cancelled') {
          if (pStatus) pStatus.textContent = info.message;
          logFn(`🛑 ${info.message}`);
        }
      };

      if (record.sourceType === 'bahamut') {
        await bahaCrawler.crawlBahaIncremental(record.id, selectedChapters, {
          delay,
          onProgress: progressCb
        });
      } else {
        await crawler.crawlIncremental(record.id, selectedChapters, {
          delay,
          onProgress: progressCb
        });
      }
    } catch (err) {
      console.error('Incremental crawl error:', err);
      if (pStatus) pStatus.textContent = `追更失敗: ${err.message}`;
      logFn(`❌ 失敗: ${err.message}`);
      alert(`追更失敗: ${err.message}`);
    }
  }
}

