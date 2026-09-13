/**
 * new_Xreader - SettingsView (Story 3, GWT 3.1, 3.2)
 * Manages platform display, independent PC vs iOS voice memories, default rate, and themes.
 */

import { player, currentPlatform } from '../audio/playerFactory.js';
import { eventBus } from '../eventBus.js';

export class SettingsView {
  constructor() {
    this.platformBadge = document.getElementById('settings-platform-badge');
    this.platformOverrideSelect = document.getElementById('settings-platform-override');
    this.voiceSelect = document.getElementById('settings-voice-select');
    this.defaultRateSlider = document.getElementById('settings-default-rate');
    this.defaultRateVal = document.getElementById('settings-default-rate-val');
    this.pitchSlider = document.getElementById('settings-pitch');
    this.pitchVal = document.getElementById('settings-pitch-val');
    this.themeBtns = document.querySelectorAll('.theme-btn');
  }

  init() {
    this.displayPlatformInfo();
    this.loadVoiceSettings();
    this.loadRateSettings();
    this.loadThemeSettings();
    this.bindEvents();
  }

  displayPlatformInfo() {
    if (this.platformBadge) {
      this.platformBadge.textContent = currentPlatform;
    }

    if (this.platformOverrideSelect) {
      const savedOverride = localStorage.getItem('platformOverride') || 'auto';
      this.platformOverrideSelect.value = savedOverride;
    }
  }

  getVoiceStorageKey() {
    return currentPlatform === 'PC' ? 'pcSelectedVoice' : 'iosSelectedVoice';
  }

  getRateStorageKey() {
    return currentPlatform === 'PC' ? 'pcSpeechRate' : 'iosSpeechRate';
  }

  getDefaultRate() {
    return currentPlatform === 'PC' ? 3.0 : 1.6;
  }

  getMaxRate() {
    return currentPlatform === 'PC' ? 6.0 : 2.5;
  }

  loadVoiceSettings() {
    const synth = window.speechSynthesis;
    const populateVoices = () => {
      const voices = synth.getVoices();
      if (!this.voiceSelect || voices.length === 0) return;

      this.voiceSelect.innerHTML = '';
      const storageKey = this.getVoiceStorageKey();
      const savedVoiceName = localStorage.getItem(storageKey) || '';

      // Prefer Traditional Chinese / Chinese / English
      voices.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.name;
        opt.textContent = `${voice.name} (${voice.lang})`;
        if (voice.name === savedVoiceName) {
          opt.selected = true;
          player.setVoice(voice.name);
        }
        this.voiceSelect.appendChild(opt);
      });

      // If nothing selected, pick default
      if (!this.voiceSelect.value && voices.length > 0) {
        const preferred = voices.find(v => v.lang.includes('zh') || v.lang.includes('cmn')) || voices[0];
        this.voiceSelect.value = preferred.name;
        player.setVoice(preferred.name);
      }
    };

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  loadRateSettings() {
    const storageKey = this.getRateStorageKey();
    const fallbackDefault = this.getDefaultRate().toString();
    const savedRate = parseFloat(localStorage.getItem(storageKey) || localStorage.getItem('defaultSpeechRate') || fallbackDefault);
    
    if (this.defaultRateSlider) {
      this.defaultRateSlider.min = '0.5';
      this.defaultRateSlider.max = this.getMaxRate().toString();
      this.defaultRateSlider.step = '0.1';
      this.defaultRateSlider.value = savedRate;
      if (this.defaultRateVal) this.defaultRateVal.textContent = `${savedRate.toFixed(1)}x`;
      player.setRate(savedRate);
    }

    const savedPitch = parseFloat(localStorage.getItem('speechPitch') || '1.0');
    if (this.pitchSlider) {
      this.pitchSlider.value = savedPitch;
      if (this.pitchVal) this.pitchVal.textContent = savedPitch.toFixed(1);
      player.setPitch(savedPitch);
    }

    // Bidirectional sync: listen to external rate changes (e.g. from bottom player bar)
    eventBus.on('audio:rateChange', ({ rate, source }) => {
      if (source === 'settings') return;
      if (this.defaultRateSlider) {
        this.defaultRateSlider.value = rate;
      }
      if (this.defaultRateVal) {
        this.defaultRateVal.textContent = `${rate.toFixed(1)}x`;
      }
    });
  }

  loadThemeSettings() {
    const savedTheme = localStorage.getItem('appTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  bindEvents() {
    // Platform override with cancel rollback (Story 16, GWT 16.1, 16.2)
    if (this.platformOverrideSelect) {
      this.platformOverrideSelect.addEventListener('change', (e) => {
        const previousVal = localStorage.getItem('platformOverride') || 'auto';
        const nextVal = e.target.value;
        if (previousVal === nextVal) return;

        const confirmed = confirm('變更模擬平台需要重新載入頁面以套用實體檔案隔離，是否確定切換並立即重新整理？');
        if (confirmed) {
          localStorage.setItem('platformOverride', nextVal);
          location.reload();
        } else {
          // Rollback to previous option on cancel
          this.platformOverrideSelect.value = previousVal;
        }
      });
    }

    // Voice selection
    if (this.voiceSelect) {
      this.voiceSelect.addEventListener('change', (e) => {
        const voiceName = e.target.value;
        const storageKey = this.getVoiceStorageKey();
        localStorage.setItem(storageKey, voiceName);
        player.setVoice(voiceName);
        eventBus.emit('toast', { message: `已變更為語音: ${voiceName}` });
      });
    }

    // Default rate slider (Story 14, GWT 14.3, 14.4)
    if (this.defaultRateSlider) {
      this.defaultRateSlider.addEventListener('input', (e) => {
        const rate = parseFloat(e.target.value);
        if (this.defaultRateVal) this.defaultRateVal.textContent = `${rate.toFixed(1)}x`;
        localStorage.setItem(this.getRateStorageKey(), rate.toString());
        player.setRate(rate);
        eventBus.emit('audio:rateChange', { rate, source: 'settings' });
      });
    }

    // Pitch slider
    if (this.pitchSlider) {
      this.pitchSlider.addEventListener('input', (e) => {
        const pitch = parseFloat(e.target.value);
        if (this.pitchVal) this.pitchVal.textContent = pitch.toFixed(1);
        localStorage.setItem('speechPitch', pitch.toString());
        player.setPitch(pitch);
      });
    }

    // Theme buttons
    this.themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('appTheme', theme);
      });
    });
  }
}
