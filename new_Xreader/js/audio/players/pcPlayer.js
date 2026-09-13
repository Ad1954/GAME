/**
 * new_Xreader - PC Voice Player (Physical Isolation per ADR 0006 & Story 3)
 * Pure native Web Speech API with 0ms switch latency and proactive evade.
 */

import { eventBus } from '../../eventBus.js';

export class PcVoicePlayer {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentChapter = null;
    this.flatSentences = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voiceName = '';
    this.activeVoice = null;
    this.currentUtterance = null;
    this.isProactiveEvade = false; // State lock for parameter changes (Story 7)
  }

  async init() {
    this.loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    const allVoices = this.synth.getVoices();
    if (this.voiceName) {
      this.activeVoice = allVoices.find(v => v.name === this.voiceName) || null;
    }
    return allVoices;
  }

  loadChapter(chapter, startSentenceIndex = 0) {
    this.stop();
    this.currentChapter = chapter;
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
  }

  play() {
    if (!this.currentChapter || this.flatSentences.length === 0) return;
    if (this.synth.paused) {
      this.synth.resume();
      this.isPlaying = true;
      this.notifyStateChange();
      return;
    }

    this.isPlaying = true;
    this.notifyStateChange();
    this.speakCurrentSentence();
  }

  speakCurrentSentence() {
    if (!this.isPlaying || this.currentIndex >= this.flatSentences.length) {
      if (this.currentIndex >= this.flatSentences.length && this.isPlaying) {
        this.isPlaying = false;
        this.notifyStateChange();
        eventBus.emit('audio:chapterEnd', { chapterIndex: this.currentChapter ? this.currentChapter.index : 0 });
      }
      return;
    }

    const text = this.flatSentences[this.currentIndex];
    this.notifySentenceChange();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = Math.min(Math.max(this.rate, 0.5), 6.0);
    this.currentUtterance.pitch = this.pitch;

    if (this.activeVoice) {
      this.currentUtterance.voice = this.activeVoice;
    }

    this.currentUtterance.onend = () => {
      if (this.isProactiveEvade || !this.isPlaying) return; // Swallowed during param/jump change or when stopped
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    this.currentUtterance.onerror = (e) => {
      if (this.isProactiveEvade || !this.isPlaying || e.error === 'interrupted' || e.error === 'canceled') return;
      console.warn('[PC Player] Utterance error, skipping to next:', e.error);
      this.currentIndex++;
      this.speakCurrentSentence();
    };

    this.synth.speak(this.currentUtterance);
  }

  pause() {
    this.isPlaying = false;
    this.isProactiveEvade = true;
    this.synth.cancel();
    setTimeout(() => { this.isProactiveEvade = false; }, 50);
    this.notifyStateChange();
  }

  stop() {
    this.isPlaying = false;
    this.isProactiveEvade = true;
    this.synth.cancel();
    setTimeout(() => { this.isProactiveEvade = false; }, 50);
    this.notifyStateChange();
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
    }, 60);
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
    }, 60);
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
