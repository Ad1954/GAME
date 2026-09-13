/**
 * new_Xreader - BookshelfView (Story 2, GWT 2.1, 2.2)
 * Manages bookshelf cards, single-book deletion, and export popup.
 */

import { storage } from '../core/storage.js';
import { eventBus } from '../eventBus.js';
import { TextSegmenter } from '../core/segmenter.js';

export class BookshelfView {
  constructor() {
    this.container = document.getElementById('bookshelf-grid');
    this.emptyState = document.getElementById('bookshelf-empty');

    // Bookshelf Direct Import
    this.btnImport = document.getElementById('btn-bookshelf-import');
    this.fileInput = document.getElementById('bookshelf-file-input');

    // Export Modal Elements
    this.exportModal = document.getElementById('export-modal');
    this.exportTitle = document.getElementById('export-modal-book-title');
    this.btnExportTxt = document.getElementById('btn-export-txt');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnCloseExport = document.getElementById('btn-close-export');
    this.currentExportBookId = null;
  }

  init() {
    this.loadBooks();
    this.bindEvents();

    eventBus.on('bookshelf:refresh', () => this.loadBooks());
  }

  bindEvents() {
    if (this.btnCloseExport) {
      this.btnCloseExport.addEventListener('click', () => this.closeExportModal());
    }

    if (this.btnExportTxt) {
      this.btnExportTxt.addEventListener('click', async () => {
        if (!this.currentExportBookId) return;
        try {
          const { blob, filename } = await storage.exportBookAsText(this.currentExportBookId);
          this.triggerDownload(blob, filename);
          this.closeExportModal();
        } catch (e) {
          alert(`匯出文字失敗: ${e.message}`);
        }
      });
    }

    if (this.btnExportJson) {
      this.btnExportJson.addEventListener('click', async () => {
        if (!this.currentExportBookId) return;
        try {
          const { blob, filename } = await storage.exportBookAsJson(this.currentExportBookId);
          this.triggerDownload(blob, filename);
          this.closeExportModal();
        } catch (e) {
          alert(`匯出備份失敗: ${e.message}`);
        }
      });
    }

    if (this.btnImport && this.fileInput) {
      this.btnImport.addEventListener('click', () => {
        this.fileInput.click();
      });

      this.fileInput.addEventListener('change', async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

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
            showProgress(`正在還原書籍資料: 《${file.name.replace(/\.[^/.]+$/, '')}》...`);
            const text = await file.text();
            const book = await storage.importBookFromJson(text, (done, total) => {
              updateProgress(done, total);
            });
            hideProgress();
            await this.loadBooks();
            eventBus.emit('toast', {
              message: `備份書籍《${book.title}》還原成功（共 ${book.totalChapters} 章）！`,
              actionLabel: '前往閱讀',
              onAction: () => eventBus.emit('reader:openBook', book.id)
            });
            // Auto open book directly into reader (Story 13, GWT 13.2)
            eventBus.emit('reader:openBook', book.id);
          } else if (file.name.endsWith('.txt')) {
            showProgress(`正在解析純文字小說: 《${file.name}》...`);
            const text = await file.text();
            const bookTitle = file.name.replace(/\.[^/.]+$/, '');
            const bookId = `book_txt_${Date.now()}`;
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
            for (let i = 0; i < chapters.length; i++) {
              await storage.saveChapter(chapters[i]);
              if (i % 20 === 0 || i === chapters.length - 1) {
                updateProgress(i + 1, chapters.length);
              }
            }
            hideProgress();
            await this.loadBooks();
            eventBus.emit('toast', {
              message: `書籍《${bookTitle}》匯入成功（共 ${chapters.length} 章）！`,
              actionLabel: '前往閱讀',
              onAction: () => eventBus.emit('reader:openBook', book.id)
            });
            eventBus.emit('reader:openBook', book.id);
          } else {
            alert('僅支援 .json 備份檔與 .txt 純文字檔');
          }
        } catch (err) {
          hideProgress();
          console.error('Bookshelf import error:', err);
          alert(`匯入失敗: ${err.message}`);
        } finally {
          this.fileInput.value = '';
        }
      });
    }
  }

  async loadBooks() {
    if (!this.container) return;
    const books = await storage.getAllBooks();

    if (books.length === 0) {
      this.container.innerHTML = '';
      if (this.emptyState) this.emptyState.style.display = 'block';
      return;
    }

    if (this.emptyState) this.emptyState.style.display = 'none';
    this.container.innerHTML = '';

    books.forEach(book => {
      const card = this.createBookCard(book);
      this.container.appendChild(card);
    });
  }

  createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.id = book.id;

    const readProgress = book.totalChapters > 0
      ? `進度: 第 ${(book.lastChapterIndex || 0) + 1} / ${book.totalChapters} 章`
      : '單篇文章';

    card.innerHTML = `
      <div class="book-card-header">
        <h4 class="book-card-title" title="${book.title}">${book.title}</h4>
        <span class="book-card-badge">${book.sourceType || '本地'}</span>
      </div>
      <div class="book-card-author">作者: ${book.author || '未知'}</div>
      <div class="book-card-meta">${readProgress}</div>
      <div class="book-card-actions">
        <button class="btn btn-primary btn-sm btn-open-book" title="開始閱讀與聽書">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          閱讀
        </button>
        <button class="btn btn-secondary btn-sm btn-export-book" title="匯出純文字或備份檔">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          匯出
        </button>
        <button class="btn btn-danger btn-sm btn-delete-book" title="刪除本項書籍">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          刪除
        </button>
      </div>
    `;

    // Bind card actions
    card.querySelector('.btn-open-book').addEventListener('click', () => {
      eventBus.emit('reader:openBook', book.id);
    });

    card.querySelector('.btn-export-book').addEventListener('click', () => {
      this.openExportModal(book);
    });

    card.querySelector('.btn-delete-book').addEventListener('click', async () => {
      if (confirm(`確定要徹底刪除書籍《${book.title}》與所有章節內容嗎？此操作無法復原。`)) {
        await storage.deleteBook(book.id);
        this.loadBooks();
        eventBus.emit('reader:bookDeleted', book.id);
      }
    });

    return card;
  }

  openExportModal(book) {
    this.currentExportBookId = book.id;
    if (this.exportTitle) {
      this.exportTitle.textContent = `匯出書籍: 《${book.title}》`;
    }
    if (this.exportModal) {
      this.exportModal.classList.add('active');
    }
  }

  closeExportModal() {
    this.currentExportBookId = null;
    if (this.exportModal) {
      this.exportModal.classList.remove('active');
    }
  }

  triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
