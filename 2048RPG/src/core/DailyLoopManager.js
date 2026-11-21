// DailyLoopManager.js: Manages 7-Day Login Bonus, Free Shop Supplies, and Daily Quests
import {
  Events,
  DAILY_SIGNIN_REWARDS,
  DAILY_FREE_SHOP_REWARD,
  DAILY_QUEST_CONFIGS,
  DAILY_ACTIVITY_CHEST_CONFIG,
  getEditionStorageKey,
  getDailyEconomyScaling
} from './Constants.js';

export const DAILY_LOOP_SAVE_KEY = getEditionStorageKey('2048RPG_DailyLoop_Save_v1');

export class DailyLoopManager {
  constructor(eventBus, stageManager) {
    this.eventBus = eventBus;
    this.stageManager = stageManager;
    this.saveKey = DAILY_LOOP_SAVE_KEY;

    this.state = this.getInitialState();
    this.loadState();
    this.checkDailyReset();

    this.initEventListeners();
  }

  // Generate today date string YYYY-MM-DD
  getTodayDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getInitialState() {
    const initialQuests = {};
    DAILY_QUEST_CONFIGS.forEach(q => {
      initialQuests[q.id] = { progress: 0, claimed: false };
    });

    return {
      lastDateStr: this.getTodayDateStr(),
      signInDay: 1, // 1 to 7
      signInClaimedToday: false,
      shopGiftClaimedToday: false,
      eventStageClaimedToday: false,
      quests: initialQuests,
      activityPoints: 0,
      activityChestClaimed: false
    };
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.saveKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Deep merge with initial state to preserve missing keys
        const initial = this.getInitialState();
        this.state = {
          ...initial,
          ...parsed,
          quests: { ...initial.quests, ...(parsed.quests || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to load DailyLoopManager state, using defaults', e);
      this.state = this.getInitialState();
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(this.state));
      if (this.eventBus) {
        this.eventBus.emit(Events.DAILY_STATE_CHANGED, this.getSummaryStatus());
      }
    } catch (e) {
      console.warn('Failed to save DailyLoopManager state', e);
    }
  }

  // Daily Reset Logic: Checks if local date has changed
  checkDailyReset(overrideDate = null) {
    const today = overrideDate || this.getTodayDateStr();
    if (this.state.lastDateStr !== today) {
      // It's a new day!
      // If signed in yesterday, advance day (looping 1-7); otherwise preserve progress
      if (this.state.signInClaimedToday) {
        this.state.signInDay = (this.state.signInDay % 7) + 1;
      }
      this.state.signInClaimedToday = false;
      this.state.shopGiftClaimedToday = false;
      this.state.eventStageClaimedToday = false;

      // Reset daily quests & activity points
      DAILY_QUEST_CONFIGS.forEach(q => {
        this.state.quests[q.id] = { progress: 0, claimed: false };
      });
      this.state.activityPoints = 0;
      this.state.activityChestClaimed = false;

      this.state.lastDateStr = today;
      this.saveState();
      return true;
    }
    return false;
  }

  initEventListeners() {
    if (!this.eventBus) return;

    // 1. Monster Killed
    this.eventBus.on(Events.MONSTER_KILLED, (payload) => {
      const kills = (payload && typeof payload.kills === 'number' && payload.kills > 0) ? payload.kills : 1;
      this.incrementQuestProgress('quest_kill_monsters', kills);
    });

    // 2. Any Tile / Equipment Merged (10 merges target) (C-STORY-107)
    this.eventBus.on(Events.TILE_MERGED, (payload) => {
      const count = (payload && typeof payload.count === 'number' && payload.count > 0) ? payload.count : 1;
      this.incrementQuestProgress('quest_high_merge', count);
    });

    // 3. Gold Collection
    this.eventBus.on(Events.GOLD_CASHED_OUT, (payload) => {
      const amount = (payload && payload.amount) ? payload.amount : 0;
      if (amount > 0) {
        this.incrementQuestProgress('quest_collect_gold', amount);
      }
    });
    this.eventBus.on(Events.GOLD_MERGED, (payload) => {
      const amount = (payload && payload.amount) ? payload.amount : 0;
      if (amount > 0) {
        this.incrementQuestProgress('quest_collect_gold', amount);
      }
    });

    // 4. Combat Finished (Victory or Defeat)
    this.eventBus.on(Events.STAGE_VICTORY, (payload) => {
      if (payload && typeof payload.sweepGold === 'number' && payload.sweepGold > 0) {
        this.incrementQuestProgress('quest_collect_gold', payload.sweepGold);
      }
      this.incrementQuestProgress('quest_combat_count', 1);
    });
    this.eventBus.on(Events.STAGE_DEFEAT, () => {
      this.incrementQuestProgress('quest_combat_count', 1);
    });
  }

  incrementQuestProgress(questId, amount = 1) {
    const qCfg = DAILY_QUEST_CONFIGS.find(q => q.id === questId);
    if (!qCfg) return;

    if (!this.state.quests[questId]) {
      this.state.quests[questId] = { progress: 0, claimed: false };
    }

    const questData = this.state.quests[questId];
    if (questData.claimed) return; // Already claimed

    const oldProg = questData.progress;
    questData.progress = Math.min(qCfg.target, questData.progress + amount);

    if (questData.progress !== oldProg) {
      this.saveState();
      if (this.eventBus) {
        this.eventBus.emit(Events.QUEST_PROGRESS_CHANGED, {
          questId,
          progress: questData.progress,
          target: qCfg.target,
          isCompleted: questData.progress >= qCfg.target
        });
      }
    }
  }

  // Progressive Daily Economy Scaling based on unlocked main stage
  getEconomyScaling() {
    const unlocked = this.stageManager ? (this.stageManager.unlockedStageId || 1) : 1;
    return getDailyEconomyScaling(unlocked);
  }

  // 1. Claim Daily Sign-in Reward (Scaled by chapter growth multiplier)
  claimSignInReward() {
    if (this.state.signInClaimedToday) {
      return { success: false, reason: 'ALREADY_CLAIMED_TODAY' };
    }

    const currentDayCfg = DAILY_SIGNIN_REWARDS.find(r => r.day === this.state.signInDay) || DAILY_SIGNIN_REWARDS[0];
    const scaling = this.getEconomyScaling();
    const scaledGold = Math.round((currentDayCfg.gold || 0) * scaling.dailyMult);
    const scaledReward = { ...currentDayCfg, gold: scaledGold, mult: scaling.dailyMult };

    const goldBefore = this.stageManager ? this.stageManager.gold : 0;
    // Grant gold
    if (scaledGold && this.stageManager) {
      this.stageManager.addGold(scaledGold);
    }
    // Grant items if present
    if (currentDayCfg.items && this.stageManager) {
      for (const [itemType, count] of Object.entries(currentDayCfg.items)) {
        this.stageManager.addItem(itemType, count);
      }
    }

    this.state.signInClaimedToday = true;
    this.saveState();

    if (this.stageManager && this.stageManager.telemetry) {
      this.stageManager.telemetry.recordTownAction({
        action: 'DAILY_SIGNIN',
        goldBefore,
        goldAfter: this.stageManager.gold,
        techTier: this.stageManager.baseTier,
        equippedPower: this.stageManager.inventory.getEquippedPower(),
        detail: { day: currentDayCfg.day, gold: scaledGold, mult: scaling.dailyMult }
      });
    }

    return {
      success: true,
      day: currentDayCfg.day,
      reward: scaledReward
    };
  }

  // 2. Claim Shop Free Daily Supplies (Scaled by chapter growth multiplier)
  claimShopGift() {
    if (this.state.shopGiftClaimedToday) {
      return { success: false, reason: 'ALREADY_CLAIMED_TODAY' };
    }

    const scaling = this.getEconomyScaling();
    const scaledGold = Math.round((DAILY_FREE_SHOP_REWARD.gold || 0) * scaling.dailyMult);
    const reward = { ...DAILY_FREE_SHOP_REWARD, gold: scaledGold, mult: scaling.dailyMult };
    const goldBefore = this.stageManager ? this.stageManager.gold : 0;
    if (this.stageManager) {
      this.stageManager.addGold(scaledGold);
    }

    this.state.shopGiftClaimedToday = true;
    this.saveState();

    if (this.stageManager && this.stageManager.telemetry) {
      this.stageManager.telemetry.recordTownAction({
        action: 'DAILY_SHOP_GIFT',
        goldBefore,
        goldAfter: this.stageManager.gold,
        techTier: this.stageManager.baseTier,
        equippedPower: this.stageManager.inventory.getEquippedPower(),
        detail: { gold: scaledGold, mult: scaling.dailyMult }
      });
    }

    return {
      success: true,
      reward
    };
  }

  // 3. Claim Quest Reward (Scaled by chapter growth multiplier)
  claimQuestReward(questId) {
    const qCfg = DAILY_QUEST_CONFIGS.find(q => q.id === questId);
    if (!qCfg) {
      return { success: false, reason: 'QUEST_NOT_FOUND' };
    }

    const questData = this.state.quests[questId];
    if (!questData || questData.progress < qCfg.target) {
      return { success: false, reason: 'REQUIREMENTS_NOT_MET' };
    }
    if (questData.claimed) {
      return { success: false, reason: 'ALREADY_CLAIMED' };
    }

    // Mark as claimed
    questData.claimed = true;

    const scaling = this.getEconomyScaling();
    const scaledGold = Math.round((qCfg.rewardGold || 0) * scaling.dailyMult);
    const goldBefore = this.stageManager ? this.stageManager.gold : 0;
    // Grant gold
    if (this.stageManager) {
      this.stageManager.addGold(scaledGold);
    }

    // Add activity points
    this.state.activityPoints = Math.min(100, this.state.activityPoints + qCfg.activityPoints);

    this.saveState();

    if (this.stageManager && this.stageManager.telemetry) {
      this.stageManager.telemetry.recordTownAction({
        action: 'DAILY_QUEST_CLAIM',
        goldBefore,
        goldAfter: this.stageManager.gold,
        techTier: this.stageManager.baseTier,
        equippedPower: this.stageManager.inventory.getEquippedPower(),
        detail: { questId, rewardGold: scaledGold, mult: scaling.dailyMult, activityPoints: this.state.activityPoints }
      });
    }

    return {
      success: true,
      questId,
      rewardGold: scaledGold,
      activityPoints: this.state.activityPoints
    };
  }

  // 4. Claim 100-Activity Master Chest (Scaled by chapter growth multiplier)
  claimActivityChest() {
    if (this.state.activityPoints < DAILY_ACTIVITY_CHEST_CONFIG.requiredPoints) {
      return { success: false, reason: 'INSUFFICIENT_ACTIVITY_POINTS' };
    }
    if (this.state.activityChestClaimed) {
      return { success: false, reason: 'ALREADY_CLAIMED' };
    }

    const scaling = this.getEconomyScaling();
    const scaledGold = Math.round((DAILY_ACTIVITY_CHEST_CONFIG.rewardGold || 0) * scaling.dailyMult);
    const goldBefore = this.stageManager ? this.stageManager.gold : 0;
    // Grant gold & multiple items (C-STORY-102)
    if (this.stageManager) {
      this.stageManager.addGold(scaledGold);
      if (DAILY_ACTIVITY_CHEST_CONFIG.rewardItems) {
        for (const [itemType, count] of Object.entries(DAILY_ACTIVITY_CHEST_CONFIG.rewardItems)) {
          this.stageManager.addItem(itemType, count);
        }
      } else if (DAILY_ACTIVITY_CHEST_CONFIG.rewardItem) {
        this.stageManager.addItem(DAILY_ACTIVITY_CHEST_CONFIG.rewardItem, DAILY_ACTIVITY_CHEST_CONFIG.itemCount);
      }
    }

    this.state.activityChestClaimed = true;
    this.saveState();

    if (this.stageManager && this.stageManager.telemetry) {
      this.stageManager.telemetry.recordTownAction({
        action: 'DAILY_ACTIVITY_CHEST',
        goldBefore,
        goldAfter: this.stageManager.gold,
        techTier: this.stageManager.baseTier,
        equippedPower: this.stageManager.inventory.getEquippedPower(),
        detail: { rewardGold: scaledGold, mult: scaling.dailyMult }
      });
    }

    return {
      success: true,
      reward: { ...DAILY_ACTIVITY_CHEST_CONFIG, rewardGold: scaledGold, mult: scaling.dailyMult }
    };
  }

  // 5. Claim Tiered Gold Event Stage Daily Reward (Unlocks after Stage 20, LV.1 ~ LV.6)
  claimEventStageReward() {
    const scaling = this.getEconomyScaling();
    if (!scaling.eventUnlocked) {
      return { success: false, reason: `尚未解鎖！通過第 20 關即可開放「黃金討伐活動關」！` };
    }
    if (this.state.eventStageClaimedToday) {
      return { success: false, reason: '今日黃金討伐活動關獎勵已領取，明日再戰！' };
    }

    const rewardGold = scaling.eventRewardGold;
    const goldBefore = this.stageManager ? this.stageManager.gold : 0;
    if (this.stageManager) {
      this.stageManager.addGold(rewardGold);
    }

    this.state.eventStageClaimedToday = true;
    this.saveState();

    if (this.stageManager && this.stageManager.telemetry) {
      this.stageManager.telemetry.recordTownAction({
        action: 'EVENT_STAGE_CLAIM',
        goldBefore,
        goldAfter: this.stageManager.gold,
        techTier: this.stageManager.baseTier,
        equippedPower: this.stageManager.inventory.getEquippedPower(),
        detail: { eventLevel: scaling.eventLevel, eventName: scaling.eventName, rewardGold }
      });
    }

    return {
      success: true,
      eventLevel: scaling.eventLevel,
      eventName: scaling.eventName,
      rewardGold
    };
  }

  // Query Badges & Summaries
  hasSignInPending() {
    return !this.state.signInClaimedToday;
  }

  hasShopGiftPending() {
    return !this.state.shopGiftClaimedToday;
  }

  hasQuestPending() {
    // Has any completed but unclaimed quest
    for (const q of DAILY_QUEST_CONFIGS) {
      const data = this.state.quests[q.id];
      if (data && !data.claimed && data.progress >= q.target) {
        return true;
      }
    }
    // Has 100 activity chest unclaimed
    if (this.state.activityPoints >= DAILY_ACTIVITY_CHEST_CONFIG.requiredPoints && !this.state.activityChestClaimed) {
      return true;
    }
    return false;
  }

  hasAnyPendingReward() {
    return this.hasSignInPending() || this.hasShopGiftPending() || this.hasQuestPending();
  }

  getSummaryStatus() {
    return {
      signInPending: this.hasSignInPending(),
      shopGiftPending: this.hasShopGiftPending(),
      questPending: this.hasQuestPending(),
      hasAnyPending: this.hasAnyPendingReward(),
      signInDay: this.state.signInDay,
      activityPoints: this.state.activityPoints
    };
  }

  // Reset all daily loop data (used for settings reset)
  resetAll() {
    try {
      localStorage.removeItem(this.saveKey);
    } catch (e) {}
    this.state = this.getInitialState();
    this.saveState();
  }
}
