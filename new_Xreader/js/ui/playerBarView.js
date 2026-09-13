/**
 * new_Xreader - PlayerBarView (Story 4, 7, GWT 7.1)
 * Controls playback bar, sentence skipping, progress slider, debounced speed slider, and sleep timer.
 */

import { player, currentPlatform } from '../audio/playerFactory.js';
import { sleepTimer } from '../audio/sleepTimer.js';
import { eventBus } from '../eventBus.js';

export class PlayerBarView {
  constructor() {
    this.bar = document.getElementById('player-bar');
    this.btnPlay = document.getElementById('player-btn-play');
    this.btnPrev = document.getElementById('player-btn-prev');
    this.btnNext = document.getElementById('player-btn-next');
    this.slider = document.getElementById('player-slider');
    this.lblProgress = document.getElementById('player-lbl-progress');
    this.lblPercent = document.getElementById('player-lbl-percent');

    // Speed Controller with Debounce (Story 7, Story 14)
    this.speedSlider = document.getElementById('player-speed-slider');
    this.speedLabel = document.getElementById('player-speed-val');
    this.speedDebounceTimer = null;

    // Sleep Timer
    this.sleepSelect = document.getElementById('player-sleep-select');
    this.sleepBadge = document.getElementById('player-sleep-countdown');

    this.totalSentences = 0;
    this.currentSentence = 0;
  }

  init() {
    this.loadSpeedSettings();
    this.bindEvents();

    eventBus.on('audio:stateChange', ({ isPlaying }) => this.updatePlayIcon(isPlaying));
    eventBus.on('audio:sentenceChange', (data) => this.onSentenceUpdate(data));
    eventBus.on('audio:rateChange', ({ rate, source }) => {
      if (source === 'playerBar') return;
      if (this.speedSlider) this.speedSlider.value = rate;
      if (this.speedLabel) this.speedLabel.textContent = `${rate.toFixed(1)}x`;
    });
    eventBus.on('timer:tick', ({ formatted }) => this.onTimerTick(formatted));
    eventBus.on('timer:change', ({ label }) => this.onTimerLabel(label));
    eventBus.on('timer:cancel', () => this.onTimerCancel());
    eventBus.on('timer:end', ({ message }) => {
      this.onTimerCancel();
      if (this.sleepSelect) this.sleepSelect.value = 'off';
      alert(message);
    });
  }

  loadSpeedSettings() {
    const storageKey = currentPlatform === 'PC' ? 'pcSpeechRate' : 'iosSpeechRate';
    const fallbackDefault = currentPlatform === 'PC' ? 3.0 : 1.6;
    const maxRate = currentPlatform === 'PC' ? 6.0 : 2.5;
    const savedRate = parseFloat(localStorage.getItem(storageKey) || localStorage.getItem('defaultSpeechRate') || fallbackDefault);

    if (this.speedSlider) {
      this.speedSlider.min = '0.5';
      this.speedSlider.max = maxRate.toString();
      this.speedSlider.step = '0.1';
      this.speedSlider.value = savedRate;
    }

    if (this.speedLabel) {
      this.speedLabel.textContent = `${savedRate.toFixed(1)}x`;
    }

    player.setRate(savedRate);
  }

  bindEvents() {
    // Play / Pause
    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => {
        if (player.isPlaying) {
          player.pause();
        } else {
          player.play();
        }
      });
    }

    // Prev / Next Sentence
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        if (this.currentSentence > 0) {
          player.seekSentence(this.currentSentence - 1);
        }
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        if (this.currentSentence < this.totalSentences - 1) {
          player.seekSentence(this.currentSentence + 1);
        }
      });
    }

    // Progress Slider
    if (this.slider) {
      this.slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.currentSentence = val;
        this.updateProgressLabels();
      });

      this.slider.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        player.seekSentence(val);
      });
    }

    // Speed Slider with 150ms Debounce & Bidirectional Sync (Story 7, Story 14)
    if (this.speedSlider) {
      this.speedSlider.addEventListener('input', (e) => {
        const rate = parseFloat(e.target.value);
        if (this.speedLabel) this.speedLabel.textContent = `${rate.toFixed(1)}x`;

        const storageKey = currentPlatform === 'PC' ? 'pcSpeechRate' : 'iosSpeechRate';
        localStorage.setItem(storageKey, rate.toString());
        eventBus.emit('audio:rateChange', { rate, source: 'playerBar' });

        clearTimeout(this.speedDebounceTimer);
        this.speedDebounceTimer = setTimeout(() => {
          player.setRate(rate);
        }, 150);
      });
    }

    // Sleep Timer Selector
    if (this.sleepSelect) {
      this.sleepSelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        if (mode === 'off') {
          sleepTimer.cancel();
        } else {
          sleepTimer.start(mode);
        }
      });
    }

    if (this.sleepBadge) {
      this.sleepBadge.addEventListener('click', () => {
        sleepTimer.cancel();
        if (this.sleepSelect) this.sleepSelect.value = 'off';
      });
    }
  }

  updatePlayIcon(isPlaying) {
    if (!this.btnPlay) return;
    if (isPlaying) {
      this.btnPlay.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
      `;
      this.btnPlay.title = '暫停';
    } else {
      this.btnPlay.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      `;
      this.btnPlay.title = '播放';
    }
  }

  onSentenceUpdate(data) {
    this.currentSentence = data.sentenceIndex;
    this.totalSentences = data.totalSentences;

    if (this.slider) {
      this.slider.max = Math.max(0, this.totalSentences - 1);
      this.slider.value = this.currentSentence;
    }

    this.updateProgressLabels();
  }

  updateProgressLabels() {
    if (this.lblProgress) {
      this.lblProgress.textContent = `${this.currentSentence + 1} / ${this.totalSentences} 句`;
    }
    if (this.lblPercent) {
      const pct = this.totalSentences > 0 ? Math.round(((this.currentSentence + 1) / this.totalSentences) * 100) : 0;
      this.lblPercent.textContent = `${pct}%`;
    }
  }

  onTimerTick(formatted) {
    if (this.sleepBadge) {
      this.sleepBadge.textContent = formatted;
      this.sleepBadge.style.display = 'inline-block';
    }
  }

  onTimerLabel(label) {
    if (this.sleepBadge) {
      this.sleepBadge.textContent = label;
      this.sleepBadge.style.display = 'inline-block';
    }
  }

  onTimerCancel() {
    if (this.sleepBadge) {
      this.sleepBadge.style.display = 'none';
    }
  }
}
