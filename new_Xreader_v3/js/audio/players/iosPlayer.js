/**
 * new_Xreader - iOS / Mobile Voice Player (Physical Isolation per Story 3, 4, 5)
 * Encapsulates WebKit 15-second silent audio keep-alive, MediaSession integration,
 * visibility auto-sync, and proactive evade lifecycle.
 */

import { eventBus } from '../../eventBus.js';
import { SILENT_15S_WAV_BASE64 } from '../silentAudioData.js';
import { logger } from '../../core/logger.js';

export class IosVoicePlayer {
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

    // Mutex & Re-entrancy guards to prevent duplicate audio tracks
    this.instanceId = 'xreader_ios_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    this.playbackToken = 0;
    this.mutexChannel = null;

    // Background Keep-Alive Audio Element (Story 4, GWT 4.1)
    this.silentAudio = null;
    this.isAudioSessionActive = false;
  }

  async init() {
    this.setupSilentAudio();
    this.loadVoices();
    this.setupMediaSession();
    this.setupVisibilitySync();
    this.setupMutexChannel();
    this.setupLifecycleCleanup();

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  setupMutexChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.mutexChannel = new BroadcastChannel('xreader_audio_mutex');
        this.mutexChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'CLAIM_PLAYBACK') {
            if (event.data.instanceId !== this.instanceId && this.isPlaying) {
              logger.info('iOS Mutex', '偵測到其他分頁/視窗發起播放，本實例主動停止釋放音訊');
              this.stop(true);
            }
          }
        };
      } catch (e) {
        console.warn('[iOS Player] BroadcastChannel not supported:', e);
      }
    }
  }

  setupLifecycleCleanup() {
    // 當關閉分頁、清除網頁或切換離開時，強制終止系統級語音服務，杜絕孤兒音軌
    const forceCleanup = () => {
      try {
        this.stop(true);
        if (this.synth) {
          this.synth.cancel();
        }
      } catch (e) {}
    };
    window.addEventListener('pagehide', forceCleanup);
    window.addEventListener('beforeunload', forceCleanup);
  }

  setupSilentAudio() {
    // Mount to DOM to guarantee primary media element recognition in WebKit
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
    audio.volume = 0.01; // Non-zero volume ensures audio pipeline stays active

    this.silentAudio = audio;
  }

  startKeepAlive() {
    if (this.silentAudio) {
      if (this.silentAudio.paused) {
        this.silentAudio.play().then(() => {
          this.isAudioSessionActive = true;
          logger.info('iOS KeepAlive', '15s 靜音音訊播放成功 (AudioSession 已活化)');
        }).catch(err => {
          console.warn('[iOS Player] Silent audio play blocked (requires user gesture):', err);
          logger.warn('iOS KeepAlive', '靜音音訊遭 WebKit 攔截 (需使用者互動授權): ' + err);
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
      logger.info('iOS KeepAlive', `靜音音訊已暫停 (forceDestroy: ${forceDestroy})`);
    }
  }

  setupVisibilitySync() {
    // GWT 4.2: When unlocking screen or returning to tab, sync sentence highlight immediately
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPlaying) {
        this.notifySentenceChange();
        this.updateMediaSessionMetadata();
      }
    });
  }

  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    // GWT 5.2: Remote controls for Lock Screen & Bluetooth
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('[MediaSession] Play remote action received');
      logger.info('MediaSession', '鎖屏面板 [Play 播放] 遠端觸發');
      this.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('[MediaSession] Pause remote action received');
      logger.info('MediaSession', '鎖屏面板 [Pause 暫停] 遠端觸發');
      this.pause();
    });

    // GWT 5.3: Chapter skipping
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      console.log('[MediaSession] Next chapter remote action received');
      logger.info('MediaSession', '鎖屏面板 [NextTrack 下一章] 遠端觸發');
      eventBus.emit('audio:requestNextChapter');
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      console.log('[MediaSession] Prev chapter remote action received');
      logger.info('MediaSession', '鎖屏面板 [PrevTrack 上一章] 遠端觸發');
      eventBus.emit('audio:requestPrevChapter');
    });
  }

  updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return;

    // Resolve safe absolute URL for 512x512 PNG artwork (GWT 5.1)
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
      album: 'Xreader 聽書',
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

  loadChapter(chapter, startSentenceIndex = 0, bookTitle = 'Xreader', isContinuousTransition = false) {
    this.playbackToken++;

    if (isContinuousTransition) {
      // 跨章連續播放：維持保活音訊不斷流，前一章自然結束時發音佇列已排空，不調用 cancel() 以免誤殺新章節首句
      this.isProactiveEvade = false;
    } else {
      this.stop(false);
    }

    this.isPausedByUser = false;
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
      logger.warn('iOS Player', 'play() 略過: 無章節或句子長度為 0');
      return;
    }

    // 跨實例搶佔廣播：通知其他分頁或視窗立即停止播放
    if (this.mutexChannel) {
      try {
        this.mutexChannel.postMessage({ type: 'CLAIM_PLAYBACK', instanceId: this.instanceId });
      } catch (e) {}
    }

    this.startKeepAlive();

    // GWT 5.2 & GWT 20.2: Clean resume check using internal pause flag
    if (this.isPausedByUser && this.synth.speaking && this.synth.paused) {
      this.isPausedByUser = false;
      this.isPlaying = true;
      this.synth.resume();
      logger.info('iOS Player', 'synth.resume() 恢復播放');
      this.notifyStateChange();
      this.updateMediaSessionMetadata();
      return;
    }

    // 防重入檢查：只有在「非強制換章」且「底層發音引擎當前正在朗讀中」時，才攔截連點以防止雙音軌
    if (!force && this.isPlaying && !this.isPausedByUser && (this.synth.speaking || this.synth.pending)) {
      logger.info('iOS Player', 'play() 略過: 當前句子正在發音中，防止重入產生雙音軌');
      return;
    }

    this.isPausedByUser = false;
    this.isPlaying = true;

    // 若底層有卡住的暫停狀態，解除暫停
    if (this.synth.paused) {
      try { this.synth.resume(); } catch(e) {}
    }

    logger.info('iOS Player', `開始朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句, force=${force})`);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
    this.speakCurrentSentence();
  }

  speakCurrentSentence() {
    if (!this.isPlaying || this.currentIndex >= this.flatSentences.length) {
      if (this.currentIndex >= this.flatSentences.length && this.isPlaying) {
        logger.info('iOS Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，維持保活音訊不斷流並立即無縫銜接跨章`);
        // 關鍵修復：絕不將 this.isPlaying 設為 false，絕不暫停 silentAudio！
        // 保持 MediaSession 處於 playing，防止 iOS Standalone PWA 判定為暫停而立即凍結背景行程
        eventBus.emit('audio:chapterEnd', {
          chapterIndex: this.currentChapter ? this.currentChapter.index : 0,
          isAutoTransition: true
        });
      }
      return;
    }

    // 產生當前句朗讀的世代防護計數 Token
    const currentToken = ++this.playbackToken;

    // 清理前一個 utterance 的回調，防止任何滯後引發的二次調用
    if (this.currentUtterance) {
      this.currentUtterance.onstart = null;
      this.currentUtterance.onend = null;
      this.currentUtterance.onerror = null;
    }

    const text = this.flatSentences[this.currentIndex];

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = Math.min(Math.max(this.rate, 0.5), 2.5);
    this.currentUtterance.pitch = this.pitch;

    if (this.activeVoice) {
      this.currentUtterance.voice = this.activeVoice;
    }

    // GWT 20.1: Millisecond-accurate audio-visual synchronization (onstart trigger)
    let hasTriggeredStart = false;
    const triggerStart = () => {
      if (this.playbackToken !== currentToken) return;
      if (hasTriggeredStart || this.isProactiveEvade || !this.isPlaying) return;
      hasTriggeredStart = true;
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
    };

    this.currentUtterance.onstart = triggerStart;
    // Fallback in case onstart is delayed on punctuation-only sentences
    setTimeout(triggerStart, 250);

    this.currentUtterance.onend = () => {
      if (this.playbackToken !== currentToken) return;
      if (this.isProactiveEvade || !this.isPlaying) return;
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    this.currentUtterance.onerror = (e) => {
      if (this.playbackToken !== currentToken) return;
      if (this.isProactiveEvade || !this.isPlaying || e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('[iOS Player] Utterance error, advancing:', e.error);
      logger.error('iOS Player', `Utterance 朗讀錯誤: ${e.error} (停於第 ${this.currentIndex + 1} 句)`);
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    this.synth.speak(this.currentUtterance);
  }

  pause() {
    this.playbackToken++;
    this.isPlaying = false;
    this.isPausedByUser = true;
    logger.info('iOS Player', `使用者暫停 (停於第 ${this.currentIndex + 1} 句)`);
    if (this.synth.speaking) {
      // Use pause instead of cancel so lock screen / earphone resume works (GWT 5.2)
      this.synth.pause();
    }
    this.stopKeepAlive(false);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  stop(forceDestroy = false) {
    this.playbackToken++;
    this.isPlaying = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;
    try { this.synth.cancel(); } catch (e) {}
    setTimeout(() => { this.isProactiveEvade = false; }, 80);

    this.stopKeepAlive(forceDestroy);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  seekSentence(sentenceIndex) {
    this.playbackToken++;
    const wasPlaying = this.isPlaying;
    this.isProactiveEvade = true;
    this.isPausedByUser = false; // GWT 20.2: Reset paused flag so it never resumes empty queue!
    try { this.synth.cancel(); } catch (e) {}

    this.currentIndex = Math.max(0, Math.min(sentenceIndex, this.flatSentences.length - 1));
    this.notifySentenceChange();

    setTimeout(() => {
      this.isProactiveEvade = false;
      if (wasPlaying) {
        this.play();
      }
    }, 100);
  }

  setRate(rate) {
    this.playbackToken++;
    const wasPlaying = this.isPlaying;
    this.isProactiveEvade = true;
    this.isPausedByUser = false;
    try { this.synth.cancel(); } catch (e) {}
    this.rate = rate;

    setTimeout(() => {
      this.isProactiveEvade = false;
      if (wasPlaying) {
        this.play();
      }
    }, 100);
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
