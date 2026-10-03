// StageManager.js: Master Controller for Single-Stage Flow, Progression, and State in Commercial Edition

import { Board } from './Board.js';
import { MoveEngine } from './MoveEngine.js';
import { Spawner } from './Spawner.js';
import { GameEventBus } from './GameEventBus.js';
import { GachaEngine } from './GachaEngine.js';
import { InventoryManager } from './InventoryManager.js';
import { 
  Events, 
  STAGE_CONFIGS, 
  BOARD_SIZE, 
  BASE_STAT_TIERS, 
  CHAPTER_CONFIGS, 
  MAX_ITEM_STACK, 
  getWarehouseUpgradeConfig,
  MAX_STAMINA,
  STAMINA_RECOVERY_INTERVAL_MS,
  INTERSTITIAL_AD_INTERVAL,
  DAILY_AD_GOLD_REWARD,
  DAILY_AD_MAX_COUNT
} from './Constants.js';

const SAVE_KEY = '2048RPG_Commercial_Save_v1';

export class StageManager {
  constructor(eventBus = new GameEventBus()) {
    this.eventBus = eventBus;
    this.board = new Board(BOARD_SIZE);
    this.moveEngine = new MoveEngine(this.board);
    this.spawner = new Spawner(this.board);
    this.gachaEngine = new GachaEngine();
    this.inventory = new InventoryManager();

    // Player Profile State
    this.gold = 300;
    this.unlockedStageId = 1;
    this.clearedStages = {}; // { [stageId]: { stars: number, clearedCount: number } }
    this.gachaExp = 0; // Total pulls
    this.gachaLevel = 1;
    this.warehouseExpansionLevel = 0; // Warehouse capacity upgrades (C-STORY-022)

    // Stamina & Monetization Privileges (C-STORY-026)
    this.stamina = MAX_STAMINA;
    this.maxStamina = MAX_STAMINA;
    this.lastStaminaRecoverTime = Date.now();
    this.hasNoAdsPass = false;
    this.hasUnlimitedStamina = false;
    this.battleCountForAd = 0;
    this.dailyAdRemain = DAILY_AD_MAX_COUNT;
    this.lastDailyAdDate = new Date().toDateString();

    // Base Stat Tier Tech State (C-STORY-008)
    this.baseTier = 1;
    this.stageGoldEarned = 0;
    this.pendingWaves = [];

    // Emergency Items State (C-STORY-007)
    this.items = { undo: 0, hammer: 0, snipe: 0 };
    this.history = []; // Battle state snapshots

    // Active Combat State
    this.currentStageConfig = null;
    this.isInBattle = false;
    this.isVictory = false;
    this.isGameOver = false;
    this.turnCount = 0;
    this.monstersKilled = 0;

    // Load persistent profile
    this.loadSaveData();
  }

  // Load from localStorage
  loadSaveData() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.gold = typeof parsed.gold === 'number' ? parsed.gold : 300;
        this.unlockedStageId = parsed.unlockedStageId || 1;
        this.clearedStages = parsed.clearedStages || {};
        this.gachaExp = typeof parsed.gachaExp === 'number' ? parsed.gachaExp : 0;
        this.gachaLevel = this.gachaEngine.calculateLevel(this.gachaExp);
        this.baseTier = typeof parsed.baseTier === 'number' ? parsed.baseTier : 1;
        this.warehouseExpansionLevel = typeof parsed.warehouseExpansionLevel === 'number' ? parsed.warehouseExpansionLevel : 0;

        // Stamina & Privileges (C-STORY-026)
        this.stamina = typeof parsed.stamina === 'number' ? parsed.stamina : MAX_STAMINA;
        this.lastStaminaRecoverTime = typeof parsed.lastStaminaRecoverTime === 'number' ? parsed.lastStaminaRecoverTime : Date.now();
        this.hasNoAdsPass = !!parsed.hasNoAdsPass;
        this.hasUnlimitedStamina = !!parsed.hasUnlimitedStamina;
        this.battleCountForAd = typeof parsed.battleCountForAd === 'number' ? parsed.battleCountForAd : 0;
        this.dailyAdRemain = typeof parsed.dailyAdRemain === 'number' ? parsed.dailyAdRemain : DAILY_AD_MAX_COUNT;
        this.lastDailyAdDate = parsed.lastDailyAdDate || new Date().toDateString();

        if (new Date().toDateString() !== this.lastDailyAdDate) {
          this.dailyAdRemain = DAILY_AD_MAX_COUNT;
          this.lastDailyAdDate = new Date().toDateString();
        }

        if (parsed.items) {
          this.items = {
            undo: Math.min(MAX_ITEM_STACK, typeof parsed.items.undo === 'number' ? parsed.items.undo : 0),
            hammer: Math.min(MAX_ITEM_STACK, typeof parsed.items.hammer === 'number' ? parsed.items.hammer : 0),
            snipe: Math.min(MAX_ITEM_STACK, typeof parsed.items.snipe === 'number' ? parsed.items.snipe : 0)
          };
        } else {
          this.items = { undo: 0, hammer: 0, snipe: 0 };
        }
        if (parsed.inventory) {
          this.inventory.deserialize(parsed.inventory);
        }
        this.inventory.setCapacity(24 + this.warehouseExpansionLevel * 4);
        this.checkStaminaRecovery(false);
      }
    } catch (e) {
      console.warn('Failed to load save data, using defaults', e);
    }
  }

  // Save to localStorage
  saveData() {
    try {
      const payload = {
        gold: this.gold,
        unlockedStageId: this.unlockedStageId,
        clearedStages: this.clearedStages,
        gachaExp: this.gachaExp,
        inventory: this.inventory.serialize(),
        items: this.items,
        baseTier: this.baseTier,
        warehouseExpansionLevel: this.warehouseExpansionLevel,
        stamina: this.stamina,
        lastStaminaRecoverTime: this.lastStaminaRecoverTime,
        hasNoAdsPass: this.hasNoAdsPass,
        hasUnlimitedStamina: this.hasUnlimitedStamina,
        battleCountForAd: this.battleCountForAd,
        dailyAdRemain: this.dailyAdRemain,
        lastDailyAdDate: this.lastDailyAdDate
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to write save data', e);
    }
  }

  // Reset all save data
  resetSaveData() {
    this.gold = 300;
    this.unlockedStageId = 1;
    this.clearedStages = {};
    this.gachaExp = 0;
    this.gachaLevel = 1;
    this.baseTier = 1;
    this.warehouseExpansionLevel = 0;
    this.stamina = MAX_STAMINA;
    this.maxStamina = MAX_STAMINA;
    this.lastStaminaRecoverTime = Date.now();
    this.hasNoAdsPass = false;
    this.hasUnlimitedStamina = false;
    this.battleCountForAd = 0;
    this.dailyAdRemain = DAILY_AD_MAX_COUNT;
    this.lastDailyAdDate = new Date().toDateString();
    this.items = { undo: 0, hammer: 0, snipe: 0 };
    this.history = [];
    this.inventory = new InventoryManager();
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      // ignore
    }
    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
    this.eventBus.emit(Events.INVENTORY_CHANGED, { items: this.inventory.items });
    this.eventBus.emit(Events.ITEMS_CHANGED, { items: this.items });
    this.eventBus.emit(Events.BASE_TIER_UPGRADED, { tier: this.baseTier, tierConfig: this.getBaseTierConfig() });
    this.eventBus.emit(Events.EQUIPMENT_CHANGED, { equippedItem: null });
    this.eventBus.emit(Events.STAMINA_CHANGED, {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      hasUnlimitedStamina: this.hasUnlimitedStamina
    });
    this.eventBus.emit(Events.PRIVILEGE_CHANGED, {
      hasNoAdsPass: this.hasNoAdsPass,
      hasUnlimitedStamina: this.hasUnlimitedStamina
    });
  }

  // Claim Free Test Emergency Items (C-STORY-007, C-STORY-022 Max 999)
  claimTestItems(count = 5) {
    this.items.undo = Math.min(MAX_ITEM_STACK, (this.items.undo || 0) + count);
    this.items.hammer = Math.min(MAX_ITEM_STACK, (this.items.hammer || 0) + count);
    this.items.snipe = Math.min(MAX_ITEM_STACK, (this.items.snipe || 0) + count);
    this.saveData();
    this.eventBus.emit(Events.ITEMS_CHANGED, { items: this.items, delta: count });
    return { ...this.items };
  }

  getItemCount(type) {
    return this.items[type] || 0;
  }

  // Warehouse Expansion (C-STORY-022)
  getWarehouseConfig() {
    return getWarehouseUpgradeConfig(this.warehouseExpansionLevel);
  }

  upgradeWarehouse() {
    const config = this.getWarehouseConfig();
    if (this.gold < config.cost) {
      return { success: false, reason: `金幣不足！擴充需要 ${config.cost} 🪙（持有: ${this.gold} 🪙）` };
    }

    this.gold -= config.cost;
    this.warehouseExpansionLevel++;
    this.inventory.upgradeCapacity(4);
    this.saveData();

    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
    this.eventBus.emit(Events.WAREHOUSE_EXPANDED, {
      level: this.warehouseExpansionLevel,
      newCapacity: this.inventory.maxCapacity,
      cost: config.cost
    });
    this.eventBus.emit(Events.INVENTORY_CHANGED, { items: this.inventory.items });

    return {
      success: true,
      level: this.warehouseExpansionLevel,
      newCapacity: this.inventory.maxCapacity,
      cost: config.cost
    };
  }

  // Base Stat Tier Methods (C-STORY-008)
  getBaseTierConfig() {
    return BASE_STAT_TIERS.find(t => t.tier === this.baseTier) || BASE_STAT_TIERS[0];
  }

  getNextBaseTierConfig() {
    return BASE_STAT_TIERS.find(t => t.tier === this.baseTier + 1) || null;
  }

  upgradeBaseTier() {
    const next = this.getNextBaseTierConfig();
    if (!next) {
      return { success: false, reason: '王國軍備科技已達最高階級 (Tier 24)！' };
    }
    // Check gear gate requirement (C-STORY-024)
    const equippedVal = this.inventory && this.inventory.equippedItem ? this.inventory.equippedItem.value : 0;
    if (next.minEquippedWeapon && (!equippedVal || equippedVal < next.minEquippedWeapon)) {
      return {
        success: false,
        reason: `裝備實力不足！需先穿戴 Tier ${next.minEquippedWeapon} 以上的裝備，王國工坊才能研發此項大突破科技！`
      };
    }
    if (this.gold < next.cost) {
      return { success: false, reason: `金幣不足！升級需要 ${next.cost} 🪙（持有: ${this.gold} 🪙）` };
    }

    this.gold -= next.cost;
    this.baseTier = next.tier;
    this.saveData();

    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
    this.eventBus.emit(Events.BASE_TIER_UPGRADED, {
      tier: this.baseTier,
      tierConfig: next,
      isMajor: next.isMajor
    });

    return { success: true, tier: this.baseTier, tierConfig: next };
  }

  // Claim 10,000 Free Test Gold
  claimTestGold(amount = 10000) {
    this.gold += amount;
    this.saveData();
    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold, delta: amount });
    return this.gold;
  }

  // Pull Gacha (1 or 10 times)
  pullGacha(times = 1) {
    const cost = (times === 10) ? 1000 : (times * 100);
    if (this.gold < cost) {
      return { success: false, reason: '金幣不足，請先領取測試金幣或通關獲取！' };
    }
    if (!this.inventory.canAdd(times)) {
      return { success: false, reason: '裝備背包已滿，請先進行合成整理！' };
    }

    this.gold -= cost;
    const oldLevel = this.gachaLevel;
    this.gachaExp += times;
    this.gachaLevel = this.gachaEngine.calculateLevel(this.gachaExp);
    const levelUp = this.gachaLevel > oldLevel;

    // Roll items
    const rolledValues = this.gachaEngine.rollMulti(this.gachaLevel, times);
    const addedItems = this.inventory.addItems(rolledValues);

    // Roll bonus emergency items (1/30 probability, 6:3:1 ratio) (C-STORY-022)
    const bonusItems = [];
    for (let i = 0; i < times; i++) {
      const bonus = this.gachaEngine.rollBonusItem();
      if (bonus) {
        bonusItems.push(bonus);
        this.items[bonus.type] = Math.min(MAX_ITEM_STACK, (this.items[bonus.type] || 0) + 1);
      }
    }
    if (bonusItems.length > 0) {
      this.eventBus.emit(Events.ITEMS_CHANGED, { items: this.items });
    }

    this.saveData();
    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
    this.eventBus.emit(Events.INVENTORY_CHANGED, { items: this.inventory.items });
    this.eventBus.emit(Events.GACHA_PULLED, {
      items: addedItems,
      bonusItems,
      exp: this.gachaExp,
      level: this.gachaLevel,
      levelUp
    });
    if (levelUp) {
      this.eventBus.emit(Events.GACHA_LEVEL_UP, { level: this.gachaLevel });
    }

    return {
      success: true,
      items: addedItems,
      bonusItems,
      cost,
      level: this.gachaLevel,
      exp: this.gachaExp,
      levelUp
    };
  }

  // Batch Auto-Merge items in inventory
  batchAutoMerge() {
    const result = this.inventory.batchAutoMerge();
    this.saveData();
    this.eventBus.emit(Events.INVENTORY_CHANGED, { items: this.inventory.items });
    return result;
  }

  // Equip item
  equipItem(itemId) {
    const res = this.inventory.equip(itemId);
    if (res.success) {
      this.saveData();
      this.eventBus.emit(Events.EQUIPMENT_CHANGED, { equippedItem: this.inventory.equippedItem });
      this.eventBus.emit(Events.INVENTORY_CHANGED, { items: this.inventory.items });
    }
    return res;
  }

  // Unequip item
  unequipItem() {
    const res = this.inventory.unequip();
    if (res.success) {
      this.saveData();
      this.eventBus.emit(Events.EQUIPMENT_CHANGED, { equippedItem: null });
      this.eventBus.emit(Events.INVENTORY_CHANGED, { items: this.inventory.items });
    }
    return res;
  }

  // Manual fusion
  manualMergeItems(id1, id2) {
    const res = this.inventory.mergeItems(id1, id2);
    if (res.success) {
      this.saveData();
      this.eventBus.emit(Events.INVENTORY_CHANGED, { items: this.inventory.items });
    }
    return res;
  }

  // ==========================================
  // C-STORY-026: STAMINA & AD MONETIZATION
  // ==========================================
  checkStaminaRecovery(emit = true) {
    if (this.hasUnlimitedStamina) {
      this.stamina = this.maxStamina;
      return { recovered: 0, stamina: this.stamina };
    }
    if (this.stamina >= this.maxStamina) {
      this.lastStaminaRecoverTime = Date.now();
      return { recovered: 0, stamina: this.stamina };
    }

    const now = Date.now();
    const elapsed = now - this.lastStaminaRecoverTime;
    const recoveredPoints = Math.floor(elapsed / STAMINA_RECOVERY_INTERVAL_MS);

    if (recoveredPoints > 0) {
      this.stamina = Math.min(this.maxStamina, this.stamina + recoveredPoints);
      this.lastStaminaRecoverTime += recoveredPoints * STAMINA_RECOVERY_INTERVAL_MS;
      if (this.stamina >= this.maxStamina) {
        this.lastStaminaRecoverTime = now;
      }
      this.saveData();
      if (emit) {
        this.eventBus.emit(Events.STAMINA_CHANGED, {
          stamina: this.stamina,
          maxStamina: this.maxStamina,
          hasUnlimitedStamina: this.hasUnlimitedStamina
        });
      }
    }

    return { recovered: recoveredPoints, stamina: this.stamina };
  }

  canStartStage() {
    this.checkStaminaRecovery(true);
    return this.hasUnlimitedStamina || this.stamina > 0;
  }

  consumeStaminaOnDefeat() {
    if (this.hasUnlimitedStamina) return;
    if (this.stamina === this.maxStamina) {
      this.lastStaminaRecoverTime = Date.now();
    }
    this.stamina = Math.max(0, this.stamina - 1);
    this.saveData();
    this.eventBus.emit(Events.STAMINA_CHANGED, {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      hasUnlimitedStamina: this.hasUnlimitedStamina
    });
  }

  refillStamina(amount = MAX_STAMINA) {
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    if (this.stamina >= this.maxStamina) {
      this.lastStaminaRecoverTime = Date.now();
    }
    this.saveData();
    this.eventBus.emit(Events.STAMINA_CHANGED, {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      hasUnlimitedStamina: this.hasUnlimitedStamina
    });
  }

  recordBattleEnd() {
    this.battleCountForAd++;
    this.saveData();
    const triggerAd = !this.hasNoAdsPass && (this.battleCountForAd % INTERSTITIAL_AD_INTERVAL === 0);
    return { triggerAd, count: this.battleCountForAd };
  }

  buyNoAdsPass() {
    this.hasNoAdsPass = true;
    this.saveData();
    this.eventBus.emit(Events.PRIVILEGE_CHANGED, {
      hasNoAdsPass: this.hasNoAdsPass,
      hasUnlimitedStamina: this.hasUnlimitedStamina
    });
    return { success: true };
  }

  buyUnlimitedStaminaPass() {
    this.hasUnlimitedStamina = true;
    this.stamina = this.maxStamina;
    this.saveData();
    this.eventBus.emit(Events.PRIVILEGE_CHANGED, {
      hasNoAdsPass: this.hasNoAdsPass,
      hasUnlimitedStamina: this.hasUnlimitedStamina
    });
    this.eventBus.emit(Events.STAMINA_CHANGED, {
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      hasUnlimitedStamina: this.hasUnlimitedStamina
    });
    return { success: true };
  }

  claimDailyAdGold() {
    const today = new Date().toDateString();
    if (today !== this.lastDailyAdDate) {
      this.dailyAdRemain = DAILY_AD_MAX_COUNT;
      this.lastDailyAdDate = today;
    }

    if (this.dailyAdRemain <= 0) {
      return { success: false, reason: '今日福利廣告獎勵已全數領取完畢！' };
    }

    this.dailyAdRemain--;
    this.claimTestGold(DAILY_AD_GOLD_REWARD);
    this.saveData();

    return {
      success: true,
      reward: DAILY_AD_GOLD_REWARD,
      remain: this.dailyAdRemain,
      totalGold: this.gold
    };
  }

  // Starts a specific stage
  startStage(stageId, heroPower) {
    if (!this.canStartStage()) {
      return null;
    }
    const config = STAGE_CONFIGS.find(s => s.id === stageId);
    if (!config) return null;

    // Use passed heroPower if provided, otherwise inherit from equipped item or default to 2
    const actualHeroPower = (heroPower !== undefined) ? heroPower : this.inventory.getEquippedPower();

    this.currentStageConfig = config;
    this.isInBattle = true;
    this.isVictory = false;
    this.isGameOver = false;
    this.turnCount = 0;
    this.monstersKilled = 0;
    this.stageGoldEarned = 0;
    this.inBattleGold = 0;

    // Rich vein decay & dynamic interval budget (C-STORY-019)
    const budget = (config && config.goldSpawnBudget !== undefined) 
      ? config.goldSpawnBudget 
      : ((config && config.goldCap !== undefined) ? config.goldCap : 20);
    this.goldSpawnBudget = budget;
    this.remainingGoldBudget = budget;

    // Minimum gold base value is strictly 4 (no micro-chips < 4) (C-STORY-019)
    const richVal = Math.max(4, (config && config.goldBaseValue !== undefined) ? config.goldBaseValue : 4);
    this.currentGoldValue = richVal;
    this.goldDropsCount = 0;
    this.goldDropInterval = 8;
    this.nextGoldDropTurn = 8;

    this.pendingWaves = (config.waves && Array.isArray(config.waves)) 
      ? JSON.parse(JSON.stringify(config.waves)) 
      : [];
    this.history = [];

    // Reset board
    this.board.clear();
    this.moveEngine = new MoveEngine(this.board);
    this.spawner = new Spawner(this.board);

    // 1. Spawn Hero at random position on bottom row (4, 0~4) (C-STORY-009)
    const heroCol = Math.floor(Math.random() * 5);
    this.spawner.spawnHero(actualHeroPower, { r: 4, c: heroCol });

    // 2. Spawn Monsters randomly across upper rows (0~2) based on stage config (C-STORY-009)
    if (config.monsters && config.monsters.length > 0) {
      const positions = this.getRandomPlacementPositions(config.monsters.length);
      config.monsters.forEach((mDef, idx) => {
        const pos = positions[idx] || { r: 0, c: 2 };
        if (typeof mDef === 'object' && mDef !== null) {
          this.spawner.spawnMonster(mDef.value, pos, mDef);
        } else {
          this.spawner.spawnMonster(mDef, pos);
        }
      });
    }

    // 3. Spawn Starter Equipment
    if (config.starterEquipment && config.starterEquipment.length > 0) {
      config.starterEquipment.forEach(eqVal => {
        const empty = this.board.getEmptyCells();
        if (empty.length > 0) {
          const cell = empty[Math.floor(Math.random() * empty.length)];
          this.spawner.spawnEquipment(eqVal, cell);
        }
      });
    }

    this.emitState();
    return config;
  }

  // Random Placement Positions in upper region (rows 0~2, cols 0~4) (C-STORY-009)
  getRandomPlacementPositions(count) {
    const candidates = [];
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c < 5; c++) {
        candidates.push({ r, c });
      }
    }
    // Fisher-Yates shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, count);
  }

  // Fast-Forward Stage Progress with full first-clear rewards + 30G per stage compensation (C-STORY-009)
  fastForwardToStage(targetStageId) {
    targetStageId = Math.max(1, Math.min(350, parseInt(targetStageId, 10) || 1));
    let firstClearSum = 0;
    const preStagesCount = targetStageId - 1;

    for (let sId = 1; sId < targetStageId; sId++) {
      const cfg = STAGE_CONFIGS.find(s => s.id === sId);
      if (cfg) {
        if (!this.clearedStages[sId]) {
          firstClearSum += (cfg.rewardGold || 100);
        }
        this.clearedStages[sId] = { stars: 3, clearedCount: 1 };
      }
    }

    const inCombatSum = preStagesCount * 30;
    const totalAwarded = firstClearSum + inCombatSum;
    this.gold += totalAwarded;

    if (targetStageId > this.unlockedStageId) {
      this.unlockedStageId = targetStageId;
    }

    this.saveData();
    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
    this.eventBus.emit(Events.STAGE_UNLOCKED, { stageId: this.unlockedStageId });
    this.eventBus.emit(Events.STAGE_FAST_FORWARD, {
      targetStageId,
      preStagesCount,
      firstClearSum,
      inCombatSum,
      totalAwarded,
      totalGold: this.gold
    });

    return {
      success: true,
      targetStageId,
      preStagesCount,
      firstClearSum,
      inCombatSum,
      totalAwarded,
      totalGold: this.gold
    };
  }

  // Check if a chapter is unlocked (C-STORY-006 & C-STORY-008: 8 Chapters)
  isChapterUnlocked(chapterId) {
    if (chapterId === 1) return true;
    const chConfig = CHAPTER_CONFIGS.find(c => c.id === chapterId);
    if (!chConfig) return false;
    const prevCh = CHAPTER_CONFIGS.find(c => c.id === chapterId - 1);
    if (!prevCh) return true;
    const requiredStageId = prevCh.range[1];
    return !!this.clearedStages[requiredStageId] || this.unlockedStageId > requiredStageId;
  }

  getMonsterPlacementPositions(count) {
    if (count === 1) {
      return [{ r: 0, c: 2 }];
    } else if (count === 2) {
      return [{ r: 0, c: 1 }, { r: 0, c: 3 }];
    } else if (count === 3) {
      return [{ r: 0, c: 1 }, { r: 0, c: 3 }, { r: 1, c: 2 }];
    } else if (count === 4) {
      return [
        { r: 0, c: 1 },
        { r: 0, c: 3 },
        { r: 1, c: 1 },
        { r: 1, c: 3 }
      ];
    } else if (count === 5) {
      return [
        { r: 0, c: 0 }, { r: 0, c: 2 }, { r: 0, c: 4 },
        { r: 1, c: 1 }, { r: 1, c: 3 }
      ];
    } else {
      return [
        { r: 0, c: 0 }, { r: 0, c: 2 }, { r: 0, c: 4 },
        { r: 1, c: 0 }, { r: 1, c: 2 }, { r: 1, c: 4 }
      ].slice(0, count);
    }
  }

  // Spawn incoming wave monsters
  spawnWaveMonsters(monsters) {
    if (!monsters || !Array.isArray(monsters)) return;
    monsters.forEach(mDef => {
      const empty = this.board.getEmptyCells();
      if (empty.length > 0) {
        const cell = empty[Math.floor(Math.random() * empty.length)];
        if (typeof mDef === 'object' && mDef !== null) {
          this.spawner.spawnMonster(mDef.value, cell, mDef);
        } else {
          this.spawner.spawnMonster(mDef, cell);
        }
      }
    });
    this.eventBus.emit(Events.MONSTER_WAVE_SPAWNED, { monsters });
  }

  // Handle player swipe
  handleMove(direction) {
    if (!this.isInBattle || this.isVictory || this.isGameOver) {
      return { moved: false };
    }

    const snapshot = this.createBattleSnapshot();
    const result = this.moveEngine.move(direction);

    if (result.moved) {
      this.history.push(snapshot);
      this.turnCount++;
      if (result.kills > 0) {
        this.monstersKilled += result.kills;
        this.eventBus.emit(Events.MONSTER_KILLED, { kills: result.kills });

        // Handle Splitting Monsters (C-STORY-006)
        if (result.slainMonsters && result.slainMonsters.length > 0) {
          result.slainMonsters.forEach(m => {
            if (m.splitOnDeath) {
              const count = m.splitCount || 2;
              const val = m.splitValue || (m.value >= 32 ? Math.floor(m.value / 4) : 16);
              for (let i = 0; i < count; i++) {
                const empty = this.board.getEmptyCells();
                if (empty.length > 0) {
                  const cell = empty[Math.floor(Math.random() * empty.length)];
                  this.spawner.spawnMonster(val, cell, { splitOnDeath: false });
                }
              }
            }
          });
        }
      }

      // Check Gold merged cash-out rewards (100% full payout, no clamping) (C-STORY-017)
      if (result.goldEarned && result.goldEarned > 0) {
        const actualEarned = result.goldEarned;
        this.stageGoldEarned += actualEarned;
        this.inBattleGold = (this.inBattleGold || 0) + actualEarned;
        this.gold += actualEarned;
        this.saveData();
        this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
        this.eventBus.emit(Events.GOLD_MERGED, { 
          amount: actualEarned, 
          totalGold: this.gold,
          stageGoldEarned: this.stageGoldEarned
        });
      }

      // Check turn-based wave reinforcements (C-STORY-008)
      if (this.pendingWaves && this.pendingWaves.length > 0) {
        for (let i = this.pendingWaves.length - 1; i >= 0; i--) {
          const wave = this.pendingWaves[i];
          if (wave.turn && this.turnCount >= wave.turn) {
            this.spawnWaveMonsters(wave.monsters || wave);
            this.pendingWaves.splice(i, 1);
          }
        }
      }

      // Check Victory Condition: All monsters eliminated
      const remainingMonsters = this.board.getMonsters();
      if (remainingMonsters.length === 0) {
        if (this.pendingWaves && this.pendingWaves.length > 0) {
          const nextWave = this.pendingWaves.shift();
          this.spawnWaveMonsters(nextWave.monsters || nextWave);
          this.emitState();
          return result;
        } else {
          this.handleVictory();
          return result;
        }
      }

      // Gold pacing (Two-stage rich + trickle budget) & Base Tech Tier Equipment Drop (C-STORY-017)
      const tierConfig = this.getBaseTierConfig();

      if (this.turnCount > 0 && this.turnCount === this.nextGoldDropTurn) {
        let spawnVal = 0;
        if (this.remainingGoldBudget >= this.currentGoldValue) {
          spawnVal = this.currentGoldValue;
        } else if (this.remainingGoldBudget >= 4) {
          spawnVal = 4;
        }

        if (spawnVal > 0) {
          this.spawner.spawnGold(spawnVal);
          this.remainingGoldBudget -= spawnVal;
          this.goldDropsCount++;

          // Rich vein decay: Every 4 drops, drop 1 tier (halve value down to min 4) (C-STORY-019 / C-STORY-029)
          if (this.goldDropsCount % 4 === 0) {
            this.currentGoldValue = Math.max(4, Math.floor(this.currentGoldValue / 2));
          }

          // Dynamic pacing: After initial 8 rich drops, each drop increases interval by 2 turns (capped at 16) (C-STORY-029)
          if (this.goldDropsCount >= 8) {
            this.goldDropInterval = Math.min(16, this.goldDropInterval + 2);
          }
          this.nextGoldDropTurn = this.turnCount + this.goldDropInterval;
        } else {
          // Budget exhausted or insufficient for min 4 gold: spawn tier equipment & stop gold scheduling
          this.spawner.spawnTurnEquipment(tierConfig);
          this.nextGoldDropTurn = Infinity;
        }
      } else {
        // Spawn normal equipment according to Base Tech Tier (1~24)
        this.spawner.spawnTurnEquipment(tierConfig);
      }

      // Check Defeat Condition: Deadlock
      if (!this.moveEngine.canMove()) {
        this.handleDefeat();
        return result;
      }

      this.emitState({ moves: result.moves, vfxEvents: result.vfxEvents });
    }

    return result;
  }

  // Tap-to-Cash-Out Gold Tile directly from board (100% full cash out, C-STORY-017)
  cashOutGoldTile(r, c) {
    if (!this.isInBattle || this.isVictory || this.isGameOver) return { success: false, reason: '戰鬥已結束' };
    const tile = this.board.getTile(r, c);
    if (!tile || !tile.isGold()) return { success: false, reason: '非黃金方塊' };

    const amount = tile.value;
    this.stageGoldEarned += amount;
    this.inBattleGold = (this.inBattleGold || 0) + amount;
    this.gold += amount;

    this.board.removeTile(r, c);
    this.saveData();

    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
    this.eventBus.emit(Events.GOLD_CASHED_OUT, { 
      r, c, amount, 
      totalGold: this.gold, 
      stageGoldEarned: this.stageGoldEarned
    });
    this.emitState();
    return { success: true, amount };
  }

  createBattleSnapshot() {
    return {
      board: this.board.clone(),
      turnCount: this.turnCount,
      monstersKilled: this.monstersKilled,
      gold: this.gold,
      stageGoldEarned: this.stageGoldEarned,
      inBattleGold: this.inBattleGold || 0,
      remainingGoldBudget: this.remainingGoldBudget,
      currentGoldValue: this.currentGoldValue,
      goldDropsCount: this.goldDropsCount,
      goldDropInterval: this.goldDropInterval,
      nextGoldDropTurn: this.nextGoldDropTurn
    };
  }

  // Use Undo Hourglass Item (C-STORY-007)
  useUndoItem() {
    if (!this.isInBattle || this.isVictory || this.isGameOver) {
      return { success: false, reason: '戰鬥已結束或未在戰鬥中' };
    }
    if ((this.items.undo || 0) <= 0) {
      return { success: false, reason: '時光沙漏數量不足' };
    }
    if (!this.history || this.history.length === 0) {
      return { success: false, reason: '開局尚未移動，無法回溯' };
    }

    this.items.undo--;
    const snapshot = this.history.pop();
    this.board = snapshot.board.clone();
    this.moveEngine = new MoveEngine(this.board);
    this.spawner = new Spawner(this.board);
    this.turnCount = snapshot.turnCount;
    this.monstersKilled = snapshot.monstersKilled;
    this.gold = snapshot.gold;
    this.stageGoldEarned = snapshot.stageGoldEarned || 0;
    this.inBattleGold = snapshot.inBattleGold !== undefined ? snapshot.inBattleGold : 0;
    this.remainingGoldBudget = snapshot.remainingGoldBudget !== undefined ? snapshot.remainingGoldBudget : this.remainingGoldBudget;
    this.currentGoldValue = snapshot.currentGoldValue !== undefined ? snapshot.currentGoldValue : this.currentGoldValue;
    this.goldDropsCount = snapshot.goldDropsCount !== undefined ? snapshot.goldDropsCount : this.goldDropsCount;
    this.goldDropInterval = snapshot.goldDropInterval !== undefined ? snapshot.goldDropInterval : this.goldDropInterval;
    this.nextGoldDropTurn = snapshot.nextGoldDropTurn !== undefined ? snapshot.nextGoldDropTurn : this.nextGoldDropTurn;

    this.saveData();
    this.eventBus.emit(Events.ITEMS_CHANGED, { items: this.items });
    this.eventBus.emit(Events.ITEM_USED, { itemType: 'undo' });
    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
    this.emitState();

    return { success: true, remaining: this.items.undo };
  }

  // Use Hammer Item (C-STORY-007)
  useHammerItem(r, c) {
    if (!this.isInBattle || this.isVictory || this.isGameOver) {
      return { success: false, reason: '戰鬥已結束或未在戰鬥中' };
    }
    if ((this.items.hammer || 0) <= 0) {
      return { success: false, reason: '破壞戰槌數量不足' };
    }
    const tile = this.board.getTile(r, c);
    if (!tile) {
      return { success: false, reason: '該格子為空格，無法破壞' };
    }
    if (tile.isHero()) {
      return { success: false, reason: '無法破壞勇者方塊！' };
    }

    this.items.hammer--;
    const destroyed = this.board.removeTile(r, c);
    if (destroyed.isMonster()) {
      this.monstersKilled++;
      this.eventBus.emit(Events.MONSTER_KILLED, { kills: 1 });
    }

    this.saveData();
    this.eventBus.emit(Events.ITEMS_CHANGED, { items: this.items });
    this.eventBus.emit(Events.ITEM_USED, { itemType: 'hammer', r, c, tile: destroyed });

    const remainingMonsters = this.board.getMonsters();
    if (remainingMonsters.length === 0) {
      this.handleVictory();
    } else {
      this.emitState();
    }

    return { success: true, remaining: this.items.hammer, destroyedTile: destroyed };
  }

  // Use Snipe Crossbow Item (C-STORY-007)
  useSnipeItem(r, c) {
    if (!this.isInBattle || this.isVictory || this.isGameOver) {
      return { success: false, reason: '戰鬥已結束或未在戰鬥中' };
    }
    if ((this.items.snipe || 0) <= 0) {
      return { success: false, reason: '精準重弩數量不足' };
    }
    const tile = this.board.getTile(r, c);
    if (!tile || !tile.isMonster()) {
      return { success: false, reason: '目標非魔物，重弩僅能瞄準魔物！' };
    }
    const hero = this.board.getHero();
    if (!hero) {
      return { success: false, reason: '場上無勇者方塊' };
    }
    if (tile.value >= hero.value) {
      return {
        success: false,
        reason: `魔物戰力 (${tile.value}) 大於或等於勇者 (${hero.value})，無法使用重弩狙殺！（必須英雄戰力嚴格大於魔物）`
      };
    }

    this.items.snipe--;
    const slain = this.board.removeTile(r, c);
    this.monstersKilled++;
    this.eventBus.emit(Events.MONSTER_KILLED, { kills: 1 });

    // Handle Splitting Monsters if applicable
    if (slain.splitOnDeath) {
      const count = slain.splitCount || 2;
      const val = slain.splitValue || (slain.value >= 32 ? Math.floor(slain.value / 4) : 16);
      for (let i = 0; i < count; i++) {
        const empty = this.board.getEmptyCells();
        if (empty.length > 0) {
          const cell = empty[Math.floor(Math.random() * empty.length)];
          this.spawner.spawnMonster(val, cell, { splitOnDeath: false });
        }
      }
    }

    this.saveData();
    this.eventBus.emit(Events.ITEMS_CHANGED, { items: this.items });
    this.eventBus.emit(Events.ITEM_USED, { itemType: 'snipe', r, c, slain });

    const remainingMonsters = this.board.getMonsters();
    if (remainingMonsters.length === 0) {
      this.handleVictory();
    } else {
      this.emitState();
    }

    return { success: true, remaining: this.items.snipe, slainMonster: slain };
  }

  handleVictory() {
    this.isVictory = true;
    this.isInBattle = false;

    const currentId = this.currentStageConfig.id;
    const isFirstClear = !this.clearedStages[currentId];
    // First-clear reward is only awarded on initial victory! (C-STORY-009)
    const baseReward = isFirstClear ? (this.currentStageConfig.rewardGold || 100) : 0;
    const cap = (this.currentStageConfig && this.currentStageConfig.goldCap) ? this.currentStageConfig.goldCap : this.goldSpawnBudget;

    // Auto-Sweep remaining gold tiles from the battlefield (100% full sweep, C-STORY-017)
    const remainingGoldTiles = this.board.getAllTiles().filter(t => t.isGold());
    let sweepGold = 0;
    remainingGoldTiles.forEach(t => {
      sweepGold += t.value;
      this.board.removeTile(t.r, t.c);
    });
    this.stageGoldEarned += sweepGold;

    const inBattleGold = this.inBattleGold || 0;
    const totalEarned = baseReward + inBattleGold + sweepGold;
    this.gold += totalEarned - inBattleGold; // inBattleGold already credited during combat!

    // Record clear & unlock next stage
    if (isFirstClear) {
      this.clearedStages[currentId] = { stars: 3, clearedCount: 1 };
    } else {
      this.clearedStages[currentId].clearedCount++;
    }

    if (currentId >= this.unlockedStageId && currentId < STAGE_CONFIGS.length) {
      this.unlockedStageId = currentId + 1;
      this.eventBus.emit(Events.STAGE_UNLOCKED, { stageId: this.unlockedStageId });
    }

    this.saveData();

    this.eventBus.emit(Events.STAGE_VICTORY, {
      stage: this.currentStageConfig,
      turns: this.turnCount,
      rewardGold: baseReward,
      inBattleGold: inBattleGold,
      sweepGold: sweepGold,
      totalEarned: totalEarned,
      totalGold: this.gold,
      stageGoldEarned: this.stageGoldEarned,
      goldCap: cap,
      isFirstClear: isFirstClear
    });
    this.eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold });
    this.emitState();
  }

  handleDefeat() {
    this.isGameOver = true;
    this.isInBattle = false;
    this.consumeStaminaOnDefeat();

    this.eventBus.emit(Events.STAGE_DEFEAT, {
      stage: this.currentStageConfig,
      turns: this.turnCount,
      monstersKilled: this.monstersKilled,
      inBattleGold: this.inBattleGold || 0
    });
    this.emitState();
  }

  emitState(extra = {}) {
    const cap = (this.currentStageConfig && this.currentStageConfig.goldCap) ? this.currentStageConfig.goldCap : 0;
    this.eventBus.emit(Events.BOARD_CHANGED, {
      board: this.board,
      currentStage: this.currentStageConfig,
      isInBattle: this.isInBattle,
      isVictory: this.isVictory,
      isGameOver: this.isGameOver,
      turnCount: this.turnCount,
      monstersRemaining: this.board.getMonsters().length,
      gold: this.gold,
      unlockedStageId: this.unlockedStageId,
      items: this.items,
      baseTier: this.baseTier,
      baseTierConfig: this.getBaseTierConfig(),
      stageGoldEarned: this.stageGoldEarned,
      goldCap: cap,
      moves: extra.moves || null,
      vfxEvents: extra.vfxEvents || null
    });
  }
}
