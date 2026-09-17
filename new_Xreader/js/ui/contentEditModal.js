/**
 * new_Xreader - ContentEditModal (Story 21, GWT 21.2, 21.3, 21.4)
 * Manages single-chapter text editing and cross-chapter batch search/replace/removal.
 * Auto-pauses audio playback on modal launch to avoid race conditions.
 */

import { storage } from '../core/storage.js';
import { eventBus } from '../eventBus.js';
import { player } from '../audio/playerFactory.js';

export class ContentEditModal {
  constructor() {
    // Single Chapter Edit Modal
    this.editModal = document.getElementById('edit-chapter-modal');
    this.editTitleInput = document.getElementById('edit-chapter-title-input');
    this.editContentTextarea = document.getElementById('edit-chapter-content-textarea');
    this.btnCloseEdit = document.getElementById('btn-close-edit-chapter');
    this.btnCancelEdit = document.getElementById('btn-cancel-edit-chapter');
    this.btnSaveEdit = document.getElementById('btn-save-edit-chapter');

    // Batch Replace Modal
    this.batchModal = document.getElementById('batch-replace-modal');
    this.batchFindInput = document.getElementById('batch-find-input');
    this.batchReplaceInput = document.getElementById('batch-replace-input');
    this.batchPreviewBox = document.getElementById('batch-replace-preview-box');
    this.batchPreviewText = document.getElementById('batch-replace-preview-text');
    this.btnBatchPreview = document.getElementById('btn-batch-preview');
    this.btnCloseBatch = document.getElementById('btn-close-batch-replace');
    this.btnCancelBatch = document.getElementById('btn-cancel-batch-replace');
    this.btnConfirmBatch = document.getElementById('btn-confirm-batch-replace');

    // Context tracking
    this.currentBookId = null;
    this.currentChapter = null;
    this.currentChapterIndex = 0;
  }

  init() {
    this.bindEvents();

    eventBus.on('contentEdit:openChapter', (data) => {
      this.openChapterEdit(data.bookId, data.chapter);
    });

    eventBus.on('contentEdit:openBatchReplace', (data) => {
      this.openBatchReplace(data.bookId, data.chapterIndex, data.selectedText);
    });
  }

  bindEvents() {
    // Single Chapter Edit Events
    if (this.btnCloseEdit) {
      this.btnCloseEdit.addEventListener('click', () => this.closeChapterEdit());
    }
    if (this.btnCancelEdit) {
      this.btnCancelEdit.addEventListener('click', () => this.closeChapterEdit());
    }
    if (this.btnSaveEdit) {
      this.btnSaveEdit.addEventListener('click', () => this.saveChapterEdit());
    }

    // Batch Replace Events
    if (this.btnCloseBatch) {
      this.btnCloseBatch.addEventListener('click', () => this.closeBatchReplace());
    }
    if (this.btnCancelBatch) {
      this.btnCancelBatch.addEventListener('click', () => this.closeBatchReplace());
    }
    if (this.btnBatchPreview) {
      this.btnBatchPreview.addEventListener('click', () => this.previewBatchReplace());
    }
    if (this.btnConfirmBatch) {
      this.btnConfirmBatch.addEventListener('click', () => this.executeBatchReplace());
    }
    if (this.batchFindInput) {
      this.batchFindInput.addEventListener('input', () => {
        if (this.btnConfirmBatch) this.btnConfirmBatch.disabled = true;
        if (this.batchPreviewText) {
          this.batchPreviewText.textContent = '文字已更動，請點擊「預覽統計」';
        }
      });
    }
  }

  /**
   * 開啟單章編輯視窗 (GWT 21.2, GWT 21.3)
   */
  openChapterEdit(bookId, chapter) {
    if (!chapter) return;

    // GWT 21.2: Auto-pause playback to prevent conflicts
    player.pause();

    this.currentBookId = bookId;
    this.currentChapter = chapter;

    if (this.editTitleInput) {
      this.editTitleInput.value = chapter.title || '';
    }

    // Prepare content text
    let rawText = '';
    if (chapter.content) {
      if (typeof chapter.content === 'string') {
        rawText = chapter.content;
      } else if (Array.isArray(chapter.content)) {
        rawText = chapter.content.map(p => {
          if (typeof p === 'string') return p;
          if (p && p.sentences) {
            return p.sentences.map(s => (typeof s === 'string' ? s : s.text || '')).join('');
          }
          return '';
        }).join('\n\n');
      }
    } else if (chapter.paragraphs) {
      rawText = chapter.paragraphs.map(p => {
        return (p.sentences || []).map(s => (typeof s === 'string' ? s : s.text || '')).join('');
      }).join('\n\n');
    }

    if (this.editContentTextarea) {
      this.editContentTextarea.value = rawText;
    }

    if (this.editModal) {
      this.editModal.classList.add('active');
    }
  }

  closeChapterEdit() {
    if (this.editModal) {
      this.editModal.classList.remove('active');
    }
  }

  /**
   * 儲存單章內容修改 (GWT 21.3)
   */
  async saveChapterEdit() {
    if (!this.currentChapter) return;

    const newTitle = (this.editTitleInput ? this.editTitleInput.value : '').trim();
    const newContent = (this.editContentTextarea ? this.editContentTextarea.value : '').trim();

    if (!newContent) {
      alert('章節內文不得為空！');
      return;
    }

    try {
      const updated = await storage.updateChapterContent(this.currentChapter.id, newTitle, newContent);
      this.closeChapterEdit();

      eventBus.emit('reader:chapterContentUpdated', updated);
      eventBus.emit('toast', { message: `章節《${updated.title}》已成功儲存並重新分段！` });
    } catch (err) {
      console.error('Save chapter edit error:', err);
      alert(`儲存章節失敗: ${err.message}`);
    }
  }

  /**
   * 開啟批量搜尋與替換視窗 (GWT 21.2, GWT 21.4)
   */
  openBatchReplace(bookId, chapterIndex = 0, selectedText = '') {
    // GWT 21.2: Auto-pause playback
    player.pause();

    this.currentBookId = bookId;
    this.currentChapterIndex = chapterIndex;

    // Check if user has selected text in browser window
    let textToFind = selectedText;
    if (!textToFind) {
      const sel = window.getSelection ? window.getSelection().toString().trim() : '';
      if (sel) textToFind = sel;
    }

    if (this.batchFindInput) {
      this.batchFindInput.value = textToFind || '';
    }
    if (this.batchReplaceInput) {
      this.batchReplaceInput.value = '';
    }

    // Set scope default to current chapter if text was selected from reader
    const currentScopeRadio = document.querySelector('input[name="batch-replace-scope"][value="current"]');
    if (currentScopeRadio) currentScopeRadio.checked = true;

    if (this.btnConfirmBatch) {
      this.btnConfirmBatch.disabled = true;
    }

    if (this.batchPreviewText) {
      if (textToFind) {
        this.batchPreviewText.textContent = `已填入圈選文字「${textToFind.length > 20 ? textToFind.slice(0, 20) + '...' : textToFind}」，請點擊「預覽統計」`;
      } else {
        this.batchPreviewText.textContent = '請輸入要尋找的文字並點擊「預覽統計」';
      }
    }

    if (this.batchModal) {
      this.batchModal.classList.add('active');
    }

    // If text was selected, auto trigger preview
    if (textToFind) {
      this.previewBatchReplace();
    }
  }

  closeBatchReplace() {
    if (this.batchModal) {
      this.batchModal.classList.remove('active');
    }
  }

  getScope() {
    const checkedRadio = document.querySelector('input[name="batch-replace-scope"]:checked');
    return checkedRadio ? checkedRadio.value : 'current';
  }

  /**
   * 預覽統計符合數量 (GWT 21.4, GWT 22.3, GWT 23.2: 彈性空白與換行容錯比對)
   */
  async previewBatchReplace() {
    const rawFind = (this.batchFindInput ? this.batchFindInput.value : '').trim();
    if (!rawFind) {
      alert('請輸入要尋找的文字！');
      return;
    }

    const tokens = rawFind.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) {
      alert('請輸入有效的尋找文字！');
      return;
    }
    const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(escapedTokens.join('\\s+'), 'g');

    const scope = this.getScope();
    const chapters = await storage.getChaptersByBook(this.currentBookId);
    const targetChapters = (scope === 'current')
      ? chapters.filter(c => c.index === this.currentChapterIndex)
      : chapters;

    let totalMatches = 0;
    let chaptersWithMatch = 0;

    targetChapters.forEach(c => {
      const content = c.content || '';
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        totalMatches += matches.length;
        chaptersWithMatch++;
      }
    });

    if (this.batchPreviewText) {
      const scopeLabel = (scope === 'current') ? '當前章節' : `全書 ${chapters.length} 章`;
      if (totalMatches > 0) {
        this.batchPreviewText.innerHTML = `在 ${scopeLabel} 中共找到 <strong style="color: var(--accent-primary); font-size: 1rem;">${totalMatches}</strong> 處符合（涵蓋 ${chaptersWithMatch} 個章節）`;
        if (this.btnConfirmBatch) this.btnConfirmBatch.disabled = false;
      } else {
        this.batchPreviewText.innerHTML = `<span style="color: var(--text-muted);">在 ${scopeLabel} 中未找到任何相符文字。</span>`;
        if (this.btnConfirmBatch) this.btnConfirmBatch.disabled = true;
      }
    }
  }

  /**
   * 執行批量替換/清除 (GWT 21.4, GWT 22.3)
   */
  async executeBatchReplace() {
    const rawFind = (this.batchFindInput ? this.batchFindInput.value : '').trim();
    const rawReplace = this.batchReplaceInput ? this.batchReplaceInput.value : '';
    if (!rawFind) return;

    const findText = rawFind.replace(/\r\n/g, '\n');
    const replaceText = rawReplace.replace(/\r\n/g, '\n');

    const scope = this.getScope();
    const isDelete = (replaceText === '');
    const displayFind = findText.length > 25 ? findText.slice(0, 25) + '...' : findText;
    const actionDesc = isDelete ? '徹底清除' : `替換為「${replaceText}」`;
    const scopeDesc = (scope === 'current') ? '當前章節' : '全書所有章節';

    if (!confirm(`確定要在【${scopeDesc}】中將「${findText}」${actionDesc}嗎？\n此操作將直接寫入資料庫並重新分段。`)) {
      return;
    }

    try {
      const targetChapterIndex = (scope === 'current') ? this.currentChapterIndex : null;
      const result = await storage.batchReplaceBookContent(
        this.currentBookId,
        findText,
        replaceText,
        targetChapterIndex
      );

      this.closeBatchReplace();

      // Notify reader to reload chapter text and refresh in-memory chapters cache (GWT 24.1)
      eventBus.emit('reader:chapterContentUpdated', { refreshAll: true });

      const doneMsg = isDelete
        ? `已從 ${result.modifiedCount} 個章節中清除共 ${result.matchedCount} 處文字！`
        : `已在 ${result.modifiedCount} 個章節中替換共 ${result.matchedCount} 處文字！`;

      eventBus.emit('toast', { message: doneMsg });
    } catch (err) {
      console.error('Execute batch replace error:', err);
      alert(`批量替換失敗: ${err.message}`);
    }
  }
}
