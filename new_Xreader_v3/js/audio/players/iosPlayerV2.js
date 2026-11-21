/**
 * new_Xreader - iOS Voice Player v2 (Story 58 ~ 69, v9.24)
 * High-performance mobile voice player optimized for iPadOS 27.2.1 / M4 iPad Pro / iOS Safari WebKit.
 *
 * CRITICAL ROOT CAUSES RESOLVED across v9.20 ~ v9.24:
 * 1. No `navigator.mediaSession` bindings (Proven in v9.21 -> v9.22):
 *    - Prevents Safari 27.2 from firing a synthetic `MediaSession [Pause]` 765ms after `synth.speak()`.
 * 2. Zero `<audio>` / `AudioContext` Channel-Stealing (Proven in v9.23 -> v9.24):
 *    - v9.23 proved that calling `silentAudio.play()` or `audioCtx.resume()` while `speechSynthesis` is active
 *      (whether on a 2-second heartbeat timer in foreground or inside `visibilitychange` when entering background)
 *      causes iPadOS 27.2.1 CoreAudio to immediately fade-out ("聲音漸縮縮小") and kill the active speech utterance!
 *    - Fix: Removed ALL `<audio>` and `AudioContext` interference! Pure, uncontested `window.speechSynthesis`
 *      now owns the audio channel 100% both in foreground and when transitioning to background.
 * 3. Rock-Solid `cancel() -> 80ms -> speak()` Play/Pause & Foreground Auto-Reset (Proven in v9.23):
 *    - Eliminates broken `synth.pause()` / `synth.resume()` on Safari 27.2.
 *    - Pressing Play after Pause (or after returning from background) uses the exact same 100%-reliable
 *      `cancel() -> 80ms -> speakCurrentSentence()` pipeline as `seekSentence()`.
 */

import { eventBus } from '../../eventBus.js?v=9.24';
import { logger } from '../../core/logger.js?v=9.24';

if (typeof window !== 'undefined' && !window.__xreaderActiveUtterances) {
  window.__xreaderActiveUtterances = new Set();
}

export class IosVoicePlayerV2 {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentChapter = null;
    this.bookTitle = 'Xreader';
    this.flatSentences = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voiceName = '';
    this.activeVoice = null;
    this.currentUtterance = null;
    this.isProactiveEvade = false;
    this.isPausedByUser = false;

    this.seekTimer = null;
    this.lastSpeechActivityTime = 0;
    this.enteredBackgroundTime = 0;

    // Mutex & Generation token
    this.instanceId = 'xreader_iosv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;
  }

  get currentSentenceIndex() {
    return this.currentIndex;
  }

  async init() {
    this.removeAnyLegacyKeepAliveAudio();
    this.clearAnyMediaSessionHandlers();
    this.loadVoices();
    this.setupVisibilitySync();
    this.setupMutexChannel();
    this.setupLifecycleCleanup();

    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    logger.info('iOS v2 Engine', 'iOS 朗讀引擎 v2 (v9.24 零音軌搶佔純淨核心 + 80ms無死鎖重啟) 初始化完成');
  }

  removeAnyLegacyKeepAliveAudio() {
    if (typeof document === 'undefined') return;
    const legacyAudio = document.getElementById('ios-keepalive');
    if (legacyAudio) {
      try {
        legacyAudio.pause();
        legacyAudio.removeAttribute('src');
        legacyAudio.remove();
      } catch (e) {}
    }
  }

  clearAnyMediaSessionHandlers() {
    try {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      }
    } catch (e) {}
  }

  setupMutexChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.mutexChannel = new BroadcastChannel('xreader_audio_mutex');
        this.mutexChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'CLAIM_PLAYBACK') {
            if (event.data.instanceId !== this.instanceId && this.isPlaying) {
              this.stop();
            }
          }
        };
      } catch (e) {}
    }
  }

  setupLifecycleCleanup() {
    const forceCleanup = (e) => {
      if (e && e.persisted) return;
      try {
        this.stop();
      } catch (err) {}
    };

    window.addEventListener('pagehide', (e) => {
      if (!e.persisted) forceCleanup(e);
    });
    window.addEventListener('beforeunload', forceCleanup);
  }

  /**
   * Pure Visibility Sync:
   * - When entering background (document.hidden === true):
   *   NEVER calls silentAudio.play() or audioCtx.resume()! Leaving CoreAudio completely undisturbed
   *   prevents the fade-out ("聲音漸縮") channel-stealing conflict!
   * - When returning to foreground (document.hidden === false):
   *   Syncs UI highlight. If iOS suspended background speech while away, cleanly resets the zombie queue
   *   and switches the button to Play (triangle) so a single tap on Play immediately resumes from currentIndex!
   */
  setupVisibilitySync() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.enteredBackgroundTime = Date.now();
        if (this.isPlaying) {
          logger.info('iOS v2 Background', `進入背景/切換分頁，零干擾維持純淨語音通道 (當前第 ${this.currentIndex + 1} 句)`);
        }
      } else {
        if (this.isPlaying) {
          this.notifySentenceChange();
          const bgDurationMs = Date.now() - this.enteredBackgroundTime;
          const timeSinceLastActivity = Date.now() - this.lastSpeechActivityTime;
          const isSynthDead = !this.synth || (!this.synth.speaking && !this.synth.pending) || this.synth.paused;

          if (isSynthDead || (bgDurationMs > 2500 && timeSinceLastActivity > 3500)) {
            logger.info('iOS v2 Visibility', `切回前台偵測到背景語音已停滯 (背景停留 ${bgDurationMs}ms)，自動清理佇列並歸位播放鍵`);
            this.playbackToken++;
            this.clearSeekTimer();
            this.detachCurrentUtterance();
            this.isPlaying = false;
            this.isPausedByUser = true;
            this.isProactiveEvade = true;
            try { this.synth.cancel(); } catch (e) {}
            setTimeout(() => { this.isProactiveEvade = false; }, 70);
            this.notifyStateChange();
          }
        }
      }
    });
  }

  loadVoices() {
    const allVoices = this.synth ? this.synth.getVoices() : [];
    if (this.voiceName) {
      this.activeVoice = allVoices.find(v => v.name === this.voiceName) || null;
    }
    return allVoices;
  }

  clearSeekTimer() {
    if (this.seekTimer) {
      clearTimeout(this.seekTimer);
      this.seekTimer = null;
    }
  }

  detachCurrentUtterance() {
    if (window.__xreaderActiveUtterances) {
      window.__xreaderActiveUtterances.forEach(u => {
        u.onstart = null;
        u.onend = null;
        u.onerror = null;
        u.onboundary = null;
      });
      window.__xreaderActiveUtterances.clear();
    }
    if (this.currentUtterance) {
      this.currentUtterance.onstart = null;
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance.onboundary = null;
      this.currentUtterance = null;
    }
    if (typeof window !== 'undefined') {
      window.__xreaderCurrentUtterance = null;
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      const timeSinceLastActivity = Date.now() - this.lastSpeechActivityTime;
      const isActuallyAlive = this.synth && (this.synth.speaking || this.synth.pending) && !this.synth.paused && timeSinceLastActivity < 8000;
      if (!isActuallyAlive) {
        logger.info('iOS v2 SelfHeal', '偵測到語音佇列停滯，點擊按鈕直接觸發 80ms 乾淨重啟朗讀');
        this.play(false);
        return;
      }
      this.pause();
    } else {
      this.play(false);
    }
  }

  loadChapter(chapter, startSentenceIndex = 0, bookTitle = 'Xreader', isContinuousTransition = false) {
    this.playbackToken++;
    this.clearSeekTimer();
    this.detachCurrentUtterance();
    this.isPausedByUser = false;

    if (isContinuousTransition) {
      this.isProactiveEvade = false;
    } else {
      this.isProactiveEvade = true;
      try { this.synth.cancel(); } catch (e) {}
      setTimeout(() => { this.isProactiveEvade = false; }, 70);
    }

    this.currentChapter = chapter;
    this.bookTitle = bookTitle;
    this.flatSentences = [];

    if (chapter && chapter.paragraphs) {
      chapter.paragraphs.forEach(p => {
        (p.sentences || []).forEach(s => {
          const text = (typeof s === 'object' && s !== null && s.text !== undefined) ? s.text : String(s);
          if (text && text.trim()) this.flatSentences.push(text.trim());
        });
      });
    }

    this.currentIndex = Math.max(0, Math.min(startSentenceIndex, Math.max(0, this.flatSentences.length - 1)));
    logger.info('iOS v2 Player', `載入章節「${chapter ? chapter.title : ''}」(共 ${this.flatSentences.length} 句, 起始句: ${this.currentIndex + 1}, 自動跨章=${isContinuousTransition})`);
    this.notifySentenceChange();
  }

  play(isContinuousTransition = false) {
    if (!this.currentChapter || this.flatSentences.length === 0) {
      logger.warn('iOS v2 Player', 'play() 略過: 無章節或句子長度為 0');
      return;
    }

    if (this.mutexChannel) {
      try {
        this.mutexChannel.postMessage({ type: 'CLAIM_PLAYBACK', instanceId: this.instanceId });
      } catch (e) {}
    }

    const token = ++this.playbackToken;
    this.clearSeekTimer();
    this.isPausedByUser = false;
    this.isPlaying = true;
    this.lastSpeechActivityTime = Date.now();
    this.notifyStateChange();

    if (isContinuousTransition) {
      this.isProactiveEvade = false;
      logger.info('iOS v2 Player', `自動跨章無縫朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句)`);
      this.speakCurrentSentence(token);
      return;
    }

    this.isProactiveEvade = true;
    this.detachCurrentUtterance();
    try {
      this.synth.cancel();
    } catch (e) {}

    logger.info('iOS v2 Player', `啟動朗讀 (80ms 乾淨佇列重啟 -> 第 ${this.currentIndex + 1}/${this.flatSentences.length} 句)`);
    this.seekTimer = setTimeout(() => {
      this.isProactiveEvade = false;
      if (this.playbackToken !== token || !this.isPlaying) return;
      this.speakCurrentSentence(token);
    }, 80);
  }

  speakCurrentSentence(token = this.playbackToken) {
    if (!this.isPlaying || this.playbackToken !== token) return;

    if (this.currentIndex >= this.flatSentences.length) {
      logger.info('iOS v2 Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，無縫跨下一章`);
      eventBus.emit('audio:chapterEnd', {
        chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
        isAutoTransition: true
      });
      return;
    }

    this.detachCurrentUtterance();

    const isHidden = (typeof document !== 'undefined' && document.hidden);
    const batchCount = isHidden ? Math.min(20, this.flatSentences.length - this.currentIndex) : 1;
    const startIdx = this.currentIndex;
    const endIdx = startIdx + batchCount;

    let textToSpeak = '';
    const offsets = [];
    for (let i = startIdx; i < endIdx; i++) {
      const s = this.flatSentences[i] || '';
      offsets.push({ sentenceIndex: i, startChar: textToSpeak.length });
      textToSpeak += (batchCount > 1) ? (s + '  ') : s;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'zh-TW';
    utterance.rate = Math.min(Math.max(this.rate, 0.5), 2.5);
    utterance.pitch = this.pitch;

    if (this.activeVoice) {
      utterance.voice = this.activeVoice;
    } else {
      try {
        const voices = this.synth.getVoices();
        const zhVoice = voices.find(v => v.lang && (v.lang.includes('zh') || v.lang.includes('cmn')));
        if (zhVoice) {
          this.activeVoice = zhVoice;
          utterance.voice = zhVoice;
        }
      } catch (e) {}
    }

    this.currentUtterance = utterance;
    if (typeof window !== 'undefined') {
      window.__xreaderCurrentUtterance = utterance;
      if (window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.add(utterance);
      }
    }

    let hasTriggeredStart = false;
    const triggerStart = () => {
      if (this.playbackToken !== token) return;
      if (hasTriggeredStart || this.isProactiveEvade || !this.isPlaying) return;
      hasTriggeredStart = true;
      this.lastSpeechActivityTime = Date.now();
      this.notifySentenceChange();
    };

    utterance.onstart = () => {
      if (this.playbackToken !== token) return;
      this.lastSpeechActivityTime = Date.now();
      logger.info('iOS v2 Utterance', `onstart 觸發: 第 ${startIdx + 1}${batchCount > 1 ? '~' + endIdx : ''} 句`);
      triggerStart();
    };
    setTimeout(triggerStart, 200);

    utterance.onboundary = (e) => {
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;
      this.lastSpeechActivityTime = Date.now();
      if (batchCount > 1 && typeof e.charIndex === 'number') {
        for (let j = offsets.length - 1; j >= 0; j--) {
          if (e.charIndex >= offsets[j].startChar) {
            if (offsets[j].sentenceIndex !== this.currentIndex) {
              this.currentIndex = offsets[j].sentenceIndex;
              this.notifySentenceChange();
            }
            break;
          }
        }
      }
    };

    utterance.onend = () => {
      if (typeof window !== 'undefined' && window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(utterance);
      }
      if (this.playbackToken !== token) return;
      if (this.isProactiveEvade || !this.isPlaying) return;
      this.lastSpeechActivityTime = Date.now();
      this.currentIndex = endIdx;
      this.speakCurrentSentence(token);
    };

    utterance.onerror = (e) => {
      if (typeof window !== 'undefined' && window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(utterance);
      }
      if (this.playbackToken !== token) return;
      if (this.isProactiveEvade || !this.isPlaying) return;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      logger.error('iOS v2 Utterance', `朗讀錯誤 (${e ? e.error : 'unknown'}) 於第 ${this.currentIndex + 1} 句，自動推進下一句`);
      this.currentIndex = endIdx;
      this.speakCurrentSentence(token);
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      logger.error('iOS v2 Player', `synth.speak 失敗: ${err}`);
    }
  }

  pause() {
    this.playbackToken++;
    this.clearSeekTimer();
    this.isPlaying = false;
    this.isPausedByUser = true;
    this.isProactiveEvade = true;
    logger.info('iOS v2 Player', `使用者手動暫停 (已乾淨清空佇列並停於第 ${this.currentIndex + 1} 句)`);

    this.detachCurrentUtterance();
    try {
      this.synth.cancel();
    } catch (e) {}
    setTimeout(() => { this.isProactiveEvade = false; }, 70);

    this.notifyStateChange();
  }

  stop() {
    this.playbackToken++;
    this.clearSeekTimer();
    this.isPlaying = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;

    this.detachCurrentUtterance();
    try { this.synth.cancel(); } catch (e) {}
    setTimeout(() => { this.isProactiveEvade = false; }, 80);

    this.notifyStateChange();
  }

  seekSentence(sentenceIndex) {
    const token = ++this.playbackToken;
    this.clearSeekTimer();
    const wasPlaying = this.isPlaying;
    this.isProactiveEvade = true;
    this.isPausedByUser = false;

    this.detachCurrentUtterance();
    try {
      this.synth.cancel();
    } catch (e) {}

    this.currentIndex = Math.max(0, Math.min(sentenceIndex, Math.max(0, this.flatSentences.length - 1)));
    this.notifySentenceChange();

    this.seekTimer = setTimeout(() => {
      this.isProactiveEvade = false;
      if (this.playbackToken !== token) return;
      if (wasPlaying) {
        this.isPlaying = true;
        this.lastSpeechActivityTime = Date.now();
        logger.info('iOS v2 Player', `手動切換至第 ${this.currentIndex + 1} 句，啟動朗讀`);
        this.speakCurrentSentence(token);
      }
    }, 80);
  }

  setRate(rate) {
    const token = ++this.playbackToken;
    this.clearSeekTimer();
    const wasPlaying = this.isPlaying;
    this.isProactiveEvade = true;
    this.isPausedByUser = false;
    this.rate = rate;

    this.detachCurrentUtterance();
    try {
      this.synth.cancel();
    } catch (e) {}

    this.seekTimer = setTimeout(() => {
      this.isProactiveEvade = false;
      if (this.playbackToken !== token) return;
      if (wasPlaying) {
        this.isPlaying = true;
        this.lastSpeechActivityTime = Date.now();
        logger.info('iOS v2 Player', `調整語速至 ${rate}x (第 ${this.currentIndex + 1} 句)`);
        this.speakCurrentSentence(token);
      }
    }, 80);
  }

  setVoice(voiceName) {
    this.voiceName = voiceName;
    const voices = this.synth ? this.synth.getVoices() : [];
    this.activeVoice = voices.find(v => v.name === voiceName) || null;
  }

  setPitch(pitch) {
    this.pitch = pitch;
  }

  notifySentenceChange() {
    eventBus.emit('audio:sentenceChange', {
      sentenceIndex: this.currentIndex,
      totalSentences: this.flatSentences.length,
      text: this.flatSentences[this.currentIndex] || '',
      chapterIndex: this.currentChapter ? this.currentChapter.index : 0
    });
  }

  notifyStateChange() {
    eventBus.emit('audio:stateChange', {
      isPlaying: this.isPlaying
    });
  }
}
