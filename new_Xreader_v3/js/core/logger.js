/**
 * new_Xreader - System Operation & Debug Logger (Story 24, GWT 24.4)
 * In-memory circular buffer for tracking audio lifecycles, iOS WebKit KeepAlive,
 * visibility state, MediaSession remote commands, and error interception.
 */

import { eventBus } from '../eventBus.js';

class SystemLogger {
  constructor() {
    this.maxLogs = 600;
    this.logs = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.info('System', 'new_Xreader 日誌系統啟動');

    // 1. Hook visibility changes (Critical for iOS lock screen debugging)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        const state = document.hidden ? '螢幕熄滅 / 切至背景 (hidden = true)' : '螢幕點亮 / 回到前台 (hidden = false)';
        this.warn('Visibility', state);
      });
    }

    // 2. Global Error Capture
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => {
        this.error('WindowError', `${e.message} at ${e.filename}:${e.lineno}`);
      });
      window.addEventListener('unhandledrejection', (e) => {
        this.error('UnhandledRejection', String(e.reason ? e.reason.message || e.reason : e));
      });
    }

    // 3. Core EventBus Hooking
    eventBus.on('audio:stateChange', (data) => {
      this.info('Audio', `播放狀態變更: ${data.isPlaying ? '播放中 (Playing)' : '已暫停 (Paused)'}`);
    });

    eventBus.on('audio:chapterEnd', (data) => {
      this.info('Audio', `章節朗讀結束，觸發跨章 (chapterIndex: ${data ? data.chapterIndex : 'unknown'})`);
    });

    eventBus.on('audio:requestNextChapter', () => {
      this.info('MediaSession', '接收下一章指令 (Next Track)');
    });

    eventBus.on('audio:requestPrevChapter', () => {
      this.info('MediaSession', '接收上一章指令 (Prev Track)');
    });

    eventBus.on('reader:openBook', (bookId) => {
      this.info('Reader', `開啟書籍 ID: ${bookId}`);
    });

    eventBus.on('reader:chapterContentUpdated', (data) => {
      this.info('Reader', `章節內容更新事件 (refreshAll: ${data && data.refreshAll})`);
    });
  }

  _formatTime(date = new Date()) {
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const h = pad(date.getHours());
    const m = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    const ms = pad(date.getMilliseconds(), 3);
    return `${h}:${m}:${s}.${ms}`;
  }

  _formatFullTimestamp(date = new Date()) {
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const y = date.getFullYear();
    const mo = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    const ms = pad(date.getMilliseconds(), 3);
    return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}`;
  }

  log(level, tag, message) {
    const now = new Date();
    const entry = {
      timestamp: now.getTime(),
      fullTime: this._formatFullTimestamp(now),
      timeStr: this._formatTime(now),
      level, // 'INFO', 'WARN', 'ERROR'
      tag,
      message: (typeof message === 'object') ? JSON.stringify(message) : String(message)
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also forward to console
    const consoleMsg = `[${entry.timeStr}] [${entry.tag}] ${entry.message}`;
    if (level === 'ERROR') {
      console.error(consoleMsg);
    } else if (level === 'WARN') {
      console.warn(consoleMsg);
    } else {
      console.log(consoleMsg);
    }

    eventBus.emit('logger:newEntry', entry);
  }

  info(tag, message) {
    this.log('INFO', tag, message);
  }

  warn(tag, message) {
    this.log('WARN', tag, message);
  }

  error(tag, message) {
    this.log('ERROR', tag, message);
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.info('System', '日誌已由使用者清空');
  }

  /**
   * 產出純文字格式日誌字串
   */
  toTextString() {
    const header = [
      '============================================================',
      ' new_Xreader - 系統除錯與操作日誌 (Operation Logs)',
      ` 導出時間: ${this._formatFullTimestamp(new Date())}`,
      ` 記錄筆數: ${this.logs.length} 條`,
      ` 瀏覽器 UserAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      '============================================================\n'
    ].join('\n');

    const lines = this.logs.map(l => {
      const levelPad = l.level.padEnd(5, ' ');
      const tagPad = `[${l.tag}]`.padEnd(16, ' ');
      return `[${l.fullTime}] [${levelPad}] ${tagPad} ${l.message}`;
    });

    return header + lines.join('\n');
  }

  /**
   * 下載 TXT 檔案
   */
  exportTxt() {
    const text = this.toTextString();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const filename = `xreader_debug_log_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.txt`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 200);

    return filename;
  }

  /**
   * 一鍵複製到剪貼簿
   */
  async copyToClipboard() {
    const text = this.toTextString();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

export const logger = new SystemLogger();
