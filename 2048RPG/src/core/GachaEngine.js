// GachaEngine.js: Equipment Gacha Logic, Rates, and Progression for Commercial Edition

export const GACHA_LEVEL_CONFIGS = {
  1: {
    level: 1,
    name: '初階轉蛋機',
    expThreshold: 30, // 0~30 pulls
    maxDropValue: 32,
    // Weights sum to 1000 (100.0%)
    // 2: 77.0%, 4: 21.0%, 8: 1.5%, 16: 0.4%, 32: 0.1%
    weights: [
      { value: 2, weight: 770 },
      { value: 4, weight: 210 },
      { value: 8, weight: 15 },
      { value: 16, weight: 4 },
      { value: 32, weight: 1 }
    ]
  },
  2: {
    level: 2,
    name: '進階轉蛋機',
    expThreshold: 100, // 31~100 pulls
    maxDropValue: 64,
    // 2: 60.0%, 4: 25.0%, 8: 10.0%, 16: 4.0%, 32: 0.8%, 64: 0.2%
    weights: [
      { value: 2, weight: 600 },
      { value: 4, weight: 250 },
      { value: 8, weight: 100 },
      { value: 16, weight: 40 },
      { value: 32, weight: 8 },
      { value: 64, weight: 2 }
    ]
  },
  3: {
    level: 3,
    name: '大師轉蛋機',
    expThreshold: Infinity, // 101+ pulls
    maxDropValue: 128,
    // 2: 45.0%, 4: 30.0%, 8: 15.0%, 16: 6.8%, 32: 2.5%, 64: 0.6%, 128: 0.1%
    weights: [
      { value: 2, weight: 450 },
      { value: 4, weight: 300 },
      { value: 8, weight: 150 },
      { value: 16, weight: 68 },
      { value: 32, weight: 25 },
      { value: 64, weight: 6 },
      { value: 128, weight: 1 }
    ]
  }
};

export class GachaEngine {
  constructor() {
    this.configs = GACHA_LEVEL_CONFIGS;
  }

  getConfig(level = 1) {
    return this.configs[level] || this.configs[1];
  }

  // Determine current level from total pulls (EXP)
  calculateLevel(totalPulls = 0) {
    if (totalPulls < this.configs[1].expThreshold) return 1;
    if (totalPulls < this.configs[2].expThreshold) return 2;
    return 3;
  }

  // Roll 1 item from level table
  roll(level = 1) {
    const config = this.getConfig(level);
    const totalWeight = config.weights.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const item of config.weights) {
      if (rand < item.weight) {
        return item.value;
      }
      rand -= item.weight;
    }
    return config.weights[0].value;
  }

  // Roll multiple items
  rollMulti(level = 1, count = 10) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.roll(level));
    }
    return results;
  }

  // Rate preview for UI
  getRatesPreview(level = 1) {
    const config = this.getConfig(level);
    const totalWeight = config.weights.reduce((sum, w) => sum + w.weight, 0);
    return config.weights.map(w => ({
      value: w.value,
      percentage: ((w.weight / totalWeight) * 100).toFixed(1) + '%'
    }));
  }

  // Roll bonus emergency item with 1/30 probability (C-STORY-022)
  // Drop distribution: 6:3:1 (Undo / Hammer / Snipe)
  rollBonusItem() {
    if (Math.random() < (1 / 30)) {
      const rand = Math.random() * 10;
      if (rand < 6) {
        return { type: 'undo', name: '時光沙漏', icon: '⏳' };
      } else if (rand < 9) {
        return { type: 'hammer', name: '破壞戰槌', icon: '🔨' };
      } else {
        return { type: 'snipe', name: '精準重弩', icon: '🏹' };
      }
    }
    return null;
  }
}
