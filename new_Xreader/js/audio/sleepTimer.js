/**
 * new_Xreader - Sleep Timer Module (Story 4, ADR 0002)
 * Manages timed shutdowns and safe keep-alive release.
 */

import { eventBus } from '../eventBus.js';
import { player } from './playerFactory.js';

class SleepTimer {
  constructor() {
    this.timerId = null;
    this.remainingSeconds = 0;
    this.isChapterEndMode = false;
    this.active = false;

    // Listen to chapter end event
    eventBus.on('audio:chapterEnd', () => {
      if (this.isChapterEndMode && this.active) {
        this.triggerShutdown('本章朗讀完畢，睡眠定時已觸發停止');
      }
    });
  }

  start(minutesOrMode) {
    this.cancel();

    if (minutesOrMode === 'chapter') {
      this.isChapterEndMode = true;
      this.active = true;
      this.remainingSeconds = 0;
      eventBus.emit('timer:change', { mode: 'chapter', label: '⏳ 讀完本章' });
      return;
    }

    const minutes = parseInt(minutesOrMode, 10);
    if (isNaN(minutes) || minutes <= 0) return;

    this.isChapterEndMode = false;
    this.active = true;
    this.remainingSeconds = minutes * 60;

    this.tick();
    this.timerId = setInterval(() => this.tick(), 1000);
  }

  tick() {
    if (this.remainingSeconds <= 0) {
      this.triggerShutdown('睡眠時間到，已自動停止播放');
      return;
    }

    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    const formatted = `⏳ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    eventBus.emit('timer:tick', { remainingSeconds: this.remainingSeconds, formatted });
    this.remainingSeconds--;
  }

  triggerShutdown(message) {
    this.cancel();
    // Force destroy keep-alive audio to let device sleep
    player.stop(true);
    eventBus.emit('timer:end', { message });
  }

  cancel() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.active = false;
    this.isChapterEndMode = false;
    this.remainingSeconds = 0;
    eventBus.emit('timer:cancel');
  }
}

export const sleepTimer = new SleepTimer();
