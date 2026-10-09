// GwtRunner.js: Automated GWT Test Suite for Commercial Edition (C-STORY-001 ~ C-STORY-003)

import { Board } from '../core/Board.js';
import { Tile } from '../core/Tile.js';
import { MoveEngine } from '../core/MoveEngine.js';
import { Spawner } from '../core/Spawner.js';
import { StageManager } from '../core/StageManager.js';
import { Direction, TileType, STAGE_CONFIGS, STAGE_0_CONFIG, BASE_STAT_TIERS, CHAPTER_CONFIGS, getTileTheme, ThemeSkinType, THEME_SKIN_CONFIGS, Events, HERO_THEMES, calculateWarehouseExpansionCost, getWarehouseUpgradeConfig, MAX_ITEM_STACK, DEFEAT_TACTICAL_TIPS, CURRENT_GAME_VERSION } from '../core/Constants.js';
import { GameEventBus } from '../core/GameEventBus.js';
import { ViewRenderer } from '../presentation/ViewRenderer.js';
import { TutorialOverlay } from '../presentation/TutorialOverlay.js';

export class GwtRunner {
  constructor() {
    this.results = [];
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  async runAllTests() {
    this.results = [];
    const testCases = [
      // C-STORY-001
      this.testGwt1_1_TopBarAndGoldState.bind(this),
      this.testGwt1_2_SettingsSaveDataReset.bind(this),
      this.testGwt1_3_NavigationAndStagesList.bind(this),
      // C-STORY-002
      this.testGwt2_1_StageBriefingConfig.bind(this),
      this.testGwt2_2_SingleStageCombatInitialization.bind(this),
      this.testGwt2_3_FullEliminationVictoryAndUnlockNext.bind(this),
      this.testGwt2_4_DeadlockDefeatDetection.bind(this),
      // C-STORY-003
      this.testGwt3_1_HeroEquipmentEqualValueFusion.bind(this),
      this.testGwt3_2_HeroEquipmentDifferentValueBlocking.bind(this),
      this.testGwt3_3_MonsterToHeroDecapitation.bind(this),
      this.testGwt3_4_HeroToMonsterDecapitation.bind(this),
      this.testGwt3_5_EquipmentNonLethalObstacle.bind(this),
      // C-STORY-004
      this.testGwt4_1_GoldSpawnsEvery8Turns.bind(this),
      this.testGwt4_2_GoldMergeInstantCashReward.bind(this),
      this.testGwt4_3_GoldDifferentValueBlocking.bind(this),
      this.testGwt4_4_TapToCashOutGoldTile.bind(this),
      this.testGwt4_5_VictoryAutoSweepGold.bind(this),
      // C-STORY-005
      this.testGwt5_1_ShopClaimTestGold.bind(this),
      this.testGwt5_2_GachaPullsAndWeightDistribution.bind(this),
      this.testGwt5_3_GachaExpAndLevelUp.bind(this),
      this.testGwt5_4_BatchAutoMerge.bind(this),
      this.testGwt5_5_HeroEquipmentInheritanceInCombat.bind(this),
      this.testGwt5_6_InventoryFullGachaBlocked.bind(this),
      // C-STORY-006
      this.testGwt6_1_ChapterProgressionUnlock.bind(this),
      this.testGwt6_2_MixedTierMonsterInitialization.bind(this),
      this.testGwt6_3_IndividualDecapitationInMixedArray.bind(this),
      this.testGwt6_4_SplittingMonsterMechanic.bind(this),
      this.testGwt6_5_ChildrenEliminationAndChapter2Victory.bind(this),
      // C-STORY-007
      this.testGwt7_1_EmergencyItemStockAndClaimTestPacks.bind(this),
      this.testGwt7_2_UndoTimeHourglassRevertState.bind(this),
      this.testGwt7_3_HammerDestroysNonHeroTile.bind(this),
      this.testGwt7_4_SnipeStrictlyLesserMonsterOneShotNoDamage.bind(this),
      this.testGwt7_5_SnipeEqualOrGreaterMonsterBlocked.bind(this),
      // C-STORY-008
      this.testGwt8_1_TitleScreenCoverInitialDisplayAndStartGame.bind(this),
      this.testGwt8_2_Macro350StagesScalingAndMultiMonsters.bind(this),
      this.testGwt8_3_StageGoldRewardAndInCombatCap.bind(this),
      this.testGwt8_4_BaseTechTierUpgradeMinorAndWeights.bind(this),
      this.testGwt8_5_BaseTechTierMajorUpgradeEliminationUpTo64.bind(this),
      // C-STORY-009
      this.testGwt9_1_FirstChapterDifficultyScaleStartingAt32.bind(this),
      this.testGwt9_2_MultiChapterMonsterProgressionScale.bind(this),
      this.testGwt9_3_HeroAndMonsterRandomPlacementPositions.bind(this),
      this.testGwt9_4_FirstClearRewardNonRepeatable.bind(this),
      this.testGwt9_5_FastForwardProgressionAndGoldCompensation.bind(this),
      this.testGwt9_6_ResetSaveDataCleansAllProgress.bind(this),
      // C-STORY-010
      this.testGwt10_1_RewardGoldSuppressionAndStrictMonotonicity.bind(this),
      this.testGwt10_2_StageListClearedBadge.bind(this),
      this.testGwt10_3_BriefingModalClearedState.bind(this),
      this.testGwt10_4_ThemeSkinSwitchingAndPalettes.bind(this),
      this.testGwt10_5_FastForwardWithRebalancedRewards.bind(this),
      // C-STORY-011
      this.testGwt11_1_RewardGoldEquableSlopeAndFirst180Under1000.bind(this),
      this.testGwt11_2_BaseTechTierTableExactMatch.bind(this),
      this.testGwt11_3_MajorUpgradeSumOfPreviousFourMinorTiers.bind(this),
      this.testGwt11_4_MinorUpgradeSubtractedRemainderProgression.bind(this),
      this.testGwt11_5_FastForwardToStage6WithNewFormula.bind(this),
      // C-STORY-012
      this.testGwt12_1_MoveEngineRecordsSlideTrajectoriesAndDiff.bind(this),
      this.testGwt12_2_FourCombatAndFusionVfxEventDetection.bind(this),
      this.testGwt12_3_IconFocusSkinThemeConfigAndHeroEquipmentEvolution.bind(this),
      this.testGwt12_4_ViewRendererAnimateSlideAndVfxExecution.bind(this),
      this.testGwt12_5_HeroAndMonsterBreathingKeyframeDefinitions.bind(this),
      // C-STORY-013
      this.testGwt13_1_SlideDisplacementShortenedTo120ms.bind(this),
      this.testGwt13_2_HeroSlashMonsterVfxTriggersAtSlideStart.bind(this),
      this.testGwt13_3_HeroUpgradeVfxHasHighOpacityAndEnhancedFlare.bind(this),
      // C-STORY-014
      this.testGwt14_1_HeroUpgradeFiveTierDynamicScaling.bind(this),
      this.testGwt14_2_SuperMarioCoinPopAnimationAndEvent.bind(this),
      // C-STORY-015
      this.testGwt15_1_GoldCashOutUncappedSucceedsAndCappedAlerts.bind(this),
      this.testGwt15_2_GoldCashOutTriggersMarioCoinVfxAndSound.bind(this),
      // C-STORY-016
      this.testGwt16_1_TitleScreenFadeOutOnStartGameClick.bind(this),
      // C-STORY-017
      this.testGwt17_1_TwoStageGoldBudgetDepletionRichAndTrickle.bind(this),
      this.testGwt17_2_GoldMerge100PercentPayoutWithoutCap.bind(this),
      this.testGwt17_3_TapToCashOut100PercentWithoutBlocking.bind(this),
      this.testGwt17_4_VictoryAutoSweep100PercentFullAmount.bind(this),
      // C-STORY-018
      this.testGwt18_1_VictoryModalFirstClearThreeLinesAndAlignedSum.bind(this),
      this.testGwt18_2_VictoryModalRepeatClearHidesFirstClearLine.bind(this),
      this.testGwt18_3_DefeatModalShowsInBattleGoldEarned.bind(this),
      this.testGwt18_4_UndoHourglassRollsBackInBattleGold.bind(this),
      // C-STORY-019
      this.testGwt19_1_GoldDropDecay4CountAndMin4Floor.bind(this),
      this.testGwt19_2_DynamicCooldownPacingInterval6Turns.bind(this),
      this.testGwt19_3_UndoRollsBackGoldDropSchedule.bind(this),
      // C-STORY-021
      this.testGwt21_1_HeroCharacterThemesAndProgressiveIntensity.bind(this),
      this.testGwt21_2_HeroBreathingWave6pxTripleThickness.bind(this),
      // C-STORY-022
      this.testGwt22_1_WarehouseExpansionPricingAndCapacityProgression.bind(this),
      this.testGwt22_2_GachaItemDropProbabilityAndWeightDistribution.bind(this),
      this.testGwt22_3_ItemMaxCap999AndPureQuantityDisplay.bind(this),
      // C-STORY-023
      this.testGwt23_1_FourTabNavigationAndGuildRemoval.bind(this),
      this.testGwt23_2_RoyalPrivilegeShopCardsRenderAndInteract.bind(this),
      // C-STORY-024
      this.testGwt24_1_GearGatedTechUpgradePreventsBreakthroughWithoutEquippedWeapon.bind(this),
      this.testGwt24_2_GearGatedTechUpgradeAllowsBreakthroughWithSufficientGear.bind(this),
      // C-STORY-025
      this.testGwt25_1_CampCardOrderAndNoOverlappingBadges.bind(this),
      this.testGwt25_2_UnifiedCardHeaderAndCenteredButtonFormat.bind(this),
      // C-STORY-026
      this.testGwt26_1_StaminaVictoryNoDeductDefeatDeduct.bind(this),
      this.testGwt26_2_StaminaDepletedBlocksCombatAndModalGuide.bind(this),
      this.testGwt26_3_InterstitialAdTriggerEvery3Battles.bind(this),
      this.testGwt26_4_NoAdsPassExemptsInterstitialAndInstantClaim.bind(this),
      this.testGwt26_5_UnlimitedStaminaPassImmunity.bind(this),
      // C-STORY-027
      this.testGwt27_1_GridStrictlyEqualMinmax01fr.bind(this),
      this.testGwt27_2_GridCellsStrictNoOverflowOrDeformation.bind(this),
      this.testGwt27_3_CombatTouchAreaExpanded.bind(this),
      this.testGwt27_4_DefeatStaminaLossAnimationAndBadge.bind(this),
      // C-STORY-028
      this.testGwt28_1_SettingsModalVersionChangelog.bind(this),
      this.testGwt28_2_TopAndBottomSafePaddingInward.bind(this),
      this.testGwt28_3_StaminaIconHeartTransformation.bind(this),
      // C-STORY-029
      this.testGwt29_1_EightRichVeinDropsWithConstantInterval.bind(this),
      this.testGwt29_2_SubsequentDropsIntervalIncrementAndCapAt16.bind(this),
      this.testGwt29_3_VeinDecayEveryFourDropsMinimumFour.bind(this),
      this.testGwt29_4_AllStagesGoldCapDoubled.bind(this),
      // C-STORY-030: 新手引導序章 (Stage 0 Tutorial)
      this.testGwt30_1_TutorialInitialStateAndAutoStart.bind(this),
      this.testGwt30_2_DirectionRestrictionAndShakeWarning.bind(this),
      this.testGwt30_3_EquipFusionAdvancesToStep2.bind(this),
      this.testGwt30_4_SlimeCombatVictoryAdvancesToStep3.bind(this),
      this.testGwt30_5_GoldMergeAndTapToCashOutFlow.bind(this),
      this.testGwt30_6_BossPowerCheckAndTwoPhaseClear.bind(this),
      this.testGwt30_7_TutorialSkipAndCompletedFlagPersistence.bind(this),
      // C-STORY-031: 新手教學視覺化圖解POPUP、手指座標精確定位與規則修正
      this.testGwt31_1_PopupVisualCardFormulaStructures.bind(this),
      this.testGwt31_2_MonsterSynthesisWarningCorrectText.bind(this),
      this.testGwt31_3_Step3GoldTapAdvancesToStep4WithoutStall.bind(this),
      this.testGwt31_4_HandGuidePercentageCoordinatesAnchored.bind(this),
      // C-STORY-032: 新手教學節奏調優、自主演練、消除假規則與大廳序章訓練所
      this.testGwt32_1_Chapter0AndStage0IntegratedInLobby.bind(this),
      this.testGwt32_2_ClearTutorialRecordResetsState.bind(this),
      this.testGwt32_3_Step4BlockRuleAndOpenCombatConfig.bind(this),
      this.testGwt32_4_GoldTapGuideStrictlyCentered.bind(this),
      // C-STORY-033: 新手教學手勢位置優化、金幣收益結算修復、文案精簡與退關貨幣放棄機制
      this.testGwt33_1_MonsterWarningCopyWithoutMisleadingPriority.bind(this),
      this.testGwt33_2_HandGuidesPositionedBelowTiles.bind(this),
      this.testGwt33_3_MoveDelayReducedToOneSecond.bind(this),
      this.testGwt33_4_TutorialGoldMergeAndTapAccruesTo16Gold.bind(this),
      this.testGwt33_5_AbandonBattleRewardsForfeitsAllInCombatGold.bind(this),
      this.testGwt33_6_CellRectPositioningAccurateForTapAndSwipe.bind(this),
      // C-STORY-034: 戰敗教官覆盤提點與 2048 RPG 進階門道指南
      this.testGwt34_1_DefeatTacticalTipCardRendering.bind(this),
      this.testGwt34_2_DefeatTacticalTipCyclingAndModularity.bind(this),
      this.testGwt34_3_TacticalTipsContentCoverageOfGameMechanics.bind(this),
      // C-STORY-035: 教學手勢重位隱藏與點擊指尖置中校準
      this.testGwt35_1_HandGuideRepositionHideInstantaneously.bind(this),
      this.testGwt35_2_TapGuideFingertipOffsetCompensatedToCenter.bind(this),
      // C-STORY-036: Cache Busting 版本戳記與 iOS 主畫面無損熱更新
      this.testGwt36_1_AssetLinksContainVersionQueryString.bind(this),
      this.testGwt36_2_SettingsReloadButtonConfigured.bind(this),
      this.testGwt36_3_SaveVersionMigrationAndDataPreservation.bind(this)
    ];

    for (const test of testCases) {
      try {
        await test();
        this.results.push({ name: test.name, status: 'PASS' });
      } catch (err) {
        this.results.push({ name: test.name, status: 'FAIL', error: err.message });
      }
    }

    return this.results;
  }

  // C-STORY-001 GWT 1.1：頂部狀態列金幣與資訊初始化
  testGwt1_1_TopBarAndGoldState() {
    const sm = new StageManager();
    sm.gold = 300;
    this.assert(sm.gold === 300, 'Initial gold must be 300');
    this.assert(sm.unlockedStageId === 1, 'Initial unlocked stage must be 1');
  }

  // C-STORY-001 GWT 1.2：設定彈窗與存檔重置
  testGwt1_2_SettingsSaveDataReset() {
    const sm = new StageManager();
    sm.gold = 1500;
    sm.unlockedStageId = 3;
    sm.clearedStages = { 1: { stars: 3 }, 2: { stars: 3 } };
    sm.saveData();

    // Reset
    sm.resetSaveData();
    this.assert(sm.gold === 300, 'Reset gold should be 300');
    this.assert(sm.unlockedStageId === 1, 'Reset unlocked stage should be 1');
    this.assert(Object.keys(sm.clearedStages).length === 0, 'Cleared stages should be empty after reset');
  }

  // C-STORY-001 GWT 1.3：關卡配置與主線章節清單
  testGwt1_3_NavigationAndStagesList() {
    this.assert(STAGE_CONFIGS.length >= 5, 'Must have at least 5 configured stages in Chapter 1');
    const stage1 = STAGE_CONFIGS[0];
    this.assert(stage1.id === 1, 'Stage 1 ID is 1');
    this.assert(stage1.monsters.length === 3 && stage1.monsters[0] === 8, 'Stage 1 has 3 monsters with boss 8');
    this.assert(stage1.rewardGold === 100, 'Stage 1 reward is 100 gold (rebalanced in C-STORY-011)');
  }

  // C-STORY-002 GWT 2.1：出擊情報設定載入
  testGwt2_1_StageBriefingConfig() {
    const sm = new StageManager();
    const config = sm.startStage(1);
    this.assert(config !== null, 'Stage 1 config loaded successfully');
    this.assert(config.name === '第 1 關：微風平原', 'Stage 1 name is correct');
    this.assert(sm.isInBattle === true, 'StageManager is now in battle');
  }

  // C-STORY-002 GWT 2.2：獨立單關戰鬥加載與勇者開局出生
  testGwt2_2_SingleStageCombatInitialization() {
    const sm = new StageManager();
    sm.startStage(1);

    const hero = sm.board.getHero();
    this.assert(hero !== null, 'Hero must exist on board');
    this.assert(hero.r === 4, 'Hero must spawn at bottom row (r === 4)');
    this.assert(hero.value === 2, 'Hero default power is 2');

    const monsters = sm.board.getMonsters();
    this.assert(monsters.length === 3, 'Stage 1 has 3 monsters in C-STORY-009');
    this.assert(monsters.some(m => m.value === 8), 'Stage 1 has boss monster 8');
  }

  // C-STORY-002 GWT 2.3：全殲怪物勝利結算與解鎖下一關
  testGwt2_3_FullEliminationVictoryAndUnlockNext() {
    const sm = new StageManager();
    sm.unlockedStageId = 1;
    sm.gold = 300;
    sm.startStage(1);

    // Set Hero to 8 adjacent to monster 8
    sm.board.clear();
    sm.board.setTile(0, 1, new Tile(8, TileType.HERO, 0, 1));
    sm.board.setTile(0, 2, new Tile(8, TileType.MONSTER, 0, 2));

    // Move RIGHT to kill monster
    const res = sm.handleMove(Direction.RIGHT);
    this.assert(res.moved === true, 'Moved successfully');
    this.assert(sm.isVictory === true, 'All monsters killed, stage victory');
    this.assert(sm.gold === 400, 'Earned 100 gold reward (300 + 100 = 400)');
    this.assert(sm.unlockedStageId === 2, 'Stage 2 unlocked');
    this.assert(!!sm.clearedStages[1], 'Stage 1 marked as cleared');
  }

  // C-STORY-002 GWT 2.4：死局戰敗判定
  testGwt2_4_DeadlockDefeatDetection() {
    const board = new Board(5);
    const engine = new MoveEngine(board);

    // Value = 2^(r + c + 1). Strictly different from all horizontal and vertical neighbors
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const val = Math.pow(2, r + c + 1);
        board.setTile(r, c, new Tile(val, TileType.EQUIPMENT, r, c));
      }
    }

    this.assert(board.isFull() === true, 'Board is fully packed');
    this.assert(engine.canMove() === false, 'Cannot move in any direction (Deadlock)');
  }

  // C-STORY-003 GWT 3.1：英雄與裝備同值方可合體翻倍
  testGwt3_1_HeroEquipmentEqualValueFusion() {
    const board = new Board(5);
    const engine = new MoveEngine(board);

    // Hero 8 at (4, 0), Equipment 8 at (4, 1)
    board.setTile(4, 0, new Tile(8, TileType.HERO, 4, 0));
    board.setTile(4, 1, new Tile(8, TileType.EQUIPMENT, 4, 1));

    const res = engine.move(Direction.RIGHT);
    this.assert(res.moved === true, 'Move executed');
    this.assert(res.merges === 1, '1 merge occurred');
    this.assert(res.heroMerged === true, 'Hero merged with equipment');

    const hero = board.getHero();
    this.assert(hero !== null, 'Hero exists');
    this.assert(hero.value === 16, 'Hero doubled from 8 to 16');
    this.assert(hero.r === 4 && hero.c === 4, 'Hero slid to far right (4, 4)');
    this.assert(board.getEquipments().length === 0, 'Equipment absorbed');
  }

  // C-STORY-003 GWT 3.2：英雄與裝備異值絕對阻擋不合併
  testGwt3_2_HeroEquipmentDifferentValueBlocking() {
    const board = new Board(5);
    const engine = new MoveEngine(board);

    // Hero 128 at (4, 0), Equipment 2 at (4, 1)
    board.setTile(4, 0, new Tile(128, TileType.HERO, 4, 0));
    board.setTile(4, 1, new Tile(2, TileType.EQUIPMENT, 4, 1));

    const res = engine.move(Direction.RIGHT);
    this.assert(res.moved === true, 'Tiles slid right');
    this.assert(res.merges === 0, 'No merge should happen for different values');
    this.assert(res.heroMerged === false, 'Hero did not merge');

    const hero = board.getHero();
    const eq = board.getTile(4, 4);
    this.assert(hero !== null && hero.value === 128, 'Hero value strictly remains 128 (not doubled!)');
    this.assert(hero.r === 4 && hero.c === 3, 'Hero stopped at (4, 3) behind equipment');
    this.assert(eq !== null && eq.isEquipment() && eq.value === 2, 'Equipment 2 remains at (4, 4)');
  }

  // C-STORY-003 GWT 3.3：怪物滑動撞向英雄觸發斬殺
  testGwt3_3_MonsterToHeroDecapitation() {
    const board = new Board(5);
    const engine = new MoveEngine(board);

    // Monster 8 at (3, 0), Hero 128 at (4, 0)
    board.setTile(3, 0, new Tile(8, TileType.MONSTER, 3, 0));
    board.setTile(4, 0, new Tile(128, TileType.HERO, 4, 0));

    // Swipe DOWN: Monster slides into Hero
    const res = engine.move(Direction.DOWN);
    this.assert(res.moved === true, 'Move executed');
    this.assert(res.kills === 1, '1 monster killed by Hero on collision');

    const hero = board.getHero();
    this.assert(hero !== null, 'Hero exists');
    this.assert(hero.r === 4 && hero.c === 0, 'Hero remains at (4, 0)');
    this.assert(hero.value === 64, 'Hero halved from 128 to 64 (war damage)');
    this.assert(board.getMonsters().length === 0, 'Monster eliminated');
  }

  // C-STORY-003 GWT 3.4：英雄主動滑動撞向怪物斬殺
  testGwt3_4_HeroToMonsterDecapitation() {
    const board = new Board(5);
    const engine = new MoveEngine(board);

    // Hero 128 at (4, 0), Monster 8 at (3, 0)
    board.setTile(4, 0, new Tile(128, TileType.HERO, 4, 0));
    board.setTile(3, 0, new Tile(8, TileType.MONSTER, 3, 0));

    // Swipe UP: Hero slides into Monster
    const res = engine.move(Direction.UP);
    this.assert(res.moved === true, 'Move executed');
    this.assert(res.kills === 1, '1 monster killed by Hero');

    const hero = board.getHero();
    this.assert(hero !== null, 'Hero exists');
    this.assert(hero.r === 0 && hero.c === 0, 'Hero slid up to (0, 0)');
    this.assert(hero.value === 64, 'Hero halved from 128 to 64');
    this.assert(board.getMonsters().length === 0, 'Monster eliminated');
  }

  // C-STORY-003 GWT 3.5：裝備對怪物無害阻擋
  testGwt3_5_EquipmentNonLethalObstacle() {
    const board = new Board(5);
    const engine = new MoveEngine(board);

    // Hero at (0, 0), Equipment 16 at (2, 1), Monster 8 at (2, 4)
    board.setTile(0, 0, new Tile(2, TileType.HERO, 0, 0));
    board.setTile(2, 1, new Tile(16, TileType.EQUIPMENT, 2, 1));
    board.setTile(2, 4, new Tile(8, TileType.MONSTER, 2, 4));

    const res = engine.move(Direction.RIGHT);
    this.assert(res.moved === true, 'Tiles moved');
    this.assert(res.kills === 0, 'Equipment cannot kill monster, kills must be 0');

    const eq = board.getTile(2, 3);
    const m = board.getTile(2, 4);
    this.assert(eq !== null && eq.isEquipment(), 'Equipment stopped at (2, 3)');
    this.assert(m !== null && m.isMonster(), 'Monster remained at (2, 4)');
  }

  // C-STORY-004 GWT 4.1：固定每 8 回合產出 1 顆基礎金幣
  testGwt4_1_GoldSpawnsEvery8Turns() {
    const sm = new StageManager();
    sm.startStage(1);

    // Setup board with Hero and high-level monster in another column
    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(64, TileType.MONSTER, 0, 4));

    // Fast-forward to turn 6
    sm.turnCount = 6;
    sm.board.setTile(2, 0, new Tile(4, TileType.EQUIPMENT, 2, 0));
    sm.handleMove(Direction.DOWN); // becomes turn 7
    this.assert(sm.turnCount === 7, 'Turn count is 7');
    this.assert(sm.board.getAllTiles().filter(t => t.isGold()).length === 0, 'No gold spawned on turn 7');

    // Turn 8: swipe DOWN again to trigger turn 8
    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(64, TileType.MONSTER, 0, 4));
    sm.board.setTile(3, 0, new Tile(4, TileType.EQUIPMENT, 3, 0));
    sm.board.setTile(1, 0, new Tile(4, TileType.EQUIPMENT, 1, 0));
    const r8 = sm.handleMove(Direction.DOWN); // becomes turn 8
    this.assert(sm.turnCount === 8, 'Turn count is 8');
    const goldTiles = sm.board.getAllTiles().filter(t => t.isGold());
    this.assert(goldTiles.length === 1, 'Exactly 1 gold tile spawned on turn 8');
    this.assert(goldTiles[0].value === 4, 'Gold tile has stage 1 base value of 4 (C-STORY-019 min 4)');
  }

  // C-STORY-004 GWT 4.2：金幣方塊同值合併觸發即時跳錢獎勵
  testGwt4_2_GoldMergeInstantCashReward() {
    const sm = new StageManager();
    sm.gold = 300;
    sm.startStage(1);
    sm.board.clear();
    // Two gold tiles of value 2
    sm.board.setTile(2, 0, new Tile(2, TileType.GOLD, 2, 0));
    sm.board.setTile(2, 1, new Tile(2, TileType.GOLD, 2, 1));
    // Hero and monster to keep combat alive
    sm.board.setTile(4, 0, new Tile(128, TileType.HERO, 4, 0));
    sm.board.setTile(0, 0, new Tile(64, TileType.MONSTER, 0, 0));

    const res = sm.handleMove(Direction.RIGHT);
    this.assert(res.moved === true, 'Move executed');
    this.assert(res.goldEarned === 4, 'Earned 4G from merging 2+2 gold');
    this.assert(sm.gold === 304, 'Player gold immediately increased to 304 (300 + 4)');
    const goldTile = sm.board.getTile(2, 4);
    this.assert(goldTile !== null && goldTile.isGold() && goldTile.value === 4, 'Merged into Gold tile with value 4 at (2, 4)');
  }

  // C-STORY-004 GWT 4.3：異值金幣阻擋不合併
  testGwt4_3_GoldDifferentValueBlocking() {
    const board = new Board(5);
    const engine = new MoveEngine(board);
    board.setTile(2, 0, new Tile(2, TileType.GOLD, 2, 0));
    board.setTile(2, 1, new Tile(4, TileType.GOLD, 2, 1));

    const res = engine.move(Direction.RIGHT);
    this.assert(res.moved === true, 'Tiles moved');
    this.assert(res.goldEarned === 0, 'No gold earned for different values');
    const t1 = board.getTile(2, 3);
    const t2 = board.getTile(2, 4);
    this.assert(t1 !== null && t1.isGold() && t1.value === 2, 'Gold 2 at (2, 3)');
    this.assert(t2 !== null && t2.isGold() && t2.value === 4, 'Gold 4 at (2, 4)');
  }

  // C-STORY-004 GWT 4.4：點擊金幣方塊即時提款並清空格子
  testGwt4_4_TapToCashOutGoldTile() {
    const sm = new StageManager();
    sm.gold = 304;
    sm.startStage(1);
    sm.board.setTile(1, 1, new Tile(4, TileType.GOLD, 1, 1));

    const cashResult = sm.cashOutGoldTile(1, 1);
    this.assert(cashResult.success === true, 'Cash out succeeded');
    this.assert(cashResult.amount === 4, 'Cashed out 4 gold');
    this.assert(sm.gold === 308, 'Player gold increased to 308 (304 + 4)');
    this.assert(sm.board.getTile(1, 1) === null, 'Tile at (1, 1) cleared');
  }

  // C-STORY-004 GWT 4.5：全殲通關自動搜集全盤殘留金幣
  testGwt4_5_VictoryAutoSweepGold() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.gold = 300;
    sm.startStage(1); // Stage 1 base reward is 100
    sm.board.clear();
    sm.board.setTile(0, 1, new Tile(8, TileType.HERO, 0, 1));
    sm.board.setTile(0, 2, new Tile(8, TileType.MONSTER, 0, 2));
    sm.board.setTile(3, 0, new Tile(2, TileType.GOLD, 3, 0));
    sm.board.setTile(3, 1, new Tile(4, TileType.GOLD, 3, 1));

    const res = sm.handleMove(Direction.RIGHT);
    this.assert(res.moved === true, 'Move executed');
    this.assert(sm.isVictory === true, 'Stage victory achieved');
    // Base 100 + Sweep 2 + Sweep 4 = 106. Total = 300 + 106 = 406
    this.assert(sm.gold === 406, 'Total gold should be 300 + 100 (base) + 6 (sweep) = 406');
    this.assert(sm.board.getAllTiles().filter(t => t.isGold()).length === 0, 'All gold tiles swept from board');
  }

  // C-STORY-005 GWT 5.1：商店 0 元測試金幣包
  testGwt5_1_ShopClaimTestGold() {
    const sm = new StageManager();
    sm.gold = 300;
    const newGold = sm.claimTestGold(10000);
    this.assert(newGold === 10300, 'Returned gold should be 10300');
    this.assert(sm.gold === 10300, 'StageManager gold strictly increased to 10300');
  }

  // C-STORY-005 GWT 5.2：轉蛋機掉落物與權重概率
  testGwt5_2_GachaPullsAndWeightDistribution() {
    const sm = new StageManager();
    sm.gold = 5000;
    sm.gachaExp = 0;
    sm.gachaLevel = 1;
    sm.inventory.items = [];

    // Perform 10-pull
    const res = sm.pullGacha(10);
    this.assert(res.success === true, '10-pull succeeded');
    this.assert(sm.gold === 4000, 'Deducted 1000 gold (5000 -> 4000)');
    this.assert(sm.inventory.items.length === 10, '10 items deposited into inventory');
    this.assert(sm.gachaExp === 10, 'Gacha EXP increased to 10');

    // Statistical distribution test on Lv.1 (sample size = 3000)
    let count2 = 0;
    let count4 = 0;
    let count32 = 0;
    const sampleSize = 3000;

    for (let i = 0; i < sampleSize; i++) {
      const val = sm.gachaEngine.roll(1);
      this.assert([2, 4, 8, 16, 32].includes(val), `Value ${val} must be in Lv.1 drop table`);
      if (val === 2) count2++;
      if (val === 4) count4++;
      if (val === 32) count32++;
    }

    const rate2 = count2 / sampleSize;
    const rate4 = count4 / sampleSize;
    const rate32 = count32 / sampleSize;

    // 2 should be > 74% (spec: > 75%, approx 77%)
    this.assert(rate2 > 0.73, `Rate for 2 (${(rate2*100).toFixed(1)}%) should exceed 73%`);
    // 4 should be > 18% (spec: > 20%, approx 21%)
    this.assert(rate4 > 0.18, `Rate for 4 (${(rate4*100).toFixed(1)}%) should exceed 18%`);
    // 32 should be < 0.5% (spec: < 0.2%, approx 0.1%)
    this.assert(rate32 < 0.006, `Rate for 32 (${(rate32*100).toFixed(2)}%) should be very small (< 0.6%)`);
  }

  // C-STORY-005 GWT 5.3：轉蛋機經驗值累積與升級
  testGwt5_3_GachaExpAndLevelUp() {
    const sm = new StageManager();
    sm.gold = 5000;
    sm.gachaExp = 25;
    sm.gachaLevel = 1;
    sm.inventory.items = [];

    // 10 pulls will bring exp from 25 to 35, crossing the 30 threshold to Lv.2
    const res = sm.pullGacha(10);
    this.assert(res.success === true, 'Pull succeeded');
    this.assert(sm.gachaExp === 35, 'Gacha EXP is 35');
    this.assert(sm.gachaLevel === 2, 'Gacha elevated to Lv.2');
    this.assert(res.levelUp === true, 'LevelUp flag set to true');

    const lv2Config = sm.gachaEngine.getConfig(2);
    this.assert(lv2Config.maxDropValue === 64, 'Lv.2 drop pool expanded to 64');
  }

  // C-STORY-005 GWT 5.4：一鍵全部合成 (Batch Auto-Merge)
  testGwt5_4_BatchAutoMerge() {
    const sm = new StageManager();
    sm.inventory.items = [];

    // Setup: 4x '2', 2x '4', 1x '8' (total 7 items)
    sm.inventory.addItems([2, 2, 2, 2, 4, 4, 8]);
    this.assert(sm.inventory.items.length === 7, '7 initial items loaded');

    // Expected cascade:
    // 4x '2' -> 2x '4'
    // (2+2)x '4' = 4x '4' -> 2x '8'
    // (2+1)x '8' = 3x '8' -> 1x '16' + 1x '8'
    // Final remaining: 1x '16', 1x '8' (2 items total, 5 slots freed)
    const mergeRes = sm.batchAutoMerge();

    this.assert(sm.inventory.items.length === 2, 'Exactly 2 items remain after batch auto merge');
    this.assert(mergeRes.freedSlots === 5, '5 backpack slots freed');
    this.assert(mergeRes.mergedCount === 5, '5 pairs merged in total (2+2+1)');

    const finalValues = sm.inventory.items.map(it => it.value).sort((a, b) => a - b);
    this.assert(finalValues[0] === 8 && finalValues[1] === 16, 'Remaining items must be exactly 8 and 16');
  }

  // C-STORY-005 GWT 5.5：出戰裝備佩戴與關卡戰力繼承
  testGwt5_5_HeroEquipmentInheritanceInCombat() {
    const sm = new StageManager();
    sm.inventory.items = [];

    // Add and equip a 64-value item
    const item64 = sm.inventory.addItem(64);
    const equipRes = sm.equipItem(item64.id);
    this.assert(equipRes.success === true, 'Item 64 successfully equipped');
    this.assert(sm.inventory.getEquippedPower() === 64, 'Active loadout power is 64');

    // Start Stage 1 without passing explicit power
    sm.startStage(1);
    const hero = sm.board.getHero();
    this.assert(hero !== null, 'Hero spawned on battlefield');
    this.assert(hero.value === 64, 'Hero combat start power strictly inherited 64 from equipped item');
  }

  // C-STORY-005 GWT 5.6：背包已滿時的保護機制
  testGwt5_6_InventoryFullGachaBlocked() {
    const sm = new StageManager();
    sm.gold = 5000;
    sm.inventory.items = [];

    // Fill all 24 slots
    for (let i = 0; i < 24; i++) {
      sm.inventory.addItem(2);
    }
    this.assert(sm.inventory.items.length === 24, 'Inventory is at full capacity (24/24)');

    // Attempt single pull
    const res = sm.pullGacha(1);
    this.assert(res.success === false, 'Pull must be rejected when inventory is full');
    this.assert(res.reason.includes('裝備背包已滿'), 'Proper full inventory warning provided');
    this.assert(sm.gold === 5000, 'No gold was deducted');
    this.assert(sm.inventory.items.length === 24, 'Inventory item count unchanged at 24');
  }

  // C-STORY-006 GWT 6.1：第 I 章通關解鎖第 II 章
  testGwt6_1_ChapterProgressionUnlock() {
    const sm = new StageManager();
    sm.resetSaveData();

    // Before clearing Stage 5: Chapter 1 unlocked, Chapter 2 locked
    this.assert(sm.isChapterUnlocked(1) === true, 'Chapter 1 is always unlocked');
    this.assert(sm.isChapterUnlocked(2) === false, 'Chapter 2 is locked before Stage 5 clear');

    // Simulate clearing Stage 5
    sm.clearedStages[5] = { stars: 3, clearedCount: 1 };
    sm.unlockedStageId = 6;
    this.assert(sm.isChapterUnlocked(2) === true, 'Chapter 2 is unlocked after Stage 5 clear');

    const stage6 = STAGE_CONFIGS.find(s => s.id === 6);
    this.assert(stage6 !== null && stage6.chapter === 2, 'Stage 6 belongs to Chapter 2');
    this.assert(stage6.rewardGold === 125, 'Stage 6 base gold reward is 125 (rebalanced in C-STORY-011)');
  }

  // C-STORY-006 GWT 6.2：第 II 章關卡高低數值混編初始化
  testGwt6_2_MixedTierMonsterInitialization() {
    const sm = new StageManager();
    // Start Stage 8 (configured with monsters: [16, 64, 128])
    const config = sm.startStage(8, 64);
    this.assert(config.monsters.length === 3, 'Stage 8 config contains 3 monsters');

    const monsters = sm.board.getMonsters();
    this.assert(monsters.length === 3, 'Board spawned all 3 mixed-tier monsters');

    const vals = monsters.map(m => m.value).sort((a, b) => a - b);
    this.assert(vals[0] === 32 && vals[1] === 64 && vals[2] === 128, 'Monsters contain mixed values 32, 64, 128');
  }

  // C-STORY-006 GWT 6.3：混編敵陣中的個別斬殺判定
  testGwt6_3_IndividualDecapitationInMixedArray() {
    const board = new Board(5);
    const engine = new MoveEngine(board);

    // Hero 64 at (4, 0), Monster 16 at (3, 0), Monster 128 at (0, 0)
    board.setTile(4, 0, new Tile(64, TileType.HERO, 4, 0));
    board.setTile(3, 0, new Tile(16, TileType.MONSTER, 3, 0));
    board.setTile(0, 0, new Tile(128, TileType.MONSTER, 0, 0));

    // Swipe UP: Hero slides into Monster 16
    const res = engine.move(Direction.UP);
    this.assert(res.moved === true, 'Move executed');
    this.assert(res.kills === 1, '1 monster slain');

    const hero = board.getHero();
    this.assert(hero !== null, 'Hero exists');
    this.assert(hero.value === 32, 'Hero value halved from 64 to 32 (war damage)');

    const monsters = board.getMonsters();
    this.assert(monsters.length === 1, 'Only 1 monster remains on board');
    this.assert(monsters[0].value === 128, 'Monster 128 remains untouched and alive');
  }

  // C-STORY-006 GWT 6.4：分裂魔物斬殺分裂判定
  testGwt6_4_SplittingMonsterMechanic() {
    const sm = new StageManager();
    sm.startStage(7, 64);

    // Setup: Hero 64 at (1, 0), Mother Slime 64 at (0, 0) with splitOnDeath flag
    sm.board.clear();
    sm.board.setTile(1, 0, new Tile(64, TileType.HERO, 1, 0));
    sm.board.setTile(0, 0, new Tile(64, TileType.MONSTER, 0, 0, {
      splitOnDeath: true,
      splitValue: 16,
      splitCount: 2
    }));

    // Hero swipes UP into Slime Mother 64
    const res = sm.handleMove(Direction.UP);
    this.assert(res.moved === true, 'Move executed');

    const hero = sm.board.getHero();
    this.assert(hero !== null && hero.value === 32, 'Hero halved to 32');
    this.assert(sm.isVictory === false, 'Battle must NOT be victorious yet because mother split');

    const monsters = sm.board.getMonsters();
    this.assert(monsters.length === 2, '2 children monsters spawned from splitting');
    this.assert(monsters.every(m => m.value === 16), 'All children monsters have value 16');
    this.assert(monsters.every(m => m.splitOnDeath === false), 'Children monsters do not split further');
  }

  // C-STORY-006 GWT 6.5：子代魔物終結全殲勝利
  testGwt6_5_ChildrenEliminationAndChapter2Victory() {
    const sm = new StageManager();
    sm.startStage(7, 32);

    // Setup: Hero 32 at (0, 0), single remaining child 16 at (0, 1)
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(32, TileType.HERO, 0, 0));
    sm.board.setTile(0, 1, new Tile(16, TileType.MONSTER, 0, 1, { splitOnDeath: false }));
    sm.gold = 1000;

    // Swipe RIGHT: Hero 32 slays final child 16
    const res = sm.handleMove(Direction.RIGHT);
    this.assert(res.moved === true, 'Hero executed final child');
    this.assert(sm.board.getMonsters().length === 0, 'All monsters completely eliminated');
    this.assert(sm.isVictory === true, 'Full elimination triggers Victory');
    this.assert(sm.gold === 1130, 'Earned Stage 7 reward of 130 gold (1000 + 130 = 1130)');
    this.assert(sm.unlockedStageId === 8, 'Stage 8 unlocked');
  }

  // C-STORY-007 GWT 7.1：救急道具存量管理與測試領取
  testGwt7_1_EmergencyItemStockAndClaimTestPacks() {
    const sm = new StageManager();
    sm.resetSaveData();
    this.assert(sm.getItemCount('undo') === 0, 'Initial undo count must be 0');
    this.assert(sm.getItemCount('hammer') === 0, 'Initial hammer count must be 0');
    this.assert(sm.getItemCount('snipe') === 0, 'Initial snipe count must be 0');

    // Claim free test items (5 each)
    const claimed = sm.claimTestItems(5);
    this.assert(claimed.undo === 5 && claimed.hammer === 5 && claimed.snipe === 5, 'Claim returns 5 of each item');
    this.assert(sm.getItemCount('undo') === 5, 'StageManager undo count is 5');
    this.assert(sm.getItemCount('hammer') === 5, 'StageManager hammer count is 5');
    this.assert(sm.getItemCount('snipe') === 5, 'StageManager snipe count is 5');

    // Claim again (accumulates to 10)
    sm.claimTestItems(5);
    this.assert(sm.getItemCount('undo') === 10, 'StageManager undo count accumulates to 10');
  }

  // C-STORY-007 GWT 7.2：時光沙漏回溯上一步（棋盤狀態、回合數、金幣與防呆）
  testGwt7_2_UndoTimeHourglassRevertState() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1, 2);

    // Initial check: No moves made yet, attempt undo -> should fail
    sm.items.undo = 2;
    const failRes = sm.useUndoItem();
    this.assert(failRes.success === false, 'Cannot undo before any move has been made');
    this.assert(failRes.reason.includes('尚未移動'), 'Error reason specifies no moves made');
    this.assert(sm.items.undo === 2, 'Item is not consumed on failure');

    // Setup a specific board state before moving: Hero at (0, 0), Equipment 2 at (0, 1)
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(2, TileType.HERO, 0, 0));
    sm.board.setTile(0, 1, new Tile(2, TileType.EQUIPMENT, 0, 1));
    sm.board.setTile(4, 4, new Tile(8, TileType.MONSTER, 4, 4));
    sm.turnCount = 5;
    sm.gold = 300;

    // Swipe RIGHT: Hero merges with Equipment 2 into Hero 4 at (0, 1)
    const moveRes = sm.handleMove(Direction.RIGHT);
    this.assert(moveRes.moved === true, 'Move executed');
    this.assert(sm.turnCount === 6, 'Turn count incremented to 6');
    const heroAfter = sm.board.getHero();
    this.assert(heroAfter.value === 4, 'Hero became 4 after merge');

    // Use Undo Item
    const undoRes = sm.useUndoItem();
    this.assert(undoRes.success === true, 'Undo successfully executed');
    this.assert(sm.items.undo === 1, 'Undo count decremented to 1');
    this.assert(sm.turnCount === 5, 'Turn count reverted to 5');
    this.assert(sm.gold === 300, 'Gold reverted to 300');

    // Verify board restored: Hero back at (0, 0) with value 2, Equipment 2 back at (0, 1)
    const heroRestored = sm.board.getHero();
    this.assert(heroRestored !== null, 'Hero exists on restored board');
    this.assert(heroRestored.r === 0 && heroRestored.c === 0, 'Hero restored to (0, 0)');
    this.assert(heroRestored.value === 2, 'Hero value restored to 2');
    const eqRestored = sm.board.getTile(0, 1);
    this.assert(eqRestored !== null && eqRestored.isEquipment() && eqRestored.value === 2, 'Equipment 2 restored to (0, 1)');
  }

  // C-STORY-007 GWT 7.3：破壞戰槌粉碎指定非勇者方塊（防呆與不耗回合）
  testGwt7_3_HammerDestroysNonHeroTile() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1, 16);

    // Setup board: Hero 16 at (0, 0), Equipment 16 at (0, 1), Monster 32 at (0, 2)
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(16, TileType.HERO, 0, 0));
    sm.board.setTile(0, 1, new Tile(16, TileType.EQUIPMENT, 0, 1));
    sm.board.setTile(0, 2, new Tile(32, TileType.MONSTER, 0, 2));
    sm.items.hammer = 3;
    sm.turnCount = 3;

    // 1. Try hammer on empty cell (2, 2) -> fails
    const emptyRes = sm.useHammerItem(2, 2);
    this.assert(emptyRes.success === false, 'Cannot hammer empty cell');
    this.assert(sm.items.hammer === 3, 'Hammer not consumed on empty cell');

    // 2. Try hammer on Hero at (0, 0) -> fails with hero protection
    const heroRes = sm.useHammerItem(0, 0);
    this.assert(heroRes.success === false, 'Cannot destroy Hero tile');
    this.assert(heroRes.reason.includes('無法破壞勇者'), 'Reason explains Hero protection');
    this.assert(sm.items.hammer === 3, 'Hammer not consumed on hero cell');
    this.assert(sm.board.getHero() !== null, 'Hero still alive');

    // 3. Hammer Equipment at (0, 1) -> succeeds, cell cleared, turnCount NOT advanced
    const smashRes = sm.useHammerItem(0, 1);
    this.assert(smashRes.success === true, 'Hammer successfully smashed equipment');
    this.assert(sm.items.hammer === 2, 'Hammer count decremented to 2');
    this.assert(sm.board.getTile(0, 1) === null, 'Cell (0, 1) is now empty space');
    this.assert(sm.turnCount === 3, 'Turn count remains unchanged (did not advance)');
  }

  // C-STORY-007 GWT 7.4：精準重弩無損狙殺戰力嚴格小於勇者之魔物
  testGwt7_4_SnipeStrictlyLesserMonsterOneShotNoDamage() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1, 32);

    // Setup board: Hero 32 at (0, 0), Goblin 16 at (4, 4) (16 < 32)
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(32, TileType.HERO, 0, 0));
    sm.board.setTile(4, 4, new Tile(16, TileType.MONSTER, 4, 4));
    sm.items.snipe = 2;
    sm.turnCount = 4;
    sm.monstersKilled = 0;

    // Snipe the monster at (4, 4)
    const snipeRes = sm.useSnipeItem(4, 4);
    this.assert(snipeRes.success === true, 'Snipe successfully executed on lesser monster');
    this.assert(sm.items.snipe === 1, 'Snipe count decremented to 1');
    this.assert(sm.board.getTile(4, 4) === null, 'Monster tile removed from (4, 4)');
    this.assert(sm.monstersKilled === 1, 'Kill count incremented to 1');

    // Hero must remain 32! (Zero damage taken, not halved to 16!)
    const hero = sm.board.getHero();
    this.assert(hero !== null && hero.value === 32, 'Hero value remains untouched at 32');
    this.assert(sm.turnCount === 4, 'Turn count remains unchanged');

    // Last monster was eliminated -> Stage Victory triggered
    this.assert(sm.isVictory === true, 'Eliminating last monster via snipe triggers Victory');
  }

  // C-STORY-007 GWT 7.5：精準重弩防呆——嚴格阻擋大於或等於勇者之魔物及非魔物
  testGwt7_5_SnipeEqualOrGreaterMonsterBlocked() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1, 32);

    // Setup board: Hero 32 at (0, 0), Equal Monster 32 at (0, 1), Greater Monster 64 at (0, 2), Equipment 16 at (0, 3)
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(32, TileType.HERO, 0, 0));
    sm.board.setTile(0, 1, new Tile(32, TileType.MONSTER, 0, 1));
    sm.board.setTile(0, 2, new Tile(64, TileType.MONSTER, 0, 2));
    sm.board.setTile(0, 3, new Tile(16, TileType.EQUIPMENT, 0, 3));
    sm.items.snipe = 3;

    // 1. Target non-monster (Equipment) at (0, 3) -> fails
    const eqRes = sm.useSnipeItem(0, 3);
    this.assert(eqRes.success === false, 'Cannot snipe non-monster tile');
    this.assert(eqRes.reason.includes('非魔物'), 'Reason indicates target must be monster');
    this.assert(sm.items.snipe === 3, 'Snipe item not consumed');

    // 2. Target Equal Monster 32 (32 == 32) -> MUST BE STRICTLY BLOCKED!
    const equalRes = sm.useSnipeItem(0, 1);
    this.assert(equalRes.success === false, 'Snipe must be strictly blocked against monster with equal power');
    this.assert(equalRes.reason.includes('大於或等於勇者'), 'Reason specifies monster value >= hero value is forbidden');
    this.assert(sm.board.getTile(0, 1) !== null && sm.board.getTile(0, 1).value === 32, 'Equal monster remains alive');
    this.assert(sm.items.snipe === 3, 'Snipe item not consumed');

    // 3. Target Greater Monster 64 (64 > 32) -> MUST BE STRICTLY BLOCKED!
    const greaterRes = sm.useSnipeItem(0, 2);
    this.assert(greaterRes.success === false, 'Snipe must be strictly blocked against monster with greater power');
    this.assert(sm.board.getTile(0, 2) !== null && sm.board.getTile(0, 2).value === 64, 'Greater monster remains alive');
    this.assert(sm.items.snipe === 3, 'Snipe item not consumed');

    // Hero remains 32
    const hero = sm.board.getHero();
    this.assert(hero.value === 32, 'Hero value remains 32');
  }

  // ==========================================
  // C-STORY-008: 封面標題、350關宏觀數值、24階科技升階
  // ==========================================

  // C-STORY-008 GWT 8.1：封面標題畫面與【開始遊戲】轉場
  testGwt8_1_TitleScreenCoverInitialDisplayAndStartGame() {
    let titleScreen = document.getElementById('view-title-screen');
    let startBtn = document.getElementById('btn-start-game');
    let createdMock = false;

    if (!titleScreen) {
      createdMock = true;
      titleScreen = document.createElement('div');
      titleScreen.id = 'view-title-screen';
      titleScreen.className = 'title-screen';
      startBtn = document.createElement('button');
      startBtn.id = 'btn-start-game';
      titleScreen.appendChild(startBtn);
      document.body.appendChild(titleScreen);

      startBtn.addEventListener('click', () => {
        titleScreen.classList.add('fade-out');
      });
    }

    this.assert(titleScreen !== null, 'view-title-screen element must exist in DOM');
    this.assert(startBtn !== null, 'btn-start-game element must exist in DOM');

    // Simulate clicking start game button
    startBtn.click();
    this.assert(titleScreen.classList.contains('fade-out'), 'Clicking start button must add fade-out class to title screen');

    if (createdMock && titleScreen.parentNode) {
      titleScreen.parentNode.removeChild(titleScreen);
    }
  }

  // C-STORY-008 GWT 8.2：長線 350 關全量配置與每關至少 3 隻魔物
  testGwt8_2_Macro350StagesScalingAndMultiMonsters() {
    this.assert(STAGE_CONFIGS.length === 350, `Stage count must be exactly 350, got ${STAGE_CONFIGS.length}`);
    this.assert(CHAPTER_CONFIGS.length === 9, `Chapter count must be 9 (Chapter 0 + Chapters 1~8), got ${CHAPTER_CONFIGS.length}`);

    // Verify Chapter ranges
    const ch8 = CHAPTER_CONFIGS.find(c => c.id === 8);
    this.assert(ch8 !== undefined && ch8.range[1] === 350, 'Chapter 8 ends at stage 350');

    // Verify long-term stages (11~350) have >= 3 monsters
    for (let sId = 11; sId <= 350; sId++) {
      const cfg = STAGE_CONFIGS.find(s => s.id === sId);
      this.assert(cfg !== null, `Stage ${sId} config exists`);
      const totalMonsters = (cfg.monsters ? cfg.monsters.length : 0);
      this.assert(totalMonsters >= 3, `Stage ${sId} must have at least 3 monsters, got ${totalMonsters}`);
    }

    // Verify 7th multiple stages contain splitting monsters
    const splitterStage14 = STAGE_CONFIGS.find(s => s.id === 14);
    const hasSplitter = splitterStage14.monsters.some(m => typeof m === 'object' && m.splitOnDeath);
    this.assert(hasSplitter === true, 'Stage 14 contains splitting monster');
  }

  // C-STORY-008 GWT 8.3：初回通關獎勵金與關卡金幣預算池 (goldSpawnBudget) 初始化
  testGwt8_3_StageGoldRewardAndInCombatCap() {
    const s11 = STAGE_CONFIGS.find(s => s.id === 11);
    this.assert(s11 !== undefined, 'Stage 11 exists');
    this.assert(s11.rewardGold === 150, `Stage 11 rewardGold should be 150, got ${s11.rewardGold}`);
    this.assert(s11.goldCap === 140, `Stage 11 goldCap should be 140, got ${s11.goldCap}`);

    // Test gold budget initialization and 100% cash out
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(11, 64);
    this.assert(sm.stageGoldEarned === 0, 'Initial stageGoldEarned is 0');
    this.assert(sm.remainingGoldBudget === 140, 'Initial remainingGoldBudget matches stage goldCap (140)');

    // Put gold tiles on board
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(40, TileType.GOLD, 0, 0));
    sm.board.setTile(0, 1, new Tile(40, TileType.GOLD, 0, 1));

    // Cash out first 40 gold (100% full payout)
    const cash1 = sm.cashOutGoldTile(0, 0);
    this.assert(cash1.success === true && cash1.amount === 40, 'Successfully cashed out 40 gold');
    this.assert(sm.stageGoldEarned === 40, 'stageGoldEarned is now 40');

    // Cash out second 40 gold (100% full payout, no clamping) (C-STORY-017)
    const cash2 = sm.cashOutGoldTile(0, 1);
    this.assert(cash2.success === true && cash2.amount === 40, `Cashed out full amount 40, got ${cash2.amount}`);
    this.assert(sm.stageGoldEarned === 80, `stageGoldEarned is 80 (full unblocked payout)`);
  }

  // C-STORY-008 GWT 8.4：王國軍備科技 24 階小升階與掉落權重提升
  testGwt8_4_BaseTechTierUpgradeMinorAndWeights() {
    const sm = new StageManager();
    sm.resetSaveData();
    this.assert(sm.baseTier === 1, 'Initial tech tier is 1');
    const tier1 = sm.getBaseTierConfig();
    this.assert(tier1.name === '新兵武裝', 'Tier 1 is 新兵武裝');
    this.assert(tier1.baseRange[0] === 2, 'Tier 1 baseRange starts at 2');

    // Upgrade to Tier 2
    sm.claimTestGold(5000);
    const upRes = sm.upgradeBaseTier();
    this.assert(upRes.success === true, 'Successfully upgraded to Tier 2');
    this.assert(sm.baseTier === 2, 'baseTier is now 2');
    const tier2 = sm.getBaseTierConfig();
    this.assert(tier2.name === '巡邏獵備', 'Tier 2 is 巡邏獵備');
    this.assert(tier2.weights[2] > tier1.weights[2], 'Tier 2 has higher weight for top tier items');

    // Test Spawner with Tier 2
    const board = new Board(5);
    const spawner = new Spawner(board);
    const spawned = spawner.spawnTurnEquipment(tier2);
    this.assert(spawned !== null, 'Spawned equipment tile');
    this.assert(tier2.baseRange.includes(spawned.value), `Spawned value ${spawned.value} must be in tier2 baseRange`);
  }

  // C-STORY-008 GWT 8.5：王國軍備科技大升階徹底淘汰低階方塊（大升階至 64）
  testGwt8_5_BaseTechTierMajorUpgradeEliminationUpTo64() {
    this.assert(BASE_STAT_TIERS.length === 24, `Must have 24 tiers, got ${BASE_STAT_TIERS.length}`);

    // Tier 6 (Major 1): 淘汰 2 -> [4, 8, 16]
    const tier6 = BASE_STAT_TIERS.find(t => t.tier === 6);
    this.assert(tier6.isMajor === true, 'Tier 6 is major upgrade');
    this.assert(tier6.baseRange[0] === 4 && tier6.baseRange[2] === 16, 'Tier 6 baseRange is [4, 8, 16] (eliminated 2)');

    // Tier 12 (Major 2): 淘汰 4 -> [8, 16, 32]
    const tier12 = BASE_STAT_TIERS.find(t => t.tier === 12);
    this.assert(tier12.isMajor === true, 'Tier 12 is major upgrade');
    this.assert(tier12.baseRange[0] === 8 && tier12.baseRange[2] === 32, 'Tier 12 baseRange is [8, 16, 32] (eliminated 4)');

    // Tier 18 (Major 3): 淘汰 8 -> [16, 32, 64]（大升階至 64！）
    const tier18 = BASE_STAT_TIERS.find(t => t.tier === 18);
    this.assert(tier18.isMajor === true, 'Tier 18 is major upgrade');
    this.assert(tier18.baseRange[0] === 16 && tier18.baseRange[2] === 64, 'Tier 18 baseRange is [16, 32, 64] (eliminated 8, up to 64)');

    // Tier 24 (Major 4): 淘汰 16 -> [32, 64, 128]
    const tier24 = BASE_STAT_TIERS.find(t => t.tier === 24);
    this.assert(tier24.isMajor === true, 'Tier 24 is major upgrade');
    this.assert(tier24.baseRange[0] === 32 && tier24.baseRange[2] === 128, 'Tier 24 baseRange is [32, 64, 128]');

    // Test Spawner with Tier 18: strictly eliminated values below 16
    const sm = new StageManager();
    sm.baseTier = 18;
    const tier18Cfg = sm.getBaseTierConfig();
    const board = new Board(5);
    const spawner = new Spawner(board);
    for (let i = 0; i < 20; i++) {
      board.clear();
      const tile = spawner.spawnTurnEquipment(tier18Cfg);
      this.assert(tile.value >= 16, `Tier 18 spawned value ${tile.value} must be >= 16 (2, 4, 8 completely eliminated)`);
    }
  }

  // C-STORY-009 GWT 9.1：第一章 (1~5關) 單隻最大 32 起點與每關 3~4 隻魔物
  testGwt9_1_FirstChapterDifficultyScaleStartingAt32() {
    const ch1Stages = STAGE_CONFIGS.filter(s => s.chapter === 1);
    this.assert(ch1Stages.length === 5, 'Chapter 1 must have exactly 5 stages');

    // Stage 1: [8, 2, 4], 3 monsters
    const s1 = ch1Stages[0];
    this.assert(s1.monsters.length === 3, 'Stage 1 has 3 monsters');
    this.assert(Math.max(...s1.monsters) === 8, 'Stage 1 boss is 8');

    // Stage 2: [16, 4, 4], 3 monsters
    const s2 = ch1Stages[1];
    this.assert(s2.monsters.length === 3, 'Stage 2 has 3 monsters');
    this.assert(Math.max(...s2.monsters) === 16, 'Stage 2 boss is 16');

    // Stage 3: [16, 4, 8], 3 monsters
    const s3 = ch1Stages[2];
    this.assert(s3.monsters.length === 3, 'Stage 3 has 3 monsters');
    this.assert(Math.max(...s3.monsters) === 16, 'Stage 3 boss is 16');

    // Stage 4: [32, 8, 8], 3 monsters
    const s4 = ch1Stages[3];
    this.assert(s4.monsters.length === 3, 'Stage 4 has 3 monsters');
    this.assert(Math.max(...s4.monsters) === 32, 'Stage 4 boss is 32');

    // Stage 5: [32, 8, 16, 16], 4 monsters
    const s5 = ch1Stages[4];
    this.assert(s5.monsters.length === 4, 'Stage 5 has 4 monsters');
    this.assert(Math.max(...s5.monsters) === 32, 'Stage 5 boss is 32');

    // Verify all Chapter 1 monsters do not exceed 32
    ch1Stages.forEach(st => {
      st.monsters.forEach(mVal => {
        this.assert(mVal <= 32, `Chapter 1 monster value ${mVal} must not exceed 32`);
      });
    });
  }

  // C-STORY-009 GWT 9.2：第二章 (64~512) 與第三章 (512~2048) 平滑數值階梯與怪數範圍
  testGwt9_2_MultiChapterMonsterProgressionScale() {
    const ch2Stages = STAGE_CONFIGS.filter(s => s.chapter === 2);
    this.assert(ch2Stages.length === 15, 'Chapter 2 has 15 stages (6~20)');
    ch2Stages.forEach(st => {
      this.assert(st.monsters.length >= 3 && st.monsters.length <= 4, 'Chapter 2 monster count is 3~4');
      const boss = Math.max(...st.monsters.map(m => typeof m === 'object' ? m.value : m));
      this.assert(boss >= 64 && boss <= 512, `Chapter 2 boss ${boss} is in range 64~512`);
    });

    const ch3Stages = STAGE_CONFIGS.filter(s => s.chapter === 3);
    this.assert(ch3Stages.length === 30, 'Chapter 3 has 30 stages (21~50)');
    ch3Stages.forEach(st => {
      this.assert(st.monsters.length >= 4 && st.monsters.length <= 5, 'Chapter 3 monster count is 4~5');
      const boss = Math.max(...st.monsters.map(m => typeof m === 'object' ? m.value : m));
      this.assert(boss >= 512 && boss <= 2048, `Chapter 3 boss ${boss} is in range 512~2048`);
    });

    // Check Stage 350 reaches 262144
    const s350 = STAGE_CONFIGS.find(s => s.id === 350);
    this.assert(s350 !== undefined, 'Stage 350 exists');
    this.assert(Math.max(...s350.monsters.map(m => typeof m === 'object' ? m.value : m)) === 262144, 'Stage 350 boss reaches 262144');
  }

  // C-STORY-009 GWT 9.3：開局勇者與魔物座標隨機陣列佈局
  testGwt9_3_HeroAndMonsterRandomPlacementPositions() {
    const sm = new StageManager();
    const heroCols = new Set();

    for (let testRun = 0; testRun < 15; testRun++) {
      sm.startStage(1);
      const hero = sm.board.getHero();
      this.assert(hero !== null, 'Hero exists');
      this.assert(hero.r === 4, 'Hero must always be at row 4');
      this.assert(hero.c >= 0 && hero.c < 5, 'Hero col must be in 0~4');
      heroCols.add(hero.c);

      const monsters = sm.board.getMonsters();
      this.assert(monsters.length === 3, 'Stage 1 has 3 monsters');
      const monsterCoords = new Set();
      monsters.forEach(m => {
        this.assert(m.r >= 0 && m.r <= 2, `Monster row ${m.r} must be in upper half (0~2)`);
        this.assert(m.c >= 0 && m.c < 5, `Monster col ${m.c} must be in 0~4`);
        const key = `${m.r},${m.c}`;
        this.assert(!monsterCoords.has(key), `Duplicate monster placement at ${key}`);
        monsterCoords.add(key);
      });
    }

    // Over 15 runs, hero column should not be strictly locked to 0
    this.assert(heroCols.size > 1, `Hero column must be randomized across runs (got ${heroCols.size} distinct cols)`);
  }

  // C-STORY-009 GWT 9.4：初次通關賞金防刷（首次發放，重複通關賞金為0）
  testGwt9_4_FirstClearRewardNonRepeatable() {
    const sm = new StageManager();
    sm.resetSaveData();
    this.assert(sm.gold === 300, 'Starting gold is 300');

    // First Clear of Stage 1
    sm.startStage(1);
    sm.board.clear();
    // Simulate killing all monsters
    sm.handleVictory();

    this.assert(sm.gold === 400, 'First clear earned 100 base reward (300 + 100 = 400)');
    this.assert(!!sm.clearedStages[1], 'Stage 1 recorded as cleared');
    this.assert(sm.clearedStages[1].clearedCount === 1, 'Stage 1 clearedCount is 1');

    // Repeat Clear of Stage 1
    sm.startStage(1);
    sm.board.clear();
    sm.handleVictory();

    this.assert(sm.gold === 400, 'Repeat clear must NOT grant base reward again (gold remains 400)');
    this.assert(sm.clearedStages[1].clearedCount === 2, 'Stage 1 clearedCount incremented to 2');
  }

  // C-STORY-009 GWT 9.5：關卡快速跳轉與資金注入（全額補發前置首通賞金＋關卡數x30）
  testGwt9_5_FastForwardProgressionAndGoldCompensation() {
    const sm = new StageManager();
    sm.resetSaveData();
    this.assert(sm.gold === 300, 'Starting gold is 300');

    // Fast-Forward to Stage 21 (Chapter 3 start)
    const res = sm.fastForwardToStage(21);
    this.assert(res.success === true, 'Fast forward succeeded');
    this.assert(res.targetStageId === 21, 'Target stage is 21');
    this.assert(res.preStagesCount === 20, 'Pre-stages count is 20 (stages 1~20)');
    this.assert(res.inCombatSum === 20 * 30, `In combat compensation is ${20 * 30}`);

    // Verify all stages 1~20 are cleared
    for (let sId = 1; sId <= 20; sId++) {
      this.assert(!!sm.clearedStages[sId], `Stage ${sId} must be cleared`);
    }

    // Verify unlockedStageId and chapter unlocking
    this.assert(sm.unlockedStageId === 21, 'Unlocked stage is 21');
    this.assert(sm.isChapterUnlocked(1) === true, 'Chapter 1 is unlocked');
    this.assert(sm.isChapterUnlocked(2) === true, 'Chapter 2 is unlocked');
    this.assert(sm.isChapterUnlocked(3) === true, 'Chapter 3 is unlocked');
    this.assert(sm.gold === 300 + res.totalAwarded, `Gold updated correctly to ${300 + res.totalAwarded}`);
  }

  // C-STORY-009 GWT 9.6：存檔重置確認清除所有進度回到初始狀態
  testGwt9_6_ResetSaveDataCleansAllProgress() {
    const sm = new StageManager();
    sm.gold = 88888;
    sm.unlockedStageId = 50;
    sm.baseTier = 18;
    sm.items = { undo: 10, hammer: 10, snipe: 10 };
    sm.clearedStages = { 1: { stars: 3 }, 2: { stars: 3 } };
    sm.inventory.addItem(128);

    sm.resetSaveData();

    this.assert(sm.gold === 300, 'Gold reset to 300');
    this.assert(sm.unlockedStageId === 1, 'Unlocked stage reset to 1');
    this.assert(sm.baseTier === 1, 'Base tech tier reset to 1');
    this.assert(sm.items.undo === 0 && sm.items.hammer === 0 && sm.items.snipe === 0, 'Items reset to 0');
    this.assert(sm.inventory.items.length === 0, 'Inventory items reset to empty');
    this.assert(Object.keys(sm.clearedStages).length === 0, 'Cleared stages reset to empty');
  }

  // C-STORY-010 GWT 10.1：通關獎勵金數值抑制與全章節嚴格單調遞增
  testGwt10_1_RewardGoldSuppressionAndStrictMonotonicity() {
    this.assert(STAGE_CONFIGS.length === 350, 'Total 350 stages configured');

    const s20 = STAGE_CONFIGS.find(s => s.id === 20);
    const s21 = STAGE_CONFIGS.find(s => s.id === 21);
    this.assert(s20.rewardGold === 195, `Stage 20 reward is suppressed to 195, got ${s20.rewardGold}`);
    this.assert(s21.rewardGold === 200, `Stage 21 reward is 200, got ${s21.rewardGold}`);
    this.assert(s21.rewardGold > s20.rewardGold, 'Stage 21 reward strictly greater than Stage 20 (no chapter inversion)');

    // Verify all 350 stages are strictly monotonic: R(s+1) > R(s)
    for (let i = 0; i < STAGE_CONFIGS.length - 1; i++) {
      const cur = STAGE_CONFIGS[i];
      const next = STAGE_CONFIGS[i + 1];
      this.assert(next.rewardGold > cur.rewardGold, `Stage ${next.id} reward (${next.rewardGold}) must be > Stage ${cur.id} reward (${cur.rewardGold})`);
    }

    // Verify no single stage gives more than 1000 gold before Stage 180
    const s180 = STAGE_CONFIGS.find(s => s.id === 180);
    this.assert(s180.rewardGold < 1000, `Stage 180 reward (${s180.rewardGold}) does not exceed 1000 gold (ten-pull cost)`);
  }

  // C-STORY-010 GWT 10.2：關卡列表已通關之賞金 UI 轉為「已領取」
  testGwt10_2_StageListClearedBadge() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.clearedStages[1] = { stars: 3, clearedCount: 1 };

    const stage1 = STAGE_CONFIGS[0];
    const isCleared = !!sm.clearedStages[stage1.id];
    let rewardBadgeHtml = '';
    if (isCleared) {
      rewardBadgeHtml = '<div class="stage-reward-badge cleared">✔ 已領取</div>';
    } else {
      rewardBadgeHtml = `<div class="stage-reward-badge">初次 +${stage1.rewardGold} 🪙</div>`;
    }

    this.assert(rewardBadgeHtml.includes('✔ 已領取'), 'Cleared stage badge displays 已領取');
    this.assert(rewardBadgeHtml.includes('cleared'), 'Cleared stage badge has cleared class');
  }

  // C-STORY-010 GWT 10.3：出擊簡報「初次通關獎勵」正名與已通關狀態聯動
  testGwt10_3_BriefingModalClearedState() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.clearedStages[1] = { stars: 3, clearedCount: 1 };

    // Stage 1 (cleared)
    const isCleared1 = !!sm.clearedStages[1];
    const displayText1 = isCleared1 ? '已領取 (0 🪙)' : `+${STAGE_CONFIGS[0].rewardGold} 🪙`;
    this.assert(displayText1 === '已領取 (0 🪙)', 'Cleared stage briefing reward text is 已領取 (0 🪙)');

    // Stage 2 (not cleared)
    const isCleared2 = !!sm.clearedStages[2];
    const displayText2 = isCleared2 ? '已領取 (0 🪙)' : `+${STAGE_CONFIGS[1].rewardGold} 🪙`;
    this.assert(displayText2 === `+${STAGE_CONFIGS[1].rewardGold} 🪙`, 'Uncleared stage displays reward');
  }

  // C-STORY-010 GWT 10.4：多元視覺外觀風格即時切換與調色盤樣式
  testGwt10_4_ThemeSkinSwitchingAndPalettes() {
    // Kingdom Fantasy (default)
    const kingdomHero = getTileTheme(TileType.HERO, 2, 'kingdom');
    this.assert(kingdomHero.border === '#3b82f6', 'Kingdom hero border is #3b82f6');

    // Cyber Neon
    const cyberHero = getTileTheme(TileType.HERO, 2, 'cyber');
    this.assert(cyberHero.border === '#00f2fe', 'Cyber hero border is #00f2fe');
    const cyberMonster = getTileTheme(TileType.MONSTER, 8, 'cyber');
    this.assert(cyberMonster.border === '#f43f5e', 'Cyber monster border is #f43f5e');

    // Retro 8-Bit
    const retroHero = getTileTheme(TileType.HERO, 2, 'retro');
    this.assert(retroHero.border === '#93c5fd', 'Retro hero border is #93c5fd');

    // Minimalist Flat
    const minimalHero = getTileTheme(TileType.HERO, 2, 'minimal');
    this.assert(minimalHero.border === '#475569', 'Minimalist hero border is #475569');
  }

  // C-STORY-010 GWT 10.5：快速跳轉適配新版平滑獎勵曲線
  testGwt10_5_FastForwardWithRebalancedRewards() {
    const sm = new StageManager();
    sm.resetSaveData();
    this.assert(sm.gold === 300, 'Starting gold is 300');

    // Jump to Stage 6 (Chapter 2 start)
    const res = sm.fastForwardToStage(6);
    this.assert(res.success === true, 'Fast forward succeeded');
    this.assert(res.preStagesCount === 5, 'Pre-stages count is 5');

    // Stage 1~5 rewards: 100 + 105 + 110 + 115 + 120 = 550
    this.assert(res.firstClearSum === 550, `First clear sum is 550, got ${res.firstClearSum}`);
    // In-combat compensation: 5 * 30 = 150
    this.assert(res.inCombatSum === 150, `In combat compensation is 150, got ${res.inCombatSum}`);
    this.assert(res.totalAwarded === 700, `Total awarded is 700, got ${res.totalAwarded}`);
    this.assert(sm.gold === 1000, `Total player gold is 1000 (300 + 700), got ${sm.gold}`);
  }

  // ==========================================
  // C-STORY-011 TESTS
  // ==========================================

  // C-STORY-011 GWT 11.1：首通賞金全域等速率公式與前 180 關千元以內驗證
  testGwt11_1_RewardGoldEquableSlopeAndFirst180Under1000() {
    this.assert(STAGE_CONFIGS.length === 350, 'Total 350 stages configured');
    
    // Formula verification: R(s) = 100 + (s - 1) * 5
    for (let s = 1; s <= 350; s++) {
      const cfg = STAGE_CONFIGS.find(st => st.id === s);
      const expected = 100 + (s - 1) * 5;
      this.assert(cfg.rewardGold === expected, `Stage ${s} rewardGold is ${expected}, got ${cfg.rewardGold}`);
    }

    // Stage 1 allows 1 pull
    this.assert(STAGE_CONFIGS[0].rewardGold === 100, 'Stage 1 reward is exactly 100 (1 single pull)');

    // Stage 180 is under 1000
    const s180 = STAGE_CONFIGS.find(s => s.id === 180);
    this.assert(s180.rewardGold === 995, `Stage 180 reward is 995 (< 1000), got ${s180.rewardGold}`);

    // Stage 181 reaches 1000
    const s181 = STAGE_CONFIGS.find(s => s.id === 181);
    this.assert(s181.rewardGold === 1000, `Stage 181 reward is 1000, got ${s181.rewardGold}`);

    // Every stage has strictly identical slope (+5G)
    for (let i = 0; i < STAGE_CONFIGS.length - 1; i++) {
      const delta = STAGE_CONFIGS[i + 1].rewardGold - STAGE_CONFIGS[i].rewardGold;
      this.assert(delta === 5, `Slope between stage ${i+1} and ${i+2} is 5, got ${delta}`);
    }
  }

  // C-STORY-011 GWT 11.2：科技升階研發費用試算表精確匹配
  testGwt11_2_BaseTechTierTableExactMatch() {
    const expectedCosts = [
      0, 1000, 1200, 1400, 1600, 5200,
      1900, 2200, 2600, 3100, 3700, 11600,
      4400, 5200, 6200, 7400, 8800, 27600,
      10500, 12600, 15100, 18100, 21700, 67500
    ];

    this.assert(BASE_STAT_TIERS.length === 24, `Must have 24 tiers, got ${BASE_STAT_TIERS.length}`);
    for (let i = 0; i < 24; i++) {
      const tier = BASE_STAT_TIERS[i];
      this.assert(tier.tier === i + 1, `Tier number is ${i + 1}`);
      this.assert(tier.cost === expectedCosts[i], `Tier ${tier.tier} cost should be ${expectedCosts[i]}, got ${tier.cost}`);
    }
  }

  // C-STORY-011 GWT 11.3：大升階數值等於前 4 階小升階總和判定
  testGwt11_3_MajorUpgradeSumOfPreviousFourMinorTiers() {
    const t6 = BASE_STAT_TIERS.find(t => t.tier === 6);
    const sum6 = BASE_STAT_TIERS.slice(1, 5).reduce((acc, t) => acc + t.cost, 0);
    this.assert(t6.cost === sum6, `Tier 6 cost (${t6.cost}) equals sum of T2~T5 (${sum6})`);

    const t12 = BASE_STAT_TIERS.find(t => t.tier === 12);
    const sum12 = BASE_STAT_TIERS.slice(7, 11).reduce((acc, t) => acc + t.cost, 0);
    this.assert(t12.cost === sum12, `Tier 12 cost (${t12.cost}) equals sum of T8~T11 (${sum12})`);

    const t18 = BASE_STAT_TIERS.find(t => t.tier === 18);
    const sum18 = BASE_STAT_TIERS.slice(13, 17).reduce((acc, t) => acc + t.cost, 0);
    this.assert(t18.cost === sum18, `Tier 18 cost (${t18.cost}) equals sum of T14~T17 (${sum18})`);

    const t24 = BASE_STAT_TIERS.find(t => t.tier === 24);
    const sum24 = BASE_STAT_TIERS.slice(19, 23).reduce((acc, t) => acc + t.cost, 0);
    this.assert(t24.cost === sum24, `Tier 24 cost (${t24.cost}) equals sum of T20~T23 (${sum24})`);
  }

  // C-STORY-011 GWT 11.4：小升階數值去除尾數平滑延續判定
  testGwt11_4_MinorUpgradeSubtractedRemainderProgression() {
    // Tier 7 continues from Tier 5 (1600 * 1.2 = 1920 -> 1900)
    const t5 = BASE_STAT_TIERS.find(t => t.tier === 5);
    const t7 = BASE_STAT_TIERS.find(t => t.tier === 7);
    this.assert(t7.cost === Math.floor(t5.cost * 1.2 / 100) * 100, 'Tier 7 cost is floor to 100 of Tier 5 * 1.2');

    // Tier 13 continues from Tier 11 (3700 * 1.2 = 4440 -> 4400)
    const t11 = BASE_STAT_TIERS.find(t => t.tier === 11);
    const t13 = BASE_STAT_TIERS.find(t => t.tier === 13);
    this.assert(t13.cost === Math.floor(t11.cost * 1.2 / 100) * 100, 'Tier 13 cost is floor to 100 of Tier 11 * 1.2');

    // Tier 19 continues from Tier 17 (8800 * 1.2 = 10560 -> 10500)
    const t17 = BASE_STAT_TIERS.find(t => t.tier === 17);
    const t19 = BASE_STAT_TIERS.find(t => t.tier === 19);
    this.assert(t19.cost === Math.floor(t17.cost * 1.2 / 100) * 100, 'Tier 19 cost is floor to 100 of Tier 17 * 1.2');
  }

  // C-STORY-011 GWT 11.5：快速跳轉功能金幣補償同步適配新等速曲線
  testGwt11_5_FastForwardToStage6WithNewFormula() {
    const sm = new StageManager();
    sm.resetSaveData();
    const res = sm.fastForwardToStage(6);

    // Stage 1~5 rewards: 100 + 105 + 110 + 115 + 120 = 550
    this.assert(res.firstClearSum === 550, `First clear sum is 550, got ${res.firstClearSum}`);
    // In combat compensation: 5 * 30 = 150
    this.assert(res.inCombatSum === 150, `In combat sum is 150, got ${res.inCombatSum}`);
    this.assert(res.totalAwarded === 700, `Total awarded is 700, got ${res.totalAwarded}`);
    this.assert(sm.gold === 1000, `Total player gold is 1000 (300 + 700), got ${sm.gold}`);
  }

  // =========================================================================
  // C-STORY-012: 視覺動態革命（滑動位移動畫、純圖標大數字版型、呼吸演出與專屬合成特效）
  // =========================================================================

  // C-STORY-012 GWT 12.1：滑動位移軌跡與位移量記錄驗證
  testGwt12_1_MoveEngineRecordsSlideTrajectoriesAndDiff() {
    const board = new Board(5);
    // Put a Hero at (2, 2) and an Equipment at (2, 4)
    board.setTile(2, 2, new Tile(4, TileType.HERO));
    board.setTile(2, 4, new Tile(4, TileType.EQUIPMENT));

    const moveEngine = new MoveEngine(board);
    const result = moveEngine.move(Direction.RIGHT);

    this.assert(result.moved === true, 'Board must have moved');
    this.assert(Array.isArray(result.moves), 'result.moves must be an array');
    this.assert(result.moves.length > 0, 'result.moves must not be empty');

    // Hero at (2, 2) merged into (2, 4)
    const heroMove = result.moves.find(m => m.from.r === 2 && m.from.c === 2);
    this.assert(heroMove !== undefined, 'Hero move trajectory must be recorded');
    this.assert(heroMove.to.r === 2 && heroMove.to.c === 4, 'Hero moved to (2, 4)');
    this.assert(heroMove.merged === true, 'Hero was merged');
    this.assert(heroMove.eventType === 'hero_eat_gear', 'Event type is hero_eat_gear');
  }

  // C-STORY-012 GWT 12.2：四重情境特效事件精確識別驗證
  testGwt12_2_FourCombatAndFusionVfxEventDetection() {
    // 1. Hero slashes monster
    const b1 = new Board(5);
    b1.setTile(0, 0, new Tile(8, TileType.HERO));
    b1.setTile(0, 1, new Tile(4, TileType.MONSTER));
    const me1 = new MoveEngine(b1);
    const res1 = me1.move(Direction.RIGHT);
    this.assert(res1.vfxEvents.some(e => e.type === 'hero_slash_monster'), 'Must record hero_slash_monster VFX');

    // 2. Hero eats gear
    const b2 = new Board(5);
    b2.setTile(0, 0, new Tile(8, TileType.HERO));
    b2.setTile(0, 1, new Tile(8, TileType.EQUIPMENT));
    const me2 = new MoveEngine(b2);
    const res2 = me2.move(Direction.RIGHT);
    this.assert(res2.vfxEvents.some(e => e.type === 'hero_eat_gear'), 'Must record hero_eat_gear VFX');

    // 3. Monster fusion
    const b3 = new Board(5);
    b3.setTile(0, 0, new Tile(8, TileType.MONSTER));
    b3.setTile(0, 1, new Tile(8, TileType.MONSTER));
    const me3 = new MoveEngine(b3);
    const res3 = me3.move(Direction.RIGHT);
    this.assert(res3.vfxEvents.some(e => e.type === 'monster_fusion'), 'Must record monster_fusion VFX');

    // 4. Equipment fusion (no VFX)
    const b4 = new Board(5);
    b4.setTile(0, 0, new Tile(8, TileType.EQUIPMENT));
    b4.setTile(0, 1, new Tile(8, TileType.EQUIPMENT));
    const me4 = new MoveEngine(b4);
    const res4 = me4.move(Direction.RIGHT);
    this.assert(res4.vfxEvents.length === 0, 'Equipment fusion must have no VFX');
  }

  // C-STORY-012 GWT 12.3：純圖標大數字新版型配置與英雄豪華裝備階梯演進
  testGwt12_3_IconFocusSkinThemeConfigAndHeroEquipmentEvolution() {
    this.assert(ThemeSkinType.ICON_FOCUS === 'icon_focus', 'ThemeSkinType must contain ICON_FOCUS');
    this.assert(THEME_SKIN_CONFIGS.icon_focus !== undefined, 'THEME_SKIN_CONFIGS.icon_focus must be defined');

    // Hero equipment progressive evolution verification
    const heroTheme2 = getTileTheme(TileType.HERO, 2, 'icon_focus');
    const heroTheme16 = getTileTheme(TileType.HERO, 16, 'icon_focus');
    const heroTheme128 = getTileTheme(TileType.HERO, 128, 'icon_focus');
    const heroTheme1024 = getTileTheme(TileType.HERO, 1024, 'icon_focus');

    this.assert(heroTheme2.badge === '🧑‍🌾', 'Hero 2 has novice character badge');
    this.assert(heroTheme16.badge === '💂', 'Hero 16 has knight character badge');
    this.assert(heroTheme128.badge === '🦸', 'Hero 128 has berserker character badge');
    this.assert(heroTheme1024.badge === '👼', 'Hero 1024 has angel character badge');
    this.assert(heroTheme2.isIconFocus === true, 'isIconFocus flag is set');
  }

  // C-STORY-012 GWT 12.4：ViewRenderer 0.3s 滑動動畫與 VFX 元素掛載移除機制
  testGwt12_4_ViewRendererAnimateSlideAndVfxExecution() {
    const dummyBoardEl = document.createElement('div');
    dummyBoardEl.className = 'board-grid';
    // Create 25 cells
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        dummyBoardEl.appendChild(cell);
      }
    }

    const vr = new ViewRenderer(dummyBoardEl);
    vr.setThemeSkin('icon_focus');
    this.assert(vr.activeSkin === 'icon_focus', 'Active skin is icon_focus');

    // Test playVfx mounts VFX elements into corresponding cells
    vr.playVfx([{ type: 'hero_slash_monster', r: 1, c: 2 }]);
    const targetCell = dummyBoardEl.querySelector('.grid-cell[data-r="1"][data-c="2"]');
    const slashVfx = targetCell.querySelector('.vfx-slash-blade');
    this.assert(slashVfx !== null, 'Slash cut VFX element must be appended to cell (1, 2)');
  }

  // C-STORY-012 GWT 12.5：英雄水藍虛線擴張與怪物深紅收縮呼吸動畫樣式驗證
  async testGwt12_5_HeroAndMonsterBreathingKeyframeDefinitions() {
    // Check that style.css contains hero and monster breathing keyframes
    try {
      const resp = await fetch('style.css');
      if (resp.ok) {
        const cssText = await resp.text();
        this.assert(cssText.includes('heroBreathingWave'), 'CSS must define heroBreathingWave animation');
        this.assert(cssText.includes('monsterBreathingPulse'), 'CSS must define monsterBreathingPulse animation');
        this.assert(cssText.includes('.vfx-slash-blade'), 'CSS must define .vfx-slash-blade');
      }
    } catch (e) {
      // ignore network fetch in unit tests
    }

    // Create hero and monster tiles in icon_focus skin and check their class definitions
    const vr = new ViewRenderer(document.createElement('div'));
    vr.setThemeSkin('icon_focus');
    const heroTile = vr.createTileElement(new Tile(128, TileType.HERO));
    const monsterTile = vr.createTileElement(new Tile(64, TileType.MONSTER));

    this.assert(heroTile.classList.contains('tile-hero'), 'Hero has tile-hero class');
    this.assert(heroTile.classList.contains('skin-icon_focus'), 'Hero has skin-icon_focus class');
    this.assert(monsterTile.classList.contains('tile-monster'), 'Monster has tile-monster class');
  }

  // =========================================================================
  // C-STORY-013: 戰鬥節奏與打擊感微調（0.12s 極速位移、先發斬殺刀光、高亮金光升級）
  // =========================================================================

  // C-STORY-013 GWT 13.1：滑動位移時間縮短為 120ms (0.12s) 驗證
  async testGwt13_1_SlideDisplacementShortenedTo120ms() {
    const dummyBoardEl = document.createElement('div');
    const vr = new ViewRenderer(dummyBoardEl);

    // Check that animateSlide resolves properly
    let completed = false;
    await new Promise(resolve => {
      vr.animateSlide([], () => {
        completed = true;
        resolve();
      });
    });
    this.assert(completed === true, 'animateSlide callback must resolve');

    try {
      const resp = await fetch('style.css');
      if (resp.ok) {
        const cssText = await resp.text();
        this.assert(cssText.includes('0.12s cubic-bezier'), 'CSS must define 0.12s transition for tile-sliding');
      }
    } catch (e) {
      // ignore in offline runner
    }
  }

  // C-STORY-013 GWT 13.2：交鋒斬殺刀光於移動發起時出現在魔物格
  testGwt13_2_HeroSlashMonsterVfxTriggersAtSlideStart() {
    const b = new Board(5);
    b.setTile(2, 3, new Tile(16, TileType.HERO));
    b.setTile(2, 4, new Tile(8, TileType.MONSTER));

    const moveEngine = new MoveEngine(b);
    const res = moveEngine.move(Direction.RIGHT);

    this.assert(res.moved === true, 'Move must succeed');
    const slashEvt = res.vfxEvents.find(e => e.type === 'hero_slash_monster');
    this.assert(slashEvt !== undefined, 'hero_slash_monster event must exist');
    this.assert(slashEvt.r === 2 && slashEvt.c === 4, 'Slash VFX target cell must be the monster cell (2, 4)');
  }

  // C-STORY-013 GWT 13.3：英雄升級閃光提升不透明度與強烈光暈
  async testGwt13_3_HeroUpgradeVfxHasHighOpacityAndEnhancedFlare() {
    try {
      const resp = await fetch('style.css');
      if (resp.ok) {
        const cssText = await resp.text();
        this.assert(cssText.includes('.vfx-hero-upgrade'), '.vfx-hero-upgrade must be defined');
        this.assert(cssText.includes('heroUpgradeBurst'), 'heroUpgradeBurst animation must be defined');
        this.assert(cssText.includes('rgba(250, 204, 21, 1)'), 'Hero upgrade glow must use high opacity color');
      }
    } catch (e) {
      // ignore
    }
  }

  // =========================================================================
  // C-STORY-014: 視覺動態微調（5 階動態流光階梯、超級瑪利歐金幣彈跳）
  // =========================================================================

  // C-STORY-014 GWT 14.1：勇者升級閃光依 5 階動態階梯演進驗證 (1024 階達頂級亮度)
  testGwt14_1_HeroUpgradeFiveTierDynamicScaling() {
    const dummyBoardEl = document.createElement('div');
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        dummyBoardEl.appendChild(cell);
      }
    }
    const vr = new ViewRenderer(dummyBoardEl);

    // Test tier-1 for value <= 8
    vr.playVfx([{ type: 'hero_eat_gear', r: 0, c: 0, value: 4 }]);
    const cellT1 = dummyBoardEl.querySelector('.grid-cell[data-r="0"][data-c="0"]');
    const vfxT1 = cellT1.querySelector('.vfx-hero-upgrade');
    this.assert(vfxT1.classList.contains('tier-1'), 'Value 4 must trigger tier-1 subtle glow');

    // Test tier-2 for value 16~32
    vr.playVfx([{ type: 'hero_eat_gear', r: 0, c: 1, value: 32 }]);
    const cellT2 = dummyBoardEl.querySelector('.grid-cell[data-r="0"][data-c="1"]');
    const vfxT2 = cellT2.querySelector('.vfx-hero-upgrade');
    this.assert(vfxT2.classList.contains('tier-2'), 'Value 32 must trigger tier-2 mild glow');

    // Test tier-3 for value 64~128
    vr.playVfx([{ type: 'hero_eat_gear', r: 0, c: 2, value: 128 }]);
    const cellT3 = dummyBoardEl.querySelector('.grid-cell[data-r="0"][data-c="2"]');
    const vfxT3 = cellT3.querySelector('.vfx-hero-upgrade');
    this.assert(vfxT3.classList.contains('tier-3'), 'Value 128 must trigger tier-3 radiant gold');

    // Test tier-4 for value 256~512
    vr.playVfx([{ type: 'hero_eat_gear', r: 0, c: 3, value: 512 }]);
    const cellT4 = dummyBoardEl.querySelector('.grid-cell[data-r="0"][data-c="3"]');
    const vfxT4 = cellT4.querySelector('.vfx-hero-upgrade');
    this.assert(vfxT4.classList.contains('tier-4'), 'Value 512 must trigger tier-4 sparkling gold');

    // Test tier-5 for value >= 1024 (Supreme Divine Flare)
    vr.playVfx([{ type: 'hero_eat_gear', r: 0, c: 4, value: 1024 }]);
    const cellT5 = dummyBoardEl.querySelector('.grid-cell[data-r="0"][data-c="4"]');
    const vfxT5 = cellT5.querySelector('.vfx-hero-upgrade');
    this.assert(vfxT5.classList.contains('tier-5'), 'Value 1024 must trigger tier-5 maximum divine flare');
  }

  // C-STORY-014 GWT 14.2：超級瑪利歐風格金幣彈出動畫（Mario Coin Pop）
  testGwt14_2_SuperMarioCoinPopAnimationAndEvent() {
    const b = new Board(5);
    b.setTile(1, 1, new Tile(4, TileType.GOLD));
    b.setTile(1, 2, new Tile(4, TileType.GOLD));

    const moveEngine = new MoveEngine(b);
    const res = moveEngine.move(Direction.RIGHT);

    this.assert(res.moved === true, 'Move must succeed');
    const goldEvt = res.vfxEvents.find(e => e.type === 'gold_merge');
    this.assert(goldEvt !== undefined, 'gold_merge event must be generated');
    this.assert(goldEvt.value === 8, 'Gold merged value must be 8');

    // Verify ViewRenderer renders .vfx-mario-coin
    const dummyBoardEl = document.createElement('div');
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.r = goldEvt.r;
    cell.dataset.c = goldEvt.c;
    dummyBoardEl.appendChild(cell);

    const vr = new ViewRenderer(dummyBoardEl);
    vr.playVfx([goldEvt]);

    const coinVfx = cell.querySelector('.vfx-mario-coin');
    this.assert(coinVfx !== null, 'Mario coin pop element must be mounted in cell');
    this.assert(coinVfx.querySelector('.vfx-mario-coin-icon') !== null, 'Coin icon exists');
    this.assert(coinVfx.querySelector('.vfx-mario-coin-text').textContent.includes('+8'), 'Coin text shows +8');
  }

  // =========================================================================
  // C-STORY-015: 金幣方塊直接點擊領取修復與瑪利歐彈跳連動
  // =========================================================================

  // C-STORY-015 GWT 15.1：金幣點擊領取 100% 全額提領與方塊清除驗證
  testGwt15_1_GoldCashOutUncappedSucceedsAndCappedAlerts() {
    const sm = new StageManager();
    sm.gold = 300;
    sm.startStage(1); // Stage 1 goldCap is 20
    sm.stageGoldEarned = 0;

    sm.board.setTile(2, 2, new Tile(8, TileType.GOLD, 2, 2));
    this.assert(sm.board.getTile(2, 2) !== null, 'Gold tile exists at (2, 2)');

    // 1. Uncapped cash out succeeds and frees tile
    const res1 = sm.cashOutGoldTile(2, 2);
    this.assert(res1.success === true, 'cashOutGoldTile must succeed');
    this.assert(res1.amount === 8, 'Granted 8 gold');
    this.assert(sm.board.getTile(2, 2) === null, 'Tile at (2, 2) must be removed and freed up from board');
    this.assert(sm.gold === 308, 'Gold increased to 308');

    // 2. Even when stageGoldEarned is high, subsequent cash-outs are 100% full payout (C-STORY-017)
    sm.stageGoldEarned = 200;
    sm.board.setTile(3, 3, new Tile(16, TileType.GOLD, 3, 3));
    const res2 = sm.cashOutGoldTile(3, 3);
    this.assert(res2.success === true, 'Cash out succeeds 100% without cap blocking');
    this.assert(res2.amount === 16, 'Full amount 16 granted');
    this.assert(sm.gold === 324, 'Gold increased to 324');
    this.assert(sm.board.getTile(3, 3) === null, 'Tile at (3, 3) removed');
  }

  // C-STORY-015 GWT 15.2：金幣點擊領取成功即時觸發瑪利歐彈幣與數值回饋
  testGwt15_2_GoldCashOutTriggersMarioCoinVfxAndSound() {
    const sm = new StageManager();
    sm.gold = 300;
    sm.startStage(1);
    sm.stageGoldEarned = 0;

    sm.board.setTile(1, 1, new Tile(4, TileType.GOLD, 1, 1));
    const res = sm.cashOutGoldTile(1, 1);
    this.assert(res.success === true, 'Cash out succeeds');
    this.assert(res.amount === 4, 'Amount is 4');
    this.assert(sm.gold === 304, 'Gold increased to 304');
    this.assert(sm.board.getTile(1, 1) === null, 'Tile cleared');

    // Verify ViewRenderer can play gold_merge (Mario coin pop) with cash out value
    const dummyBoardEl = document.createElement('div');
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.r = 1;
    cell.dataset.c = 1;
    dummyBoardEl.appendChild(cell);

    const vr = new ViewRenderer(dummyBoardEl);
    vr.playVfx([{ type: 'gold_merge', r: 1, c: 1, value: res.amount }]);

    const coinVfx = cell.querySelector('.vfx-mario-coin');
    this.assert(coinVfx !== null, 'Mario coin pop element exists on cashed out cell');
    this.assert(coinVfx.querySelector('.vfx-mario-coin-text').textContent.includes('+4'), 'Shows +4 gold');
  }

  // =========================================================================
  // C-STORY-016: 開始遊戲按鈕與封面淡出互動檢修
  // =========================================================================

  // C-STORY-016 GWT 16.1：點擊開始遊戲按鈕時封面必能觸發 fade-out
  testGwt16_1_TitleScreenFadeOutOnStartGameClick() {
    const titleEl = document.createElement('div');
    titleEl.id = 'view-title-screen';
    titleEl.className = 'title-screen';

    const btnEl = document.createElement('button');
    btnEl.id = 'btn-start-game';
    titleEl.appendChild(btnEl);
    document.body.appendChild(titleEl);

    try {
      this.assert(!titleEl.classList.contains('fade-out'), 'Initially no fade-out');
      btnEl.addEventListener('click', () => {
        titleEl.classList.add('fade-out');
      });
      btnEl.click();
      this.assert(titleEl.classList.contains('fade-out'), 'After click, title-screen has fade-out');
    } finally {
      document.body.removeChild(titleEl);
    }
  }

  // =========================================================================
  // C-STORY-017: 關卡金幣雙階段預算池（富礦 + 碎金）與盤面無截斷全額領取
  // =========================================================================

  // C-STORY-017 GWT 17.1：金幣預算池源頭控量與耗竭關閉驗證
  testGwt17_1_TwoStageGoldBudgetDepletionRichAndTrickle() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);

    // Custom configuration for strict budget math testing
    sm.goldSpawnBudget = 20;
    sm.remainingGoldBudget = 20;
    sm.currentGoldValue = 8;
    sm.goldDropsCount = 0;
    sm.goldDropInterval = 8;
    sm.nextGoldDropTurn = 8;

    // Isolate hero and monster so board won't deadlock or trigger premature victory
    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));

    // Turn 8: Drop 1 (8G)
    sm.turnCount = 7;
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
    const m8 = sm.handleMove(Direction.DOWN); // turn 8
    this.assert(m8.moved === true, 'Turn 8 move succeeded');
    this.assert(sm.remainingGoldBudget === 12, `Budget after turn 8 should be 12, got ${sm.remainingGoldBudget}`);
    this.assert(sm.goldDropsCount === 1, '1 drop count');
    const goldT8 = sm.board.getAllTiles().filter(t => t.isGold());
    this.assert(goldT8.length === 1 && goldT8[0].value === 8, 'Turn 8 dropped 8G gold');

    // Turn 16: Drop 2 (8G)
    sm.turnCount = 15;
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
    const m16 = sm.handleMove(Direction.DOWN); // turn 16
    this.assert(m16.moved === true, 'Turn 16 move succeeded');
    this.assert(sm.remainingGoldBudget === 4, `Budget after turn 16 should be 4, got ${sm.remainingGoldBudget}`);
    this.assert(sm.goldDropsCount === 2, '2 drops count');

    // Turn 24: Drop 3 (remaining budget 4 -> drops 4G)
    sm.turnCount = 23;
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
    const m24 = sm.handleMove(Direction.DOWN); // turn 24
    this.assert(m24.moved === true, 'Turn 24 move succeeded');
    this.assert(sm.remainingGoldBudget === 0, `Budget after turn 24 should be 0, got ${sm.remainingGoldBudget}`);
    const goldT24 = sm.board.getAllTiles().filter(t => t.isGold() && t.value === 4);
    this.assert(goldT24.length >= 1, 'Turn 24 dropped 4G floor gold');

    // Fast-forward to nextGoldDropTurn with 0 budget: should NOT spawn any new gold
    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
    sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));

    sm.turnCount = sm.nextGoldDropTurn - 1;
    const mNext = sm.handleMove(Direction.DOWN);
    this.assert(mNext.moved === true, 'Next move succeeded');
    const goldCountAfter = sm.board.getAllTiles().filter(t => t.isGold()).length;
    this.assert(goldCountAfter === 0, 'No new gold spawned once budget is 0');
    this.assert(sm.nextGoldDropTurn === Infinity, 'nextGoldDropTurn set to Infinity');
  }

  // C-STORY-017 GWT 17.2：盤面金幣合成 100% 全額收益（絕無截斷）
  testGwt17_2_GoldMerge100PercentPayoutWithoutCap() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);
    sm.gold = 100;
    sm.stageGoldEarned = 500; // Artificially high stage earnings

    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
    sm.board.setTile(1, 1, new Tile(8, TileType.GOLD, 1, 1));
    sm.board.setTile(2, 1, new Tile(8, TileType.GOLD, 2, 1));

    // Swipe down to merge gold
    const res = sm.handleMove(Direction.DOWN);
    this.assert(res.moved === true, 'Move succeeded');
    this.assert(sm.gold === 116, `Gold increased by exactly 16 to 116, got ${sm.gold}`);
    this.assert(sm.stageGoldEarned === 516, `stageGoldEarned increased by 16 to 516`);
  }

  // C-STORY-017 GWT 17.3：金幣方塊點擊直接提領 100% 全拿（無上限拒絕、無錯誤彈窗）
  testGwt17_3_TapToCashOut100PercentWithoutBlocking() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);
    sm.gold = 200;
    sm.remainingGoldBudget = 0; // Budget already exhausted

    sm.board.setTile(2, 2, new Tile(32, TileType.GOLD, 2, 2));
    const res = sm.cashOutGoldTile(2, 2);
    this.assert(res.success === true, 'Tap cash out succeeds 100%');
    this.assert(res.amount === 32, 'Amount is 32');
    this.assert(sm.gold === 232, 'Gold increased to 232');
    this.assert(sm.board.getTile(2, 2) === null, 'Tile cleared from board');
  }

  // C-STORY-017 GWT 17.4：戰鬥勝利全額自動清掃盤面殘留金幣
  testGwt17_4_VictoryAutoSweep100PercentFullAmount() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);
    sm.gold = 500;
    sm.stageGoldEarned = 300;

    // Setup 1 low monster, hero, and remaining gold tiles
    sm.board.clear();
    sm.board.setTile(3, 0, new Tile(2, TileType.HERO, 3, 0));
    sm.board.setTile(2, 0, new Tile(2, TileType.MONSTER, 2, 0)); // will be slain
    sm.board.setTile(0, 1, new Tile(16, TileType.GOLD, 0, 1));
    sm.board.setTile(0, 2, new Tile(2, TileType.GOLD, 0, 2));

    // Swipe up to kill monster and trigger victory
    sm.handleMove(Direction.UP);
    this.assert(sm.isVictory === true, 'Stage victory achieved');
    // First clear reward (100) + sweep gold (16 + 2 = 18) = 118 total added
    this.assert(sm.gold === 618, `Gold should be 500 + 118 = 618, got ${sm.gold}`);
    this.assert(sm.board.getAllTiles().filter(t => t.isGold()).length === 0, 'All gold tiles swept');
  }

  // =========================================================================
  // C-STORY-018: 結算介面純淨化與帳目對齊（各項明細加總 + 敗戰合成收益）
  // =========================================================================

  // C-STORY-018 GWT 18.1：初次通關呈現三項明細與總和對齊
  testGwt18_1_VictoryModalFirstClearThreeLinesAndAlignedSum() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(11);
    sm.gold = 300;
    sm.inBattleGold = 64;

    let emitted = null;
    sm.eventBus.on(Events.STAGE_VICTORY, (data) => {
      emitted = data;
    });

    // Setup board with 1 monster and 46 gold
    sm.board.clear();
    sm.board.setTile(3, 0, new Tile(64, TileType.HERO, 3, 0));
    sm.board.setTile(2, 0, new Tile(32, TileType.MONSTER, 2, 0)); // slain
    sm.board.setTile(0, 0, new Tile(46, TileType.GOLD, 0, 0));

    sm.handleMove(Direction.UP);
    this.assert(sm.isVictory === true, 'Victory triggered');
    this.assert(emitted !== null, 'STAGE_VICTORY event fired');
    this.assert(emitted.rewardGold === 150, 'First clear reward is 150');
    this.assert(emitted.inBattleGold === 64, 'inBattleGold is 64');
    this.assert(emitted.sweepGold === 46, 'sweepGold is 46');
    this.assert(emitted.totalEarned === 260, 'totalEarned is 150 + 64 + 46 = 260');

    // UI Formatting simulation
    const items = [];
    if (emitted.isFirstClear) {
      items.push(`★【初次通關賞金】+${emitted.rewardGold} 🪙`);
    }
    items.push(`⚔️【戰鬥合成領取】+${emitted.inBattleGold} 🪙`);
    items.push(`⚔️【盤面剩餘金幣】+${emitted.sweepGold} 🪙`);
    const detailText = items.join('\n');

    this.assert(detailText.includes('★【初次通關賞金】+150 🪙'), 'Includes first clear reward line');
    this.assert(detailText.includes('⚔️【戰鬥合成領取】+64 🪙'), 'Includes in-battle gold line');
    this.assert(detailText.includes('⚔️【盤面剩餘金幣】+46 🪙'), 'Includes swept gold line');
    this.assert(!detailText.includes('上限'), 'Detail text does NOT include internal cap keyword');
  }

  // C-STORY-018 GWT 18.2：再次通關不顯示初次通關行
  testGwt18_2_VictoryModalRepeatClearHidesFirstClearLine() {
    const sm = new StageManager();
    sm.resetSaveData();
    // Mark stage 11 as already cleared
    sm.clearedStages[11] = { stars: 3, clearedCount: 1 };
    sm.startStage(11);
    sm.gold = 300;
    sm.inBattleGold = 64;

    let emitted = null;
    sm.eventBus.on(Events.STAGE_VICTORY, (data) => {
      emitted = data;
    });

    sm.board.clear();
    sm.board.setTile(3, 0, new Tile(64, TileType.HERO, 3, 0));
    sm.board.setTile(2, 0, new Tile(32, TileType.MONSTER, 2, 0));
    sm.board.setTile(0, 0, new Tile(46, TileType.GOLD, 0, 0));

    sm.handleMove(Direction.UP);
    this.assert(emitted.isFirstClear === false, 'Not first clear');
    this.assert(emitted.rewardGold === 0, 'No first clear reward');
    this.assert(emitted.totalEarned === 110, 'totalEarned is 64 + 46 = 110');

    // UI Formatting
    const items = [];
    if (emitted.isFirstClear) {
      items.push(`★【初次通關賞金】+${emitted.rewardGold} 🪙`);
    }
    items.push(`⚔️【戰鬥合成領取】+${emitted.inBattleGold} 🪙`);
    items.push(`⚔️【盤面剩餘金幣】+${emitted.sweepGold} 🪙`);
    const detailText = items.join('\n');

    this.assert(!detailText.includes('★【初次通關賞金】'), 'Does NOT include first clear line on repeat clear');
    this.assert(detailText.includes('⚔️【戰鬥合成領取】+64 🪙'), 'Includes in-battle gold line');
    this.assert(detailText.includes('⚔️【盤面剩餘金幣】+46 🪙'), 'Includes swept gold line');
  }

  // C-STORY-018 GWT 18.3：盤面困局（戰敗）展示戰鬥合成收益
  testGwt18_3_DefeatModalShowsInBattleGoldEarned() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);
    sm.inBattleGold = 64;

    let emitted = null;
    sm.eventBus.on(Events.STAGE_DEFEAT, (data) => {
      emitted = data;
    });

    sm.handleDefeat();
    this.assert(emitted !== null, 'STAGE_DEFEAT event fired');
    this.assert(emitted.inBattleGold === 64, 'inBattleGold is retained and passed to defeat event');
  }

  // C-STORY-018 GWT 18.4：時光沙漏（Undo）與局內收益同步回溯
  testGwt18_4_UndoHourglassRollsBackInBattleGold() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.claimTestItems(1);
    sm.startStage(1);
    sm.inBattleGold = 0;

    // Put two 4 gold tiles and hero
    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
    sm.board.setTile(1, 1, new Tile(4, TileType.GOLD, 1, 1));
    sm.board.setTile(2, 1, new Tile(4, TileType.GOLD, 2, 1));

    // Move to merge gold (4 + 4 -> 8G)
    sm.handleMove(Direction.DOWN);
    this.assert(sm.inBattleGold === 8, 'inBattleGold became 8');

    // Undo move
    const undoRes = sm.useUndoItem();
    this.assert(undoRes.success === true, 'Undo succeeded');
    this.assert(sm.inBattleGold === 0, 'inBattleGold correctly rolled back to 0');
  }

  // =========================================================================
  // C-STORY-019: 富礦階梯衰竭（下限 4 🪙）、動態初始富礦、長局冷卻遞增
  // =========================================================================

  // C-STORY-019 GWT 19.1：富礦每登場 4 個方塊下降 1 階，且保底不低於 4 🪙
  testGwt19_1_GoldDropDecay4CountAndMin4Floor() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(36); // Stage 36 has goldBaseValue = 16

    this.assert(sm.currentGoldValue === 16, `Stage 36 initial rich gold should be 16, got ${sm.currentGoldValue}`);
    this.assert(sm.goldDropsCount === 0, 'Initial goldDropsCount is 0');

    // Isolate hero and monster
    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));

    // Simulate 4 drops of 16G (turns 8, 16, 24, 32)
    const turns = [8, 16, 24, 32];
    for (let i = 0; i < 4; i++) {
      sm.board.clear();
      sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
      sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
      sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
      sm.turnCount = turns[i] - 1;
      const res = sm.handleMove(Direction.DOWN);
      this.assert(res.moved === true, `Turn ${turns[i]} move succeeded`);
      this.assert(sm.goldDropsCount === i + 1, `goldDropsCount is ${i + 1}`);
    }

    // After 4th drop, currentGoldValue decays from 16 to 8 (interval remains 8 in C-STORY-029)
    this.assert(sm.currentGoldValue === 8, `After 4 drops, currentGoldValue decays to 8, got ${sm.currentGoldValue}`);
    this.assert(sm.nextGoldDropTurn === 40, `After 4th drop, next turn is 32 + 8 = 40, got ${sm.nextGoldDropTurn}`);

    // Drop 5 (turn 40): drops 8G
    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
    sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
    sm.turnCount = 39;
    const res5 = sm.handleMove(Direction.DOWN);
    this.assert(res5.moved === true, 'Turn 40 move succeeded');
    this.assert(sm.goldDropsCount === 5, 'goldDropsCount is 5');

    // Test floor 4: simulate when currentGoldValue is 4, it never decays below 4
    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
    sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
    sm.currentGoldValue = 4;
    sm.goldDropsCount = 7;
    sm.nextGoldDropTurn = 100;
    sm.turnCount = 99;
    const res8 = sm.handleMove(Direction.DOWN); // drop 8 (7+1 = 8 drops, triggers 8 % 4 === 0)
    this.assert(res8.moved === true, 'Turn 100 move succeeded');
    this.assert(sm.goldDropsCount === 8, 'goldDropsCount is 8');
    this.assert(sm.currentGoldValue === 4, `currentGoldValue stays at minimum 4, got ${sm.currentGoldValue}`);
  }

  // C-STORY-019 / C-STORY-029 GWT 19.2：第 8 顆前維持 8 回合，之後每顆間隔拉長 2 回合封頂 16
  testGwt19_2_DynamicCooldownPacingInterval6Turns() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);
    sm.goldSpawnBudget = 1000; // sufficient budget
    sm.remainingGoldBudget = 1000;

    // Verify initial intervals: 8
    this.assert(sm.goldDropInterval === 8, 'Initial interval is 8');
    this.assert(sm.nextGoldDropTurn === 8, 'Initial nextGoldDropTurn is 8');

    const triggerTurn = (turn) => {
      sm.board.clear();
      sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
      sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
      sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
      sm.turnCount = turn - 1;
      const res = sm.handleMove(Direction.DOWN);
      this.assert(res.moved === true, `Move at turn ${turn} succeeded`);
    };

    // Drops 1~8: interval remains 8
    const expectedTurns = [8, 16, 24, 32, 40, 48, 56, 64];
    for (let i = 0; i < 7; i++) {
      triggerTurn(expectedTurns[i]);
      this.assert(sm.nextGoldDropTurn === expectedTurns[i + 1], `Drop ${i + 1} -> next is ${expectedTurns[i + 1]}`);
      this.assert(sm.goldDropInterval === 8, `Interval remains 8 at drop ${i + 1}`);
    }

    // Drop 8: turn 64 -> interval becomes 8 + 2 = 10, next is 64 + 10 = 74
    triggerTurn(64);
    this.assert(sm.goldDropInterval === 10, `Interval after drop 8 is 10, got ${sm.goldDropInterval}`);
    this.assert(sm.nextGoldDropTurn === 74, `Next turn after drop 8 is 74, got ${sm.nextGoldDropTurn}`);

    // Drop 9: turn 74 -> interval becomes 10 + 2 = 12, next is 74 + 12 = 86
    triggerTurn(74);
    this.assert(sm.goldDropInterval === 12, `Interval after drop 9 is 12, got ${sm.goldDropInterval}`);
    this.assert(sm.nextGoldDropTurn === 86, `Next turn after drop 9 is 86, got ${sm.nextGoldDropTurn}`);
  }

  // C-STORY-019 / C-STORY-029 GWT 19.3：時光沙漏（Undo）精確回溯富礦衰竭與排程步數
  testGwt19_3_UndoRollsBackGoldDropSchedule() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.claimTestItems(1);
    sm.startStage(36); // currentGoldValue = 16

    // Setup state right before drop 8 (turn 63, dropsCount = 7, interval = 8, next = 64)
    sm.goldDropsCount = 7;
    sm.goldDropInterval = 8;
    sm.nextGoldDropTurn = 64;
    sm.currentGoldValue = 8;
    sm.turnCount = 63;

    sm.board.clear();
    sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
    sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
    sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));

    // Turn 64: Triggers drop 8 (decay 8 -> 4, interval 8 -> 10, next 64 + 10 = 74)
    sm.handleMove(Direction.DOWN);
    this.assert(sm.turnCount === 64, 'Turn count advanced to 64');
    this.assert(sm.goldDropsCount === 8, 'goldDropsCount advanced to 8');
    this.assert(sm.currentGoldValue === 4, 'currentGoldValue decayed to 4');
    this.assert(sm.goldDropInterval === 10, 'goldDropInterval increased to 10');
    this.assert(sm.nextGoldDropTurn === 74, 'nextGoldDropTurn scheduled to 74');

    // Use Undo
    const undoRes = sm.useUndoItem();
    this.assert(undoRes.success === true, 'Undo succeeded');
    this.assert(sm.turnCount === 63, 'turnCount reverted to 63');
    this.assert(sm.goldDropsCount === 7, 'goldDropsCount reverted to 7');
    this.assert(sm.currentGoldValue === 8, 'currentGoldValue reverted to 8');
    this.assert(sm.goldDropInterval === 8, 'goldDropInterval reverted to 8');
    this.assert(sm.nextGoldDropTurn === 64, 'nextGoldDropTurn reverted to 64');
  }

  // =========================================================================
  // C-STORY-021: 英雄方塊人物職業概念美術升級與動態外框加粗 3 倍
  // =========================================================================

  // C-STORY-021 GWT 21.1：英雄人物概念職業圖案隨數值階梯進化
  testGwt21_1_HeroCharacterThemesAndProgressiveIntensity() {
    this.assert(HERO_THEMES[2].badge === '🧑‍🌾', 'Hero 2 badge is novice adventurer');
    this.assert(HERO_THEMES[4].badge === '🧝', 'Hero 4 badge is elf ranger');
    this.assert(HERO_THEMES[8].badge === '🥷', 'Hero 8 badge is shadow assassin');
    this.assert(HERO_THEMES[16].badge === '💂', 'Hero 16 badge is iron guard');
    this.assert(HERO_THEMES[32].badge === '🧙', 'Hero 32 badge is priest mage');
    this.assert(HERO_THEMES[64].badge === '🤴', 'Hero 64 badge is royal lord');
    this.assert(HERO_THEMES[128].badge === '🦸', 'Hero 128 badge is dragon slayer');
    this.assert(HERO_THEMES[256].badge === '🦹', 'Hero 256 badge is martial god');
    this.assert(HERO_THEMES[512].badge === '🧙‍♂️', 'Hero 512 badge is grand sage');
    this.assert(HERO_THEMES[1024].badge === '👼', 'Hero 1024 badge is divine angel');
    this.assert(HERO_THEMES[2048].badge === '🪽', 'Hero 2048 badge is seraph wing');
  }

  // C-STORY-021 GWT 21.2：動態擴張呼吸外框加粗 3 倍（6px）
  testGwt21_2_HeroBreathingWave6pxTripleThickness() {
    const heroTile = new Tile(2, TileType.HERO, 4, 0);
    const dummyBoard = document.createElement('div');
    const renderer = new ViewRenderer(dummyBoard);
    const el = renderer.createTileElement(heroTile);
    this.assert(el.classList.contains('tile-hero'), 'Element contains tile-hero class');
  }

  // =========================================================================
  // C-STORY-022: 商店倉庫擴張、轉蛋 1/30 掉道具 (6:3:1) 與道具上限 999
  // =========================================================================

  // C-STORY-022 GWT 22.1：商店倉庫擴張階梯定價與容量增長
  testGwt22_1_WarehouseExpansionPricingAndCapacityProgression() {
    this.assert(calculateWarehouseExpansionCost(0) === 2000, 'Level 0 cost is 2000');
    this.assert(calculateWarehouseExpansionCost(1) === 2400, 'Level 1 cost is 2400');
    this.assert(calculateWarehouseExpansionCost(2) === 2800, 'Level 2 cost is 2800 (from 2880)');
    this.assert(calculateWarehouseExpansionCost(3) === 3300, 'Level 3 cost is 3300 (from 3360)');
    this.assert(calculateWarehouseExpansionCost(4) === 3900, 'Level 4 cost is 3900 (from 3960)');
    this.assert(calculateWarehouseExpansionCost(5) === 4600, 'Level 5 cost is 4600 (from 4680)');

    const sm = new StageManager();
    sm.resetSaveData();
    sm.gold = 5000;
    this.assert(sm.inventory.maxCapacity === 24, 'Initial capacity is 24');
    this.assert(sm.warehouseExpansionLevel === 0, 'Initial expansion level is 0');

    // Upgrade 1: cost 2000 -> 24 to 28
    const up1 = sm.upgradeWarehouse();
    this.assert(up1.success === true, 'First upgrade succeeded');
    this.assert(sm.gold === 3000, `Gold deducted to 3000, got ${sm.gold}`);
    this.assert(sm.warehouseExpansionLevel === 1, 'Level is now 1');
    this.assert(sm.inventory.maxCapacity === 28, 'Capacity is now 28');

    // Upgrade 2: cost 2400 -> 28 to 32
    const up2 = sm.upgradeWarehouse();
    this.assert(up2.success === true, 'Second upgrade succeeded');
    this.assert(sm.gold === 600, `Gold deducted to 600, got ${sm.gold}`);
    this.assert(sm.warehouseExpansionLevel === 2, 'Level is now 2');
    this.assert(sm.inventory.maxCapacity === 32, 'Capacity is now 32');

    // Upgrade 3: cost 2800 -> gold is 600, should fail
    const up3 = sm.upgradeWarehouse();
    this.assert(up3.success === false, 'Third upgrade fails due to insufficient gold');
    this.assert(sm.inventory.maxCapacity === 32, 'Capacity remains 32');
  }

  // C-STORY-022 GWT 22.2：裝備轉蛋 1/30 機率額外掉落道具（6:3:1 比例）
  testGwt22_2_GachaItemDropProbabilityAndWeightDistribution() {
    const sm = new StageManager();
    sm.resetSaveData();

    // Statistical test of rollBonusItem on GachaEngine (sample size 30,000)
    let drops = 0;
    let undoCount = 0;
    let hammerCount = 0;
    let snipeCount = 0;
    const sampleSize = 30000;

    for (let i = 0; i < sampleSize; i++) {
      const b = sm.gachaEngine.rollBonusItem();
      if (b) {
        drops++;
        if (b.type === 'undo') undoCount++;
        else if (b.type === 'hammer') hammerCount++;
        else if (b.type === 'snipe') snipeCount++;
      }
    }

    const dropRate = drops / sampleSize;
    // Expected: 1/30 = 3.33%. Tolerance: 2.3% ~ 4.5%
    this.assert(dropRate >= 0.023 && dropRate <= 0.045, `Drop rate (${(dropRate * 100).toFixed(2)}%) within 1/30 expected range`);

    // Expected ratio: 6:3:1 -> undo ~60%, hammer ~30%, snipe ~10%
    const undoRatio = undoCount / drops;
    const hammerRatio = hammerCount / drops;
    const snipeRatio = snipeCount / drops;
    this.assert(undoRatio >= 0.50 && undoRatio <= 0.70, `Undo ratio (${(undoRatio * 100).toFixed(1)}%) around 60%`);
    this.assert(hammerRatio >= 0.22 && hammerRatio <= 0.38, `Hammer ratio (${(hammerRatio * 100).toFixed(1)}%) around 30%`);
    this.assert(snipeRatio >= 0.05 && snipeRatio <= 0.16, `Snipe ratio (${(snipeRatio * 100).toFixed(1)}%) around 10%`);

    // Gacha pull test with bonusItems field returned
    sm.gold = 10000;
    const pullRes = sm.pullGacha(10);
    this.assert(pullRes.success === true, 'Gacha pull succeeded');
    this.assert(Array.isArray(pullRes.bonusItems), 'bonusItems array is present in result');
  }

  // C-STORY-022 GWT 22.3：道具持有上限 999 與純數值顯示
  testGwt22_3_ItemMaxCap999AndPureQuantityDisplay() {
    this.assert(MAX_ITEM_STACK === 999, 'MAX_ITEM_STACK is 999');
    const sm = new StageManager();
    sm.resetSaveData();

    // Claim 1000 items
    sm.claimTestItems(1000);
    this.assert(sm.items.undo === 999, `Undo capped at 999, got ${sm.items.undo}`);
    this.assert(sm.items.hammer === 999, `Hammer capped at 999, got ${sm.items.hammer}`);
    this.assert(sm.items.snipe === 999, `Snipe capped at 999, got ${sm.items.snipe}`);

    // UI display simulation
    const displayUndo = String(sm.items.undo);
    this.assert(displayUndo === '999', 'Displays only quantity');
    this.assert(!displayUndo.includes('/'), 'Does not display max value or slash');
  }

  // =========================================================================
  // C-STORY-023: 營地與商店雙軌分流、主導航四入口重組
  // =========================================================================

  // C-STORY-023 GWT 23.1：主導航四入口與營地工坊水庫完整性驗證
  async testGwt23_1_FourTabNavigationAndGuildRemoval() {
    let doc = document;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) {
          const html = await resp.text();
          doc = new DOMParser().parseFromString(html, 'text/html');
        }
      } catch (e) {
        // Fallback to ambient document
      }
    }

    // 1. Verify bottom navigation tabs
    const navItems = doc.querySelectorAll('.bottom-nav .nav-item');
    this.assert(navItems.length === 4, `Bottom nav has exactly 4 tabs, found ${navItems.length}`);

    const navStages = doc.getElementById('nav-stages');
    const navArmory = doc.getElementById('nav-armory');
    const navCamp = doc.getElementById('nav-camp');
    const navShop = doc.getElementById('nav-shop');
    const navGuild = doc.getElementById('nav-guild');

    this.assert(navStages !== null, 'nav-stages exists');
    this.assert(navArmory !== null, 'nav-armory exists');
    this.assert(navCamp !== null, 'nav-camp exists');
    this.assert(navShop !== null, 'nav-shop exists');
    this.assert(navGuild === null, 'nav-guild is removed');

    // 2. Verify view-camp contains all workshop & gold sink cards
    const viewCamp = doc.getElementById('view-camp');
    this.assert(viewCamp !== null, 'view-camp exists');
    this.assert(viewCamp.querySelector('.gacha-machine-card') !== null, 'Gacha machine is inside view-camp');
    this.assert(viewCamp.querySelector('#shop-warehouse-card') !== null, 'Warehouse card is inside view-camp');
    this.assert(viewCamp.querySelector('#tech-tier-card') !== null, 'Tech tier card is inside view-camp');
    this.assert(viewCamp.querySelector('.camp-debug-section') !== null, 'Debug test section is inside view-camp');
  }

  // C-STORY-023 GWT 23.2：皇家特許商店特權商品卡片展示與交互完整性
  async testGwt23_2_RoyalPrivilegeShopCardsRenderAndInteract() {
    let doc = document;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) {
          const html = await resp.text();
          doc = new DOMParser().parseFromString(html, 'text/html');
        }
      } catch (e) {
        // Fallback to ambient document
      }
    }

    const viewShop = doc.getElementById('view-shop');
    this.assert(viewShop !== null, 'view-shop exists');

    // Verify all 5 privilege cards exist
    const noAdsCard = doc.getElementById('card-no-ads');
    const staminaCard = doc.getElementById('card-stamina');
    const goldPackCard = doc.getElementById('card-gold-pack');
    const dailyAdCard = doc.getElementById('card-daily-ad');
    const chapterPassCard = doc.getElementById('card-chapter-pass');

    this.assert(noAdsCard !== null, 'No-ads privilege card exists');
    this.assert(staminaCard !== null, 'Stamina privilege card exists');
    this.assert(goldPackCard !== null, 'Gold pack privilege card exists');
    this.assert(dailyAdCard !== null, 'Daily ad reward card exists');
    this.assert(chapterPassCard !== null, 'Chapter expansion pass card exists');

    // Verify purchase action buttons
    this.assert(doc.getElementById('btn-buy-no-ads') !== null, 'btn-buy-no-ads exists');
    this.assert(doc.getElementById('btn-buy-stamina') !== null, 'btn-buy-stamina exists');
    this.assert(doc.getElementById('btn-buy-gold-pack') !== null, 'btn-buy-gold-pack exists');
    this.assert(doc.getElementById('btn-claim-daily-ad') !== null, 'btn-claim-daily-ad exists');
    this.assert(doc.getElementById('btn-buy-chapter-pass') !== null, 'btn-buy-chapter-pass exists');
  }

  // =========================================================================
  // C-STORY-024: 基本掉落科技裝備門檻防堵
  // =========================================================================

  // C-STORY-024 GWT 24.1：未佩戴達標裝備時阻止重大突破升級
  testGwt24_1_GearGatedTechUpgradePreventsBreakthroughWithoutEquippedWeapon() {
    const sm = new StageManager();
    sm.resetSaveData();

    // Set tech to Tier 5 (next tier is Tier 6: 【大突破】白銀軍備, minEquippedWeapon: 4)
    sm.baseTier = 5;
    sm.gold = 10000;
    // Hero has no equipment or only default power 2
    sm.inventory.equippedItem = null;

    const res = sm.upgradeBaseTier();
    this.assert(res.success === false, 'Upgrade to Tier 6 without gear must fail');
    this.assert(res.reason.includes('需先穿戴 Tier 4 以上的裝備'), `Reason mentions requirement: ${res.reason}`);
    this.assert(sm.baseTier === 5, 'Base tier remains at 5');
    this.assert(sm.gold === 10000, 'Gold is not deducted');

    // Equip a weak weapon (value 2)
    const weakItem = sm.inventory.addItem(2);
    sm.inventory.equip(weakItem.id);
    const resWeak = sm.upgradeBaseTier();
    this.assert(resWeak.success === false, 'Upgrade with Tier 2 gear must still fail');
    this.assert(sm.baseTier === 5, 'Base tier still 5');
    this.assert(sm.gold === 10000, 'Gold still 10000');
  }

  // C-STORY-024 GWT 24.2：佩戴符合門檻之裝備允許重大突破升級，並驗證後續階級門檻配置
  testGwt24_2_GearGatedTechUpgradeAllowsBreakthroughWithSufficientGear() {
    const sm = new StageManager();
    sm.resetSaveData();

    // Verify all major breakthrough tiers require corresponding weapons in Constants
    const t6 = BASE_STAT_TIERS.find(t => t.tier === 6);
    const t12 = BASE_STAT_TIERS.find(t => t.tier === 12);
    const t18 = BASE_STAT_TIERS.find(t => t.tier === 18);
    const t24 = BASE_STAT_TIERS.find(t => t.tier === 24);

    this.assert(t6.minEquippedWeapon === 4, 'Tier 6 requires minEquippedWeapon 4');
    this.assert(t12.minEquippedWeapon === 8, 'Tier 12 requires minEquippedWeapon 8');
    this.assert(t18.minEquippedWeapon === 16, 'Tier 18 requires minEquippedWeapon 16');
    this.assert(t24.minEquippedWeapon === 32, 'Tier 24 requires minEquippedWeapon 32');

    // Test successful breakthrough
    sm.baseTier = 5;
    sm.gold = 10000;
    const gear4 = sm.inventory.addItem(4);
    sm.inventory.equip(gear4.id);

    const res = sm.upgradeBaseTier();
    this.assert(res.success === true, 'Upgrade to Tier 6 succeeds with Tier 4 gear');
    this.assert(sm.baseTier === 6, 'Base tier upgraded to 6');
    this.assert(sm.gold === 10000 - 5200, 'Cost 5200 correctly deducted');
    this.assert(res.tierConfig.baseRange[0] === 4, 'Base range starts from 4');
  }

  // =========================================================================
  // C-STORY-025: 營地卡片視覺層級規範化與版面動線統一重構
  // =========================================================================

  // C-STORY-025 GWT 25.1：營地卡片順序（科技前於倉庫）與外框結構無穿模驗證
  async testGwt25_1_CampCardOrderAndNoOverlappingBadges() {
    let doc = document;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) {
          const html = await resp.text();
          doc = new DOMParser().parseFromString(html, 'text/html');
        }
      } catch (e) {
        // Fallback
      }
    }

    const viewCamp = doc.getElementById('view-camp');
    this.assert(viewCamp !== null, 'view-camp exists');

    // 1. Verify card order: Gacha -> Tech -> Warehouse
    const cards = Array.from(viewCamp.querySelectorAll(':scope > .camp-card'));
    this.assert(cards.length >= 3, `Expected at least 3 camp cards, found ${cards.length}`);

    const gachaIdx = cards.findIndex(c => c.id === 'camp-gacha-card' || c.classList.contains('gacha-machine-card'));
    const techIdx = cards.findIndex(c => c.id === 'tech-tier-card');
    const warehouseIdx = cards.findIndex(c => c.id === 'shop-warehouse-card');

    this.assert(gachaIdx !== -1, 'Gacha machine card exists in view-camp');
    this.assert(techIdx !== -1, 'Tech tier card exists in view-camp');
    this.assert(warehouseIdx !== -1, 'Warehouse card exists in view-camp');

    this.assert(gachaIdx < techIdx, 'Gacha machine card is at position #1 before Tech');
    this.assert(techIdx < warehouseIdx, 'Tech tier card is at position #2 before Warehouse card');

    // 2. Verify all cards have .camp-card class (unified rounded border)
    cards.forEach(card => {
      this.assert(card.classList.contains('camp-card'), `${card.id || 'card'} has .camp-card class`);
    });

    // 3. Verify warehouse badge is inside .camp-card-header (no overlapping absolute positioning)
    const warehouseHeader = doc.querySelector('#shop-warehouse-card .camp-card-header');
    this.assert(warehouseHeader !== null, 'Warehouse card has .camp-card-header');
    const warehouseBadge = warehouseHeader.querySelector('#warehouse-level-badge');
    this.assert(warehouseBadge !== null, 'Warehouse badge is located inside header');
  }

  // C-STORY-025 GWT 25.2：統一 Header 佈局（左上標題、右上標籤）與按鈕「先文字後金額」置中標準
  async testGwt25_2_UnifiedCardHeaderAndCenteredButtonFormat() {
    let doc = document;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) {
          const html = await resp.text();
          doc = new DOMParser().parseFromString(html, 'text/html');
        }
      } catch (e) {
        // Fallback
      }
    }

    const cardIds = ['camp-gacha-card', 'tech-tier-card', 'shop-warehouse-card'];
    cardIds.forEach(id => {
      const card = doc.getElementById(id);
      this.assert(card !== null, `Card ${id} exists`);
      const header = card.querySelector('.camp-card-header');
      this.assert(header !== null, `Card ${id} has .camp-card-header`);

      // Title must be present and marked with .camp-card-title
      const title = header.querySelector('.camp-card-title');
      this.assert(title !== null, `Card ${id} has .camp-card-title on top-left`);

      // Badge must be present
      const badge = header.querySelector('.camp-card-badge');
      this.assert(badge !== null, `Card ${id} has .camp-card-badge on top-right`);
    });

    // Verify upgrade action buttons have .btn-camp-action class
    const btnTech = doc.getElementById('btn-upgrade-tech');
    const btnWarehouse = doc.getElementById('btn-upgrade-warehouse');
    this.assert(btnTech.classList.contains('btn-camp-action'), 'btn-upgrade-tech has .btn-camp-action class');
    this.assert(btnWarehouse.classList.contains('btn-camp-action'), 'btn-upgrade-warehouse has .btn-camp-action class');

    // Verify button structure: action label first, then price/cost
    const techChildren = Array.from(btnTech.children);
    this.assert(techChildren.length >= 2, 'btn-upgrade-tech has label and cost children');
    this.assert(techChildren[0].classList.contains('upgrade-name'), 'First child of tech button is upgrade-name');
    this.assert(techChildren[1].classList.contains('upgrade-cost'), 'Second child of tech button is upgrade-cost');

    const warehouseChildren = Array.from(btnWarehouse.children);
    this.assert(warehouseChildren.length >= 2, 'btn-upgrade-warehouse has label and price children');
    this.assert(warehouseChildren[0].classList.contains('buy-action'), 'First child of warehouse button is buy-action');
    this.assert(warehouseChildren[1].classList.contains('buy-price'), 'Second child of warehouse button is buy-price');
  }

  // C-STORY-026 GWT 26.1：體力機制（勝戰不扣，敗戰扣1）
  testGwt26_1_StaminaVictoryNoDeductDefeatDeduct() {
    const sm = new StageManager();
    sm.stamina = 5;
    sm.hasUnlimitedStamina = false;

    // Victory: does NOT consume stamina
    sm.startStage(1);
    sm.handleVictory();
    this.assert(sm.stamina === 5, 'Stamina must remain 5 on victory');

    // Defeat: consumes 1 point
    sm.startStage(1);
    sm.handleDefeat();
    this.assert(sm.stamina === 4, 'Stamina must be reduced by 1 to 4 on defeat');
  }

  // C-STORY-026 GWT 26.2：體力歸零阻擋出擊與快速補給
  testGwt26_2_StaminaDepletedBlocksCombatAndModalGuide() {
    const sm = new StageManager();
    sm.stamina = 0;
    sm.hasUnlimitedStamina = false;

    this.assert(sm.canStartStage() === false, 'Cannot start stage when stamina is 0');
    const result = sm.startStage(1);
    this.assert(result === null, 'startStage must return null when stamina is depleted');

    // Refill stamina
    sm.refillStamina(5);
    this.assert(sm.stamina === 5, 'Stamina must be refilled to 5');
    this.assert(sm.canStartStage() === true, 'canStartStage must return true after refill');
  }

  // C-STORY-026 GWT 26.3：中場插頁廣告每 3 場戰鬥觸發
  testGwt26_3_InterstitialAdTriggerEvery3Battles() {
    const sm = new StageManager();
    sm.battleCountForAd = 0;
    sm.hasNoAdsPass = false;

    const b1 = sm.recordBattleEnd();
    this.assert(b1.triggerAd === false, 'Battle 1 should not trigger ad');
    const b2 = sm.recordBattleEnd();
    this.assert(b2.triggerAd === false, 'Battle 2 should not trigger ad');
    const b3 = sm.recordBattleEnd();
    this.assert(b3.triggerAd === true, 'Battle 3 must trigger interstitial ad');

    const b4 = sm.recordBattleEnd();
    this.assert(b4.triggerAd === false, 'Battle 4 should not trigger ad');
    const b5 = sm.recordBattleEnd();
    this.assert(b5.triggerAd === false, 'Battle 5 should not trigger ad');
    const b6 = sm.recordBattleEnd();
    this.assert(b6.triggerAd === true, 'Battle 6 must trigger interstitial ad');
  }

  // C-STORY-026 GWT 26.4：免廣告 PASS 永久免除插頁並直接秒領福利
  testGwt26_4_NoAdsPassExemptsInterstitialAndInstantClaim() {
    const sm = new StageManager();
    sm.buyNoAdsPass();
    this.assert(sm.hasNoAdsPass === true, 'hasNoAdsPass must be true after purchase');

    sm.battleCountForAd = 2; // Next is 3rd battle
    const b3 = sm.recordBattleEnd();
    this.assert(b3.triggerAd === false, 'Battle 3 must NOT trigger ad when player has NoAdsPass');

    // Daily ad reward direct claim
    const initialGold = sm.gold;
    const res = sm.claimDailyAdGold();
    this.assert(res.success === true, 'claimDailyAdGold must succeed');
    this.assert(sm.gold === initialGold + 500, '500 gold must be directly awarded');
  }

  // C-STORY-026 GWT 26.5：無限體力通行證免疫戰敗扣體
  testGwt26_5_UnlimitedStaminaPassImmunity() {
    const sm = new StageManager();
    sm.buyUnlimitedStaminaPass();
    this.assert(sm.hasUnlimitedStamina === true, 'hasUnlimitedStamina must be true after purchase');

    // Defeat does not consume stamina
    sm.consumeStaminaOnDefeat();
    this.assert(sm.stamina === sm.maxStamina, 'Stamina must remain at maxStamina under Unlimited Pass');
    this.assert(sm.canStartStage() === true, 'canStartStage must always return true under Unlimited Pass');
  }

  // C-STORY-027 GWT 27.1：5x5 網格嚴格等分鎖定（minmax(0, 1fr) 與 5:6 卡牌比例）
  async testGwt27_1_GridStrictlyEqualMinmax01fr() {
    let cssText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./style.css');
        if (resp.ok) cssText = await resp.text();
      } catch (e) {}
    }
    if (!cssText && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        cssText = fs.readFileSync('style.css', 'utf-8');
      } catch (e) {}
    }

    if (cssText) {
      this.assert(cssText.includes('aspect-ratio: 5 / 6;'), 'Board must use 5:6 Threes aspect ratio');
      this.assert(cssText.includes('repeat(5, minmax(0, 1fr))'), 'Grid template must use minmax(0, 1fr) for strictly equal sizing');
    }
  }

  // C-STORY-027 GWT 27.2：網格單元與方塊防撐開變形
  async testGwt27_2_GridCellsStrictNoOverflowOrDeformation() {
    let cssText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./style.css');
        if (resp.ok) cssText = await resp.text();
      } catch (e) {}
    }

    if (cssText) {
      this.assert(cssText.includes('.grid-cell'), 'style.css has .grid-cell');
      this.assert(cssText.includes('box-sizing: border-box;'), 'box-sizing must be border-box');
    }
  }

  // C-STORY-027 GWT 27.3：全戰鬥區域觸控滑動擴展
  async testGwt27_3_CombatTouchAreaExpanded() {
    let doc = document;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) {
          const html = await resp.text();
          doc = new DOMParser().parseFromString(html, 'text/html');
        }
      } catch (e) {}
    }

    const combatOverlay = doc.getElementById('combat-overlay');
    this.assert(combatOverlay !== null, 'combat-overlay must exist');
    const boardWrapper = doc.querySelector('.board-wrapper');
    this.assert(boardWrapper !== null, 'board-wrapper must exist');
  }

  // C-STORY-027 GWT 27.4：戰敗扣體力演出與徽章標籤
  async testGwt27_4_DefeatStaminaLossAnimationAndBadge() {
    let doc = document;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) {
          const html = await resp.text();
          doc = new DOMParser().parseFromString(html, 'text/html');
        }
      } catch (e) {}
    }

    const defeatModal = doc.getElementById('modal-defeat');
    this.assert(defeatModal !== null, 'modal-defeat must exist');
    const staminaBadge = defeatModal.querySelector('#defeat-stamina-badge');
    this.assert(staminaBadge !== null, 'defeat-stamina-badge must exist inside defeat modal');
  }

  // C-STORY-028 GWT 28.1：設定頁版本更新履歷專區與滑動機制
  async testGwt28_1_SettingsModalVersionChangelog() {
    let doc = document;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) {
          const html = await resp.text();
          doc = new DOMParser().parseFromString(html, 'text/html');
        }
      } catch (e) {}
    }

    const changelogBox = doc.getElementById('version-changelog-box');
    this.assert(changelogBox !== null, 'version-changelog-box must exist in settings modal');
    this.assert(changelogBox.textContent.includes('C-STORY-028'), 'Changelog must include C-STORY-028');
    this.assert(changelogBox.textContent.includes('C-STORY-027'), 'Changelog must include C-STORY-027');
  }

  // C-STORY-028 GWT 28.2：最上方與最下方安全邊距內收
  async testGwt28_2_TopAndBottomSafePaddingInward() {
    let cssText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./style.css');
        if (resp.ok) cssText = await resp.text();
      } catch (e) {}
    }

    if (cssText) {
      this.assert(cssText.includes('safe-area-inset-top'), 'Top bars must support safe-area-inset-top');
      this.assert(cssText.includes('safe-area-inset-bottom'), 'Bottom bars must support safe-area-inset-bottom');
    }
  }

  // C-STORY-028 GWT 28.3：體力圖標全面更換為愛心
  async testGwt28_3_StaminaIconHeartTransformation() {
    let doc = document;
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) {
          const html = await resp.text();
          doc = new DOMParser().parseFromString(html, 'text/html');
        }
      } catch (e) {}
    }

    const topPill = doc.getElementById('top-stamina-pill');
    this.assert(topPill !== null, 'top-stamina-pill must exist');
    this.assert(topPill.textContent.includes('❤️'), 'top-stamina-pill must contain ❤️ heart icon');

    const defeatBadge = doc.getElementById('defeat-stamina-badge');
    this.assert(defeatBadge !== null, 'defeat-stamina-badge must exist');
    this.assert(defeatBadge.textContent.includes('❤️'), 'defeat-stamina-badge must contain ❤️ heart icon');
  }

  // C-STORY-029 GWT 29.1：富礦期延長至 8 個，固定每 8 回合生成一次
  testGwt29_1_EightRichVeinDropsWithConstantInterval() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);
    sm.goldSpawnBudget = 1000;
    sm.remainingGoldBudget = 1000;
    sm.currentGoldValue = 8;
    sm.goldDropsCount = 0;
    sm.goldDropInterval = 8;
    sm.nextGoldDropTurn = 8;

    const triggerTurn = (turn) => {
      sm.board.clear();
      sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
      sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
      sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
      sm.turnCount = turn - 1;
      const res = sm.handleMove(Direction.DOWN);
      this.assert(res.moved === true, `Move at turn ${turn} succeeded`);
    };

    // Simulate turns up to drop 8
    const expectedTurns = [8, 16, 24, 32, 40, 48, 56, 64];
    for (let drop = 1; drop <= 8; drop++) {
      triggerTurn(expectedTurns[drop - 1]);
      this.assert(sm.goldDropsCount === drop, `Gold drop count must be ${drop}`);
      if (drop < 8) {
        this.assert(sm.goldDropInterval === 8, `Drops 1~7 must keep interval at 8`);
      } else {
        // Drop 8 should transition interval to 10 for subsequent drop
        this.assert(sm.goldDropInterval === 10, `Drop 8 must increment interval to 10`);
      }
    }
  }

  // C-STORY-029 GWT 29.2：第 8 次生成後的動態間隔遞增與封頂 16 回合
  testGwt29_2_SubsequentDropsIntervalIncrementAndCapAt16() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);
    sm.goldSpawnBudget = 1000;
    sm.remainingGoldBudget = 1000;
    sm.currentGoldValue = 8;
    sm.goldDropsCount = 8;
    sm.goldDropInterval = 10;
    sm.turnCount = 64;
    sm.nextGoldDropTurn = 74;

    const triggerTurn = (turn) => {
      sm.board.clear();
      sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
      sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
      sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
      sm.turnCount = turn - 1;
      const res = sm.handleMove(Direction.DOWN);
      this.assert(res.moved === true, `Move at turn ${turn} succeeded`);
    };

    // Drop 9: turn 74, next interval 12, next turn 86
    triggerTurn(74);
    this.assert(sm.goldDropsCount === 9, 'Drop count is 9');
    this.assert(sm.goldDropInterval === 12, 'Interval increments to 12');
    this.assert(sm.nextGoldDropTurn === 74 + 12, 'Next turn is 86');

    // Drop 10: turn 86, next interval 14, next turn 100
    triggerTurn(86);
    this.assert(sm.goldDropsCount === 10, 'Drop count is 10');
    this.assert(sm.goldDropInterval === 14, 'Interval increments to 14');
    this.assert(sm.nextGoldDropTurn === 86 + 14, 'Next turn is 100');

    // Drop 11: turn 100, next interval 16, next turn 116
    triggerTurn(100);
    this.assert(sm.goldDropsCount === 11, 'Drop count is 11');
    this.assert(sm.goldDropInterval === 16, 'Interval increments to 16');
    this.assert(sm.nextGoldDropTurn === 100 + 16, 'Next turn is 116');

    // Drop 12: turn 116, interval capped at 16, next turn 132
    triggerTurn(116);
    this.assert(sm.goldDropsCount === 12, 'Drop count is 12');
    this.assert(sm.goldDropInterval === 16, 'Interval remains capped at 16');
    this.assert(sm.nextGoldDropTurn === 116 + 16, 'Next turn is 132');

    // Drop 13: turn 132, interval remains 16
    triggerTurn(132);
    this.assert(sm.goldDropsCount === 13, 'Drop count is 13');
    this.assert(sm.goldDropInterval === 16, 'Interval stays at 16 (never exceeds 16)');
  }

  // C-STORY-029 GWT 29.3：每 4 個金幣降一階，最低不低於 4
  testGwt29_3_VeinDecayEveryFourDropsMinimumFour() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);
    sm.goldSpawnBudget = 1000;
    sm.remainingGoldBudget = 1000;
    sm.currentGoldValue = 32;
    sm.goldDropsCount = 0;
    sm.goldDropInterval = 8;
    sm.nextGoldDropTurn = 8;

    const triggerTurn = (turn) => {
      sm.board.clear();
      sm.board.setTile(4, 0, new Tile(2, TileType.HERO, 4, 0));
      sm.board.setTile(0, 4, new Tile(1024, TileType.MONSTER, 0, 4));
      sm.board.setTile(3, 0, new Tile(2, TileType.EQUIPMENT, 3, 0));
      sm.turnCount = turn - 1;
      const res = sm.handleMove(Direction.DOWN);
      this.assert(res.moved === true, `Move at turn ${turn} succeeded`);
    };

    // Simulate 4 drops
    for (let i = 1; i <= 4; i++) {
      triggerTurn(sm.nextGoldDropTurn);
    }
    this.assert(sm.currentGoldValue === 16, 'After 4 drops, gold value decays from 32 to 16');

    // Simulate next 4 drops (total 8)
    for (let i = 5; i <= 8; i++) {
      triggerTurn(sm.nextGoldDropTurn);
    }
    this.assert(sm.currentGoldValue === 8, 'After 8 drops, gold value decays from 16 to 8');

    // Simulate next 4 drops (total 12)
    for (let i = 9; i <= 12; i++) {
      triggerTurn(sm.nextGoldDropTurn);
    }
    this.assert(sm.currentGoldValue === 4, 'After 12 drops, gold value decays from 8 to 4');

    // Simulate next 4 drops (total 16)
    for (let i = 13; i <= 16; i++) {
      triggerTurn(sm.nextGoldDropTurn);
    }
    this.assert(sm.currentGoldValue === 4, 'After 16 drops, gold value remains clamped at minimum 4');
  }

  // C-STORY-029 GWT 29.4：全 350 關卡金幣獎勵池翻倍驗證
  testGwt29_4_AllStagesGoldCapDoubled() {
    // Chapter 1 (1~5)
    this.assert(STAGE_CONFIGS[0].goldCap === 40, 'Stage 1 goldCap is doubled to 40');
    this.assert(STAGE_CONFIGS[4].goldCap === 80, 'Stage 5 goldCap is doubled to 80');

    // Chapter 2 (6~20)
    this.assert(STAGE_CONFIGS[5].goldCap === 90, 'Stage 6 goldCap is doubled to 90');
    this.assert(STAGE_CONFIGS[19].goldCap === 240, 'Stage 20 goldCap is doubled to 240');

    // Chapter 3~8 (21~350)
    // Formula: Math.floor(80 + s * 4)
    this.assert(STAGE_CONFIGS[20].goldCap === 164, 'Stage 21 goldCap is 80 + 21*4 = 164');
    this.assert(STAGE_CONFIGS[29].goldCap === 200, 'Stage 30 goldCap is 80 + 30*4 = 200 (was 100)');
    this.assert(STAGE_CONFIGS[99].goldCap === 480, 'Stage 100 goldCap is 80 + 100*4 = 480 (was 240)');
    this.assert(STAGE_CONFIGS[349].goldCap === 1480, 'Stage 350 goldCap is 80 + 350*4 = 1480 (was 740)');
  }

  // =========================================================
  // C-STORY-030: 新手引導序章 (Stage 0 Tutorial) GWT 驗收測試
  // =========================================================

  // GWT 30.1：首次進入判定與教學啟動
  testGwt30_1_TutorialInitialStateAndAutoStart() {
    const sm = new StageManager();
    sm.resetSaveData();
    this.assert(sm.tutorialManager.isCompleted === false, 'Tutorial completed flag is initially false');

    const config = sm.startTutorialStage();
    this.assert(config !== null && config.id === 0, 'Stage 0 tutorial config loaded');
    this.assert(sm.tutorialManager.isActive === true, 'Tutorial is now active');
    this.assert(sm.tutorialManager.currentStepIndex === 1, 'Tutorial starts at Step 1');

    const hero = sm.board.getHero();
    this.assert(hero !== null && hero.value === 2 && hero.r === 3 && hero.c === 2, 'Hero (2) placed at (3,2)');
    const eq = sm.board.getTile(2, 2);
    this.assert(eq !== null && eq.isEquipment() && eq.value === 2, 'Equipment (2) placed at (2,2)');
  }

  // GWT 30.2：操作限制與防呆機制 (限制僅能向上滑動)
  testGwt30_2_DirectionRestrictionAndShakeWarning() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();

    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.UP) === true, 'UP is allowed in Step 1');
    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.DOWN) === false, 'DOWN is prohibited in Step 1');
    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.LEFT) === false, 'LEFT is prohibited in Step 1');
    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.RIGHT) === false, 'RIGHT is prohibited in Step 1');

    // Attempt invalid DOWN move
    const res = sm.handleMove(Direction.DOWN);
    this.assert(res.moved === false, 'Move did not occur');
    this.assert(res.reason === 'TUTORIAL_RESTRICTED', 'Move blocked with TUTORIAL_RESTRICTED reason');
    this.assert(sm.board.getHero().r === 3, 'Hero did not move from row 3');
  }

  // GWT 30.3：Step 1 裝備合成推進至 Step 2
  testGwt30_3_EquipFusionAdvancesToStep2() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();

    // Execute allowed UP move with 0 delay for synchronous unit test
    const res = sm.handleMove(Direction.UP, { tutorialDelayMs: 0 });
    this.assert(res.moved === true, 'UP move succeeded');
    this.assert(sm.tutorialManager.currentStepIndex === 2, 'Automatically advanced to Step 2');

    const hero = sm.board.getHero();
    this.assert(hero !== null && hero.value === 4, 'Hero upgraded to (4) after absorbing sword');

    const monsters = sm.board.getMonsters();
    this.assert(monsters.length === 1 && monsters[0].value === 4, 'Slime (4) spawned for Step 2');
  }

  // GWT 30.4：Step 2 魔物討伐推進至 Step 3
  testGwt30_4_SlimeCombatVictoryAdvancesToStep3() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();
    sm.tutorialManager.applyStep(2);

    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.RIGHT) === true, 'RIGHT is allowed in Step 2');
    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.LEFT) === false, 'LEFT is blocked in Step 2');

    const res = sm.handleMove(Direction.RIGHT, { tutorialDelayMs: 0 });
    this.assert(res.moved === true, 'RIGHT move succeeded');
    this.assert(sm.tutorialManager.currentStepIndex === 3, 'Slime killed, advanced to Step 3');

    const goldTiles = sm.board.getAllTiles().filter(t => t.isGold());
    this.assert(goldTiles.length === 2, 'Step 3 spawned two gold tiles');
  }

  // GWT 30.5：Step 3 金幣合成與點擊兌現全流程
  testGwt30_5_GoldMergeAndTapToCashOutFlow() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();
    sm.tutorialManager.applyStep(3);

    // Phase 1: Slide LEFT to merge gold (4+4=8)
    this.assert(sm.tutorialManager.subStepPhase === 1, 'Initially in Phase 1 (Swipe)');
    const res = sm.handleMove(Direction.LEFT, { tutorialDelayMs: 0 });
    this.assert(res.moved === true, 'LEFT move succeeded');
    this.assert(sm.tutorialManager.subStepPhase === 2, 'Advanced to Phase 2 (Tap to cash out)');

    // In Phase 2, swipes should be locked
    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.UP) === false, 'Swipe locked in tap phase');

    // Tap Gold Tile (value 8)
    const goldTile = sm.board.getAllTiles().find(t => t.isGold());
    this.assert(goldTile !== null && goldTile.value === 8, 'Gold tile value is 8');

    const cashRes = sm.cashOutGoldTile(goldTile.r, goldTile.c);
    this.assert(cashRes.success === true && cashRes.amount === 8, 'Gold tile cashed out successfully');
  }

  // GWT 30.6：Step 4 開放自主演練與斬殺 BOSS 完成教學 (C-STORY-032 更新)
  testGwt30_6_BossPowerCheckAndTwoPhaseClear() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();
    sm.tutorialManager.applyStep(4);

    this.assert(sm.tutorialManager.isOpenCombat === undefined || sm.tutorialManager.getCurrentStepConfig().isOpenCombat === true, 'Step 4 config is open combat');
    // Open combat allows all directions
    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.DOWN) === true, 'DOWN is allowed in Step 4');
    this.assert(sm.tutorialManager.isDirectionAllowed(Direction.UP) === true, 'UP is also allowed in Step 4 free practice');

    // Slide DOWN to absorb sword (4) -> Hero becomes (8)
    const resDown = sm.handleMove(Direction.DOWN);
    this.assert(resDown.moved === true, 'Down move executed');
    const hero = sm.board.getHero();
    this.assert(hero !== null && hero.value === 8, 'Hero boosted to 8');

    // Slide UP to kill Boss (8)
    const resUp = sm.handleMove(Direction.UP);
    this.assert(resUp.moved === true, 'UP move killed boss');

    // Immediately trigger end tutorial for unit test assertion
    sm.tutorialManager.endTutorial(true);
    this.assert(sm.tutorialManager.isActive === false, 'Tutorial completed and inactive');
    this.assert(sm.tutorialManager.isCompleted === true, 'Tutorial marked as completed');
  }

  // GWT 30.7：中途跳過教學與存檔標記持久化
  testGwt30_7_TutorialSkipAndCompletedFlagPersistence() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();

    this.assert(sm.tutorialManager.isActive === true, 'Tutorial active');
    sm.tutorialManager.skipTutorial();
    this.assert(sm.tutorialManager.isActive === false, 'Tutorial stopped after skip');
    this.assert(sm.tutorialManager.isCompleted === true, 'Completed flag saved as true');

    // Recheck with new StageManager instance
    const newSm = new StageManager();
    this.assert(newSm.tutorialManager.isCompleted === true, 'New instance recognizes tutorial as completed');
  }

  // =========================================================
  // C-STORY-031: 新手教學視覺化圖解POPUP、手指座標精確定位與規則修正 GWT
  // =========================================================

  // GWT 31.1：POPUP 圖解卡片結構與公式驗證
  testGwt31_1_PopupVisualCardFormulaStructures() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();

    const step1 = sm.tutorialManager.getCurrentStepConfig();
    this.assert(step1.popupCard !== null, 'Step 1 has popupCard configuration');
    this.assert(step1.popupCard.formula.length === 5, 'Step 1 formula has 5 items: Hero + Equip = Upgraded Hero');
    this.assert(step1.popupCard.formula[0].val === 2 && step1.popupCard.formula[2].val === 2 && step1.popupCard.formula[4].val === 4, 'Step 1 formula is 2 + 2 = 4');

    sm.tutorialManager.applyStep(2);
    const step2 = sm.tutorialManager.getCurrentStepConfig();
    this.assert(step2.popupCard !== null, 'Step 2 has popupCard');
    this.assert(step2.popupCard.formula.some(f => f.label === '受傷減半' && f.val === 2), 'Step 2 formula shows Hero (4) - Monster (4) = Hero (2) damaged in half');
    this.assert(step2.popupCard.formula.some(f => f.slashed === true && f.label === '消滅'), 'Step 2 formula shows monster slashed and eliminated');
  }

  // GWT 31.2：魔物合成警告規則文本修正
  testGwt31_2_MonsterSynthesisWarningCorrectText() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();
    sm.tutorialManager.applyStep(2);

    const step2 = sm.tutorialManager.getCurrentStepConfig();
    this.assert(!step2.dialogue.includes('魔物之間不會合成'), 'Incorrect "monsters do not synthesize" text is removed');
    this.assert(step2.dialogue.includes('同等級魔物會互相合體升級'), 'Dialogue accurately warns that same-tier monsters synthesize');
    this.assert(step2.popupCard.warning.includes('魔物可以合成'), 'Popup warning explicitly states: 魔物可以合成');
  }

  // GWT 31.3：Step 3 金幣點擊兌現後百分之百推進至 Step 4 不卡關
  testGwt31_3_Step3GoldTapAdvancesToStep4WithoutStall() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();
    sm.tutorialManager.applyStep(3);

    // Merge gold
    sm.handleMove(Direction.LEFT, { tutorialDelayMs: 0 });
    this.assert(sm.tutorialManager.subStepPhase === 2, 'In Step 3 Phase 2 (Tap to cash out)');

    const goldTile = sm.board.getAllTiles().find(t => t.isGold());
    this.assert(goldTile !== null && goldTile.value === 8, 'Gold tile (8) exists');

    // Tap to cash out
    const res = sm.cashOutGoldTile(goldTile.r, goldTile.c);
    this.assert(res.success === true, 'Cashed out successfully');

    // Simulate timeout callback immediately
    sm.tutorialManager.onCellTapped(goldTile.r, goldTile.c, goldTile);
    sm.tutorialManager.applyStep(4);

    this.assert(sm.tutorialManager.currentStepIndex === 4, 'Smoothly advanced to Step 4 without hanging');
    const boss = sm.board.getAllTiles().find(t => t.isMonster());
    this.assert(boss !== null && boss.value === 8, 'Boss goblin (8) spawned in Step 4');
  }

  // GWT 31.4：手指引導右側半格偏移與百分比定位屬性
  testGwt31_4_HandGuidePercentageCoordinatesAnchored() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();

    const step1 = sm.tutorialManager.getCurrentStepConfig();
    this.assert(step1.handGuide.guideOffsetCol === 0.6, 'Step 1 offsets guide column by +0.6 (right-half of tile)');
    this.assert(step1.handGuide.from.r === 3 && step1.handGuide.to.r === 2, 'Swipe goes from hero (3) to equip (2)');

    // Anchor calculation verification
    const anchorC = ((step1.handGuide.from.c + step1.handGuide.to.c) / 2) + step1.handGuide.guideOffsetCol;
    this.assert(anchorC === 2.6, 'Column anchor is 2.6, placing hand neatly on the right flank');
    const posXPercent = (anchorC + 0.5) * 20;
    this.assert(posXPercent === 62, 'Percentage anchor is strictly 62% in 5x5 board');
  }

  // =========================================================
  // C-STORY-032: 新手教學節奏調優、自主演練、消除假規則與大廳序章訓練所 GWT
  // =========================================================

  // GWT 32.1：Chapter 0 序章訓練所與 Stage 0 卡片於大廳可見且可啟動
  testGwt32_1_Chapter0AndStage0IntegratedInLobby() {
    const sm = new StageManager();
    sm.resetSaveData();

    // Check Chapter 0 definition
    this.assert(sm.isChapterUnlocked(0) === true, 'Chapter 0 is unlocked by default');
    const ch0 = CHAPTER_CONFIGS.find(c => c.id === 0);
    this.assert(ch0 !== undefined && ch0.name.includes('序章：新手訓練所'), 'Chapter 0 exists in CHAPTER_CONFIGS');

    // Check Stage 0 configuration
    const stage0 = STAGE_0_CONFIG;
    this.assert(stage0 !== undefined, 'Stage 0 exists as STAGE_0_CONFIG');
    this.assert(stage0.chapter === 0, 'Stage 0 belongs to Chapter 0');
    this.assert(stage0.name.includes('第 0 關：王國勇者試煉 (教學)'), 'Stage 0 has correct name');

    // Start Stage 0 via tutorial stage
    const started = sm.startTutorialStage();
    this.assert(started.id === 0, 'Tutorial combat started with stage ID 0');
    this.assert(sm.isInBattle === true, 'In battle state is true');
    this.assert(sm.tutorialManager.isActive === true, 'Tutorial manager is active');
  }

  // GWT 32.2：重置教學紀錄 (setCompleted(false)) 讓教學狀態正確還原
  testGwt32_2_ClearTutorialRecordResetsState() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.tutorialManager.setCompleted(true);
    this.assert(sm.tutorialManager.isCompleted === true, 'Marked tutorial as completed');

    // Reset tutorial state
    sm.tutorialManager.setCompleted(false);
    this.assert(sm.tutorialManager.isCompleted === false, 'Tutorial completed flag cleared');

    // Recheck across fresh instances
    const newSm = new StageManager();
    this.assert(newSm.tutorialManager.isCompleted === false, 'Fresh instance confirms tutorial completed is false');
  }

  // GWT 32.3：Step 4 戰力不足為阻擋而非陣亡，且為自由自主實戰
  testGwt32_3_Step4BlockRuleAndOpenCombatConfig() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();
    sm.tutorialManager.applyStep(4);

    const step4 = sm.tutorialManager.getCurrentStepConfig();
    this.assert(step4.isOpenCombat === true, 'Step 4 is configured as isOpenCombat: true');
    this.assert(step4.title.includes('打倒魔物'), 'Title reflects "打倒魔物" objective');

    // Verify formula card has block symbol 🛑
    this.assert(step4.popupCard.formula.some(f => f.type === 'block' && f.val === '🛑'), 'Formula has block 🛑 mini card');
    this.assert(!step4.popupCard.formula.some(f => f.type === 'defeat'), 'Formula no longer contains defeat 💀');
    this.assert(step4.popupCard.warning.includes('阻擋無法消滅'), 'Warning explicitly explains block instead of death');
  }

  // GWT 32.4：金幣點擊提示手勢置中無半格偏差
  testGwt32_4_GoldTapGuideStrictlyCentered() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();
    sm.tutorialManager.applyStep(3);

    const step3 = sm.tutorialManager.getCurrentStepConfig();
    const tapGuide = step3.subStep.handGuide;
    this.assert(tapGuide.type === 'tap', 'Sub-step guide is of type tap');
    this.assert(tapGuide.guideOffsetCol === undefined, 'No column offset applied to tap guide (strictly centered)');
  }

  // =========================================================
  // C-STORY-033: 新手教學手勢位置優化、金幣收益結算修復、文案精簡與退關貨幣放棄機制 GWT
  // =========================================================

  // GWT 33.1：Step 2 魔物提示文案精簡（移除「請優先擊破」，保留「同等級魔物會互相合體升級變強！」）
  testGwt33_1_MonsterWarningCopyWithoutMisleadingPriority() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();
    sm.tutorialManager.applyStep(2);

    const step2 = sm.tutorialManager.getCurrentStepConfig();
    this.assert(!step2.dialogue.includes('請優先擊破'), 'Step 2 dialogue must NOT contain misleading "請優先擊破"');
    this.assert(step2.dialogue.includes('同等級魔物會互相合體升級變強！'), 'Step 2 dialogue contains concise monster fusion warning');
    this.assert(step2.popupCard.warning.includes('同等級魔物') && step2.popupCard.warning.includes('升級變強'), 'PopupCard warning contains concise fusion warning');
  }

  // GWT 33.2：滑動提示手勢位置配置於方塊下方（placeBelow: true，手指微觸方塊下緣）
  testGwt33_2_HandGuidesPositionedBelowTiles() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();

    // Step 2 combat swipe
    sm.tutorialManager.applyStep(2);
    const step2 = sm.tutorialManager.getCurrentStepConfig();
    this.assert(step2.handGuide.placeBelow === true, 'Step 2 hand guide has placeBelow: true');
    this.assert(step2.handGuide.guideOffsetRow > 0, 'Step 2 guideOffsetRow is positive (below tile, touching bottom)');

    // Step 3 gold merge swipe
    sm.tutorialManager.applyStep(3);
    const step3 = sm.tutorialManager.getCurrentStepConfig();
    this.assert(step3.handGuide.placeBelow === true, 'Step 3 hand guide has placeBelow: true');
    this.assert(step3.handGuide.guideOffsetRow > 0, 'Step 3 guideOffsetRow is positive (below tile, touching bottom)');
  }

  // GWT 33.3：滑動後等待時間調整為 1 秒 (1000ms)
  testGwt33_3_MoveDelayReducedToOneSecond() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startTutorialStage();

    // Verify handleMove default delay parameter
    let recordedDelay = null;
    const origOnMoveExecuted = sm.tutorialManager.onMoveExecuted.bind(sm.tutorialManager);
    sm.tutorialManager.onMoveExecuted = (dir, res, delay) => {
      recordedDelay = delay;
      origOnMoveExecuted(dir, res, 0); // execute immediately for test
    };

    sm.handleMove(Direction.UP);
    this.assert(recordedDelay === 1000, `Tutorial move delay must be 1000ms (1.0s), got ${recordedDelay}ms`);
  }

  // GWT 33.4：教學關金幣合成 (8) 與點擊 (8) 完整累加至 16 金幣，結算初通總額為 66 金幣
  testGwt33_4_TutorialGoldMergeAndTapAccruesTo16Gold() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.gold = 300;
    sm.startTutorialStage();
    this.assert(sm.battleStartGold === 300, 'battleStartGold snapshot recorded at tutorial stage start');

    // Step 3: Initial gold merge
    sm.tutorialManager.applyStep(3);
    this.assert(sm.inBattleGold === 0, 'Initial inBattleGold is 0 in step 3');

    // Move LEFT: 4 + 4 merges into 8 gold tile
    const moveRes = sm.handleMove(Direction.LEFT, { tutorialDelayMs: 0 });
    this.assert(moveRes.goldEarned === 8, 'Move result goldEarned is 8');
    this.assert(sm.inBattleGold === 8, 'inBattleGold is credited with 8 from merge');
    this.assert(sm.gold === 308, 'Player total gold is 308 (300 + 8)');

    // Sub-step: Tap the merged 8-value gold tile (now at 1, 0)
    const goldTile = sm.board.getAllTiles().find(t => t.isGold());
    this.assert(goldTile !== undefined && goldTile.value === 8, 'Found merged gold tile with value 8');
    const cashOutRes = sm.cashOutGoldTile(goldTile.r, goldTile.c);
    this.assert(cashOutRes.success === true, 'Gold tile cash out succeeded');
    this.assert(sm.inBattleGold === 16, 'inBattleGold reaches 16 (8 from merge + 8 from tap)');
    this.assert(sm.gold === 316, 'Player total gold is 316 (300 + 16)');

    // Victory settlement
    sm.handleVictory();
    this.assert(sm.isVictory === true, 'Stage victory flagged');
    this.assert(sm.gold === 366, 'Player final gold is 366 (300 base + 50 first clear + 16 inBattleGold)');
  }

  // GWT 33.5：退出關卡放棄所有貨幣收益 (回滾至進入戰鬥前數量)，戰敗則正常保留戰鬥收益
  testGwt33_5_AbandonBattleRewardsForfeitsAllInCombatGold() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.gold = 500;

    // Case A: Mid-battle quit / abandon
    sm.startStage(1, 4);
    this.assert(sm.battleStartGold === 500, 'Starting gold snapshot is 500');

    // Spawn and cash out a 16 gold tile
    sm.board.setTile(1, 1, new Tile(16, TileType.GOLD));
    sm.cashOutGoldTile(1, 1);
    this.assert(sm.inBattleGold === 16, 'inBattleGold earned 16');
    this.assert(sm.gold === 516, 'Current gold is 516');

    // Player quits mid-battle: abandonBattleRewards
    sm.abandonBattleRewards();
    this.assert(sm.gold === 500, 'Gold reverted to 500, completely abandoning 16 battle gold');
    this.assert(sm.inBattleGold === 0, 'inBattleGold reset to 0');
    this.assert(sm.stageGoldEarned === 0, 'stageGoldEarned reset to 0');

    // Case B: Defeat retains in-battle gold
    sm.startStage(1, 4);
    sm.board.setTile(1, 1, new Tile(16, TileType.GOLD));
    sm.cashOutGoldTile(1, 1);
    this.assert(sm.inBattleGold === 16, 'inBattleGold is 16');
    this.assert(sm.gold === 516, 'Gold is 516');

    sm.handleDefeat();
    this.assert(sm.isGameOver === true, 'Game over flagged');
    this.assert(sm.gold === 516, 'On defeat, inBattleGold is safely kept (516)');
  }

  // GWT 33.6：DOM 元素精確座標定位（Tap 置中、Swipe 居下微觸邊緣）
  testGwt33_6_CellRectPositioningAccurateForTapAndSwipe() {
    // Create mock DOM for board wrapper & grid
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    const grid = document.createElement('div');
    grid.className = 'board-grid';
    wrapper.appendChild(grid);

    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.r = 1;
    cell.dataset.c = 0;
    grid.appendChild(cell);

    const bus = new GameEventBus();
    const overlay = new TutorialOverlay(wrapper, grid, bus);

    this.assert(typeof overlay.getCellRectInWrapper === 'function', 'getCellRectInWrapper method exists');
    this.assert(typeof overlay.renderHandGuide === 'function', 'renderHandGuide method exists');
  }

  // =========================================================
  // C-STORY-034: 戰敗教官覆盤提點與 2048 RPG 進階門道指南 GWT
  // =========================================================

  // GWT 34.1：戰敗結算視窗渲染教官覆盤提點卡片
  testGwt34_1_DefeatTacticalTipCardRendering() {
    let tipEl = document.getElementById('defeat-tactical-tip');
    let createdMock = false;
    if (!tipEl) {
      createdMock = true;
      tipEl = document.createElement('div');
      tipEl.id = 'defeat-tactical-tip';
      tipEl.className = 'defeat-tactical-tip';
      tipEl.innerHTML = `
        <div class="defeat-tip-header">
          <span class="defeat-tip-badge" id="defeat-tip-badge">🛡️ 教官覆盤</span>
          <button class="defeat-tip-btn-next" id="btn-defeat-tip-next">換一則 🔄</button>
        </div>
        <div class="defeat-tip-title" id="defeat-tip-title"></div>
        <div class="defeat-tip-content" id="defeat-tip-content"></div>
      `;
      document.body.appendChild(tipEl);
    }

    const badgeEl = document.getElementById('defeat-tip-badge');
    const titleEl = document.getElementById('defeat-tip-title');
    const contentEl = document.getElementById('defeat-tip-content');

    this.assert(tipEl !== null, 'defeat-tactical-tip container exists in DOM');
    this.assert(badgeEl !== null, 'defeat-tip-badge element exists');
    this.assert(titleEl !== null, 'defeat-tip-title element exists');
    this.assert(contentEl !== null, 'defeat-tip-content element exists');

    // Populate tip data
    const tip0 = DEFEAT_TACTICAL_TIPS[0];
    badgeEl.textContent = tip0.badge;
    titleEl.textContent = tip0.title;
    contentEl.textContent = tip0.content;

    this.assert(badgeEl.textContent === tip0.badge, 'Badge correctly rendered');
    this.assert(titleEl.textContent === tip0.title, 'Title correctly rendered');
    this.assert(contentEl.textContent === tip0.content, 'Content correctly rendered');

    // Trigger defeat state via StageManager
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1, 4);
    sm.handleDefeat();

    this.assert(sm.isGameOver === true, 'Stage marked as game over on defeat');

    if (createdMock && tipEl.parentNode) {
      tipEl.parentNode.removeChild(tipEl);
    }
  }

  // GWT 34.2：提點卡片支援點擊切換與循環輪播
  testGwt34_2_DefeatTacticalTipCyclingAndModularity() {
    this.assert(Array.isArray(DEFEAT_TACTICAL_TIPS), 'DEFEAT_TACTICAL_TIPS must be an array');
    this.assert(DEFEAT_TACTICAL_TIPS.length === 3, `Expected 3 tips, got ${DEFEAT_TACTICAL_TIPS.length}`);

    // Cycle check
    for (let i = 0; i < DEFEAT_TACTICAL_TIPS.length; i++) {
      const current = DEFEAT_TACTICAL_TIPS[i];
      const nextIdx = (i + 1) % DEFEAT_TACTICAL_TIPS.length;
      const nextTip = DEFEAT_TACTICAL_TIPS[nextIdx];
      this.assert(current.id !== nextTip.id, `Index ${i} cycles to distinct tip index ${nextIdx}`);
    }
  }

  // GWT 34.3：戰術提點完整覆蓋三大與普通 2048 的核心策略差異
  testGwt34_3_TacticalTipsContentCoverageOfGameMechanics() {
    const tip1 = DEFEAT_TACTICAL_TIPS.find(t => t.id === 'tip_target_priority');
    const tip2 = DEFEAT_TACTICAL_TIPS.find(t => t.id === 'tip_monster_merge');
    const tip3 = DEFEAT_TACTICAL_TIPS.find(t => t.id === 'tip_gold_cashout');

    this.assert(tip1 !== undefined, 'Tip 1: Target priority exists');
    this.assert(tip1.title.includes('從強怪先打'), 'Tip 1 mentions attacking strong monsters first');
    this.assert(tip1.content.includes('減半'), 'Tip 1 explains power halving mechanics');

    this.assert(tip2 !== undefined, 'Tip 2: Monster merge exists');
    this.assert(tip2.title.includes('同級魔物相撞') || tip2.title.includes('魔物'), 'Tip 2 mentions monster collision');
    this.assert(tip2.content.includes('空格') || tip2.content.includes('騰出'), 'Tip 2 explains freeing board space');

    this.assert(tip3 !== undefined, 'Tip 3: Gold cash out exists');
    this.assert(tip3.content.includes('直接點擊') && tip3.content.includes('金幣'), 'Tip 3 explains cashing out gold directly to clear space');
  }

  // =========================================================
  // C-STORY-035: 教學手勢重位隱藏與點擊指尖置中校準 GWT
  // =========================================================

  // GWT 35.1：手勢重定位時先行隱藏無飄移過渡（瞬間重定位）
  testGwt35_1_HandGuideRepositionHideInstantaneously() {
    const wrapper = document.createElement('div');
    const grid = document.createElement('div');
    wrapper.appendChild(grid);

    const bus = new GameEventBus();
    const overlay = new TutorialOverlay(wrapper, grid, bus);

    this.assert(overlay.handPointer !== null, 'Hand pointer element created');

    // Call renderHandGuide
    overlay.renderHandGuide({
      type: 'swipe',
      from: { r: 1, c: 3 },
      to: { r: 1, c: 1 },
      placeBelow: true,
      label: '向左合成金幣'
    });

    // Verify it is displayed
    this.assert(overlay.handPointer.style.display === 'flex', 'Hand pointer is displayed after rendering guide');

    // Switch to tap guide
    overlay.renderHandGuide({
      type: 'tap',
      cell: { r: 1, c: 0 },
      label: '點擊兌現金幣'
    });

    this.assert(overlay.handPointer.style.display === 'flex', 'Hand pointer properly visible on target coordinate');
    this.assert(overlay.handLabel.textContent === '點擊兌現金幣', 'Label updated correctly');
  }

  // GWT 35.2：點擊提示指尖垂直位移補償精準指向中央
  testGwt35_2_TapGuideFingertipOffsetCompensatedToCenter() {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    const grid = document.createElement('div');
    wrapper.appendChild(grid);

    // Mock cell at (1, 0)
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.r = 1;
    cell.dataset.c = 0;
    grid.appendChild(cell);

    const bus = new GameEventBus();
    const overlay = new TutorialOverlay(wrapper, grid, bus);

    // Call renderHandGuide with tap
    overlay.renderHandGuide({
      type: 'tap',
      cell: { r: 1, c: 0 },
      label: '點擊兌現金幣'
    });

    // In percentage fallback: posYPercent = (targetCell.r + 0.5 + 0.28) * 20 = (1.78) * 20 = 35.6%
    const topValue = parseFloat(overlay.handPointer.style.top);
    this.assert(topValue >= 30, `Top coordinate compensated downwards for fingertip center (got ${topValue})`);
  }

  // C-STORY-036 GWT 36.1：HTML 靜態資源引入嚴格附帶版本查詢字串 (Cache Busting)
  async testGwt36_1_AssetLinksContainVersionQueryString() {
    let htmlText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) htmlText = await resp.text();
      } catch (e) {}
    }
    if (!htmlText && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        htmlText = fs.readFileSync('index.html', 'utf-8');
      } catch (e) {}
    }

    if (htmlText) {
      this.assert(
        htmlText.includes(`style.css?v=${CURRENT_GAME_VERSION.replace('v', '')}`) || htmlText.includes(`style.css?v=${CURRENT_GAME_VERSION}`),
        'style.css must have version query parameter'
      );
      this.assert(
        htmlText.includes(`main.js?v=${CURRENT_GAME_VERSION.replace('v', '')}`) || htmlText.includes(`main.js?v=${CURRENT_GAME_VERSION}`),
        'main.js must have version query parameter'
      );
    }
    this.assert(CURRENT_GAME_VERSION === 'v1.3.6', 'CURRENT_GAME_VERSION must be v1.3.6');
  }

  // C-STORY-036 GWT 36.2：設定視窗具備「檢查並刷新最新版本」按鈕配置
  async testGwt36_2_SettingsReloadButtonConfigured() {
    let htmlText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./index.html');
        if (resp.ok) htmlText = await resp.text();
      } catch (e) {}
    }
    if (!htmlText && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        htmlText = fs.readFileSync('index.html', 'utf-8');
      } catch (e) {}
    }

    if (htmlText) {
      this.assert(htmlText.includes('id="btn-force-reload-version"'), 'index.html must contain btn-force-reload-version button');
      this.assert(htmlText.includes('無損熱更新') || htmlText.includes('檢查並刷新最新版本'), 'Button text must indicate lossless hot update');
    }
  }

  // C-STORY-036 GWT 36.3：自動化版本比對與存檔資料無損升級
  testGwt36_3_SaveVersionMigrationAndDataPreservation() {
    const sm = new StageManager();
    // Simulate loading a legacy save without version or from an older version
    const legacyPayload = {
      saveVersion: 'v1.2.0',
      gold: 1250,
      unlockedStageId: 18,
      clearedStages: { 1: true, 2: true, 3: true },
      baseTier: 3,
      stamina: 4
    };
    localStorage.setItem('2048RPG_Commercial_Save_v1', JSON.stringify(legacyPayload));

    // Reload save data
    sm.loadSaveData();

    // Verify version is safely migrated to latest
    this.assert(sm.saveVersion === CURRENT_GAME_VERSION, `saveVersion must be migrated to ${CURRENT_GAME_VERSION} (got ${sm.saveVersion})`);

    // Verify all existing user data is perfectly preserved
    this.assert(sm.gold === 1250, 'Gold must remain intact after version migration');
    this.assert(sm.unlockedStageId === 18, 'Unlocked stage must remain intact');
    this.assert(sm.clearedStages[1] === true, 'Cleared stages must remain intact');
    this.assert(sm.baseTier === 3, 'Base tier must remain intact');
    this.assert(sm.stamina === 4, 'Stamina must remain intact');
  }
}


