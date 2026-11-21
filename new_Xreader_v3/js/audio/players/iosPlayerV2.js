/**
 * new_Xreader - iOS Voice Player v2 (Story 58 ~ 66, v9.21)
 * High-performance mobile voice player optimized for iPadOS 27.2.1 / M4 iPad Pro / iOS Safari WebKit.
 *
 * Root-Cause Fixes Proven by v9.20 Diagnostic Logs:
 * 1. Eliminated the MediaSession [Pause] Suicide Loop:
 *    - In v9.20 logs, playing an HTML5 <audio> element alongside speechSynthesis caused iPadOS 27.2.1
 *      to pause the <audio> element when entering background/returning, which automatically fired
 *      navigator.mediaSession's 'pause' handler and killed our speechSynthesis!
 *    - Fix: Removed HTML5 <audio> co-playback conflict; uses pure WebAudio AudioContext sub-audible
 *      clock + navigator.audioSession.type = 'playback', and guards MediaSession 'pause' against
 *      system visibility-transition false triggers.
 * 2. Pure Single-Sentence Utterance + 80ms Cancel Breather (Solves Sentence Seeking & Manual Chapter Switch):
 *    - Avoids 2,292-char mega-utterances that deadlock AVSpeechSynthesizer when cancelled.
 *    - Speaks 1 short sentence at a time. When seeking or switching chapters manually, calls synth.cancel()
 *      and waits 80ms for WebKit's native queue to flush before calling synth.speak().
 * 3. Zero-Cancel Natural Cross-Chapter Transition (Solves Auto Next Chapter):
 *    - When the last sentence of a chapter ends naturally (onend), transitions to chapter+1 without
 *      calling synth.cancel(), keeping the continuous speech chain alive.
 */

import { eventBus } from '../../eventBus.js?v=9.21';
import { logger } from '../../core/logger.js?v=9.21';

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

    // Timers & Guards
    this.seekTimer = null;
    this.lastVisibilityChangeTime = 0;

    // Mutex & Generation token
    this.instanceId = 'xreader_iosv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;

    // WebAudio Hardware Clock Keep-Alive (Zero conflict with MPNowPlayingInfoCenter / MediaSession)
    this.audioCtx = null;
    this.oscillator = null;
  }

  get currentSentenceIndex() {
    return this.currentIndex;
  }

  async init() {
    this.configureNativeAudioSession();
    this.loadVoices();
    this.setupMediaSession();
    this.setupVisibilitySync();
    this.setupMutexChannel();
    this.setupLifecycleCleanup();

    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    logger.info('iOS v2 Engine', 'iOS 朗讀引擎 v2 (v9.21 斬斷MediaSession假暫停 + 單句80ms安全緩衝) 初始化完成');
  }

  configureNativeAudioSession() {
    try {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) {}
  }

  /**
   * Starts a pure WebAudio AudioContext sub-audible clock (-80dB @ 20Hz) without any HTML5 <audio> element!
   * Why no HTML5 <audio>? Because in iPadOS 27.2.1, HTML5 <audio> gets paused by CoreAudio when
   * speechSynthesis speaks or when switching tabs, which causes iOS to fire a fake MediaSession 'pause'
   * event that kills speechSynthesis! WebAudio AudioContext keeps the process alive without triggering fake pause events.
   */
  startKeepAlive() {
    this.configureNativeAudioSession();

    // Remove any legacy #ios-keepalive <audio> element if present so it never fires MediaSession pause
    const legacyAudio = document.getElementById('ios-keepalive');
    if (legacyAudio) {
      try {
        legacyAudio.pause();
        legacyAudio.removeAttribute('src');
        legacyAudio.remove();
      } catch (e) {}
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(20, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          this.oscillator = osc;
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      }
    } catch (e) {}
  }

  stopKeepAlive() {
    if (this.audioCtx && this.audioCtx.state === 'running') {
      try {
        this.audioCtx.suspend().catch(() => {});
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

  setupVisibilitySync() {
    document.addEventListener('visibilitychange', () => {
      this.lastVisibilityChangeTime = Date.now();
      if (document.hidden) {
        if (this.isPlaying) {
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            try { this.audioCtx.resume().catch(() => {}); } catch (e) {}
          }
          logger.info('iOS v2 Background', `進入背景/切換分頁，維持單句接力朗讀 (當前第 ${this.currentIndex + 1} 句)`);
        }
      } else {
        if (this.isPlaying) {
          this.notifySentenceChange();
          this.updateMediaSessionMetadata();
          if (this.synth && this.synth.paused && !this.isPausedByUser) {
            try { this.synth.resume(); } catch (e) {}
          }
        }
      }
    });
  }

  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      logger.info('iOS v2 MediaSession', '鎖屏面板 [Play] 遠端觸發');
      this.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      // CRITICAL GUARD against iPadOS 27.2.1 fake MediaSession Pause on tab/background switch:
      // If a visibility change just occurred within 2.5 seconds, iOS Safari often emits a synthetic
      // mediaSession pause event when reclaiming foreground/background focus. Ignore it!
      const timeSinceVisChange = Date.now() - this.lastVisibilityChangeTime;
      if (timeSinceVisChange < 2500) {
        logger.warn('iOS v2 MediaSession', `已攔截並忽略系統於切換背景/前台時自動誤發的假 [Pause] 信號 (${timeSinceVisChange}ms)`);
        if (this.synth && this.synth.paused && this.isPlaying && !this.isPausedByUser) {
          try { this.synth.resume(); } catch (e) {}
        }
        navigator.mediaSession.playbackState = 'playing';
        return;
      }
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
      });
      window.__xreaderActiveUtterances.clear();
    }
    if (this.currentUtterance) {
      this.currentUtterance.onstart = null;
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
    }
    if (typeof window !== 'undefined') {
      window.__xreaderCurrentUtterance = null;
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      const isActuallyAlive = this.synth && (this.synth.speaking || this.synth.pending) && !this.synth.paused;
      if (!isActuallyAlive) {
        logger.info('iOS v2 SelfHeal', '偵測到底層已停音，重新點火當前句');
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

    // Clean resume if paused by user via synth.pause() and queue is still paused
    if (!isContinuousTransition && this.isPausedByUser && this.synth.speaking && this.synth.paused) {
      this.isPausedByUser = false;
      this.isPlaying = true;
      try {
        this.synth.resume();
      } catch (e) {}
      logger.info('iOS v2 Player', 'synth.resume() 恢復播放');
      this.notifyStateChange();
      this.updateMediaSessionMetadata();
      return;
    }

    const token = ++this.playbackToken;
    this.clearSeekTimer();
    this.isPausedByUser = false;
    this.isPlaying = true;

    this.notifyStateChange();
    this.updateMediaSessionMetadata();

    // If loadChapter() just cancelled active speech (manual chapter switch), wait 80ms breather before speaking
    if (!isContinuousTransition && this.isProactiveEvade) {
      logger.info('iOS v2 Player', `手動換章緩衝 80ms 後開始朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句)`);
      this.seekTimer = setTimeout(() => {
        this.isProactiveEvade = false;
        if (this.playbackToken !== token || !this.isPlaying) return;
        this.speakCurrentSentence(token);
      }, 80);
      return;
    }

    this.isProactiveEvade = false;
    if (!isContinuousTransition && this.synth.paused) {
      try { this.synth. cancel(); } catch (e) {}
    }

    logger.info('iOS v2 Player', `開始單句朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句, 自動跨章=${isContinuousTransition})`);
    this.speakCurrentSentence(token);
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

    const text = this.flatSentences[this.currentIndex];
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
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
    };

    utterance.onstart = triggerStart;
    setTimeout(triggerStart, 200);

    utterance.onend = () => {
      if (typeof window !== 'undefined' && window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(utterance);
      }
      if (this.playbackToken !== token) return;
      if (this.isProactiveEvade || !this.isPlaying) return;
      this.currentIndex++;
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
      this.currentIndex++;
      this.speakCurrentSentence(token);
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      logger.error('iOS v2 Player', `synth.speak 失敗: ${err}`);
    }
  }

  /**
   * CRITICAL: Uses synth.pause() (NOT synth.cancel()) so pausing never destroys or locks the WebKit queue!
   */
  pause() {
    this.isPlaying = false;
    this.isPausedByUser = true;
    logger.info('iOS v2 Player', `使用者暫停 (停於第 ${this.currentIndex + 1} 句)`);
    if (this.synth && this.synth.speaking) {
      try {
        this.synth.pause();
      } catch (e) {}
    }
    this.stopKeepAlive();
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
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

    this.stopKeepAlive();
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  /**
   * Single-sentence seek with 80ms cancel settle breather (proven in v3.04_APPLE_Final).
   * Because only 1 short sentence was in the queue (not 2,292 chars), 80ms is 100% sufficient
   * for WebKit to clear the single utterance and speak the newly selected sentence cleanly!
   */
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
    this.updateMediaSessionMetadata();

    this.seekTimer = setTimeout(() => {
      this.isProactiveEvade = false;
      if (this.playbackToken !== token) return;
      if (wasPlaying) {
        this.isPlaying = true;
        this.startKeepAlive();
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
