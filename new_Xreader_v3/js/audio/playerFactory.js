/**
 * new_Xreader - Player Factory (Story 3, ADR 0006)
 * Dynamically detects platform and loads isolated player implementation.
 */

import { PcVoicePlayer } from './players/pcPlayer.js';
import { IosVoicePlayer } from './players/iosPlayer.js';
import { IosVoicePlayerV2 } from './players/iosPlayerV2.js';

class PlayerFactory {
  static detectPlatform() {
    const override = localStorage.getItem('platformOverride');
    if (override && override !== 'auto') {
      return override;
    }

    const ua = navigator.userAgent;
    const isIPadOS = (typeof navigator !== 'undefined') &&
      ((navigator.platform === 'MacIntel' || /Macintosh/i.test(ua)) && (navigator.maxTouchPoints > 1));

    if (/iPhone|iPad|iPod|iOS/i.test(ua) || isIPadOS) {
      return 'iOS';
    } else if (/Android/i.test(ua)) {
      return 'Android';
    } else {
      return 'PC';
    }
  }

  static getIosEngineVersion() {
    const saved = localStorage.getItem('iosEngineVersion');
    if (saved === 'v1' || saved === 'v2') {
      return saved;
    }
    // 'auto' 策略：預設啟用 v2 新版強效模式
    return 'v2';
  }

  static createPlayer() {
    const platform = this.detectPlatform();
    const iosEngine = this.getIosEngineVersion();
    console.log(`[PlayerFactory] Detected platform: ${platform}, iOS Engine: ${iosEngine}`);

    if (platform === 'iOS' || platform === 'Android') {
      if (iosEngine === 'v1') {
        return new IosVoicePlayer();
      } else {
        return new IosVoicePlayerV2();
      }
    } else {
      return new PcVoicePlayer();
    }
  }
}

export const player = PlayerFactory.createPlayer();
export const currentPlatform = PlayerFactory.detectPlatform();
