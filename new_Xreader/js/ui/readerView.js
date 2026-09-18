/**
 * new_Xreader - ReaderView (ADR 0004, ADR 0005, Story 4, 6)
 * Renders paragraph-preserved text, handles mobile tap-scroll guard, and sentence highlighting.
 */

import { storage } from '../core/storage.js';
import { eventBus } from '../eventBus.js';
import { player } from '../audio/playerFactory.js';
import { TextSegmenter } from '../core/segmenter.js';
import { logger } from '../core/logger.js';

export class ReaderView {
  constructor() {
    this.panel = document.getElementById('reader-container');
    this.titleEl = document.getElementById('reader-book-title');
    this.chapterSelect = document.getElementById('reader-chapter-select');
    this.btnPrevChap = document.getElementById('btn-prev-chap');
    this.btnNextChap = document.getElementById('btn-next-chap');
    this.bodyEl = document.getElementById('reader-body');
    this.btnBackToShelf = document.getElementById('btn-back-to-shelf');

    // Reader Content Edit Controls (Story 21, GWT 21.2)
    this.btnEditChapter = document.getElementById('btn-reader-edit-chapter');
    this.btnBatchReplace = document.getElementById('btn-reader-batch-replace');
    this.btnSplitChapter = document.getElementById('btn-reader-split-chapter');

    // Split Chapter Controls & Floating Button (Story 34, 方案 A)
    this.floatingSplitBtn = document.getElementById('reader-floating-split-btn');
    this.splitModal = document.getElementById('split-chapter-modal');
    this.splitModalTitleInput = document.getElementById('split-modal-new-title');
    this.splitModalPreview = document.getElementById('split-modal-sentence-preview');
    this.btnCloseSplitModal = document.getElementById('btn-close-split-modal');
    this.btnCancelSplitModal = document.getElementById('btn-cancel-split-chapter');
    this.btnConfirmSplitModal = document.getElementById('btn-confirm-split-chapter');

    this.pendingSplit = null;

    this.currentBook = null;
    this.currentChapters = [];
    this.currentChapter = null;
    this.currentSentenceIdx = 0;

    // Mobile tap guard tracking (ADR 0005)
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isTouchScrolling = false;
  }

  init() {
    this.bindEvents();

    eventBus.on('reader:openBook', (bookId) => this.openBook(bookId));
    eventBus.on('audio:sentenceChange', (data) => this.onSentenceChange(data));
    eventBus.on('audio:chapterEnd', () => this.handleNextChapter(true));
    eventBus.on('audio:requestNextChapter', () => this.handleNextChapter());
    eventBus.on('audio:requestPrevChapter', () => this.handlePrevChapter());

    // Story 21, 22: Chapter content updated / reordered live sync
    eventBus.on('reader:chapterContentUpdated', (updated) => this.reloadCurrentChapter(updated));
    eventBus.on('reader:chapterReordered', (data) => {
      if (this.currentBook && data && data.bookId === this.currentBook.id) {
        this.refreshBookChapters();
      }
    });
  }

  bindEvents() {
    if (this.btnBackToShelf) {
      this.btnBackToShelf.addEventListener('click', () => {
        this.hideReader();
        eventBus.emit('nav:switchTab', 'tab-bookshelf');
      });
    }

    // Story 21, GWT 21.2: Auto-pause player when opening Edit / Batch Replace
    if (this.btnEditChapter) {
      this.btnEditChapter.addEventListener('click', () => {
        player.pause();
        if (this.currentBook && this.currentChapter) {
          eventBus.emit('contentEdit:openChapter', {
            bookId: this.currentBook.id,
            chapter: this.currentChapter
          });
        }
      });
    }

    if (this.btnBatchReplace) {
      this.btnBatchReplace.addEventListener('click', () => {
        player.pause();
        const sel = window.getSelection ? window.getSelection().toString().trim() : '';
        if (this.currentBook) {
          eventBus.emit('contentEdit:openBatchReplace', {
            bookId: this.currentBook.id,
            chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
            selectedText: sel
          });
        }
      });
    }

    // Story 34 (方案 A): Split Chapter Event Listeners
    if (this.btnSplitChapter) {
      this.btnSplitChapter.addEventListener('click', () => this.openSplitModal());
    }

    if (this.floatingSplitBtn) {
      this.floatingSplitBtn.addEventListener('mousedown', (e) => {
        // Prevent selection from clearing when clicking floating button
        e.preventDefault();
      });
      this.floatingSplitBtn.addEventListener('click', () => this.openSplitModal());
    }

    if (this.btnCloseSplitModal) {
      this.btnCloseSplitModal.addEventListener('click', () => this.closeSplitModal());
    }
    if (this.btnCancelSplitModal) {
      this.btnCancelSplitModal.addEventListener('click', () => this.closeSplitModal());
    }
    if (this.btnConfirmSplitModal) {
      this.btnConfirmSplitModal.addEventListener('click', () => this.confirmSplitChapter());
    }

    // Floating button position tracker on text selection
    const handleSelection = () => {
      if (!this.floatingSplitBtn || !this.panel || this.panel.style.display === 'none') return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        this.floatingSplitBtn.style.display = 'none';
        return;
      }
      const range = sel.getRangeAt(0);
      if (!this.bodyEl || !this.bodyEl.contains(range.commonAncestorContainer)) {
        this.floatingSplitBtn.style.display = 'none';
        return;
      }
      const text = sel.toString().trim();
      if (text.length === 0) {
        this.floatingSplitBtn.style.display = 'none';
        return;
      }

      let startNode = range.startContainer;
      if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentElement;
      const sentenceEl = startNode ? startNode.closest('.sentence') : null;
      if (!sentenceEl || sentenceEl.dataset.idx === undefined) {
        this.floatingSplitBtn.style.display = 'none';
        return;
      }

      const rect = range.getBoundingClientRect();
      const topPos = Math.max(10, rect.top - 44);
      const leftPos = Math.max(10, Math.min(window.innerWidth - 180, rect.left + rect.width / 2 - 60));
      this.floatingSplitBtn.style.top = `${topPos}px`;
      this.floatingSplitBtn.style.left = `${leftPos}px`;
      this.floatingSplitBtn.style.display = 'flex';
    };

    document.addEventListener('selectionchange', handleSelection);
    if (this.bodyEl) {
      this.bodyEl.addEventListener('mouseup', handleSelection);
      this.bodyEl.addEventListener('touchend', () => setTimeout(handleSelection, 100));
    }

    if (this.chapterSelect) {
      this.chapterSelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        const wasPlaying = player.isPlaying;
        this.loadChapterByIndex(idx, 0, wasPlaying);
      });
    }

    if (this.btnPrevChap) {
      this.btnPrevChap.addEventListener('click', () => this.handlePrevChapter());
    }

    if (this.btnNextChap) {
      this.btnNextChap.addEventListener('click', () => this.handleNextChapter());
    }

    // Sentence tap interaction with mobile scroll guard (ADR 0005)
    if (this.bodyEl) {
      this.bodyEl.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isTouchScrolling = false;
      }, { passive: true });

      this.bodyEl.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        if (Math.hypot(dx, dy) > 8) {
          this.isTouchScrolling = true;
        }
      }, { passive: true });

      this.bodyEl.addEventListener('click', (e) => {
        if (this.isTouchScrolling) return; // Ignore if user was scrolling

        const span = e.target.closest('.sentence');
        if (span && span.dataset.idx !== undefined) {
          const targetIdx = parseInt(span.dataset.idx, 10);
          player.seekSentence(targetIdx);
        }
      });
    }
  }

  async openBook(bookId) {
    player.stop(); // Ensure audio engine is stopped before opening book (Story 14, GWT 14.2)
    const book = await storage.getBook(bookId);
    if (!book) return;

    this.currentBook = book;
    this.currentChapters = await storage.getChaptersByBook(bookId);

    if (this.titleEl) {
      this.titleEl.textContent = book.title;
    }

    if (!this.currentChapters || this.currentChapters.length === 0) {
      if (this.chapterSelect) {
        this.chapterSelect.innerHTML = '<option value="">(無章節內容)</option>';
      }
      if (this.bodyEl) {
        this.bodyEl.innerHTML = `
          <div style="text-align: center; padding: 4rem 1.5rem; max-width: 500px; margin: 0 auto;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h3 style="margin-bottom: 0.75rem; color: var(--text-primary);">本書目前尚無章節內容</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem;">
              這可能是先前匯入中斷、下載未完成或資料尚未寫入資料庫。請返回書櫃點擊右上角「匯入書籍 (JSON / TXT)」重新選取備份檔。
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button id="btn-empty-back-shelf" class="btn btn-primary btn-sm">返回書櫃重新匯入</button>
            </div>
          </div>
        `;
        const backBtn = this.bodyEl.querySelector('#btn-empty-back-shelf');
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            this.hideReader();
            eventBus.emit('nav:switchTab', 'tab-bookshelf');
          });
        }
      }
      this.showReader();
      return;
    }

    // Populate chapter select dropdown
    if (this.chapterSelect) {
      this.chapterSelect.innerHTML = '';
      this.currentChapters.forEach((chap, idx) => {
        const cIdx = (chap.index !== undefined) ? chap.index : idx;
        const opt = document.createElement('option');
        opt.value = cIdx;
        opt.textContent = chap.title || `第 ${cIdx + 1} 章`;
        this.chapterSelect.appendChild(opt);
      });
    }

    // Restore sentence-level progress (ADR 0004)
    const startChap = Math.min(book.lastChapterIndex || 0, Math.max(0, this.currentChapters.length - 1));
    const startSentence = book.lastSentenceIndex || 0;

    this.showReader();
    await this.loadChapterByIndex(startChap, startSentence, false);
  }

  ensureChapterSegmented(chapter) {
    if (!chapter) return;
    if ((!chapter.paragraphs || !Array.isArray(chapter.paragraphs) || chapter.paragraphs.length === 0) && chapter.content) {
      if (Array.isArray(chapter.content) && chapter.content.length > 0 && typeof chapter.content[0] === 'object' && chapter.content[0] !== null && Array.isArray(chapter.content[0].sentences)) {
        let gIdx = 0;
        chapter.paragraphs = chapter.content.map((p, pIdx) => ({
          id: pIdx,
          sentences: (p.sentences || []).map(s => ({
            globalIndex: gIdx++,
            text: (typeof s === 'object' && s !== null && s.text !== undefined) ? String(s.text).trim() : String(s).trim()
          }))
        }));
        chapter.sentencesCount = gIdx;
      } else {
        const raw = Array.isArray(chapter.content) ? chapter.content.map(s => String(s)).join('\n') : String(chapter.content || '');
        const seg = TextSegmenter.segment(raw);
        chapter.paragraphs = seg.paragraphs;
        chapter.sentencesCount = seg.flatSentences.length;
      }
      // Asynchronously update in DB to cache for future reads
      storage.saveChapter(chapter).catch(err => console.warn('Cache chapter error:', err));
    }
  }

  async loadChapterByIndex(chapIndex, sentenceIndex = 0, autoPlay = false) {
    if (!this.currentChapters || this.currentChapters.length === 0) return;
    const boundedIdx = Math.max(0, Math.min(chapIndex, this.currentChapters.length - 1));
    const chapter = this.currentChapters[boundedIdx];
    this.currentChapter = chapter;

    if (this.chapterSelect) {
      this.chapterSelect.value = boundedIdx;
    }

    // Double-guard: ensure chapter has paragraphs (Story 10, 11)
    this.ensureChapterSegmented(chapter);

    // Render paragraphs and sentences
    this.renderChapterText(chapter);

    // Load into audio engine
    player.loadChapter(chapter, sentenceIndex, this.currentBook ? this.currentBook.title : 'Xreader');

    // Update progress in DB (ADR 0004)
    if (this.currentBook) {
      await storage.updateProgress(this.currentBook.id, boundedIdx, sentenceIndex);
    }

    if (autoPlay) {
      player.play();
    }
  }

  renderChapterText(chapter) {
    if (!this.bodyEl) return;
    this.bodyEl.innerHTML = '';

    if (!chapter.paragraphs || chapter.paragraphs.length === 0) {
      this.bodyEl.innerHTML = '<p class="reader-empty-text">本章節無內文。</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    let fallbackIdx = 0;

    chapter.paragraphs.forEach(para => {
      const p = document.createElement('p');
      p.className = 'reader-paragraph';

      const sList = para.sentences || [];
      sList.forEach(s => {
        const span = document.createElement('span');
        span.className = 'sentence';

        const sIdx = (typeof s === 'object' && s !== null && s.globalIndex !== undefined)
          ? s.globalIndex
          : fallbackIdx;
        const sText = (typeof s === 'object' && s !== null && s.text !== undefined)
          ? s.text
          : String(s);

        span.dataset.idx = sIdx;
        span.textContent = sText;
        p.appendChild(span);
        fallbackIdx++;
      });

      fragment.appendChild(p);
    });

    this.bodyEl.appendChild(fragment);
  }

  onSentenceChange(data) {
    this.currentSentenceIdx = data.sentenceIndex;

    // Highlight active sentence
    if (this.bodyEl) {
      const prevActive = this.bodyEl.querySelector('.sentence.active-sentence');
      if (prevActive) {
        prevActive.classList.remove('active-sentence');
      }

      const currentEl = this.bodyEl.querySelector(`.sentence[data-idx="${data.sentenceIndex}"]`);
      if (currentEl) {
        currentEl.classList.add('active-sentence');
        currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Save sentence-level progress (ADR 0004)
    if (this.currentBook && this.currentChapter) {
      storage.updateProgress(this.currentBook.id, this.currentChapter.index, data.sentenceIndex);
    }
  }

  handleNextChapter(forceAutoPlay = null) {
    if (!this.currentChapter || !this.currentChapters) return;
    const nextIdx = this.currentChapter.index + 1;
    const shouldPlay = (typeof forceAutoPlay === 'boolean') ? forceAutoPlay : player.isPlaying;
    if (nextIdx < this.currentChapters.length) {
      this.loadChapterByIndex(nextIdx, 0, shouldPlay);
    } else {
      player.stop();
      eventBus.emit('toast', { message: '已達全書最後一章！' });
    }
  }

  handlePrevChapter(forceAutoPlay = null) {
    if (!this.currentChapter || !this.currentChapters) return;
    const prevIdx = this.currentChapter.index - 1;
    const shouldPlay = (typeof forceAutoPlay === 'boolean') ? forceAutoPlay : player.isPlaying;
    if (prevIdx >= 0) {
      this.loadChapterByIndex(prevIdx, 0, shouldPlay);
    }
  }

  showReader() {
    if (this.panel) this.panel.style.display = 'flex';
    const shelf = document.getElementById('bookshelf-wrapper');
    if (shelf) shelf.style.display = 'none';
  }

  hideReader() {
    if (this.floatingSplitBtn) this.floatingSplitBtn.style.display = 'none';
    if (this.panel) this.panel.style.display = 'none';
    const shelf = document.getElementById('bookshelf-wrapper');
    if (shelf) shelf.style.display = 'block';
  }

  /**
   * 重新載入當前章節 (Story 21, GWT 21.3, GWT 21.4, GWT 22.2, Story 24, GWT 24.1)
   * 於編輯章節或批次取代後自動調用
   */
  async reloadCurrentChapter(payload = null) {
    if (!this.currentBook || !this.currentChapter) return;
    try {
      const isRefreshAll = (payload && payload.refreshAll) || (!payload) || (payload && !payload.id && !payload.content);
      let updatedChapter = (payload && payload.id && payload.content) ? payload : null;

      if (isRefreshAll) {
        // GWT 24.1: 全書章節快取即時更新，解決切換下一章依然殘留舊內容問題
        const freshChapters = await storage.getChaptersByBook(this.currentBook.id);
        freshChapters.sort((a, b) => (a.index !== undefined ? a.index : 0) - (b.index !== undefined ? b.index : 0));
        this.currentChapters = freshChapters;

        const currentIdx = this.currentChapter.index;
        const freshCurrent = freshChapters.find(c => c.index === currentIdx) || freshChapters[currentIdx];
        if (freshCurrent) {
          updatedChapter = freshCurrent;
        }
        logger.info('Reader', `全書快取即時刷新完成 (共 ${freshChapters.length} 章)`);
      }

      let freshChap = updatedChapter;
      if (!freshChap) {
        freshChap = await storage.getChapter(this.currentBook.id, this.currentChapter.index);
      }
      if (freshChap) {
        this.currentChapter = freshChap;
        if (this.currentChapters && this.currentChapters.length > 0) {
          const idx = this.currentChapters.findIndex(c => c.id === freshChap.id);
          if (idx !== -1) {
            this.currentChapters[idx] = freshChap;
          }
        }
        if (this.chapterSelect) {
          const opt = this.chapterSelect.querySelector(`option[value="${this.currentChapter.index}"]`);
          if (opt) {
            opt.textContent = freshChap.title || `第 ${this.currentChapter.index + 1} 章`;
          }
        }
        this.renderChapterText(freshChap);
        player.loadChapter(freshChap, 0, this.currentBook.title);
        logger.info('Reader', `當前章節 [${freshChap.title || '第 ' + (freshChap.index + 1) + ' 章'}] 重新繪製完成`);
      }
    } catch (err) {
      console.warn('Reload chapter error:', err);
      logger.error('Reader', 'Reload chapter error: ' + err.message);
    }
  }

  /**
   * 重新整理書籍章節清單與選單 (Story 21, GWT 21.5, GWT 21.6)
   */
  async refreshBookChapters() {
    if (!this.currentBook) return;
    try {
      const chaps = await storage.getChaptersByBook(this.currentBook.id);
      chaps.sort((a, b) => (a.index !== undefined ? a.index : 0) - (b.index !== undefined ? b.index : 0));
      this.currentChapters = chaps;

      if (this.chapterSelect) {
        this.chapterSelect.innerHTML = '';
        chaps.forEach((chap, idx) => {
          const cIdx = (chap.index !== undefined) ? chap.index : idx;
          const opt = document.createElement('option');
          opt.value = cIdx;
          opt.textContent = chap.title || `第 ${cIdx + 1} 章`;
          this.chapterSelect.appendChild(opt);
        });
        if (this.currentChapter) {
          this.chapterSelect.value = this.currentChapter.index;
        }
      }
    } catch (err) {
      console.warn('Refresh book chapters error:', err);
    }
  }

  /**
   * 開啟手動分割章節確認彈窗 (Story 34, GWT 34.1, 34.3)
   */
  openSplitModal() {
    player.pause();
    if (!this.currentBook || !this.currentChapter) {
      alert('目前無開啟的書籍或章節！');
      return;
    }

    let targetSentenceIdx = -1;
    let suggestedTitle = '';
    let previewText = '';

    // 1. 優先檢查反白選取文字 (Selection)
    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      if (this.bodyEl && this.bodyEl.contains(range.commonAncestorContainer)) {
        let startNode = range.startContainer;
        if (startNode.nodeType === Node.TEXT_NODE) startNode = startNode.parentElement;
        const sentenceEl = startNode ? startNode.closest('.sentence') : null;
        if (sentenceEl && sentenceEl.dataset.idx !== undefined) {
          targetSentenceIdx = parseInt(sentenceEl.dataset.idx, 10);
          suggestedTitle = sel.toString().trim().slice(0, 40);
          previewText = sentenceEl.textContent || '';
        }
      }
    }

    // 2. 次要回退：使用目前閱讀游標/播放中句子
    if (targetSentenceIdx === -1) {
      if (typeof player.currentSentenceIndex === 'number' && player.currentSentenceIndex > 0) {
        targetSentenceIdx = player.currentSentenceIndex;
        const sentenceEl = this.bodyEl ? this.bodyEl.querySelector(`.sentence[data-idx="${targetSentenceIdx}"]`) : null;
        if (sentenceEl) {
          previewText = sentenceEl.textContent || '';
          suggestedTitle = previewText.slice(0, 40);
        }
      }
    }

    if (targetSentenceIdx === -1) {
      alert('請先在內文反白選取（或點擊選定）欲作為新章節開頭的文字！');
      return;
    }

    const totalSentences = this.currentChapter.sentencesCount || 1;
    if (targetSentenceIdx <= 0) {
      alert('無法在章節最前端（第 1 句）進行分割，避免產生空白章節！');
      return;
    }
    if (targetSentenceIdx >= totalSentences) {
      alert('無法在章節最末尾進行分割，避免產生空白章節！');
      return;
    }

    this.pendingSplit = {
      bookId: this.currentBook.id,
      chapterIndex: this.currentChapter.index,
      sentenceIndex: targetSentenceIdx
    };

    if (this.splitModalTitleInput) {
      this.splitModalTitleInput.value = suggestedTitle;
    }
    if (this.splitModalPreview) {
      this.splitModalPreview.textContent = `第 ${targetSentenceIdx + 1} 句：「${previewText}」`;
    }

    if (this.floatingSplitBtn) {
      this.floatingSplitBtn.style.display = 'none';
    }
    if (this.splitModal) {
      this.splitModal.classList.add('active');
    }
  }

  closeSplitModal() {
    if (this.splitModal) {
      this.splitModal.classList.remove('active');
    }
    this.pendingSplit = null;
  }

  async confirmSplitChapter() {
    if (!this.pendingSplit) return;
    const { bookId, chapterIndex, sentenceIndex } = this.pendingSplit;
    const newTitle = (this.splitModalTitleInput ? this.splitModalTitleInput.value : '').trim();

    try {
      const res = await storage.splitChapterAtSentence(bookId, chapterIndex, sentenceIndex, newTitle);
      this.closeSplitModal();

      // 重新整理書籍章節清單與選單
      await this.refreshBookChapters();

      // 自動跳轉至新切出的章節
      await this.loadChapterByIndex(res.newChapterIndex, 0, false);

      eventBus.emit('bookshelf:refresh');
      eventBus.emit('toast', {
        message: `章節已成功拆分！已開啟新章節《${res.newChapter.title}》`
      });
    } catch (err) {
      console.error('Split chapter error:', err);
      alert(`分割失敗: ${err.message}`);
    }
  }
}

