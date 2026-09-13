/**
 * new_Xreader - ReaderView (ADR 0004, ADR 0005, Story 4, 6)
 * Renders paragraph-preserved text, handles mobile tap-scroll guard, and sentence highlighting.
 */

import { storage } from '../core/storage.js';
import { eventBus } from '../eventBus.js';
import { player } from '../audio/playerFactory.js';
import { TextSegmenter } from '../core/segmenter.js';

export class ReaderView {
  constructor() {
    this.panel = document.getElementById('reader-container');
    this.titleEl = document.getElementById('reader-book-title');
    this.chapterSelect = document.getElementById('reader-chapter-select');
    this.btnPrevChap = document.getElementById('btn-prev-chap');
    this.btnNextChap = document.getElementById('btn-next-chap');
    this.bodyEl = document.getElementById('reader-body');
    this.btnBackToShelf = document.getElementById('btn-back-to-shelf');

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
  }

  bindEvents() {
    if (this.btnBackToShelf) {
      this.btnBackToShelf.addEventListener('click', () => {
        this.hideReader();
        eventBus.emit('nav:switchTab', 'tab-bookshelf');
      });
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
    if (this.panel) this.panel.style.display = 'none';
    const shelf = document.getElementById('bookshelf-wrapper');
    if (shelf) shelf.style.display = 'block';
  }
}
