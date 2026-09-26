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
import { downloadQueue } from '../core/downloadQueue.js';

export class CrawlerView {
  constructor() {
    this.crawler = crawler;
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

    // Download Queue Elements (Story 54)
    this.queueContainer = document.getElementById('crawler-queue-container');
    this.queueBadgeCount = document.getElementById('queue-badge-count');
    this.queueActiveSection = document.getElementById('queue-active-section');
    this.queuePendingList = document.getElementById('queue-pending-list');
    this.btnQueuePauseAll = document.getElementById('btn-queue-pause-all');
    this.btnQueueClear = document.getElementById('btn-queue-clear');

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

    // Catalog Preview & Selective Download Modal (Story 42)
    this.catalogModal = document.getElementById('crawler-catalog-modal');
    this.previewBookTitle = document.getElementById('preview-book-title');
    this.previewBookAuthor = document.getElementById('preview-book-author');
    this.previewTotalBadge = document.getElementById('preview-total-badge');
    this.previewChaptersContainer = document.getElementById('preview-chapters-container');
    this.previewSearchInput = document.getElementById('preview-search-input');
    this.previewSelectedCount = document.getElementById('preview-selected-count');
    this.previewListCount = document.getElementById('preview-list-count');
    this.btnPreviewSelectAll = document.getElementById('btn-preview-select-all');
    this.btnPreviewDeselectAll = document.getElementById('btn-preview-deselect-all');
    this.btnPreviewSmartSelect = document.getElementById('btn-preview-smart-select');
    this.chkPreviewTrim = document.getElementById('chk-preview-trim-head-tail');
    this.previewTrimTip = document.getElementById('preview-trim-tip');
    this.previewRangeStart = document.getElementById('preview-range-start');
    this.previewRangeEnd = document.getElementById('preview-range-end');
    this.btnPreviewApplyRange = document.getElementById('btn-preview-apply-range');
    this.btnCloseCatalogPreview = document.getElementById('btn-close-catalog-preview');
    this.btnCancelCatalogPreview = document.getElementById('btn-cancel-catalog-preview');
    this.btnConfirmCatalogDownload = document.getElementById('btn-confirm-catalog-download');

    this.pendingCatalog = null;
    this.previewSelections = new Set();

    // Incremental Update Modal Elements (Story 27)
    this.updateModal = document.getElementById('crawler-update-modal');
    this.updateModalTitle = document.getElementById('crawler-update-modal-title');
    this.updateBookTitle = document.getElementById('crawler-update-book-title');
    this.updateChaptersList = document.getElementById('crawler-update-chapters-list');
    this.chkUpdateSelectAll = document.getElementById('chk-update-select-all');
    this.btnUpdateSelectNew = document.getElementById('btn-update-select-new');
    this.btnUpdateSelectBackfill = document.getElementById('btn-update-select-backfill');
    this.btnUpdateDeselectAll = document.getElementById('btn-update-deselect-all');
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
    this.bindQueueEvents();
    this.renderQueueUI();

    eventBus.on('queue:updated', () => this.renderQueueUI());
    eventBus.on('queue:started', (data) => this.handleQueueStarted(data));
    eventBus.on('queue:progress', (data) => this.handleQueueProgress(data));

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
        const active = downloadQueue.getActiveTask();
        if (active) {
          downloadQueue.cancelTask(active.id);
        } else {
          crawler.cancel();
        }
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

    // Incremental Update Modal Events (Story 51)
    if (this.chkUpdateSelectAll) {
      this.chkUpdateSelectAll.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const checkboxes = this.updateChaptersList?.querySelectorAll('input[type="checkbox"]');
        checkboxes?.forEach(cb => cb.checked = checked);
        this.updateSelectedCountBadge();
      });
    }

    if (this.btnUpdateSelectNew) {
      this.btnUpdateSelectNew.addEventListener('click', () => {
        if (!this.pendingUpdate) return;
        const checkboxes = this.updateChaptersList?.querySelectorAll('input[type="checkbox"]');
        checkboxes?.forEach(cb => {
          const idx = parseInt(cb.dataset.idx, 10);
          const ch = this.pendingUpdate.newChapters[idx];
          cb.checked = ch ? !!ch.isNewRelease : false;
        });
        this.updateSelectedCountBadge();
      });
    }

    if (this.btnUpdateSelectBackfill) {
      this.btnUpdateSelectBackfill.addEventListener('click', () => {
        if (!this.pendingUpdate) return;
        const checkboxes = this.updateChaptersList?.querySelectorAll('input[type="checkbox"]');
        checkboxes?.forEach(cb => {
          const idx = parseInt(cb.dataset.idx, 10);
          const ch = this.pendingUpdate.newChapters[idx];
          cb.checked = ch ? !!ch.isBackfill : false;
        });
        this.updateSelectedCountBadge();
      });
    }

    if (this.btnUpdateDeselectAll) {
      this.btnUpdateDeselectAll.addEventListener('click', () => {
        const checkboxes = this.updateChaptersList?.querySelectorAll('input[type="checkbox"]');
        checkboxes?.forEach(cb => cb.checked = false);
        if (this.chkUpdateSelectAll) this.chkUpdateSelectAll.checked = false;
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

    // Catalog Preview Modal Events (Story 42)
    if (this.btnCloseCatalogPreview) {
      this.btnCloseCatalogPreview.addEventListener('click', () => this.closeCatalogPreview());
    }
    if (this.btnCancelCatalogPreview) {
      this.btnCancelCatalogPreview.addEventListener('click', () => this.closeCatalogPreview());
    }
    if (this.btnConfirmCatalogDownload) {
      this.btnConfirmCatalogDownload.addEventListener('click', () => this.handleConfirmCatalogDownload());
    }
    if (this.btnPreviewSelectAll) {
      this.btnPreviewSelectAll.addEventListener('click', () => this.handlePreviewSelectAll());
    }
    if (this.btnPreviewDeselectAll) {
      this.btnPreviewDeselectAll.addEventListener('click', () => this.handlePreviewDeselectAll());
    }
    if (this.btnPreviewSmartSelect) {
      this.btnPreviewSmartSelect.addEventListener('click', () => this.handlePreviewSmartSelect());
    }
    if (this.chkPreviewTrim) {
      this.chkPreviewTrim.addEventListener('change', (e) => this.handleToggleTrim(e.target.checked));
    }
    if (this.btnPreviewApplyRange) {
      this.btnPreviewApplyRange.addEventListener('click', () => this.handlePreviewApplyRange());
    }
    if (this.previewSearchInput) {
      this.previewSearchInput.addEventListener('input', () => this.renderPreviewChaptersList());
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

    const origBtnHtml = this.btnStart ? this.btnStart.innerHTML : '';
    if (this.btnStart) {
      this.btnStart.disabled = true;
      this.btnStart.textContent = '連線代理解析目錄中...';
    }

    try {
      // 1. 先解析全書目錄 (Story 42, GWT 42.1)
      const catalog = await crawler.parseCatalog(url);
      // 2. 開啟目錄預覽與自訂勾選下載視窗
      this.openCatalogPreview(url, catalog);
    } catch (err) {
      console.error('Parse Catalog Error:', err);
      alert(`解析小說目錄失敗: ${err.message}`);
    } finally {
      if (this.btnStart) {
        this.btnStart.disabled = false;
        this.btnStart.innerHTML = origBtnHtml;
      }
    }
  }

  /**
   * 開啟章節清單預覽與自訂下載視窗 (Story 42, Story 44)
   */
  openCatalogPreview(url, catalog, options = {}) {
    this.pendingCatalog = {
      url,
      catalog,
      isRedownload: !!options.isRedownload,
      redownloadRecord: options.redownloadRecord || null,
      redownloadMode: options.redownloadMode || 'overwrite'
    };
    this.previewSelections.clear();

    const bookTitleText = catalog.title || options.redownloadRecord?.bookTitle || '未命名小說';
    if (this.previewBookTitle) {
      if (options.isRedownload) {
        const modeLabel = options.redownloadMode === 'overwrite' ? '覆蓋重整原書' : '另存為新書';
        this.previewBookTitle.textContent = `《${bookTitleText}》（重新下載 - ${modeLabel}）`;
      } else {
        this.previewBookTitle.textContent = `《${bookTitleText}》`;
      }
    }
    if (this.previewBookAuthor) this.previewBookAuthor.textContent = catalog.author || options.redownloadRecord?.bookAuthor || '未知';
    if (this.previewTotalBadge) this.previewTotalBadge.textContent = `共解析出 ${catalog.chapters.length} 篇`;

    // 預設智慧推薦：自動勾選符合正文章節特徵者 (GWT 42.2, 43.2)
    catalog.chapters.forEach((chap, idx) => {
      if (chap.isLikelyChapter !== false) {
        this.previewSelections.add(idx);
      }
    });

    if (this.chkPreviewTrim) this.chkPreviewTrim.checked = true;
    if (this.previewTrimTip) this.previewTrimTip.textContent = '';

    if (this.previewRangeStart) this.previewRangeStart.value = '1';
    if (this.previewRangeEnd) this.previewRangeEnd.value = String(catalog.chapters.length);
    if (this.previewSearchInput) this.previewSearchInput.value = '';

    // 若預設勾選去除首尾雜項，自動過濾首尾非正文特徵 (Story 45, GWT 45.2)
    if (this.chkPreviewTrim && this.chkPreviewTrim.checked) {
      this.applyTrimFilter(true, false);
    } else {
      this.renderPreviewChaptersList();
      this.updatePreviewStats();
    }

    if (this.catalogModal) {
      this.catalogModal.classList.add('active');
    }
  }

  closeCatalogPreview() {
    if (this.catalogModal) {
      this.catalogModal.classList.remove('active');
    }
    this.pendingCatalog = null;
    this.previewSelections.clear();
  }

  renderPreviewChaptersList() {
    if (!this.previewChaptersContainer || !this.pendingCatalog) return;
    this.previewChaptersContainer.innerHTML = '';

    const chapters = this.pendingCatalog.catalog.chapters;
    const filter = (this.previewSearchInput ? this.previewSearchInput.value : '').trim().toLowerCase();
    const fragment = document.createDocumentFragment();

    chapters.forEach((chap, idx) => {
      const title = chap.title || `第 ${idx + 1} 章`;
      if (filter && !title.toLowerCase().includes(filter)) return;

      const isChecked = this.previewSelections.has(idx);
      const isLikely = chap.isLikelyChapter !== false;

      const row = document.createElement('label');
      row.className = `preview-chapter-row ${isLikely ? '' : 'is-non-chapter'}`;

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = isChecked;
      chk.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.previewSelections.add(idx);
        } else {
          this.previewSelections.delete(idx);
        }
        this.updatePreviewStats();
      });

      const idxSpan = document.createElement('span');
      idxSpan.className = 'preview-chapter-idx';
      idxSpan.textContent = `#${idx + 1}`;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'preview-chapter-name';
      nameSpan.textContent = title;
      nameSpan.title = title;

      row.appendChild(chk);
      row.appendChild(idxSpan);
      row.appendChild(nameSpan);

      if (!isLikely) {
        const tag = document.createElement('span');
        tag.className = 'preview-chapter-tag tag-warning';
        tag.textContent = '非正文特徵';
        row.appendChild(tag);
      }

      fragment.appendChild(row);
    });

    if (!fragment.hasChildNodes()) {
      const emptyHint = document.createElement('div');
      emptyHint.style.cssText = 'text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;';
      emptyHint.textContent = '無符合關鍵字的章節項目';
      fragment.appendChild(emptyHint);
    }

    this.previewChaptersContainer.appendChild(fragment);
  }

  updatePreviewStats() {
    if (!this.pendingCatalog) return;
    const total = this.pendingCatalog.catalog.chapters.length;
    const selected = this.previewSelections.size;

    if (this.previewSelectedCount) this.previewSelectedCount.textContent = String(selected);
    if (this.previewListCount) this.previewListCount.textContent = String(total);
    if (this.btnConfirmCatalogDownload) {
      const isRedownload = this.pendingCatalog?.isRedownload;
      const hasActive = !!downloadQueue.getActiveTask();
      let actionWord = isRedownload ? '開始重新下載選取章節' : '開始下載選取章節';
      if (hasActive) {
        actionWord = '📥 加入下載排程';
      }
      this.btnConfirmCatalogDownload.textContent = `${actionWord} (共 ${selected} 章)`;
      this.btnConfirmCatalogDownload.disabled = (selected === 0);
    }
  }

  handlePreviewSelectAll() {
    if (!this.pendingCatalog) return;
    const total = this.pendingCatalog.catalog.chapters.length;
    for (let i = 0; i < total; i++) {
      this.previewSelections.add(i);
    }
    if (this.chkPreviewTrim) this.chkPreviewTrim.checked = false;
    this.renderPreviewChaptersList();
    this.updatePreviewStats();
    this.showTrimTip('✔ 已全選所有篇章');
  }

  handlePreviewDeselectAll() {
    this.previewSelections.clear();
    this.renderPreviewChaptersList();
    this.updatePreviewStats();
    this.showTrimTip('✔ 已取消所有勾選');
  }

  handlePreviewSmartSelect() {
    if (!this.pendingCatalog) return;
    this.previewSelections.clear();
    this.pendingCatalog.catalog.chapters.forEach((chap, idx) => {
      if (chap.isLikelyChapter !== false) {
        this.previewSelections.add(idx);
      }
    });
    if (this.chkPreviewTrim && this.chkPreviewTrim.checked) {
      this.applyTrimFilter(true, true);
    } else {
      this.renderPreviewChaptersList();
      this.updatePreviewStats();
      this.showTrimTip('✔ 已套用智慧推薦');
    }
  }

  handleToggleTrim(isChecked) {
    if (!this.pendingCatalog) return;
    this.applyTrimFilter(isChecked, true);
  }

  applyTrimFilter(shouldTrim, showTip = true) {
    if (!this.pendingCatalog) return;
    const chapters = this.pendingCatalog.catalog.chapters;
    let modifiedCount = 0;

    if (shouldTrim) {
      // 排除首段與後段的非正文特徵項目 (Story 45, GWT 45.2, 45.3)
      for (let i = 0; i < Math.min(30, chapters.length); i++) {
        if (this.isHeadTailExtra(chapters[i])) {
          if (this.previewSelections.has(i)) {
            this.previewSelections.delete(i);
            modifiedCount++;
          }
        }
      }
      for (let i = Math.max(0, chapters.length - 10); i < chapters.length; i++) {
        if (this.isHeadTailExtra(chapters[i])) {
          if (this.previewSelections.has(i)) {
            this.previewSelections.delete(i);
            modifiedCount++;
          }
        }
      }
      this.renderPreviewChaptersList();
      this.updatePreviewStats();
      if (showTip) {
        if (modifiedCount > 0) {
          this.showTrimTip(`✔ 已去除 ${modifiedCount} 項首尾雜項`);
        } else {
          this.showTrimTip('💡 首尾無雜項需要剔除');
        }
      }
    } else {
      // 關閉去除：恢復首段與後段的非正文項目
      for (let i = 0; i < Math.min(30, chapters.length); i++) {
        if (this.isHeadTailExtra(chapters[i])) {
          if (!this.previewSelections.has(i)) {
            this.previewSelections.add(i);
            modifiedCount++;
          }
        }
      }
      for (let i = Math.max(0, chapters.length - 10); i < chapters.length; i++) {
        if (this.isHeadTailExtra(chapters[i])) {
          if (!this.previewSelections.has(i)) {
            this.previewSelections.add(i);
            modifiedCount++;
          }
        }
      }
      this.renderPreviewChaptersList();
      this.updatePreviewStats();
      if (showTip) {
        if (modifiedCount > 0) {
          this.showTrimTip(`✔ 已納入 ${modifiedCount} 項首尾項目`);
        } else {
          this.showTrimTip('💡 首尾無特殊雜項');
        }
      }
    }
  }

  isHeadTailExtra(chap) {
    if (!chap) return false;
    if (chap.isLikelyChapter === false) return true;
    const t = (chap.title || '').trim();
    return /^(版權|聲明|條款|隱私|防詐|公告|感言|預告|廣告|贊助|說明|常見問題)$/i.test(t);
  }

  showTrimTip(msg) {
    if (!this.previewTrimTip) return;
    this.previewTrimTip.textContent = msg;
    clearTimeout(this._trimTipTimer);
    this._trimTipTimer = setTimeout(() => {
      if (this.previewTrimTip) this.previewTrimTip.textContent = '';
    }, 2500);
  }

  handlePreviewApplyRange() {
    if (!this.pendingCatalog) return;
    const start = parseInt(this.previewRangeStart ? this.previewRangeStart.value : '', 10);
    const end = parseInt(this.previewRangeEnd ? this.previewRangeEnd.value : '', 10);
    const total = this.pendingCatalog.catalog.chapters.length;

    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      alert(`請輸入有效的起訖章節號（1 ~ ${total}）！`);
      return;
    }

    this.previewSelections.clear();
    const sIdx = Math.max(0, start - 1);
    const eIdx = Math.min(total - 1, end - 1);
    for (let i = sIdx; i <= eIdx; i++) {
      this.previewSelections.add(i);
    }
    this.renderPreviewChaptersList();
    this.updatePreviewStats();
  }

  handleConfirmCatalogDownload() {
    if (!this.pendingCatalog) return;
    const selectedChapters = this.pendingCatalog.catalog.chapters.filter((_, idx) => this.previewSelections.has(idx));
    if (selectedChapters.length === 0) {
      alert('請至少選取一個欲下載的章節！');
      return;
    }

    const { url, catalog, isRedownload, redownloadRecord, redownloadMode } = this.pendingCatalog;
    this.closeCatalogPreview();

    if (isRedownload && redownloadRecord) {
      this.executeRedownloadWithChapters(redownloadRecord, redownloadMode, selectedChapters);
    } else {
      const delay = parseFloat(this.delaySlider ? this.delaySlider.value : 2.0);
      const targetCategory = this.crawlerCategorySelect ? this.crawlerCategorySelect.value : 'uncategorized';

      downloadQueue.enqueue({
        bookTitle: catalog?.title || '未命名小說',
        author: catalog?.author || '未知',
        catalogUrl: url,
        sourceType: 'web',
        categoryId: targetCategory,
        selectedChapters,
        delay,
        customTitle: catalog?.title || ''
      });

      this.clearUrlInput();

      eventBus.emit('toast', {
        message: `📥 已將《${catalog?.title || '小說'}》加入下載佇列（共 ${selectedChapters.length} 章）`
      });
    }
  }

  async executeCrawl(url, catalog, selectedChapters) {
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
        customTitle: catalog?.title || '',
        author: catalog?.author || '',
        selectedChapters, // Story 42
        onProgress: (info) => {
          if (info.status === 'downloading') {
            this.progressFill.style.width = `${info.percent}%`;
            this.statusText.textContent = `[${info.percent}%] ${info.message}`;
            if (info.title) this.appendLog(`✔ 已儲存: ${info.title}`);
          } else if (info.status === 'completed') {
            this.progressFill.style.width = '100%';
            this.statusText.textContent = info.message;
            this.appendLog(`🎉 ${info.message}`);
            eventBus.emit('bookshelf:refresh');
            this.renderCrawlerRecords();
            const bookTitle = (info && info.book && info.book.title) ? info.book.title : (catalog?.title || '小說');
            eventBus.emit('toast', {
              message: `《${bookTitle}》下載完畢 (共 ${selectedChapters.length} 章)！`,
              actionLabel: '前往書櫃閱讀',
              onAction: () => eventBus.emit('nav:switchTab', 'tab-bookshelf')
            });
          } else if (info.status === 'cancelled') {
            this.statusText.textContent = info.message;
            this.appendLog(`🛑 ${info.message}`);
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
        const meta = TxtParser.parseMetadata(text);
        const bookTitle = meta.title || file.name.replace(/\.[^/.]+$/, '');
        const bookAuthor = meta.author || '本地匯入';
        const bookId = `book_txt_${Date.now()}`;
        const chapters = TxtParser.parse(text, bookId);

        const book = {
          id: bookId,
          title: bookTitle,
          author: bookAuthor,
          sourceType: 'file',
          sourceUrl: meta.sourceUrl || '',
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

    // For Web crawler: parse catalog first and pop up chapter preview checklist (Story 44)
    if (!isBaha) {
      const targetSubTab = 'sub-panel-web';
      const tabBtn = Array.from(this.subTabs).find(b => b.dataset.panel === targetSubTab);
      if (tabBtn) tabBtn.click();

      if (this.progressContainer) this.progressContainer.style.display = 'block';
      if (this.progressFill) this.progressFill.style.width = '0%';
      if (this.logBox) this.logBox.innerHTML = '';
      if (this.statusText) this.statusText.textContent = `連線解析《${rec.bookTitle}》全書目錄中...`;
      this.appendLog(`📡 正在連線專屬代理解析《${rec.bookTitle}》最新全書目錄...`);

      try {
        const catalog = await crawler.parseCatalog(rec.sourceUrl);
        if (this.progressContainer) this.progressContainer.style.display = 'none';
        this.openCatalogPreview(rec.sourceUrl, catalog, {
          isRedownload: true,
          redownloadRecord: rec,
          redownloadMode: mode
        });
      } catch (err) {
        console.error('Redownload parse catalog failed:', err);
        if (this.statusText) this.statusText.textContent = `目錄解析失敗: ${err.message}`;
        this.appendLog(`❌ 目錄解析失敗: ${err.message}`);
        alert(`解析《${rec.bookTitle}》目錄失敗: ${err.message}`);
      }
      return;
    }

    // For Bahamut: proceed with direct execution
    this.executeRedownloadWithChapters(rec, mode, null);
  }

  executeRedownloadWithChapters(rec, mode, selectedChapters) {
    const isBaha = (rec.sourceType === 'bahamut');
    const targetSubTab = isBaha ? 'sub-panel-baha' : 'sub-panel-web';
    const tabBtn = Array.from(this.subTabs).find(b => b.dataset.panel === targetSubTab);
    if (tabBtn) tabBtn.click();

    const delay = parseFloat(this.delaySlider ? this.delaySlider.value : (isBaha ? 1.5 : 2.0));

    // Story 55: 重新下載統一排入佇列
    downloadQueue.enqueue({
      taskType: 'redownload',
      bookTitle: rec.bookTitle,
      author: rec.bookAuthor || '未知',
      catalogUrl: rec.sourceUrl,
      sourceType: rec.sourceType || 'web',
      targetBookId: mode === 'overwrite' ? rec.bookId : null,
      recordId: rec.id,
      selectedChapters,
      delay,
      redownloadMode: mode
    });

    eventBus.emit('toast', {
      message: `📥 已將《${rec.bookTitle}》重新下載任務加入排程佇列`
    });
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

      logFn(`✨ 偵測到 ${diffResult.newReleases.length} 篇最新連載、${diffResult.backfillChapters.length} 篇先前未下載章節！開啟確認彈窗...`);
      this.openUpdateModal(rec, newChapters, totalOnline, diffResult, onlineChapters);
    } catch (err) {
      console.error('Check update failed:', err);
      if (pStatus) pStatus.textContent = `檢查更新失敗: ${err.message}`;
      logFn(`❌ 錯誤: ${err.message}`);
      alert(`檢查更新失敗: ${err.message}`);
    }
  }

  openUpdateModal(record, newChapters, totalOnline, diffResult = null, allOnlineChapters = []) {
    const newReleases = diffResult?.newReleases || newChapters.filter(c => c.isNewRelease);
    const backfillChapters = diffResult?.backfillChapters || newChapters.filter(c => c.isBackfill);

    this.pendingUpdate = {
      record,
      newChapters: [...newChapters],
      newReleases,
      backfillChapters,
      allOnlineChapters,
      sortAsc: true
    };

    if (this.updateBookTitle) {
      this.updateBookTitle.innerHTML = `《${record.bookTitle}》 (線上共 ${totalOnline} 篇 | <span style="color: #3b82f6; font-weight: 600;">✨ 最新連載: ${newReleases.length} 篇</span> | <span style="color: #f59e0b; font-weight: 600;">⏭️ 補抓: ${backfillChapters.length} 篇</span>)`;
    }

    if (this.btnUpdateSortToggle) {
      this.btnUpdateSortToggle.textContent = '🔄 順序: 正序 (由舊到新)';
    }

    if (this.chkUpdateSelectAll) {
      this.chkUpdateSelectAll.checked = (newReleases.length > 0);
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

      const typeBadge = ch.isBackfill
        ? `<span class="crawler-type-badge backfill" style="font-size:0.75rem; padding: 2px 6px; border-radius: 4px; background: rgba(245, 158, 11, 0.18); color: #f59e0b; font-weight: 600; white-space: nowrap;">⏭️ 先前未下載</span>`
        : `<span class="crawler-type-badge new-release" style="font-size:0.75rem; padding: 2px 6px; border-radius: 4px; background: rgba(59, 130, 246, 0.18); color: #3b82f6; font-weight: 600; white-space: nowrap;">✨ 最新連載</span>`;

      // Story 51: 最新連載預設選取，先前未下載補抓章節預設不選取 (GWT 51.1)
      const defaultChecked = ch.isNewRelease ? 'checked' : '';

      item.innerHTML = `
        <input type="checkbox" id="up-ch-${idx}" data-idx="${idx}" data-is-backfill="${ch.isBackfill ? 'true' : 'false'}" ${defaultChecked} style="cursor: pointer;">
        <label for="up-ch-${idx}" style="cursor: pointer; flex: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          ${typeBadge}
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

  executeIncrementalUpdate() {
    if (!this.pendingUpdate) return;
    const { record, newChapters, allOnlineChapters } = this.pendingUpdate;

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

    // 建立線上章節網址到目錄索引的 Map，提供補抓章節自動重排歸位使用 (GWT 51.3)
    const onlineIndexMap = new Map();
    if (Array.isArray(allOnlineChapters)) {
      allOnlineChapters.forEach((c, idx) => {
        if (c.url) onlineIndexMap.set(c.url, idx);
      });
    }

    this.closeUpdateModal();

    const isBaha = (record.sourceType === 'bahamut');
    const targetSubTab = isBaha ? 'sub-panel-baha' : 'sub-panel-web';
    const tabBtn = Array.from(this.subTabs).find(b => b.dataset.panel === targetSubTab);
    if (tabBtn) tabBtn.click();

    const delay = parseFloat(this.delaySlider ? this.delaySlider.value : (isBaha ? 1.5 : 2.0));
    const reorder = selectedChapters.some(c => c.isBackfill);

    // Story 55: 統一排入下載排程佇列，杜絕多本小說同時並發下載與日誌交錯穿插 (GWT 55.1, 55.2)
    downloadQueue.enqueue({
      taskType: 'incremental',
      bookTitle: record.bookTitle,
      author: record.bookAuthor || '未知',
      catalogUrl: record.sourceUrl,
      sourceType: record.sourceType || 'web',
      targetBookId: record.bookId,
      recordId: record.id,
      selectedChapters,
      onlineIndexMap,
      reorder,
      delay
    });

    eventBus.emit('toast', {
      message: `📥 已將《${record.bookTitle}》追更任務加入排程佇列（共 ${selectedChapters.length} 篇）`
    });
  }

  // ==========================================================
  // 下載排程佇列管理 (Story 54)
  // ==========================================================
  bindQueueEvents() {
    if (this.btnQueuePauseAll) {
      this.btnQueuePauseAll.addEventListener('click', () => {
        const active = downloadQueue.getActiveTask();
        if (active) {
          downloadQueue.pauseActive();
          eventBus.emit('toast', { message: `已暫停《${active.bookTitle}》下載（進度已保存）` });
        } else {
          const pending = downloadQueue.getPendingTasks();
          const paused = pending.find(t => t.status === 'paused');
          if (paused) {
            downloadQueue.resumeTask(paused.id);
            eventBus.emit('toast', { message: `恢復《${paused.bookTitle}》下載` });
          } else {
            eventBus.emit('toast', { message: '目前無正在進行中的下載任務' });
          }
        }
      });
    }

    if (this.btnQueueClear) {
      this.btnQueueClear.addEventListener('click', () => {
        const pending = downloadQueue.getPendingTasks();
        if (pending.length === 0) {
          eventBus.emit('toast', { message: '等待佇列中目前沒有任何任務' });
          return;
        }
        if (confirm(`確定要清空等待佇列中的 ${pending.length} 部小說嗎？（當前正在下載的小說不受影響）`)) {
          downloadQueue.clearPending();
          eventBus.emit('toast', { message: '已清空所有等待中的排程小說' });
        }
      });
    }

    // 事件委派處理所有佇列按鈕點擊 (⚡ 插隊, ⬆️ 上移, ⬇️ 下移, ❌ 取消/放棄, ⏸️ 暫停, ▶️ 繼續)
    if (this.queueContainer) {
      this.queueContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const taskId = btn.dataset.taskId;
        if (!taskId) return;

        if (btn.classList.contains('btn-queue-prioritize')) {
          downloadQueue.prioritize(taskId);
          const task = downloadQueue.getAllTasks().find(t => t.id === taskId);
          eventBus.emit('toast', { message: `⚡ 已將《${task ? task.bookTitle : '小說'}》優先插隊！` });
        } else if (btn.classList.contains('btn-queue-up')) {
          downloadQueue.moveUp(taskId);
        } else if (btn.classList.contains('btn-queue-down')) {
          downloadQueue.moveDown(taskId);
        } else if (btn.classList.contains('btn-queue-cancel') || btn.classList.contains('btn-queue-cancel-task')) {
          const task = downloadQueue.getAllTasks().find(t => t.id === taskId);
          const taskName = task ? task.bookTitle : '小說';
          if (confirm(`確定要放棄/取消《${taskName}》的下載嗎？`)) {
            downloadQueue.cancelTask(taskId);
            eventBus.emit('toast', { message: `已取消《${taskName}》下載` });
          }
        } else if (btn.classList.contains('btn-queue-pause-task')) {
          downloadQueue.pauseActive();
        } else if (btn.classList.contains('btn-queue-resume')) {
          downloadQueue.resumeTask(taskId);
        }
      });
    }
  }

  renderQueueUI() {
    if (!this.queueContainer) return;

    const activeTask = downloadQueue.getActiveTask();
    const pendingTasks = downloadQueue.getPendingTasks();

    const hasVisibleTasks = !!activeTask || pendingTasks.length > 0;

    if (!hasVisibleTasks) {
      this.queueContainer.style.display = 'none';
      if (this.queueBadgeCount) this.queueBadgeCount.textContent = '0';
      if (this.btnCancel) this.btnCancel.style.display = 'none';
      return;
    }

    this.queueContainer.style.display = 'block';
    const totalInFlight = (activeTask ? 1 : 0) + pendingTasks.length;
    if (this.queueBadgeCount) this.queueBadgeCount.textContent = String(totalInFlight);

    // 1. 渲染當前活躍任務
    if (this.queueActiveSection) {
      if (activeTask) {
        this.queueActiveSection.style.display = 'block';
        const pct = activeTask.progress ? activeTask.progress.percent : 0;
        const msg = activeTask.progress ? activeTask.progress.message : '下載中...';
        const totalCh = activeTask.selectedChapters ? activeTask.selectedChapters.length : (activeTask.progress?.total || 0);

        let typeBadgeText = '⚡ 正在下載';
        if (activeTask.taskType === 'incremental') {
          typeBadgeText = '🔄 增量追更中';
        } else if (activeTask.taskType === 'redownload') {
          typeBadgeText = '🔄 重新下載中';
        }

        this.queueActiveSection.innerHTML = `
          <div class="queue-active-card">
            <div class="queue-active-header">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="queue-pulsing-dot" title="下載中"></span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">《${this.escapeStr(activeTask.bookTitle)}》</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">作者: ${this.escapeStr(activeTask.author || '未知')}</span>
                <span class="queue-order-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">${typeBadgeText} (共 ${totalCh} 章)</span>
              </div>
              <div class="queue-item-actions">
                <button type="button" class="btn btn-secondary btn-sm btn-queue-pause-task" data-task-id="${activeTask.id}" title="暫停此小說（保留進度至斷點）">⏸️ 暫停</button>
                <button type="button" class="btn btn-danger btn-sm btn-queue-cancel-task" data-task-id="${activeTask.id}" title="中斷並取消此小說">❌ 取消</button>
              </div>
            </div>
            <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span id="queue-active-status-msg">${this.escapeStr(msg)}</span>
              <span id="queue-active-pct-text">${pct}%</span>
            </div>
            <div class="progress-track" style="margin-top: 4px; height: 6px;">
              <div id="queue-active-progress-fill" class="progress-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      } else {
        this.queueActiveSection.style.display = 'none';
        this.queueActiveSection.innerHTML = '';
      }
    }

    // 2. 渲染等待與排程中的任務清單
    if (this.queuePendingList) {
      if (pendingTasks.length === 0) {
        this.queuePendingList.innerHTML = activeTask
          ? '<div style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 0.6rem 0;">佇列中無其他等待下載的小說</div>'
          : '<div style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 0.6rem 0;">下載佇列目前為空</div>';
      } else {
        let listHtml = '';
        pendingTasks.forEach((task, idx) => {
          const isPaused = (task.status === 'paused');
          const totalCh = task.selectedChapters ? task.selectedChapters.length : (task.progress?.total || 0);
          const statusTag = isPaused
            ? '<span class="queue-status-tag paused">⏸️ 暫停中</span>'
            : '<span class="queue-status-tag pending">⏳ 等待中</span>';

          let typeTag = '';
          if (task.taskType === 'incremental') {
            typeTag = '<span class="queue-status-tag" style="background: rgba(59, 130, 246, 0.18); color: #3b82f6;">🔄 追更</span>';
          } else if (task.taskType === 'redownload') {
            typeTag = '<span class="queue-status-tag" style="background: rgba(168, 85, 247, 0.18); color: #a855f7;">🔄 重載</span>';
          } else {
            typeTag = '<span class="queue-status-tag" style="background: rgba(16, 185, 129, 0.18); color: #10b981;">📥 全書</span>';
          }

          listHtml += `
            <div class="queue-item" data-task-id="${task.id}">
              <div class="queue-item-info">
                <div class="queue-item-title-row">
                  <span class="queue-order-badge">#${idx + 1}</span>
                  ${typeTag}
                  ${statusTag}
                  <span class="queue-item-title">《${this.escapeStr(task.bookTitle)}》</span>
                  <span class="queue-item-author">作者: ${this.escapeStr(task.author || '未知')}</span>
                </div>
                <div class="queue-item-sub">
                  <span>章節數: ${totalCh} 章</span>
                  <span>狀態: ${this.escapeStr(task.progress?.message || '等待下載')}</span>
                </div>
              </div>
              <div class="queue-item-actions">
                ${isPaused ? `<button type="button" class="btn btn-secondary btn-sm btn-queue-resume" data-task-id="${task.id}" title="繼續此小說下載">▶️ 繼續</button>` : ''}
                <button type="button" class="btn-queue-prioritize" data-task-id="${task.id}" title="立即暫停當前小說，優先插隊下載此書">⚡ 插隊</button>
                <button type="button" class="btn btn-secondary btn-sm btn-queue-up" data-task-id="${task.id}" title="上移排序" ${idx === 0 ? 'disabled' : ''}>⬆️</button>
                <button type="button" class="btn btn-secondary btn-sm btn-queue-down" data-task-id="${task.id}" title="下移排序" ${idx === pendingTasks.length - 1 ? 'disabled' : ''}>⬇️</button>
                <button type="button" class="btn btn-danger btn-sm btn-queue-cancel" data-task-id="${task.id}" title="放棄並移出佇列">❌</button>
              </div>
            </div>
          `;
        });
        this.queuePendingList.innerHTML = listHtml;
      }
    }
  }

  handleQueueStarted(data) {
    if (!data || !data.task) return;
    const task = data.task;

    if (this.progressContainer) {
      this.progressContainer.style.display = 'block';
    }
    if (this.progressFill) {
      this.progressFill.style.width = '0%';
    }
    const actionLabel = task.taskType === 'incremental' ? '追更' : '下載';
    if (this.statusText) {
      this.statusText.textContent = `[0%] 準備開始${actionLabel}《${task.bookTitle}》...`;
    }
    this.appendLog(`📥 開始執行佇列任務：《${task.bookTitle}》（${actionLabel}共 ${task.selectedChapters ? task.selectedChapters.length : 0} 章）`);
    if (this.btnCancel) {
      this.btnCancel.style.display = 'inline-block';
    }
  }

  handleQueueProgress(data) {
    if (!data || !data.task || !data.info) return;
    const { task, info } = data;

    if (info.status === 'downloading') {
      if (this.progressFill) this.progressFill.style.width = `${info.percent}%`;
      if (this.statusText) this.statusText.textContent = `[${info.percent}%] ${info.message} (${task.bookTitle})`;
      const logVerb = task.taskType === 'incremental' ? '已追加' : '已儲存';
      if (info.title) this.appendLog(`✔ [${task.bookTitle}] ${logVerb}: ${info.title}`);

      const activeMsg = document.getElementById('queue-active-status-msg');
      if (activeMsg) activeMsg.textContent = info.message;
      const activePct = document.getElementById('queue-active-pct-text');
      if (activePct) activePct.textContent = `${info.percent}%`;
      const activeFill = document.getElementById('queue-active-progress-fill');
      if (activeFill) activeFill.style.width = `${info.percent}%`;
    } else if (info.status === 'completed') {
      if (this.progressFill) this.progressFill.style.width = '100%';
      if (this.statusText) this.statusText.textContent = info.message;
      this.appendLog(`🎉 [${task.bookTitle}] ${info.message}`);
    } else if (info.status === 'paused') {
      if (this.statusText) this.statusText.textContent = info.message;
      this.appendLog(`⏸️ [${task.bookTitle}] ${info.message}`);
    } else if (info.status === 'cancelled') {
      if (this.statusText) this.statusText.textContent = info.message;
      this.appendLog(`🛑 [${task.bookTitle}] ${info.message}`);
    }
  }

  escapeStr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

