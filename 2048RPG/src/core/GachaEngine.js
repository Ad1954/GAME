// GachaEngine.js: Equipment Gacha Logic, Rates, and Progression for Commercial Edition

export const GACHA_LEVEL_CONFIGS = {
  1: {
    level: 1,
    name: '初階轉蛋機',
    expThreshold: 30, // 0~30 pulls
    maxDropValue: 32,
    // Peak at 2 (77.0%)
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
    // Peak at 2~4 (85.0%)
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
    name: '精銳轉蛋機',
    expThreshold: 200, // 101~200 pulls
    maxDropValue: 128,
    // Peak at 4 (33.0%)
    weights: [
      { value: 2, weight: 450 },
      { value: 4, weight: 330 },
      { value: 8, weight: 140 },
      { value: 16, weight: 55 },
      { value: 32, weight: 18 },
      { value: 64, weight: 6 },
      { value: 128, weight: 1 }
    ]
  },
  4: {
    level: 4,
    name: '大師轉蛋機',
    expThreshold: 340, // 201~340 pulls
    maxDropValue: 256,
    // Peak at 8 (35.0%)
    weights: [
      { value: 2, weight: 250 },
      { value: 4, weight: 260 },
      { value: 8, weight: 350 },
      { value: 16, weight: 90 },
      { value: 32, weight: 33 },
      { value: 64, weight: 12 },
      { value: 128, weight: 4 },
      { value: 256, weight: 1 }
    ]
  },
  5: {
    level: 5,
    name: '宗師轉蛋機',
    expThreshold: 530, // 341~530 pulls
    maxDropValue: 512,
    // Peak at 16 (35.0%)
    weights: [
      { value: 2, weight: 120 },
      { value: 4, weight: 180 },
      { value: 8, weight: 220 },
      { value: 16, weight: 350 },
      { value: 32, weight: 80 },
      { value: 64, weight: 33 },
      { value: 128, weight: 12 },
      { value: 256, weight: 4 },
      { value: 512, weight: 1 }
    ]
  },
  6: {
    level: 6,
    name: '史詩轉蛋機',
    expThreshold: 790, // 531~790 pulls
    maxDropValue: 1024,
    // Peak at 32 (35.0%)
    weights: [
      { value: 2, weight: 60 },
      { value: 4, weight: 90 },
      { value: 8, weight: 130 },
      { value: 16, weight: 220 },
      { value: 32, weight: 350 },
      { value: 64, weight: 95 },
      { value: 128, weight: 35 },
      { value: 256, weight: 14 },
      { value: 512, weight: 5 },
      { value: 1024, weight: 1 }
    ]
  },
  7: {
    level: 7,
    name: '傳奇轉蛋機',
    expThreshold: 1150, // 791~1150 pulls
    maxDropValue: 2048,
    // Peak at 64 (35.0%)
    weights: [
      { value: 2, weight: 30 },
      { value: 4, weight: 50 },
      { value: 8, weight: 80 },
      { value: 16, weight: 130 },
      { value: 32, weight: 220 },
      { value: 64, weight: 350 },
      { value: 128, weight: 90 },
      { value: 256, weight: 33 },
      { value: 512, weight: 12 },
      { value: 1024, weight: 4 },
      { value: 2048, weight: 1 }
    ]
  },
  8: {
    level: 8,
    name: '神話轉蛋機',
    expThreshold: Infinity, // 1151+ pulls
    maxDropValue: 4096,
    // Peak at 128 (35.0%)
    weights: [
      { value: 2, weight: 20 },
      { value: 4, weight: 30 },
      { value: 8, weight: 50 },
      { value: 16, weight: 80 },
      { value: 32, weight: 130 },
      { value: 64, weight: 210 },
      { value: 128, weight: 350 },
      { value: 256, weight: 85 },
      { value: 512, weight: 30 },
      { value: 1024, weight: 10 },
      { value: 2048, weight: 4 },
      { value: 4096, weight: 1 }
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

  // Determine current level from total pulls (EXP) (Lv.1 ~ Lv.8) (C-STORY-037)
  calculateLevel(totalPulls = 0) {
    if (totalPulls < this.configs[1].expThreshold) return 1;
    if (totalPulls < this.configs[2].expThreshold) return 2;
    if (totalPulls < this.configs[3].expThreshold) return 3;
    if (totalPulls < this.configs[4].expThreshold) return 4;
    if (totalPulls < this.configs[5].expThreshold) return 5;
    if (totalPulls < this.configs[6].expThreshold) return 6;
    if (totalPulls < this.configs[7].expThreshold) return 7;
    return 8;
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

  // 10-Pull Guaranteed Bonus Emergency Item (C-STORY-037)
  // Drop distribution: 40% 時光沙漏, 35% 破壞戰槌, 25% 精準重弩
  rollBonusItemForTenPull() {
    const rand = Math.random() * 100;
    if (rand < 40) {
      return { type: 'undo', name: '時光沙漏', icon: '⏳' };
    } else if (rand < 75) {
      return { type: 'hammer', name: '破壞戰槌', icon: '🔨' };
    } else {
      return { type: 'snipe', name: '精準重弩', icon: '🏹' };
    }
  }

  // Single pull no longer drops bonus emergency items
  rollBonusItem() {
    return null;
  }
}
