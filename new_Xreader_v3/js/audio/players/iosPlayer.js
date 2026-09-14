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

    // Background Keep-Alive Audio Element (Story 4, GWT 4.1)
    this.silentAudio = null;
    this.isAudioSessionActive = false;
  }

  async init() {
    this.setupSilentAudio();
    this.loadVoices();
    this.setupMediaSession();
    this.setupVisibilitySync();

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
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

  loadChapter(chapter, startSentenceIndex = 0, bookTitle = 'Xreader') {
    this.stop(false);
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

  play() {
    if (!this.currentChapter || this.flatSentences.length === 0) {
      logger.warn('iOS Player', 'play() 略過: 無章節或句子長度為 0');
      return;
    }

    this.startKeepAlive();
    this.isPlaying = true;

    // GWT 5.2 & GWT 20.2: Clean resume check using internal pause flag
    if (this.isPausedByUser && this.synth.speaking && this.synth.paused) {
      this.isPausedByUser = false;
      this.synth.resume();
      logger.info('iOS Player', 'synth.resume() 恢復播放');
      this.notifyStateChange();
      this.updateMediaSessionMetadata();
    } else {
      this.isPausedByUser = false;
      // If synth had a stuck paused state from WebKit bug, cancel it cleanly
      if (this.synth.paused) {
        try { this.synth.cancel(); } catch(e) {}
      }
      logger.info('iOS Player', `開始朗讀 (第 ${this.currentIndex + 1}/${this.flatSentences.length} 句)`);
      this.notifyStateChange();
      this.updateMediaSessionMetadata();
      this.speakCurrentSentence();
    }
  }

  speakCurrentSentence() {
    if (!this.isPlaying || this.currentIndex >= this.flatSentences.length) {
      if (this.currentIndex >= this.flatSentences.length && this.isPlaying) {
        this.isPlaying = false;
        logger.info('iOS Player', `本章全數朗讀完成 (共 ${this.flatSentences.length} 句)，排程 150ms 觸發 audio:chapterEnd`);
        this.notifyStateChange();
        this.updateMediaSessionMetadata();
        // 150ms buffer before triggering next chapter (Story 6, GWT 6.1)
        setTimeout(() => {
          eventBus.emit('audio:chapterEnd', { chapterIndex: this.currentChapter ? this.currentChapter.index : 0 });
        }, 150);
      }
      return;
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
      if (hasTriggeredStart || this.isProactiveEvade || !this.isPlaying) return;
      hasTriggeredStart = true;
      this.notifySentenceChange();
      this.updateMediaSessionMetadata();
    };

    this.currentUtterance.onstart = triggerStart;
    // Fallback in case onstart is delayed on punctuation-only sentences
    setTimeout(triggerStart, 250);

    this.currentUtterance.onend = () => {
      if (this.isProactiveEvade || !this.isPlaying) return;
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    this.currentUtterance.onerror = (e) => {
      if (this.isProactiveEvade || !this.isPlaying || e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('[iOS Player] Utterance error, advancing:', e.error);
      logger.error('iOS Player', `Utterance 朗讀錯誤: ${e.error} (停於第 ${this.currentIndex + 1} 句)`);
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    this.synth.speak(this.currentUtterance);
  }

  pause() {
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
    this.isPlaying = false;
    this.isPausedByUser = false;
    this.isProactiveEvade = true;
    this.synth.cancel();
    setTimeout(() => { this.isProactiveEvade = false; }, 80);

    this.stopKeepAlive(forceDestroy);
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  seekSentence(sentenceIndex) {
    const wasPlaying = this.isPlaying;
    this.isProactiveEvade = true;
    this.isPausedByUser = false; // GWT 20.2: Reset paused flag so it never resumes empty queue!
    this.synth.cancel();

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
    const wasPlaying = this.isPlaying;
    this.isProactiveEvade = true;
    this.isPausedByUser = false;
    this.synth.cancel();
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
