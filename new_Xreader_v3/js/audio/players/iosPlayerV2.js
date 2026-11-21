/**
 * new_Xreader - iOS Voice Player v2 (Story 58 ~ 65, v9.20)
 * High-performance mobile voice player optimized for iPadOS 27.2.1 / M4 iPad Pro / iOS Safari WebKit.
 *
 * Three Core Architectural Pillars for iPadOS 27.2.1:
 * 1. Dual Anti-Suspension KeepAlive (16-bit -84dB 20Hz Sub-Audible WAV @ Volume 1.0 + WebAudio Oscillator Clock):
 *    - iPadOS 27.2.1 mediaserverd squelches and suspends background tabs if <audio> plays pure 0x80 digital
 *      silence or has volume <= 0.05 (causing speech to fade out and stop 3 seconds after leaving Safari).
 *    - Generates a 16-bit 22050Hz PCM WAV with a 20Hz sine wave at amplitude ±2/32768 (-84dB, completely
 *      inaudible to human ears, 0 ducking trigger) played at standard volume = 1.0, paired with an unlocked
 *      WebAudio AudioContext 20Hz micro-clock so iPadOS 27.2.1 keeps the WebContent process 100% awake in background!
 * 2. 0ms Synchronous Call-Stack Execution (No setTimeout around synth.speak):
 *    - Safari 27.2 revokes transient user gesture / onend activation across setTimeout boundaries.
 *    - All play(), seekSentence(), setRate(), and cross-chapter transitions execute synth.speak()
 *      synchronously (0ms) within the active user gesture or onend callback stack!
 * 3. Full-Chapter Continuous Stream + onboundary Real-Time Sentence Tracking:
 *    - Feeds the remaining chapter sentences as a continuous stream so background playback never stalls
 *      between short sentences, while onboundary + time fallback highlights each sentence in real time.
 */

import { eventBus } from '../../eventBus.js?v=9.20';
import { logger } from '../../core/logger.js?v=9.20';

if (typeof window !== 'undefined' && !window.__xreaderActiveUtterances) {
  window.__xreaderActiveUtterances = new Set();
}

/**
 * Generates a 10-second 16-bit 22050Hz Mono WAV Data URL with a 20Hz sub-audible sine wave
 * at amplitude ±3 out of 32768 (-80.8 dBFS).
 * - Completely inaudible to human ears even at maximum iPad volume.
 * - Played at audio.volume = 1.0 so iPadOS 27.2.1 mediaserverd never flags it as muted or zero-amplitude silence!
 */
function generateSubAudible16BitWavDataUrl() {
  const sampleRate = 22050;
  const durationSec = 10;
  const numSamples = sampleRate * durationSec;
  const dataBytes = numSamples * 2; // 16-bit = 2 bytes per sample
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
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // Format = 1 (PCM)
  view.setUint16(22, 1, true);  // Channels = 1 (Mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true);  // Block align
  view.setUint16(34, 16, true); // Bits per sample = 16
  writeStr(36, 'data');
  view.setUint32(40, dataBytes, true);

  // 20Hz smooth sine wave with peak amplitude 3 / 32768 (-80.8 dB)
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

    // Continuous stream sentence offset mapping
    this.streamStartIndex = 0;
    this.streamEndIndex = 0;
    this.streamOffsets = [];
    this.streamStartTime = 0;
    this.streamCharsReadViaBoundary = false;
    this.progressSyncInterval = null;

    // Mutex & Generation token
    this.instanceId = 'xreader_iosv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;

    // Dual Keep-Alive (HTML5 Audio @ volume 1.0 + WebAudio Oscillator Clock)
    this.silentAudio = null;
    this.subAudibleWavUrl = null;
    this.audioCtx = null;
    this.oscillator = null;
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
    logger.info('iOS v2 Engine', 'iOS 朗讀引擎 v2 (v9.20 同步0ms手勢直通 + 16-bit非零超低頻雙重保活) 初始化完成');
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

    if (!this.subAudibleWavUrl) {
      this.subAudibleWavUrl = generateSubAudible16BitWavDataUrl();
    }
    audio.src = this.subAudibleWavUrl;
    audio.loop = true;
    // CRITICAL for iPadOS 27.2.1: volume MUST be 1.0 (not 0.01) so mediaserverd does not suspend the tab!
    // The WAV PCM data itself is already -80.8dB (3/32768), so at volume=1.0 it is 100% silent to human ears!
    audio.volume = 1.0;
    this.silentAudio = audio;
  }

  /**
   * Starts both the 16-bit -80dB HTML5 <audio> loop AND a WebAudio 20Hz sub-audible hardware clock
   * synchronously inside the user gesture so iPadOS 27.2.1 never fades out or suspends the page in background.
   */
  startKeepAlive() {
    this.configureNativeAudioSession();

    // 1. HTML5 Audio Keep-Alive (drives MediaSession & AVAudioSessionCategoryPlayback)
    if (this.silentAudio && this.silentAudio.paused) {
      this.silentAudio.volume = 1.0;
      this.silentAudio.play().then(() => {
        this.isAudioSessionActive = true;
        logger.info('iOS v2 KeepAlive', '16-bit 超低頻保活音軌啟動成功 (volume=1.0, -80dB)');
      }).catch(err => {
        logger.warn('iOS v2 KeepAlive', `保活音軌等待手勢解鎖: ${err && err.message ? err.message : err}`);
      });
    } else if (this.silentAudio) {
      this.isAudioSessionActive = true;
    }

    // 2. WebAudio Real-Time Rendering Clock (prevents iPadOS 27 WebContent process suspension)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioCtx();
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(20, this.audioCtx.currentTime); // 20Hz sub-audible
          gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime); // -80dB
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
      if (document.hidden) {
        if (this.isPlaying) {
          // Ensure AudioContext and silentAudio stay running when entering background
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            try { this.audioCtx.resume().catch(() => {}); } catch (e) {}
          }
          if (this.silentAudio && this.silentAudio.paused) {
            try { this.silentAudio.play().catch(() => {}); } catch (e) {}
          }
          logger.info('iOS v2 Background', `進入背景/切換分頁，維持連續流發音與雙重保活 (當前第 ${this.currentIndex + 1} 句)`);
        }
      } else {
        if (this.isPlaying) {
          this.checkTimeBasedProgress();
          this.notifySentenceChange();
          this.updateMediaSessionMetadata();

          const isSynthAlive = this.synth && (this.synth.speaking || this.synth.pending);
          if (!isSynthAlive) {
            logger.info('iOS v2 Visibility', '切回前台偵測到發音已結束或被系統暫停，同步按鈕為待播放狀態');
            this.stopProgressInterval();
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

  stopProgressInterval() {
    if (this.progressSyncInterval) {
      clearInterval(this.progressSyncInterval);
      this.progressSyncInterval = null;
    }
  }

  detachCurrentUtterance() {
    this.stopProgressInterval();
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

  flushSynthSynchronously() {
    if (!this.synth) return;
    try {
      this.synth.cancel();
    } catch (e) {}
  }

  togglePlayPause() {
    if (this.isPlaying) {
      const isActuallyAlive = this.synth && (this.synth.speaking || this.synth.pending) && !this.synth.paused;
      if (!isActuallyAlive) {
        logger.info('iOS v2 SelfHeal', '偵測到底層已停音，0ms 同步重啟全章連續流朗讀');
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
    this.detachCurrentUtterance();
    this.isPausedByUser = false;
    this.isProactiveEvade = false;

    if (!isContinuousTransition) {
      this.flushSynthSynchronously();
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
    logger.info('iOS v2 Player', `載入章節「${chapter ? chapter.title : ''}」(共 ${this.flatSentences.length} 句, 起始句: ${this.currentIndex + 1}, 跨章=${isContinuousTransition})`);
    this.notifySentenceChange();
    this.updateMediaSessionMetadata();
  }

  /**
   * CRITICAL FIX for Safari 27.2:
   * Executes 100% SYNCHRONOUSLY (0ms, zero setTimeout!) inside the user click gesture or onend callback!
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

    this.startKeepAlive();

    // Clean resume if paused by user and queue is still paused
    if (!isContinuousTransition && this.isPausedByUser && this.synth.speaking && this.synth.paused) {
      this.isPausedByUser = false;
      this.isPlaying = true;
      try {
        this.synth.resume();
      } catch (e) {}
      logger.info('iOS v2 Player', 'synth.resume() 恢復朗讀');
      this.startProgressInterval(this.playbackToken);
      this.notifyStateChange();
      this.updateMediaSessionMetadata();
      return;
    }

    const token = ++this.playbackToken;
    this.detachCurrentUtterance();

    if (!isContinuousTransition && this.synth && (this.synth.speaking || this.synth.pending || this.synth.paused)) {
      this.flushSynthSynchronously();
    }

    this.isPausedByUser = false;
    this.isProactiveEvade = false;
    this.isPlaying = true;

    logger.info('iOS v2 Player', `0ms 同步啟動全章連續流 (從第 ${this.currentIndex + 1}/${this.flatSentences.length} 句起, autoTransition=${isContinuousTransition})`);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();

    // 0ms synchronous invocation preserves User Gesture Activation Token on iPadOS 27.2.1!
    this.speakContinuousStreamFrom(this.currentIndex, token);
  }

  speakContinuousStreamFrom(startIdx, token) {
    if (!this.isPlaying || this.playbackToken !== token) return;

    if (startIdx >= this.flatSentences.length) {
      this.handleChapterFinished(token);
      return;
    }

    this.currentIndex = startIdx;
    this.streamStartIndex = startIdx;
    this.streamOffsets = [];
    this.streamCharsReadViaBoundary = false;

    const MAX_CHARS_PER_STREAM = 4500;
    let combinedText = '';
    let endIdx = startIdx;

    for (let idx = startIdx; idx < this.flatSentences.length; idx++) {
      const rawSentence = this.flatSentences[idx] || '';
      if (combinedText.length > 0 && (combinedText.length + rawSentence.length) > MAX_CHARS_PER_STREAM) {
        break;
      }
      const startChar = combinedText.length;
      combinedText += rawSentence + '  ';
      const endChar = combinedText.length;

      this.streamOffsets.push({
        sentenceIndex: idx,
        startChar,
        endChar,
        charLength: rawSentence.length
      });
      endIdx = idx + 1;
    }

    this.streamEndIndex = endIdx;
    const utterance = this.createConfiguredUtterance(combinedText);
    this.anchorUtterance(utterance);

    utterance.onstart = () => {
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;
      this.streamStartTime = Date.now();
      logger.info('iOS v2 Utterance', `onstart 觸發: 正在朗讀第 ${this.streamStartIndex + 1} ~ ${this.streamEndIndex} 句 (共 ${combinedText.length} 字)`);
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
      this.startProgressInterval(token);
    };

    utterance.onboundary = (e) => {
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;
      if (typeof e.charIndex === 'number') {
        this.streamCharsReadViaBoundary = true;
        for (let i = this.streamOffsets.length - 1; i >= 0; i--) {
          if (e.charIndex >= this.streamOffsets[i].startChar) {
            const matchedIdx = this.streamOffsets[i].sentenceIndex;
            if (matchedIdx !== this.currentIndex) {
              this.currentIndex = matchedIdx;
              this.notifySentenceChange();
              this.updateMediaSessionMetadata();
            }
            break;
          }
        }
      }
    };

    utterance.onend = () => {
      this.releaseUtterance(utterance);
      this.stopProgressInterval();
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;

      logger.info('iOS v2 Utterance', `onend 觸發: 區塊 (${this.streamStartIndex + 1} ~ ${this.streamEndIndex}) 朗讀完畢`);
      if (this.streamEndIndex >= this.flatSentences.length) {
        this.handleChapterFinished(token);
      } else {
        this.currentIndex = this.streamEndIndex;
        this.speakContinuousStreamFrom(this.currentIndex, token);
      }
    };

    utterance.onerror = (e) => {
      this.releaseUtterance(utterance);
      this.stopProgressInterval();
      if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;
      if (e && (e.error === 'interrupted' || e.error === 'canceled')) {
        return;
      }
      logger.error('iOS v2 Utterance', `onerror 觸發 (${e ? e.error : 'unknown'}) 於第 ${this.currentIndex + 1} 句`);
    };

    try {
      this.streamStartTime = Date.now();
      this.synth.speak(utterance);
      // Kick WebKit queue in case prior cancel() left internal paused state true
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.startProgressInterval(token);
    } catch (err) {
      logger.error('iOS v2 Player', `synth.speak 呼叫失敗: ${err}`);
    }
  }

  startProgressInterval(token) {
    this.stopProgressInterval();
    this.progressSyncInterval = setInterval(() => {
      if (this.playbackToken !== token || !this.isPlaying || this.isPausedByUser) {
        this.stopProgressInterval();
        return;
      }
      if (!this.streamCharsReadViaBoundary) {
        this.checkTimeBasedProgress();
      }
    }, 400);
  }

  checkTimeBasedProgress() {
    if (this.streamCharsReadViaBoundary || !this.streamStartTime || this.streamOffsets.length === 0) return;
    const elapsedSec = (Date.now() - this.streamStartTime) / 1000;
    const charsPerSec = 4.3 * Math.max(this.rate, 0.5);
    const estimatedCharPos = Math.floor(elapsedSec * charsPerSec);

    for (let i = this.streamOffsets.length - 1; i >= 0; i--) {
      if (estimatedCharPos >= this.streamOffsets[i].startChar) {
        const matchedIdx = this.streamOffsets[i].sentenceIndex;
        if (matchedIdx !== this.currentIndex) {
          this.currentIndex = matchedIdx;
          this.notifySentenceChange();
          this.updateMediaSessionMetadata();
        }
        break;
      }
    }
  }

  /**
   * CRITICAL FIX for Priority 3 (Cross-Chapter Continuation on iPadOS 27.2.1):
   * NO setTimeout! Emits audio:chapterEnd synchronously (0ms) inside onend so the next chapter's
   * synth.speak() executes directly within the active onend callback chain!
   */
  handleChapterFinished(token) {
    this.stopProgressInterval();
    if (this.playbackToken !== token || !this.isPlaying) return;
    logger.info('iOS v2 Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，0ms 同步跨章銜接`);
    eventBus.emit('audio:chapterEnd', {
      chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
      isAutoTransition: true
    });
  }

  pause() {
    this.playbackToken++;
    this.stopProgressInterval();
    this.isPlaying = false;
    this.isPausedByUser = true;
    logger.info('iOS v2 Player', `使用者暫停 (停於第 ${this.currentIndex + 1} 句)`);

    // Cancel current merged stream so resuming starts cleanly from the exact currentIndex sentence
    this.detachCurrentUtterance();
    this.flushSynthSynchronously();

    this.stopKeepAlive(false);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  stop(forceDestroy = false) {
    this.playbackToken++;
    this.stopProgressInterval();
    this.isPlaying = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;

    this.detachCurrentUtterance();
    this.flushSynthSynchronously();
    setTimeout(() => { this.isProactiveEvade = false; }, 60);

    this.stopKeepAlive(forceDestroy);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  /**
   * CRITICAL FIX for Priority 2 (Manual Sentence Seeking on iPadOS 27.2.1):
   * Executes 100% SYNCHRONOUSLY (0ms, NO setTimeout!) inside the user tap gesture!
   */
  seekSentence(sentenceIndex) {
    const token = ++this.playbackToken;
    this.stopProgressInterval();

    const wasPlaying = this.isPlaying;
    this.isPausedByUser = false;
    this.isProactiveEvade = false;

    this.detachCurrentUtterance();
    this.flushSynthSynchronously();

    this.currentIndex = Math.max(0, Math.min(sentenceIndex, Math.max(0, this.flatSentences.length - 1)));
    this.notifySentenceChange();
    this.updateMediaSessionMetadata();

    if (wasPlaying) {
      this.isPlaying = true;
      this.startKeepAlive();
      logger.info('iOS v2 Player', `0ms 同步手動跳轉至第 ${this.currentIndex + 1} 句`);
      this.speakContinuousStreamFrom(this.currentIndex, token);
    }
  }

  setRate(rate) {
    const token = ++this.playbackToken;
    this.stopProgressInterval();

    const wasPlaying = this.isPlaying;
    this.isPausedByUser = false;
    this.isProactiveEvade = false;
    this.rate = rate;

    this.detachCurrentUtterance();
    this.flushSynthSynchronously();

    if (wasPlaying) {
      this.isPlaying = true;
      logger.info('iOS v2 Player', `0ms 同步調整語速至 ${rate}x (第 ${this.currentIndex + 1} 句)`);
      this.speakContinuousStreamFrom(this.currentIndex, token);
    }
  }

  setVoice(voiceName) {
    this.voiceName = voiceName;
    const voices = this.synth ? this.synth.getVoices() : [];
    this.activeVoice = voices.find(v => v.name === voiceName) || null;
    if (this.isPlaying) {
      this.seekSentence(this.currentIndex);
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
