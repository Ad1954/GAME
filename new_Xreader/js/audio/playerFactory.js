/**
 * new_Xreader - Player Factory (Story 3, ADR 0006)
 * Dynamically detects platform and loads isolated player implementation.
 */

import { PcVoicePlayer } from './players/pcPlayer.js';
import { IosVoicePlayer } from './players/iosPlayer.js';

class PlayerFactory {
  static detectPlatform() {
    const override = localStorage.getItem('platformOverride');
    if (override && override !== 'auto') {
      return override;
    }

    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod|iOS/i.test(ua)) {
      return 'iOS';
    } else if (/Android/i.test(ua)) {
      return 'Android';
    } else {
      return 'PC';
    }
  }

  static createPlayer() {
    const platform = this.detectPlatform();
    console.log(`[PlayerFactory] Detected platform: ${platform}`);

    if (platform === 'iOS' || platform === 'Android') {
      return new IosVoicePlayer();
    } else {
      return new PcVoicePlayer();
    }
  }
}

export const player = PlayerFactory.createPlayer();
export const currentPlatform = PlayerFactory.detectPlatform();
