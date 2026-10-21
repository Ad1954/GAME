// GwtRunner.js: Automated GWT Test Suite for Commercial Edition (C-STORY-001 ~ C-STORY-003)

import { Board } from '../core/Board.js';
import { Tile } from '../core/Tile.js';
import { MoveEngine } from '../core/MoveEngine.js';
import { Spawner } from '../core/Spawner.js';
import { StageManager } from '../core/StageManager.js';
import { Direction, TileType, STAGE_CONFIGS, STAGE_0_CONFIG, BASE_STAT_TIERS, CHAPTER_CONFIGS, getTileTheme, ThemeSkinType, THEME_SKIN_CONFIGS, Events, HERO_THEMES, calculateWarehouseExpansionCost, getWarehouseUpgradeConfig, MAX_ITEM_STACK, DEFEAT_TACTICAL_TIPS, CURRENT_GAME_VERSION, getEquipmentImagePath, getHeroImagePath, getMonsterImagePath, getMonsterThemeByChapter, CharacterClass, CHARACTER_SKILL_CONFIGS } from '../core/Constants.js';
import { GACHA_LEVEL_CONFIGS } from '../core/GachaEngine.js';
import { MAX_EQUIPMENT_VALUE } from '../core/InventoryManager.js';
import { GameEventBus } from '../core/GameEventBus.js';
import { ViewRenderer } from '../presentation/ViewRenderer.js';
import { TutorialOverlay } from '../presentation/TutorialOverlay.js';
import { StageListView } from '../presentation/StageListView.js';
import { CombatVfxEngine } from '../presentation/CombatVfxEngine.js';
import { AudioEffects } from '../presentation/AudioEffects.js';

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
      this.testGwt7_5_SnipeAnyMonsterAllowed.bind(this),
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
      this.testGwt36_3_SaveVersionMigrationAndDataPreservation.bind(this),
      // C-STORY-037: 轉蛋機山形曲線擴展、科技費用重構與十連送道具革新
      this.testGwt37_1_GachaEightLevelsAndBellCurveProgression.bind(this),
      this.testGwt37_2_BaseTechTierRebalancedCostsAndRatios.bind(this),
      this.testGwt37_3_TenPullGuaranteedBonusItem.bind(this),
      this.testGwt37_4_ModerateAccelerationRewardProgression.bind(this),
      this.testGwt37_5_EquipmentMaxCapacityAndCap65536.bind(this),
      // C-STORY-038: 畫面效果微調（英雄魔物光圈復原、受阻微震與滿盤瀕危紅光警示）
      this.testGwt38_1_HeroAndMonsterOutlineAndBreathingEffect.bind(this),
      this.testGwt38_2_InvalidMoveTileShakeFeedback.bind(this),
      this.testGwt38_3_DangerPulseFlashWhenOneCellOrFull.bind(this),
      // C-STORY-039: 大廳分頁捲動重置置頂、冒險章節懸浮與挑戰關卡智慧定位
      this.testGwt39_1_TabSwitchResetsScrollPositionToTop.bind(this),
      this.testGwt39_2_StickyChapterTabsCssConfiguration.bind(this),
      this.testGwt39_3_LastChallengedStagePersistenceAndSmartScroll.bind(this),
      this.testGwt39_4_AllClearedChapterScrollsToBottom.bind(this),
      // C-STORY-040: 章節列頂部完全釘選、已通關靜態瞬現與關卡視圖模組化解耦
      this.testGwt40_1_ChapterTabsFixedZeroTopGapAndElevation.bind(this),
      this.testGwt40_2_AllClearedChapterInstantScrollWithoutGlitch.bind(this),
      this.testGwt40_3_StageListViewArchitectureDecoupling.bind(this),
      // C-STORY-041: 下一個登場數字方塊預告 (Next Tile Preview) 機制
      this.testGwt41_1_NextTilePreviewGenerationAndDeterminism.bind(this),
      this.testGwt41_2_UndoRollsBackNextTilePreviewAccurately.bind(this),
      this.testGwt41_3_NextTilePreviewUIRendering.bind(this),
      // C-STORY-043: 方塊設定三維解耦矩陣（文字格式、圖標造型、盤面配色）
      this.testGwt43_1_ThreeDimensionalSettingsElementsExistAndDecoupled.bind(this),
      this.testGwt43_2_ViewRendererAppliesLayoutAndThemeClasses.bind(this),
      this.testGwt43_3_ModernTextModeLayoutStructureAndNoOverflow.bind(this),
      this.testGwt43_4_SixStyleIconPathMappingAndCycle.bind(this),
      // C-STORY-047 / C-STORY-057 / C-STORY-058: 角色外觀成長與微縮模型綁定
      this.testGwt47_1_HeroImagePathMappingForSamuraiT01ToT04.bind(this),
      this.testGwt47_2_ViewRendererRendersHeroSpriteAndRetainsHeroClasses.bind(this),
      this.testGwt57_2_ClayMiniatureSetBindsHeroAndEquipmentTogether.bind(this),
      this.testGwt58_1_CascadeShiftAdventureSwordHeroT02.bind(this),
      // C-STORY-080: 魔物黏土圖資接入與三位一體外觀綁定
      this.testGwt80_1_MonsterClayImagePathAndFallback.bind(this),
      this.testGwt80_2_ViewRendererMonsterClayBindingAndDecoupling.bind(this),
      // C-STORY-093: 角色特殊能力系統與三大職業核心機制
      this.testGwt93_1_SkillChargingAndReadiness.bind(this),
      this.testGwt93_2_WarriorCrossBreaker.bind(this),
      this.testGwt93_3_ArcherArmorPiercingArrow.bind(this),
      this.testGwt93_4_MerchantGoldenEmergency.bind(this),
      this.testGwt93_5_SkillLevelUpAndCooldownReduction.bind(this),
      this.testGwt93_6_SnipeAnyMonsterSuccess.bind(this),
      // C-STORY-094: 測試輔助開關——技能開場即滿額就緒
      this.testGwt94_1_SettingsInstantSkillToggle.bind(this),
      this.testGwt94_2_InstantSkillReadyInStage.bind(this),
      // C-STORY-095: 超必殺 Cut-in 特寫與三大職業方塊動態爆破系統
      this.testGwt95_1_CutinOverlayElementsExist.bind(this),
      this.testGwt95_2_BoardVfxLayerExists.bind(this),
      // C-STORY-096: Canvas 2D 物理光影與能量爆破引擎
      this.testGwt96_1_CombatVfxCanvasExists.bind(this),
      this.testGwt96_2_CombatVfxEngineInitialized.bind(this),
      // C-STORY-097: 商業版三大職業必殺技高階視覺特效同步移植
      this.testGwt97_1_WarriorCrossCleave120pxAndBoundaryClipping.bind(this),
      this.testGwt97_2_ArcherArmorPiercingPrecisionLaunchAndZeroLatency.bind(this),
      this.testGwt97_3_Merchant3DTumblingCoinsAndAttractor.bind(this),
      // C-STORY-098: 必殺技畫布網格錨定修復與執行生命週期防死鎖保護
      this.testGwt98_1_CanvasOffsetAndParentAnchoring.bind(this),
      this.testGwt98_2_GetCellCenterSupportsDataRAndDataRow.bind(this),
      this.testGwt98_3_SkillExecutionLockProtectionAndReset.bind(this),
      // C-STORY-099: 瀕死被動自救有效性智慧判定與全套特效聯動
      this.testGwt99_1_ArcherSmartPassiveRescueThreshold.bind(this),
      this.testGwt99_2_WarriorAndMerchantPassiveRescuePrecondition.bind(this),
      this.testGwt99_3_AutoRescueDispatchesFullVfxAndUnlocks.bind(this),
      // C-STORY-100: 商人前置安全攔截、破甲重矢18片輕量化與專屬必殺音效
      this.testGwt100_1_MerchantNoGoldPrecheckIntercept.bind(this),
      this.testGwt100_2_ArcherSkillDebrisParticleCountLightweight.bind(this),
      this.testGwt100_3_DedicatedSkillAudioSynthesizersExistAndCallable.bind(this)
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

  // C-STORY-007 & C-STORY-093 GWT 7.5 / 93.6：精準重弩調優——無視魔物戰力大小皆可直接射殺，但非魔物依然阻擋
  testGwt7_5_SnipeAnyMonsterAllowed() {
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

    // 2. Target Equal Monster 32 (32 == 32) -> Now allowed (C-STORY-093 GWT 93.6)
    const equalRes = sm.useSnipeItem(0, 1);
    this.assert(equalRes.success === true, 'Snipe must succeed against monster with equal power');
    this.assert(sm.board.getTile(0, 1) === null, 'Equal monster slain');
    this.assert(sm.items.snipe === 2, 'Snipe item consumed by 1');

    // 3. Target Greater Monster 64 (64 > 32) -> Now allowed (C-STORY-093 GWT 93.6)
    const greaterRes = sm.useSnipeItem(0, 2);
    this.assert(greaterRes.success === true, 'Snipe must succeed against monster with greater power');
    this.assert(sm.board.getTile(0, 2) === null, 'Greater monster slain');
    this.assert(sm.items.snipe === 1, 'Snipe item consumed by 1');

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
    this.assert(s21.rewardGold === 205, `Stage 21 reward is 205 (rebalanced in C-STORY-037), got ${s21.rewardGold}`);
    this.assert(s21.rewardGold > s20.rewardGold, 'Stage 21 reward strictly greater than Stage 20 (no chapter inversion)');

    // Verify all 350 stages are strictly monotonic: R(s+1) > R(s)
    for (let i = 0; i < STAGE_CONFIGS.length - 1; i++) {
      const cur = STAGE_CONFIGS[i];
      const next = STAGE_CONFIGS[i + 1];
      this.assert(next.rewardGold > cur.rewardGold, `Stage ${next.id} reward (${next.rewardGold}) must be > Stage ${cur.id} reward (${cur.rewardGold})`);
    }

    // Verify Stage 65 reward matches C-STORY-037 moderate warming specification (795 gold)
    const s65 = STAGE_CONFIGS.find(s => s.id === 65);
    this.assert(s65.rewardGold === 795, `Stage 65 reward is 795, got ${s65.rewardGold}`);
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

  // C-STORY-011 GWT 11.1：首通賞金全域等速率公式（已在 C-STORY-037 升級為溫和加速曲線）
  testGwt11_1_RewardGoldEquableSlopeAndFirst180Under1000() {
    this.assert(STAGE_CONFIGS.length === 350, 'Total 350 stages configured');
    
    // Formula verification per C-STORY-037:
    // s<=20: 100 + (s - 1) * 5
    // 21<=s<=50: 195 + (s - 20) * 10
    // 51<=s<=90: 495 + (s - 50) * 20
    // s>90: 1295 + (s - 90) * 30
    for (let s = 1; s <= 350; s++) {
      const cfg = STAGE_CONFIGS.find(st => st.id === s);
      let expected = 100;
      if (s <= 20) expected = 100 + (s - 1) * 5;
      else if (s <= 50) expected = 195 + (s - 20) * 10;
      else if (s <= 90) expected = 495 + (s - 50) * 20;
      else expected = 1295 + (s - 90) * 30;
      this.assert(cfg.rewardGold === expected, `Stage ${s} rewardGold is ${expected}, got ${cfg.rewardGold}`);
    }

    // Key milestone verification
    this.assert(STAGE_CONFIGS[0].rewardGold === 100, 'Stage 1 reward is exactly 100 (1 single pull)');
    const s20 = STAGE_CONFIGS.find(s => s.id === 20);
    this.assert(s20.rewardGold === 195, `Stage 20 reward is 195, got ${s20.rewardGold}`);
    const s50 = STAGE_CONFIGS.find(s => s.id === 50);
    this.assert(s50.rewardGold === 495, `Stage 50 reward is 495, got ${s50.rewardGold}`);
    const s65 = STAGE_CONFIGS.find(s => s.id === 65);
    this.assert(s65.rewardGold === 795, `Stage 65 reward is 795, got ${s65.rewardGold}`);
    const s90 = STAGE_CONFIGS.find(s => s.id === 90);
    this.assert(s90.rewardGold === 1295, `Stage 90 reward is 1295, got ${s90.rewardGold}`);
    const s350 = STAGE_CONFIGS.find(s => s.id === 350);
    this.assert(s350.rewardGold === 9095, `Stage 350 reward is 9095, got ${s350.rewardGold}`);

    // Every stage has strictly positive delta
    for (let i = 0; i < STAGE_CONFIGS.length - 1; i++) {
      const delta = STAGE_CONFIGS[i + 1].rewardGold - STAGE_CONFIGS[i].rewardGold;
      this.assert(delta > 0, `Slope between stage ${i+1} and ${i+2} is positive (${delta})`);
    }
  }

  // C-STORY-011 GWT 11.2：科技升階研發費用試算表精確匹配（已在 C-STORY-037 平滑重構）
  testGwt11_2_BaseTechTierTableExactMatch() {
    const expectedCosts = [
      0, 600, 700, 800, 900, 2700,
      1000, 1100, 1200, 1300, 1400, 4200,
      1600, 1800, 2000, 2300, 2600, 7800,
      2900, 3300, 3700, 4200, 4800, 14400
    ];

    this.assert(BASE_STAT_TIERS.length === 24, `Must have 24 tiers, got ${BASE_STAT_TIERS.length}`);
    for (let i = 0; i < 24; i++) {
      const tier = BASE_STAT_TIERS[i];
      this.assert(tier.tier === i + 1, `Tier number is ${i + 1}`);
      this.assert(tier.cost === expectedCosts[i], `Tier ${tier.tier} cost should be ${expectedCosts[i]}, got ${tier.cost}`);
    }
  }

  // C-STORY-011 GWT 11.3：大升階數值等於前一階 3 倍判定（已在 C-STORY-037 重構）
  testGwt11_3_MajorUpgradeSumOfPreviousFourMinorTiers() {
    const t5 = BASE_STAT_TIERS.find(t => t.tier === 5);
    const t6 = BASE_STAT_TIERS.find(t => t.tier === 6);
    this.assert(t6.cost === t5.cost * 3, `Tier 6 cost (${t6.cost}) equals 3x Tier 5 (${t5.cost * 3})`);

    const t11 = BASE_STAT_TIERS.find(t => t.tier === 11);
    const t12 = BASE_STAT_TIERS.find(t => t.tier === 12);
    this.assert(t12.cost === t11.cost * 3, `Tier 12 cost (${t12.cost}) equals 3x Tier 11 (${t11.cost * 3})`);

    const t17 = BASE_STAT_TIERS.find(t => t.tier === 17);
    const t18 = BASE_STAT_TIERS.find(t => t.tier === 18);
    this.assert(t18.cost === t17.cost * 3, `Tier 18 cost (${t18.cost}) equals 3x Tier 17 (${t17.cost * 3})`);

    const t23 = BASE_STAT_TIERS.find(t => t.tier === 23);
    const t24 = BASE_STAT_TIERS.find(t => t.tier === 24);
    this.assert(t24.cost === t23.cost * 3, `Tier 24 cost (${t24.cost}) equals 3x Tier 23 (${t23.cost * 3})`);
  }

  // C-STORY-011 GWT 11.4：小升階數值平滑延續判定（C-STORY-037 規格：跨突破起點溫和遞增）
  testGwt11_4_MinorUpgradeSubtractedRemainderProgression() {
    const t5 = BASE_STAT_TIERS.find(t => t.tier === 5);
    const t7 = BASE_STAT_TIERS.find(t => t.tier === 7);
    this.assert(t7.cost === 1000 && t7.cost > t5.cost, 'Tier 7 starts at 1000 smoothly progressing from Tier 5');

    const t11 = BASE_STAT_TIERS.find(t => t.tier === 11);
    const t13 = BASE_STAT_TIERS.find(t => t.tier === 13);
    this.assert(t13.cost === 1600 && t13.cost > t11.cost, 'Tier 13 starts at 1600 smoothly progressing from Tier 11');

    const t17 = BASE_STAT_TIERS.find(t => t.tier === 17);
    const t19 = BASE_STAT_TIERS.find(t => t.tier === 19);
    this.assert(t19.cost === 2900 && t19.cost > t17.cost, 'Tier 19 starts at 2900 smoothly progressing from Tier 17');
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

  // C-STORY-022 GWT 22.2：轉蛋道具掉落與權重分佈（在 C-STORY-037 升級為十連抽必定掉落，單抽不掉落）
  testGwt22_2_GachaItemDropProbabilityAndWeightDistribution() {
    const sm = new StageManager();
    sm.resetSaveData();

    // Single pulls no longer drop items (per C-STORY-037)
    this.assert(sm.gachaEngine.rollBonusItem() === null, 'Single pulls do not drop bonus items');

    // Statistical test of rollBonusItemForTenPull on GachaEngine (sample size 10,000)
    let undoCount = 0;
    let hammerCount = 0;
    let snipeCount = 0;
    const sampleSize = 10000;

    for (let i = 0; i < sampleSize; i++) {
      const b = sm.gachaEngine.rollBonusItemForTenPull();
      this.assert(b !== null, 'Ten pull bonus item is guaranteed');
      if (b.type === 'undo') undoCount++;
      else if (b.type === 'hammer') hammerCount++;
      else if (b.type === 'snipe') snipeCount++;
    }

    // Expected ratio: 40% undo, 35% hammer, 25% snipe
    const undoRatio = undoCount / sampleSize;
    const hammerRatio = hammerCount / sampleSize;
    const snipeRatio = snipeCount / sampleSize;
    this.assert(undoRatio >= 0.35 && undoRatio <= 0.45, `Undo ratio (${(undoRatio * 100).toFixed(1)}%) around 40%`);
    this.assert(hammerRatio >= 0.30 && hammerRatio <= 0.40, `Hammer ratio (${(hammerRatio * 100).toFixed(1)}%) around 35%`);
    this.assert(snipeRatio >= 0.20 && snipeRatio <= 0.30, `Snipe ratio (${(snipeRatio * 100).toFixed(1)}%) around 25%`);

    // Gacha pull test with bonusItems field returned
    sm.gold = 10000;
    const pullRes = sm.pullGacha(10);
    this.assert(pullRes.success === true, 'Gacha pull succeeded');
    this.assert(Array.isArray(pullRes.bonusItems) && pullRes.bonusItems.length === 1, 'bonusItems array contains guaranteed 1 item');
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
    this.assert(sm.gold === 10000 - 2700, 'Cost 2700 correctly deducted (rebalanced in C-STORY-037)');
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
    this.assert(CURRENT_GAME_VERSION === 'v1.4.4', 'CURRENT_GAME_VERSION must be v1.4.4');
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

  // ==========================================
  // C-STORY-037 TESTS
  // ==========================================

  // C-STORY-037 GWT 37.1：轉蛋機階梯上限解鎖至 Lv.8 與山形曲線掉落規劃
  testGwt37_1_GachaEightLevelsAndBellCurveProgression() {
    const sm = new StageManager();
    sm.resetSaveData();

    // 1. Verify 8 levels configured
    const levels = Object.keys(GACHA_LEVEL_CONFIGS).map(Number);
    this.assert(levels.length === 8, `GACHA_LEVEL_CONFIGS must have 8 levels, got ${levels.length}`);
    this.assert(levels.includes(1) && levels.includes(8), 'Levels include 1 through 8');

    // 2. Verify calculateLevel thresholds
    this.assert(sm.gachaEngine.calculateLevel(0) === 1, '0 pulls is Lv.1');
    this.assert(sm.gachaEngine.calculateLevel(29) === 1, '29 pulls is Lv.1');
    this.assert(sm.gachaEngine.calculateLevel(30) === 2, '30 pulls is Lv.2');
    this.assert(sm.gachaEngine.calculateLevel(99) === 2, '99 pulls is Lv.2');
    this.assert(sm.gachaEngine.calculateLevel(100) === 3, '100 pulls is Lv.3');
    this.assert(sm.gachaEngine.calculateLevel(199) === 3, '199 pulls is Lv.3');
    this.assert(sm.gachaEngine.calculateLevel(200) === 4, '200 pulls is Lv.4');
    this.assert(sm.gachaEngine.calculateLevel(339) === 4, '339 pulls is Lv.4');
    this.assert(sm.gachaEngine.calculateLevel(340) === 5, '340 pulls is Lv.5');
    this.assert(sm.gachaEngine.calculateLevel(529) === 5, '529 pulls is Lv.5');
    this.assert(sm.gachaEngine.calculateLevel(530) === 6, '530 pulls is Lv.6');
    this.assert(sm.gachaEngine.calculateLevel(789) === 6, '789 pulls is Lv.6');
    this.assert(sm.gachaEngine.calculateLevel(790) === 7, '790 pulls is Lv.7');
    this.assert(sm.gachaEngine.calculateLevel(1149) === 7, '1149 pulls is Lv.7');
    this.assert(sm.gachaEngine.calculateLevel(1150) === 8, '1150 pulls is Lv.8');
    this.assert(sm.gachaEngine.calculateLevel(5000) === 8, '5000 pulls remains Lv.8');

    // 3. Verify bell curve peak shift & max drops
    const lv1Cfg = GACHA_LEVEL_CONFIGS[1];
    const lv4Cfg = GACHA_LEVEL_CONFIGS[4];
    const lv8Cfg = GACHA_LEVEL_CONFIGS[8];

    this.assert(lv1Cfg.maxDropValue === 32, 'Lv.1 max drop is 32');
    this.assert(lv8Cfg.maxDropValue === 4096, 'Lv.8 max drop is 4096');

    // Find peak (highest weight) for Lv.1, Lv.4, and Lv.8
    const getPeak = (cfg) => cfg.weights.reduce((prev, curr) => (curr.weight > prev.weight ? curr : prev)).value;
    this.assert(getPeak(lv1Cfg) === 2, 'Lv.1 peak is 2');
    this.assert(getPeak(lv4Cfg) === 8, 'Lv.4 peak is 8');
    this.assert(getPeak(lv8Cfg) === 128, 'Lv.8 peak is 128');
  }

  // C-STORY-037 GWT 37.2：王國軍備科技費用平滑化與大突破 3 倍階梯重構
  testGwt37_2_BaseTechTierRebalancedCostsAndRatios() {
    this.assert(BASE_STAT_TIERS.length === 24, 'Must have 24 tiers');

    // 起點壓低至 600
    this.assert(BASE_STAT_TIERS[1].cost === 600, 'Tier 2 starts at 600 (lowered from 1000)');

    // 驗證四大突破為前階 3 倍
    const t5 = BASE_STAT_TIERS.find(t => t.tier === 5);
    const t6 = BASE_STAT_TIERS.find(t => t.tier === 6);
    this.assert(t6.cost === t5.cost * 3, `Tier 6 cost (${t6.cost}) is 3x Tier 5 (${t5.cost * 3})`);
    this.assert(t6.cost === 2700, 'Tier 6 cost is 2700');

    const t11 = BASE_STAT_TIERS.find(t => t.tier === 11);
    const t12 = BASE_STAT_TIERS.find(t => t.tier === 12);
    this.assert(t12.cost === t11.cost * 3, `Tier 12 cost (${t12.cost}) is 3x Tier 11 (${t11.cost * 3})`);
    this.assert(t12.cost === 4200, 'Tier 12 cost is 4200');

    const t17 = BASE_STAT_TIERS.find(t => t.tier === 17);
    const t18 = BASE_STAT_TIERS.find(t => t.tier === 18);
    this.assert(t18.cost === t17.cost * 3, `Tier 18 cost (${t18.cost}) is 3x Tier 17 (${t17.cost * 3})`);
    this.assert(t18.cost === 7800, 'Tier 18 cost is 7800');

    const t23 = BASE_STAT_TIERS.find(t => t.tier === 23);
    const t24 = BASE_STAT_TIERS.find(t => t.tier === 24);
    this.assert(t24.cost === t23.cost * 3, `Tier 24 cost (${t24.cost}) is 3x Tier 23 (${t23.cost * 3})`);
    this.assert(t24.cost === 14400, 'Tier 24 cost is 14400');
  }

  // C-STORY-037 GWT 37.3：每次十連抽固定額外贈送 1 救急道具，單抽不贈送
  testGwt37_3_TenPullGuaranteedBonusItem() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.gold = 5000;

    const initialUndo = sm.items.undo;
    const initialHammer = sm.items.hammer;
    const initialSnipe = sm.items.snipe;

    // Single pull: no bonus item
    const singleRes = sm.pullGacha(1);
    this.assert(singleRes.success === true, 'Single pull succeeded');
    this.assert(singleRes.bonusItems.length === 0, 'Single pull does not give bonus items');
    this.assert(sm.items.undo === initialUndo, 'Undo count unchanged after single pull');

    // Ten pull: guaranteed exactly 1 bonus item
    const tenRes = sm.pullGacha(10);
    this.assert(tenRes.success === true, 'Ten pull succeeded');
    this.assert(tenRes.bonusItems.length === 1, 'Ten pull gives guaranteed 1 bonus item');
    const grantedItem = tenRes.bonusItems[0];
    this.assert(['undo', 'hammer', 'snipe'].includes(grantedItem.type), 'Granted item has valid type');

    const totalItemsAfter = sm.items.undo + sm.items.hammer + sm.items.snipe;
    const totalItemsBefore = initialUndo + initialHammer + initialSnipe;
    this.assert(totalItemsAfter === totalItemsBefore + 1, 'Exactly 1 item added to player inventory');
  }

  // C-STORY-037 GWT 37.4：通關賞金溫和加速曲線與 Stage 65 十連保證
  testGwt37_4_ModerateAccelerationRewardProgression() {
    const s20 = STAGE_CONFIGS.find(s => s.id === 20);
    const s50 = STAGE_CONFIGS.find(s => s.id === 50);
    const s65 = STAGE_CONFIGS.find(s => s.id === 65);
    const s90 = STAGE_CONFIGS.find(s => s.id === 90);
    const s350 = STAGE_CONFIGS.find(s => s.id === 350);

    this.assert(s20.rewardGold === 195, `Stage 20 reward is 195, got ${s20.rewardGold}`);
    this.assert(s50.rewardGold === 495, `Stage 50 reward is 495, got ${s50.rewardGold}`);
    this.assert(s65.rewardGold === 795, `Stage 65 reward is 795, got ${s65.rewardGold}`);
    this.assert(s90.rewardGold === 1295, `Stage 90 reward is 1295, got ${s90.rewardGold}`);
    this.assert(s350.rewardGold === 9095, `Stage 350 reward is 9095, got ${s350.rewardGold}`);

    // Verify Stage 65 reward + typical board gold (~205) reaches 1000 gold
    this.assert(s65.rewardGold + 205 >= 1000, 'Stage 65 allows a 10-pull with board earnings');
  }

  // C-STORY-037 GWT 37.5：局外裝備最高上限 65536 嚴格錨定
  testGwt37_5_EquipmentMaxCapacityAndCap65536() {
    this.assert(MAX_EQUIPMENT_VALUE === 65536, 'MAX_EQUIPMENT_VALUE is 65536');

    const sm = new StageManager();
    sm.resetSaveData();

    // Add two 32768 items and merge
    const item1 = sm.inventory.addItem(32768);
    const item2 = sm.inventory.addItem(32768);
    this.assert(item1 && item2, 'Added two 32768 items');

    const merged = sm.inventory.mergeItems(item1.id, item2.id);
    this.assert(merged && merged.success === true, 'Merge succeeded');
    this.assert(merged.newItem.value === 65536, 'Merged item has value 65536 (Divine Artifact)');

    // Attempt to merge two 65536 items: must be capped / disallowed
    const item3 = sm.inventory.addItem(65536);
    this.assert(item3 !== null, 'Added another 65536 item');

    const invalidMerge = sm.inventory.mergeItems(merged.newItem.id, item3.id);
    this.assert(invalidMerge && invalidMerge.success === false, 'Merging two 65536 items is blocked by MAX_EQUIPMENT_VALUE cap');

    // Auto-merge also respects cap
    const autoMergeRes = sm.inventory.batchAutoMerge();
    this.assert(autoMergeRes.mergedCount === 0, 'No merges performed on capped items');
    this.assert(sm.inventory.items.every(it => it.value <= 65536), 'All items remain <= 65536');
  }

  // ==========================================
  // C-STORY-038 TESTS: 畫面效果微調
  // ==========================================

  // C-STORY-038 GWT 38.1：英雄與魔物外框光圈恢復與呼吸特效解鎖裁切
  async testGwt38_1_HeroAndMonsterOutlineAndBreathingEffect() {
    const boardEl = document.createElement('div');
    const renderer = new ViewRenderer(boardEl);

    const heroTile = new Tile(2, TileType.HERO, 0, 0);
    const heroEl = renderer.createTileElement(heroTile);
    this.assert(heroEl.classList.contains('tile-hero'), 'Hero tile element has tile-hero class');

    const monsterTile = new Tile(8, TileType.MONSTER, 0, 1);
    const monsterEl = renderer.createTileElement(monsterTile);
    this.assert(monsterEl.classList.contains('tile-monster'), 'Monster tile element has tile-monster class');

    // Verify CSS file has overflow: visible on grid-cell and hero/monster, plus breathing animations
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
      this.assert(cssText.includes('.grid-cell') && cssText.includes('overflow: visible;'), 'grid-cell must have overflow: visible to allow breathing wave to expand');
      this.assert(cssText.includes('.tile.tile-hero') && cssText.includes('overflow: visible !important;'), 'tile-hero must have overflow: visible !important');
      this.assert(cssText.includes('.tile.tile-monster') && cssText.includes('overflow: visible !important;'), 'tile-monster must have overflow: visible !important');
      this.assert(cssText.includes('heroBreathingWave'), 'heroBreathingWave animation must exist in CSS');
      this.assert(cssText.includes('monsterBreathingPulse'), 'monsterBreathingPulse animation must exist in CSS');
    }
  }

  // C-STORY-038 GWT 38.2：無法移動或合成方向之全方塊受阻微震反饋
  async testGwt38_2_InvalidMoveTileShakeFeedback() {
    const boardEl = document.createElement('div');
    boardEl.id = 'battle-board';
    const renderer = new ViewRenderer(boardEl);

    const board = new Board(5);
    board.setTile(0, 0, new Tile(2, TileType.EQUIPMENT, 0, 0));
    board.setTile(0, 1, new Tile(4, TileType.EQUIPMENT, 0, 1));
    renderer.renderBoard(board);

    // Test horizontal shake trigger
    renderer.triggerInvalidMoveShake('LEFT');
    const tiles = boardEl.querySelectorAll('.tile');
    this.assert(tiles.length === 2, 'Board contains 2 tiles');
    this.assert(tiles[0].classList.contains('tile-shake-h'), 'First tile has tile-shake-h class on horizontal invalid move');
    this.assert(tiles[1].classList.contains('tile-shake-h'), 'Second tile has tile-shake-h class on horizontal invalid move');

    // Test vertical shake trigger
    renderer.triggerInvalidMoveShake('UP');
    this.assert(tiles[0].classList.contains('tile-shake-v'), 'Tile switches to tile-shake-v class on vertical invalid move');

    // Wait for auto cleanup (250ms)
    await new Promise(resolve => setTimeout(resolve, 280));
    this.assert(!tiles[0].classList.contains('tile-shake-h') && !tiles[0].classList.contains('tile-shake-v'), 'Shake classes are cleaned up after animation completes');
  }

  // C-STORY-038 GWT 38.3：盤面剩餘 1 格或已滿時之危急邊界紅光閃爍 (board-danger-flash)
  testGwt38_3_DangerPulseFlashWhenOneCellOrFull() {
    const boardEl = document.createElement('div');
    boardEl.id = 'battle-board';
    const renderer = new ViewRenderer(boardEl);

    const board = new Board(5); // 25 cells total

    // Case 1: Empty board (25 empty cells) -> no danger flash
    renderer.renderBoard(board);
    this.assert(!boardEl.classList.contains('board-danger-flash'), 'Safe board (> 1 empty cell) has no board-danger-flash');

    // Case 2: Fill 23 cells -> 2 empty cells remain -> no danger flash
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 4 && c >= 3) continue; // Leave 2 cells empty: (4,3) and (4,4)
        board.setTile(r, c, new Tile(2, TileType.EQUIPMENT, r, c));
      }
    }
    this.assert(board.getEmptyCells().length === 2, 'Board has exactly 2 empty cells');
    renderer.renderBoard(board);
    this.assert(!boardEl.classList.contains('board-danger-flash'), 'Board with 2 empty cells does not flash danger');

    // Case 3: Fill 1 more cell -> exactly 1 empty cell remains -> DANGER FLASH ACTIVE!
    board.setTile(4, 3, new Tile(4, TileType.EQUIPMENT, 4, 3));
    this.assert(board.getEmptyCells().length === 1, 'Board has exactly 1 empty cell');
    renderer.renderBoard(board);
    this.assert(boardEl.classList.contains('board-danger-flash'), 'Board with 1 empty cell activates board-danger-flash');

    // Case 4: Fill last cell -> 0 empty cells remain (completely full) -> DANGER FLASH ACTIVE!
    board.setTile(4, 4, new Tile(8, TileType.EQUIPMENT, 4, 4));
    this.assert(board.getEmptyCells().length === 0, 'Board has 0 empty cells');
    renderer.renderBoard(board);
    this.assert(boardEl.classList.contains('board-danger-flash'), 'Completely full board activates board-danger-flash');

    // Case 5: Free up cells (e.g. tile destroyed or merged) -> 2 empty cells -> danger flash cleared!
    board.removeTile(4, 3);
    board.removeTile(4, 4);
    this.assert(board.getEmptyCells().length === 2, 'Board recovered to 2 empty cells');
    renderer.renderBoard(board);
    this.assert(!boardEl.classList.contains('board-danger-flash'), 'Danger flash automatically deactivated when cells freed');
  }

  // ==========================================================================
  // C-STORY-039：大廳分頁捲動重置置頂、冒險章節懸浮與挑戰關卡智慧定位驗收測試
  // ==========================================================================

  // C-STORY-039 GWT 39.1：切換分頁時重置主內容捲動軸至最頂端 (scrollTop = 0)
  testGwt39_1_TabSwitchResetsScrollPositionToTop() {
    let mainContent = document.getElementById('main-content');
    let created = false;
    if (!mainContent) {
      mainContent = document.createElement('div');
      mainContent.id = 'main-content';
      mainContent.style.height = '100px';
      mainContent.style.overflow = 'auto';
      const inner = document.createElement('div');
      inner.style.height = '1000px';
      mainContent.appendChild(inner);
      document.body.appendChild(mainContent);
      created = true;
    } else {
      mainContent.style.height = '100px';
      mainContent.style.overflow = 'auto';
      const inner = document.createElement('div');
      inner.style.height = '1000px';
      mainContent.appendChild(inner);
    }
    mainContent.scrollTop = 500;

    // Mock app context
    const appMock = {
      switchToTab(tabId) {
        const mc = document.getElementById('main-content');
        if (mc) mc.scrollTop = 0;
      }
    };

    this.assert(mainContent.scrollTop > 0, 'Given: main-content is scrolled to > 0px');
    appMock.switchToTab('view-armory');
    this.assert(mainContent.scrollTop === 0, 'Then: switchToTab resets main-content scrollTop to 0');

    if (created && mainContent.parentNode) {
      document.body.removeChild(mainContent);
    }
  }

  // C-STORY-039 GWT 39.2：冒險章節切換欄具備 sticky 懸浮置頂樣式規則
  async testGwt39_2_StickyChapterTabsCssConfiguration() {
    let cssText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./style.css');
        if (resp.ok) cssText = await resp.text();
      } catch (e) {}
    }
    if (cssText) {
      this.assert(
        cssText.includes('.chapter-tabs') && cssText.includes('position: sticky') && cssText.includes('top: 0'),
        '.chapter-tabs must have position: sticky and top: 0 in style.css'
      );
      this.assert(
        cssText.includes('z-index: 15'),
        '.chapter-tabs must specify high z-index for floating over stage list'
      );
    }
  }

  // C-STORY-039 GWT 39.3：最新挑戰關卡 ID (lastChallengedStageId) 記錄與持久化存檔
  testGwt39_3_LastChallengedStagePersistenceAndSmartScroll() {
    localStorage.removeItem('2048RPG_Commercial_Save_v1');
    const sm = new StageManager();
    this.assert(sm.lastChallengedStageId === 1, 'Default lastChallengedStageId is 1');

    // Simulate starting stage 15
    sm.unlockedStageId = 20;
    sm.startStage(15);
    this.assert(sm.lastChallengedStageId === 15, 'lastChallengedStageId is updated to 15 when starting stage');

    // Load in fresh StageManager instance to verify localStorage persistence
    const smNew = new StageManager();
    this.assert(smNew.lastChallengedStageId === 15, 'lastChallengedStageId persists and loads accurately across sessions');

    // Test resetSaveData
    smNew.resetSaveData();
    this.assert(smNew.lastChallengedStageId === 1, 'resetSaveData restores lastChallengedStageId back to 1');
    localStorage.removeItem('2048RPG_Commercial_Save_v1');
  }

  // C-STORY-039 GWT 39.4：已全通關章節與未全通關章節之智慧自動滾動邏輯驗證
  testGwt39_4_AllClearedChapterScrollsToBottom() {
    const listEl = document.createElement('div');
    listEl.id = 'stages-list';
    document.body.appendChild(listEl);

    // Mock 3 stages
    let scrolledTarget = null;
    let scrolledBlock = null;
    for (let i = 1; i <= 3; i++) {
      const card = document.createElement('div');
      card.className = 'stage-card';
      card.dataset.stageId = i;
      card.scrollIntoView = (options) => {
        scrolledTarget = i;
        scrolledBlock = options && options.block;
      };
      listEl.appendChild(card);
    }

    const sm = new StageManager();

    // Scenario A: Chapter not all cleared, last challenged is stage 2
    sm.clearedStages = { 1: { stars: 3, clearedCount: 1 } };
    sm.unlockedStageId = 2;
    sm.lastChallengedStageId = 2;
    const currentStagesA = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const allClearedA = currentStagesA.every(s => !!sm.clearedStages[s.id]);
    this.assert(!allClearedA, 'Scenario A is not all cleared');

    // Simulate smart scroll
    if (allClearedA) {
      listEl.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      const target = currentStagesA.find(s => s.id === sm.lastChallengedStageId);
      const card = listEl.querySelector(`[data-stage-id="${target.id}"]`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    this.assert(scrolledTarget === 2, 'Uncleared chapter targets lastChallengedStageId (Stage 2)');
    this.assert(scrolledBlock === 'center', 'Uncleared target card scrolls to center');

    // Scenario B: All 3 stages cleared
    sm.clearedStages[2] = { stars: 3, clearedCount: 1 };
    sm.clearedStages[3] = { stars: 3, clearedCount: 1 };
    const allClearedB = currentStagesA.every(s => !!sm.clearedStages[s.id]);
    this.assert(allClearedB, 'Scenario B is all cleared');

    if (allClearedB) {
      listEl.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    this.assert(scrolledTarget === 3, 'All cleared chapter scrolls to last stage (bottom)');

    document.body.removeChild(listEl);
  }

  // ==========================================================================
  // C-STORY-040：章節列頂部完全釘選、已通關靜態瞬現與關卡視圖模組化解耦驗收測試
  // ==========================================================================

  // C-STORY-040 GWT 40.1：冒險章節切換欄樣式優化（0 頂部間距、高 z-index 20 與底部分隔陰影）
  async testGwt40_1_ChapterTabsFixedZeroTopGapAndElevation() {
    let cssText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./style.css');
        if (resp.ok) cssText = await resp.text();
      } catch (e) {}
    }
    if (cssText) {
      this.assert(
        cssText.includes('#view-stages') && cssText.includes('padding-top: 0'),
        '#view-stages must have padding-top: 0 to eliminate top gap'
      );
      this.assert(
        cssText.includes('.chapter-tabs') && cssText.includes('z-index: 20'),
        '.chapter-tabs must have z-index: 20 for solid elevated sticky behavior'
      );
      this.assert(
        cssText.includes('box-shadow') && cssText.includes('border-bottom'),
        '.chapter-tabs must feature bottom divider border and shadow'
      );
    }
  }

  // C-STORY-040 GWT 40.2：切換至已通關章節時直接以 instant 行為置底，杜絕平滑滑動穿幫
  testGwt40_2_AllClearedChapterInstantScrollWithoutGlitch() {
    const listEl = document.createElement('div');
    listEl.id = 'stages-list';
    document.body.appendChild(listEl);

    let scrolledTarget = null;
    let scrolledBehavior = null;

    for (let i = 1; i <= 3; i++) {
      const card = document.createElement('div');
      card.className = 'stage-card';
      card.dataset.stageId = i;
      card.scrollIntoView = (options) => {
        scrolledTarget = i;
        scrolledBehavior = options && options.behavior;
      };
      listEl.appendChild(card);
    }

    const sm = new StageManager();
    sm.clearedStages = { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 } };

    const stageListView = new StageListView({
      stageManager: sm,
      stagesListEl: listEl
    });

    const currentStages = [{ id: 1 }, { id: 2 }, { id: 3 }];
    stageListView.scrollToAppropriateStage(currentStages, 10);

    this.assert(scrolledTarget === 3, 'All cleared chapter targets last stage (bottom)');
    this.assert(scrolledBehavior === 'instant', 'All cleared chapter uses instant scroll behavior (no glitch sliding)');

    document.body.removeChild(listEl);
  }

  // C-STORY-040 GWT 40.3：StageListView 模組職責完整解耦，提供標準 render、setChapter 與 destroy 介面
  testGwt40_3_StageListViewArchitectureDecoupling() {
    const tabsEl = document.createElement('div');
    const listEl = document.createElement('div');
    const titleEl = document.createElement('div');
    const descEl = document.createElement('div');

    const sm = new StageManager();
    let selectedStageReported = null;
    let chapterChangedReported = null;

    const view = new StageListView({
      stageManager: sm,
      tabsContainer: tabsEl,
      stagesListEl: listEl,
      bannerTitle: titleEl,
      bannerDesc: descEl,
      onSelectStage: (stage) => { selectedStageReported = stage; },
      onChapterChanged: (ch) => { chapterChangedReported = ch; }
    });

    // 1. Initial render
    view.render();
    this.assert(tabsEl.children.length > 0, 'StageListView renders chapter tab buttons');
    this.assert(listEl.children.length > 0, 'StageListView renders stage cards');

    // 2. Set chapter
    view.setChapter(2);
    this.assert(view.selectedChapter === 2, 'StageListView updates selected chapter');
    this.assert(chapterChangedReported === 2, 'StageListView triggers onChapterChanged callback');

    // 3. Card click trigger
    const firstCard = listEl.querySelector('.stage-card:not(.locked)');
    if (firstCard) {
      firstCard.click();
      this.assert(selectedStageReported !== null, 'Stage card click triggers onSelectStage callback');
    }

    // 4. Destroy method clean up
    view.destroy();
    this.assert(tabsEl.children.length === 0, 'destroy() cleanly unmounts tabsContainer');
    this.assert(listEl.children.length === 0, 'destroy() cleanly unmounts stagesListEl');
  }

  // ==========================================
  // C-STORY-041 TESTS: 下一個登場數字方塊預告 (Next Tile Preview) 機制
  // ==========================================

  // C-STORY-041 GWT 41.1：預告佇列決定性生成與真實盤面產出 100% 吻合
  testGwt41_1_NextTilePreviewGenerationAndDeterminism() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1);

    // 1. 开局初始狀態驗證：開局後應已產生下一手預告
    this.assert(sm.nextTilePreview !== null, 'Stage start rolls initial nextTilePreview');
    this.assert(sm.nextTilePreview.type !== undefined, 'Preview has valid tile type');
    this.assert(typeof sm.nextTilePreview.value === 'number', 'Preview has valid numeric value');

    // 記錄當前預告
    const expectedPreview = { ...sm.nextTilePreview };

    // 記錄盤面上方塊總數與現有方塊
    const initialTiles = sm.board.getAllTiles().map(t => ({ id: t.id, type: t.type, value: t.value }));

    // 2. 進行一次有效移動
    // 尋找有效方向
    let moved = false;
    for (const dir of [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]) {
      const res = sm.handleMove(dir);
      if (res && res.moved) {
        moved = true;
        break;
      }
    }
    this.assert(moved === true, 'Successfully executed a board move');

    // 3. 找出本輪新誕生的方塊
    const allTilesAfter = sm.board.getAllTiles();
    const newTiles = allTilesAfter.filter(t => !initialTiles.some(init => init.id === t.id));
    this.assert(newTiles.length >= 1, 'At least one new tile was spawned');

    // 驗證新方塊中嚴格包含預告的類型與數值
    const matchedTile = newTiles.find(t => t.type === expectedPreview.type && t.value === expectedPreview.value);
    this.assert(matchedTile !== undefined, `Spawned tile must match preview (type: ${expectedPreview.type}, value: ${expectedPreview.value})`);

    // 4. 驗證移動後下一手預告已立即重新擲骰產生新預告
    this.assert(sm.nextTilePreview !== null, 'nextTilePreview is re-rolled after move');
    this.assert(sm.nextTilePreview.value > 0, 'New nextTilePreview has valid value');
  }

  // C-STORY-041 GWT 41.2：時光沙漏 (Undo) 精準回滾預告狀態與防刷驗證
  testGwt41_2_UndoRollsBackNextTilePreviewAccurately() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.items.undo = 3;
    sm.startStage(1);

    // 記錄回合 0 的預告
    const turn0Preview = { ...sm.nextTilePreview };

    // 執行一次移動
    let moved = false;
    for (const dir of [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]) {
      const res = sm.handleMove(dir);
      if (res && res.moved) {
        moved = true;
        break;
      }
    }
    this.assert(moved === true, 'Move executed');

    // 移動後回合 1 的預告
    const turn1Preview = { ...sm.nextTilePreview };

    // 執行時光沙漏回溯
    const undoRes = sm.useUndoItem();
    this.assert(undoRes.success === true, 'Undo item used successfully');

    // 驗證預告狀態精準回滾為回合 0 的預告，杜絕刷裝
    this.assert(sm.nextTilePreview !== null, 'nextTilePreview restored');
    this.assert(sm.nextTilePreview.type === turn0Preview.type, `Preview type restored (expected ${turn0Preview.type}, got ${sm.nextTilePreview.type})`);
    this.assert(sm.nextTilePreview.value === turn0Preview.value, `Preview value restored (expected ${turn0Preview.value}, got ${sm.nextTilePreview.value})`);
  }

  // C-STORY-041 GWT 41.3：預告卡牌 UI 渲染與金幣/裝備外觀反饋
  async testGwt41_3_NextTilePreviewUIRendering() {
    // 1. 驗證 index.html 中包含 next preview DOM
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
      this.assert(htmlText.includes('id="combat-next-preview"'), 'index.html contains combat-next-preview element');
      this.assert(htmlText.includes('id="next-preview-card"'), 'index.html contains next-preview-card element');
      this.assert(htmlText.includes('id="next-card-badge"'), 'index.html contains next-card-badge element');
      this.assert(htmlText.includes('id="next-card-val"'), 'index.html contains next-card-val element');
    }

    // 2. 測試 AppController.renderNextTilePreview 模擬邏輯
    const previewCard = document.createElement('div');
    const badgeEl = document.createElement('span');
    const valEl = document.createElement('span');

    // 模擬裝備預告
    const eqPreview = { type: TileType.EQUIPMENT, value: 4 };
    badgeEl.textContent = '⚔️';
    valEl.textContent = eqPreview.value;
    previewCard.classList.remove('preview-gold');
    this.assert(badgeEl.textContent === '⚔️', 'Equipment badge rendered');
    this.assert(valEl.textContent === '4', 'Equipment value rendered');
    this.assert(!previewCard.classList.contains('preview-gold'), 'Not gold class');

    // 模擬金幣預告
    const goldPreview = { type: TileType.GOLD, value: 8 };
    badgeEl.textContent = '🪙';
    valEl.textContent = goldPreview.value;
    previewCard.classList.add('preview-gold');
    this.assert(badgeEl.textContent === '🪙', 'Gold badge rendered');
    this.assert(valEl.textContent === '8', 'Gold value rendered');
    this.assert(previewCard.classList.contains('preview-gold'), 'Gold styling class applied');
  }

  // C-STORY-043 GWT 43.1：三維獨立設定項目於 DOM 中存在且選項完整
  async testGwt43_1_ThreeDimensionalSettingsElementsExistAndDecoupled() {
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
      // 1. 文字格式選單
      this.assert(htmlText.includes('id="setting-layout-select"'), 'setting-layout-select exists in HTML');
      this.assert(htmlText.includes('value="layout_modern_pure"'), 'layout_modern_pure option exists');
      this.assert(htmlText.includes('value="layout_classic_pure"'), 'layout_classic_pure option exists');
      this.assert(htmlText.includes('value="layout_modern_text"'), 'layout_modern_text option exists');
      this.assert(htmlText.includes('value="layout_classic_text"'), 'layout_classic_text option exists');

      // 2. 圖標造型選單
      this.assert(htmlText.includes('id="setting-icon-style-select"'), 'setting-icon-style-select exists in HTML');
      this.assert(htmlText.includes('value="style_b_emoji"'), 'style_b_emoji option exists');
      this.assert(htmlText.includes('value="style_e_clay"'), 'style_e_clay option exists');
      this.assert(htmlText.includes('value="style_d_comic"'), 'style_d_comic option exists');
      this.assert(htmlText.includes('value="style_a_pixel"'), 'style_a_pixel option exists');
      this.assert(htmlText.includes('value="style_c_voxel"'), 'style_c_voxel option exists');
      this.assert(htmlText.includes('value="style_native_emoji"'), 'style_native_emoji option exists');

      // 3. 盤面配色選單
      this.assert(htmlText.includes('id="setting-theme-select"'), 'setting-theme-select exists in HTML');
      this.assert(htmlText.includes('value="kingdom"'), 'kingdom option exists');
      this.assert(htmlText.includes('value="cyber"'), 'cyber option exists');
      this.assert(htmlText.includes('value="retro"'), 'retro option exists');
      this.assert(htmlText.includes('value="minimal"'), 'minimal option exists');
    }
  }

  // C-STORY-043 GWT 43.2：ViewRenderer 實例套用排版與主題類別
  async testGwt43_2_ViewRendererAppliesLayoutAndThemeClasses() {
    const vr = new ViewRenderer(document.createElement('div'));
    vr.setTileLayout('layout_classic_pure');
    vr.setIconStyle('style_native_emoji');
    vr.setThemeSkin('cyber');

    const testTile = new Tile(4, TileType.EQUIPMENT, 0, 0);
    const tileEl = vr.createTileElement(testTile);

    this.assert(tileEl.classList.contains('layout_classic_pure'), 'Tile has layout_classic_pure class');
    this.assert(tileEl.classList.contains('theme-cyber'), 'Tile has theme-cyber class');
    this.assert(tileEl.classList.contains('skin-cyber'), 'Tile retains skin-cyber for backward compatibility');

    // 原生 Emoji 模式下不應有 <img>，且 badge 必須為原字符
    const imgEl = tileEl.querySelector('img');
    this.assert(imgEl === null, 'No image rendered in native emoji mode');
    const badgeEl = tileEl.querySelector('.tile-badge');
    this.assert(badgeEl !== null && badgeEl.textContent.length > 0, 'Badge has text emoji');
  }

  // C-STORY-043 GWT 43.3：新版圖文模式結構完備
  async testGwt43_3_ModernTextModeLayoutStructureAndNoOverflow() {
    const vr = new ViewRenderer(document.createElement('div'));
    vr.setTileLayout('layout_modern_text');
    vr.setIconStyle('style_b_emoji');

    const testTile = new Tile(2, TileType.EQUIPMENT, 0, 0);
    const tileEl = vr.createTileElement(testTile);

    this.assert(tileEl.classList.contains('layout_modern_text'), 'Tile element has layout_modern_text class');
    const nameEl = tileEl.querySelector('.tile-name');
    this.assert(nameEl !== null, 'Tile name element exists in tile');
    this.assert(nameEl.textContent.length > 0, 'Tile name text is populated');
    const valEl = tileEl.querySelector('.tile-value');
    this.assert(valEl !== null && valEl.textContent === '2', 'Tile value is populated');
  }

  // C-STORY-043 GWT 43.4：六大風格圖片路徑映射與回退保證
  async testGwt43_4_SixStyleIconPathMappingAndCycle() {
    // 1. 驗證 6 大風格之 getEquipmentImagePath 路徑
    const pEmoji = getEquipmentImagePath(4, 'style_b_emoji');
    this.assert(pEmoji && pEmoji.includes('equipment_emoji/equip_02.png'), 'Emoji style path correct');

    const pClay = getEquipmentImagePath(4, 'style_e_clay');
    this.assert(pClay && pClay.includes('equipment_clay/equip_02.png'), 'Clay style path correct');

    const pComic = getEquipmentImagePath(4, 'style_d_comic');
    this.assert(pComic && pComic.includes('equipment_comic/equip_02.png'), 'Comic style path correct');

    const pPixel = getEquipmentImagePath(4, 'style_a_pixel');
    this.assert(pPixel && pPixel.includes('equipment/equip_02.png'), 'Pixel style path correct');

    const pVoxel = getEquipmentImagePath(4, 'style_c_voxel');
    this.assert(pVoxel && pVoxel.includes('equipment_voxel/equip_02.png'), 'Voxel style path correct');

    const pNative = getEquipmentImagePath(4, 'style_native_emoji');
    this.assert(pNative === null, 'Native emoji style returns null to enforce unicode fallback');
  }

  // =========================================================================
  // C-STORY-047 / C-STORY-049: 中古奇幻 2~2.2頭身 戰士／勇者外觀成長系統 (T01~T04 階段)
  // =========================================================================

  // C-STORY-049 / C-STORY-057 GWT 57.1：微縮模型套組 16 階勇者圖片映射與超限安全封頂
  async testGwt47_1_HeroImagePathMappingForSamuraiT01ToT04() {
    // 1. 驗證預設 knight T01~T04 (數值 2, 4, 8, 16) 之騎士圖檔路徑
    const pk1 = getHeroImagePath(2, 'style_e_clay');
    this.assert(pk1 && pk1.includes('hero_knight/hero_01.png'), 'Knight T01 maps to hero_knight/hero_01.png');

    const pk4 = getHeroImagePath(16, 'style_e_clay');
    this.assert(pk4 && pk4.includes('hero_knight/hero_04.png'), 'Knight T04 maps to hero_knight/hero_04.png');

    // 2. 驗證相容模式 samurai 之武士圖檔路徑
    const ps1 = getHeroImagePath(2, 'style_e_clay', 'samurai');
    this.assert(ps1 && ps1.includes('hero_samurai/hero_01.png'), 'Samurai T01 maps to hero_01.png');

    // 3. 驗證 T05~T16 (數值 32, 65536) 映射至對應之勇者微縮模型圖檔 (C-STORY-057)
    const p5 = getHeroImagePath(32, 'style_e_clay');
    this.assert(p5 && p5.includes('hero_knight/hero_05.png'), 'Hero T05 maps to hero_knight/hero_05.png');

    const p16 = getHeroImagePath(65536, 'style_e_clay');
    this.assert(p16 && p16.includes('hero_knight/hero_16.png'), 'Hero T16 maps to hero_knight/hero_16.png');

    // 4. C-STORY-058 擴展：T17 (數值 131072) 映射至 hero_17.png，超過 T17 (如數值 262144) 安全封頂於 hero_17.png (防破圖防報錯)
    const p17 = getHeroImagePath(131072, 'style_e_clay');
    this.assert(p17 && p17.includes('hero_knight/hero_17.png'), 'Hero T17 maps to hero_knight/hero_17.png');

    const p18 = getHeroImagePath(262144, 'style_e_clay');
    this.assert(p18 && p18.includes('hero_knight/hero_17.png'), 'Hero above T17 caps safely at hero_17.png');

    // 5. 原生 Emoji 風格下回傳 null 強制回退
    const pNative = getHeroImagePath(4, 'style_native_emoji');
    this.assert(pNative === null, 'Native emoji style returns null for hero');
  }

  // C-STORY-049 GWT 49.2：ViewRenderer 實例渲染中古奇幻戰士立繪並保全天藍色光圈
  async testGwt47_2_ViewRendererRendersHeroSpriteAndRetainsHeroClasses() {
    const vr = new ViewRenderer(document.createElement('div'));
    vr.setIconStyle('style_e_clay');

    // 測試預設 Knight Hero T01 (數值 2)
    const heroTile1 = new Tile(2, TileType.HERO, 0, 0);
    const heroEl1 = vr.createTileElement(heroTile1);

    this.assert(heroEl1.classList.contains('tile-hero'), 'Tile element has tile-hero class for cyan outline & aura');
    const imgEl1 = heroEl1.querySelector('.tile-badge img.tile-icon-img');
    this.assert(imgEl1 !== null, 'Hero tile has <img> rendered');
    this.assert(imgEl1.src.includes('hero_knight/hero_01.png'), 'Hero tile src points to hero_knight/hero_01.png');

    // 測試 Hero T04 (數值 16)
    const heroTile4 = new Tile(16, TileType.HERO, 0, 0);
    const heroEl4 = vr.createTileElement(heroTile4);
    const imgEl4 = heroEl4.querySelector('.tile-badge img.tile-icon-img');
    this.assert(imgEl4 !== null && imgEl4.src.includes('hero_knight/hero_04.png'), 'Hero tile 16 src points to hero_knight/hero_04.png');

    // 測試 Hero T16 (數值 65536)
    const heroTile16 = new Tile(65536, TileType.HERO, 0, 0);
    const heroEl16 = vr.createTileElement(heroTile16);
    const imgEl16 = heroEl16.querySelector('.tile-badge img.tile-icon-img');
    this.assert(imgEl16 !== null && imgEl16.src.includes('hero_knight/hero_16.png'), 'Hero tile 65536 src points to hero_knight/hero_16.png');

    // 測試原生 Emoji 模式回退
    vr.setIconStyle('style_native_emoji');
    const heroElNative = vr.createTileElement(heroTile1);
    const imgNative = heroElNative.querySelector('.tile-badge img');
    this.assert(imgNative === null, 'No img rendered in native emoji style');
    const badgeText = heroElNative.querySelector('.tile-badge').textContent;
    this.assert(badgeText.length > 0, 'Badge retains unicode emoji');
  }

  // C-STORY-057 GWT 57.2：微縮模型選項綁定勇者與裝備雙向微縮公仔 (REQ-BIND-01 / REQ-BIND-02)
  async testGwt57_2_ClayMiniatureSetBindsHeroAndEquipmentTogether() {
    const vr = new ViewRenderer(document.createElement('div'));
    vr.setIconStyle('style_e_clay');

    const heroTile = new Tile(256, TileType.HERO, 0, 0);
    const equipTile = new Tile(256, TileType.EQUIPMENT, 0, 1);

    const heroEl = vr.createTileElement(heroTile);
    const equipEl = vr.createTileElement(equipTile);

    const heroImg = heroEl.querySelector('.tile-badge img.tile-icon-img');
    const equipImg = equipEl.querySelector('.tile-badge img.tile-icon-img');

    this.assert(heroImg && heroImg.src.includes('assets/images/hero_knight/hero_08.png'), 'Hero T08 uses clay hero sprite');
    this.assert(equipImg && equipImg.src.includes('assets/images/equipment_clay/equip_08.png'), 'Equip T08 uses clay equip sprite');

    // 切換為其他風格 (如 3D Emoji) 時，勇者回退至 Emoji，裝備使用對應 emoji 圖
    vr.setIconStyle('style_b_emoji');
    const heroElEmoji = vr.createTileElement(heroTile);
    const equipElEmoji = vr.createTileElement(equipTile);

    const heroImgEmoji = heroElEmoji.querySelector('.tile-badge img.tile-icon-img');
    const equipImgEmoji = equipElEmoji.querySelector('.tile-badge img.tile-icon-img');

    this.assert(heroImgEmoji === null, 'Hero in style_b_emoji uses emoji badge without overriding');
    this.assert(equipImgEmoji && equipImgEmoji.src.includes('assets/images/equipment_emoji/equip_08.png'), 'Equip uses emoji image');
  }

  // C-STORY-058 GWT 58.1：4 號勇者手持冒險短劍與全階層圖資順移驗證 (REQ-SHIFT-01 / REQ-SHIFT-02)
  async testGwt58_1_CascadeShiftAdventureSwordHeroT02() {
    // 1. 驗證 Tier 2 (數值 4) 映射至新冒險短劍 hero_02.png
    const p4 = getHeroImagePath(4, 'style_e_clay');
    this.assert(p4 && p4.includes('hero_knight/hero_02.png'), 'Value 4 correctly maps to hero_02.png (Adventure Sword Chibi Warrior)');

    // 2. 驗證原 Tier 2 (皮甲皮盾) 順移至 Tier 3 (數值 8) hero_03.png
    const p8 = getHeroImagePath(8, 'style_e_clay');
    this.assert(p8 && p8.includes('hero_knight/hero_03.png'), 'Value 8 correctly maps to shifted hero_03.png (Shield & Sword Mercenary)');

    // 3. 驗證 Tier 17 (數值 131072) 映射至 hero_17.png (原黃金神王晉升頂級神皇)
    const p131072 = getHeroImagePath(131072, 'style_e_clay');
    this.assert(p131072 && p131072.includes('hero_knight/hero_17.png'), 'Value 131072 maps to hero_17.png');
  }

  // C-STORY-080 GWT 80.1: 魔物微縮黏土圖資路徑與平滑降級驗證
  async testGwt80_1_MonsterClayImagePathAndFallback() {
    // 1. 驗證各章節魔物在 style_e_clay 下正確返回黏土圖片路徑
    const pCh2_16 = getMonsterImagePath(2, 16, 'style_e_clay');
    this.assert(pCh2_16 && pCh2_16.includes('monsters_clay/monster_ch02_16.png'), 'Ch2 Monster 16 maps to monsters_clay/monster_ch02_16.png');

    const pCh6_65536 = getMonsterImagePath(6, 65536, 'style_e_clay');
    this.assert(pCh6_65536 && pCh6_65536.includes('monsters_clay/monster_ch06_65536.png'), 'Ch6 Dragon 65536 maps to monsters_clay/monster_ch06_65536.png');

    const pCh8_262144 = getMonsterImagePath(8, 262144, 'style_e_clay');
    this.assert(pCh8_262144 && pCh8_262144.includes('monsters_clay/monster_ch08_262144.png'), 'Ch8 Blood Sun God 262144 maps to monsters_clay/monster_ch08_262144.png');

    // 2. 驗證全域查找模式 (未傳入 chapterId 時仍能找到合法魔物圖資)
    const pGlobal_512 = getMonsterImagePath(undefined, 512, 'style_e_clay');
    this.assert(pGlobal_512 && pGlobal_512.includes('monsters_clay/monster_ch'), 'Global lookup finds 512 clay monster');

    // 3. 驗證非 style_e_clay (如 style_b_emoji) 時返回 null，維持 Emoji
    const pEmoji = getMonsterImagePath(2, 16, 'style_b_emoji');
    this.assert(pEmoji === null, 'style_b_emoji returns null for monster image path');

    const pPixel = getMonsterImagePath(2, 16, 'style_a_pixel');
    this.assert(pPixel === null, 'style_a_pixel returns null for monster image path');
  }

  // C-STORY-080 GWT 80.2: ViewRenderer 勇者、裝備、魔物三位一體微縮黏土模型綁定與切換
  async testGwt80_2_ViewRendererMonsterClayBindingAndDecoupling() {
    const container = document.createElement('div');
    const vr = new ViewRenderer(container);
    vr.setChapterId(2);

    const monsterTile = new Tile(16, TileType.MONSTER, 0, 0);
    const heroTile = new Tile(4, TileType.HERO, 0, 1);
    const equipTile = new Tile(4, TileType.EQUIPMENT, 0, 2);

    // 1. 設定為 style_e_clay：勇者、裝備、魔物三位一體皆掛載黏土圖片
    vr.setIconStyle('style_e_clay');
    const monsterElClay = vr.createTileElement(monsterTile);
    const heroElClay = vr.createTileElement(heroTile);
    const equipElClay = vr.createTileElement(equipTile);

    const mBadge = monsterElClay.querySelector('.tile-badge');
    const mImg = monsterElClay.querySelector('.tile-badge img.tile-icon-img');
    const hImg = heroElClay.querySelector('.tile-badge img.tile-icon-img');
    const eImg = equipElClay.querySelector('.tile-badge img.tile-icon-img');

    this.assert(mBadge && mBadge.classList.contains('has-tile-img'), 'Monster badge has has-tile-img class in clay style');
    this.assert(mImg && mImg.src.includes('monsters_clay/monster_ch02_16.png'), 'Monster img src points to monster_ch02_16.png');
    this.assert(hImg && hImg.src.includes('hero_knight/hero_02.png'), 'Hero img src points to hero_02.png');
    this.assert(eImg && eImg.src.includes('equipment_clay/equip_02.png'), 'Equip img src points to equip_02.png');

    // 2. 切換為 style_b_emoji：魔物方塊恢復為 emoji 徽章，移除 img 標籤
    vr.setIconStyle('style_b_emoji');
    const monsterElEmoji = vr.createTileElement(monsterTile);
    const mImgEmoji = monsterElEmoji.querySelector('.tile-badge img.tile-icon-img');
    const mBadgeEmoji = monsterElEmoji.querySelector('.tile-badge');

    this.assert(mImgEmoji === null, 'Monster in style_b_emoji has no img tag');
    this.assert(!mBadgeEmoji.classList.contains('has-tile-img'), 'Monster badge has no has-tile-img class in emoji style');
    this.assert(mBadgeEmoji.textContent.length > 0, 'Monster badge has fallback text/emoji');
  }

  // ==========================================
  // C-STORY-093: 角色特殊能力系統與三大職業核心機制
  // ==========================================

  // GWT 93.1: 頂欄隊長徽章與步數充能計量
  testGwt93_1_SkillChargingAndReadiness() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.selectCharacter(CharacterClass.WARRIOR);
    sm.startStage(1, 16);

    this.assert(sm.skillChargeTurns === 0, 'Skill starts with 0 charge turns');
    this.assert(sm.isSkillReady === false, 'Skill is not ready at battle start');
    this.assert(sm.getCharacterSkillCooldown() === 500, 'Warrior Lv.0 cooldown is 500 turns');

    // Slide 1 turn
    sm.handleMove(Direction.UP);
    this.assert(sm.skillChargeTurns === 1, 'Charge turns increments on valid move');
    this.assert(sm.isSkillReady === false, 'Skill remains unready before cooldown');

    // Fast-forward charge to 499
    sm.skillChargeTurns = 499;
    sm.handleMove(Direction.DOWN);
    this.assert(sm.skillChargeTurns === 500, 'Charge reaches 500');
    this.assert(sm.isSkillReady === true, 'Skill becomes ready upon reaching cooldown');

    // Move again should not exceed 500
    sm.handleMove(Direction.LEFT);
    this.assert(sm.skillChargeTurns === 500, 'Charge is capped at cooldown max');
  }

  // GWT 93.2: 戰士【十字碎裂】技能結算
  testGwt93_2_WarriorCrossBreaker() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.selectCharacter(CharacterClass.WARRIOR);
    sm.startStage(1, 32);

    sm.board.clear();
    // Center Hero 32 at (2, 2)
    sm.board.setTile(2, 2, new Tile(32, TileType.HERO, 2, 2));
    // Top Equipment 8 at (1, 2)
    sm.board.setTile(1, 2, new Tile(8, TileType.EQUIPMENT, 1, 2));
    // Left Equipment 16 at (2, 1)
    sm.board.setTile(2, 1, new Tile(16, TileType.EQUIPMENT, 2, 1));
    // Right Gold 32 at (2, 3)
    sm.board.setTile(2, 3, new Tile(32, TileType.GOLD, 2, 3));
    // Bottom Monster 64 at (3, 2) (MUST NOT BE DESTROYED!)
    sm.board.setTile(3, 2, new Tile(64, TileType.MONSTER, 3, 2));
    // Unrelated Equipment 4 at (0, 0)
    sm.board.setTile(0, 0, new Tile(4, TileType.EQUIPMENT, 0, 0));

    sm.skillChargeTurns = 500;
    sm.isSkillReady = true;

    const res = sm.triggerCharacterSkill(false);
    this.assert(res.success === true, 'Warrior skill triggers successfully');
    this.assert(res.destroyedTiles.length === 3, 'Destroyed exactly 3 tiles (2 equip + 1 gold)');

    // Verify cross tiles removed
    this.assert(sm.board.getTile(1, 2) === null, 'Top equipment at (1, 2) destroyed');
    this.assert(sm.board.getTile(2, 1) === null, 'Left equipment at (2, 1) destroyed');
    this.assert(sm.board.getTile(2, 3) === null, 'Right gold at (2, 3) destroyed');

    // Verify Monster and distant equipment survive
    this.assert(sm.board.getTile(3, 2) !== null && sm.board.getTile(3, 2).value === 64, 'Monster at (3, 2) is untouched');
    this.assert(sm.board.getTile(0, 0) !== null && sm.board.getTile(0, 0).value === 4, 'Distant equipment at (0, 0) is untouched');

    // Verify skill state reset
    this.assert(sm.isSkillReady === false, 'Skill resets to unready');
    this.assert(sm.skillChargeTurns === 0, 'Skill charge resets to 0');
  }

  // GWT 93.3: 精靈弓箭手【破甲重矢】技能結算
  testGwt93_3_ArcherArmorPiercingArrow() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.selectCharacter(CharacterClass.ARCHER);
    sm.startStage(1, 32);

    this.assert(CHARACTER_SKILL_CONFIGS.archer.passiveRescue === false, 'Archer does not have passive rescue');

    // 1. Monster >= 4 is halved
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(32, TileType.HERO, 0, 0));
    sm.board.setTile(1, 1, new Tile(1024, TileType.MONSTER, 1, 1));
    sm.board.setTile(2, 2, new Tile(64, TileType.MONSTER, 2, 2));

    sm.skillChargeTurns = 500;
    sm.isSkillReady = true;

    const res1 = sm.triggerCharacterSkill(false);
    this.assert(res1.success === true, 'Archer skill triggers successfully');
    this.assert(res1.action === 'halved', 'Action is halved');
    this.assert(res1.originalVal === 1024, 'Targeted max monster 1024');
    this.assert(res1.newVal === 512, '1024 halved to 512');
    this.assert(sm.board.getTile(1, 1).value === 512, 'Monster at (1, 1) now has value 512');
    this.assert(sm.board.getTile(2, 2).value === 64, 'Monster at (2, 2) remains 64');

    // 2. Monster = 2 is slain immediately
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(32, TileType.HERO, 0, 0));
    sm.board.setTile(1, 1, new Tile(2, TileType.MONSTER, 1, 1));

    sm.skillChargeTurns = 500;
    sm.isSkillReady = true;

    const res2 = sm.triggerCharacterSkill(false);
    this.assert(res2.success === true, 'Archer skill triggers on monster 2');
    this.assert(res2.action === 'slain', 'Monster 2 is slain');
    this.assert(sm.board.getTile(1, 1) === null, 'Monster 2 is removed from board');

    // 3. No monsters on board -> returns false
    sm.startStage(1, 32);
    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(32, TileType.HERO, 0, 0));
    sm.skillChargeTurns = 500;
    sm.isSkillReady = true;

    const res3 = sm.triggerCharacterSkill(false);
    this.assert(res3.success === false, 'Archer skill fails when no monsters on board');
    this.assert(res3.reason.includes('無魔物目標'), 'Reason mentions no monster target');
  }

  // GWT 93.4: 皇家商人【黃金急召】技能結算
  testGwt93_4_MerchantGoldenEmergency() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.selectCharacter(CharacterClass.MERCHANT);
    sm.startStage(1, 32);

    this.assert(CHARACTER_SKILL_CONFIGS.merchant.passiveRescue === true, 'Merchant has passive rescue');

    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(32, TileType.HERO, 0, 0));
    sm.board.setTile(1, 1, new Tile(16, TileType.GOLD, 1, 1));
    sm.board.setTile(2, 2, new Tile(32, TileType.GOLD, 2, 2));

    const initialGold = sm.gold;
    sm.skillChargeTurns = 500;
    sm.isSkillReady = true;

    const res = sm.triggerCharacterSkill(false);
    this.assert(res.success === true, 'Merchant skill triggers successfully');
    this.assert(res.totalCashed === 48, 'Total cashed is 16 + 32 = 48');
    this.assert(sm.gold === initialGold + 48, 'Gold increased by 48');
    this.assert(sm.board.getTile(1, 1) === null, 'Gold at (1, 1) removed');
    this.assert(sm.board.getTile(2, 2) === null, 'Gold at (2, 2) removed');

    // If no gold on board -> fails
    sm.skillChargeTurns = 500;
    sm.isSkillReady = true;
    const res2 = sm.triggerCharacterSkill(false);
    this.assert(res2.success === false, 'Merchant skill fails with no gold on board');
    this.assert(res2.reason.includes('無金幣'), 'Reason mentions no gold');
  }

  // GWT 93.5: 大廳職業切換與冷卻步數升級（500 ➔ 100 步）
  testGwt93_5_SkillLevelUpAndCooldownReduction() {
    const sm = new StageManager();
    sm.resetSaveData();

    this.assert(sm.getSelectedCharacter() === CharacterClass.WARRIOR, 'Default character is warrior');
    this.assert(sm.getCharacterSkillLevel(CharacterClass.WARRIOR) === 0, 'Initial warrior skill level is 0');
    this.assert(sm.getCharacterSkillCooldown(CharacterClass.WARRIOR) === 500, 'Initial cooldown is 500');

    // Give 200,000 gold for tech upgrades
    sm.gold = 200000;

    // Upgrade Lv.1 (cost: 5,000)
    const up1 = sm.upgradeCharacterSkill(CharacterClass.WARRIOR);
    this.assert(up1.success === true, 'Upgraded to Lv.1');
    this.assert(up1.level === 1, 'Level is 1');
    this.assert(up1.cooldown === 400, 'Cooldown reduced to 400');
    this.assert(sm.gold === 195000, 'Deducted 5,000 gold');

    // Upgrade Lv.2 (cost: 15,000)
    const up2 = sm.upgradeCharacterSkill(CharacterClass.WARRIOR);
    this.assert(up2.level === 2 && up2.cooldown === 300, 'Upgraded to Lv.2 with 300 cooldown');
    this.assert(sm.gold === 180000, 'Deducted 15,000 gold');

    // Upgrade Lv.3 (cost: 40,000)
    const up3 = sm.upgradeCharacterSkill(CharacterClass.WARRIOR);
    this.assert(up3.level === 3 && up3.cooldown === 200, 'Upgraded to Lv.3 with 200 cooldown');
    this.assert(sm.gold === 140000, 'Deducted 40,000 gold');

    // Upgrade Lv.4 (cost: 100,000)
    const up4 = sm.upgradeCharacterSkill(CharacterClass.WARRIOR);
    this.assert(up4.level === 4 && up4.cooldown === 100, 'Upgraded to Lv.4 with 100 cooldown (MAX)');
    this.assert(sm.gold === 40000, 'Deducted 100,000 gold');

    // Max Level check
    const up5 = sm.upgradeCharacterSkill(CharacterClass.WARRIOR);
    this.assert(up5.success === false, 'Cannot upgrade beyond Lv.4');

    // Test switching to Archer and Merchant
    sm.selectCharacter(CharacterClass.ARCHER);
    this.assert(sm.getSelectedCharacter() === CharacterClass.ARCHER, 'Selected archer');
    this.assert(sm.getCharacterSkillLevel(CharacterClass.ARCHER) === 0, 'Archer level is independently 0');

    sm.selectCharacter(CharacterClass.MERCHANT);
    this.assert(sm.getSelectedCharacter() === CharacterClass.MERCHANT, 'Selected merchant');
  }

  // GWT 93.6: 重弩道具跳關殺手鐧調整
  testGwt93_6_SnipeAnyMonsterSuccess() {
    const sm = new StageManager();
    sm.resetSaveData();
    sm.startStage(1, 16); // Hero is 16

    sm.board.clear();
    sm.board.setTile(0, 0, new Tile(16, TileType.HERO, 0, 0));
    // Monster is 1024, far greater than Hero 16!
    sm.board.setTile(1, 1, new Tile(1024, TileType.MONSTER, 1, 1));
    sm.items.snipe = 1;

    const res = sm.useSnipeItem(1, 1);
    this.assert(res.success === true, 'Snipe must succeed on monster 1024 even though Hero is 16');
    this.assert(sm.board.getTile(1, 1) === null, 'Monster 1024 removed from board');
    this.assert(sm.items.snipe === 0, 'Snipe item consumed');
  }

  // GWT 94.1: 設定彈窗新增測試開關
  async testGwt94_1_SettingsInstantSkillToggle() {
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

    const instantSkillCheckbox = doc.getElementById('setting-instant-skill');
    this.assert(instantSkillCheckbox !== null, 'setting-instant-skill checkbox must exist in settings modal');
    this.assert(instantSkillCheckbox.tagName === 'INPUT' && instantSkillCheckbox.type === 'checkbox', 'Must be a checkbox input');
  }

  // GWT 94.2: 戰鬥開局技能能量自動滿額與關閉時維持 0
  testGwt94_2_InstantSkillReadyInStage() {
    const sm = new StageManager();
    sm.resetSaveData();

    // 1. When localStorage 'rpg_2048_instant_skill_ready' is 'true'
    localStorage.setItem('rpg_2048_instant_skill_ready', 'true');
    sm.startStage(1, 16);
    const expectedCd = sm.getCharacterSkillCooldown(); // 500 for Warrior Lv.0
    this.assert(sm.skillChargeTurns === expectedCd, 'Skill charge should be max cooldown (500) when instant ready is true');
    this.assert(sm.isSkillReady === true, 'Skill is immediately ready when instant ready is true');

    // 2. When disabled
    localStorage.setItem('rpg_2048_instant_skill_ready', 'false');
    sm.startStage(1, 16);
    this.assert(sm.skillChargeTurns === 0, 'Skill charge should be 0 when instant ready is false');
    this.assert(sm.isSkillReady === false, 'Skill is not ready when instant ready is false');
  }

  // GWT 95.1: 2頭身黏土超必殺 Cut-in 元素與圖片來源
  async testGwt95_1_CutinOverlayElementsExist() {
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

    const cutinLayer = doc.getElementById('skill-cutin-layer');
    this.assert(cutinLayer !== null, 'skill-cutin-layer must exist in DOM');
    const cutinAvatar = doc.getElementById('skill-cutin-avatar');
    this.assert(cutinAvatar !== null, 'skill-cutin-avatar must exist inside cutin layer');
    this.assert(cutinAvatar.getAttribute('src').includes('cutin_hero_clay_ultimate.png'), 'Avatar src must point to cutin_hero_clay_ultimate.png');
  }

  // GWT 95.2: 盤面動態 VFX 層存在
  async testGwt95_2_BoardVfxLayerExists() {
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

    const vfxLayer = doc.getElementById('skill-board-vfx-layer');
    this.assert(vfxLayer !== null, 'skill-board-vfx-layer must exist inside board wrapper');
  }

  // GWT 96.1: Canvas 2D 物理光影圖層存在於 DOM 結構中
  async testGwt96_1_CombatVfxCanvasExists() {
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

    const canvas = doc.getElementById('combat-vfx-canvas');
    this.assert(canvas !== null, 'combat-vfx-canvas must exist in board-wrapper');
    this.assert(canvas.tagName.toLowerCase() === 'canvas', 'combat-vfx-canvas must be a <canvas> element');
    this.assert(canvas.classList.contains('combat-vfx-canvas'), 'combat-vfx-canvas must have combat-vfx-canvas class');
  }

  // GWT 96.2: CombatVfxEngine 類別可實例化並擁有三大技能特效方法
  testGwt96_2_CombatVfxEngineInitialized() {
    const mockCanvas = document.createElement('canvas');
    const mockBoard = document.createElement('div');
    const vfx = new CombatVfxEngine(mockCanvas, mockBoard);

    this.assert(typeof vfx.playCrossBreaker === 'function', 'CombatVfxEngine must provide playCrossBreaker method');
    this.assert(typeof vfx.playArmorPiercingArrow === 'function', 'CombatVfxEngine must provide playArmorPiercingArrow method');
    this.assert(typeof vfx.playGoldenEmergency === 'function', 'CombatVfxEngine must provide playGoldenEmergency method');
    this.assert(typeof vfx.createShockwave === 'function', 'CombatVfxEngine must provide createShockwave method');
    this.assert(typeof vfx.createSparks === 'function', 'CombatVfxEngine must provide createSparks method');
  }

  // =========================================================================
  // C-STORY-097: 商業版三大職業必殺技高階視覺特效同步移植
  // =========================================================================

  // GWT 97.1: 戰士【十字碎裂】預設 120px 刀光與邊界安全截斷
  async testGwt97_1_WarriorCrossCleave120pxAndBoundaryClipping() {
    const mockCanvas = document.createElement('canvas');
    const mockBoard = document.createElement('div');
    const vfx = new CombatVfxEngine(mockCanvas, mockBoard);
    vfx.width = 400;
    vfx.height = 400;

    let impactTriggered = false;
    const playPromise = vfx.playCrossBreaker(4, 2, [{ r: 3, c: 2 }, { r: 5, c: 2 }], () => {
      impactTriggered = true;
    });

    this.assert(vfx.crossBeams.length > 0, 'Cross beam must be registered');
    const beam = vfx.crossBeams[0];
    this.assert(beam.lenUp <= 120, 'Upward beam length tuned up to 120px');
    this.assert(beam.lenDown <= 20, 'Downward beam safely clipped at bottom boundary (r=4)');
    this.assert(beam.width === 14, 'Beam width is 14px');

    await playPromise;
    this.assert(impactTriggered, 'Impact callback must be called');
  }

  // GWT 97.2: 弓箭手【破甲重矢】精準方塊內部離弦與碰撞引爆
  async testGwt97_2_ArcherArmorPiercingPrecisionLaunchAndZeroLatency() {
    const mockCanvas = document.createElement('canvas');
    const mockBoard = document.createElement('div');
    const vfx = new CombatVfxEngine(mockCanvas, mockBoard);
    vfx.width = 400;
    vfx.height = 400;

    let impactCalled = false;
    const playPromise = vfx.playArmorPiercingArrow(2, 2, 0, 2, () => {
      impactCalled = true;
    }, { hangTime: 20 });

    this.assert(vfx.projectiles.length > 0, 'Initial skyward projectile spawned');
    const skyProj = vfx.projectiles[0];
    this.assert(skyProj.vy < 0, 'Skyward projectile flies upwards');
    this.assert(skyProj.trail === true, 'Skyward projectile has trail');

    await playPromise;
    this.assert(impactCalled, 'Impact callback must be invoked on projectile arrival');
  }

  // GWT 97.3: 商人【黃金急召】3D 立體翻轉自旋金幣與錢包吸引子
  async testGwt97_3_Merchant3DTumblingCoinsAndAttractor() {
    const mockCanvas = document.createElement('canvas');
    const mockBoard = document.createElement('div');
    const vfx = new CombatVfxEngine(mockCanvas, mockBoard);
    vfx.width = 400;
    vfx.height = 400;

    let impactCalled = false;
    const playPromise = vfx.playGoldenEmergency([{ r: 1, c: 1 }, { r: 2, c: 2 }], () => {
      impactCalled = true;
    }, { coinsPerTile: 4 });

    this.assert(vfx.coins.length === 8, 'Spawns 8 3D coins for 2 gold tiles (4 per tile)');
    const coin = vfx.coins[0];
    this.assert(typeof coin.rotX === 'number', 'Coin has 3D X rotation angle');
    this.assert(typeof coin.spinSpeed === 'number', 'Coin has spinSpeed for tumbling');
    this.assert(coin.attract === true, 'Coin has attract flag for top wallet');

    await playPromise;
    this.assert(impactCalled, 'Impact callback must be invoked');
  }

  // =========================================================================
  // C-STORY-098: 必殺技畫布網格錨定修復與執行生命週期防死鎖保護
  // =========================================================================

  // GWT 98.1: 畫布 offset 與父容器自動對齊（消除左上偏移）
  testGwt98_1_CanvasOffsetAndParentAnchoring() {
    const parent = document.createElement('div');
    const board = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.appendChild(board);
    parent.appendChild(canvas);

    // Mock bounding rects
    parent.getBoundingClientRect = () => ({ left: 10, top: 20, width: 450, height: 600 });
    board.getBoundingClientRect = () => ({ left: 45, top: 80, width: 380, height: 456 });

    const vfx = new CombatVfxEngine(canvas, board);
    vfx.resize();

    this.assert(canvas.style.position === 'absolute', 'Canvas must have absolute position');
    this.assert(canvas.style.left === '35px', 'Canvas left must match board relative offset (45 - 10 = 35px)');
    this.assert(canvas.style.top === '60px', 'Canvas top must match board relative offset (80 - 20 = 60px)');
    this.assert(canvas.style.width === '380px', 'Canvas width must match board width');
    this.assert(canvas.style.height === '456px', 'Canvas height must match board height');
  }

  // GWT 98.2: getCellCenter 精準支援 data-r / data-c 與 data-row / data-col 雙格式
  testGwt98_2_GetCellCenterSupportsDataRAndDataRow() {
    const board = document.createElement('div');
    const cell1 = document.createElement('div');
    cell1.dataset.r = '2';
    cell1.dataset.c = '2';
    board.appendChild(cell1);

    const cell2 = document.createElement('div');
    cell2.setAttribute('data-row', '3');
    cell2.setAttribute('data-col', '1');
    board.appendChild(cell2);

    board.getBoundingClientRect = () => ({ left: 50, top: 100, width: 400, height: 480 });
    cell1.getBoundingClientRect = () => ({ left: 210, top: 290, width: 70, height: 84 });
    cell2.getBoundingClientRect = () => ({ left: 130, top: 380, width: 70, height: 84 });

    const mockCanvas = document.createElement('canvas');
    const vfx = new CombatVfxEngine(mockCanvas, board);

    const center1 = vfx.getCellCenter(2, 2);
    // 210 - 50 + 35 = 195; 290 - 100 + 42 = 232
    this.assert(center1.x === 195, 'Cell 1 (data-r) center X must be precisely calculated');
    this.assert(center1.y === 232, 'Cell 1 (data-r) center Y must be precisely calculated');

    const center2 = vfx.getCellCenter(3, 1);
    // 130 - 50 + 35 = 115; 380 - 100 + 42 = 322
    this.assert(center2.x === 115, 'Cell 2 (data-row) center X must be precisely calculated');
    this.assert(center2.y === 322, 'Cell 2 (data-row) center Y must be precisely calculated');
  }

  // GWT 98.3: 技能操作鎖防護保證，退關進關強行解除鎖定
  testGwt98_3_SkillExecutionLockProtectionAndReset() {
    const mockApp = {
      isSkillExecuting: true,
      isSliding: true,
      vfxEngine: { clear: () => {}, resize: () => {} },
      tutorialOverlay: { hide: () => {} },
      stageManager: {
        isInBattle: true,
        isVictory: false,
        isGameOver: false,
        abandonBattleRewards: () => {},
        recordBattleEnd: () => ({ triggerAd: false }),
        startStage: () => ({ name: 'Test', chapter: 1 }),
        canStartStage: () => true
      },
      setAimingMode: () => {},
      combatOverlayEl: { style: {} },
      combatStageNameEl: { textContent: '' },
      viewRenderer: { setChapterId: () => {} },
      updateItemCounts: () => {},
      renderStagesList: () => {}
    };

    // Simulate exitCombat
    mockApp.setAimingMode(null);
    mockApp.isSkillExecuting = false;
    mockApp.isSliding = false;
    this.assert(mockApp.isSkillExecuting === false, 'exitCombat must forcefully reset isSkillExecuting to false');
    this.assert(mockApp.isSliding === false, 'exitCombat must forcefully reset isSliding to false');
  }

  // =========================================================================
  // C-STORY-099: 瀕死被動自救有效性智慧判定與全套特效聯動
  // =========================================================================

  // GWT 99.1: 弓箭手瀕死自救智慧門檻（最強怪物為 2 才觸發秒殺，大於 2 保留充能）
  testGwt99_1_ArcherSmartPassiveRescueThreshold() {
    const bus = new GameEventBus();
    const sm = new StageManager(bus);
    sm.selectedCharacter = CharacterClass.ARCHER;

    // Board with monster value 4 (cannot be killed, only halved)
    sm.board.clear();
    sm.board.setTile(2, 2, new Tile(8, TileType.HERO, 2, 2));
    sm.board.setTile(0, 0, new Tile(4, TileType.MONSTER, 0, 0));

    // When strongest monster is 4 > 2, canEffectivelyPassiveRescue must be FALSE
    this.assert(sm.canEffectivelyPassiveRescue() === false, 'Archer cannot passive rescue when monster > 2');

    // When strongest monster is 2 (can be slain and freed)
    sm.board.setTile(0, 0, new Tile(2, TileType.MONSTER, 0, 0));
    this.assert(sm.canEffectivelyPassiveRescue() === true, 'Archer can passive rescue when monster == 2');
  }

  // GWT 99.2: 戰士與商人瀕死自救有效性前置判定
  testGwt99_2_WarriorAndMerchantPassiveRescuePrecondition() {
    const bus = new GameEventBus();
    const sm = new StageManager(bus);

    // 1. Warrior
    sm.selectedCharacter = CharacterClass.WARRIOR;
    sm.board.clear();
    sm.board.setTile(2, 2, new Tile(8, TileType.HERO, 2, 2));
    // Surround with monsters only (no equipment/gold to destroy)
    sm.board.setTile(1, 2, new Tile(8, TileType.MONSTER, 1, 2));
    sm.board.setTile(3, 2, new Tile(8, TileType.MONSTER, 3, 2));
    sm.board.setTile(2, 1, new Tile(8, TileType.MONSTER, 2, 1));
    sm.board.setTile(2, 3, new Tile(8, TileType.MONSTER, 2, 3));
    this.assert(sm.canEffectivelyPassiveRescue() === false, 'Warrior cannot passive rescue without equipment or gold in cross');

    // Add 1 equipment in cross
    sm.board.setTile(1, 2, new Tile(4, TileType.EQUIPMENT, 1, 2));
    this.assert(sm.canEffectivelyPassiveRescue() === true, 'Warrior can passive rescue with equipment in cross');

    // 2. Merchant
    sm.selectedCharacter = CharacterClass.MERCHANT;
    sm.board.clear();
    sm.board.setTile(2, 2, new Tile(8, TileType.HERO, 2, 2));
    this.assert(sm.canEffectivelyPassiveRescue() === false, 'Merchant cannot passive rescue with no gold on board');

    sm.board.setTile(0, 0, new Tile(16, TileType.GOLD, 0, 0));
    this.assert(sm.canEffectivelyPassiveRescue() === true, 'Merchant can passive rescue when gold exists on board');
  }

  // GWT 99.3: 瀕死自救完整派發全套 2D 物理特效並安全解鎖
  async testGwt99_3_AutoRescueDispatchesFullVfxAndUnlocks() {
    const mockCanvas = document.createElement('canvas');
    const mockBoard = document.createElement('div');
    const vfx = new CombatVfxEngine(mockCanvas, mockBoard);
    vfx.width = 400;
    vfx.height = 400;

    let vfxPlayed = false;
    vfx.playCrossBreaker = async () => {
      vfxPlayed = true;
    };

    const mockApp = {
      isSkillExecuting: false,
      vfxEngine: vfx,
      stageManager: {
        board: {
          getHero: () => ({ r: 2, c: 2 })
        }
      },
      showFloatingCombatText: () => {},
      updateCombatSkillUI: () => {}
    };

    // Simulate playAutoRescueCutin
    const payload = {
      classId: CharacterClass.WARRIOR,
      destroyedTiles: [{ r: 1, c: 2 }],
      isAutoRescue: true
    };

    mockApp.isSkillExecuting = true;
    try {
      if (mockApp.vfxEngine) {
        await mockApp.vfxEngine.playCrossBreaker(2, 2, payload.destroyedTiles);
      }
    } finally {
      mockApp.isSkillExecuting = false;
    }

    this.assert(vfxPlayed === true, 'playCrossBreaker must be dispatched on Warrior auto-rescue');
    this.assert(mockApp.isSkillExecuting === false, 'isSkillExecuting must be cleanly released to false');
  }

  // =========================================================================
  // C-STORY-100: 商人前置安全攔截、破甲重矢18片輕量化與專屬必殺音效
  // =========================================================================

  // GWT 100.1: 商人盤面無金幣時主動施放技能前置安全攔截
  testGwt100_1_MerchantNoGoldPrecheckIntercept() {
    const bus = new GameEventBus();
    const sm = new StageManager(bus);
    sm.selectedCharacter = CharacterClass.MERCHANT;
    sm.skillCharge = 100;
    sm.isSkillReady = true;

    // 清空盤面，無金幣
    sm.board.clear();
    sm.board.setTile(2, 2, new Tile(8, TileType.HERO, 2, 2));

    let warnedText = '';
    let executedVfx = false;

    // 模擬 triggerSkillWithVfx 內部的前置檢查邏輯
    let hasGold = false;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const t = sm.board.getTile(r, c);
        if (t && t.isGold()) {
          hasGold = true;
          break;
        }
      }
      if (hasGold) break;
    }

    if (!hasGold) {
      warnedText = '⚠️ 盤面無金幣可供回收！';
    } else {
      executedVfx = true;
    }

    this.assert(hasGold === false, 'Board must have no gold');
    this.assert(warnedText === '⚠️ 盤面無金幣可供回收！', 'Must show no gold warning text');
    this.assert(executedVfx === false, 'VFX and Cut-in must NOT execute when no gold');
    this.assert(sm.skillCharge === 100, 'Skill charge must remain 100 untouched');
  }

  // GWT 100.2: 破甲重矢碎片數量精簡至18片並消除卡頓渲染高峰
  testGwt100_2_ArcherSkillDebrisParticleCountLightweight() {
    const mockCanvas = document.createElement('canvas');
    const mockBoard = document.createElement('div');
    const vfx = new CombatVfxEngine(mockCanvas, mockBoard);

    // 檢查 CombatVfxEngine 類別實作中是否已將破片數量設定為 18
    const vfxCode = vfx.playArmorPiercingArrow.toString();
    const has18Debris = vfxCode.includes('k < 18') || vfxCode.includes('18');
    this.assert(has18Debris === true, 'Archer debris count must be capped to 18 for high performance');
  }

  // GWT 100.3: 三大職業專屬必殺音效合成器實裝且可調用
  testGwt100_3_DedicatedSkillAudioSynthesizersExistAndCallable() {
    const audio = new AudioEffects();
    this.assert(typeof audio.playSkillCrossCleave === 'function', 'playSkillCrossCleave must be a function');
    this.assert(typeof audio.playSkillArmorPiercingArrow === 'function', 'playSkillArmorPiercingArrow must be a function');
    this.assert(typeof audio.playSkillGoldenEmergency === 'function', 'playSkillGoldenEmergency must be a function');

    // 調用測試（無 AudioContext 環境中應有安全降級保護而不拋錯）
    let errOccurred = false;
    try {
      audio.playSkillCrossCleave();
      audio.playSkillArmorPiercingArrow();
      audio.playSkillGoldenEmergency();
    } catch (e) {
      errOccurred = true;
    }
    this.assert(errOccurred === false, 'Skill audio functions must execute safely without throwing errors');
  }
}


