/**
 * new_Xreader - iOS Voice Player v2 (Story 58 ~ 64, v9.19)
 * High-performance mobile voice player optimized for iPadOS 27.2.1 / M4 iPad Pro / iOS Safari WebKit.
 *
 * Core Architecture (Full-Chapter Continuous Stream + Zero-Cancel Background Persistence):
 * 1. Foreground-Launched Full-Chapter Stream (Solves Priority 1 & Priority 4):
 *    - When play() is called in the foreground, merges remaining chapter sentences from currentIndex
 *      into a SINGLE continuous SpeechSynthesisUtterance.
 *    - When the user minimizes Safari, locks the screen, or switches browser tabs (document.hidden === true),
 *      we NEVER call synth.cancel() and NEVER start a new utterance in background!
 *      Because iOS AVSpeechSynthesizer is already speaking the full-chapter utterance, it continues
 *      reading the entire chapter in the background without relying on background JS timers!
 * 2. Real-Time Sentence Highlighting via onboundary + Time-Sync Fallback:
 *    - Maps charIndex offsets back to individual sentences so UI sentence highlighting and progress
 *      bars advance sentence-by-sentence in real time.
 * 3. Safe Pause -> Cancel -> 90ms Breather -> Resume -> Speak Sequence (Solves Priority 2):
 *    - When seeking sentences or changing speed, avoids the 0ms cancel+speak WebKit IPC race condition
 *      by pausing/cancelling cleanly, waiting 90ms for WebKit to clear its internal Cancelling flag,
 *      and launching the new continuous stream from the target sentence.
 * 4. 150ms Natural Chapter-End Buffer without cancel() (Solves Priority 3):
 *    - When the chapter stream finishes naturally (onend), waits 150ms for WebKit's synth.speaking flag
 *      to return to false, then transitions to the next chapter without calling synth.cancel().
 */

import { eventBus } from '../../eventBus.js';
import { logger } from '../../core/logger.js?v=9.19';
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

    // Continuous stream sentence offset mapping
    this.streamStartIndex = 0;
    this.streamEndIndex = 0;
    this.streamOffsets = [];
    this.streamStartTime = 0;
    this.streamCharsReadViaBoundary = false;
    this.progressSyncInterval = null;
    this.seekTimer = null;

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
    logger.info('iOS v2 Engine', 'iOS 朗讀引擎 v2 (v9.19 全章連續流 + 背景零中斷架構) 初始化完成');
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
   * CRITICAL FIX for Priority 4 (Background & Tab Switching):
   * - When document.hidden === true: DO NOTHING to speechSynthesis!
   *   Never call cancel() or speak() when going to background, because our active utterance
   *   already contains the entire rest of the chapter! Leaving it untouched lets iOS AVSpeechSynthesizer
   *   keep reading continuously in background and across tabs!
   * - When document.hidden === false (returning to tab):
   *   Sync UI sentence highlight and check if speech is still active.
   */
  setupVisibilitySync() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.isPlaying) {
          logger.info('iOS v2 Background', `進入背景/切換分頁，維持當前全章連續流發音不斷流 (當前第 ${this.currentIndex + 1} 句)`);
        }
      } else {
        if (this.isPlaying) {
          this.checkTimeBasedProgress();
          this.notifySentenceChange();
          this.updateMediaSessionMetadata();

          const isSynthAlive = this.synth && (this.synth.speaking || this.synth.pending);
          if (!isSynthAlive) {
            logger.info('iOS v2 Visibility', '切回分頁偵測到背景發音已結束或被系統暫停，同步按鈕為待播放狀態');
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

  clearSeekTimer() {
    if (this.seekTimer) {
      clearTimeout(this.seekTimer);
      this.seekTimer = null;
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

  /**
   * gentlyFlushSynth():
   * On iPadOS 27.2.1 WebKit, calling synth.pause() right before synth.cancel()
   * softens the native AVSpeechSynthesizer buffer teardown and prevents IPC queue lockup.
   */
  gentlyFlushSynth() {
    if (!this.synth) return;
    try {
      if (this.synth.speaking) {
        this.synth.pause();
      }
      this.synth.cancel();
    } catch (e) {}
  }

  togglePlayPause() {
    if (this.isPlaying) {
      const isActuallyAlive = this.synth && (this.synth.speaking || this.synth.pending) && !this.synth.paused;
      if (!isActuallyAlive) {
        logger.info('iOS v2 SelfHeal', '偵測到底層已停音，重新啟動全章連續流朗讀');
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
    this.isProactiveEvade = false;

    // Never call cancel() during a natural chapter end transition
    if (!isContinuousTransition) {
      this.gentlyFlushSynth();
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

    const hadActiveSpeech = !isContinuousTransition && this.synth && (this.synth.speaking || this.synth.pending || this.synth.paused);

    this.isPausedByUser = false;
    this.isProactiveEvade = false;
    this.isPlaying = true;

    logger.info('iOS v2 Player', `啟動全章連續流朗讀 (從第 ${this.currentIndex + 1}/${this.flatSentences.length} 句起, autoTransition=${isContinuousTransition})`);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();

    if (hadActiveSpeech) {
      const token = ++this.playbackToken;
      this.clearSeekTimer();
      this.detachCurrentUtterance();
      this.gentlyFlushSynth();
      this.seekTimer = setTimeout(() => {
        if (this.playbackToken !== token || !this.isPlaying) return;
        this.speakContinuousStreamFrom(this.currentIndex, token);
      }, 90);
    } else {
      const token = ++this.playbackToken;
      this.clearSeekTimer();
      this.detachCurrentUtterance();
      this.speakContinuousStreamFrom(this.currentIndex, token);
    }
  }

  /**
   * Builds and speaks a continuous stream Utterance starting from startIdx up to the end of the chapter
   * (capped at 120 sentences / ~4500 chars per batch to stay well within iOS AVSpeechSynthesizer buffer limits).
   * Maps charIndex boundaries back to sentence indices so UI highlights every sentence accurately
   * while iOS sees a single uninterrupted speech stream (allowing full background & cross-tab playback!).
   */
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
      // Add a natural pause delimiter so AVSpeechSynthesizer pauses slightly between sentences
      combinedText += rawSentence + '。 ';
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
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
      this.startProgressInterval(token);
    };

    // Primary sentence tracker: Native iOS word/sentence boundary events
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

      if (this.streamEndIndex >= this.flatSentences.length) {
        this.handleChapterFinished(token);
      } else {
        // Speak next batch of the chapter seamlessly
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
      logger.error('iOS v2 Player', `連續流朗讀異常 (${e ? e.error : 'unknown'})，嘗試推進至下一句`);
      const nextIdx = this.currentIndex + 1;
      if (nextIdx < this.flatSentences.length) {
        this.seekTimer = setTimeout(() => {
          if (this.playbackToken !== token || !this.isPlaying) return;
          this.speakContinuousStreamFrom(nextIdx, token);
        }, 100);
      } else {
        this.handleChapterFinished(token);
      }
    };

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.streamStartTime = Date.now();
      this.synth.speak(utterance);
      this.startProgressInterval(token);
    } catch (err) {
      logger.error('iOS v2 Player', `synth.speak 呼叫失敗: ${err}`);
    }
  }

  /**
   * Fallback sentence progress tracker in case a specific iOS voice does not emit onboundary events
   */
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
    }, 450);
  }

  checkTimeBasedProgress() {
    if (this.streamCharsReadViaBoundary || !this.streamStartTime || this.streamOffsets.length === 0) return;
    const elapsedSec = (Date.now() - this.streamStartTime) / 1000;
    // Standard Chinese speech speed at 1.0x is ~4.3 chars/sec
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
   * CRITICAL FIX for Priority 3 (Cross-Chapter Continuation):
   * Waits 150ms (proven in v3.04_APPLE_Final) after the chapter's final onend so WebKit's internal
   * synth.speaking flag naturally resets to false before firing audio:chapterEnd.
   */
  handleChapterFinished(token) {
    this.stopProgressInterval();
    logger.info('iOS v2 Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，150ms 後無縫跨章`);
    setTimeout(() => {
      if (this.playbackToken !== token || !this.isPlaying) return;
      eventBus.emit('audio:chapterEnd', {
        chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
        isAutoTransition: true
      });
    }, 150);
  }

  pause() {
    this.playbackToken++;
    this.clearSeekTimer();
    this.stopProgressInterval();
    this.isPlaying = false;
    this.isPausedByUser = true;
    logger.info('iOS v2 Player', `使用者暫停 (停於第 ${this.currentIndex + 1} 句)`);

    if (this.synth && this.synth.speaking) {
      try {
        this.synth.pause();
      } catch (e) {}
    }

    this.stopKeepAlive(false);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  stop(forceDestroy = false) {
    this.playbackToken++;
    this.clearSeekTimer();
    this.stopProgressInterval();
    this.isPlaying = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;

    this.detachCurrentUtterance();
    this.gentlyFlushSynth();
    setTimeout(() => { this.isProactiveEvade = false; }, 90);

    this.stopKeepAlive(forceDestroy);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  /**
   * CRITICAL FIX for Priority 2 (Manual Sentence Seeking without deadlock):
   * Uses the proven Pause -> Cancel -> 90ms Breather -> Speak Continuous Stream sequence
   * with debounce protection so rapid taps merge cleanly into a single fresh stream.
   */
  seekSentence(sentenceIndex) {
    const token = ++this.playbackToken;
    this.clearSeekTimer();
    this.stopProgressInterval();

    const wasPlaying = this.isPlaying;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;

    this.detachCurrentUtterance();
    this.gentlyFlushSynth();

    this.currentIndex = Math.max(0, Math.min(sentenceIndex, Math.max(0, this.flatSentences.length - 1)));
    this.notifySentenceChange();
    this.updateMediaSessionMetadata();

    this.seekTimer = setTimeout(() => {
      this.isProactiveEvade = false;
      if (this.playbackToken !== token) return;
      if (wasPlaying) {
        this.isPlaying = true;
        this.startKeepAlive();
        logger.info('iOS v2 Player', `手動跳轉至第 ${this.currentIndex + 1} 句，重新啟動全章連續流`);
        this.speakContinuousStreamFrom(this.currentIndex, token);
      }
    }, 90);
  }

  setRate(rate) {
    const token = ++this.playbackToken;
    this.clearSeekTimer();
    this.stopProgressInterval();

    const wasPlaying = this.isPlaying;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;
    this.rate = rate;

    this.detachCurrentUtterance();
    this.gentlyFlushSynth();

    this.seekTimer = setTimeout(() => {
      this.isProactiveEvade = false;
      if (this.playbackToken !== token) return;
      if (wasPlaying) {
        this.isPlaying = true;
        this.speakContinuousStreamFrom(this.currentIndex, token);
      }
    }, 90);
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
