// Commercial Edition: Constants & Configurations

import {
  CHAPTER_CONFIGS_350,
  STAGE_CONFIGS_350,
  getStageRecommendedProgression350
} from './Stages350.js';

export function getEditionProfile() {
  if (typeof window !== 'undefined' && window.__RPG_EDITION_PROFILE__) {
    return window.__RPG_EDITION_PROFILE__;
  }
  return {
    edition: 'v3_500',
    stageMode: '500',
    saveKey: '2048RPG_Commercial_Save_v1',
    storagePrefix: '',
    telemetryDbName: 'RPG2048_TelemetryDB_v1'
  };
}

export function getEditionStorageKey(baseKey) {
  const prof = getEditionProfile();
  return (prof.storagePrefix || '') + baseKey;
}

const IS_350_STAGE_MODE = (getEditionProfile().stageMode === '350');

export const BOARD_SIZE = 5;

export const Direction = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT'
};

export const TileType = {
  HERO: 'HERO',
  EQUIPMENT: 'EQUIPMENT',
  MONSTER: 'MONSTER',
  GOLD: 'GOLD'
};

export const Events = {
  BOARD_CHANGED: 'BOARD_CHANGED',
  TILE_MERGED: 'TILE_MERGED',
  MONSTER_KILLED: 'MONSTER_KILLED',
  STAGE_VICTORY: 'STAGE_VICTORY',
  STAGE_DEFEAT: 'STAGE_DEFEAT',
  BATTLE_RESUMED: 'BATTLE_RESUMED',
  GOLD_CHANGED: 'GOLD_CHANGED',
  STAGE_UNLOCKED: 'STAGE_UNLOCKED',
  GOLD_MERGED: 'GOLD_MERGED',
  GOLD_CASHED_OUT: 'GOLD_CASHED_OUT',
  INVENTORY_CHANGED: 'INVENTORY_CHANGED',
  EQUIPMENT_CHANGED: 'EQUIPMENT_CHANGED',
  GACHA_PULLED: 'GACHA_PULLED',
  GACHA_LEVEL_UP: 'GACHA_LEVEL_UP',
  CHAPTER_CHANGED: 'CHAPTER_CHANGED',
  ITEMS_CHANGED: 'ITEMS_CHANGED',
  ITEM_USED: 'ITEM_USED',
  BASE_TIER_UPGRADED: 'BASE_TIER_UPGRADED',
  STAGE_FAST_FORWARD: 'STAGE_FAST_FORWARD',
  WAREHOUSE_EXPANDED: 'WAREHOUSE_EXPANDED',
  STAMINA_CHANGED: 'STAMINA_CHANGED',
  PRIVILEGE_CHANGED: 'PRIVILEGE_CHANGED',
  AD_TRIGGERED: 'AD_TRIGGERED',
  TUTORIAL_STEP_CHANGED: 'TUTORIAL_STEP_CHANGED',
  TUTORIAL_COMPLETED: 'TUTORIAL_COMPLETED',
  NEXT_TILE_CHANGED: 'NEXT_TILE_CHANGED',
  CHARACTER_CHANGED: 'CHARACTER_CHANGED',
  SKILL_USED: 'SKILL_USED',
  SKILL_CHARGE_CHANGED: 'SKILL_CHARGE_CHANGED',
  SKILL_UPGRADED: 'SKILL_UPGRADED',
  // C-STORY-101: DAILY RETENTION & QUEST EVENTS
  DAILY_STATE_CHANGED: 'DAILY_STATE_CHANGED',
  QUEST_PROGRESS_CHANGED: 'QUEST_PROGRESS_CHANGED'
};

export const CURRENT_GAME_VERSION = 'v1.4.7';

export const MAX_ITEM_STACK = 999;

// C-STORY-093: CHARACTER CLASS & SKILL CONSTANTS
export const CharacterClass = {
  WARRIOR: 'warrior',
  ARCHER: 'archer',
  MERCHANT: 'merchant'
};

export const CHARACTER_SKILL_CONFIGS = {
  warrior: {
    id: 'warrior',
    name: '戰士',
    avatar: '🗡️',
    skillName: '十字碎裂',
    tag: '主動 / 滿盤被動保命',
    desc: '以英雄為中心粉碎上下左右4格內的裝備與金幣（不傷魔物），滿盤瀕危時自動觸發保命。',
    passiveRescue: true,
    costs: [0, 5000, 15000, 40000, 100000],
    cooldowns: [500, 400, 300, 200, 100] // Level 0 to 4
  },
  archer: {
    id: 'archer',
    name: '精靈弓箭手',
    avatar: '🏹',
    skillName: '破甲重矢',
    tag: '純主動大招 (無被動保命)',
    desc: '鎖定全場數值最大的魔物：若大於等於4則數值折半；若為2則直接射殺。純主動進攻，無被動保命。',
    passiveRescue: false,
    costs: [0, 5000, 15000, 40000, 100000],
    cooldowns: [500, 400, 300, 200, 100]
  },
  merchant: {
    id: 'merchant',
    name: '皇家商人',
    avatar: '🪙',
    skillName: '黃金急召',
    tag: '主動 / 滿盤被動保命',
    desc: '瞬間強制回收盤面上所有的金幣方塊並直接折現入袋，騰出空格；滿盤瀕危時自動觸發保命。',
    passiveRescue: true,
    costs: [0, 5000, 15000, 40000, 100000],
    cooldowns: [500, 400, 300, 200, 100]
  }
};

// C-STORY-026: STAMINA & AD MONETIZATION CONSTANTS
export const MAX_STAMINA = 5;
export const STAMINA_RECOVERY_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
export const INTERSTITIAL_AD_INTERVAL = 3; // Every 3 battles
export const DAILY_AD_GOLD_REWARD = 500;
export const DAILY_AD_MAX_COUNT = 3;

export const ItemType = {
  UNDO: 'undo',
  HAMMER: 'hammer',
  SNIPE: 'snipe'
};

export const ITEM_CONFIGS = {
  undo: {
    id: 'undo',
    name: '時光沙漏',
    icon: '⏳',
    desc: '回溯至上一個有效操作前的盤面與戰況',
    defaultCount: 0
  },
  hammer: {
    id: 'hammer',
    name: '破壞戰槌',
    icon: '🔨',
    desc: '點選粉碎任意裝備騰空；點選金幣直接領取（不耗戰槌，無法破壞魔物/勇者）',
    defaultCount: 0
  },
  snipe: {
    id: 'snipe',
    name: '精準重弩',
    icon: '🏹',
    desc: '遠程射殺場上指定的任意 1 隻魔物（無視戰力大小）',
    defaultCount: 0
  }
};

// ==========================================
// C-STORY-101 & C-STORY-102: DAILY RETENTION & QUEST SYSTEM (3~5x 10-Pull Baseline)
// ==========================================
export const DAILY_SIGNIN_REWARDS = [
  { day: 1, gold: 1000, items: null, desc: '金幣 x1,000' },
  { day: 2, gold: 1200, items: null, desc: '金幣 x1,200' },
  { day: 3, gold: 1500, items: null, desc: '金幣 x1,500' },
  { day: 4, gold: 1800, items: null, desc: '金幣 x1,800' },
  { day: 5, gold: 2200, items: null, desc: '金幣 x2,200' },
  { day: 6, gold: 3000, items: null, desc: '金幣 x3,000' },
  { day: 7, gold: 5000, items: { hammer: 2, undo: 2 }, desc: '金幣 x5,000 + 破壞戰槌 x2 + 時光沙漏 x2' }
];

export const DAILY_FREE_SHOP_REWARD = {
  gold: 200,
  desc: '每日免費軍資補給：金幣 x200'
};

export const DAILY_QUEST_CONFIGS = [
  {
    id: 'quest_kill_monsters',
    name: '魔物清剿',
    desc: '在冒險關卡中累計擊倒 15 隻魔物',
    icon: '⚔️',
    target: 15,
    rewardGold: 300,
    activityPoints: 25
  },
  {
    id: 'quest_high_merge',
    name: '精良合成',
    desc: '任意合成 10 次',
    icon: '🛡️',
    target: 10,
    rewardGold: 300,
    activityPoints: 25
  },
  {
    id: 'quest_collect_gold',
    name: '開採財富',
    desc: '在冒險關卡中累計收集 50 金幣',
    icon: '🪙',
    target: 50,
    rewardGold: 300,
    activityPoints: 25
  },
  {
    id: 'quest_combat_count',
    name: '勤勉遠征',
    desc: '進行任意冒險關卡戰鬥累計達 3 場',
    icon: '🚩',
    target: 3,
    rewardGold: 300,
    activityPoints: 25
  }
];

export const DAILY_ACTIVITY_CHEST_CONFIG = {
  requiredPoints: 100,
  rewardGold: 600,
  rewardItem: 'snipe',
  itemCount: 2,
  rewardItems: { snipe: 2, hammer: 1 },
  desc: '活躍大寶箱：金幣 x600 + 精準重弩 x2 + 破壞戰槌 x1'
};

// ==========================================
// PROGRESSIVE DAILY ECONOMY SCALING & EVENT STAGE TIERS
// Scales daily rewards (Shop/Ad/Sign-in/Quests) & unlocks tiered Event Stage by progression
// ==========================================
export const EVENT_STAGE_TIERS = [
  { level: 0, minStage: 1,   maxStage: 20,  dailyMult: 1.0, unlocked: false, name: '未解鎖',       rewardGold: 0 },
  { level: 1, minStage: 21,  maxStage: 50,  dailyMult: 1.8, unlocked: true,  name: 'LV.1 黃金試煉', rewardGold: 1000 },
  { level: 2, minStage: 51,  maxStage: 90,  dailyMult: 2.6, unlocked: true,  name: 'LV.2 荒漠掘金', rewardGold: 2500 },
  { level: 3, minStage: 91,  maxStage: 150, dailyMult: 3.4, unlocked: true,  name: 'LV.3 地宮尋寶', rewardGold: 4500 },
  { level: 4, minStage: 151, maxStage: 220, dailyMult: 4.0, unlocked: true,  name: 'LV.4 黑曜金庫', rewardGold: 7000 },
  { level: 5, minStage: 221, maxStage: 280, dailyMult: 4.6, unlocked: true,  name: 'LV.5 深淵秘寶', rewardGold: 10000 },
  { level: 6, minStage: 281, maxStage: 999, dailyMult: 5.2, unlocked: true,  name: 'LV.6 神域寶庫', rewardGold: 14000 }
];

export function getDailyEconomyScaling(unlockedStageId = 1) {
  const st = Math.max(1, Number(unlockedStageId) || 1);
  let idx = EVENT_STAGE_TIERS.findIndex(t => st >= t.minStage && st <= t.maxStage);
  if (idx === -1) idx = EVENT_STAGE_TIERS.length - 1;
  const cur = EVENT_STAGE_TIERS[idx];
  const next = EVENT_STAGE_TIERS[idx + 1] || null;
  return {
    dailyMult: cur.dailyMult,
    eventUnlocked: cur.unlocked,
    eventLevel: cur.level,
    eventName: cur.name,
    eventRewardGold: cur.rewardGold,
    nextUnlockStage: next ? next.minStage : null,
    nextEventName: next ? next.name : null,
    nextEventRewardGold: next ? next.rewardGold : null
  };
}

// ==========================================
// C-STORY-008 & C-STORY-037 & C-STORY-102 & C-STORY-106: 48-TIER BASE STAT UPGRADES (8 Cycles, Total: 2,700,000G)
// Cycle 1: 6,000G (T6=3,000)    | Cycle 2: 18,000G (T12=7,000)   | Cycle 3: 46,000G (T18=20,000)  | Cycle 4: 110,000G (T24=55,000)
// Cycle 5: 220,000G (T30=110k)  | Cycle 6: 400,000G (T36=200k)   | Cycle 7: 700,000G (T42=350k)   | Cycle 8: 1,200,000G (T48=600k)
// ==========================================
export const BASE_STAT_TIERS = [
  // Cycle 1: [2, 4, 8] -> Subtotal: 6,000 (Cumulative: 6,000)
  { tier: 1, cost: 0, isMajor: false, baseRange: [2, 4, 8], weights: [0.80, 0.18, 0.02], name: '新兵武裝', desc: '初階新兵物資，以 2 為主' },
  { tier: 2, cost: 400, isMajor: false, baseRange: [2, 4, 8], weights: [0.75, 0.22, 0.03], name: '巡邏獵備', desc: '4 階裝備出現率微幅提升' },
  { tier: 3, cost: 600, isMajor: false, baseRange: [2, 4, 8], weights: [0.70, 0.25, 0.05], name: '鐵衛防具', desc: '4 與 8 階裝備產出提升' },
  { tier: 4, cost: 800, isMajor: false, baseRange: [2, 4, 8], weights: [0.65, 0.28, 0.07], name: '先鋒戰備', desc: '進一步優化戰鬥裝備質量' },
  { tier: 5, cost: 1200, isMajor: false, baseRange: [2, 4, 8], weights: [0.60, 0.30, 0.10], name: '精鋼鍛造', desc: '小升階頂峰，準備大升階突破' },
  { tier: 6, cost: 3000, isMajor: true, minEquippedWeapon: 16, baseRange: [4, 8, 16], weights: [0.75, 0.22, 0.03], name: '【大突破】白銀軍備', desc: '🚨 徹底淘汰 2！盤面基礎產出提升至 [4, 8, 16]' },

  // Cycle 2: [4, 8, 16] -> Subtotal: 18,000 (Cumulative: 24,000)
  { tier: 7, cost: 1400, isMajor: false, baseRange: [4, 8, 16], weights: [0.70, 0.25, 0.05], name: '精銳配給', desc: '8 階裝備產出提升' },
  { tier: 8, cost: 1800, isMajor: false, baseRange: [4, 8, 16], weights: [0.65, 0.28, 0.07], name: '戰陣重裝', desc: '進一步優化白銀裝備質量' },
  { tier: 9, cost: 2200, isMajor: false, baseRange: [4, 8, 16], weights: [0.60, 0.30, 0.10], name: '騎士鎧甲', desc: '8 與 16 階產出提升' },
  { tier: 10, cost: 2600, isMajor: false, baseRange: [4, 8, 16], weights: [0.55, 0.32, 0.13], name: '秘銀附魔', desc: '高階白銀裝備大比例掉落' },
  { tier: 11, cost: 3000, isMajor: false, baseRange: [4, 8, 16], weights: [0.50, 0.34, 0.16], name: '皇家禮裝', desc: '黃金大突破前哨' },
  { tier: 12, cost: 7000, isMajor: true, minEquippedWeapon: 128, baseRange: [8, 16, 32], weights: [0.75, 0.22, 0.03], name: '【大突破】黃金領主', desc: '🚨 徹底淘汰 4！盤面基礎產出提升至 [8, 16, 32]' },

  // Cycle 3: [8, 16, 32] -> Subtotal: 46,000 (Cumulative: 70,000)
  { tier: 13, cost: 3600, isMajor: false, baseRange: [8, 16, 32], weights: [0.70, 0.25, 0.05], name: '聖殿武裝', desc: '16 階裝備產出提升' },
  { tier: 14, cost: 4400, isMajor: false, baseRange: [8, 16, 32], weights: [0.65, 0.28, 0.07], name: '光輝重刃', desc: '穩定掉落 16 與 32' },
  { tier: 15, cost: 5200, isMajor: false, baseRange: [8, 16, 32], weights: [0.60, 0.30, 0.10], name: '神聖制式', desc: '大額提升 32 階產出' },
  { tier: 16, cost: 6000, isMajor: false, baseRange: [8, 16, 32], weights: [0.55, 0.32, 0.13], name: '大師神匠', desc: '黃金工藝極限' },
  { tier: 17, cost: 6800, isMajor: false, baseRange: [8, 16, 32], weights: [0.50, 0.34, 0.16], name: '泰坦鍛爐', desc: '屠龍大突破前夕' },
  { tier: 18, cost: 20000, isMajor: true, minEquippedWeapon: 512, baseRange: [16, 32, 64], weights: [0.75, 0.22, 0.03], name: '【大突破】屠龍戰狂', desc: '🚨 徹底淘汰 8！大升階直達 64！盤面基礎提升至 [16, 32, 64]' },

  // Cycle 4: [16, 32, 64] -> Subtotal: 110,000 (Cumulative: 180,000)
  { tier: 19, cost: 8000, isMajor: false, baseRange: [16, 32, 64], weights: [0.70, 0.25, 0.05], name: '炎息戰甲', desc: '32 階裝備產出提升' },
  { tier: 20, cost: 9500, isMajor: false, baseRange: [16, 32, 64], weights: [0.65, 0.28, 0.07], name: '黑曜武具', desc: '穩固 32 與 64 掉落' },
  { tier: 21, cost: 11000, isMajor: false, baseRange: [16, 32, 64], weights: [0.60, 0.30, 0.10], name: '遠古龍骨', desc: '高階龍裝高頻出現' },
  { tier: 22, cost: 12500, isMajor: false, baseRange: [16, 32, 64], weights: [0.55, 0.32, 0.13], name: '神域符文', desc: '神話裝備浸染' },
  { tier: 23, cost: 14000, isMajor: false, baseRange: [16, 32, 64], weights: [0.50, 0.34, 0.16], name: '終焉聖光', desc: '星辰神話大突破前哨' },
  { tier: 24, cost: 55000, isMajor: true, minEquippedWeapon: 2048, baseRange: [32, 64, 128], weights: [0.75, 0.22, 0.03], name: '【大突破】創世星辰', desc: '🚨 徹底淘汰 16！盤面基礎產出提升至 [32, 64, 128]' },

  // Cycle 5: [32, 64, 128] -> Subtotal: 220,000 (Cumulative: 400,000)
  { tier: 25, cost: 16000, isMajor: false, baseRange: [32, 64, 128], weights: [0.70, 0.25, 0.05], name: '星輝武裝', desc: '64 階裝備產出提升' },
  { tier: 26, cost: 19000, isMajor: false, baseRange: [32, 64, 128], weights: [0.65, 0.28, 0.07], name: '蒼穹重鎧', desc: '穩固 64 與 128 掉落' },
  { tier: 27, cost: 22000, isMajor: false, baseRange: [32, 64, 128], weights: [0.60, 0.30, 0.10], name: '破界神兵', desc: '大額提升 128 階產出' },
  { tier: 28, cost: 25000, isMajor: false, baseRange: [32, 64, 128], weights: [0.55, 0.32, 0.13], name: '虛空戰備', desc: '星辰鍛造極限' },
  { tier: 29, cost: 28000, isMajor: false, baseRange: [32, 64, 128], weights: [0.50, 0.34, 0.16], name: '星界聖裁', desc: '蒼穹霸主大突破前哨' },
  { tier: 30, cost: 110000, isMajor: true, minEquippedWeapon: 4096, baseRange: [64, 128, 256], weights: [0.75, 0.22, 0.03], name: '【大突破】蒼穹霸主', desc: '🚨 徹底淘汰 32！盤面基礎產出提升至 [64, 128, 256]' },

  // Cycle 6: [64, 128, 256] -> Subtotal: 400,000 (Cumulative: 800,000)
  { tier: 31, cost: 30000, isMajor: false, baseRange: [64, 128, 256], weights: [0.70, 0.25, 0.05], name: '龍神戰甲', desc: '128 階裝備產出提升' },
  { tier: 32, cost: 35000, isMajor: false, baseRange: [64, 128, 256], weights: [0.65, 0.28, 0.07], name: '天罰重刃', desc: '穩固 128 與 256 掉落' },
  { tier: 33, cost: 40000, isMajor: false, baseRange: [64, 128, 256], weights: [0.60, 0.30, 0.10], name: '不朽聖盾', desc: '大額提升 256 階產出' },
  { tier: 34, cost: 45000, isMajor: false, baseRange: [64, 128, 256], weights: [0.55, 0.32, 0.13], name: '混沌神鍛', desc: '不朽神工淬鍊' },
  { tier: 35, cost: 50000, isMajor: false, baseRange: [64, 128, 256], weights: [0.50, 0.34, 0.16], name: '諸神黃昏', desc: '不朽神王大突破前哨' },
  { tier: 36, cost: 200000, isMajor: true, minEquippedWeapon: 8192, baseRange: [128, 256, 512], weights: [0.75, 0.22, 0.03], name: '【大突破】不朽神王', desc: '🚨 徹底淘汰 64！盤面基礎產出提升至 [128, 256, 512]' },

  // Cycle 7: [128, 256, 512] -> Subtotal: 700,000 (Cumulative: 1,500,000)
  { tier: 37, cost: 55000, isMajor: false, baseRange: [128, 256, 512], weights: [0.70, 0.25, 0.05], name: '深淵魔鎧', desc: '256 階裝備產出提升' },
  { tier: 38, cost: 62000, isMajor: false, baseRange: [128, 256, 512], weights: [0.65, 0.28, 0.07], name: '冥界死神', desc: '穩固 256 與 512 掉落' },
  { tier: 39, cost: 70000, isMajor: false, baseRange: [128, 256, 512], weights: [0.60, 0.30, 0.10], name: '時空裂隙', desc: '大額提升 512 階產出' },
  { tier: 40, cost: 78000, isMajor: false, baseRange: [128, 256, 512], weights: [0.55, 0.32, 0.13], name: '永恆星核', desc: '次元神力凝聚' },
  { tier: 41, cost: 85000, isMajor: false, baseRange: [128, 256, 512], weights: [0.50, 0.34, 0.16], name: '次元主宰', desc: '次元主宰大突破前哨' },
  { tier: 42, cost: 350000, isMajor: true, minEquippedWeapon: 16384, baseRange: [256, 512, 1024], weights: [0.75, 0.22, 0.03], name: '【大突破】次元主宰', desc: '🚨 徹底淘汰 128！盤面基礎產出提升至 [256, 512, 1024]' },

  // Cycle 8: [256, 512, 1024] -> Subtotal: 1,200,000 (Cumulative: 2,700,000)
  { tier: 43, cost: 95000, isMajor: false, baseRange: [256, 512, 1024], weights: [0.70, 0.25, 0.05], name: '神域法則', desc: '512 階裝備產出提升' },
  { tier: 44, cost: 105000, isMajor: false, baseRange: [256, 512, 1024], weights: [0.65, 0.28, 0.07], name: '萬象歸一', desc: '穩固 512 與 1024 掉落' },
  { tier: 45, cost: 120000, isMajor: false, baseRange: [256, 512, 1024], weights: [0.60, 0.30, 0.10], name: '無上神威', desc: '大額提升 1024 階產出' },
  { tier: 46, cost: 135000, isMajor: false, baseRange: [256, 512, 1024], weights: [0.55, 0.32, 0.13], name: '鴻濛造化', desc: '神域造化極限' },
  { tier: 47, cost: 145000, isMajor: false, baseRange: [256, 512, 1024], weights: [0.50, 0.34, 0.16], name: '終焉審判', desc: '創世神話大突破前哨' },
  { tier: 48, cost: 600000, isMajor: true, minEquippedWeapon: 65536, baseRange: [512, 1024, 2048], weights: [0.75, 0.22, 0.03], name: '【大突破】創世神話', desc: '🚨 徹底淘汰 256！盤面基礎產出達到神話頂峰 [512, 1024, 2048]' },

  // Cycle 9: [512, 1024, 2048] -> Subtotal: 2,050,000 (Cumulative: 4,750,000)
  { tier: 49, cost: 160000, isMajor: false, baseRange: [512, 1024, 2048], weights: [0.70, 0.25, 0.05], name: '始源微光', desc: '1024 階裝備產出提升' },
  { tier: 50, cost: 180000, isMajor: false, baseRange: [512, 1024, 2048], weights: [0.65, 0.28, 0.07], name: '原初聖印', desc: '穩固 1024 與 2048 掉落' },
  { tier: 51, cost: 200000, isMajor: false, baseRange: [512, 1024, 2048], weights: [0.60, 0.30, 0.10], name: '始源神鍛', desc: '大額提升 2048 階產出' },
  { tier: 52, cost: 230000, isMajor: false, baseRange: [512, 1024, 2048], weights: [0.55, 0.32, 0.13], name: '原初化境', desc: '始源神力凝聚' },
  { tier: 53, cost: 280000, isMajor: false, baseRange: [512, 1024, 2048], weights: [0.50, 0.34, 0.16], name: '始源裁決', desc: '始源主宰大突破前哨' },
  { tier: 54, cost: 1000000, isMajor: true, minEquippedWeapon: 131072, baseRange: [1024, 2048, 4096], weights: [0.75, 0.22, 0.03], name: '【大突破】始源主宰', desc: '🚨 徹底淘汰 512！盤面基礎產出達到 [1024, 2048, 4096]' },

  // Cycle 10: [1024, 2048, 4096] -> Subtotal: 2,900,000 (Cumulative: 7,650,000)
  { tier: 55, cost: 240000, isMajor: false, baseRange: [1024, 2048, 4096], weights: [0.70, 0.25, 0.05], name: '創世神火', desc: '2048 階裝備產出提升' },
  { tier: 56, cost: 270000, isMajor: false, baseRange: [1024, 2048, 4096], weights: [0.65, 0.28, 0.07], name: '聖堂光輝', desc: '穩固 2048 與 4096 掉落' },
  { tier: 57, cost: 300000, isMajor: false, baseRange: [1024, 2048, 4096], weights: [0.60, 0.30, 0.10], name: '秩序神殿', desc: '大額提升 4096 階產出' },
  { tier: 58, cost: 340000, isMajor: false, baseRange: [1024, 2048, 4096], weights: [0.55, 0.32, 0.13], name: '神聖矩陣', desc: '創世神力淬鍊' },
  { tier: 59, cost: 400000, isMajor: false, baseRange: [1024, 2048, 4096], weights: [0.50, 0.34, 0.16], name: '創世真理', desc: '創世聖皇大突破前哨' },
  { tier: 60, cost: 1350000, isMajor: true, minEquippedWeapon: 262144, baseRange: [2048, 4096, 8192], weights: [0.75, 0.22, 0.03], name: '【大突破】創世聖皇', desc: '🚨 徹底淘汰 1024！盤面基礎產出達到 [2048, 4096, 8192]' },

  // Cycle 11: [2048, 4096, 8192] -> Subtotal: 3,500,000 (Cumulative: 11,150,000)
  { tier: 61, cost: 320000, isMajor: false, baseRange: [2048, 4096, 8192], weights: [0.70, 0.25, 0.05], name: '萬古洪荒', desc: '4096 階裝備產出提升' },
  { tier: 62, cost: 360000, isMajor: false, baseRange: [2048, 4096, 8192], weights: [0.65, 0.28, 0.07], name: '終焉寂滅', desc: '穩固 4096 與 8192 掉落' },
  { tier: 63, cost: 400000, isMajor: false, baseRange: [2048, 4096, 8192], weights: [0.60, 0.30, 0.10], name: '虛無之眼', desc: '大額提升 8192 階產出' },
  { tier: 64, cost: 450000, isMajor: false, baseRange: [2048, 4096, 8192], weights: [0.55, 0.32, 0.13], name: '紀元崩毀', desc: '萬古神力交織' },
  { tier: 65, cost: 520000, isMajor: false, baseRange: [2048, 4096, 8192], weights: [0.50, 0.34, 0.16], name: '萬古至尊', desc: '萬古終焉天尊前哨' },
  { tier: 66, cost: 1450000, isMajor: true, minEquippedWeapon: 524288, baseRange: [4096, 8192, 16384], weights: [0.75, 0.22, 0.03], name: '【大突破】萬古終焉天尊', desc: '🚨 徹底淘汰 2048！盤面基礎達到神界極限 [4096, 8192, 16384]' }

];

// C-STORY-106: Pure Reference Recommended Weapon & Tech Tier Progression for Stages 1~350
// (Strictly informational in Briefing UI; players are 100% free to challenge any stage naked!)
// C-STORY-106 & C-STORY-177: Pure Reference Recommended Weapon & Tech Tier Progression for Stages 1~500
// (Strictly informational in Briefing UI; players are 100% free to challenge any stage naked!)
export function getStageRecommendedProgression(s) {
  if (IS_350_STAGE_MODE) return getStageRecommendedProgression350(s);
  if (s <= 0) return { recPower: 2, recTechTier: 1 };
  if (s <= 40) return { recPower: 4, recTechTier: Math.max(1, Math.min(6, 1 + Math.floor(s / 8))) };
  if (s <= 80) return { recPower: 16, recTechTier: Math.max(7, Math.min(12, 7 + Math.floor((s - 40) / 8))) };
  if (s <= 120) return { recPower: 64, recTechTier: Math.max(13, Math.min(18, 13 + Math.floor((s - 80) / 8))) };
  if (s <= 170) return { recPower: 256, recTechTier: Math.max(19, Math.min(24, 19 + Math.floor((s - 120) / 10))) };
  if (s <= 230) return { recPower: 1024, recTechTier: Math.max(25, Math.min(30, 25 + Math.floor((s - 170) / 10))) };
  if (s <= 300) return { recPower: 4096, recTechTier: Math.max(31, Math.min(36, 31 + Math.floor((s - 230) / 12))) };
  if (s <= 380) return { recPower: 16384, recTechTier: Math.max(37, Math.min(42, 37 + Math.floor((s - 300) / 14))) };
  if (s <= 450) return { recPower: 65536, recTechTier: Math.max(43, Math.min(48, 43 + Math.floor((s - 380) / 12))) };
  return { recPower: 262144, recTechTier: Math.max(49, Math.min(66, 49 + Math.floor((s - 450) / 3))) };
}

// 10 Chapters (Prologue Chapter 0 + Chapters 1~9, Covering 500 Stages with 40/40/40 Baseline)
export const CHAPTER_CONFIGS_500 = [
  { id: 0, name: '序章：新手訓練所', range: [0, 0], desc: '王國皇家訓練營，熟悉英雄成長與魔物討伐！', icon: '🎓' },
  { id: 1, name: '第 I 章：微風之境', range: [1, 40], desc: '勇者初試鋒芒！1 隻魔物超大自由盤面，輕鬆體會合成樂趣！', icon: '🌾' },
  { id: 2, name: '第 II 章：灼熱熔岩', range: [41, 80], desc: '雙雄走位磨礪！2 隻魔物盤據，學習引導走位與集火斬殺！', icon: '🔥' },
  { id: 3, name: '第 III 章：孤峰岩地', range: [81, 120], desc: '戰術小隊突圍！3 隻魔物陣列，體驗波次接力與分裂機制！', icon: '⛰️' },
  { id: 4, name: '第 IV 章：蛛魔荒漠', range: [121, 170], desc: '無垠黃沙之下，潛伏著無數毒蛛與分裂母體！', icon: '🏜️' },
  { id: 5, name: '第 V 章：遠古地宮', range: [171, 230], desc: '千年前的沉沒皇陵，不死守衛盤據其中！', icon: '🏛️' },
  { id: 6, name: '第 VI 章：滅世黑曜', range: [231, 300], desc: '黑曜龍巢核心！迎戰萬級戰力的遠古黑曜巨龍！', icon: '🌋' },
  { id: 7, name: '第 VII 章：神魔深淵', range: [301, 380], desc: '撕裂空間的深淵裂隙，混沌惡魔傾巢而出！', icon: '🌌' },
  { id: 8, name: '第 VIII 章：終焉神域', range: [381, 450], desc: '世界之巔的創世王座，考驗凡人勇者的神話之戰！', icon: '☀️' },
  { id: 9, name: '第 IX 章：萬古混沌', range: [451, 500], desc: '宇宙初開的終焉虛空！迎戰 524,288 終極神魔「混沌吞天獸」！', icon: '🪐' }
];

export const CHAPTER_CONFIGS = IS_350_STAGE_MODE ? CHAPTER_CONFIGS_350 : CHAPTER_CONFIGS_500;

// ==========================================
// Chapter 0: 序章：新手訓練所 (Stage 0) (C-STORY-032)
// ==========================================
export const STAGE_0_CONFIG = {
  id: 0, chapter: 0, name: '第 0 關：王國勇者試煉 (教學)', subtitle: '皇家訓練營',
  desc: '皇家騎士團教官親授！學習裝備合成、魔物討伐、金幣兌現與戰力法則！',
  recPower: 2, rewardGold: 50, goldCap: 50, goldBaseValue: 4,
  monsters: [4, 8], starterEquipment: [2, 2], waves: [], icon: '🎓'
};

// ==========================================
// C-STORY-008: 350 STAGES PROCEDURAL GENERATOR
// ==========================================
// ==========================================
// C-STORY-177: 500 STAGES PROCEDURAL GENERATOR
// - Stage 1 ~ 40: 1 Monster Only (Ultra-wide 15 empty tiles, 20~40 turns)
// - Stage 41 ~ 80: 2 Monsters (14 empty tiles, 50~80 turns)
// - Stage 81 ~ 120: 3 Monsters (13 empty tiles, 80~120 turns)
// - Stage 121 ~ 500: Seamless Scaling (2~3 monsters on normal, 4 only on Bosses, all <= 300 turns)
// ==========================================
function generateAllStages() {
  const stages = [];

  for (let s = 1; s <= 500; s++) {
    let chapter = 1;
    for (const ch of CHAPTER_CONFIGS_500) {
      if (s >= ch.range[0] && s <= ch.range[1]) {
        chapter = ch.id;
        break;
      }
    }

    const chInfo = CHAPTER_CONFIGS_500.find(c => c.id === chapter);
    const stageInCh = s - chInfo.range[0] + 1;

    // Smooth Reward Gold Curve (Cumulative ~6.57M G for 500 stages)
    let rewardGold = 100;
    if (s <= 40) {
      rewardGold = 100 + (s - 1) * 5; // 100 ~ 295
    } else if (s <= 80) {
      rewardGold = 300 + (s - 40) * 10; // 310 ~ 700
    } else if (s <= 120) {
      rewardGold = 700 + (s - 80) * 15; // 715 ~ 1300
    } else if (s <= 350) {
      rewardGold = 1300 + (s - 120) * 30; // 1330 ~ 8200
    } else {
      rewardGold = 8200 + (s - 350) * 50; // 8250 ~ 15700
    }

    const goldCap = Math.floor(60 + s * 4);
    const goldBaseValue = s <= 40 ? 4 : s <= 120 ? 8 : s <= 230 ? 16 : s <= 380 ? 32 : 64;

    const monsters = [];
    let isSplitter = false;
    let subtitle = '敵軍前鋒';
    let desc = '';

    // ==========================================
    // Tier 1: Stage 1 ~ 40 (Strictly 1 Monster, 4 ~ 32)
    // ==========================================
    if (s <= 40) {
      let mVal = 4;
      if (s > 30) mVal = 32;
      else if (s > 20) mVal = 16;
      else if (s > 10) mVal = 8;
      else mVal = 4;

      if (s === 40) {
        subtitle = '章節領主';
        desc = `微風之境最終試煉！孤傲石像鬼 (${mVal}) 盤據，盤面留有 15 格寬敞空間，一擊必殺！`;
      } else {
        subtitle = '單騎突入';
        desc = `初階試煉！場上僅有 1 隻魔物 (${mVal})，盡情滑動合成高階武器，秒殺過關！`;
      }
      monsters.push(mVal);
    }
    // ==========================================
    // Tier 2: Stage 41 ~ 80 (Strictly 2 Monsters, 8 ~ 64)
    // ==========================================
    else if (s <= 80) {
      let bossVal = 16;
      if (s > 70) bossVal = 64;
      else if (s > 60) bossVal = 64;
      else if (s > 50) bossVal = 32;
      else bossVal = 16;

      const minionVal = Math.max(4, Math.floor(bossVal / 2));
      isSplitter = (s % 9 === 0);

      if (isSplitter) {
        subtitle = '異變母體';
        desc = `遭遇分裂魔物 (${bossVal})！斬殺後分裂為幼體，搭配侍從 (${minionVal})，精準走位！`;
        monsters.push({
          value: bossVal,
          splitOnDeath: true,
          splitValue: minionVal,
          splitCount: 2
        });
        monsters.push(minionVal);
      } else {
        if (s === 80) {
          subtitle = '雙雄領主';
          desc = `熔岩領主攜帶精銳護衛阻截！場上僅 2 隻強敵，掌握擊殺順序！`;
        } else {
          subtitle = '雙雄夾擊';
          desc = `雙怪突襲！主怪 (${bossVal}) 與侍從 (${minionVal}) 夾擊，善用 14 格空間逐一擊破！`;
        }
        monsters.push(bossVal);
        monsters.push(minionVal);
      }
    }
    // ==========================================
    // Tier 3: Stage 81 ~ 120 (Strictly 3 Monsters, 16 ~ 256)
    // ==========================================
    else if (s <= 120) {
      let bossVal = 32;
      if (s > 110) bossVal = 256;
      else if (s > 100) bossVal = 128;
      else if (s > 90) bossVal = 64;
      else bossVal = 32;

      const minion1 = Math.max(8, Math.floor(bossVal / 4));
      const minion2 = Math.max(8, Math.floor(bossVal / 2));
      isSplitter = (s % 8 === 0);

      if (isSplitter) {
        subtitle = '母體裂變';
        desc = `遠古異變 (${bossVal}) 裂變母體！斬殺後裂解，搭配 2 隻侍從嚴陣以待！`;
        monsters.push({
          value: bossVal,
          splitOnDeath: true,
          splitValue: Math.max(2, Math.floor(bossVal / 2)),
          splitCount: 2
        });
        monsters.push(minion1);
        monsters.push(minion2);
      } else {
        subtitle = (s % 10 === 0) ? '小隊精英' : '戰術小隊';
        desc = `三怪戰陣！主力魔物 (${bossVal}) 率領 2 隻前鋒形成穩固防線，破防連擊！`;
        monsters.push(bossVal);
        monsters.push(minion2);
        monsters.push(minion1);
      }
    }
    // ==========================================
    // Tier 4 & 5: Stage 121 ~ 500 (Seamless Scaling, 2~3 monsters, 4 only on Bosses)
    // ==========================================
    else {
      // Boss Power Scaling (Monotonically strictly increasing, no regression)
      let bossExp = 8; // 256
      if (s <= 140) bossExp = 8;        // 256
      else if (s <= 170) bossExp = 9;   // 512
      else if (s <= 200) bossExp = 10;  // 1024
      else if (s <= 230) bossExp = 11;  // 2048
      else if (s <= 265) bossExp = 12;  // 4096
      else if (s <= 300) bossExp = 13;  // 8192
      else if (s <= 340) bossExp = 14;  // 16384
      else if (s <= 380) bossExp = 15;  // 32768
      else if (s <= 420) bossExp = 16;  // 65536
      else if (s <= 460) bossExp = 17;  // 131072
      else if (s < 500) bossExp = 18;   // 262144
      else bossExp = 19;                // 524288 (Stage 500 Pinnacle Chaos Beast)

      const bossVal = Math.pow(2, bossExp);
      const minion1 = Math.pow(2, Math.max(1, bossExp - 3));
      const minion2 = Math.pow(2, Math.max(1, bossExp - 2));

      const isBossStage = (s % 10 === 0);
      isSplitter = (!isBossStage && s % 7 === 0);

      if (isBossStage) {
        subtitle = s === 500 ? '👑 終焉天尊巔峰對決' : '守關領主';
        desc = s === 500
          ? '迎戰 524,288 終極神魔「混沌吞天獸」！四大護衛簇擁，神話終焉之役！'
          : `強敵來襲！${bossVal} 階關底領主親臨戰場，率護法包夾，全力以赴！`;
        monsters.push(bossVal);
        monsters.push(minion2);
        monsters.push(minion1);
        monsters.push(minion1); // 4 monsters only on boss stages
      } else {
        subtitle = isSplitter ? '深淵分裂' : '精銳前鋒';
        desc = isSplitter
          ? `盤踞著 ${bossVal} 階分裂異種，斬殺後即刻分裂幼體，步步為營！`
          : `討伐魔物！敵軍主力為 ${bossVal} 階強敵，率侍從扼守陣地！`;
        if (isSplitter) {
          monsters.push({
            value: bossVal,
            splitOnDeath: true,
            splitValue: Math.max(2, Math.floor(bossVal / 2)),
            splitCount: 2
          });
          monsters.push(minion2);
        } else {
          monsters.push(bossVal);
          monsters.push(minion2);
          if (s % 2 === 0) monsters.push(minion1); // 2 or 3 monsters max
        }
      }
    }

    // C-STORY-185: 開局裝備三大火種準則 (單件 <= BOSS/4, 總和 < BOSS, 總和 <= 怪物總額/2)
    const recProg = getStageRecommendedProgression(s);
    const rawBossVal = Math.max(...monsters.map(m => typeof m === 'object' ? m.value : m));
    let starterEquipment = [];
    if (s <= 3) {
      // Stage 1~3 (啟蒙期): 固定 [2, 2]，讓新手體驗人生第一次合成 4
      starterEquipment = [2, 2];
    } else if (s <= 10) {
      // Stage 4~10: [2, 2]，提供平穩啟動
      starterEquipment = [2, 2];
    } else if (s <= 20) {
      // Stage 11~20: [2, 2] (BOSS=8 -> 2 為 1/4)
      starterEquipment = [2, 2];
    } else if (s <= 30) {
      // Stage 21~30: [2, 4] (BOSS=16 -> 4 為 1/4)
      starterEquipment = [2, 4];
    } else if (s < 40) {
      // Stage 31~39: [4, 8] (BOSS=32 -> 8 為 1/4)
      starterEquipment = [4, 8];
    } else if (s === 40) {
      // Stage 40 (第 I 章關底 Boss): [4, 4, 8] (BOSS=32, Sum=16 <= 32/2)
      starterEquipment = [4, 4, 8];
    } else if (s <= 50) {
      // Stage 41~50: [2, 4] (BOSS=16)
      starterEquipment = [2, 4];
    } else {
      // Stage 51 ~ 500 後續各章節：嚴格遵守三大火種準則
      const p1 = Math.max(2, Math.floor(rawBossVal / 4));
      const p2 = Math.max(2, Math.floor(p1 / 2));
      const isBossStage = (s % 10 === 0);

      if (isBossStage) {
        // Boss 關 3 件微型火種支援：[p2, p2, p1] -> Sum = 0.5 * BOSS <= 怪物總額/2
        starterEquipment = [p2, p2, p1];
      } else {
        // 一般推進關 2 件火種支援：[p2, p1] -> Sum = 0.375 * BOSS
        starterEquipment = [p2, p1];
      }
    }

    stages.push({
      id: s,
      chapter: chapter,
      name: `第 ${s} 關：${chInfo.name.split('：')[1]} (${stageInCh})`,
      subtitle: subtitle,
      desc: desc,
      recPower: recProg.recPower,
      recTechTier: recProg.recTechTier,
      rewardGold: rewardGold,
      goldCap: goldCap,
      goldBaseValue: goldBaseValue,
      monsters: monsters,
      starterEquipment: starterEquipment,
      waves: [],
      icon: chInfo.icon
    });
  }

  return stages;
}


export const STAGE_CONFIGS_500 = generateAllStages();
export { STAGE_CONFIGS_350, CHAPTER_CONFIGS_350 };
export const STAGE_CONFIGS = IS_350_STAGE_MODE ? STAGE_CONFIGS_350 : STAGE_CONFIGS_500;

// Warehouse Capacity Expansion Formula (C-STORY-022)
// Level 0 (to Lv.1, 24 -> 28 slots): cost 2000
// Level k (to Lv.k+1, +4 slots): cost = Math.floor((cost(k-1) * 1.2) / 100) * 100
export function calculateWarehouseExpansionCost(level = 0) {
  if (level <= 0) return 2000;
  let cost = 2000;
  for (let i = 1; i <= level; i++) {
    cost = Math.floor((cost * 1.2) / 100) * 100;
  }
  return cost;
}

export function getWarehouseUpgradeConfig(level = 0) {
  const currentCapacity = 24 + level * 4;
  const nextCapacity = currentCapacity + 4;
  const cost = calculateWarehouseExpansionCost(level);
  return {
    level,
    currentCapacity,
    nextCapacity,
    cost
  };
}

// High contrast themes for tiles up to 524288 (C-STORY-173: Hero Theme Realignment & 524288 Expansion)
export const HERO_THEMES = {
  2:      { name: '見習冒險者', badge: '🧑‍🌾', bg: '#1e3a8a', text: '#93c5fd', border: '#3b82f6' },
  4:      { name: '見習戰士',   badge: '🗡️',   bg: '#1e40af', text: '#bfdbfe', border: '#60a5fa' },
  8:      { name: '輕裝遊俠',   badge: '🧝',   bg: '#1d4ed8', text: '#dbeafe', border: '#93c5fd' },
  16:     { name: '影刃浪人',   badge: '🥷',   bg: '#2563eb', text: '#eff6ff', border: '#60a5fa' },
  32:     { name: '精鋼衛士',   badge: '💂',   bg: '#4338ca', text: '#e0e7ff', border: '#818cf8' },
  64:     { name: '聖殿神官',   badge: '🧙',   bg: '#6d28d9', text: '#ede9fe', border: '#a78bfa' },
  128:    { name: '皇家大領主', badge: '🤴',   bg: '#b91c1c', text: '#fee2e2', border: '#f87171' },
  256:    { name: '屠龍戰狂',   badge: '🦸',   bg: '#b45309', text: '#fef3c7', border: '#fbbf24' },
  512:    { name: '神域武聖',   badge: '🦹',   bg: '#0f766e', text: '#ccfbf1', border: '#2dd4bf' },
  1024:   { name: '星辰大賢者', badge: '🧙‍♂️',  bg: '#047857', text: '#d1fae5', border: '#34d399' },
  2048:   { name: '神選天使',   badge: '👼',   bg: '#1e1b4b', text: '#e0e7ff', border: '#6366f1' },
  4096:   { name: '天界審判長', badge: '🪽',   bg: '#311042', text: '#fae8ff', border: '#d946ef' },
  8192:   { name: '不朽皇權者', badge: '👑',   bg: '#450a0a', text: '#fecdd3', border: '#f43f5e' },
  16384:  { name: '滅世血魔尊', badge: '🧛',   bg: '#064e3b', text: '#a7f3d0', border: '#10b981' },
  32768:  { name: '星穹主宰者', badge: '🧞',   bg: '#0f172a', text: '#bae6fd', border: '#0284c7' },
  65536:  { name: '超維超脫者', badge: '🌌',   bg: '#172554', text: '#fed7aa', border: '#f97316' },
  131072: { name: '太古始源神', badge: '⚡',   bg: '#2e1065', text: '#f5d0fe', border: '#a855f7' },
  262144: { name: '萬古創世神', badge: '☀️',   bg: '#78350f', text: '#fef08a', border: '#fbbf24' },
  524288: { name: '終焉天尊',   badge: '👑',   bg: '#311042', text: '#f5d0fe', border: '#a855f7' }
};

// Pure Single-Item Equipment 4-Cycle [劍 ➔ 盾 ➔ 靴 ➔ 鎧] up to 524288 (C-STORY-173)
export const EQUIPMENT_THEMES = {
  // Cycle 1: 新手冒險套裝
  2:      { name: '冒險短刃', badge: '🗡️', bg: '#78350f', text: '#fef3c7', border: '#b45309' },
  4:      { name: '獵戶木盾', badge: '🛡️', bg: '#854d0e', text: '#fef9c3', border: '#ca8a04' },
  8:      { name: '冒險皮靴', badge: '👢', bg: '#475569', text: '#f1f5f9', border: '#94a3b8' },
  16:     { name: '精鋼胸甲', badge: '🥋', bg: '#334155', text: '#f8fafc', border: '#cbd5e1' },
  // Cycle 2: 王國騎士套裝
  32:     { name: '附魔秘銀刃', badge: '🗡️', bg: '#0e7490', text: '#cffafe', border: '#22d3ee' },
  64:     { name: '領主金盾',   badge: '🛡️', bg: '#4338ca', text: '#e0e7ff', border: '#818cf8' },
  128:    { name: '龍鱗戰靴',   badge: '👢', bg: '#991b1b', text: '#fee2e2', border: '#ef4444' },
  256:    { name: '泰坦重鎧',   badge: '🥋', bg: '#92400e', text: '#fef3c7', border: '#f59e0b' },
  // Cycle 3: 聖殿神使套裝
  512:    { name: '聖殿光刃',   badge: '🗡️', bg: '#115e59', text: '#ccfbf1', border: '#14b8a6' },
  1024:   { name: '天使翼盾',   badge: '🛡️', bg: '#1e3a8a', text: '#dbeafe', border: '#3b82f6' },
  2048:   { name: '日冕戰靴',   badge: '👢', bg: '#581c87', text: '#f3e8ff', border: '#9333ea' },
  4096:   { name: '龍皇金鎧',   badge: '🥋', bg: '#701a75', text: '#fae8ff', border: '#c026d3' },
  // Cycle 4: 創世神尊套裝
  8192:   { name: '星辰滅刃',   badge: '🗡️', bg: '#0c4a6e', text: '#e0f2fe', border: '#38bdf8' },
  16384:  { name: '虛空裂盾',   badge: '🛡️', bg: '#3b0764', text: '#f3e8ff', border: '#a855f7' },
  32768:  { name: '創世神靴',   badge: '👢', bg: '#14532d', text: '#dcfce7', border: '#22c55e' },
  65536:  { name: '天尊神像',   badge: '👑', bg: '#713f12', text: '#fef9c3', border: '#eab308' },
  // Cycle 5: 萬古極限套裝
  131072: { name: '始源神刃',   badge: '🗡️', bg: '#1e1b4b', text: '#e0e7ff', border: '#6366f1' },
  262144: { name: '創世神盾',   badge: '🛡️', bg: '#78350f', text: '#fef08a', border: '#fbbf24' },
  524288: { name: '萬古神靴',   badge: '👢', bg: '#0f172a', text: '#bae6fd', border: '#38bdf8' }
};

export const MONSTER_THEMES = {
  2:      { name: '洞穴蝙蝠', badge: '🦇', bg: '#3b0764', text: '#f3e8ff', border: '#a855f7' },
  4:      { name: '森林幼狼', badge: '🐺', bg: '#451a03', text: '#ffedd5', border: '#f97316' },
  8:      { name: '哥布林斥候', badge: '👺', bg: '#450a0a', text: '#fca5a5', border: '#ef4444' },
  16:     { name: '野生史萊姆', badge: '🦠', bg: '#4c0519', text: '#fecdd3', border: '#e11d48' },
  32:     { name: '哥布林強盜', badge: '👺', bg: '#450a0a', text: '#fca5a5', border: '#ef4444' },
  64:     { name: '獸人督軍',   badge: '👹', bg: '#3b0764', text: '#f5d0fe', border: '#c026d3' },
  128:    { name: '劇毒石像鬼', badge: '🦇', bg: '#2e1065', text: '#ddd6fe', border: '#8b5cf6' },
  256:    { name: '死靈骨龍',   badge: '🦴', bg: '#1c1917', text: '#fed7aa', border: '#f97316' },
  512:    { name: '惡魔領主',   badge: '👿', bg: '#581c87', text: '#f472b6', border: '#ec4899' },
  1024:   { name: '混沌巨神',   badge: '🐉', bg: '#022c22', text: '#6ee7b7', border: '#10b981' },
  2048:   { name: '墮落熾天使', badge: '🪽', bg: '#1f2937', text: '#f87171', border: '#ef4444' },
  4096:   { name: '太古魔神',   badge: '👁️', bg: '#2e1065', text: '#c084fc', border: '#a855f7' },
  8192:   { name: '滅世黑曜龍', badge: '🐲', bg: '#450a0a', text: '#fca5a5', border: '#dc2626' },
  16384:  { name: '深淵魔皇',   badge: '⚡', bg: '#311042', text: '#f0abfc', border: '#e879f9' },
  32768:  { name: '虛空天魔',   badge: '🌌', bg: '#09090b', text: '#93c5fd', border: '#3b82f6' },
  65536:  { name: '萬象混沌神', badge: '💥', bg: '#172554', text: '#bfdbfe', border: '#60a5fa' },
  131072: { name: '終焉智腦',   badge: '🔮', bg: '#042f2e', text: '#99f6e4', border: '#2dd4bf' },
  262144: { name: '萬古始祖神', badge: '☀️', bg: '#451a03', text: '#fed7aa', border: '#f59e0b' },
  524288: { name: '混沌吞天獸', badge: '👾', bg: '#311042', text: '#fae8ff', border: '#d946ef' }
};

// ==========================================
// C-STORY-067: CHAPTER-THEMED BIOME MONSTER POOLS
// ==========================================
export const CHAPTER_MONSTER_POOLS = {
  0: {
    id: 0, name: '序章：新手訓練所', range: [4, 8],
    monsters: {
      4: { name: '訓練假人', badge: '🪵', bg: '#3b0764', text: '#f3e8ff', border: '#a855f7' },
      8: { name: '教官傀儡', badge: '🤖', bg: '#450a0a', text: '#fca5a5', border: '#ef4444' }
    }
  },
  1: {
    id: 1, name: '第 I 章：微風之境', range: [2, 32],
    monsters: {
      2:  { name: '洞穴蝙蝠', badge: '🦇', bg: '#3b0764', text: '#f3e8ff', border: '#a855f7', clayImg: 'assets/images/monsters_clay/monster_ch01_02.png' },
      4:  { name: '森林幼狼', badge: '🐺', bg: '#451a03', text: '#ffedd5', border: '#f97316', clayImg: 'assets/images/monsters_clay/monster_ch01_04.png' },
      8:  { name: '哥布林斥候', badge: '👺', bg: '#14532d', text: '#bbf7d0', border: '#22c55e', clayImg: 'assets/images/monsters_clay/monster_ch01_08.png' },
      16: { name: '野生史萊姆', badge: '🦠', bg: '#4c0519', text: '#fecdd3', border: '#e11d48', clayImg: 'assets/images/monsters_clay/monster_ch01_16.png' },
      32: { name: '獸人督軍', badge: '👹', isBoss: true, bg: '#701a75', text: '#f5d0fe', border: '#d946ef', clayImg: 'assets/images/monsters_clay/monster_ch01_32.png' }
    }
  },
  2: {
    id: 2, name: '第 II 章：灼熱熔岩', range: [16, 512],
    monsters: {
      16:  { name: '火苗蜥蜴', badge: '🦎', bg: '#451a03', text: '#fed7aa', border: '#f97316', clayImg: 'assets/images/monsters_clay/monster_ch02_16.png' },
      32:  { name: '熔岩火靈', badge: '🔥', bg: '#7c2d12', text: '#ffedd5', border: '#ea580c', clayImg: 'assets/images/monsters_clay/monster_ch02_32.png' },
      64:  { name: '熔岩史萊姆', badge: '🦠', trait: 'split', bg: '#991b1b', text: '#fee2e2', border: '#ef4444', clayImg: 'assets/images/monsters_clay/monster_ch02_64.png' },
      128: { name: '炎魔督軍', badge: '👹', bg: '#701a75', text: '#f5d0fe', border: '#d946ef', clayImg: 'assets/images/monsters_clay/monster_ch02_128.png' },
      256: { name: '赤炎巨魔', badge: '🌋', bg: '#581c87', text: '#f3e8ff', border: '#a855f7', clayImg: 'assets/images/monsters_clay/monster_ch02_256.png' },
      512: { name: '黑曜熔岩龍', badge: '🐉', isBoss: true, bg: '#450a0a', text: '#fca5a5', border: '#dc2626', clayImg: 'assets/images/monsters_clay/monster_ch02_512.png' }
    }
  },
  3: {
    id: 3, name: '第 III 章：孤峰岩地', range: [64, 2048],
    monsters: {
      64:   { name: '懸崖強盜', badge: '🥷', bg: '#1e293b', text: '#cbd5e1', border: '#64748b', clayImg: 'assets/images/monsters_clay/monster_ch03_64.png' },
      128:  { name: '落石石像鬼', badge: '🦇', trait: 'armor', bg: '#334155', text: '#f1f5f9', border: '#94a3b8', clayImg: 'assets/images/monsters_clay/monster_ch03_128.png' },
      256:  { name: '岩穴巨蜥', badge: '🦎', bg: '#451a03', text: '#fed7aa', border: '#f97316', clayImg: 'assets/images/monsters_clay/monster_ch03_256.png' },
      512:  { name: '石魔守衛', badge: '🗿', bg: '#292524', text: '#e7e5e4', border: '#78716c', clayImg: 'assets/images/monsters_clay/monster_ch03_512.png' },
      1024: { name: '山嶺巨人', badge: '🪨', bg: '#1c1917', text: '#f5f5f4', border: '#57534e', clayImg: 'assets/images/monsters_clay/monster_ch03_1024.png' },
      2048: { name: '岩地霸主', badge: '👑', isBoss: true, bg: '#78350f', text: '#fef3c7', border: '#f59e0b', clayImg: 'assets/images/monsters_clay/monster_ch03_2048.png' }
    }
  },
  4: {
    id: 4, name: '第 IV 章：蛛魔荒漠', range: [256, 4096],
    monsters: {
      256:  { name: '沙丘毒蠍', badge: '🦂', bg: '#713f12', text: '#fef08a', border: '#eab308', clayImg: 'assets/images/monsters_clay/monster_ch04_256.png' },
      512:  { name: '刺針母蛛', badge: '🕷️', trait: 'split', bg: '#3b0764', text: '#f3e8ff', border: '#a855f7', clayImg: 'assets/images/monsters_clay/monster_ch04_512.png' },
      1024: { name: '荒漠毒蛛', badge: '🕸️', bg: '#2e1065', text: '#e9d5ff', border: '#9333ea', clayImg: 'assets/images/monsters_clay/monster_ch04_1024.png' },
      2048: { name: '蛛魔祭司', badge: '🧙', bg: '#581c87', text: '#fae8ff', border: '#c026d3', clayImg: 'assets/images/monsters_clay/monster_ch04_2048.png' },
      4096: { name: '遠古蛛皇', badge: '👑', isBoss: true, bg: '#4c0519', text: '#ffe4e6', border: '#f43f5e', clayImg: 'assets/images/monsters_clay/monster_ch04_4096.png' }
    }
  },
  5: {
    id: 5, name: '第 V 章：遠古地宮', range: [1024, 16384],
    monsters: {
      1024:  { name: '不死骷髏', badge: '💀', bg: '#1e293b', text: '#e2e8f0', border: '#94a3b8', clayImg: 'assets/images/monsters_clay/monster_ch05_1024.png' },
      2048:  { name: '幽魂術士', badge: '👻', bg: '#0f172a', text: '#38bdf8', border: '#0284c7', clayImg: 'assets/images/monsters_clay/monster_ch05_2048.png' },
      4096:  { name: '皇陵守衛', badge: '🛡️', bg: '#312e81', text: '#c7d2fe', border: '#6366f1', clayImg: 'assets/images/monsters_clay/monster_ch05_4096.png' },
      8192:  { name: '木乃伊王', badge: '🧟', bg: '#78350f', text: '#fef3c7', border: '#d97706', clayImg: 'assets/images/monsters_clay/monster_ch05_8192.png' },
      16384: { name: '冥界巫妖', badge: '⚡', isBoss: true, bg: '#2e1065', text: '#e9d5ff', border: '#a855f7', clayImg: 'assets/images/monsters_clay/monster_ch05_16384.png' }
    }
  },
  6: {
    id: 6, name: '第 VI 章：滅世黑曜', range: [4096, 65536],
    monsters: {
      4096:  { name: '黑曜石魔', badge: '🗿', bg: '#09090b', text: '#cbd5e1', border: '#3f3f46', clayImg: 'assets/images/monsters_clay/monster_ch06_4096.png' },
      8192:  { name: '黑曜熔火怪', badge: '🔥', bg: '#450a0a', text: '#fca5a5', border: '#dc2626', clayImg: 'assets/images/monsters_clay/monster_ch06_8192.png' },
      16384: { name: '黑曜幼龍', badge: '🐲', bg: '#1c1917', text: '#fbbf24', border: '#d97706', clayImg: 'assets/images/monsters_clay/monster_ch06_16384.png' },
      32768: { name: '黑曜侍僧', badge: '🔮', bg: '#2e1065', text: '#d8b4fe', border: '#9333ea', clayImg: 'assets/images/monsters_clay/monster_ch06_32768.png' },
      65536: { name: '遠古黑曜巨龍', badge: '🐉', isBoss: true, bg: '#450a0a', text: '#fee2e2', border: '#b91c1c', clayImg: 'assets/images/monsters_clay/monster_ch06_65536.png' }
    }
  },
  7: {
    id: 7, name: '第 VII 章：神魔深淵', range: [16384, 131072],
    monsters: {
      16384:  { name: '虛空行者', badge: '👤', bg: '#0f172a', text: '#7dd3fc', border: '#0284c7', clayImg: 'assets/images/monsters_clay/monster_ch07_16384.png' },
      32768:  { name: '深淵眼魔', badge: '👁️', bg: '#2e1065', text: '#f0abfc', border: '#c026d3', clayImg: 'assets/images/monsters_clay/monster_ch07_32768.png' },
      65536:  { name: '裂隙巨妖', badge: '🐙', bg: '#172554', text: '#93c5fd', border: '#2563eb', clayImg: 'assets/images/monsters_clay/monster_ch07_65536.png' },
      131072: { name: '混沌魔皇', badge: '💥', isBoss: true, bg: '#311042', text: '#fae8ff', border: '#a21caf', clayImg: 'assets/images/monsters_clay/monster_ch07_131072.png' }
    }
  },
  8: {
    id: 8, name: '第 VIII 章：終焉神域', range: [65536, 262144],
    monsters: {
      65536:  { name: '天界裁決者', badge: '⚔️', bg: '#172554', text: '#e0e7ff', border: '#4f46e5', clayImg: 'assets/images/monsters_clay/monster_ch08_65536.png' },
      131072: { name: '終焉智腦', badge: '🔮', bg: '#042f2e', text: '#99f6e4', border: '#0d9488', clayImg: 'assets/images/monsters_clay/monster_ch08_131072.png' },
      262144: { name: '萬古始祖神', badge: '☀️', isBoss: true, bg: '#451a03', text: '#fef08a', border: '#ea580c', clayImg: 'assets/images/monsters_clay/monster_ch08_262144.png' }
    }
  },
  9: {
    id: 9, name: '第 IX 章：萬古混沌', range: [131072, 524288],
    monsters: {
      131072: { name: '深淵眼魔', badge: '👁️', bg: '#042f2e', text: '#99f6e4', border: '#0d9488', clayImg: 'assets/images/monsters_clay/monster_ch08_131072.png' },
      262144: { name: '混沌原體', badge: '🔮', bg: '#451a03', text: '#fef08a', border: '#ea580c', clayImg: 'assets/images/monsters_clay/monster_ch08_262144.png' },
      524288: { name: '混沌吞天獸', badge: '👾', isBoss: true, bg: '#311042', text: '#fae8ff', border: '#d946ef', clayImg: 'assets/images/monsters_clay/monster_ch09_524288.png' }
    }
  }
};

/**
 * 依章節與數值取得專屬魔物主題 (C-STORY-067)
 * 若未指定章節或超出章節，自動平滑 Fallback 至既有全域 MONSTER_THEMES
 */
export function getMonsterThemeByChapter(chapterId, value) {
  if (chapterId !== undefined && CHAPTER_MONSTER_POOLS[chapterId]) {
    const chapter = CHAPTER_MONSTER_POOLS[chapterId];
    if (chapter.monsters && chapter.monsters[value]) {
      return { ...chapter.monsters[value] };
    }
  }
  return MONSTER_THEMES[value] || { name: '魔物', badge: '👾', bg: '#4c0519', text: '#fecdd3', border: '#e11d48' };
}

/**
 * 取得魔物微縮模型圖片路徑 (C-STORY-067)
 */
export function getMonsterImagePath(chapterId, value, iconStyle = 'style_e_clay') {
  if (iconStyle === 'style_native_emoji' || iconStyle === 'style_d_native') return null;
  if (!value || value <= 0) return null;

  if (iconStyle === 'style_e_clay' || !iconStyle) {
    if (chapterId !== undefined && CHAPTER_MONSTER_POOLS[chapterId]) {
      const chapter = CHAPTER_MONSTER_POOLS[chapterId];
      if (chapter.monsters && chapter.monsters[value] && chapter.monsters[value].clayImg) {
        return chapter.monsters[value].clayImg;
      }
    }
    // 全域查找模式：自動搜尋全章節生態池中已註冊之魔物圖資
    for (const chId in CHAPTER_MONSTER_POOLS) {
      const ch = CHAPTER_MONSTER_POOLS[chId];
      if (ch.monsters && ch.monsters[value] && ch.monsters[value].clayImg) {
        return ch.monsters[value].clayImg;
      }
    }
  }
  return null;
}


export const GOLD_THEMES = {
  1:      { name: '碎金微光', badge: '🪙', bg: '#78350f', text: '#fef3c7', border: '#f59e0b' },
  2:      { name: '黃銅小幣', badge: '🪙', bg: '#92400e', text: '#fef3c7', border: '#f59e0b' },
  4:      { name: '亮銀精幣', badge: '🪙', bg: '#b45309', text: '#fef3c7', border: '#fbbf24' },
  8:      { name: '純金金幣', badge: '🪙', bg: '#d97706', text: '#fef9c3', border: '#fbbf24' },
  16:     { name: '王國金條', badge: '🪙', bg: '#ea580c', text: '#fff7ed', border: '#fcd34d' },
  32:     { name: '璀璨金磚', badge: '🪙', bg: '#c2410c', text: '#fff7ed', border: '#fef08a' },
  64:     { name: '國庫寶藏', badge: '💰', bg: '#9a3412', text: '#fef9c3', border: '#fef08a' },
  128:    { name: '巨龍金山', badge: '👑', bg: '#7c2d12', text: '#fef08a', border: '#ffffff' }
};

// ==========================================
// C-STORY-010 & C-STORY-042: DECOUPLED PALETTE SKINS & ICON ART STYLES
// ==========================================
export const PaletteSkinType = {
  ICON_FOCUS: 'icon_focus',
  KINGDOM: 'kingdom',
  CYBER: 'cyber',
  RETRO: 'retro',
  MINIMAL: 'minimal'
};

export const PALETTE_SKIN_CONFIGS = {
  icon_focus: {
    id: 'icon_focus',
    name: '👑 純粹圖標 (無字+大圖標)',
    desc: '無方塊名稱干擾，中央大圖標與醒目大戰力數值'
  },
  kingdom: {
    id: 'kingdom',
    name: '🌟 王國奇幻 (經典高對比)',
    desc: '經典王國冒險配色，鮮明深色階與高飽和邊框'
  },
  cyber: {
    id: 'cyber',
    name: '🌆 賽博霓虹 (Cyber Neon)',
    desc: '未來終端科技配色，暗黑底色搭配螢光高對比'
  },
  retro: {
    id: 'retro',
    name: '🕹️ 復古街機 (Retro 8-Bit)',
    desc: '經典 8 位元街機配色，高反差純粹色塊與鮮明邊框'
  },
  minimal: {
    id: 'minimal',
    name: '🧊 幾何極簡 (Minimalist Flat)',
    desc: '現代幾何扁平風格，北歐冷調低飽和雅緻質感'
  }
};

// 4 種圖標美術風格 (A / B / C / D)
export const IconStyleType = {
  STYLE_A_PIXEL: 'style_a_pixel',       // 風格 A：像素點陣 (Pixel 16-Bit)
  STYLE_B_EMOJI: 'style_b_emoji',       // 風格 B：立體 Emoji (Vibrant Emoji)
  STYLE_C_VOXEL: 'style_c_voxel',       // 風格 C：體素方塊 (Minecraft Voxel)
  STYLE_D_NATIVE: 'style_d_native'      // 風格 D：經典原生 Emoji (Classic Emoji)
};

export const ICON_STYLE_CONFIGS = {
  style_a_pixel: {
    id: 'style_a_pixel',
    name: '👾 像素點陣 (Pixel 16-Bit)',
    desc: '粗顆粒、厚外框像素點陣風（目前套用 16 階暫代武器圖）'
  },
  style_b_emoji: {
    id: 'style_b_emoji',
    name: '🎭 立體 Emoji (Vibrant Art)',
    desc: '大飽滿、高辨識色塊立體美術圖（尚未有圖時自動 Fallback）'
  },
  style_c_voxel: {
    id: 'style_c_voxel',
    name: '🧱 體素方塊 (Minecraft Voxel)',
    desc: '經典 3D 體素等角方塊風格（尚未有圖時自動 Fallback）'
  },
  style_d_native: {
    id: 'style_d_native',
    name: '😀 經典原生 Emoji (純文字)',
    desc: '原版純文字 Emoji 符號，極致輕量、最高對比'
  }
};

// 向下相容既有 ThemeSkinType (含歷史 ICON_FOCUS 測試相容)
export const ThemeSkinType = {
  ...PaletteSkinType,
  ICON_FOCUS: 'icon_focus'
};
export const THEME_SKIN_CONFIGS = {
  ...PALETTE_SKIN_CONFIGS,
  icon_focus: {
    id: 'icon_focus',
    name: '👑 純粹圖標模式 (歷史相容)',
    desc: '大圖標與醒目大戰力模式'
  }
};

/**
 * 取得裝備階級對應之圖片路徑 (C-STORY-042)
 * @param {number} value 裝備數值 (2, 4, 8, ... 65536)
 * @param {string} iconStyle 圖標風格 (style_a_pixel, style_b_emoji, style_c_voxel, style_d_native)
 * @returns {string|null} 圖片路徑或 null
 */
export function getEquipmentImagePath(value, iconStyle = 'style_a_pixel') {
  if (iconStyle === 'style_native_emoji' || iconStyle === 'style_d_native') return null;
  if (!value || value <= 0) return null;
  const tier = Math.round(Math.log2(value));
  if (tier >= 1) {
    // 風格 E (實體桌遊微縮模型 / 黏土浮雕風，C-STORY-057 / C-STORY-173: 支援全 19 階與 524288 安全封頂)
    if (iconStyle === 'style_e_clay') {
      const clampedTier = Math.min(19, tier);
      const padded = String(clampedTier).padStart(2, '0');
      return `assets/images/equipment_clay/equip_${padded}.png`;
    }

    if (tier <= 16) {
      const padded = String(tier).padStart(2, '0');
      // 風格 A (16-Bit 復古像素點陣風)
      if (iconStyle === 'style_a_pixel' || !iconStyle) {
        return `assets/images/equipment/equip_${padded}.png`;
      }
      // 風格 B (3D 立體 Emoji / 向量粗框 Q 版)
      if (iconStyle === 'style_b_emoji') {
        return `assets/images/equipment_emoji/equip_${padded}.png`;
      }
      // 風格 C (3D 體素方塊風)
      if (iconStyle === 'style_c_voxel') {
        return `assets/images/equipment_voxel/equip_${padded}.png`;
      }
      // 風格 D (美式美漫厚塗賽璐珞風)
      if (iconStyle === 'style_d_comic') {
        return `assets/images/equipment_comic/equip_${padded}.png`;
      }
    }
  }
  return null;
}

/**
 * 取得勇者角色階級對應之圖片路徑 (C-STORY-047 / C-STORY-049 / C-STORY-057)
 * 與微縮模型裝備圖共同透過『微縮模型』(style_e_clay) 選項呼叫綁定
 * @param {number} value 勇者數值 (2, 4, 8, ... 65536)
 * @param {string} iconStyle 圖標風格 (style_native_emoji, style_e_clay, etc.)
 * @param {string} characterClass 職業 (預設 'knight' 中古奇幻勇者，相容 'samurai')
 * @returns {string|null} 圖片路徑或 null
 */
export function getHeroImagePath(value, iconStyle = 'style_e_clay', characterClass = 'knight') {
  if (iconStyle === 'style_native_emoji' || iconStyle === 'style_d_native') return null;
  if (!value || value <= 0) return null;
  const tier = Math.round(Math.log2(value));
  
  if (characterClass === 'samurai') {
    if (tier >= 1 && tier <= 4) {
      const padded = String(tier).padStart(2, '0');
      return `assets/images/hero_samurai/hero_${padded}.png`;
    }
    return null;
  }

  // 騎士／勇者與軍備共同綁定至『微縮模型』(style_e_clay) 套組 (C-STORY-057 / C-STORY-058 / C-STORY-173)
  if (iconStyle === 'style_e_clay' || !iconStyle) {
    if (tier >= 1) {
      const clampedTier = Math.min(19, tier);
      const padded = String(clampedTier).padStart(2, '0');
      return `assets/images/hero_knight/hero_${padded}.png`;
    }
  }

  return null;
}

export function getTileTheme(type, value, skin = 'kingdom') {
  let baseTheme = null;
  if (type === TileType.HERO) {
    baseTheme = HERO_THEMES[value] || { name: '勇者', badge: '👑', bg: '#0284c7', text: '#ffffff', border: '#38bdf8' };
  } else if (type === TileType.MONSTER) {
    baseTheme = MONSTER_THEMES[value] || { name: '魔物', badge: '👾', bg: '#4c0519', text: '#fecdd3', border: '#e11d48' };
  } else if (type === TileType.EQUIPMENT) {
    baseTheme = EQUIPMENT_THEMES[value] || { name: '軍備', badge: '⚔️', bg: '#334155', text: '#f8fafc', border: '#94a3b8' };
  } else if (type === TileType.GOLD) {
    baseTheme = GOLD_THEMES[value] || { name: '黃金', badge: '🪙', bg: '#d97706', text: '#fef3c7', border: '#fbbf24' };
  }

  if (skin === 'kingdom' || !skin) {
    return { ...baseTheme };
  }

  // Icon Focus Skin (No text, progressive character concept icons for hero)
  if (skin === 'icon_focus') {
    if (type === TileType.HERO) {
      const heroBadges = {
        2: '🧑‍🌾', 4: '🗡️', 8: '🧝', 16: '🥷', 32: '💂', 64: '🧙',
        128: '🤴', 256: '🦸', 512: '🦹', 1024: '🧙‍♂️', 2048: '👼',
        4096: '🪽', 8192: '👑', 16384: '🧛', 32768: '🧞', 65536: '🌌',
        131072: '⚡', 262144: '☀️', 524288: '👑'
      };
      return {
        ...baseTheme,
        badge: heroBadges[value] || '👑',
        isIconFocus: true
      };
    }
    return { ...baseTheme, isIconFocus: true };
  }

  // Cyber Neon Skin
  if (skin === 'cyber') {
    if (type === TileType.HERO) {
      return { ...baseTheme, bg: '#082f49', text: '#38bdf8', border: '#00f2fe' };
    } else if (type === TileType.MONSTER) {
      return { ...baseTheme, bg: '#4a044e', text: '#fbcfe8', border: '#f43f5e' };
    } else if (type === TileType.EQUIPMENT) {
      return { ...baseTheme, bg: '#2e1065', text: '#e9d5ff', border: '#c084fc' };
    } else if (type === TileType.GOLD) {
      return { ...baseTheme, bg: '#14532d', text: '#bef264', border: '#a3e635' };
    }
  }

  // Retro 8-Bit Arcade Skin
  if (skin === 'retro') {
    if (type === TileType.HERO) {
      return { ...baseTheme, bg: '#1d4ed8', text: '#ffffff', border: '#93c5fd' };
    } else if (type === TileType.MONSTER) {
      return { ...baseTheme, bg: '#991b1b', text: '#ffffff', border: '#f87171' };
    } else if (type === TileType.EQUIPMENT) {
      return { ...baseTheme, bg: '#475569', text: '#ffffff', border: '#cbd5e1' };
    } else if (type === TileType.GOLD) {
      return { ...baseTheme, bg: '#ca8a04', text: '#ffffff', border: '#fef08a' };
    }
  }

  // Minimalist Flat Skin
  if (skin === 'minimal') {
    if (type === TileType.HERO) {
      return { ...baseTheme, bg: '#334155', text: '#f8fafc', border: '#475569' };
    } else if (type === TileType.MONSTER) {
      return { ...baseTheme, bg: '#44403c', text: '#f5f5f4', border: '#57534e' };
    } else if (type === TileType.EQUIPMENT) {
      return { ...baseTheme, bg: '#27272a', text: '#f4f4f5', border: '#3f3f46' };
    } else if (type === TileType.GOLD) {
      return { ...baseTheme, bg: '#713f12', text: '#fef9c3', border: '#854d0e' };
    }
  }

  return { ...baseTheme };
}

// Defeat Tactical Tips (C-STORY-034)
export const DEFEAT_TACTICAL_TIPS = [
  {
    id: 'tip_target_priority',
    badge: '🗡️ 先斬強敵',
    title: '這不是普通 2048！嘗試「從強怪先打」',
    content: '消滅魔物的代價一律減半！先打強敵，殘存戰力剛好能順手連斬弱怪；若先打弱怪，每次都要重新累積戰力，往往會被耗死！'
  },
  {
    id: 'tip_monster_merge',
    badge: '🐺 合怪騰地',
    title: '棋盤快滿了？讓「同級魔物相撞」！',
    content: '魔物無法被裝備消除，容易塞滿棋盤。主動讓同級魔物合體可以立即騰出 1 個空格解圍！但小心別合出超越自身戰力的巨怪！'
  },
  {
    id: 'tip_gold_cashout',
    badge: '🪙 見好就收',
    title: '金幣很誘人，但別被貪婪堵死！',
    content: '合成金幣賞金翻倍，但金幣不可戰鬥且佔格子。盤面擁擠時別貪心，果斷「直接點擊金幣」兌現入袋，清空格子以保命！'
  }
];


