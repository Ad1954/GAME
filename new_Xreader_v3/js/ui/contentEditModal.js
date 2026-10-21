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

    // Story 47: 單次還原備份按鈕
    this.btnRestoreBatch = document.getElementById('btn-restore-batch-replace');
    this.restoreTimeText = document.getElementById('restore-replace-time');

    // Story 48: 批量替換二次自訂確認彈窗
    this.confirmModal = document.getElementById('batch-replace-confirm-modal');
    this.confirmScopeText = document.getElementById('batch-confirm-scope');
    this.confirmFindText = document.getElementById('batch-confirm-find');
    this.confirmReplaceText = document.getElementById('batch-confirm-replace');
    this.confirmStatsText = document.getElementById('batch-confirm-stats');
    this.btnProceedConfirm = document.getElementById('btn-proceed-batch-confirm');
    this.btnCancelConfirm = document.getElementById('btn-cancel-batch-confirm');
    this.btnCloseConfirm = document.getElementById('btn-close-batch-confirm');

    // Context tracking
    this.currentBookId = null;
    this.currentChapter = null;
    this.currentChapterIndex = 0;
    this.lastPreviewStats = null;
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
    if (this.btnRestoreBatch) {
      this.btnRestoreBatch.addEventListener('click', () => this.handleRestoreBatchReplace());
    }
    if (this.btnProceedConfirm) {
      this.btnProceedConfirm.addEventListener('click', () => this.proceedBatchReplace());
    }
    if (this.btnCancelConfirm) {
      this.btnCancelConfirm.addEventListener('click', () => this.closeConfirmModal());
    }
    if (this.btnCloseConfirm) {
      this.btnCloseConfirm.addEventListener('click', () => this.closeConfirmModal());
    }
    if (this.batchFindInput) {
      this.batchFindInput.addEventListener('input', () => {
        if (this.btnConfirmBatch) this.btnConfirmBatch.disabled = true;
        this.lastPreviewStats = null;
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

    // Story 47: 檢查該書是否有單次可還原備份快照
    this.checkRestoreBackupAvailability();

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
   * 檢查是否有單次批量替換備份可供還原 (Story 47)
   */
  async checkRestoreBackupAvailability() {
    if (!this.btnRestoreBatch) return;
    try {
      const backup = await storage.getBatchReplaceBackup(this.currentBookId);
      if (backup && Array.isArray(backup.originalChapters) && backup.originalChapters.length > 0) {
        this.btnRestoreBatch.style.display = 'inline-flex';
        const d = new Date(backup.timestamp);
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        if (this.restoreTimeText) {
          const sample = backup.findText.length > 6 ? backup.findText.slice(0, 6) + '..' : backup.findText;
          this.restoreTimeText.textContent = `${backup.originalChapters.length}章「${sample}」${timeStr}`;
        }
      } else {
        this.btnRestoreBatch.style.display = 'none';
      }
    } catch (e) {
      this.btnRestoreBatch.style.display = 'none';
    }
  }

  /**
   * 執行一鍵還原上次批量替換快照 (Story 47)
   */
  async handleRestoreBatchReplace() {
    const backup = await storage.getBatchReplaceBackup(this.currentBookId);
    if (!backup) return;

    if (!confirm(`確定要還原上次替換「${backup.findText}」時的備份嗎？\n將恢復 ${backup.originalChapters.length} 個章節的原始內容。`)) {
      return;
    }

    try {
      const res = await storage.restoreBatchReplaceBackup(this.currentBookId);
      eventBus.emit('reader:chapterContentUpdated', { refreshAll: true });
      eventBus.emit('toast', { message: `已成功將 ${res.restoredCount} 個章節還原為替換前狀態！` });
      if (this.btnRestoreBatch) this.btnRestoreBatch.style.display = 'none';
      this.closeBatchReplace();
    } catch (err) {
      console.error('Restore batch replace error:', err);
      alert(`還原失敗: ${err.message}`);
    }
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

    this.lastPreviewStats = {
      totalMatches,
      chaptersWithMatch,
      scope
    };

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
   * 彈出批量替換自訂危險警語確認視窗 (Story 48, GWT 48.1)
   */
  executeBatchReplace() {
    const rawFind = (this.batchFindInput ? this.batchFindInput.value : '').trim();
    const rawReplace = this.batchReplaceInput ? this.batchReplaceInput.value : '';
    if (!rawFind) return;

    const findText = rawFind.replace(/\r\n/g, '\n');
    const replaceText = rawReplace.replace(/\r\n/g, '\n');
    const scope = this.getScope();
    const isDelete = (replaceText === '');

    if (this.confirmModal) {
      if (this.confirmScopeText) {
        this.confirmScopeText.textContent = (scope === 'current') ? '當前章節' : '全書所有章節';
      }
      if (this.confirmFindText) {
        this.confirmFindText.textContent = findText.length > 50 ? findText.slice(0, 50) + '...' : findText;
      }
      if (this.confirmReplaceText) {
        this.confirmReplaceText.textContent = isDelete ? '（徹底清除該文字）' : (replaceText.length > 50 ? replaceText.slice(0, 50) + '...' : replaceText);
        this.confirmReplaceText.style.color = isDelete ? 'var(--accent-danger)' : 'var(--accent-success)';
      }
      if (this.confirmStatsText) {
        if (this.lastPreviewStats && this.lastPreviewStats.totalMatches > 0) {
          this.confirmStatsText.innerHTML = `預估共 <strong style="color: var(--accent-primary);">${this.lastPreviewStats.totalMatches}</strong> 處符合（涵蓋 ${this.lastPreviewStats.chaptersWithMatch} 個章節）`;
        } else {
          this.confirmStatsText.textContent = '即將掃描並處理符合內容';
        }
      }
      this.confirmModal.classList.add('active');
    } else {
      // 降級防護
      if (confirm(`確定要在【${(scope === 'current') ? '當前章節' : '全書所有章節'}】中將「${findText}」${isDelete ? '徹底清除' : `替換為「${replaceText}」`}嗎？`)) {
        this.proceedBatchReplace();
      }
    }
  }

  closeConfirmModal() {
    if (this.confirmModal) {
      this.confirmModal.classList.remove('active');
    }
  }

  /**
   * 正式執行批量替換與寫入資料庫 (Story 47, Story 48)
   */
  async proceedBatchReplace() {
    this.closeConfirmModal();

    const rawFind = (this.batchFindInput ? this.batchFindInput.value : '').trim();
    const rawReplace = this.batchReplaceInput ? this.batchReplaceInput.value : '';
    if (!rawFind) return;

    const findText = rawFind.replace(/\r\n/g, '\n');
    const replaceText = rawReplace.replace(/\r\n/g, '\n');
    const scope = this.getScope();
    const isDelete = (replaceText === '');

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
        ? `已從 ${result.modifiedCount} 個章節中清除共 ${result.matchedCount} 處文字！（已建立單次備份）`
        : `已在 ${result.modifiedCount} 個章節中替換共 ${result.matchedCount} 處文字！（已建立單次備份）`;

      eventBus.emit('toast', { message: doneMsg });
    } catch (err) {
      console.error('Execute batch replace error:', err);
      alert(`批量替換失敗: ${err.message}`);
    }
  }
}
