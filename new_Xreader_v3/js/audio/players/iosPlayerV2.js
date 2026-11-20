/**
 * new_Xreader - iOS Voice Player v2 (Story 58, 59, 60)
 * High-performance mobile voice player optimized for modern iOS/iPadOS (M-series / iOS 17.2+ / 18+ / 27+).
 * 
 * Key Architecture & Resiliency:
 * 1. Micro-Dither Dynamic KeepAlive Audio (Data URL Base64 avoids WebKit Blob sandbox issues)
 * 2. Background Persistence (pagehide persisted checks strictly protect background playback)
 * 3. Seamless Chapter Transitions (keeps audio session running, zero pause-play collisions)
 * 4. WebKit Utterance GC Protection Anchor (window.__xreaderActiveUtterances)
 * 5. Strict User Gesture Preservation (synchronous call stack invocation for iOS Safari)
 * 6. Dynamic Watchdog Auto-Advance Timer (recovers from dropped onend events)
 * 7. Full MediaSession Integration (remote control for Lock Screen & Bluetooth)
 */

import { eventBus } from '../../eventBus.js';
import { logger } from '../../core/logger.js';
import { SILENT_15S_WAV_BASE64 } from '../silentAudioData.js';

// Global Utterance Anchor to protect active utterances from WebKit GC
if (typeof window !== 'undefined' && !window.__xreaderActiveUtterances) {
  window.__xreaderActiveUtterances = new Set();
}

/**
 * Generates a 15-second WAV Data URL with inaudible micro-dither (±1 LSB @ 10Hz).
 * Using Base64 Data URL instead of Blob URL avoids WebKit media sandbox restrictions on iOS.
 */
function generateMicroDitherBase64Wav() {
  const sampleRate = 8000;
  const duration = 15;
  const numSamples = sampleRate * duration;
  const buffer = new Uint8Array(44 + numSamples);

  const headerStr = 'RIFF';
  for (let i = 0; i < 4; i++) buffer[i] = headerStr.charCodeAt(i);
  const fileLen = 36 + numSamples;
  buffer[4] = fileLen & 0xff;
  buffer[5] = (fileLen >> 8) & 0xff;
  buffer[6] = (fileLen >> 16) & 0xff;
  buffer[7] = (fileLen >> 24) & 0xff;

  const waveStr = 'WAVEfmt ';
  for (let i = 0; i < 8; i++) buffer[8 + i] = waveStr.charCodeAt(i);

  buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0; // fmt chunk size
  buffer[20] = 1; buffer[21] = 0; // PCM format (1)
  buffer[22] = 1; buffer[23] = 0; // 1 channel (mono)
  buffer[24] = 0x40; buffer[25] = 0x1f; buffer[26] = 0; buffer[27] = 0; // 8000 Hz
  buffer[28] = 0x40; buffer[29] = 0x1f; buffer[30] = 0; buffer[31] = 0; // 8000 bytes/sec
  buffer[32] = 1; buffer[33] = 0; // 1 block align
  buffer[34] = 8; buffer[35] = 0; // 8 bits per sample

  const dataStr = 'data';
  for (let i = 0; i < 4; i++) buffer[36 + i] = dataStr.charCodeAt(i);
  buffer[40] = numSamples & 0xff;
  buffer[41] = (numSamples >> 8) & 0xff;
  buffer[42] = (numSamples >> 16) & 0xff;
  buffer[43] = (numSamples >> 24) & 0xff;

  // 10Hz inaudible sub-wave with 1 LSB amplitude (samples 127..129)
  for (let i = 0; i < numSamples; i++) {
    buffer[44 + i] = 128 + Math.round(Math.sin(2 * Math.PI * 10 * i / sampleRate));
  }

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
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

    // Background Keep-Alive Audio Element with Micro-Dither Data URL
    this.silentAudio = null;
    this.microDitherDataUrl = null;
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

    // Story 61: 改用純數位零振幅相容靜音音軌 (SILENT_15S_WAV_BASE64)，避免觸發 CoreAudio 聲道互斥與壓縮鴨子音 (Ducking)
    audio.src = SILENT_15S_WAV_BASE64;
    audio.loop = true;
    audio.volume = 0.01;

    // 關鍵修復：絕不在 audio 上加 pause 監聽反撲 play()，避免與 speechSynthesis 搶佔聲道導致 1~2 字腰斬！
    this.silentAudio = audio;
  }

  startKeepAlive() {
    if (this.silentAudio && this.silentAudio.paused) {
      this.silentAudio.play().then(() => {
        this.isAudioSessionActive = true;
        logger.info('iOS v2 KeepAlive', '靜音保活音訊已啟動 (AudioSession 活化)');
      }).catch(err => {
        console.warn('[iOS v2] KeepAlive play blocked (waiting user interaction):', err);
      });
    } else if (this.silentAudio) {
      this.isAudioSessionActive = true;
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
      // 關鍵防護：在 iOS Safari 中，鎖屏或切換至其他 App 會觸發 pagehide (e.persisted === true)
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
    this.playbackToken++;
    this.clearWatchdog();

    // 換章時維持保活音訊不斷流，絕不呼叫 this.stop()
    this.isPausedByUser = false;
    this.isProactiveEvade = false;

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

    // 換章或連續播放時絕不呼叫 cancel()，避免 iOS WebKit 取消佇列後鎖死後續 speak()
    if (!force && this.synth.speaking) {
      try { this.synth.cancel(); } catch(e) {}
    }

    logger.info('iOS v2 Player', `開始朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句, force=${force})`);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
    this.speakCurrentSentence();
  }

  speakCurrentSentence() {
    this.clearWatchdog();

    if (!this.isPlaying || this.currentIndex >= this.flatSentences.length) {
      if (this.currentIndex >= this.flatSentences.length && this.isPlaying) {
        logger.info('iOS v2 Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，維持保活音訊並立即跨章銜接`);
        eventBus.emit('audio:chapterEnd', {
          chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
          isAutoTransition: true
        });
      }
      return;
    }

    const currentToken = ++this.playbackToken;

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
    utterance.lang = 'zh-TW'; // Story 61: 明確設定繁體中文語言代碼，避免 iOS 誤用外語引擎
    utterance.rate = Math.min(Math.max(this.rate, 0.5), 2.5);
    utterance.pitch = this.pitch;

    if (this.activeVoice) {
      utterance.voice = this.activeVoice;
    } else {
      // 容錯機制：若尚未綁定聲音，從系統即時尋找中文聲音
      try {
        const voices = this.synth.getVoices();
        const zhVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn'));
        if (zhVoice) {
          this.activeVoice = zhVoice;
          utterance.voice = zhVoice;
        }
      } catch (e) {}
    }

    this.currentUtterance = utterance;

    // 【核心防護 1: GC 錨定】註冊至全域 Set 與頂層引用
    if (window.__xreaderActiveUtterances) {
      window.__xreaderActiveUtterances.add(utterance);
    }
    window.__xreaderCurrentUtterance = utterance;

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
      if (window.__xreaderCurrentUtterance === utterance) {
        window.__xreaderCurrentUtterance = null;
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
      if (window.__xreaderCurrentUtterance === utterance) {
        window.__xreaderCurrentUtterance = null;
      }
      if (this.playbackToken !== currentToken) return;
      if (this.isProactiveEvade || !this.isPlaying) return;

      // 若為正常中斷或取消，不進行非同步遞迴重試 (防止失去手勢導致無限死鎖)
      if (e.error === 'interrupted' || e.error === 'canceled') {
        return;
      }

      console.warn('[iOS v2 Player] Utterance error, advancing:', e.error);
      logger.error('iOS v2 Player', `Utterance 朗讀錯誤: ${e.error} (停於第 ${this.currentIndex + 1} 句)`);
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    // 【核心防護 2: 動態看門狗 Watchdog】放寬逾時時間至 8 秒以上，僅作為異常凍結之最後防線，不提前干擾正常朗讀
    const textLen = (text || '').length;
    const estimatedDurationMs = Math.max(8000, Math.round((textLen / (Math.max(this.rate, 0.5) * 2.5)) * 1000) + 4000);
    this.watchdogTimer = setTimeout(() => {
      if (this.playbackToken === currentToken && this.isPlaying) {
        logger.warn('iOS v2 Watchdog', `第 ${this.currentIndex + 1} 句異常逾時 (${estimatedDurationMs}ms)，Watchdog 自動推進至下一句`);
        cleanupAndNext();
      }
    }, estimatedDurationMs);

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[iOS v2] synth.speak error:', err);
      logger.error('iOS v2 Player', `synth.speak 調用失敗: ${err}`);
      cleanupAndNext();
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
      this.play(true);
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
      this.play(true);
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
