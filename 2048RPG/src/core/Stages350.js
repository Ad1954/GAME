// Stages350.js: Authentic Classic 350-Stage High-Pressure Configuration (Restored from C-STORY-175)

export function getStageRecommendedProgression350(s) {
  if (s <= 0) return { recPower: 2, recTechTier: 1 };
  if (s <= 5) return { recPower: 8, recTechTier: 2 };
  if (s <= 12) return { recPower: 16, recTechTier: 4 };
  if (s <= 19) return { recPower: 32, recTechTier: 5 };
  if (s === 20) return { recPower: 64, recTechTier: 6 };
  if (s <= 27) return { recPower: 64, recTechTier: 7 };
  if (s <= 30) return { recPower: 128, recTechTier: 8 };
  if (s <= 41) return { recPower: 128, recTechTier: 9 };
  if (s <= 50) return { recPower: 256, recTechTier: 11 };
  if (s <= 60) return { recPower: 256, recTechTier: 12 };
  if (s <= 75) return { recPower: 512, recTechTier: 13 };
  if (s <= 90) return { recPower: 512, recTechTier: 15 };
  if (s <= 100) return { recPower: 1024, recTechTier: 18 };
  if (s <= 120) return { recPower: 1024, recTechTier: 20 };
  if (s <= 135) return { recPower: 2048, recTechTier: 22 };
  if (s <= 150) return { recPower: 2048, recTechTier: 24 };
  if (s <= 165) return { recPower: 4096, recTechTier: 28 };
  if (s <= 180) return { recPower: 4096, recTechTier: 29 };
  if (s <= 200) return { recPower: 8192, recTechTier: 34 };
  if (s <= 220) return { recPower: 8192, recTechTier: 35 };
  if (s <= 250) return { recPower: 16384, recTechTier: 40 };
  if (s <= 280) return { recPower: 16384, recTechTier: 41 };
  if (s <= 315) return { recPower: 32768, recTechTier: 46 };
  return { recPower: 65536, recTechTier: 47 };
}

// 9 Chapters (Prologue Chapter 0 + Chapters 1~8)
export const CHAPTER_CONFIGS_350 = [
  { id: 0, name: '序章：新手訓練所', range: [0, 0], desc: '王國皇家訓練營，熟悉英雄成長與魔物討伐！', icon: '🎓' },
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
    for (const ch of CHAPTER_CONFIGS_350) {
      if (s >= ch.range[0] && s <= ch.range[1]) {
        chapter = ch.id;
        break;
      }
    }

    // Moderate acceleration reward curve (C-STORY-037):
    // Stage 1~20: 100 + (s - 1) * 5 (Stage 20 = 195)
    // Stage 21~50: 195 + (s - 20) * 10 (Stage 50 = 495)
    // Stage 51~90: 495 + (s - 50) * 20 (Stage 65 = 795, Stage 90 = 1295)
    // Stage 91~350: 1295 + (s - 90) * 30 (Stage 350 = 9095)
    let rewardGold = 100;
    if (s <= 20) {
      rewardGold = 100 + (s - 1) * 5;
    } else if (s <= 50) {
      rewardGold = 195 + (s - 20) * 10;
    } else if (s <= 90) {
      rewardGold = 495 + (s - 50) * 20;
    } else {
      rewardGold = 1295 + (s - 90) * 30;
    }

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

    const chInfo = CHAPTER_CONFIGS_350.find(c => c.id === chapter);
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

  // Apply pure reference recPower & recTechTier aligned with 800-turn curve (C-STORY-106)
  for (const st of stages) {
    const recProg = getStageRecommendedProgression350(st.id);
    st.recPower = recProg.recPower;
    st.recTechTier = recProg.recTechTier;
  }

  return stages;
}

export const STAGE_CONFIGS_350 = generateAllStages();

