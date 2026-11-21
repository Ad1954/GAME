/**
 * new_Xreader - Player Factory (Story 3, 58, 59, 60)
 * Dynamically detects platform and loads isolated player implementation.
 * Supports unified selection: auto / ios-v2 / ios-v1 / pc / android.
 */

import { PcVoicePlayer } from './players/pcPlayer.js?v=9.22';
import { IosVoicePlayer } from './players/iosPlayer.js?v=9.22';
import { IosVoicePlayerV2 } from './players/iosPlayerV2.js?v=9.22';

class PlayerFactory {
  static getEngineSetting() {
    return localStorage.getItem('xreaderEngine') || localStorage.getItem('platformOverride') || 'auto';
  }

  static detect() {
    const setting = this.getEngineSetting();

    if (setting === 'ios-v2') {
      return { platform: 'iOS', engine: 'v2', modeText: 'iOS v2 (新版強效模式)' };
    }
    if (setting === 'ios-v1' || setting === 'iOS') {
      // If user had legacy 'iOS' or 'ios-v1'
      const iosVer = localStorage.getItem('iosEngineVersion');
      if (iosVer === 'v1' || setting === 'ios-v1') {
        return { platform: 'iOS', engine: 'v1', modeText: 'iOS v1 (經典相容模式)' };
      }
      return { platform: 'iOS', engine: 'v2', modeText: 'iOS v2 (新版強效模式)' };
    }
    if (setting === 'pc' || setting === 'PC') {
      return { platform: 'PC', engine: 'pc', modeText: 'PC 模式 (零延遲原生策略)' };
    }
    if (setting === 'android' || setting === 'Android') {
      return { platform: 'Android', engine: 'v2', modeText: 'Android 模式 (保活策略)' };
    }

    // Auto detection
    const ua = (typeof navigator !== 'undefined') ? navigator.userAgent : '';
    const isIPadOS = (typeof navigator !== 'undefined') &&
      ((navigator.platform === 'MacIntel' || /Macintosh/i.test(ua)) && (navigator.maxTouchPoints > 1));

    if (/iPhone|iPad|iPod|iOS/i.test(ua) || isIPadOS) {
      return { platform: 'iOS', engine: 'v2', modeText: '自動判定 (iOS v2 強效模式)' };
    } else if (/Android/i.test(ua)) {
      return { platform: 'Android', engine: 'v2', modeText: '自動判定 (Android 模式)' };
    } else {
      return { platform: 'PC', engine: 'pc', modeText: '自動判定 (PC 原生模式)' };
    }
  }

  static createPlayer() {
    const { platform, engine, modeText } = this.detect();
    console.log(`[PlayerFactory] Active configuration: ${modeText}`);

    if (platform === 'iOS' || platform === 'Android') {
      if (engine === 'v1') {
        return new IosVoicePlayer();
      } else {
        return new IosVoicePlayerV2();
      }
    } else {
      return new PcVoicePlayer();
    }
  }
}

export const activeConfig = PlayerFactory.detect();
export const player = PlayerFactory.createPlayer();
export const currentPlatform = activeConfig.platform;
