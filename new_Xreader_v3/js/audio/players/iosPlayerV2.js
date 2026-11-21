/**
 * new_Xreader - iOS Voice Player v2 (Story 58 ~ 67, v9.22)
 * High-performance mobile voice player optimized for iPadOS 27.2.1 / M4 iPad Pro / iOS Safari WebKit.
 *
 * CRITICAL ROOT CAUSE RESOLVED IN v9.22 (Proven by v9.20 & v9.21 Diagnostic Logs):
 * - In iPadOS 27.2.1 (Safari 27.2), touching `navigator.mediaSession.metadata` / `playbackState = 'playing'`
 *   while using `window.speechSynthesis` causes WebKit's MediaSession coordinator to fire a synthetic
 *   `mediaSession` 'pause' action exactly ~765ms after every `synth.speak()` call (on initial play,
 *   on sentence seek, on chapter transition, and on background transition), which invoked `this.pause()`
 *   and killed speech after 1-2 words!
 * - Solution:
 *   1. Completely removed all `navigator.mediaSession` bindings and state writes from the speech engine!
 *      WebKit can NEVER fire the 765ms synthetic `MediaSession [Pause]` callback again.
 *   2. Uses pure single-sentence utterances in foreground for instant seeking and accurate highlighting,
 *      with automatic multi-sentence batching when `document.hidden === true` (background / other tab)
 *      paired with a silent WebAudio + Audio loop so background reading continues seamlessly.
 */

import { eventBus } from '../../eventBus.js?v=9.22';
import { logger } from '../../core/logger.js?v=9.22';
import { SILENT_15S_WAV_BASE64 } from '../silentAudioData.js?v=9.22';

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

    // Mutex & Generation token
    this.instanceId = 'xreader_iosv2_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;

    // Non-MediaSession Background Keep-Alive (Silent Audio + WebAudio Clock)
    this.silentAudio = null;
    this.audioCtx = null;
    this.oscillator = null;
  }

  get currentSentenceIndex() {
    return this.currentIndex;
  }

  async init() {
    this.clearAnyMediaSessionHandlers();
    this.setupKeepAliveAudio();
    this.loadVoices();
    this.setupVisibilitySync();
    this.setupMutexChannel();
    this.setupLifecycleCleanup();

    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
    logger.info('iOS v2 Engine', 'iOS 朗讀引擎 v2 (v9.22 徹底拔除MediaSession 765ms反殺引信 + 純淨語音核心) 初始化完成');
  }

  /**
   * Explicitly unregisters any navigator.mediaSession handlers so iPadOS 27.2.1 Safari
   * can NEVER trigger a synthetic 765ms pause callback to kill speechSynthesis!
   */
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
    audio.src = SILENT_15S_WAV_BASE64;
    audio.loop = true;
    audio.volume = 0.01;
    this.silentAudio = audio;
  }

  startKeepAlive() {
    if (this.silentAudio && this.silentAudio.paused) {
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
  }

  stopKeepAlive() {
    if (this.silentAudio) {
      try { this.silentAudio.pause(); } catch (e) {}
    }
    if (this.audioCtx && this.audioCtx.state === 'running') {
      try { this.audioCtx.suspend().catch(() => {}); } catch (e) {}
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
          if (this.synth && this.synth.paused && !this.isPausedByUser) {
            try { this.synth.resume(); } catch (e) {}
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
      const isActuallyAlive = this.synth && (this.synth.speaking || this.synth.pending) && !this.synth.paused;
      if (!isActuallyAlive) {
        logger.info('iOS v2 SelfHeal', '偵測到底層已停音，重新啟動當前句朗讀');
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

    if (!isContinuousTransition && this.isPausedByUser && this.synth.speaking && this.synth.paused) {
      this.isPausedByUser = false;
      this.isPlaying = true;
      try {
        this.synth.resume();
      } catch (e) {}
      logger.info('iOS v2 Player', 'synth.resume() 恢復播放');
      this.notifyStateChange();
      return;
    }

    const token = ++this.playbackToken;
    this.clearSeekTimer();
    this.isPausedByUser = false;
    this.isPlaying = true;
    this.notifyStateChange();

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
      try { this.synth.cancel(); } catch (e) {}
    }

    logger.info('iOS v2 Player', `開始朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句, 自動跨章=${isContinuousTransition})`);
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

    // If running in background / hidden tab, batch up to 20 sentences into one utterance so background JS throttling doesn't stall between sentences!
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
      this.notifySentenceChange();
    };

    utterance.onstart = () => {
      if (this.playbackToken !== token) return;
      logger.info('iOS v2 Utterance', `onstart 觸發: 第 ${startIdx + 1}${batchCount > 1 ? '~' + endIdx : ''} 句`);
      triggerStart();
    };
    setTimeout(triggerStart, 200);

    if (batchCount > 1) {
      utterance.onboundary = (e) => {
        if (this.playbackToken !== token || !this.isPlaying || this.isProactiveEvade) return;
        if (typeof e.charIndex === 'number') {
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
    }

    utterance.onend = () => {
      if (typeof window !== 'undefined' && window.__xreaderActiveUtterances) {
        window.__xreaderActiveUtterances.delete(utterance);
      }
      if (this.playbackToken !== token) return;
      if (this.isProactiveEvade || !this.isPlaying) return;
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
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch (err) {
      logger.error('iOS v2 Player', `synth.speak 失敗: ${err}`);
    }
  }

  pause() {
    this.isPlaying = false;
    this.isPausedByUser = true;
    logger.info('iOS v2 Player', `使用者手動暫停 (停於第 ${this.currentIndex + 1} 句)`);
    if (this.synth && this.synth.speaking) {
      try {
        this.synth.pause();
      } catch (e) {}
    }
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
