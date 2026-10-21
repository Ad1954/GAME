/**
 * downloadQueue.js
 * 爬蟲多任務下載排程佇列管理器 (Story 54)
 * 支援多任務排隊接力、非搶佔式常規排序 (上移/下移)、⚡ 立即插隊 (搶佔式暫停與斷點續傳)、❌ 放棄與中斷取消。
 */
import { eventBus } from '../eventBus.js';
import { crawler } from './crawler.js';
import { bahaCrawler } from './bahaCrawler.js';
import { storage } from './storage.js';

export class DownloadQueueManager {
  constructor() {
    this.tasks = []; // 全體任務池 [{ id, bookTitle, author, catalogUrl, sourceType, categoryId, selectedChapters, delay, status, progress, createdAt, ... }]
    this.activeTaskId = null;
    this.isProcessing = false;
    this.coolDownMs = 1500; // 友善防封鎖冷卻間隔 (毫秒)
  }

  /**
   * 取得當前正在下載中的任務
   */
  getActiveTask() {
    return this.tasks.find(t => t.id === this.activeTaskId && t.status === 'downloading') || null;
  }

  /**
   * 取得所有等待中（包含暫停中）的排程任務（嚴格維持佇列先後順序）
   */
  getPendingTasks() {
    return this.tasks.filter(t => t.id !== this.activeTaskId && (t.status === 'pending' || t.status === 'paused'));
  }

  /**
   * 取得全體任務快照
   */
  getAllTasks() {
    return [...this.tasks];
  }

  /**
   * 將新小說加入下載佇列 (Scenario 54.1)
   * @param {Object} taskConfig - { bookTitle, author, catalogUrl, sourceType, categoryId, selectedChapters, delay, targetBookId, recordId, customTitle }
   * @returns {Object} task
   */
  enqueue(taskConfig) {
    const id = `task_q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const taskType = taskConfig.taskType || (taskConfig.isIncremental ? 'incremental' : (taskConfig.isRedownload ? 'redownload' : 'crawl'));
    const task = {
      id,
      taskType, // 'crawl' | 'incremental' | 'redownload'
      bookTitle: taskConfig.bookTitle || '未命名小說',
      author: taskConfig.author || '未知',
      catalogUrl: taskConfig.catalogUrl,
      sourceType: taskConfig.sourceType || 'web',
      categoryId: taskConfig.categoryId || 'uncategorized',
      selectedChapters: taskConfig.selectedChapters || null,
      delay: taskConfig.delay || 2.0,
      targetBookId: taskConfig.targetBookId || null,
      recordId: taskConfig.recordId || null,
      onlineIndexMap: taskConfig.onlineIndexMap || null,
      reorder: !!taskConfig.reorder,
      customTitle: taskConfig.customTitle || taskConfig.bookTitle || '',
      isRedownload: taskType === 'redownload',
      redownloadMode: taskConfig.redownloadMode || 'overwrite',
      status: 'pending', // 'pending' | 'downloading' | 'paused' | 'completed' | 'cancelled' | 'error'
      progress: {
        current: 0,
        total: taskConfig.selectedChapters ? taskConfig.selectedChapters.length : 0,
        percent: 0,
        message: '排隊等待下載中...'
      },
      createdAt: Date.now()
    };

    this.tasks.push(task);
    this.emitChange();

    // 若當前無任務正在下載，立即自動啟動
    if (!this.getActiveTask() && !this.isProcessing) {
      this.processNext();
    }

    return task;
  }

  /**
   * 待下載清單常規上移 (Scenario 54.2: 非搶佔式，不影響當前下載)
   */
  moveUp(taskId) {
    const pending = this.getPendingTasks();
    const idx = pending.findIndex(t => t.id === taskId);
    if (idx > 0) {
      const taskA = pending[idx];
      const taskB = pending[idx - 1];
      const realIdxA = this.tasks.indexOf(taskA);
      const realIdxB = this.tasks.indexOf(taskB);
      if (realIdxA !== -1 && realIdxB !== -1) {
        this.tasks[realIdxA] = taskB;
        this.tasks[realIdxB] = taskA;
        this.emitChange();
      }
    }
  }

  /**
   * 待下載清單常規下移 (Scenario 54.2: 非搶佔式，不影響當前下載)
   */
  moveDown(taskId) {
    const pending = this.getPendingTasks();
    const idx = pending.findIndex(t => t.id === taskId);
    if (idx >= 0 && idx < pending.length - 1) {
      const taskA = pending[idx];
      const taskB = pending[idx + 1];
      const realIdxA = this.tasks.indexOf(taskA);
      const realIdxB = this.tasks.indexOf(taskB);
      if (realIdxA !== -1 && realIdxB !== -1) {
        this.tasks[realIdxA] = taskB;
        this.tasks[realIdxB] = taskA;
        this.emitChange();
      }
    }
  }

  /**
   * ⚡ 立即插隊優先下載 (Scenario 54.3: 搶佔式暫停當前任務並立即執行)
   */
  async prioritize(taskId) {
    const targetTask = this.tasks.find(t => t.id === taskId);
    if (!targetTask || targetTask.id === this.activeTaskId) return;

    const currentActive = this.getActiveTask();
    if (currentActive) {
      // 1. 發出暫停信號，標記為被插隊搶佔
      currentActive.status = 'paused';
      currentActive.isPreempted = true;
      currentActive.progress.message = '⏸️ 已暫停以讓路插隊任務（斷點已保存，待完成後自動續傳）';

      if (currentActive.sourceType === 'bahamut') {
        bahaCrawler.pause();
      } else {
        crawler.pause();
      }

      // 2. 將目標任務排至第一順位
      const targetIdx = this.tasks.indexOf(targetTask);
      this.tasks.splice(targetIdx, 1);
      const activeIdx = this.tasks.indexOf(currentActive);
      // 插到 active 前方
      this.tasks.splice(activeIdx, 0, targetTask);
      if (targetTask.status === 'paused') {
        targetTask.status = 'pending';
      }

      this.emitChange();
      // 等待當前任務之 crawlBook 迴圈感應 isPaused 退出後，會自然接續 processNext()
    } else {
      // 若當前無運行任務，直接提至頂端啟動
      const targetIdx = this.tasks.indexOf(targetTask);
      this.tasks.splice(targetIdx, 1);
      this.tasks.unshift(targetTask);
      if (targetTask.status === 'paused') {
        targetTask.status = 'pending';
      }
      this.emitChange();
      this.processNext();
    }
  }

  /**
   * ❌ 放棄下載 / 中斷取消任務 (Scenario 54.4)
   */
  async cancelTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.id === this.activeTaskId && task.status === 'downloading') {
      task.status = 'cancelled';
      task.progress.message = '已取消下載';
      if (task.sourceType === 'bahamut') {
        bahaCrawler.cancel();
      } else {
        crawler.cancel();
      }
      this.emitChange();
      // 活躍下載中斷後，crawlBook 退出並會推進下一部
    } else {
      // 等待中或暫停中的任務，直接自佇列中移除
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this.emitChange();
    }
  }

  /**
   * 暫停當前活躍下載任務
   */
  pauseActive() {
    const active = this.getActiveTask();
    if (active) {
      active.status = 'paused';
      active.isPreempted = false; // 手動暫停
      active.progress.message = '⏸️ 使用者手動暫停（進度已保存）';
      if (active.sourceType === 'bahamut') {
        bahaCrawler.pause();
      } else {
        crawler.pause();
      }
      this.emitChange();
    }
  }

  /**
   * 恢復暫停的任務
   */
  resumeTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status === 'paused') {
      task.status = 'pending';
      task.isPreempted = false;
      task.progress.message = '等待接續下載...';
      this.emitChange();
      if (!this.getActiveTask() && !this.isProcessing) {
        this.processNext();
      }
    }
  }

  /**
   * 清空所有等待中（尚未開始）的任務
   */
  clearPending() {
    this.tasks = this.tasks.filter(t => t.id === this.activeTaskId && t.status === 'downloading');
    this.emitChange();
  }

  /**
   * 觸發佇列狀態變更通知
   */
  emitChange() {
    eventBus.emit('queue:updated', {
      tasks: this.getAllTasks(),
      activeTask: this.getActiveTask(),
      pendingTasks: this.getPendingTasks(),
      totalCount: this.tasks.length,
      pendingCount: this.getPendingTasks().length
    });
  }

  /**
   * 核心佇列調度處理器
   */
  async processNext() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 尋找下一個等待中 (pending) 的任務
      const nextTask = this.tasks.find(t => t.status === 'pending');
      if (!nextTask) {
        this.activeTaskId = null;
        this.isProcessing = false;
        this.emitChange();
        return;
      }

      this.activeTaskId = nextTask.id;
      nextTask.status = 'downloading';
      this.emitChange();

      eventBus.emit('queue:started', { task: nextTask });

      const isBaha = (nextTask.sourceType === 'bahamut');
      const progressCb = (info) => {
        if (info.status === 'downloading') {
          nextTask.progress = {
            current: info.current || nextTask.progress.current,
            total: info.total || nextTask.progress.total,
            percent: info.percent || 0,
            message: info.message || ''
          };
          eventBus.emit('queue:progress', { task: nextTask, info });
        } else if (info.status === 'completed') {
          nextTask.progress.percent = 100;
          nextTask.progress.message = info.message || '全書下載完成！';
          nextTask.status = 'completed';
          if (info.book) {
            nextTask.targetBookId = info.book.id;
          }
          eventBus.emit('queue:progress', { task: nextTask, info });
        } else if (info.status === 'paused') {
          nextTask.status = 'paused';
          nextTask.progress.message = info.message || '已暫停（斷點已保存）';
          if (info.book) {
            nextTask.targetBookId = info.book.id;
          }
          eventBus.emit('queue:progress', { task: nextTask, info });
        } else if (info.status === 'cancelled') {
          nextTask.status = 'cancelled';
          nextTask.progress.message = info.message || '下載已取消';
          eventBus.emit('queue:progress', { task: nextTask, info });
        }
      };

      try {
        if (nextTask.taskType === 'incremental') {
          // 增量追更任務
          if (isBaha) {
            await bahaCrawler.crawlBahaIncremental(nextTask.recordId, nextTask.selectedChapters, {
              delay: nextTask.delay,
              onlineIndexMap: nextTask.onlineIndexMap,
              reorder: nextTask.reorder,
              onProgress: progressCb
            });
          } else {
            await crawler.crawlIncremental(nextTask.recordId, nextTask.selectedChapters, {
              delay: nextTask.delay,
              onlineIndexMap: nextTask.onlineIndexMap,
              reorder: nextTask.reorder,
              onProgress: progressCb
            });
          }
        } else if (nextTask.taskType === 'redownload' && nextTask.redownloadMode === 'overwrite') {
          // 重新下載（覆蓋原書模式）：先安全清空原書現存章節
          if (nextTask.targetBookId) {
            await storage.clearBookChapters(nextTask.targetBookId);
          }
          if (isBaha) {
            await bahaCrawler.crawlBaha(nextTask.catalogUrl, {
              delay: nextTask.delay,
              targetBookId: nextTask.targetBookId,
              customTitle: nextTask.customTitle,
              author: nextTask.author,
              recordId: nextTask.recordId,
              categoryId: nextTask.categoryId,
              onProgress: progressCb
            });
          } else {
            const book = await crawler.crawlBook(nextTask.catalogUrl, {
              delay: nextTask.delay,
              targetBookId: nextTask.targetBookId,
              customTitle: nextTask.customTitle,
              author: nextTask.author,
              recordId: nextTask.recordId,
              categoryId: nextTask.categoryId,
              selectedChapters: nextTask.selectedChapters,
              onProgress: progressCb
            });
            if (book) nextTask.targetBookId = book.id;
          }
        } else {
          // 常規全書/自訂選章爬取
          if (isBaha) {
            await bahaCrawler.crawlBaha(nextTask.catalogUrl, {
              delay: nextTask.delay,
              targetBookId: nextTask.targetBookId,
              customTitle: nextTask.customTitle,
              author: nextTask.author,
              recordId: nextTask.recordId,
              categoryId: nextTask.categoryId,
              onProgress: progressCb
            });
          } else {
            const book = await crawler.crawlBook(nextTask.catalogUrl, {
              delay: nextTask.delay,
              targetBookId: nextTask.targetBookId,
              customTitle: nextTask.customTitle,
              author: nextTask.author,
              recordId: nextTask.recordId,
              categoryId: nextTask.categoryId,
              selectedChapters: nextTask.selectedChapters,
              onProgress: progressCb
            });
            if (book) {
              nextTask.targetBookId = book.id;
            }
          }
        }

        if (nextTask.status === 'downloading') {
          nextTask.status = 'completed';
        }
      } catch (err) {
        console.error('Queue task execution error:', err);
        if (nextTask.status !== 'cancelled' && nextTask.status !== 'paused') {
          nextTask.status = 'error';
          nextTask.progress.message = `❌ 錯誤: ${err.message}`;
          eventBus.emit('toast', {
            message: `《${nextTask.bookTitle}》任務受阻: ${err.message}`
          });
        }
      }

      // 若有先前因插隊而被暫停的任務，在當前任務結束後自動解除暫停接關續傳
      if (nextTask.status === 'completed' || nextTask.status === 'cancelled') {
        this.tasks.forEach(t => {
          if (t.status === 'paused' && t.isPreempted) {
            t.status = 'pending';
            t.isPreempted = false;
            t.progress.message = '前置任務已結束，即將自動接關續傳...';
          }
        });
      }

      this.emitChange();

      // 若成功完成，發送完成慶祝通知並重新整理書櫃
      if (nextTask.status === 'completed') {
        eventBus.emit('bookshelf:refresh');
        const doneAction = nextTask.taskType === 'incremental' ? '追更完成' : '下載完成';
        eventBus.emit('toast', {
          message: `🎉《${nextTask.bookTitle}》${doneAction}！`,
          actionLabel: '前往閱讀',
          onAction: () => {
            if (nextTask.targetBookId) {
              eventBus.emit('reader:openBook', nextTask.targetBookId);
            } else {
              eventBus.emit('nav:switchTab', 'tab-bookshelf');
            }
          }
        });

        // 任務間友善防封鎖冷卻間隔 (1.5 秒)
        await new Promise(r => setTimeout(r, this.coolDownMs));
      }
    } finally {
      this.isProcessing = false;
      // 檢查是否還有後續待下載任務
      const hasMore = this.tasks.some(t => t.status === 'pending');
      if (hasMore) {
        this.processNext();
      } else {
        this.activeTaskId = null;
        this.emitChange();
      }
    }
  }
}

export const downloadQueue = new DownloadQueueManager();
