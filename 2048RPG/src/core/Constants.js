// Commercial Edition: Constants & Configurations

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
  AD_TRIGGERED: 'AD_TRIGGERED'
};

export const MAX_ITEM_STACK = 999;

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
    desc: '點選粉碎任意 1 格非勇者方塊，立即騰出空間',
    defaultCount: 0
  },
  snipe: {
    id: 'snipe',
    name: '精準重弩',
    icon: '🏹',
    desc: '遠程無損射殺 1 隻戰力嚴格小於勇者的魔物',
    defaultCount: 0
  }
};

// ==========================================
// C-STORY-008: 24-TIER BASE STAT UPGRADES
// ==========================================
export const BASE_STAT_TIERS = [
  // Cycle 1: [2, 4, 8]
  { tier: 1, cost: 0, isMajor: false, baseRange: [2, 4, 8], weights: [0.80, 0.18, 0.02], name: '新兵武裝', desc: '初階新兵物資，以 2 為主' },
  { tier: 2, cost: 1000, isMajor: false, baseRange: [2, 4, 8], weights: [0.75, 0.22, 0.03], name: '巡邏獵備', desc: '4 階裝備出現率微幅提升' },
  { tier: 3, cost: 1200, isMajor: false, baseRange: [2, 4, 8], weights: [0.70, 0.25, 0.05], name: '鐵衛防具', desc: '4 與 8 階裝備產出提升' },
  { tier: 4, cost: 1400, isMajor: false, baseRange: [2, 4, 8], weights: [0.65, 0.28, 0.07], name: '先鋒戰備', desc: '進一步優化戰鬥裝備質量' },
  { tier: 5, cost: 1600, isMajor: false, baseRange: [2, 4, 8], weights: [0.60, 0.30, 0.10], name: '精鋼鍛造', desc: '小升階頂峰，準備大升階突破' },
  { tier: 6, cost: 5200, isMajor: true, minEquippedWeapon: 4, baseRange: [4, 8, 16], weights: [0.75, 0.22, 0.03], name: '【大突破】白銀軍備', desc: '🚨 徹底淘汰 2！盤面基礎產出提升至 [4, 8, 16]' },

  // Cycle 2: [4, 8, 16]
  { tier: 7, cost: 1900, isMajor: false, baseRange: [4, 8, 16], weights: [0.70, 0.25, 0.05], name: '精銳配給', desc: '8 階裝備產出提升' },
  { tier: 8, cost: 2200, isMajor: false, baseRange: [4, 8, 16], weights: [0.65, 0.28, 0.07], name: '戰陣重裝', desc: '進一步優化白銀裝備質量' },
  { tier: 9, cost: 2600, isMajor: false, baseRange: [4, 8, 16], weights: [0.60, 0.30, 0.10], name: '騎士鎧甲', desc: '8 與 16 階產出提升' },
  { tier: 10, cost: 3100, isMajor: false, baseRange: [4, 8, 16], weights: [0.55, 0.32, 0.13], name: '秘銀附魔', desc: '高階白銀裝備大比例掉落' },
  { tier: 11, cost: 3700, isMajor: false, baseRange: [4, 8, 16], weights: [0.50, 0.34, 0.16], name: '皇家禮裝', desc: '黃金大突破前哨' },
  { tier: 12, cost: 11600, isMajor: true, minEquippedWeapon: 8, baseRange: [8, 16, 32], weights: [0.75, 0.22, 0.03], name: '【大突破】黃金領主', desc: '🚨 徹底淘汰 4！盤面基礎產出提升至 [8, 16, 32]' },

  // Cycle 3: [8, 16, 32]
  { tier: 13, cost: 4400, isMajor: false, baseRange: [8, 16, 32], weights: [0.70, 0.25, 0.05], name: '聖殿武裝', desc: '16 階裝備產出提升' },
  { tier: 14, cost: 5200, isMajor: false, baseRange: [8, 16, 32], weights: [0.65, 0.28, 0.07], name: '光輝重刃', desc: '穩定掉落 16 與 32' },
  { tier: 15, cost: 6200, isMajor: false, baseRange: [8, 16, 32], weights: [0.60, 0.30, 0.10], name: '神聖制式', desc: '大額提升 32 階產出' },
  { tier: 16, cost: 7400, isMajor: false, baseRange: [8, 16, 32], weights: [0.55, 0.32, 0.13], name: '大師神匠', desc: '黃金工藝極限' },
  { tier: 17, cost: 8800, isMajor: false, baseRange: [8, 16, 32], weights: [0.50, 0.34, 0.16], name: '泰坦鍛爐', desc: '屠龍大突破前夕' },
  { tier: 18, cost: 27600, isMajor: true, minEquippedWeapon: 16, baseRange: [16, 32, 64], weights: [0.75, 0.22, 0.03], name: '【大突破】屠龍戰狂', desc: '🚨 徹底淘汰 8！大升階直達 64！盤面基礎提升至 [16, 32, 64]' },

  // Cycle 4: [16, 32, 64]
  { tier: 19, cost: 10500, isMajor: false, baseRange: [16, 32, 64], weights: [0.70, 0.25, 0.05], name: '炎息戰甲', desc: '32 階裝備產出提升' },
  { tier: 20, cost: 12600, isMajor: false, baseRange: [16, 32, 64], weights: [0.65, 0.28, 0.07], name: '黑曜武具', desc: '穩固 32 與 64 掉落' },
  { tier: 21, cost: 15100, isMajor: false, baseRange: [16, 32, 64], weights: [0.60, 0.30, 0.10], name: '遠古龍骨', desc: '高階龍裝高頻出現' },
  { tier: 22, cost: 18100, isMajor: false, baseRange: [16, 32, 64], weights: [0.55, 0.32, 0.13], name: '神域符文', desc: '神話裝備浸染' },
  { tier: 23, cost: 21700, isMajor: false, baseRange: [16, 32, 64], weights: [0.50, 0.34, 0.16], name: '終焉聖光', desc: '星辰神話大突破前哨' },
  { tier: 24, cost: 67500, isMajor: true, minEquippedWeapon: 32, baseRange: [32, 64, 128], weights: [0.75, 0.22, 0.03], name: '【大突破】創世星辰', desc: '🚨 徹底淘汰 16！盤面基礎產出達到頂峰 [32, 64, 128]' }
];

// 8 Chapters across 350 Stages
export const CHAPTER_CONFIGS = [
  { id: 1, name: '第 I 章：微風之境', range: [1, 5], desc: '勇者初出茅廬，討伐邊境散落的魔物！', icon: '🌾' },
  { id: 2, name: '第 II 章：灼熱熔岩', range: [6, 20], desc: '地底烈焰噴湧，深入熔岩剿滅高階魔物！', icon: '🔥' },
  { id: 3, name: '第 III 章：孤峰岩地', range: [21, 50], desc: '懸崖峭壁險峻，擊潰盤據險要的強盜軍團！', icon: '⛰️' },
  { id: 4, name: '第 IV 章：蛛魔荒漠', range: [51, 90], desc: '無垠黃沙之下，潛伏著無數毒蛛與分裂母體！', icon: '🏜️' },
  { id: 5, name: '第 V 章：遠古地宮', range: [91, 150], desc: '千年前的沉沒皇陵，不死守衛盤據其中！', icon: '🏛️' },
  { id: 6, name: '第 VI 章：滅世黑曜', range: [151, 220], desc: '黑曜龍巢核心！迎戰萬級戰力的遠古黑曜巨龍！', icon: '🌋' },
  { id: 7, name: '第 VII 章：神魔深淵', range: [221, 280], desc: '撕裂空間的深淵裂隙，混沌惡魔傾巢而出！', icon: '🌌' },
  { id: 8, name: '第 VIII 章：終焉神域', range: [281, 350], desc: '世界之巔的創世王座，考驗凡人勇者的終極之戰！', icon: '☀️' }
];

// ==========================================
// C-STORY-008: 350 STAGES PROCEDURAL GENERATOR
// ==========================================
function generateAllStages() {
  const stages = [];

  // ==========================================
  // Chapter 1: 微風之境 (Stage 1 ~ 5)
  // 數值起點：單隻登場怪物數值最大是 32，每關 3~4 隻怪！
  // ==========================================
  const chapter1Stages = [
    {
      id: 1, chapter: 1, name: '第 1 關：微風平原', subtitle: '初試鋒芒',
      desc: '討伐哥布林前鋒！場上盤踞 3 隻敵軍，合成裝備餵給勇者一舉擊破！',
      recPower: 2, rewardGold: 100, goldCap: 40, goldBaseValue: 4,
      monsters: [8, 2, 4], starterEquipment: [2, 2], waves: [], icon: '🌾'
    },
    {
      id: 2, chapter: 1, name: '第 2 關：暗夜密林', subtitle: '狂狼出沒',
      desc: '密林中潛伏著狂暴之狼與前鋒！先強化至 16 再行逐一斬殺！',
      recPower: 4, rewardGold: 105, goldCap: 50, goldBaseValue: 4,
      monsters: [16, 4, 4], starterEquipment: [2, 4], waves: [], icon: '🌲'
    },
    {
      id: 3, chapter: 1, name: '第 3 關：孤峰岩地', subtitle: '強盜攔路',
      desc: '強盜小隊包夾隘口！善用 2048 滑動合體突破重圍！',
      recPower: 4, rewardGold: 110, goldCap: 60, goldBaseValue: 4,
      monsters: [16, 4, 8], starterEquipment: [4, 4], waves: [], icon: '⛰️'
    },
    {
      id: 4, chapter: 1, name: '第 4 關：獸人前哨', subtitle: '雙雄夾擊',
      desc: '獸人督軍 (32) 率隊扼守！先斬殺 8 級雜兵削弱敵勢再戰督軍！',
      recPower: 8, rewardGold: 115, goldCap: 70, goldBaseValue: 4,
      monsters: [32, 8, 8], starterEquipment: [4, 4, 8], waves: [], icon: '⛺'
    },
    {
      id: 5, chapter: 1, name: '第 5 關：蛛魔地穴', subtitle: '石像鬼守衛',
      desc: '地穴深處第一章關底！石像鬼領主 (32) 率領三隻護衛形成 4 怪包夾防線！',
      recPower: 16, rewardGold: 120, goldCap: 80, goldBaseValue: 4,
      monsters: [32, 8, 16, 16], starterEquipment: [8, 8, 16], waves: [], icon: '🕸️'
    }
  ];
  stages.push(...chapter1Stages);

  // ==========================================
  // Chapter 2: 灼熱熔岩 (Stage 6 ~ 20)
  // 階梯過渡：接續第一章的 32 向上延伸至 64 ~ 512，怪數 3~4 隻！
  // 首通賞金平滑階梯：80 ~ 220 🪙，徹底抑制成長速度，絕不超過單抽/十連
  // ==========================================
  const chapter2Stages = [
    {
      id: 6, chapter: 2, name: '第 6 關：火鱗前哨', subtitle: '雙蜥盤據',
      desc: '火鱗蜥蜴 (64) 率領 16、32 扼守熔岩入口！逐一擊破！',
      recPower: 16, rewardGold: 125, goldCap: 90, goldBaseValue: 4,
      monsters: [64, 16, 32], starterEquipment: [8, 16, 16], waves: [], icon: '🦎'
    },
    {
      id: 7, chapter: 2, name: '第 7 關：熔岩巢穴', subtitle: '分裂母體',
      desc: '盤踞著異變的熔岩史萊姆母體 (64)！斬殺後將分裂為兩隻 32！',
      recPower: 32, rewardGold: 130, goldCap: 100, goldBaseValue: 4,
      monsters: [{ value: 64, splitOnDeath: true, splitValue: 32, splitCount: 2 }, 16, 32],
      starterEquipment: [8, 16, 16], waves: [], icon: '🦠'
    },
    {
      id: 8, chapter: 2, name: '第 8 關：赤炎隘口', subtitle: '炎魔督軍',
      desc: '炎魔督軍 (128) 率領 32、64 雜兵扼守！必須逐一擊破！',
      recPower: 64, rewardGold: 135, goldCap: 110, goldBaseValue: 4,
      monsters: [128, 32, 64], starterEquipment: [16, 16, 32], waves: [], icon: '🔥'
    },
    {
      id: 9, chapter: 2, name: '第 9 關：熔火魔窟', subtitle: '炎魔母衛',
      desc: '高階混編！炎魔母衛 (128) 率領三隻前鋒形成 4 怪包夾防禦！',
      recPower: 64, rewardGold: 140, goldCap: 120, goldBaseValue: 8,
      monsters: [128, 32, 32, 64], starterEquipment: [16, 32, 32], waves: [], icon: '🌋'
    },
    {
      id: 10, chapter: 2, name: '第 10 關：終焉火山口', subtitle: '黑曜熔岩龍',
      desc: '熔岩之地的霸主！三大護衛簇擁 256 滅世黑曜熔岩巨龍！',
      recPower: 128, rewardGold: 145, goldCap: 130, goldBaseValue: 8,
      monsters: [256, 32, 64, 64], starterEquipment: [32, 32, 64], waves: [], icon: '🐉'
    },
    {
      id: 11, chapter: 2, name: '第 11 關：熔岩走廊', subtitle: '熔炎先鋒',
      desc: '深入地底熔脈！128 熔炎先鋒率領 3 隻前鋒形成 4 怪陣列！',
      recPower: 64, rewardGold: 150, goldCap: 140, goldBaseValue: 8,
      monsters: [128, 32, 64, 64], starterEquipment: [16, 32, 32], waves: [], icon: '🔥'
    },
    {
      id: 12, chapter: 2, name: '第 12 關：熾熱石窟', subtitle: '火魔哨長',
      desc: '炎魔巡防隊！128 哨長率領精銳前鋒夾擊！',
      recPower: 64, rewardGold: 155, goldCap: 150, goldBaseValue: 8,
      monsters: [128, 32, 64, 64], starterEquipment: [16, 32, 32], waves: [], icon: '🔥'
    },
    {
      id: 13, chapter: 2, name: '第 13 關：灼熱熔泉', subtitle: '烈焰巨魔',
      desc: '巨魔盤據熔泉！先擊殺低階前鋒再戰 256 巨魔！',
      recPower: 128, rewardGold: 160, goldCap: 160, goldBaseValue: 8,
      monsters: [256, 32, 64, 64], starterEquipment: [32, 32, 64], waves: [], icon: '🔥'
    },
    {
      id: 14, chapter: 2, name: '第 14 關：熔核裂隙', subtitle: '裂變熔核',
      desc: '異變的熔核母體 (256)！斬殺後將分裂為兩隻 128 小熔核！',
      recPower: 128, rewardGold: 165, goldCap: 170, goldBaseValue: 8,
      monsters: [{ value: 256, splitOnDeath: true, splitValue: 128, splitCount: 2 }, 32, 64, 64],
      starterEquipment: [32, 32, 64], waves: [], icon: '🦠'
    },
    {
      id: 15, chapter: 2, name: '第 15 關：黑曜石階', subtitle: '黑曜近衛',
      desc: '黑曜石近衛團！256 強敵率領 3 隻前鋒形成堅實防線！',
      recPower: 128, rewardGold: 170, goldCap: 180, goldBaseValue: 8,
      monsters: [256, 64, 64, 128], starterEquipment: [32, 64, 64], waves: [], icon: '🌋'
    },
    {
      id: 16, chapter: 2, name: '第 16 關：熔岩巨橋', subtitle: '熔岩督戰官',
      desc: '督戰官親臨戰線！合成強大武器擊破 256 督戰官！',
      recPower: 128, rewardGold: 175, goldCap: 190, goldBaseValue: 8,
      monsters: [256, 64, 64, 128], starterEquipment: [32, 64, 64], waves: [], icon: '🔥'
    },
    {
      id: 17, chapter: 2, name: '第 17 關：地火祭壇', subtitle: '祭壇主祭',
      desc: '祭壇主祭守護地心之火！256 強敵率護衛頑抗！',
      recPower: 128, rewardGold: 180, goldCap: 200, goldBaseValue: 8,
      monsters: [256, 64, 64, 128], starterEquipment: [32, 64, 64], waves: [], icon: '🔥'
    },
    {
      id: 18, chapter: 2, name: '第 18 關：烈焰深淵', subtitle: '深淵炎煞',
      desc: '深淵底部煞氣騰騰！四怪包夾，步步為營！',
      recPower: 128, rewardGold: 185, goldCap: 210, goldBaseValue: 8,
      monsters: [256, 64, 64, 128], starterEquipment: [32, 64, 64], waves: [], icon: '🔥'
    },
    {
      id: 19, chapter: 2, name: '第 19 關：熔岩巨門', subtitle: '門扉巨獸',
      desc: '通往王座的巨門守衛！256 領主扼守通道！',
      recPower: 128, rewardGold: 190, goldCap: 220, goldBaseValue: 8,
      monsters: [256, 64, 64, 128], starterEquipment: [32, 64, 64], waves: [], icon: '🔥'
    },
    {
      id: 20, chapter: 2, name: '第 20 關：烈焰王座', subtitle: '熔岩領主',
      desc: '第二章終極關底！512 熔岩君王率領 64、128、256 三大護衛決死一戰！',
      recPower: 256, rewardGold: 195, goldCap: 240, goldBaseValue: 16,
      monsters: [512, 64, 128, 256], starterEquipment: [64, 64, 128], waves: [], icon: '👑'
    }
  ];
  stages.push(...chapter2Stages);

  // ==========================================
  // Stages 21 ~ 350
  // Chapter 3 (21~50): 主力 512 ~ 2048, 4~5 隻怪混編！
  // 首通賞金嚴格大於第二章 (Stage 21 起為 230 🪙 > Stage 20 的 220 🪙)
  // Chapter 4~8 (51~350): 主力指數攀升至 262,144, 4~6 隻怪混編！
  // ==========================================
  for (let s = 21; s <= 350; s++) {
    let chapter = 3;
    for (const ch of CHAPTER_CONFIGS) {
      if (s >= ch.range[0] && s <= ch.range[1]) {
        chapter = ch.id;
        break;
      }
    }

    // Strictly monotonic reward curve with constant slope (+5G per stage) (C-STORY-011):
    // R(s) = 100 + (s - 1) * 5
    // Stage 180: 995 (under 1000G), Stage 181: 1000, Stage 350: 1845
    const rewardGold = 100 + (s - 1) * 5;

    const goldCap = Math.floor(80 + s * 4);
    const goldBaseValue = s <= 35 ? 8 : s <= 90 ? 16 : s <= 180 ? 32 : 64;

    // Boss Power Scaling:
    // Ch 3 (21~50): 512 ~ 2048 (exp 9 ~ 11)
    // Ch 4 (51~90): 2048 ~ 4096 (exp 11 ~ 12)
    // Ch 5 (91~150): 4096 ~ 16384 (exp 12 ~ 14)
    // Ch 6 (151~220): 16384 ~ 65536 (exp 14 ~ 16)
    // Ch 7 (221~280): 65536 ~ 131072 (exp 16 ~ 17)
    // Ch 8 (281~350): 131072 ~ 262144 (exp 17 ~ 18)
    let bossExp = 9;
    if (s <= 27) bossExp = 9;         // 512
    else if (s <= 41) bossExp = 10;   // 1024
    else if (s <= 60) bossExp = 11;   // 2048
    else if (s <= 90) bossExp = 12;   // 4096
    else if (s <= 120) bossExp = 13;  // 8192
    else if (s <= 150) bossExp = 14;  // 16384
    else if (s <= 180) bossExp = 15;  // 32768
    else if (s <= 220) bossExp = 16;  // 65536
    else if (s <= 280) bossExp = 17;  // 131072
    else bossExp = 18;                // 262144 (Stage 281~350)

    const bossVal = Math.pow(2, bossExp);

    // Minion scaling (dynamic 4~6 monsters)
    const minion1 = Math.pow(2, Math.max(1, bossExp - 3));
    const minion2 = Math.pow(2, Math.max(1, bossExp - 2));
    const minion3 = Math.pow(2, Math.max(1, bossExp - 1));

    let monsterCount = 4;
    if (s >= 22 && s <= 50) {
      monsterCount = (s % 2 === 0) ? 5 : 4;
    } else if (s > 50 && s <= 150) {
      monsterCount = 5;
    } else if (s > 150) {
      monsterCount = 6;
    }

    const monsters = [];
    const minionPool = [minion1, minion2, minion3];
    for (let i = 0; i < monsterCount - 1; i++) {
      monsters.push(minionPool[i % minionPool.length]);
    }

    const isSplitter = (s % 7 === 0);
    if (isSplitter) {
      monsters.push({
        value: bossVal,
        splitOnDeath: true,
        splitValue: Math.max(2, Math.floor(bossVal / 2)),
        splitCount: 2
      });
    } else {
      monsters.push(bossVal);
    }

    const eqExp = Math.max(1, bossExp - 3);
    const eqVal = Math.pow(2, eqExp);
    const starterEquipment = [eqVal, eqVal];
    if (s > 30) starterEquipment.push(eqVal);
    if (s > 100) starterEquipment.push(Math.pow(2, eqExp + 1));

    const chInfo = CHAPTER_CONFIGS.find(c => c.id === chapter);
    const stageInCh = s - chInfo.range[0] + 1;

    stages.push({
      id: s,
      chapter: chapter,
      name: `第 ${s} 關：${chInfo.name.split('：')[1]} (${stageInCh})`,
      subtitle: isSplitter ? '異變裂變' : (s % 10 === 0 ? '守關領主' : '敵軍前鋒'),
      desc: isSplitter 
        ? `盤踞著異變分裂魔物 (${bossVal})！斬殺後將分裂幼體，步步為營！`
        : `討伐敵陣！敵軍主力為 ${bossVal} 階強敵，率領 ${monsterCount - 1} 隻前鋒包夾！`,
      recPower: minion2,
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

export const STAGE_CONFIGS = generateAllStages();

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

// High contrast themes for tiles up to 262144 (C-STORY-021: Character Concept Themes)
export const HERO_THEMES = {
  2:      { name: '見習冒險者', badge: '🧑‍🌾', bg: '#1e3a8a', text: '#93c5fd', border: '#3b82f6' },
  4:      { name: '輕裝遊俠',   badge: '🧝',   bg: '#1e40af', text: '#bfdbfe', border: '#60a5fa' },
  8:      { name: '影刃浪人',   badge: '🥷',   bg: '#1d4ed8', text: '#dbeafe', border: '#93c5fd' },
  16:     { name: '精鋼衛士',   badge: '💂',   bg: '#2563eb', text: '#eff6ff', border: '#60a5fa' },
  32:     { name: '聖殿神官',   badge: '🧙',   bg: '#4338ca', text: '#e0e7ff', border: '#818cf8' },
  64:     { name: '皇家大領主', badge: '🤴',   bg: '#6d28d9', text: '#ede9fe', border: '#a78bfa' },
  128:    { name: '屠龍戰狂',   badge: '🦸',   bg: '#b91c1c', text: '#fee2e2', border: '#f87171' },
  256:    { name: '神域武聖',   badge: '🦹',   bg: '#b45309', text: '#fef3c7', border: '#fbbf24' },
  512:    { name: '星辰大賢者', badge: '🧙‍♂️',  bg: '#0f766e', text: '#ccfbf1', border: '#2dd4bf' },
  1024:   { name: '創世神選天使', badge: '👼', bg: '#047857', text: '#d1fae5', border: '#34d399' },
  2048:   { name: '天界審判長', badge: '🪽',   bg: '#1e1b4b', text: '#e0e7ff', border: '#6366f1' },
  4096:   { name: '不朽皇權者', badge: '👑',   bg: '#311042', text: '#fae8ff', border: '#d946ef' },
  8192:   { name: '滅世血魔尊', badge: '🧛',   bg: '#450a0a', text: '#fecdd3', border: '#f43f5e' },
  16384:  { name: '星穹主宰者', badge: '🧞',   bg: '#064e3b', text: '#a7f3d0', border: '#10b981' },
  32768:  { name: '超維超脫者', badge: '🌌',   bg: '#0f172a', text: '#bae6fd', border: '#0284c7' },
  65536:  { name: '太古始源神', badge: '⚡',   bg: '#172554', text: '#fed7aa', border: '#f97316' },
  131072: { name: '天理命運神', badge: '🔮',   bg: '#2e1065', text: '#f5d0fe', border: '#a855f7' },
  262144: { name: '萬古創世神', badge: '☀️',   bg: '#78350f', text: '#fef08a', border: '#fbbf24' }
};

export const EQUIPMENT_THEMES = {
  2:      { name: '粗糙木棒', badge: '🪵', bg: '#78350f', text: '#fef3c7', border: '#b45309' },
  4:      { name: '獵戶短刃', badge: '🔪', bg: '#854d0e', text: '#fef9c3', border: '#ca8a04' },
  8:      { name: '鍛造鐵劍', badge: '🗡️', bg: '#475569', text: '#f1f5f9', border: '#94a3b8' },
  16:     { name: '精鋼甲胄', badge: '🛡️', bg: '#334155', text: '#f8fafc', border: '#cbd5e1' },
  32:     { name: '附魔秘銀刃', badge: '⚡', bg: '#0e7490', text: '#cffafe', border: '#22d3ee' },
  64:     { name: '炫彩精金鎧', badge: '💎', bg: '#4338ca', text: '#e0e7ff', border: '#818cf8' },
  128:    { name: '巨龍炎息盾', badge: '🔥', bg: '#991b1b', text: '#fee2e2', border: '#ef4444' },
  256:    { name: '泰坦破天斧', badge: '🪓', bg: '#92400e', text: '#fef3c7', border: '#f59e0b' },
  512:    { name: '星穹權杖',   badge: '✨', bg: '#115e59', text: '#ccfbf1', border: '#14b8a6' },
  1024:   { name: '永恆聖劍',   badge: '🌟', bg: '#831843', text: '#fce7f3', border: '#ec4899' },
  2048:   { name: '聖靈滅神劍', badge: '⚔️', bg: '#1e1b4b', text: '#c7d2fe', border: '#818cf8' },
  4096:   { name: '混沌開闢斧', badge: '🪓', bg: '#311042', text: '#f5d0fe', border: '#c026d3' },
  8192:   { name: '龍皇破滅盾', badge: '🛡️', bg: '#450a0a', text: '#fecdd3', border: '#e11d48' },
  16384:  { name: '神話創世紀', badge: '⚡', bg: '#064e3b', text: '#6ee7b7', border: '#059669' },
  32768:  { name: '星雲裂滅刃', badge: '🌌', bg: '#0f172a', text: '#7dd3fc', border: '#0284c7' },
  65536:  { name: '超維斷空戟', badge: '💥', bg: '#172554', text: '#fdba74', border: '#ea580c' },
  131072: { name: '天理秩序杖', badge: '🔮', bg: '#2e1065', text: '#e9d5ff', border: '#9333ea' },
  262144: { name: '創世萬界核', badge: '☀️', bg: '#78350f', text: '#fef08a', border: '#f59e0b' }
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
  262144: { name: '萬古始祖神', badge: '☀️', bg: '#451a03', text: '#fed7aa', border: '#f59e0b' }
};

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
// C-STORY-010: MULTIPLE VISUAL THEME SKINS
// ==========================================
export const ThemeSkinType = {
  KINGDOM: 'kingdom',
  CYBER: 'cyber',
  RETRO: 'retro',
  MINIMAL: 'minimal',
  ICON_FOCUS: 'icon_focus'
};

export const THEME_SKIN_CONFIGS = {
  kingdom: {
    id: 'kingdom',
    name: '🌟 王國奇幻 (預設高對比)',
    desc: '經典王國冒險風格，鮮明深色階與高飽和邊框'
  },
  cyber: {
    id: 'cyber',
    name: '🌆 賽博霓虹 (Cyber Neon)',
    desc: '未來終端科技風格，暗黑底色搭配高彩螢光電路'
  },
  retro: {
    id: 'retro',
    name: '🕹️ 復古街機 (Retro 8-Bit)',
    desc: '經典 8 位元街機風格，高反差像素邊框與純粹色塊'
  },
  minimal: {
    id: 'minimal',
    name: '🧊 幾何極簡 (Minimalist Flat)',
    desc: '現代幾何扁平風格，北歐冷調低飽和雅緻質感'
  },
  icon_focus: {
    id: 'icon_focus',
    name: '👑 純粹圖標模式 (大圖標+大數字)',
    desc: '無文字極簡佈局，英雄裝備隨戰力進化，中央大圖標與醒目大戰力'
  }
};

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
        2: '🧑‍🌾', 4: '🧝', 8: '🥷', 16: '💂', 32: '🧙', 64: '🤴',
        128: '🦸', 256: '🦹', 512: '🧙‍♂️', 1024: '👼', 2048: '🪽',
        4096: '👑', 8192: '🧛', 16384: '🧞', 32768: '🌌', 65536: '⚡'
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

