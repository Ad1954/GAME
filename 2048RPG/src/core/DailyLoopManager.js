// DailyLoopManager.js: Manages 7-Day Login Bonus, Free Shop Supplies, and Daily Quests
import {
  Events,
  DAILY_SIGNIN_REWARDS,
  DAILY_FREE_SHOP_REWARD,
  DAILY_QUEST_CONFIGS,
  DAILY_ACTIVITY_CHEST_CONFIG
} from './Constants.js';

export const DAILY_LOOP_SAVE_KEY = '2048RPG_DailyLoop_Save_v1';

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
      this.incrementQuestProgress('quest_kill_monsters', 1);
    });

    // 2. High Tier Tile Merged (≥ 128)
    this.eventBus.on(Events.TILE_MERGED, (payload) => {
      if (payload && payload.tile && payload.tile.value >= 128) {
        // Only count equipment or hero tiles (positive fusion)
        if (payload.tile.isEquipment() || payload.tile.isHero()) {
          this.incrementQuestProgress('quest_high_merge', 1);
        }
      }
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
    this.eventBus.on(Events.STAGE_VICTORY, () => {
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

  // 1. Claim Daily Sign-in Reward
  claimSignInReward() {
    if (this.state.signInClaimedToday) {
      return { success: false, reason: 'ALREADY_CLAIMED_TODAY' };
    }

    const currentDayCfg = DAILY_SIGNIN_REWARDS.find(r => r.day === this.state.signInDay) || DAILY_SIGNIN_REWARDS[0];
    
    // Grant gold
    if (currentDayCfg.gold && this.stageManager) {
      this.stageManager.addGold(currentDayCfg.gold);
    }
    // Grant items if present
    if (currentDayCfg.items && this.stageManager) {
      for (const [itemType, count] of Object.entries(currentDayCfg.items)) {
        this.stageManager.addItem(itemType, count);
      }
    }

    this.state.signInClaimedToday = true;
    this.saveState();

    return {
      success: true,
      day: currentDayCfg.day,
      reward: currentDayCfg
    };
  }

  // 2. Claim Shop Free Daily Supplies
  claimShopGift() {
    if (this.state.shopGiftClaimedToday) {
      return { success: false, reason: 'ALREADY_CLAIMED_TODAY' };
    }

    const reward = DAILY_FREE_SHOP_REWARD;
    if (this.stageManager) {
      this.stageManager.addGold(reward.gold);
    }

    this.state.shopGiftClaimedToday = true;
    this.saveState();

    return {
      success: true,
      reward
    };
  }

  // 3. Claim Quest Reward
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

    // Grant gold
    if (this.stageManager) {
      this.stageManager.addGold(qCfg.rewardGold);
    }

    // Add activity points
    this.state.activityPoints = Math.min(100, this.state.activityPoints + qCfg.activityPoints);

    this.saveState();

    return {
      success: true,
      questId,
      rewardGold: qCfg.rewardGold,
      activityPoints: this.state.activityPoints
    };
  }

  // 4. Claim 100-Activity Master Chest
  claimActivityChest() {
    if (this.state.activityPoints < DAILY_ACTIVITY_CHEST_CONFIG.requiredPoints) {
      return { success: false, reason: 'INSUFFICIENT_ACTIVITY_POINTS' };
    }
    if (this.state.activityChestClaimed) {
      return { success: false, reason: 'ALREADY_CLAIMED' };
    }

    // Grant gold & multiple items (C-STORY-102)
    if (this.stageManager) {
      this.stageManager.addGold(DAILY_ACTIVITY_CHEST_CONFIG.rewardGold);
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

    return {
      success: true,
      reward: DAILY_ACTIVITY_CHEST_CONFIG
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
