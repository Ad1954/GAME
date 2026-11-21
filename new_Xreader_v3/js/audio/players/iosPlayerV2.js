/**
 * new_Xreader - iOS Voice Player v2 (Story 58 ~ 68, v9.23)
 * High-performance mobile voice player optimized for iPadOS 27.2.1 / M4 iPad Pro / iOS Safari WebKit.
 *
 * Key Breakthroughs in v9.23 (Proven by v9.22 125-line Diagnostic Logs):
 * 1. Completely Eliminated Broken `synth.pause()` / `synth.resume()` on Safari 27.2:
 *    - v9.22 logs proved that `synth.resume()` on iPadOS 27.2.1 NEVER fires `onstart` and leaves `synth.speaking`
 *      stuck at `true` in a zombie state, whereas `seekSentence()` (`synth.cancel()` -> 80ms -> `speakCurrentSentence()`)
 *      succeeded 100% of the time within 2ms!
 *    - Now `pause()` cleanly cancels the active utterance, and `play()` ALWAYS uses the exact same
 *      proven `synth.cancel()` -> 80ms breather -> `speakCurrentSentence()` pipeline as `seekSentence()`!
 * 2. Restored `navigator.audioSession.type = 'playback'` + 16-bit -80.8dB 20Hz Sub-Audible WAV @ Volume 1.0
 *    WITHOUT any `navigator.mediaSession` pause handler:
 *    - Prevents iPadOS 27.2.1 from downgrading speech to `AVAudioSessionCategoryAmbient` (which fades out on backgrounding),
 *      while keeping `navigator.mediaSession` completely unbound so WebKit never fires the 765ms synthetic pause!
 * 3. Instant Background Stall Detection & Auto-Reset on Foreground Return:
 *    - Tracks actual audio activity timestamps (`lastSpeechActivityTime`). If iOS ever interrupts background speech
 *      (e.g. system/app switch), returning to the page automatically clears the zombie queue and sets the button
 *      to Play (triangle) so a single tap on Play immediately resumes from the current sentence!
 */

import { eventBus } from '../../eventBus.js?v=9.23';
import { logger } from '../../core/logger.js?v=9.23';

if (typeof window !== 'undefined' && !window.__xreaderActiveUtterances) {
  window.__xreaderActiveUtterances = new Set();
}

/**
 * Generates a 10-second 16-bit 22050Hz Mono WAV Data URL with a 20Hz sub-audible sine wave
 * at amplitude ±3 out of 32768 (-80.8 dBFS), played at volume = 1.0.
 */
function generateSubAudible16BitWavDataUrl() {
  const sampleRate = 22050;
  const durationSec = 10;
  const numSamples = sampleRate * durationSec;
  const dataBytes = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  const twoPiF = (2 * Math.PI * 20) / sampleRate;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(3 * Math.sin(twoPiF * i));
    view.setInt16(44 + i * 2, sample, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
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

    this.seekTimer = null;
    this.bgHeartbeatTimer = null;
    this.lastSpeechActivityTime = 0;
    this.enteredBackgroundTime = 0;
    this.activityCountInBackground = 0;

    // Mutex & Generation token
    this.instanceId = 'xreader_iosv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;

    // Non-MediaSession Background Keep-Alive (16-bit Sub-Audible WAV @ Vol 1.0 + WebAudio Clock)
    this.silentAudio = null;
    this.subAudibleWavUrl = null;
    this.audioCtx = null;
    this.oscillator = null;
  }

  get currentSentenceIndex() {
    return this.currentIndex;
  }

  async init() {
    this.configureNativeAudioSession();
    this.clearAnyMediaSessionHandlers();
    this.setupKeepAliveAudio();
    this.loadVoices();
    this.setupVisibilitySync();
    this.setupMutexChannel();
    this.setupLifecycleCleanup();

    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    logger.info('iOS v2 Engine', 'iOS 朗讀引擎 v2 (v9.23 零resume殭屍死鎖 + Playback超低頻保活) 初始化完成');
  }

  configureNativeAudioSession() {
    try {
      if (typeof navigator !== 'undefined' && 'audioSession' in navigator && navigator.audioSession) {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) {}
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
    if (!this.subAudibleWavUrl) {
      this.subAudibleWavUrl = generateSubAudible16BitWavDataUrl();
    }
    audio.src = this.subAudibleWavUrl;
    audio.loop = true;
    audio.volume = 1.0; // 16-bit -80.8dB data at volume=1.0 prevents iPadOS 27 Ambient squelch
    this.silentAudio = audio;
  }

  startKeepAlive() {
    this.configureNativeAudioSession();
    this.clearAnyMediaSessionHandlers();

    if (this.silentAudio && this.silentAudio.paused) {
      this.silentAudio.volume = 1.0;
      this.silentAudio.play().catch(() => {});
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

    this.startBackgroundHeartbeat();
  }

  stopKeepAlive() {
    this.stopBackgroundHeartbeat();
    if (this.silentAudio) {
      try { this.silentAudio.pause(); } catch (e) {}
    }
    if (this.audioCtx && this.audioCtx.state === 'running') {
      try { this.audioCtx.suspend().catch(() => {}); } catch (e) {}
    }
  }

  startBackgroundHeartbeat() {
    this.stopBackgroundHeartbeat();
    this.bgHeartbeatTimer = setInterval(() => {
      if (!this.isPlaying) return;
      this.configureNativeAudioSession();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        try { this.audioCtx.resume().catch(() => {}); } catch (e) {}
      }
      if (this.silentAudio && this.silentAudio.paused) {
        try { this.silentAudio.play().catch(() => {}); } catch (e) {}
      }
    }, 2000);
  }

  stopBackgroundHeartbeat() {
    if (this.bgHeartbeatTimer) {
      clearInterval(this.bgHeartbeatTimer);
      this.bgHeartbeatTimer = null;
    }
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
   * Visibility Sync & Foreground Return Zombie Guard:
   * - When entering background (document.hidden === true): records timestamp and resets background activity counter.
   * - When returning to foreground (document.hidden === false):
   *   Checks if speech actually progressed or is still genuinely active.
   *   If iOS suspended/killed speech while in background (leaving synth.speaking stuck in a zombie state),
   *   automatically flushes the zombie queue via synth.cancel() and resets the button to Play (isPlaying = false),
   *   so the user NEVER has to tap another sentence or tap Pause->Play->Pause->Play to recover!
   */
  setupVisibilitySync() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.enteredBackgroundTime = Date.now();
        this.activityCountInBackground = 0;
        if (this.isPlaying) {
          this.configureNativeAudioSession();
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            try { this.audioCtx.resume().catch(() => {}); } catch (e) {}
          }
          if (this.silentAudio && this.silentAudio.paused) {
            try { this.silentAudio.play().catch(() => {}); } catch (e) {}
          }
          logger.info('iOS v2 Background', `進入背景/切換分頁，維持語音朗讀 (當前第 ${this.currentIndex + 1} 句)`);
        }
      } else {
        if (this.isPlaying) {
          this.notifySentenceChange();
          const bgDurationMs = Date.now() - this.enteredBackgroundTime;
          const timeSinceLastActivity = Date.now() - this.lastSpeechActivityTime;
          const isSynthDead = !this.synth || (!this.synth.speaking && !this.synth.pending) || this.synth.paused;

          // If we were in background for >2.5s and there was no speech activity for >3.5s (or synth is dead),
          // iOS killed the background speech pipeline and left synth.speaking in a zombie state!
          if (isSynthDead || (bgDurationMs > 2500 && timeSinceLastActivity > 3500)) {
            logger.info('iOS v2 Visibility', `切回前台偵測到背景語音已中斷 (背景停留 ${bgDurationMs}ms)，自動清理殭屍佇列並同步按鈕為待播放狀態`);
            this.playbackToken++;
            this.clearSeekTimer();
            this.detachCurrentUtterance();
            this.isPlaying = false;
            this.isPausedByUser = true;
            try { this.synth.cancel(); } catch (e) {}
            this.stopKeepAlive();
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

  /**
   * CRITICAL FIX in v9.23:
   * - For natural auto-transition across chapters (isContinuousTransition === true):
   *   Queue is already empty, speak immediately (0ms, no cancel).
   * - For ALL user-initiated Play actions (isContinuousTransition === false):
   *   NEVER use broken `synth.resume()`! Always execute the exact same proven pipeline as `seekSentence()`:
   *   `detachCurrentUtterance() -> synth.cancel() -> 80ms breather -> speakCurrentSentence(token)`!
   */
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
    this.startKeepAlive();
    this.notifyStateChange();

    if (isContinuousTransition) {
      this.isProactiveEvade = false;
      logger.info('iOS v2 Player', `自動跨章無縫朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句)`);
      this.speakCurrentSentence(token);
      return;
    }

    // Exact same rock-solid pipeline as seekSentence():
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
      if (typeof document !== 'undefined' && document.hidden) {
        this.activityCountInBackground++;
      }
      logger.info('iOS v2 Utterance', `onstart 觸發: 第 ${startIdx + 1}${batchCount > 1 ? '~' + endIdx : ''} 句`);
      triggerStart();
    };
    setTimeout(triggerStart, 200);

    utterance.onboundary = (e) => {
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;
      this.lastSpeechActivityTime = Date.now();
      if (typeof document !== 'undefined' && document.hidden) {
        this.activityCountInBackground++;
      }
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

  /**
   * CRITICAL FIX in v9.23:
   * Uses `synth.cancel()` instead of `synth.pause()`!
   * Why? Because `synth.pause()` on iPadOS 27.2.1 puts WebKit's speech queue into an unresumable zombie state,
   * whereas `synth.cancel()` on pause + `80ms -> speakCurrentSentence()` on play() works 100% of the time!
   */
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

    this.stopKeepAlive();
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

    this.stopKeepAlive();
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
