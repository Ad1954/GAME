/**
 * new_Xreader - SettingsView (Story 3, GWT 3.1, 3.2)
 * Manages platform display, independent PC vs iOS voice memories, default rate, and themes.
 */

import { player, currentPlatform, activeConfig } from '../audio/playerFactory.js?v=9.21';
import { eventBus } from '../eventBus.js?v=9.21';
import { logger } from '../core/logger.js?v=9.21';

export class SettingsView {
  constructor() {
    this.platformBadge = document.getElementById('settings-platform-badge');
    this.unifiedEngineSelect = document.getElementById('settings-unified-engine');
    this.activeEngineBadge = document.getElementById('settings-active-engine-badge');
    this.btnForceReloadCache = document.getElementById('btn-force-reload-cache');
    this.voiceSelect = document.getElementById('settings-voice-select');
    this.defaultRateSlider = document.getElementById('settings-default-rate');
    this.defaultRateVal = document.getElementById('settings-default-rate-val');
    this.pitchSlider = document.getElementById('settings-pitch');
    this.pitchVal = document.getElementById('settings-pitch-val');
    this.themeBtns = document.querySelectorAll('.theme-btn');

    // System Log Elements (Story 24, GWT 24.4 - 方案 A)
    this.btnOpenLogModal = document.getElementById('btn-open-log-modal');
    this.logCountBadge = document.getElementById('settings-log-count-badge');
    this.logModal = document.getElementById('system-log-modal');
    this.modalLogCountBadge = document.getElementById('log-modal-count-badge');
    this.btnCloseLogModal = document.getElementById('btn-close-log-modal');
    this.btnFooterCloseLogModal = document.getElementById('btn-footer-close-log-modal');
    this.btnExportLogTxt = document.getElementById('btn-export-log-txt');
    this.btnCopyLog = document.getElementById('btn-copy-log');
    this.btnClearLog = document.getElementById('btn-clear-log');
    this.chkAutoScrollLog = document.getElementById('chk-auto-scroll-log');
    this.logConsoleContainer = document.getElementById('log-console-container');
  }

  init() {
    this.displayPlatformInfo();
    this.loadVoiceSettings();
    this.loadRateSettings();
    this.loadThemeSettings();
    this.updateLogCountBadge();
    this.bindEvents();

    eventBus.on('logger:newEntry', () => {
      this.updateLogCountBadge();
      if (this.logModal && this.logModal.classList.contains('active')) {
        this.renderLogs();
      }
    });
  }

  displayPlatformInfo() {
    if (this.platformBadge) {
      this.platformBadge.textContent = currentPlatform;
    }

    if (this.activeEngineBadge && activeConfig) {
      this.activeEngineBadge.textContent = activeConfig.modeText;
    }

    if (this.unifiedEngineSelect) {
      const savedEngine = localStorage.getItem('xreaderEngine') || 'auto';
      this.unifiedEngineSelect.value = savedEngine;
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
    // Unified engine / platform selector (Story 60)
    if (this.unifiedEngineSelect) {
      this.unifiedEngineSelect.addEventListener('change', (e) => {
        const previousVal = localStorage.getItem('xreaderEngine') || 'auto';
        const nextVal = e.target.value;
        if (previousVal === nextVal) return;

        const confirmed = confirm('變更核心引擎需要重新載入頁面，是否確定切換並立即重新整理？');
        if (confirmed) {
          localStorage.setItem('xreaderEngine', nextVal);
          // Auto sync platformOverride for backward compatibility
          if (nextVal === 'pc') localStorage.setItem('platformOverride', 'PC');
          else if (nextVal.startsWith('ios')) localStorage.setItem('platformOverride', 'iOS');
          else if (nextVal === 'android') localStorage.setItem('platformOverride', 'Android');
          else localStorage.setItem('platformOverride', 'auto');

          window.location.href = window.location.pathname + '?v=' + Date.now();
        } else {
          this.unifiedEngineSelect.value = previousVal;
        }
      });
    }

    // Force reload cache button (Story 60, v9.19: unregisters Service Workers + clears CacheStorage)
    if (this.btnForceReloadCache) {
      this.btnForceReloadCache.addEventListener('click', async () => {
        const confirmed = confirm('確定要清除瀏覽器快取與離線工作者 (Service Worker) 並強制重載最新版本嗎？\n(這能徹底解決 iPad/Safari 讀到舊版本子模組代碼的問題)');
        if (confirmed) {
          try {
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(r => r.unregister()));
            }
          } catch (err) {}
          try {
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
          } catch (err) {}
          window.location.href = window.location.pathname + '?v=' + Date.now();
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

    // System Log Modal Events (Story 24, GWT 24.4 - 方案 A)
    if (this.btnOpenLogModal) {
      this.btnOpenLogModal.addEventListener('click', () => {
        this.renderLogs();
        if (this.logModal) this.logModal.classList.add('active');
      });
    }

    if (this.btnCloseLogModal) {
      this.btnCloseLogModal.addEventListener('click', () => {
        if (this.logModal) this.logModal.classList.remove('active');
      });
    }

    if (this.btnFooterCloseLogModal) {
      this.btnFooterCloseLogModal.addEventListener('click', () => {
        if (this.logModal) this.logModal.classList.remove('active');
      });
    }

    if (this.btnExportLogTxt) {
      this.btnExportLogTxt.addEventListener('click', () => {
        const filename = logger.exportTxt();
        eventBus.emit('toast', { message: `日誌已匯出下載: ${filename}` });
      });
    }

    if (this.btnCopyLog) {
      this.btnCopyLog.addEventListener('click', async () => {
        const ok = await logger.copyToClipboard();
        if (ok) {
          eventBus.emit('toast', { message: '已成功複製全部日誌至剪貼簿！' });
        } else {
          eventBus.emit('toast', { message: '複製失敗，請手動圈選文字複製' });
        }
      });
    }

    if (this.btnClearLog) {
      this.btnClearLog.addEventListener('click', () => {
        if (confirm('確定要清空目前所有系統操作日誌嗎？')) {
          logger.clear();
          this.renderLogs();
          eventBus.emit('toast', { message: '已清空系統日誌' });
        }
      });
    }
  }

  updateLogCountBadge() {
    const count = logger.getLogs().length;
    if (this.logCountBadge) this.logCountBadge.textContent = count;
    if (this.modalLogCountBadge) this.modalLogCountBadge.textContent = `${count} 條`;
  }

  renderLogs() {
    if (!this.logConsoleContainer) return;
    const logs = logger.getLogs();
    this.updateLogCountBadge();

    if (logs.length === 0) {
      this.logConsoleContainer.innerHTML = '<span style="color: #6e7681;">(暫無任何日誌記錄)</span>';
      return;
    }

    const html = logs.map(l => {
      let color = '#58a6ff'; // INFO
      if (l.level === 'WARN') color = '#d29922'; // WARN
      if (l.level === 'ERROR') color = '#f85149'; // ERROR

      return `<div style="margin-bottom: 2px;"><span style="color: #8b949e;">[${l.timeStr}]</span> <span style="color: ${color}; font-weight: bold;">[${l.level}]</span> <span style="color: #7ee787;">[${l.tag}]</span> ${this.escapeHtml(l.message)}</div>`;
    }).join('');

    this.logConsoleContainer.innerHTML = html;

    if (this.chkAutoScrollLog && this.chkAutoScrollLog.checked) {
      this.logConsoleContainer.scrollTop = this.logConsoleContainer.scrollHeight;
    }
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
