// TutorialConfig.js: Scripted Steps and Preset Boards for Stage 0 Tutorial (C-STORY-032)

import { Direction, TileType } from './Constants.js';

export const TUTORIAL_STEPS = [
  {
    stepIndex: 1,
    id: 'step_1_equip_fusion',
    title: '第一步：裝備合成',
    dialogue: '【戰力提升】向上滑動！讓勇者 (2) 吸收鐵劍 (2)，升級為戰力 (4)！',
    allowedDirections: [Direction.UP],
    popupCard: {
      title: '基礎機制：戰力提升',
      formula: [
        { type: 'hero', val: 2, label: '英雄' },
        { symbol: '+' },
        { type: 'equipment', val: 2, label: '裝備' },
        { symbol: '=' },
        { type: 'hero', val: 4, label: '戰力提升！', highlight: true }
      ],
      warning: null,
      confirmText: '開始操作 ⚔️'
    },
    handGuide: {
      type: 'swipe',
      from: { r: 3, c: 2 },
      to: { r: 2, c: 2 },
      guideOffsetCol: 0.6, // Placed on right-half of the tile between hero and target
      label: '向上滑動'
    },
    initialBoard: [
      { r: 3, c: 2, type: TileType.HERO, value: 2 },
      { r: 2, c: 2, type: TileType.EQUIPMENT, value: 2 }
    ],
    expectedTrigger: 'hero_merged'
  },
  {
    stepIndex: 2,
    id: 'step_2_combat_defeat_monster',
    title: '第二步：討伐魔物',
    dialogue: '【討伐魔物】向右滑動消滅野狼 (4)！\n💡 提示：同等級魔物會互相合體升級變強！',
    allowedDirections: [Direction.RIGHT],
    popupCard: {
      title: '戰鬥機制：魔物討伐',
      formula: [
        { type: 'hero', val: 4, label: '英雄' },
        { symbol: '⚔️' },
        { type: 'monster', val: 4, label: '怪物' },
        { symbol: '=' },
        { type: 'hero', val: 2, label: '受傷減半' },
        { type: 'monster', val: 4, label: '消滅', slashed: true }
      ],
      warning: '⚠️ 注意：同等級魔物可以合成升級變強！',
      confirmText: '開始討伐 🐺'
    },
    handGuide: {
      type: 'swipe',
      from: { r: 2, c: 2 },
      to: { r: 2, c: 3 },
      placeBelow: true,
      guideOffsetRow: 0.55,
      label: '向右滑動討伐'
    },
    initialBoard: [
      { r: 2, c: 2, type: TileType.HERO, value: 4 },
      { r: 2, c: 4, type: TileType.MONSTER, value: 4 }
    ],
    expectedTrigger: 'monster_killed'
  },
  {
    stepIndex: 3,
    id: 'step_3_gold_merge_and_tap',
    title: '第三步：金幣合成',
    dialogue: '【金幣合成】向左滑動將兩枚金幣 (4) 合成為 (8)！',
    allowedDirections: [Direction.LEFT],
    popupCard: {
      title: '經濟機制：金幣合成與兌現',
      formula: [
        { type: 'gold', val: 4, label: '金幣' },
        { symbol: '+' },
        { type: 'gold', val: 4, label: '金幣' },
        { symbol: '=' },
        { type: 'gold', val: 8, label: '合成翻倍！' }
      ],
      warning: '💡 金幣可合成累積，亦可隨時「直接點擊」立即兌現入袋！',
      confirmText: '體驗金幣玩法 🪙'
    },
    handGuide: {
      type: 'swipe',
      from: { r: 1, c: 3 },
      to: { r: 1, c: 1 },
      placeBelow: true,
      guideOffsetRow: 0.55,
      label: '向左合成金幣'
    },
    subStep: {
      dialogue: '【點擊兌現】直接點擊金幣 (8) 方塊，將黃金存入國庫！',
      handGuide: {
        type: 'tap',
        label: '點擊兌現金幣'
      }
    },
    initialBoard: [
      { r: 2, c: 4, type: TileType.HERO, value: 4 },
      { r: 1, c: 1, type: TileType.GOLD, value: 4 },
      { r: 1, c: 3, type: TileType.GOLD, value: 4 }
    ],
    expectedTrigger: 'gold_cashed_out'
  },
  {
    stepIndex: 4,
    id: 'step_4_power_check_boss',
    title: '第四步：打倒魔物',
    dialogue: '【終極試煉】勇者戰力 (4) 小於魔物 (8) 會被阻擋！\n請先吃同級裝備提升戰力，再迎戰魔物！',
    allowedDirections: [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT], // Free movement for open practice!
    isOpenCombat: true, // Player self-directed final practice
    popupCard: {
      title: '戰鬥守則：戰力阻擋與實戰',
      formula: [
        { type: 'hero', val: 4, label: '戰力不足' },
        { symbol: 'vs' },
        { type: 'monster', val: 8, label: '強敵魔物' },
        { symbol: '=' },
        { type: 'block', val: '🛑', label: '阻擋無法消滅' }
      ],
      warning: '🛡️ 戰力小於魔物時會被阻擋無法消滅！先吃同級裝備提升戰力，再迎戰！',
      confirmText: '開始打倒魔物 👑'
    },
    handGuide: null, // No rigid hand pointer: let player experiment freely!
    initialBoard: [
      { r: 2, c: 2, type: TileType.HERO, value: 4 },
      { r: 4, c: 2, type: TileType.EQUIPMENT, value: 4 },
      { r: 0, c: 2, type: TileType.MONSTER, value: 8 }
    ],
    expectedTrigger: 'stage_clear'
  }
];
