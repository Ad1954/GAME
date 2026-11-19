/**
 * new_Xreader - iOS Voice Player v2 (Story 58, 59)
 * High-performance mobile voice player optimized for modern iOS/iPadOS (M-series / iOS 17.2+ / 18+ / 27+).
 * 
 * Key Architecture & Resiliency:
 * 1. Micro-Dither Dynamic KeepAlive Audio (prevents WebKit Energy Silence Suspension)
 * 2. Background Persistence (pagehide persisted checks strictly protect background playback)
 * 3. Seamless Chapter Transitions (keeps audio session running, zero pause-play collisions)
 * 4. WebKit Utterance GC Protection Anchor (window.__xreaderActiveUtterances)
 * 5. Dynamic Watchdog Auto-Advance Timer (recovers from dropped onend events)
 * 6. Self-Healing Transient Interruption Recovery (auto-retries on WebKit transient cancel)
 * 7. Full MediaSession Integration (remote control for Lock Screen & Bluetooth)
 */

import { eventBus } from '../../eventBus.js';
import { logger } from '../../core/logger.js';

// Global Utterance Anchor to protect active utterances from WebKit GC
if (typeof window !== 'undefined' && !window.__xreaderActiveUtterances) {
  window.__xreaderActiveUtterances = new Set();
}

/**
 * Dynamically generates a 15-second WAV audio Blob URL with inaudible micro-dither.
 * Non-zero PCM samples (alternating 127..129 around center 128) bypass modern WebKit's
 * zero-energy media suspension heuristics.
 */
function generateMicroDitherWavUrl() {
  const sampleRate = 8000;
  const duration = 15;
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // Byte rate (8000 * 1 * 1)
  view.setUint16(32, 1, true); // Block align (1 * 1)
  view.setUint16(34, 8, true); // 8-bit PCM
  writeString(36, 'data');
  view.setUint32(40, numSamples, true);

  const bytes = new Uint8Array(buffer, 44, numSamples);
  for (let i = 0; i < numSamples; i++) {
    // 10Hz inaudible sub-wave with 1 LSB amplitude (127 to 129)
    bytes[i] = 128 + Math.round(Math.sin(2 * Math.PI * 10 * i / sampleRate));
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
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

    // Mutex & Re-entrancy guards
    this.instanceId = 'xreader_iosv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;

    // Watchdog Timer
    this.watchdogTimer = null;

    // Background Keep-Alive Audio Element with Micro-Dither
    this.silentAudio = null;
    this.microDitherUrl = null;
    this.isAudioSessionActive = false;
  }

  get currentSentenceIndex() {
    return this.currentIndex;
  }

  async init() {
    this.setupKeepAliveAudio();
    this.loadVoices();
    this.setupMediaSession();
    this.setupVisibilitySync();
    this.setupMutexChannel();
    this.setupLifecycleCleanup();

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    logger.info('iOS v2 Engine', 'iOS 朗讀核心引擎 v2 (新版強效模式) 初始化完成');
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

    try {
      this.microDitherUrl = generateMicroDitherWavUrl();
      audio.src = this.microDitherUrl;
    } catch (e) {
      console.warn('[iOS v2] Failed to generate micro-dither URL, using empty fallback', e);
    }

    audio.loop = true;
    audio.volume = 0.01; // Inaudible to user, non-zero for CoreAudio hardware routing

    // Auto-recover if WebKit attempts to pause background audio while still playing
    audio.addEventListener('pause', () => {
      if (this.isPlaying && !this.isPausedByUser && !this.isProactiveEvade) {
        logger.warn('iOS v2 KeepAlive', '偵測到保活音訊遭系統暫停，自動發起恢復...');
        audio.play().catch(() => {});
      }
    });

    this.silentAudio = audio;
  }

  startKeepAlive() {
    if (this.silentAudio) {
      if (this.silentAudio.paused) {
        this.silentAudio.play().then(() => {
          this.isAudioSessionActive = true;
          logger.info('iOS v2 KeepAlive', '動態微振保活音訊播放中 (AudioSession 已啟動)');
        }).catch(err => {
          console.warn('[iOS v2] KeepAlive play blocked (waiting user interaction):', err);
          logger.warn('iOS v2 KeepAlive', '微振保活音訊需手勢授權: ' + err);
        });
      } else {
        this.isAudioSessionActive = true;
      }
    }
  }

  stopKeepAlive(forceDestroy = false) {
    if (this.silentAudio) {
      this.silentAudio.pause();
      if (forceDestroy) {
        this.silentAudio.currentTime = 0;
        this.isAudioSessionActive = false;
      }
      logger.info('iOS v2 KeepAlive', `保活音訊已暫停 (forceDestroy: ${forceDestroy})`);
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
      // 關鍵防護 1：在 iOS Safari 中，鎖屏或切換至其他 App 會觸發 pagehide (e.persisted === true)
      // 若此時調用 stop() 或 cancel() 會直接誤殺背景播放並造成 WebKit 語音通道死鎖！
      if (e && e.persisted) {
        logger.info('iOS v2 Lifecycle', '偵測到頁面進入背景快取 (pagehide persisted)，維持背景播放');
        return;
      }
      try {
        this.clearWatchdog();
        this.stop(true);
        if (this.synth) {
          this.synth.cancel();
        }
        if (window.__xreaderActiveUtterances) {
          window.__xreaderActiveUtterances.clear();
        }
      } catch (err) {}
    };

    // 杜絕 pagehide 誤殺背景播放：只在非 persisted 時清理
    window.addEventListener('pagehide', (e) => {
      if (!e.persisted) {
        forceCleanup(e);
      }
    });
    window.addEventListener('beforeunload', forceCleanup);
  }

  setupVisibilitySync() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPlaying) {
        // Unlock screen or return to foreground: sync UI instantly
        this.notifySentenceChange();
        this.updateMediaSessionMetadata();
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

    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapterTitle,
      artist: sentenceProgress,
      album: 'Xreader 聽書 v2',
      artwork: [
        { src: iconUrl, sizes: '512x512', type: 'image/png' }
      ]
    });

    navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
  }

  loadVoices() {
    const allVoices = this.synth.getVoices();
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

  loadChapter(chapter, startSentenceIndex = 0, bookTitle = 'Xreader', isContinuousTransition = false) {
    // 世代 Token 遞增：立即失效前一章節的所有非同步事件與句子回調
    this.playbackToken++;
    this.clearWatchdog();

    // 關鍵修復：換章時絕不暫停保活音訊，絕不呼叫 this.stop()！
    // 保持保活音訊不斷流，AudioSession 不會被 iOS 釋放
    this.isPausedByUser = false;
    this.isProactiveEvade = false;

    // 清理前一個 utterance
    if (this.currentUtterance) {
      if (window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(this.currentUtterance);
      }
      this.currentUtterance.onstart = null;
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
      this.currentUtterance = null;
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

    this.currentIndex = Math.max(0, Math.min(startSentenceIndex, this.flatSentences.length - 1));
    this.notifySentenceChange();
    this.updateMediaSessionMetadata();
  }

  play(force = false) {
    if (!this.currentChapter || this.flatSentences.length === 0) {
      logger.warn('iOS v2 Player', 'play() 略過: 無章節或句子長度為 0');
      return;
    }

    // 跨實例搶佔廣播
    if (this.mutexChannel) {
      try {
        this.mutexChannel.postMessage({ type: 'CLAIM_PLAYBACK', instanceId: this.instanceId });
      } catch (e) {}
    }

    this.startKeepAlive();

    // 暫停後直接恢復
    if (this.isPausedByUser && this.synth.speaking && this.synth.paused) {
      this.isPausedByUser = false;
      this.isPlaying = true;
      this.synth.resume();
      logger.info('iOS v2 Player', 'synth.resume() 恢復朗讀');
      this.notifyStateChange();
      this.updateMediaSessionMetadata();
      return;
    }

    this.isPausedByUser = false;
    this.isPlaying = true;

    if (this.synth.paused) {
      try { this.synth.resume(); } catch(e) {}
    }

    logger.info('iOS v2 Player', `開始朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句, force=${force})`);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();

    // 關鍵平順過渡：若底層發音引擎當前正處於前一句/前一章的發音中，給予 60ms 安全排空間隔
    // 讓 WebKit cancel 乾淨沉澱，防止新句子的 speak() 撞上 cancel 產生 canceled 錯誤
    if (this.synth.speaking) {
      try { this.synth.cancel(); } catch(e) {}
      setTimeout(() => {
        if (this.isPlaying && !this.isPausedByUser) {
          this.speakCurrentSentence();
        }
      }, 60);
    } else {
      this.speakCurrentSentence();
    }
  }

  speakCurrentSentence() {
    this.clearWatchdog();

    if (!this.isPlaying || this.currentIndex >= this.flatSentences.length) {
      if (this.currentIndex >= this.flatSentences.length && this.isPlaying) {
        logger.info('iOS v2 Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，維持保活音訊並立即跨章銜接`);
        // 核心保活：絕不將 this.isPlaying 設為 false，絕不暫停保活音訊！
        // 保持 MediaSession 處於 playing，防止 iOS 凍結背景行程
        eventBus.emit('audio:chapterEnd', {
          chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
          isAutoTransition: true
        });
      }
      return;
    }

    const currentToken = ++this.playbackToken;

    // 清理前一個 utterance
    if (this.currentUtterance) {
      if (window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(this.currentUtterance);
      }
      this.currentUtterance.onstart = null;
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
    }

    const text = this.flatSentences[this.currentIndex];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.min(Math.max(this.rate, 0.5), 2.5);
    utterance.pitch = this.pitch;

    if (this.activeVoice) {
      utterance.voice = this.activeVoice;
    }

    this.currentUtterance = utterance;

    // 【核心防護 1: GC 錨定】註冊至全域 Set，杜絕 Safari JSC 在朗讀途中垃圾回收引發斷流
    if (window.__xreaderActiveUtterances) {
      window.__xreaderActiveUtterances.add(utterance);
    }

    let hasTriggeredStart = false;
    const triggerStart = () => {
      if (this.playbackToken !== currentToken) return;
      if (hasTriggeredStart || this.isProactiveEvade || !this.isPlaying) return;
      hasTriggeredStart = true;
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
    };

    utterance.onstart = triggerStart;
    setTimeout(triggerStart, 150);

    const cleanupAndNext = () => {
      this.clearWatchdog();
      if (window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(utterance);
      }
      if (this.playbackToken !== currentToken) return;
      if (this.isProactiveEvade || !this.isPlaying) return;
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    utterance.onend = () => {
      cleanupAndNext();
    };

    utterance.onerror = (e) => {
      this.clearWatchdog();
      if (window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(utterance);
      }
      if (this.playbackToken !== currentToken) return;
      if (this.isProactiveEvade || !this.isPlaying) return;

      // 【核心防護 2: 自癒重試機制】
      // 若在播放狀態下收到 canceled 或 interrupted（常見於 WebKit 引擎微暫態或音軌切換）
      if (e.error === 'canceled' || e.error === 'interrupted') {
        logger.warn('iOS v2 Player', `偵測到 WebKit 非預期中斷 (${e.error})，啟動自癒重試...`);
        setTimeout(() => {
          if (this.playbackToken === currentToken && this.isPlaying && !this.isPausedByUser) {
            this.speakCurrentSentence();
          }
        }, 100);
        return;
      }

      console.warn('[iOS v2 Player] Utterance error, advancing:', e.error);
      logger.error('iOS v2 Player', `Utterance 朗讀錯誤: ${e.error} (停於第 ${this.currentIndex + 1} 句)`);
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    // 【核心防護 3: 動態看門狗 Watchdog】
    // WebKit 在短句、數字或標點符號常發生丟失 onend 事件的已知系統缺陷
    const textLen = (text || '').length;
    const estimatedDurationMs = Math.max(2200, Math.round((textLen / (Math.max(this.rate, 0.5) * 3.5)) * 1000) + 1800);
    this.watchdogTimer = setTimeout(() => {
      if (this.playbackToken === currentToken && this.isPlaying) {
        logger.warn('iOS v2 Watchdog', `第 ${this.currentIndex + 1} 句逾時 (${estimatedDurationMs}ms)，Watchdog 自動推進至下一句`);
        cleanupAndNext();
      }
    }, estimatedDurationMs);

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[iOS v2] synth.speak error:', err);
      logger.error('iOS v2 Player', `synth.speak 調用失敗: ${err}`);
      setTimeout(() => {
        if (this.playbackToken === currentToken && this.isPlaying) {
          cleanupAndNext();
        }
      }, 200);
    }
  }

  pause() {
    this.playbackToken++;
    this.clearWatchdog();
    this.isPlaying = false;
    this.isPausedByUser = true;
    logger.info('iOS v2 Player', `使用者暫停 (停於第 ${this.currentIndex + 1} 句)`);
    if (this.synth.speaking) {
      this.synth.pause();
    }
    this.stopKeepAlive(false);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  stop(forceDestroy = false) {
    this.playbackToken++;
    this.clearWatchdog();
    this.isPlaying = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;

    if (window.__xreaderActiveUtterances) {
      window.__xreaderActiveUtterances.clear();
    }

    try { this.synth.cancel(); } catch (e) {}
    setTimeout(() => { this.isProactiveEvade = false; }, 80);

    this.stopKeepAlive(forceDestroy);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  seekSentence(sentenceIndex) {
    this.playbackToken++;
    this.clearWatchdog();
    const wasPlaying = this.isPlaying;
    this.isPausedByUser = false;

    if (window.__xreaderActiveUtterances) {
      window.__xreaderActiveUtterances.clear();
    }

    try { this.synth.cancel(); } catch (e) {}

    this.currentIndex = Math.max(0, Math.min(sentenceIndex, this.flatSentences.length - 1));
    this.notifySentenceChange();

    if (wasPlaying) {
      setTimeout(() => {
        if (this.isPlaying || wasPlaying) {
          this.play(true);
        }
      }, 60);
    }
  }

  setRate(rate) {
    this.playbackToken++;
    this.clearWatchdog();
    const wasPlaying = this.isPlaying;
    this.isPausedByUser = false;

    if (window.__xreaderActiveUtterances) {
      window.__xreaderActiveUtterances.clear();
    }

    try { this.synth.cancel(); } catch (e) {}
    this.rate = rate;

    if (wasPlaying) {
      setTimeout(() => {
        if (this.isPlaying || wasPlaying) {
          this.play(true);
        }
      }, 60);
    }
  }

  setVoice(voiceName) {
    this.voiceName = voiceName;
    const voices = this.synth.getVoices();
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
