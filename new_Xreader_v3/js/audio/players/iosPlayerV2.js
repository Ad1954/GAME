/**
 * new_Xreader - iOS Voice Player v2 (Story 58, 59, 60, 61, 62)
 * High-performance mobile voice player optimized for modern iOS/iPadOS (iPadOS 27.2.1 / M-series / WebKit).
 *
 * Key Architecture & Resiliency:
 * 1. Sliding-Window Native Queue Pre-feeding (PREQUEUE_SIZE = 8):
 *    Pre-queues up to 8 sentences into iOS native AVSpeechSynthesizer queue so background /
 *    other-tab / lock-screen playback continues seamlessly even when WebKit throttles background JS timers!
 * 2. Safe Cancel-to-Speak Isolation (60ms settle delay when cancelling an active queue):
 *    Never calls synth.cancel() and synth.speak() in the same 0ms tick, preventing WebKit zombie queue lockups.
 * 3. Self-Healing Toggle & Visibility Recovery:
 *    Detects desync (isPlaying=true while synth.speaking=false) on button tap or tab return,
 *    automatically recovering without requiring a page reload.
 * 4. Compliant Zero-Amplitude KeepAlive Audio & navigator.audioSession ('playback') declaration.
 * 5. Global Utterance GC Protection Anchor (window.__xreaderActiveUtterances).
 */

import { eventBus } from '../../eventBus.js';
import { logger } from '../../core/logger.js';
import { SILENT_15S_WAV_BASE64 } from '../silentAudioData.js';

// Global Utterance Anchor to protect active utterances from WebKit GC
if (typeof window !== 'undefined' && !window.__xreaderActiveUtterances) {
  window.__xreaderActiveUtterances = new Set();
}

const PREQUEUE_WINDOW_SIZE = 8;

export class IosVoicePlayerV2 {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentChapter = null;
    this.bookTitle = 'Xreader';
    this.flatSentences = [];
    this.currentIndex = 0;
    this.nextQueueIndex = 0;
    this.isPlaying = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voiceName = '';
    this.activeVoice = null;
    this.currentUtterance = null;
    this.isProactiveEvade = false;
    this.isPausedByUser = false;

    // Mutex & Re-entrancy guards
    this.instanceId = 'xreader_iosv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;

    // Timers
    this.watchdogTimer = null;
    this.cancelSettleTimer = null;
    this.resumeHeartbeatTimer = null;

    // Background Keep-Alive Audio Element
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
    this.startResumeHeartbeat();

    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    logger.info('iOS v2 Engine', 'iOS 朗讀核心引擎 v2 (滑動預載佇列 + 自癒防死鎖模式) 初始化完成');
  }

  /**
   * Safari 16.4+ / iPadOS 27+: Explicitly declare audioSession type as 'playback'
   * so iOS routes speech & keep-alive as primary media playback (continuing in background / lock screen).
   */
  configureNativeAudioSession() {
    try {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
        logger.info('iOS v2 AudioSession', '已啟用原生 navigator.audioSession.type = playback');
      }
    } catch (e) {
      console.warn('[iOS v2] navigator.audioSession setup warning:', e);
    }
  }

  /**
   * Periodic lightweight check: if iOS WebKit unexpectedly pauses speechSynthesis while isPlaying is true
   * (e.g. tab switch or system notification), kick it back with synth.resume().
   */
  startResumeHeartbeat() {
    if (this.resumeHeartbeatTimer) clearInterval(this.resumeHeartbeatTimer);
    this.resumeHeartbeatTimer = setInterval(() => {
      if (!this.isPlaying || this.isPausedByUser || this.isProactiveEvade) return;
      try {
        if (this.synth.speaking && this.synth.paused) {
          this.synth.resume();
        }
      } catch (e) {}
    }, 600);
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
      }).catch(err => {
        console.warn('[iOS v2] KeepAlive play blocked (waiting user interaction):', err);
      });
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
              logger.info('iOS v2 Mutex', '偵測到其他分頁發起播放，本實例讓位釋放音訊');
              this.stop(true);
            }
          }
        };
      } catch (e) {
        console.warn('[iOS v2] BroadcastChannel not supported:', e);
      }
    }
  }

  setupLifecycleCleanup() {
    const forceCleanup = (e) => {
      if (e && e.persisted) {
        logger.info('iOS v2 Lifecycle', '偵測到頁面進入背景快取 (pagehide persisted)，維持背景播放');
        return;
      }
      try {
        this.clearTimers();
        this.stop(true);
        if (this.synth) {
          this.synth.cancel();
        }
        if (window.__xreaderActiveUtterances) {
          window.__xreaderActiveUtterances.clear();
        }
      } catch (err) {}
    };

    window.addEventListener('pagehide', (e) => {
      if (!e.persisted) {
        forceCleanup(e);
      }
    });
    window.addEventListener('beforeunload', forceCleanup);
  }

  /**
   * Story 3: Visibility Self-Healing
   * When user switches back from another browser tab or unlocks the screen:
   * 1. Sync sentence highlight & MediaSession metadata immediately.
   * 2. If isPlaying is true, check if iOS suspended/dropped the speech queue while hidden:
   *    - If paused, resume it and top-up the pre-queue window.
   *    - If completely stopped (!speaking && !pending), automatically re-ignite from currentIndex
   *      or cleanly reset state so the play button NEVER gets stuck in a flashing dead state!
   */
  setupVisibilitySync() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        if (this.isPlaying) {
          this.notifySentenceChange();
          this.updateMediaSessionMetadata();
          this.startKeepAlive();

          try {
            if (this.synth.paused) {
              this.synth.resume();
            }
            if (!this.synth.speaking && !this.synth.pending) {
              logger.info('iOS v2 Visibility', '切回分頁偵測到背景語音佇列已排空或被系統中斷，自動接續重啟當前句');
              this.restartFromCurrentIndex(true);
            } else {
              // Top up sliding window queue if still speaking
              this.fillPreQueue(this.playbackToken);
            }
          } catch (e) {
            console.warn('[iOS v2] Visibility recovery error:', e);
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

  clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  clearTimers() {
    this.clearWatchdog();
    if (this.cancelSettleTimer) {
      clearTimeout(this.cancelSettleTimer);
      this.cancelSettleTimer = null;
    }
  }

  clearActiveUtterances() {
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

  /**
   * Story 2: Self-healing Play/Pause Toggle
   * If UI thinks player.isPlaying === true, but WebKit speechSynthesis is actually dead (!speaking && !pending),
   * treat the user's tap as an immediate fresh Play (re-igniting audio with user gesture) instead of pausing!
   */
  togglePlayPause() {
    if (this.isPlaying) {
      const isActuallyAlive = this.synth && (this.synth.speaking || this.synth.pending) && !this.synth.paused;
      if (!isActuallyAlive) {
        logger.info('iOS v2 SelfHeal', '偵測到狀態失步 (UI顯示播放中但底層已停音)，點擊按鈕直接觸發自癒重播');
        this.restartFromCurrentIndex(true);
        return;
      }
      this.pause();
    } else {
      this.play();
    }
  }

  loadChapter(chapter, startSentenceIndex = 0, bookTitle = 'Xreader', isContinuousTransition = false) {
    this.playbackToken++;
    this.clearTimers();
    this.clearActiveUtterances();

    this.isPausedByUser = false;
    this.isProactiveEvade = false;

    // Only cancel hardware queue if not a natural end-of-chapter transition (when queue is already empty)
    if (!isContinuousTransition && this.synth && (this.synth.speaking || this.synth.pending || this.synth.paused)) {
      try {
        this.synth.cancel();
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
    this.nextQueueIndex = this.currentIndex;
    this.notifySentenceChange();
    this.updateMediaSessionMetadata();
  }

  /**
   * Safely flushes any existing WebKit speech queue and starts speaking from currentIndex
   * after a 60ms settle window (if cancel was required) so WebKit never deadlocks on 0ms cancel+speak.
   */
  restartFromCurrentIndex(useSettleDelay = true) {
    const token = ++this.playbackToken;
    this.clearTimers();
    this.clearActiveUtterances();

    this.isPausedByUser = false;
    this.isProactiveEvade = false;
    this.isPlaying = true;
    this.nextQueueIndex = this.currentIndex;

    this.startKeepAlive();
    this.notifyStateChange();
    this.updateMediaSessionMetadata();

    const needsCancel = this.synth && (this.synth.speaking || this.synth.pending || this.synth.paused);
    if (needsCancel) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }

    if (needsCancel && useSettleDelay) {
      this.cancelSettleTimer = setTimeout(() => {
        if (this.playbackToken !== token || !this.isPlaying) return;
        try {
          if (this.synth.paused) this.synth.resume();
        } catch (e) {}
        this.fillPreQueue(token);
      }, 65);
    } else {
      try {
        if (this.synth.paused) this.synth.resume();
      } catch (e) {}
      this.fillPreQueue(token);
    }
  }

  play(isTransitionOrForce = false) {
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

    // Clean resume if paused by user and queue is still genuinely intact in WebKit
    if (!isTransitionOrForce && this.isPausedByUser && this.synth.speaking && this.synth.paused) {
      this.isPausedByUser = false;
      this.isPlaying = true;
      try {
        this.synth.resume();
      } catch (e) {}
      logger.info('iOS v2 Player', 'synth.resume() 恢復朗讀');
      this.notifyStateChange();
      this.updateMediaSessionMetadata();
      this.fillPreQueue(this.playbackToken);
      return;
    }

    const token = ++this.playbackToken;
    this.clearTimers();
    this.clearActiveUtterances();

    this.isPausedByUser = false;
    this.isProactiveEvade = false;
    this.isPlaying = true;
    this.nextQueueIndex = this.currentIndex;

    logger.info('iOS v2 Player', `開始朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句, transition=${isTransitionOrForce})`);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();

    // If transitioning from natural chapter end, queue is already empty — speak immediately!
    // If cancelling an active speech queue, wait 60ms settle time so iOS WebKit doesn't eat the new utterance.
    const hadActiveQueue = this.synth && (this.synth.speaking || this.synth.pending || this.synth.paused);
    if (hadActiveQueue) {
      try {
        this.synth.cancel();
      } catch (e) {}
      this.cancelSettleTimer = setTimeout(() => {
        if (this.playbackToken !== token || !this.isPlaying) return;
        try {
          if (this.synth.paused) this.synth.resume();
        } catch (e) {}
        this.fillPreQueue(token);
      }, 65);
    } else {
      try {
        if (this.synth.paused) this.synth.resume();
      } catch (e) {}
      this.fillPreQueue(token);
    }
  }

  /**
   * Story 3: Sliding-Window Native Queue Pre-feeding
   * Keeps up to PREQUEUE_WINDOW_SIZE (8) sentences queued in iOS native AVSpeechSynthesizer.
   * When Safari goes to background or another tab, iOS native speech daemon continues reading
   * the pre-queued utterances back-to-back without stalling when JS timers are throttled!
   */
  fillPreQueue(token) {
    if (!this.isPlaying || this.playbackToken !== token) return;

    // Check if the entire chapter has finished
    if (this.currentIndex >= this.flatSentences.length) {
      logger.info('iOS v2 Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，立即跨章銜接`);
      eventBus.emit('audio:chapterEnd', {
        chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
        isAutoTransition: true
      });
      return;
    }

    // Resolve preferred Chinese voice once
    if (!this.activeVoice) {
      try {
        const voices = this.synth.getVoices();
        const zhVoice = voices.find(v => v.lang && (v.lang.includes('zh') || v.lang.includes('cmn')));
        if (zhVoice) {
          this.activeVoice = zhVoice;
        }
      } catch (e) {}
    }

    const targetLimit = Math.min(this.flatSentences.length, this.currentIndex + PREQUEUE_WINDOW_SIZE);

    while (this.nextQueueIndex < targetLimit) {
      const sentenceIdx = this.nextQueueIndex;
      this.nextQueueIndex++;
      this.enqueueSentence(sentenceIdx, token);
    }
  }

  enqueueSentence(sentenceIdx, token) {
    const text = this.flatSentences[sentenceIdx];
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.rate = Math.min(Math.max(this.rate, 0.5), 2.5);
    utterance.pitch = this.pitch;
    if (this.activeVoice) {
      utterance.voice = this.activeVoice;
    }

    // Protect from WebKit Garbage Collector
    if (window.__xreaderActiveUtterances) {
      window.__xreaderActiveUtterances.add(utterance);
    }
    if (sentenceIdx === this.currentIndex) {
      this.currentUtterance = utterance;
      window.__xreaderCurrentUtterance = utterance;
    }

    utterance.onstart = () => {
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;
      this.currentIndex = sentenceIdx;
      this.currentUtterance = utterance;
      window.__xreaderCurrentUtterance = utterance;
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
      this.armWatchdogForSentence(sentenceIdx, text, token);
    };

    const handleSentenceComplete = () => {
      if (window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(utterance);
      }
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;

      // Advance currentIndex to the sentence after this one
      if (sentenceIdx >= this.currentIndex) {
        this.currentIndex = sentenceIdx + 1;
      }

      if (this.currentIndex >= this.flatSentences.length) {
        this.clearWatchdog();
        logger.info('iOS v2 Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，維持保活音訊並立即跨章銜接`);
        eventBus.emit('audio:chapterEnd', {
          chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
          isAutoTransition: true
        });
        return;
      }

      // Highlight next sentence & top up sliding window pre-queue
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
      this.armWatchdogForSentence(this.currentIndex, this.flatSentences[this.currentIndex] || '', token);
      this.fillPreQueue(token);
    };

    utterance.onend = () => {
      handleSentenceComplete();
    };

    utterance.onerror = (e) => {
      if (window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(utterance);
      }
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) {
        return;
      }
      console.warn('[iOS v2 Player] Utterance error, advancing:', e ? e.error : 'unknown');
      handleSentenceComplete();
    };

    // Arm watchdog if this is the immediate active sentence
    if (sentenceIdx === this.currentIndex) {
      this.armWatchdogForSentence(sentenceIdx, text, token);
    }

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[iOS v2] synth.speak error:', err);
    }
  }

  armWatchdogForSentence(sentenceIdx, text, token) {
    this.clearWatchdog();
    const textLen = (text || '').length;
    const estimatedDurationMs = Math.max(10000, Math.round((textLen / (Math.max(this.rate, 0.5) * 2.5)) * 1000) + 5000);
    this.watchdogTimer = setTimeout(() => {
      if (this.playbackToken !== token || !this.isPlaying || this.isPausedByUser) return;
      // Only intervene if speechSynthesis is completely idle/stuck (not speaking)
      if (!this.synth.speaking) {
        logger.warn('iOS v2 Watchdog', `第 ${sentenceIdx + 1} 句偵測到底層發音靜默卡死，Watchdog 自動自癒推進`);
        this.currentIndex = sentenceIdx + 1;
        if (this.currentIndex >= this.flatSentences.length) {
          eventBus.emit('audio:chapterEnd', {
            chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
            isAutoTransition: true
          });
        } else {
          this.restartFromCurrentIndex(true);
        }
      }
    }, estimatedDurationMs);
  }

  pause() {
    this.playbackToken++;
    this.clearTimers();
    this.isPlaying = false;
    this.isPausedByUser = true;
    logger.info('iOS v2 Player', `使用者暫停 (停於第 ${this.currentIndex + 1} 句)`);

    // On iOS WebKit, synth.cancel() on pause + fresh pre-queue on play() is far more reliable
    // than synth.pause(), which frequently corrupts multi-utterance queues in WebKit!
    this.clearActiveUtterances();
    try {
      this.synth.cancel();
    } catch (e) {}

    this.stopKeepAlive(false);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  stop(forceDestroy = false) {
    this.playbackToken++;
    this.clearTimers();
    this.isPlaying = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;

    this.clearActiveUtterances();
    try {
      this.synth.cancel();
    } catch (e) {}
    setTimeout(() => {
      this.isProactiveEvade = false;
    }, 80);

    this.stopKeepAlive(forceDestroy);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  seekSentence(sentenceIndex) {
    const wasPlaying = this.isPlaying;
    this.currentIndex = Math.max(0, Math.min(sentenceIndex, Math.max(0, this.flatSentences.length - 1)));
    this.nextQueueIndex = this.currentIndex;
    this.notifySentenceChange();

    if (wasPlaying) {
      this.restartFromCurrentIndex(true);
    } else {
      this.playbackToken++;
      this.clearTimers();
      this.clearActiveUtterances();
      this.isPausedByUser = false;
      try {
        this.synth.cancel();
      } catch (e) {}
    }
  }

  setRate(rate) {
    this.rate = rate;
    if (this.isPlaying) {
      this.restartFromCurrentIndex(true);
    }
  }

  setVoice(voiceName) {
    this.voiceName = voiceName;
    const voices = this.synth ? this.synth.getVoices() : [];
    this.activeVoice = voices.find(v => v.name === voiceName) || null;
    if (this.isPlaying) {
      this.restartFromCurrentIndex(true);
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
