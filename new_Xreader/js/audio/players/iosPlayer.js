/**
 * new_Xreader - iOS / Mobile Voice Player (Physical Isolation per ADR 0002, Story 4, 5)
 * Encapsulates WebKit silent audio keep-alive, MediaSession integration, and proactive evade.
 */

import { eventBus } from '../../eventBus.js';

// Base64 1-second silent WAV
const SILENT_WAV_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

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

    // Background Keep-Alive Audio Element
    this.silentAudio = null;
    this.isAudioSessionActive = false;
  }

  async init() {
    this.setupSilentAudio();
    this.loadVoices();
    this.setupMediaSession();

    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  setupSilentAudio() {
    if (!this.silentAudio) {
      this.silentAudio = new Audio(SILENT_WAV_BASE64);
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.01; // Minimal volume for background channel activation
    }
  }

  startKeepAlive() {
    if (this.silentAudio && !this.isAudioSessionActive) {
      this.silentAudio.play().then(() => {
        this.isAudioSessionActive = true;
      }).catch(err => {
        console.warn('[iOS Player] Silent audio play blocked (requires user gesture):', err);
      });
    }
  }

  stopKeepAlive(forceDestroy = false) {
    if (this.silentAudio && forceDestroy) {
      this.silentAudio.pause();
      this.silentAudio.currentTime = 0;
      this.isAudioSessionActive = false;
    }
  }

  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      eventBus.emit('audio:requestNextChapter');
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      eventBus.emit('audio:requestPrevChapter');
    });
  }

  updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: this.currentChapter ? this.currentChapter.title : '小說朗讀',
      artist: this.bookTitle,
      album: 'Xreader 聽書'
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
    if (!this.currentChapter || this.flatSentences.length === 0) return;

    this.startKeepAlive();
    this.isPlaying = true;
    this.notifyStateChange();
    this.updateMediaSessionMetadata();

    this.speakCurrentSentence();
  }

  speakCurrentSentence() {
    if (!this.isPlaying || this.currentIndex >= this.flatSentences.length) {
      if (this.currentIndex >= this.flatSentences.length && this.isPlaying) {
        this.isPlaying = false;
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
    this.notifySentenceChange();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = Math.min(Math.max(this.rate, 0.5), 2.5);
    this.currentUtterance.pitch = this.pitch;

    if (this.activeVoice) {
      this.currentUtterance.voice = this.activeVoice;
    }

    this.currentUtterance.onend = () => {
      if (this.isProactiveEvade || !this.isPlaying) return;
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    this.currentUtterance.onerror = (e) => {
      if (this.isProactiveEvade || !this.isPlaying || e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('[iOS Player] Utterance error, advancing:', e.error);
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    this.synth.speak(this.currentUtterance);
  }

  pause() {
    this.isPlaying = false;
    this.isProactiveEvade = true;
    this.synth.cancel();
    setTimeout(() => { this.isProactiveEvade = false; }, 80);

    // Keep silent audio channel alive per ADR 0002 so lock screen / earphone can resume
    this.notifyStateChange();
    this.updateMediaSessionMetadata();
  }

  stop(forceDestroy = false) {
    this.isPlaying = false;
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
