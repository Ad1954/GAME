/**
 * new_Xreader - ChapterManagerView (Story 21, GWT 21.5, 21.6)
 * Manages bookshelf chapter reordering (splice & shift) and batch deletion with smooth re-indexing.
 */

import { storage } from '../core/storage.js';
import { eventBus } from '../eventBus.js';

export class ChapterManagerView {
  constructor() {
    this.modal = document.getElementById('chapter-manager-modal');
    this.title = document.getElementById('chapter-manager-title');
    this.subtitle = document.getElementById('chapter-manager-subtitle');
    this.btnClose = document.getElementById('btn-close-chapter-manager');
    this.btnCancel = document.getElementById('btn-cancel-chapter-manager');

    this.filterInput = document.getElementById('chapter-filter-input');
    this.btnClearFilter = document.getElementById('btn-clear-chapter-filter');

    this.btnSelectAll = document.getElementById('btn-batch-select-all');
    this.btnDeselectAll = document.getElementById('btn-batch-deselect-all');
    this.btnDeleteSelected = document.getElementById('btn-delete-selected-chapters');
    this.selectedCountBadge = document.getElementById('selected-chapters-count');

    // Batch Move Elements (Story 22, GWT 22.4)
    this.batchActionsBar = document.getElementById('chapter-batch-actions-bar');
    this.batchSelectedCount = document.getElementById('batch-selected-count');
    this.btnBatchMoveEnd = document.getElementById('btn-batch-move-end');
    this.batchMoveTargetInput = document.getElementById('batch-move-target-input');
    this.btnBatchMoveTarget = document.getElementById('btn-batch-move-target');

    this.listContainer = document.getElementById('chapter-manager-list');
    this.reorderHint = document.getElementById('chapter-manager-reorder-hint');
    this.multiNotice = document.getElementById('chapter-manager-multi-notice');
    this.btnResetOrder = document.getElementById('btn-reset-chapter-order');
    this.btnSaveReorder = document.getElementById('btn-save-chapter-reorder');

    this.currentBook = null;
    this.originalChapters = [];
    this.chapters = [];
    this.selectedIds = new Set();
    this.isOrderDirty = false;
  }

  init() {
    this.bindEvents();
    eventBus.on('chapterManager:open', (bookId) => this.open(bookId));
  }

  bindEvents() {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }
    if (this.btnCancel) {
      this.btnCancel.addEventListener('click', () => this.close());
    }

    if (this.filterInput) {
      this.filterInput.addEventListener('input', () => {
        const val = this.filterInput.value.trim();
        if (this.btnClearFilter) {
          this.btnClearFilter.style.display = val ? 'inline-flex' : 'none';
        }
        this.renderList();
      });
    }

    if (this.btnClearFilter) {
      this.btnClearFilter.addEventListener('click', () => {
        if (this.filterInput) {
          this.filterInput.value = '';
          this.btnClearFilter.style.display = 'none';
          this.renderList();
        }
      });
    }

    if (this.btnSelectAll) {
      this.btnSelectAll.addEventListener('click', () => this.selectAllVisible());
    }

    if (this.btnDeselectAll) {
      this.btnDeselectAll.addEventListener('click', () => this.deselectAll());
    }

    if (this.btnDeleteSelected) {
      this.btnDeleteSelected.addEventListener('click', () => this.handleDeleteSelected());
    }

    // Batch Move Events (Story 22, GWT 22.4)
    if (this.btnBatchMoveEnd) {
      this.btnBatchMoveEnd.addEventListener('click', () => this.handleBatchMoveToEnd());
    }

    if (this.btnBatchMoveTarget) {
      this.btnBatchMoveTarget.addEventListener('click', () => this.handleBatchMoveToTarget());
    }

    if (this.btnSaveReorder) {
      this.btnSaveReorder.addEventListener('click', () => this.handleSaveReorder());
    }

    if (this.btnResetOrder) {
      this.btnResetOrder.addEventListener('click', () => this.handleResetOrder());
    }
  }

  async open(bookId) {
    const book = await storage.getBook(bookId);
    if (!book) return;

    this.currentBook = book;
    const chaps = await storage.getChaptersByBook(bookId);
    chaps.sort((a, b) => (a.index !== undefined ? a.index : 0) - (b.index !== undefined ? b.index : 0));

    this.originalChapters = chaps.map(c => ({ ...c }));
    this.chapters = chaps.map(c => ({ ...c }));
    this.selectedIds.clear();
    this.isOrderDirty = false;

    if (this.filterInput) this.filterInput.value = '';
    if (this.btnClearFilter) this.btnClearFilter.style.display = 'none';

    if (this.title) {
      this.title.textContent = `📚 章節管理: 《${book.title}》`;
    }

    this.updateDirtyUI();
    this.updateSelectionUI();
    this.renderList();

    if (this.modal) {
      this.modal.classList.add('active');
    }
  }

  close() {
    if (this.isOrderDirty) {
      if (!confirm('您有未儲存的章節排序變更，確定要直接關閉嗎？未儲存的排序將會復原。')) {
        return;
      }
    }
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  updateDirtyUI() {
    if (this.reorderHint) {
      this.reorderHint.style.display = this.isOrderDirty ? 'inline-block' : 'none';
    }
    if (this.btnResetOrder) {
      this.btnResetOrder.style.display = this.isOrderDirty ? 'inline-flex' : 'none';
    }
    if (this.btnSaveReorder) {
      this.btnSaveReorder.disabled = !this.isOrderDirty;
    }
  }

  updateSelectionUI() {
    const count = this.selectedIds.size;
    const isMultiSelect = count > 1;

    if (this.selectedCountBadge) {
      this.selectedCountBadge.textContent = count;
    }
    if (this.batchSelectedCount) {
      this.batchSelectedCount.textContent = count;
    }
    if (this.btnDeleteSelected) {
      this.btnDeleteSelected.disabled = count === 0;
    }
    if (this.btnBatchMoveEnd) {
      this.btnBatchMoveEnd.disabled = count === 0;
      this.btnBatchMoveEnd.textContent = `⏩ 批次移至末尾 ${count > 0 ? `(${count})` : ''}`;
    }
    if (this.batchMoveTargetInput) {
      this.batchMoveTargetInput.disabled = count === 0;
      this.batchMoveTargetInput.max = this.chapters.length;
    }
    if (this.btnBatchMoveTarget) {
      this.btnBatchMoveTarget.disabled = count === 0;
    }

    // GWT 23.3: 複數勾選時，單欄位變更按鍵與序號輸入框打灰防混淆
    if (this.listContainer) {
      const orderInputs = this.listContainer.querySelectorAll('.chapter-order-input');
      orderInputs.forEach(input => {
        input.disabled = isMultiSelect;
        if (isMultiSelect) {
          input.title = "已勾選多個篇章，單一序號調整已停用，請使用上方批次位移工具列";
        } else {
          input.title = "修改序號可變更順序 (自動插隊位移)";
        }
      });

      const moveEndButtons = this.listContainer.querySelectorAll('.btn-move-end');
      moveEndButtons.forEach(btn => {
        const isLast = btn.dataset.isLast === 'true';
        if (isMultiSelect) {
          btn.disabled = true;
          btn.title = "已勾選多個篇章，請使用上方「批次移至末尾」";
        } else {
          btn.disabled = isLast;
          btn.title = "移至本書最後一章";
        }
      });
    }

    // GWT 24.2: 複數勾選時專屬文字提示列
    if (this.multiNotice) {
      this.multiNotice.style.display = isMultiSelect ? 'block' : 'none';
    }
  }

  selectAllVisible() {
    const query = (this.filterInput ? this.filterInput.value : '').trim().toLowerCase();
    const visibleChapters = query
      ? this.chapters.filter(c => (c.title || '').toLowerCase().includes(query))
      : this.chapters;

    visibleChapters.forEach(c => this.selectedIds.add(c.id));
    this.updateSelectionUI();
    this.renderList();
  }

  deselectAll() {
    this.selectedIds.clear();
    this.updateSelectionUI();
    this.renderList();
  }

  renderList() {
    if (!this.listContainer) return;
    this.listContainer.innerHTML = '';

    const query = (this.filterInput ? this.filterInput.value : '').trim().toLowerCase();
    const visibleChapters = query
      ? this.chapters.filter(c => (c.title || '').toLowerCase().includes(query))
      : this.chapters;

    if (this.subtitle) {
      this.subtitle.textContent = query
        ? `顯示 ${visibleChapters.length} / ${this.chapters.length} 章`
        : `共 ${this.chapters.length} 章`;
    }

    if (visibleChapters.length === 0) {
      this.listContainer.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); font-size: 0.9rem;">
          ${query ? '未找到符合關鍵字的章節' : '本書尚無章節'}
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();
    const isMultiSelect = this.selectedIds.size > 1;

    visibleChapters.forEach((chap) => {
      // Find true index in this.chapters
      const actualIdx = this.chapters.findIndex(c => c.id === chap.id);
      const isSelected = this.selectedIds.has(chap.id);
      const isLast = (actualIdx === this.chapters.length - 1);

      const item = document.createElement('div');
      item.className = `chapter-manager-item ${isSelected ? 'selected' : ''}`;
      item.dataset.id = chap.id;

      item.innerHTML = `
        <input type="checkbox" class="chapter-select-checkbox" ${isSelected ? 'checked' : ''} title="勾選欲刪除或批次位移章節">
        <input type="number" class="chapter-order-input" min="1" max="${this.chapters.length}" value="${actualIdx + 1}" title="${isMultiSelect ? '已勾選多個篇章，單一序號調整已停用，請使用上方批次位移工具列' : '修改序號可變更順序 (自動插隊位移)'}" ${isMultiSelect ? 'disabled' : ''}>
        <span class="chapter-item-title" title="${chap.title || ''}">${chap.title || `第 ${actualIdx + 1} 章`}</span>
        <span class="chapter-item-meta">${chap.sentencesCount !== undefined ? `${chap.sentencesCount} 句` : ''}</span>
        <div class="chapter-item-actions">
          <button class="btn btn-secondary btn-sm btn-move-end" data-is-last="${isLast}" title="${isMultiSelect ? '已勾選多個篇章，請使用上方「批次移至末尾」' : '移至本書最後一章'}" ${isLast || isMultiSelect ? 'disabled' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" x2="5" y1="19" y2="5"/></svg>
            移至末尾
          </button>
        </div>
      `;

      // Checkbox event
      const chk = item.querySelector('.chapter-select-checkbox');
      chk.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedIds.add(chap.id);
          item.classList.add('selected');
        } else {
          this.selectedIds.delete(chap.id);
          item.classList.remove('selected');
        }
        this.updateSelectionUI();
      });

      // Order input event (GWT 21.6)
      const orderInput = item.querySelector('.chapter-order-input');
      orderInput.addEventListener('change', (e) => {
        let targetNum = parseInt(e.target.value, 10);
        if (isNaN(targetNum)) {
          e.target.value = actualIdx + 1;
          return;
        }
        targetNum = Math.max(1, Math.min(targetNum, this.chapters.length));
        const targetIdx = targetNum - 1;
        if (targetIdx !== actualIdx) {
          this.handleReorder(actualIdx, targetIdx);
        }
      });

      // Move to end button event
      const btnMoveEnd = item.querySelector('.btn-move-end');
      btnMoveEnd.addEventListener('click', () => {
        this.moveToEnd(actualIdx);
      });

      fragment.appendChild(item);
    });

    this.listContainer.appendChild(fragment);
  }

  /**
   * 數值重新排序插隊演算法 (GWT 21.6)
   * 若從靠前往後移，重疊篇章往前推送；若由靠後往前挪，原篇章往後排序。
   */
  handleReorder(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    const [moved] = this.chapters.splice(fromIdx, 1);
    this.chapters.splice(toIdx, 0, moved);

    this.isOrderDirty = true;
    this.updateDirtyUI();
    this.renderList();
  }

  /**
   * 一鍵移至末尾
   */
  moveToEnd(fromIdx) {
    if (fromIdx >= this.chapters.length - 1) return;
    const [moved] = this.chapters.splice(fromIdx, 1);
    this.chapters.push(moved);

    this.isOrderDirty = true;
    this.updateDirtyUI();
    this.renderList();
  }

  /**
   * 將所有勾選章節整批保持相對順序移至末尾 (Story 22, GWT 22.4)
   */
  handleBatchMoveToEnd() {
    if (this.selectedIds.size === 0) return;

    const selectedChaps = this.chapters.filter(c => this.selectedIds.has(c.id));
    const unselectedChaps = this.chapters.filter(c => !this.selectedIds.has(c.id));

    this.chapters = [...unselectedChaps, ...selectedChaps];
    this.isOrderDirty = true;
    this.updateDirtyUI();
    this.renderList();

    eventBus.emit('toast', { message: `已將勾選的 ${selectedChaps.length} 個篇章整批移至全書末尾！` });
  }

  /**
   * 將所有勾選章節整批保持相對順序插隊至指定序號 (Story 22, GWT 22.4)
   */
  handleBatchMoveToTarget() {
    if (this.selectedIds.size === 0) return;

    let targetNum = parseInt(this.batchMoveTargetInput ? this.batchMoveTargetInput.value : '', 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > this.chapters.length) {
      alert(`請輸入有效的目標序號（1 ~ ${this.chapters.length}）！`);
      return;
    }

    const selectedChaps = this.chapters.filter(c => this.selectedIds.has(c.id));
    const unselectedChaps = this.chapters.filter(c => !this.selectedIds.has(c.id));

    // Calculate insertion index in remaining list
    const insertIdx = Math.max(0, Math.min(targetNum - 1, unselectedChaps.length));
    unselectedChaps.splice(insertIdx, 0, ...selectedChaps);
    this.chapters = unselectedChaps;

    this.isOrderDirty = true;
    this.updateDirtyUI();
    this.renderList();

    if (this.batchMoveTargetInput) {
      this.batchMoveTargetInput.value = '';
    }

    eventBus.emit('toast', { message: `已將勾選的 ${selectedChaps.length} 個篇章插隊移至序號 ${targetNum}！` });
  }

  /**
   * 批次刪除選取章節 (GWT 21.5)
   */
  async handleDeleteSelected() {
    if (this.selectedIds.size === 0) return;
    const count = this.selectedIds.size;

    if (!confirm(`確定要徹底刪除勾選的 ${count} 個章節嗎？\n此操作將從資料庫中永久移除，剩餘章節將自動平滑重編序號。`)) {
      return;
    }

    try {
      const remaining = await storage.deleteChaptersBatch(this.currentBook.id, Array.from(this.selectedIds));
      this.chapters = remaining.map(c => ({ ...c }));
      this.originalChapters = remaining.map(c => ({ ...c }));
      this.selectedIds.clear();
      this.isOrderDirty = false;

      this.updateDirtyUI();
      this.updateSelectionUI();
      this.renderList();

      eventBus.emit('bookshelf:refresh');
      eventBus.emit('reader:chapterReordered', { bookId: this.currentBook.id });
      eventBus.emit('toast', { message: `已成功刪除 ${count} 個章節！` });
    } catch (err) {
      console.error('Delete chapters error:', err);
      alert(`刪除章節失敗: ${err.message}`);
    }
  }

  /**
   * 儲存排序變更至 IndexedDB (GWT 21.6)
   */
  async handleSaveReorder() {
    if (!this.isOrderDirty || !this.currentBook) return;

    try {
      const orderedIds = this.chapters.map(c => c.id);
      const updated = await storage.reorderChaptersBatch(this.currentBook.id, orderedIds);
      this.chapters = updated.map(c => ({ ...c }));
      this.originalChapters = updated.map(c => ({ ...c }));
      this.isOrderDirty = false;

      this.updateDirtyUI();
      this.renderList();

      eventBus.emit('bookshelf:refresh');
      eventBus.emit('reader:chapterReordered', { bookId: this.currentBook.id });
      eventBus.emit('toast', { message: '章節排序已成功儲存！' });
    } catch (err) {
      console.error('Save reorder error:', err);
      alert(`儲存排序失敗: ${err.message}`);
    }
  }

  /**
   * 復原排序至未變更狀態
   */
  handleResetOrder() {
    this.chapters = this.originalChapters.map(c => ({ ...c }));
    this.isOrderDirty = false;
    this.updateDirtyUI();
    this.renderList();
  }
}
