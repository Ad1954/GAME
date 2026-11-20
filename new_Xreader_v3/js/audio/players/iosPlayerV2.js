/**
 * new_Xreader - iOS Voice Player v2 (Story 58 ~ 63, v9.18)
 * High-performance mobile voice player optimized for iPadOS 27.2.1 / iOS Safari WebKit.
 *
 * Core Solutions for the 4 Mandatory Priorities:
 * 1. Full-Chapter Playback (Priority 1):
 *    - Single active SpeechSynthesisUtterance anchored to window.__xreaderCurrentUtterance (prevents WebKit GC).
 *    - Compliant 15s zero-amplitude WAV KeepAlive + navigator.audioSession.type = 'playback'.
 * 2. Zero-Deadlock Sentence Seeking & Pause/Resume (Priority 2):
 *    - NEVER wraps user-gesture seekSentence() or play() in a setTimeout!
 *      Executes detach -> synth.cancel() -> synth.speak() synchronously (0ms) within the user's tap gesture,
 *      preserving iOS WebKit User Activation Token and eliminating 1-2 sentence seek deadlocks.
 * 3. Seamless Cross-Chapter Continuation (Priority 3):
 *    - When a chapter ends naturally (isContinuousTransition = true), NEVER calls synth.cancel()!
 *      (In WebKit, synth.speaking is still true inside onend; calling cancel() inside onend kills the next chapter).
 * 4. Background & Cross-Tab Long-Stream Relay (Priority 4):
 *    - When document.hidden becomes true (switching browser tabs, minimizing Safari, or locking screen),
 *      immediately merges remaining chapter sentences from currentIndex into one continuous background Utterance,
 *      tracking sentence progress via onboundary + elapsed time estimation so iOS AVSpeechSynthesizer reads the
 *      entire chapter continuously without needing background JS timers to fire between sentences!
 *    - When returning to the tab (document.hidden === false), syncs sentence highlight without calling
 *      gestureless cancel()+speak(), completely preventing tab-return deadlocks.
 */

import { eventBus } from '../../eventBus.js';
import { logger } from '../../core/logger.js';
import { SILENT_15S_WAV_BASE64 } from '../silentAudioData.js';

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

    // Background Long-Stream Relay tracking
    this.isBackgroundStreamMode = false;
    this.bgStreamStartIndex = 0;
    this.bgStreamOffsets = [];
    this.bgStreamStartTime = 0;

    // Mutex & Generation token
    this.instanceId = 'xreader_iosv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;

    // Keep-Alive Audio Element
    this.silentAudio = null;
    this.isAudioSessionActive = false;
  }

  get currentSentenceIndex() {
    return this.currentIndex;
  }

  async init() {
    this.configureNativeAudioSession();
    this.setupKeepAliveAudio();
    this.loadVoices();
    this.setupMediaSession();
    this.setupVisibilitySync();
    this.setupMutexChannel();
    this.setupLifecycleCleanup();

    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    logger.info('iOS v2 Engine', 'iOS 朗讀核心引擎 v2 (v9.18 同步手勢直通 + 背景長流接力模式) 初始化完成');
  }

  configureNativeAudioSession() {
    try {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) {}
  }

  setupKeepAliveAudio() {
    let audio = document.getElementById('ios-keepalive');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'ios-keepalive';
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }

    audio.src = SILENT_15S_WAV_BASE64;
    audio.loop = true;
    audio.volume = 0.01;
    this.silentAudio = audio;
  }

  startKeepAlive() {
    this.configureNativeAudioSession();
    if (this.silentAudio && this.silentAudio.paused) {
      this.silentAudio.play().then(() => {
        this.isAudioSessionActive = true;
      }).catch(() => {});
    } else if (this.silentAudio) {
      this.isAudioSessionActive = true;
    }
  }

  stopKeepAlive(forceDestroy = false) {
    if (this.silentAudio) {
      try {
        this.silentAudio.pause();
        if (forceDestroy) {
          this.silentAudio.currentTime = 0;
          this.isAudioSessionActive = false;
        }
      } catch (e) {}
    }
  }

  setupMutexChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.mutexChannel = new BroadcastChannel('xreader_audio_mutex');
        this.mutexChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'CLAIM_PLAYBACK') {
            if (event.data.instanceId !== this.instanceId && this.isPlaying) {
              this.stop(true);
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
        this.stop(true);
      } catch (err) {}
    };

    window.addEventListener('pagehide', (e) => {
      if (!e.persisted) forceCleanup(e);
    });
    window.addEventListener('beforeunload', forceCleanup);
  }

  /**
   * Story 3 (Priority 4): Background Long-Stream Relay & Zero-Deadlock Tab Return
   * - When entering background / switching away to another tab (document.hidden === true):
   *   While JS is still active in the visibilitychange callback, switch from single-sentence mode
   *   to a merged multi-sentence utterance so iOS AVSpeechSynthesizer keeps speaking continuously
   *   even after Safari suspends background JS timers!
   * - When returning to the tab (document.hidden === false):
   *   NEVER call cancel() + speak() without a user gesture!
   *   If speech is still running, keep it running and sync UI highlight;
   *   if iOS stopped it in background, sync isPlaying = false cleanly so the user can tap Play with 0 deadlock.
   */
  setupVisibilitySync() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.isPlaying && !this.isPausedByUser && !this.isBackgroundStreamMode) {
          this.enterBackgroundStreamMode();
        }
      } else {
        // Returned to foreground tab
        if (this.isPlaying) {
          // If background stream was running without boundary events, estimate current sentence by elapsed time
          if (this.isBackgroundStreamMode && this.bgStreamStartTime > 0 && this.bgStreamOffsets.length > 0) {
            this.syncBackgroundProgressByElapsed();
          }

          this.notifySentenceChange();
          this.updateMediaSessionMetadata();

          // Check actual hardware synthesizer state without firing gestureless cancel()+speak()
          const isSynthAlive = this.synth && (this.synth.speaking || this.synth.pending);
          if (!isSynthAlive) {
            logger.info('iOS v2 Visibility', '切回分頁偵測到系統已結束或暫停背景語音，已自動同步按鈕為待播放狀態');
            this.isBackgroundStreamMode = false;
            this.isPlaying = false;
            this.notifyStateChange();
            this.updateMediaSessionMetadata();
          } else if (this.synth.paused && !this.isPausedByUser) {
            try { this.synth.resume(); } catch (e) {}
          }
        }
      }
    });
  }

  /**
   * Merges sentences from currentIndex (up to 60 sentences / ~2500 chars) into a single continuous utterance
   * right as the page enters background/hidden state, allowing uninterrupted background reading.
   */
  enterBackgroundStreamMode() {
    if (!this.isPlaying || this.currentIndex >= this.flatSentences.length) return;
    // If only 1 sentence left in chapter, let it finish normally
    if (this.currentIndex >= this.flatSentences.length - 1) return;

    const token = ++this.playbackToken;
    this.isBackgroundStreamMode = true;
    this.bgStreamStartIndex = this.currentIndex;
    this.bgStreamStartTime = Date.now();
    this.bgStreamOffsets = [];

    const maxBatch = Math.min(this.flatSentences.length, this.currentIndex + 60);
    let combinedText = '';
    for (let idx = this.currentIndex; idx < maxBatch; idx++) {
      const s = this.flatSentences[idx] || '';
      const startChar = combinedText.length;
      combinedText += s + ' ';
      const endChar = combinedText.length;
      this.bgStreamOffsets.push({
        sentenceIndex: idx,
        startChar,
        endChar,
        length: s.length
      });
    }

    this.detachCurrentUtterance();
    try {
      this.synth.cancel();
    } catch (e) {}

    const bgUtterance = this.createConfiguredUtterance(combinedText);
    this.anchorUtterance(bgUtterance);

    bgUtterance.onboundary = (e) => {
      if (this.playbackToken !== token || !this.isPlaying) return;
      if (typeof e.charIndex === 'number') {
        for (let i = this.bgStreamOffsets.length - 1; i >= 0; i--) {
          if (e.charIndex >= this.bgStreamOffsets[i].startChar) {
            const mappedIdx = this.bgStreamOffsets[i].sentenceIndex;
            if (mappedIdx !== this.currentIndex) {
              this.currentIndex = mappedIdx;
              this.notifySentenceChange();
              this.updateMediaSessionMetadata();
            }
            break;
          }
        }
      }
    };

    bgUtterance.onend = () => {
      this.releaseUtterance(bgUtterance);
      if (this.playbackToken !== token || !this.isPlaying) return;
      this.isBackgroundStreamMode = false;
      this.currentIndex = maxBatch;
      if (this.currentIndex >= this.flatSentences.length) {
        eventBus.emit('audio:chapterEnd', {
          chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
          isAutoTransition: true
        });
      } else if (!document.hidden) {
        this.speakCurrentSentence();
      } else {
        this.enterBackgroundStreamMode();
      }
    };

    bgUtterance.onerror = (e) => {
      this.releaseUtterance(bgUtterance);
      if (this.playbackToken !== token || !this.isPlaying) return;
      this.isBackgroundStreamMode = false;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
      if (!document.hidden) {
        this.speakCurrentSentence();
      }
    };

    try {
      this.synth.speak(bgUtterance);
      logger.info('iOS v2 Background', `已啟動背景長流接力模式 (合併第 ${this.bgStreamStartIndex + 1} ~ ${maxBatch} 句)`);
    } catch (err) {
      this.isBackgroundStreamMode = false;
    }
  }

  syncBackgroundProgressByElapsed() {
    // Only use elapsed fallback if onboundary didn't already advance currentIndex
    if (this.currentIndex > this.bgStreamStartIndex) return;
    const elapsedSec = (Date.now() - this.bgStreamStartTime) / 1000;
    if (elapsedSec < 2) return;
    const charsPerSec = 4.2 * Math.max(this.rate, 0.5);
    const approxCharsRead = Math.floor(elapsedSec * charsPerSec);
    for (let i = 0; i < this.bgStreamOffsets.length; i++) {
      if (approxCharsRead >= this.bgStreamOffsets[i].startChar) {
        this.currentIndex = this.bgStreamOffsets[i].sentenceIndex;
      } else {
        break;
      }
    }
  }

  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      logger.info('iOS v2 MediaSession', '鎖屏面板 [Play] 遠端觸發');
      this.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      logger.info('iOS v2 MediaSession', '鎖屏面板 [Pause] 遠端觸發');
      this.pause();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      logger.info('iOS v2 MediaSession', '鎖屏面板 [NextTrack 下一章] 遠端觸發');
      eventBus.emit('audio:requestNextChapter');
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      logger.info('iOS v2 MediaSession', '鎖屏面板 [PrevTrack 上一章] 遠端觸發');
      eventBus.emit('audio:requestPrevChapter');
    });
  }

  updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return;

    const origin = window.location.origin;
    const basePath = window.location.pathname.replace(/\/[^/]*$/, '');
    const iconUrl = `${origin}${basePath}/icon.png`;

    const chapterTitle = this.currentChapter ? this.currentChapter.title : '小說朗讀';
    const sentenceProgress = this.flatSentences.length > 0
      ? `${this.bookTitle} (${this.currentIndex + 1}/${this.flatSentences.length})`
      : this.bookTitle;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapterTitle,
        artist: sentenceProgress,
        album: 'Xreader 聽書 v2',
        artwork: [
          { src: iconUrl, sizes: '512x512', type: 'image/png' }
        ]
      });
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    } catch (e) {}
  }

  loadVoices() {
    const allVoices = this.synth ? this.synth.getVoices() : [];
    if (this.voiceName) {
      this.activeVoice = allVoices.find(v => v.name === this.voiceName) || null;
    }
    return allVoices;
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

  anchorUtterance(utterance) {
    this.currentUtterance = utterance;
    if (typeof window !== 'undefined') {
      window.__xreaderCurrentUtterance = utterance;
      if (window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.add(utterance);
      }
    }
  }

  releaseUtterance(utterance) {
    if (typeof window !== 'undefined' && window.__xreaderActiveUtterances) {
      window.__xreaderActiveUtterances.delete(utterance);
    }
    if (this.currentUtterance === utterance) {
      this.currentUtterance = null;
    }
  }

  createConfiguredUtterance(text) {
    const utterance = new SpeechSynthesisUtterance(text);
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
    return utterance;
  }

  /**
   * Self-healing Play/Pause Toggle (called directly from user click on Play/Pause button)
   */
  togglePlayPause() {
    if (this.isPlaying) {
      const isActuallyAlive = this.synth && (this.synth.speaking || this.synth.pending) && !this.synth.paused;
      if (!isActuallyAlive) {
        logger.info('iOS v2 SelfHeal', '偵測到底層已停音，利用使用者點擊手勢直接同步重啟朗讀');
        this.isPlaying = false;
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
    this.isBackgroundStreamMode = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = false;
    this.detachCurrentUtterance();

    // CRITICAL FIX for Priority 3 (Cross-Chapter Continuation):
    // When isContinuousTransition === true (triggered from last sentence's onend),
    // WebKit's synth.speaking is STILL true during the onend callback!
    // We MUST NOT call synth.cancel() here during an auto-transition, otherwise WebKit locks the queue!
    if (!isContinuousTransition) {
      try {
        if (this.synth && (this.synth.speaking || this.synth.pending || this.synth.paused)) {
          this.synth.cancel();
        }
      } catch (e) {}
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
    this.notifySentenceChange();
    this.updateMediaSessionMetadata();
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

    this.startKeepAlive();
    this.isBackgroundStreamMode = false;

    // Clean resume if paused by user via synth.pause() and queue is still paused
    if (!isContinuousTransition && this.isPausedByUser && this.synth.speaking && this.synth.paused) {
      this.isPausedByUser = false;
      this.isPlaying = true;
      try {
        this.synth.resume();
      } catch (e) {}
      logger.info('iOS v2 Player', 'synth.resume() 恢復朗讀');
      this.notifyStateChange();
      this.updateMediaSessionMetadata();
      return;
    }

    this.isPausedByUser = false;
    this.isProactiveEvade = false;
    this.isPlaying = true;

    // CRITICAL FIX:
    // If this is a natural cross-chapter transition (isContinuousTransition === true),
    // NEVER call synth.cancel()! The previous chapter's last utterance just ended naturally.
    if (!isContinuousTransition) {
      this.detachCurrentUtterance();
      if (this.synth.paused || this.synth.speaking || this.synth.pending) {
        try {
          this.synth.cancel();
        } catch (e) {}
      }
    }

    logger.info('iOS v2 Player', `開始朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句, autoTransition=${isContinuousTransition})`);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();

    // Speak synchronously (0ms) to preserve User Gesture token or onend audio chain!
    this.speakCurrentSentence();
  }

  speakCurrentSentence() {
    if (!this.isPlaying || this.currentIndex >= this.flatSentences.length) {
      if (this.currentIndex >= this.flatSentences.length && this.isPlaying) {
        logger.info('iOS v2 Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，立即跨章銜接`);
        eventBus.emit('audio:chapterEnd', {
          chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
          isAutoTransition: true
        });
      }
      return;
    }

    // If page is currently in background when chapter transitions or advances, use background stream mode
    if (typeof document !== 'undefined' && document.hidden) {
      this.enterBackgroundStreamMode();
      return;
    }

    const currentToken = ++this.playbackToken;
    this.detachCurrentUtterance();

    const text = this.flatSentences[this.currentIndex];
    const utterance = this.createConfiguredUtterance(text);
    this.anchorUtterance(utterance);

    let hasTriggeredStart = false;
    const triggerStart = () => {
      if (this.playbackToken !== currentToken) return;
      if (hasTriggeredStart || this.isProactiveEvade || !this.isPlaying) return;
      hasTriggeredStart = true;
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
    };

    utterance.onstart = triggerStart;
    setTimeout(triggerStart, 180);

    utterance.onend = () => {
      this.releaseUtterance(utterance);
      if (this.playbackToken !== currentToken) return;
      if (this.isProactiveEvade || !this.isPlaying) return;
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    utterance.onerror = (e) => {
      this.releaseUtterance(utterance);
      if (this.playbackToken !== currentToken) return;
      if (this.isProactiveEvade || !this.isPlaying) return;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) {
        return;
      }
      console.warn('[iOS v2 Player] Utterance error, advancing:', e ? e.error : 'unknown');
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[iOS v2] synth.speak error:', err);
    }
  }

  pause() {
    this.playbackToken++;
    this.isPlaying = false;
    this.isPausedByUser = true;
    logger.info('iOS v2 Player', `使用者暫停 (停於第 ${this.currentIndex + 1} 句)`);

    // If we were in background merged stream mode, cancel cleanly so resuming in foreground starts at exact sentence
    if (this.isBackgroundStreamMode) {
      this.isBackgroundStreamMode = false;
      this.detachCurrentUtterance();
      try { this.synth.cancel(); } catch (e) {}
    } else if (this.synth.speaking) {
      try { this.synth.pause(); } catch (e) {}
    }

    this.stopKeepAlive(false);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  stop(forceDestroy = false) {
    this.playbackToken++;
    this.isBackgroundStreamMode = false;
    this.isPlaying = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;

    this.detachCurrentUtterance();
    try { this.synth.cancel(); } catch (e) {}
    setTimeout(() => { this.isProactiveEvade = false; }, 60);

    this.stopKeepAlive(forceDestroy);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  /**
   * CRITICAL FIX for Priority 2 (Manual Sentence Seeking without deadlock):
   * Executed SYNCHRONOUSLY (0ms, NO setTimeout!) inside the user's tap/click event handler.
   * Detaches old utterance callbacks first, cancels old speech, and immediately speaks the target sentence
   * while the iOS Safari User Gesture Activation Token is active!
   */
  seekSentence(sentenceIndex) {
    this.playbackToken++;
    this.isBackgroundStreamMode = false;
    const wasPlaying = this.isPlaying;
    this.isPausedByUser = false;
    this.isProactiveEvade = false;

    // 1. Detach old callbacks BEFORE cancel() so old onerror/onend cannot fire and corrupt state
    this.detachCurrentUtterance();
    try {
      this.synth.cancel();
    } catch (e) {}

    // 2. Update index and UI immediately
    this.currentIndex = Math.max(0, Math.min(sentenceIndex, Math.max(0, this.flatSentences.length - 1)));
    this.notifySentenceChange();

    // 3. Synchronously speak right inside the user tap gesture (NO setTimeout!)
    if (wasPlaying) {
      this.isPlaying = true;
      this.startKeepAlive();
      this.speakCurrentSentence();
    }
  }

  setRate(rate) {
    this.playbackToken++;
    this.isBackgroundStreamMode = false;
    const wasPlaying = this.isPlaying;
    this.isPausedByUser = false;
    this.isProactiveEvade = false;
    this.rate = rate;

    this.detachCurrentUtterance();
    try {
      this.synth.cancel();
    } catch (e) {}

    if (wasPlaying) {
      this.isPlaying = true;
      this.speakCurrentSentence();
    }
  }

  setVoice(voiceName) {
    this.voiceName = voiceName;
    const voices = this.synth ? this.synth.getVoices() : [];
    this.activeVoice = voices.find(v => v.name === voiceName) || null;
    if (this.isPlaying) {
      this.playbackToken++;
      this.isBackgroundStreamMode = false;
      this.detachCurrentUtterance();
      try { this.synth.cancel(); } catch (e) {}
      this.speakCurrentSentence();
    }
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
