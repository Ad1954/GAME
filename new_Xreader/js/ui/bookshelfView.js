/**
 * new_Xreader - BookshelfView (Story 2, GWT 2.1, 2.2)
 * Manages bookshelf cards, single-book deletion, and export popup.
 */

import { storage } from '../core/storage.js';
import { eventBus } from '../eventBus.js';
import { TextSegmenter } from '../core/segmenter.js';
import { TxtParser } from '../core/txtParser.js';

export class BookshelfView {
  constructor() {
    this.container = document.getElementById('bookshelf-categories-container') || document.getElementById('bookshelf-grid');
    this.emptyState = document.getElementById('bookshelf-empty');
    this.totalCountBadge = document.getElementById('bookshelf-total-count-badge');
    this.btnAddCategory = document.getElementById('btn-add-category');

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

    // Category Rename Modal
    this.catRenameModal = document.getElementById('category-rename-modal');
    this.catRenameInput = document.getElementById('cat-rename-input');
    this.btnConfirmCatRename = document.getElementById('btn-confirm-cat-rename');
    this.btnCancelCatRename = document.getElementById('btn-cancel-cat-rename');
    this.btnCloseCatRename = document.getElementById('btn-close-cat-rename');
    this.currentRenameCatId = null;

    // Move Book Category Modal
    this.moveBookModal = document.getElementById('move-book-category-modal');
    this.moveBookTitle = document.getElementById('move-book-modal-title');
    this.moveBookCatSelect = document.getElementById('move-book-cat-select');
    this.btnConfirmMoveBook = document.getElementById('btn-confirm-move-book');
    this.btnCancelMoveBook = document.getElementById('btn-cancel-move-book');
    this.btnCloseMoveBook = document.getElementById('btn-close-move-book');
    this.currentMoveBookId = null;

    // Track collapsed category state
    this.collapsedCategories = new Set();
  }

  init() {
    this.loadBooks();
    this.bindEvents();

    eventBus.on('bookshelf:refresh', () => this.loadBooks());
  }

  bindEvents() {
    // Add Category
    if (this.btnAddCategory) {
      this.btnAddCategory.addEventListener('click', () => {
        const newCat = storage.createCategory();
        this.loadBooks();
        eventBus.emit('category:changed');
        eventBus.emit('bookshelf:refresh');
        eventBus.emit('toast', {
          message: `已新增書櫃分類「${newCat.name}」！`
        });
      });
    }

    // Category Rename Modal Events
    if (this.btnCancelCatRename) {
      this.btnCancelCatRename.addEventListener('click', () => this.closeCatRenameModal());
    }
    if (this.btnCloseCatRename) {
      this.btnCloseCatRename.addEventListener('click', () => this.closeCatRenameModal());
    }
    if (this.btnConfirmCatRename) {
      this.btnConfirmCatRename.addEventListener('click', () => {
        if (!this.currentRenameCatId) return;
        const newName = (this.catRenameInput ? this.catRenameInput.value : '').trim();
        if (!newName) {
          alert('分類名稱不能為空！');
          return;
        }
        try {
          storage.updateCategory(this.currentRenameCatId, { name: newName });
          this.closeCatRenameModal();
          this.loadBooks();
          eventBus.emit('category:changed');
          eventBus.emit('bookshelf:refresh');
          eventBus.emit('toast', { message: `分類名稱已更新為「${newName}」！` });
        } catch (e) {
          alert(e.message);
        }
      });
    }

    // Move Book Modal Events
    if (this.btnCancelMoveBook) {
      this.btnCancelMoveBook.addEventListener('click', () => this.closeMoveBookModal());
    }
    if (this.btnCloseMoveBook) {
      this.btnCloseMoveBook.addEventListener('click', () => this.closeMoveBookModal());
    }
    if (this.btnConfirmMoveBook) {
      this.btnConfirmMoveBook.addEventListener('click', async () => {
        if (!this.currentMoveBookId || !this.moveBookCatSelect) return;
        const targetCatId = this.moveBookCatSelect.value;
        try {
          await storage.updateBookCategory(this.currentMoveBookId, targetCatId);
          this.closeMoveBookModal();
          this.loadBooks();
          eventBus.emit('bookshelf:refresh'); // Story 36: 通知爬蟲面板與其他檢視即時重新整理紀錄
          eventBus.emit('toast', { message: '書籍分類已成功變更！' });
        } catch (e) {
          alert(`移動失敗: ${e.message}`);
        }
      });
    }

    // Export Modal Events
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

    // Bookshelf Direct Import
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
            eventBus.emit('reader:openBook', book.id);
          } else if (file.name.endsWith('.txt')) {
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
              categoryId: 'uncategorized',
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

  /**
   * 載入分類手風琴與書籍卡片 (Story 28)
   */
  async loadBooks() {
    if (!this.container) return;
    const books = await storage.getAllBooks();
    const categories = storage.getCategories();

    // 更新頂部總藏書量徽章
    if (this.totalCountBadge) {
      this.totalCountBadge.textContent = `總藏書: ${books.length} 本`;
    }

    if (books.length === 0 && categories.length <= 1) {
      this.container.innerHTML = '';
      if (this.emptyState) this.emptyState.style.display = 'block';
      return;
    }

    if (this.emptyState) this.emptyState.style.display = 'none';
    this.container.innerHTML = '';

    // 書籍按分類分組
    const catMap = new Map();
    categories.forEach(c => catMap.set(c.id, []));

    books.forEach(b => {
      const cId = b.categoryId || 'uncategorized';
      if (catMap.has(cId)) {
        catMap.get(cId).push(b);
      } else {
        // 若找不到該分類，自動落回未分類
        if (!catMap.has('uncategorized')) catMap.set('uncategorized', []);
        catMap.get('uncategorized').push(b);
      }
    });

    // 渲染各分類區塊
    categories.forEach((cat, index) => {
      const catBooks = catMap.get(cat.id) || [];
      const section = this.createCategorySection(cat, catBooks, index, categories.length);
      this.container.appendChild(section);
    });
  }

  /**
   * 建立單一分類手風琴節點 (Story 28)
   */
  createCategorySection(category, books, index, totalCategories) {
    const section = document.createElement('div');
    section.className = 'category-section';
    section.dataset.catId = category.id;

    const isCollapsed = this.collapsedCategories.has(category.id);
    if (isCollapsed) {
      section.classList.add('collapsed');
    }

    const isDefault = category.id === 'uncategorized';

    // Header HTML
    section.innerHTML = `
      <div class="category-header">
        <div class="category-header-left">
          <svg class="category-toggle-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <h4 class="category-title">${category.name}</h4>
          <span class="category-count-badge">${books.length} 本</span>
        </div>
        <div class="category-header-actions" onclick="event.stopPropagation()">
          <button class="btn-cat-action btn-cat-up" title="上移分類" ${index === 0 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button class="btn-cat-action btn-cat-down" title="下移分類" ${index === totalCategories - 1 ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button class="btn-cat-action btn-cat-rename" title="編輯分類名稱" ${isDefault ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-cat-action btn-cat-delete" title="刪除此分類 (書籍自動安全移至未分類)" ${isDefault ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="category-body">
        <div class="bookshelf-grid"></div>
      </div>
    `;

    // Toggle Collapse
    const header = section.querySelector('.category-header');
    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
      if (section.classList.contains('collapsed')) {
        this.collapsedCategories.add(category.id);
      } else {
        this.collapsedCategories.delete(category.id);
      }
    });

    // Up / Down Reorder
    const btnUp = section.querySelector('.btn-cat-up');
    if (btnUp && !btnUp.disabled) {
      btnUp.addEventListener('click', () => this.handleCategoryMove(category.id, -1));
    }

    const btnDown = section.querySelector('.btn-cat-down');
    if (btnDown && !btnDown.disabled) {
      btnDown.addEventListener('click', () => this.handleCategoryMove(category.id, 1));
    }

    // Rename
    const btnRename = section.querySelector('.btn-cat-rename');
    if (btnRename && !btnRename.disabled) {
      btnRename.addEventListener('click', () => this.openCatRenameModal(category));
    }

    // Delete Safe
    const btnDelete = section.querySelector('.btn-cat-delete');
    if (btnDelete && !btnDelete.disabled) {
      btnDelete.addEventListener('click', async () => {
        if (confirm(`確定要刪除分類「${category.name}」嗎？\n\n該分類下的 ${books.length} 本書籍將自動安全移入「未分類」，絕不會被刪除。`)) {
          const { movedBooksCount } = await storage.deleteCategorySafe(category.id);
          this.loadBooks();
          eventBus.emit('category:changed');
          eventBus.emit('bookshelf:refresh');
          eventBus.emit('toast', {
            message: `分類「${category.name}」已刪除，${movedBooksCount} 本書籍已安全歸入「未分類」。`
          });
        }
      });
    }

    // Render book cards inside this category
    const grid = section.querySelector('.bookshelf-grid');
    if (books.length === 0) {
      grid.innerHTML = '<div class="category-empty-hint">此分類目前沒有書籍，可點選書籍卡片的「移至」按鈕將書籍挪入此處。</div>';
    } else {
      books.forEach(book => {
        const card = this.createBookCard(book, category);
        grid.appendChild(card);
      });
    }

    return section;
  }

  handleCategoryMove(catId, delta) {
    const cats = storage.getCategories();
    const idx = cats.findIndex(c => c.id === catId);
    if (idx === -1) return;

    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= cats.length) return;

    // Swap
    const temp = cats[idx];
    cats[idx] = cats[targetIdx];
    cats[targetIdx] = temp;

    storage.reorderCategories(cats.map(c => c.id));
    this.loadBooks();
    eventBus.emit('category:changed');
    eventBus.emit('bookshelf:refresh');
  }

  openCatRenameModal(category) {
    this.currentRenameCatId = category.id;
    if (this.catRenameInput) {
      this.catRenameInput.value = category.name;
    }
    if (this.catRenameModal) {
      this.catRenameModal.classList.add('active');
      if (this.catRenameInput) {
        setTimeout(() => this.catRenameInput.focus(), 50);
      }
    }
  }

  closeCatRenameModal() {
    this.currentRenameCatId = null;
    if (this.catRenameModal) {
      this.catRenameModal.classList.remove('active');
    }
  }

  openMoveBookModal(book) {
    this.currentMoveBookId = book.id;
    if (this.moveBookTitle) {
      this.moveBookTitle.textContent = `將《${book.title}》移至分類`;
    }

    if (this.moveBookCatSelect) {
      this.moveBookCatSelect.innerHTML = '';
      const categories = storage.getCategories();
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name + (c.isDefault ? ' (預設)' : '');
        if (c.id === (book.categoryId || 'uncategorized')) {
          opt.selected = true;
        }
        this.moveBookCatSelect.appendChild(opt);
      });
    }

    if (this.moveBookModal) {
      this.moveBookModal.classList.add('active');
    }
  }

  closeMoveBookModal() {
    this.currentMoveBookId = null;
    if (this.moveBookModal) {
      this.moveBookModal.classList.remove('active');
    }
  }

  createBookCard(book, currentCat) {
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
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          閱讀
        </button>
        <button class="btn btn-secondary btn-sm btn-move-book" title="移動至其他書櫃分類">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          移至
        </button>
        <button class="btn btn-secondary btn-sm btn-manage-book" title="章節管理 (分割書籍、重排順序)">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          管理
        </button>
        <button class="btn btn-secondary btn-sm btn-export-book" title="匯出純文字或備份檔">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          匯出
        </button>
        <button class="btn btn-danger btn-sm btn-delete-book" title="刪除本項書籍">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;

    // Bind card actions
    card.querySelector('.btn-open-book').addEventListener('click', () => {
      eventBus.emit('reader:openBook', book.id);
    });

    card.querySelector('.btn-move-book').addEventListener('click', () => {
      this.openMoveBookModal(book);
    });

    card.querySelector('.btn-manage-book').addEventListener('click', () => {
      eventBus.emit('chapterManager:open', book.id);
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

