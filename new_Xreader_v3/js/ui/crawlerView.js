/**
 * new_Xreader - CrawlerView (Story 1, Story 8, GWT 1.1, 8.1, 8.2)
 * Handles Web sequential crawler, file ingestion, and paste text.
 */

import { crawler, DEFAULT_PROXIES } from '../core/crawler.js';
import { storage } from '../core/storage.js';
import { TextSegmenter } from '../core/segmenter.js';
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

    // File Ingestion Elements
    this.fileInput = document.getElementById('file-upload-input');
    this.dropzone = document.getElementById('file-dropzone');
    this.fileStatus = document.getElementById('file-upload-status');

    // Paste Text Elements
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
    this.bindEvents();
  }

  clearUrlInput() {
    if (this.urlInput) {
      this.urlInput.value = '';
      this.urlInput.setAttribute('autocomplete', 'off');
    }
  }

  initProxySettings() {
    const savedMode = localStorage.getItem('activeProxyMode') || 'local';
    const savedCustom = localStorage.getItem('customProxyTemplate') || '';

    if (this.proxySelect) {
      this.proxySelect.value = savedMode;
    }
    if (this.customProxyInput) {
      this.customProxyInput.value = savedCustom;
    }

    this.toggleCustomProxyUI(savedMode === 'custom');
  }

  toggleCustomProxyUI(show) {
    if (this.customProxyGroup) {
      this.customProxyGroup.style.display = show ? 'block' : 'none';
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
      });
    });

    // Proxy change
    if (this.proxySelect) {
      this.proxySelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        localStorage.setItem('activeProxyMode', mode);
        this.toggleCustomProxyUI(mode === 'custom');
      });
    }

    if (this.customProxyInput) {
      this.customProxyInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        localStorage.setItem('customProxyTemplate', val);
      });
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

    // File Dropzone
    this.bindFileEvents();

    // Paste Text
    if (this.btnLoadPaste) {
      this.btnLoadPaste.addEventListener('click', () => this.handlePasteImport());
    }
  }

  async handleStartCrawl() {
    const url = this.urlInput.value.trim();
    if (!url) {
      alert('請先輸入小說目錄網址！');
      return;
    }

    // Validate custom proxy if selected
    if (this.proxySelect.value === 'custom') {
      const customUrl = this.customProxyInput.value.trim();
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

    try {
      const book = await crawler.crawlBook(url, {
        delay,
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
        // Plain text file
        const text = await file.text();
        const bookTitle = file.name.replace(/\.[^/.]+$/, '');
        const bookId = `book_txt_${Date.now()}`;

        // Auto split chapters by standard headings (第...章)
        const chapterPattern = /(第[0-9一二三四五六七八九十百千]+[章回節卷部話][^\r\n]*)/g;
        const parts = text.split(chapterPattern);

        const chapters = [];
        if (parts.length > 1) {
          let cIdx = 0;
          for (let i = 1; i < parts.length; i += 2) {
            const chapTitle = parts[i].trim();
            const chapBody = (parts[i + 1] || '').trim();
            const { paragraphs, flatSentences } = TextSegmenter.segment(chapBody);
            chapters.push({
              id: `${bookId}_${cIdx}`,
              bookId,
              index: cIdx,
              title: chapTitle,
              content: chapBody,
              paragraphs,
              sentencesCount: flatSentences.length
            });
            cIdx++;
          }
        } else {
          // Whole text as single chapter
          const { paragraphs, flatSentences } = TextSegmenter.segment(text);
          chapters.push({
            id: `${bookId}_0`,
            bookId,
            index: 0,
            title: '全文',
            content: text,
            paragraphs,
            sentencesCount: flatSentences.length
          });
        }

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
    const title = this.pasteTitle.value.trim() || '自訂文字朗讀';
    const content = this.pasteContent.value.trim();

    if (!content) {
      alert('請先貼入文章內容！');
      return;
    }

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
      totalChapters: 1,
      downloadedChaptersCount: 1,
      lastChapterIndex: 0,
      lastSentenceIndex: 0
    };

    await storage.saveBook(book);
    await storage.saveChapter(chapter);

    this.pasteContent.value = '';
    eventBus.emit('bookshelf:refresh');
    eventBus.emit('toast', {
      message: `已新增貼上文本《${title}》！`,
      actionLabel: '前往書櫃閱讀',
      onAction: () => eventBus.emit('nav:switchTab', 'tab-bookshelf')
    });
  }

  appendLog(msg) {
    if (!this.logBox) return;
    const p = document.createElement('div');
    p.textContent = msg;
    this.logBox.appendChild(p);
    this.logBox.scrollTop = this.logBox.scrollHeight;
  }
}
