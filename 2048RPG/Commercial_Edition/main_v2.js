// main_v2.js: Real Integrated Controller & Core App Router (C-STORY-139 / C-STORY-140)
import { GameEventBus } from './src/core/GameEventBus.js';
import { StageManager } from './src/core/StageManager.js';
import { ViewRenderer } from './src/presentation/ViewRenderer.js';
import { AudioEffects } from './src/presentation/AudioEffects.js';
import { CombatVfxEngine } from './src/presentation/CombatVfxEngine.js';
import { DailyLoopManager } from './src/core/DailyLoopManager.js';
import { GachaEngine } from './src/core/GachaEngine.js';
import { InventoryManager } from './src/core/InventoryManager.js';
import { TutorialOverlay } from './src/presentation/TutorialOverlay.js';
import {
  Direction, TileType, STAGE_CONFIGS, STAGE_0_CONFIG, Events,
  MONSTER_THEMES, HERO_THEMES, EQUIPMENT_THEMES, CHAPTER_CONFIGS,
  DEFEAT_TACTICAL_TIPS, getEquipmentImagePath, getMonsterImagePath,
  getHeroImagePath, getMonsterThemeByChapter, getTileTheme, CharacterClass, CHARACTER_SKILL_CONFIGS,
  DAILY_SIGNIN_REWARDS, DAILY_QUEST_CONFIGS, DAILY_ACTIVITY_CHEST_CONFIG, BASE_STAT_TIERS
} from './src/core/Constants.js';

class AppRouter {
  constructor() {
    this.state = 'LOBBY'; // 'LOBBY' | 'COMBAT'
    this.STAGE_CONFIGS = STAGE_CONFIGS;
    this.STAGE_0_CONFIG = STAGE_0_CONFIG;
    this.CHAPTER_CONFIGS = CHAPTER_CONFIGS;
    this.MONSTER_THEMES = MONSTER_THEMES;
    this.HERO_THEMES = HERO_THEMES;
    this.EQUIPMENT_THEMES = EQUIPMENT_THEMES;
    this.getMonsterThemeByChapter = getMonsterThemeByChapter;
    this.getMonsterImagePath = getMonsterImagePath;
    this.getEquipmentImagePath = getEquipmentImagePath;
    this.getHeroImagePath = getHeroImagePath;
    this.getTileTheme = getTileTheme;
    this.DAILY_SIGNIN_REWARDS = DAILY_SIGNIN_REWARDS;
    this.DAILY_QUEST_CONFIGS = DAILY_QUEST_CONFIGS;
    this.DAILY_ACTIVITY_CHEST_CONFIG = DAILY_ACTIVITY_CHEST_CONFIG;
    this.BASE_STAT_TIERS = BASE_STAT_TIERS;
    this.eventBus = new GameEventBus();
    this.stageManager = new StageManager(this.eventBus);
    this.audio = new AudioEffects();
    this.dailyLoopManager = new DailyLoopManager(this.eventBus, this.stageManager);
    this.stageManager.dailyLoopManager = this.dailyLoopManager;

    // Out-of-Combat Inventory Manager (C-STORY-139)
    this.initInventoryManager();

    this.isSliding = false;
    this.isSkillExecuting = false;
    this.currentAimingItem = null;

    // Active visual settings
    this.activeThemeSkin = localStorage.getItem('rpg_2048_theme_skin') || 'kingdom';
    this.activeIconStyle = localStorage.getItem('rpg_2048_icon_style') || 'style_e_clay';

    // DOM References
    this.lobbyWrapper = document.getElementById('lobby-wrapper');
    this.combatOverlay = document.getElementById('combat-overlay');
    this.boardGridEl = document.getElementById('battle-board');
    const vfxCanvas = document.getElementById('combat-vfx-canvas');

    // Presentation Engines
    if (this.boardGridEl) {
      this.viewRenderer = new ViewRenderer(this.boardGridEl);
      this.viewRenderer.setThemeSkin(this.activeThemeSkin);
      this.viewRenderer.setIconStyle(this.activeIconStyle);
    }
    if (vfxCanvas && this.boardGridEl) {
      this.vfxEngine = new CombatVfxEngine(vfxCanvas, this.boardGridEl);
    }

    // Tutorial Presentation Overlay (C-STORY-030 / C-STORY-140)
    const appContainer = document.getElementById('combat-overlay') || document.getElementById('app-container') || document.body;
    if (this.boardGridEl) {
      this.tutorialOverlay = new TutorialOverlay(appContainer, this.boardGridEl, this.eventBus);
    }

    this.bindCombatEvents();
    this.bindCombatControls();
    this.bindTitleScreen();
    this.syncHud();
    window.launchStageBattle = (stageId) => {
      const s = stageId !== undefined ? stageId : (window.currentSelectedStage !== undefined ? window.currentSelectedStage : 1);
      this.startCombat(s);
    };

    // Initial render: Follow saved progression stage (C-STORY-149)
    const initTutDone = !(this.stageManager && this.stageManager.tutorialManager && !this.stageManager.tutorialManager.isCompleted);
    window.currentSelectedStage = initTutDone ? (this.stageManager.unlockedStageId || 1) : 0;
    setTimeout(() => {
      if (typeof window.renderAdventureStage === 'function') {
        window.renderAdventureStage();
      }
      if (typeof window.renderGearInventory === 'function') {
        window.renderGearInventory();
      }
      if (typeof window.syncShopDisplay === 'function') {
        window.syncShopDisplay();
      }
    }, 100);
  }

  // ----------------------------------------------------
  // INVENTORY & LOADOUT MANAGEMENT (ITEM 6 & 9)
  // ----------------------------------------------------
  initInventoryManager() {
    this.inventoryManager = new InventoryManager(16);
    const raw = localStorage.getItem('rpg_2048_inventory_v2');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.inventoryManager.items = Array.isArray(parsed) ? parsed : [];
      } catch (e) {}
    } else {
      // Starter Gear for clean new profile
      this.inventoryManager.addItem(2); // 泥木劍 (2)
      this.inventoryManager.addItem(4); // 青銅短刃 (4)
      this.saveInventory();
    }
    this.inventoryManager.equippedItem = this.getEquippedGear();
    if (this.stageManager) {
      this.stageManager.inventory = this.inventoryManager;
    }
  }

  saveInventory() {
    localStorage.setItem('rpg_2048_inventory_v2', JSON.stringify(this.inventoryManager.items));
  }

  getEquippedGear() {
    const raw = localStorage.getItem('rpg_2048_equipped_gear');
    if (raw === 'none' || raw === 'null') return null;
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return { id: 'starter_sword', name: '泥木劍', val: 2, value: 2, img: 'assets/images/equipment_clay/equip_01.png' };
  }

  unequipGear() {
    localStorage.setItem('rpg_2048_equipped_gear', 'none');
    if (this.inventoryManager) {
      this.inventoryManager.equippedItem = null;
    }
    if (this.audio) this.audio.playClick();
    this.syncHud();
    if (typeof window.renderGearInventory === 'function') {
      window.renderGearInventory();
    }
  }

  equipGearItem(item) {
    if (!item) return;
    const v = item.value || item.val || 2;
    const tier = Math.max(1, Math.min(16, Math.round(Math.log2(v))));
    const pad = String(tier).padStart(2, '0');
    const themeName = (EQUIPMENT_THEMES[v] && EQUIPMENT_THEMES[v].name) ? EQUIPMENT_THEMES[v].name : (item.name || '神兵裝備');
    const gear = {
      id: item.id || `gear_${Date.now()}`,
      name: themeName,
      val: v,
      value: v,
      img: `assets/images/equipment_clay/equip_${pad}.png`
    };
    localStorage.setItem('rpg_2048_equipped_gear', JSON.stringify(gear));
    if (this.inventoryManager) {
      this.inventoryManager.equippedItem = gear;
    }
    if (this.audio) this.audio.playCoin();
    this.syncHud();
    if (typeof window.renderGearInventory === 'function') {
      window.renderGearInventory();
    }
  }

  // ----------------------------------------------------
  // REAL GACHA BRIDGE (ITEM 4)
  // ----------------------------------------------------
  performGacha(count) {
    const cost = count === 1 ? 100 : 900;
    if (this.stageManager.gold < cost) {
      alert(`⚠️ 金幣不足！轉蛋需要 ${cost} 🪙，目前僅有 ${this.stageManager.gold} 🪙！`);
      return { success: false };
    }

    if (!this.inventoryManager.canAdd(count)) {
      alert(`⚠️ 背包空間不足！請先前往工坊「擴充容量」或清理裝備！`);
      return { success: false };
    }

    this.stageManager.gold -= cost;
    this.stageManager.saveData();

    const rolledTiers = count === 1
      ? [this.stageManager.gachaEngine.roll(1)]
      : this.stageManager.gachaEngine.rollMulti(1, 10);
    const rolledItems = [];

    rolledTiers.forEach((tier) => {
      const it = this.inventoryManager.addItem(tier);
      if (it) {
        const tIdx = Math.max(1, Math.min(16, Math.round(Math.log2(tier))));
        const pad = String(tIdx).padStart(2, '0');
        it.name = (EQUIPMENT_THEMES[tier] && EQUIPMENT_THEMES[tier].name) ? EQUIPMENT_THEMES[tier].name : '神裝';
        it.img = `assets/images/equipment_clay/equip_${pad}.png`;
        rolledItems.push(it);
      }
    });

    this.saveInventory();
    if (this.audio) this.audio.playVictory();
    this.syncHud();

    return { success: true, items: rolledItems };
  }

  // ----------------------------------------------------
  // ROUTER STATE SWITCHING & COMBAT (ITEM 8)
  // ----------------------------------------------------
  switchAppState(newState) {
    this.state = newState;
    if (newState === 'COMBAT') {
      // Force hide all modal backdrops
      document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.remove('active');
        m.style.display = 'none';
      });

      if (this.lobbyWrapper) this.lobbyWrapper.style.display = 'none';
      if (this.combatOverlay) {
        this.combatOverlay.style.display = 'flex';
        this.combatOverlay.setAttribute('tabindex', '0');
        this.combatOverlay.focus();
      }

      requestAnimationFrame(() => {
        if (this.vfxEngine) this.vfxEngine.resize();
      });
    } else {
      if (this.combatOverlay) this.combatOverlay.style.display = 'none';
      if (this.lobbyWrapper) this.lobbyWrapper.style.display = 'flex';
      this.syncHud();

      if (typeof window.renderAdventureStage === 'function') {
        window.renderAdventureStage();
      }
      if (typeof window.renderCompendiumView === 'function') {
        window.renderCompendiumView();
      }
      if (typeof window.renderGearInventory === 'function') {
        window.renderGearInventory();
      }
    }
  }

  syncHud() {
    const staminaEl = document.getElementById('txt-stamina') || document.getElementById('top-stamina-val');
    const goldEl = document.getElementById('txt-gold') || document.getElementById('top-gold-val');
    const gemsEl = document.getElementById('txt-gems') || document.getElementById('top-gems-val');

    if (staminaEl) {
      if (this.stageManager.hasUnlimitedStamina) {
        staminaEl.textContent = '∞';
      } else {
        staminaEl.textContent = `${this.stageManager.stamina} / ${this.stageManager.maxStamina}`;
      }
    }
    if (goldEl) {
      goldEl.textContent = `${Number(this.stageManager.gold || 0).toLocaleString()} +`;
    }
    if (gemsEl) {
      const gems = localStorage.getItem('rpg_2048_gems') || '150';
      gemsEl.textContent = Number(gems).toLocaleString();
    }
    if (typeof window.syncShopDisplay === 'function') {
      window.syncShopDisplay();
    }
  }

  startCombat(stageId) {
    if (this._victoryModalTimer) {
      clearTimeout(this._victoryModalTimer);
      this._victoryModalTimer = null;
    }
    this.isSkillExecuting = false;
    this.isSliding = false;
    if (this.vfxEngine) {
      this.vfxEngine.clear();
      this.vfxEngine.resize();
    }

    const isTutPending = this.stageManager && this.stageManager.tutorialManager && !this.stageManager.tutorialManager.isCompleted;
    if (stageId === 0 || (isTutPending && (stageId === undefined || stageId === 1))) {
      this.startTutorialCombat();
      return;
    }

    if (!this.stageManager.canStartStage()) {
      const staminaModal = document.getElementById('modal-stamina-empty');
      if (staminaModal) {
        staminaModal.classList.add('active');
        staminaModal.style.display = 'flex';
      } else {
        alert('⚠️ 體力不足！戰鬥需要體力。');
      }
      return;
    }

    // Sync Camp Forge level to StageManager baseTier before rolling initial Next Tile Preview (C-STORY-152)
    try {
      const rawCamp = localStorage.getItem('rpg_2048_camp_upgrades');
      if (rawCamp) {
        const parsedCamp = JSON.parse(rawCamp);
        if (parsedCamp && typeof parsedCamp.forge === 'number') {
          this.stageManager.baseTier = Math.max(1, Math.min(48, parsedCamp.forge));
        }
      }
    } catch (e) {}

    const eqGear = this.getEquippedGear();
    const heroStartPower = (eqGear && (eqGear.value || eqGear.val)) ? Number(eqGear.value || eqGear.val) : 2;
    const config = this.stageManager.startStage(stageId, heroStartPower);
    if (!config) return;

    if (this.instantSkillMode) {
      const maxCd = this.stageManager.getCharacterSkillCooldown();
      this.stageManager.skillChargeTurns = maxCd;
      this.stageManager.isSkillReady = true;
    }

    this.currentCombatStageId = stageId;
    this.switchAppState('COMBAT');
    if (this.combatOverlay) this.combatOverlay.classList.remove('tutorial-mode');
    if (this.tutorialOverlay) this.tutorialOverlay.hide();

    // Update Header Info
    const stageNameEl = document.getElementById('combat-stage-name');
    const turnValEl = document.getElementById('combat-turn-val');
    const monsterValEl = document.getElementById('combat-monsters-val');
    if (stageNameEl) stageNameEl.textContent = config.name;
    if (turnValEl) turnValEl.textContent = '0';
    if (monsterValEl) monsterValEl.textContent = config.monsters ? config.monsters.length : 1;

    if (this.viewRenderer) {
      this.viewRenderer.setChapterId(config.chapter || 1);
      this.viewRenderer.renderBoard(this.stageManager.board);
    }
    this.updateNextPreview(this.stageManager.nextTilePreview);
    this.updateSkillUI();
    this.updateItemCounts();
  }

  startTutorialCombat() {
    if (this._victoryModalTimer) {
      clearTimeout(this._victoryModalTimer);
      this._victoryModalTimer = null;
    }
    this.isSkillExecuting = false;
    this.isSliding = false;
    if (this.vfxEngine) {
      this.vfxEngine.clear();
      this.vfxEngine.resize();
    }
    if (this.stageManager && this.stageManager.tutorialManager) {
      this.stageManager.tutorialManager.isCompleted = false;
    }
    const config = this.stageManager.startTutorialStage();
    if (!config) return;

    this.currentCombatStageId = 0;
    this.switchAppState('COMBAT');
    if (this.combatOverlay) this.combatOverlay.classList.add('tutorial-mode');

    const stageNameEl = document.getElementById('combat-stage-name');
    const turnValEl = document.getElementById('combat-turn-val');
    const monsterValEl = document.getElementById('combat-monsters-val');
    if (stageNameEl) stageNameEl.textContent = config.name;
    if (turnValEl) turnValEl.textContent = '0';
    if (monsterValEl) monsterValEl.textContent = config.monsters ? config.monsters.length : 1;

    if (this.viewRenderer) {
      this.viewRenderer.setChapterId(config.chapter || 1);
      this.viewRenderer.renderBoard(this.stageManager.board);
    }
    this.updateNextPreview();
    this.updateSkillUI();
    this.updateItemCounts();
  }

  handleMove(dir) {
    if (!this.stageManager.isInBattle || this.isSliding || this.isSkillExecuting) return;
    const res = this.stageManager.handleMove(dir);
    if (res.moved) {
      if (res.merges > 0) this.audio.playMerge();
      else this.audio.playSlide();
    } else if (res.reason === 'TUTORIAL_RESTRICTED') {
      if (this.tutorialOverlay) {
        this.tutorialOverlay.triggerShakingFeedback();
      }
    } else {
      if (this.viewRenderer && this.viewRenderer.triggerInvalidMoveShake) {
        this.viewRenderer.triggerInvalidMoveShake(dir);
      }
    }
  }

  exitCombat() {
    if (this._victoryModalTimer) {
      clearTimeout(this._victoryModalTimer);
      this._victoryModalTimer = null;
    }
    this.isSkillExecuting = false;
    this.isSliding = false;
    if (this.combatOverlay) this.combatOverlay.classList.remove('tutorial-mode');
    if (this.tutorialOverlay) {
      this.tutorialOverlay.hide();
    }
    if (this.stageManager.tutorialManager) {
      this.stageManager.tutorialManager.isActive = false;
    }
    if (this.stageManager.isInBattle && !this.stageManager.isVictory && !this.stageManager.isGameOver) {
      this.stageManager.abandonBattleRewards();
    }
    this.stageManager.isInBattle = false;
    if (this.vfxEngine) this.vfxEngine.clear();

    const vModal = document.getElementById('modal-victory');
    const dModal = document.getElementById('modal-defeat');
    if (vModal) vModal.style.display = 'none';
    if (dModal) dModal.style.display = 'none';

    this.switchAppState('LOBBY');
    if (typeof window.renderAdventureStage === 'function') {
      window.renderAdventureStage();
    }
  }

  bindCombatEvents() {
    const handleBoardUpdate = (state) => {
      if (!state) return;
      if (this.stageManager && this.stageManager.currentStageConfig && this.viewRenderer) {
        this.viewRenderer.setChapterId(this.stageManager.currentStageConfig.chapter || 1);
      }

      const turnValEl = document.getElementById('combat-turn-val');
      const monsterValEl = document.getElementById('combat-monsters-val');
      if (turnValEl && this.stageManager) {
        turnValEl.textContent = state.turnCount !== undefined ? state.turnCount : this.stageManager.turnCount;
      }
      if (monsterValEl) {
        if (state.monstersRemaining !== undefined) {
          monsterValEl.textContent = state.monstersRemaining;
        } else if (this.stageManager && this.stageManager.board && typeof this.stageManager.board.getMonsters === 'function') {
          monsterValEl.textContent = this.stageManager.board.getMonsters().length;
        }
      }

      this.updateNextPreview(state.nextTilePreview !== undefined ? state.nextTilePreview : (this.stageManager ? this.stageManager.nextTilePreview : null));
      this.updateSkillUI();

      if (state.moves && state.moves.length > 0) {
        this.isSliding = true;
        const preSlideSlashEvents = (state.vfxEvents || []).filter(e => e.type === 'hero_slash_monster');
        const postSlideEvents = (state.vfxEvents || []).filter(e => e.type !== 'hero_slash_monster');

        if (preSlideSlashEvents.length > 0) {
          this.viewRenderer.playVfx(preSlideSlashEvents);
          if (this.audio && this.audio.playSlash) {
            this.audio.playSlash();
          }
        }

        this.viewRenderer.animateSlide(state.moves, () => {
          this.viewRenderer.renderBoard(state.board);
          if (postSlideEvents.length > 0) {
            this.viewRenderer.playVfx(postSlideEvents);
            const hasGoldMerge = postSlideEvents.some(e => e.type === 'gold_merge');
            if (hasGoldMerge && this.audio && this.audio.playCoin) {
              this.audio.playCoin();
            }
          }
          this.isSliding = false;
        });
        setTimeout(() => { this.isSliding = false; }, 350);
      } else {
        if (state.board && this.viewRenderer) {
          this.viewRenderer.renderBoard(state.board);
          if (state.vfxEvents && state.vfxEvents.length > 0) {
            this.viewRenderer.playVfx(state.vfxEvents);
            const hasGoldMerge = state.vfxEvents.some(e => e.type === 'gold_merge');
            if (hasGoldMerge && this.audio && this.audio.playCoin) {
              this.audio.playCoin();
            }
          }
        }
        this.isSliding = false;
      }
    };

    this.eventBus.on(Events.BOARD_CHANGED, handleBoardUpdate);
    if (Events.MOVE_COMPLETED) {
      this.eventBus.on(Events.MOVE_COMPLETED, handleBoardUpdate);
    }
    this.eventBus.on(Events.ITEMS_CHANGED, () => this.updateItemCounts());

    // C-STORY-153: Monster Kill & Gold Cash-out Sound Effects
    this.eventBus.on(Events.MONSTER_KILLED, () => {
      if (this.audio) {
        if (this.audio.playSlash) this.audio.playSlash();
        if (this.audio.playKill) this.audio.playKill();
      }
    });
    this.eventBus.on(Events.GOLD_CASHED_OUT, () => {
      if (this.audio && this.audio.playCoin) {
        this.audio.playCoin();
      }
    });

    // C-STORY-152: Character Skill Charge & Auto-Rescue Events
    this.eventBus.on(Events.SKILL_CHARGE_CHANGED, (payload) => {
      this.updateSkillUI(payload);
    });

    this.eventBus.on(Events.SKILL_USED, (payload) => {
      this.updateSkillUI();
      if (this.viewRenderer && this.stageManager && this.stageManager.board) {
        this.viewRenderer.renderBoard(this.stageManager.board);
      }
      if (payload && payload.isAutoRescue && !this.isSkillExecuting) {
        this.playAutoRescueCutin(payload);
      }
    });

    this.eventBus.on(Events.STAGE_UNLOCKED, (payload) => {
      const nextStageId = (payload && payload.stageId) ? payload.stageId : this.stageManager.unlockedStageId;
      if (nextStageId) {
        window.currentSelectedStage = nextStageId;
      }
    });

    this.eventBus.on(Events.STAGE_VICTORY, (data) => {
      if (data && data.stage && typeof data.stage.id === 'number' && data.stage.id > 0) {
        const nextId = Math.min(STAGE_CONFIGS.length, data.stage.id + 1);
        if (this.stageManager.unlockedStageId >= nextId) {
          window.currentSelectedStage = nextId;
        }
      }

      // Immediately update monster count; board & swept gold VFX are rendered by emitState (C-STORY-153 & C-STORY-154)
      const monsterValEl = document.getElementById('combat-monsters-val');
      if (monsterValEl) monsterValEl.textContent = '0';

      const vModal = document.getElementById('modal-victory');
      if (vModal) {
        vModal.style.display = 'none';
        const titleEl = document.getElementById('victory-stage-name');
        const turnsEl = document.getElementById('victory-turns-val');
        const rewardEl = document.getElementById('victory-reward-val');
        const detailEl = document.getElementById('victory-reward-detail');

        if (titleEl) titleEl.textContent = data.stage.name;
        if (turnsEl) turnsEl.textContent = data.turns;
        const total = data.totalEarned !== undefined ? data.totalEarned : (data.rewardGold + (data.inBattleGold || 0));
        if (rewardEl) rewardEl.textContent = `🪙 +${total}`;
        const bGold = data.inBattleGold || 0;
        const sGold = data.sweepGold || 0;
        const battleHarvest = bGold + sGold;
        const isFirst = data.isFirstClear !== false && data.rewardGold > 0;
        if (detailEl) {
          let html = '';
          if (isFirst) {
            html += `
              <div class="victory-detail-row" style="display:flex; align-items:center;">
                <span class="victory-row-icon" style="display:inline-block; width:1.65em; text-align:center; flex-shrink:0;">★</span><span class="victory-row-label">【初次過關獎勵】+${data.rewardGold} 🪙</span>
              </div>
            `;
          }
          html += `
            <div class="victory-detail-row" style="display:flex; align-items:center;">
              <span class="victory-row-icon" style="display:inline-block; width:1.65em; text-align:center; flex-shrink:0;">⚔️</span><span class="victory-row-label">【戰鬥收穫】+${battleHarvest} 🪙</span>
            </div>
          `;
          if (sGold > 0) {
            html += `
              <div class="victory-detail-row victory-sub-row" style="display:flex; align-items:center; color:#fde68a;">
                <span class="victory-row-icon" style="display:inline-block; width:1.65em; flex-shrink:0;"></span><span class="victory-row-branch" style="display:inline-block; width:1em; text-align:center;">└</span><span>含盤面殘存自動結算 +${sGold} 🪙</span>
              </div>
            `;
          }
          detailEl.style.whiteSpace = 'normal';
          detailEl.innerHTML = html;
        }

        // Wait 0.8s (800ms) when sweeping remaining board gold so coin pop VFX finishes completely, or 0.6s (600ms) otherwise (C-STORY-153 & C-STORY-154)
        const victoryDelayMs = (sGold > 0) ? 800 : 600;
        if (this._victoryModalTimer) {
          clearTimeout(this._victoryModalTimer);
        }
        this._victoryModalTimer = setTimeout(() => {
          this._victoryModalTimer = null;
          if (this.state === 'COMBAT') {
            if (this.audio && this.audio.playVictory) this.audio.playVictory();
            vModal.style.display = 'flex';
          }
        }, victoryDelayMs);
      }
    });

    this.eventBus.on(Events.STAGE_DEFEAT, (data) => {
      this.audio.playDefeat();
      const dModal = document.getElementById('modal-defeat');
      if (dModal) {
        const stamBadge = document.getElementById('defeat-stamina-badge');
        if (stamBadge && this.stageManager) {
          const curStam = this.stageManager.hasUnlimitedStamina ? '∞' : `${this.stageManager.stamina}/${this.stageManager.maxStamina}`;
          stamBadge.textContent = this.stageManager.hasUnlimitedStamina
            ? `❤️ 遠征消耗：無限體力通行證生效中（當前 ∞）`
            : `❤️ 遠征消耗：-1 體力（當前 ${curStam}）`;
        }
        const detailEl = document.getElementById('defeat-reward-detail');
        if (detailEl) detailEl.textContent = `⚔️【戰鬥合成領取】+${data.inBattleGold || 0} 🪙`;
        dModal.style.display = 'flex';
      }
    });

    this.eventBus.on('TUTORIAL_SKIP_REQUESTED', () => {
      if (this.stageManager.tutorialManager) {
        this.stageManager.tutorialManager.skipTutorial();
      }
      this.exitCombat();
    });

    this.eventBus.on(Events.TUTORIAL_COMPLETED, () => {
      if (this.combatOverlay) this.combatOverlay.classList.remove('tutorial-mode');
      if (this.tutorialOverlay) {
        this.tutorialOverlay.hide();
      }
      this.stageManager.unlockedStageId = Math.max(1, this.stageManager.unlockedStageId || 1);
      this.stageManager.maxUnlockedStage = this.stageManager.unlockedStageId;
      this.stageManager.saveData();
      window.currentSelectedStage = 1;
      if (typeof window.renderAdventureStage === 'function') {
        window.renderAdventureStage(1);
      }
      if (this.stageManager.isInBattle && this.stageManager.currentStageConfig && this.stageManager.currentStageConfig.id === 0) {
        setTimeout(() => {
          this.stageManager.handleVictory();
        }, 500);
      }
    });

    this.eventBus.on(Events.GOLD_CHANGED, () => this.syncHud());
    this.eventBus.on(Events.STAMINA_CHANGED, () => this.syncHud());
  }

  // C-STORY-155 & C-STORY-156: Title Splash Screen Controller & Custom UI Theme Initialization
  bindTitleScreen() {
    // Initialize Theme & Splash from LocalStorage
    if (typeof window.initCustomThemeFromStorage === 'function') {
      window.initCustomThemeFromStorage();
    }

    const titleScreen = document.getElementById('view-title-screen');
    const btnStart = document.getElementById('btn-start-game');
    if (!titleScreen) return;

    let isDismissed = false;
    const enterGame = () => {
      if (isDismissed) return;
      isDismissed = true;
      if (this.audio && this.audio.playClick) this.audio.playClick();
      titleScreen.classList.add('fade-out');

      // Check tutorial status: if not completed, automatically launch Stage 0
      const isTutPending = this.stageManager && this.stageManager.tutorialManager && !this.stageManager.tutorialManager.isCompleted;
      if (isTutPending) {
        setTimeout(() => {
          this.startTutorialCombat();
        }, 350);
      } else {
        if (typeof window.renderAdventureStage === 'function') {
          window.renderAdventureStage();
        }
      }
    };

    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        e.stopPropagation();
        enterGame();
      });
    }

    titleScreen.addEventListener('click', () => {
      enterGame();
    });
  }

  bindCombatControls() {
    // Return to Lobby Button
    const btnBack = document.getElementById('btn-combat-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        this.audio.playClick();
        if (confirm('確定要返回大廳嗎？中途退出將放棄本局獲得的所有金幣收益！')) {
          this.exitCombat();
        }
      });
    }

    // Victory confirm
    const btnVictoryConfirm = document.getElementById('btn-victory-confirm') || document.getElementById('btn-victory-claim');
    if (btnVictoryConfirm) {
      btnVictoryConfirm.addEventListener('click', () => {
        this.audio.playClick();
        this.exitCombat();
      });
    }

    // Defeat options: Confirm button OR tap anywhere on #modal-defeat returns to Lobby (C-STORY-151)
    const dModalEl = document.getElementById('modal-defeat');
    if (dModalEl) {
      dModalEl.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'btn-defeat-retry') return;
        this.audio.playClick();
        this.exitCombat();
      });
    }
    const btnDefeatLobby = document.getElementById('btn-defeat-lobby');
    if (btnDefeatLobby) {
      btnDefeatLobby.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.playClick();
        this.exitCombat();
      });
    }
    const btnDefeatRetry = document.getElementById('btn-defeat-retry');
    if (btnDefeatRetry) {
      btnDefeatRetry.addEventListener('click', () => {
        this.audio.playClick();
        const dModal = document.getElementById('modal-defeat');
        if (dModal) dModal.style.display = 'none';
        this.startCombat(this.currentCombatStageId);
      });
    }

    // Comprehensive PC Cross / Arrow Keys & WASD Event Listener (Item 8)
    const handleKeyDown = (e) => {
      if (this.state !== 'COMBAT' || !this.stageManager.isInBattle) return;

      let dir = null;
      const k = e.key;
      const c = e.code;
      const kc = e.keyCode;

      if (e.key === 'ArrowUp' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'KeyW' || kc === 38 || kc === 87 || kc === 104) {
        dir = Direction.UP;
      } else if (e.key === 'ArrowDown' || e.code === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.code === 'KeyS' || kc === 40 || kc === 83 || kc === 98) {
        dir = Direction.DOWN;
      } else if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.code === 'KeyA' || kc === 37 || kc === 65 || kc === 100) {
        dir = Direction.LEFT;
      } else if (e.key === 'ArrowRight' || e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.code === 'KeyD' || kc === 39 || kc === 68 || kc === 102) {
        dir = Direction.RIGHT;
      }

      if (dir) {
        e.preventDefault();
        e.stopPropagation();
        this.handleMove(dir);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    // Direct Click on Board Grid (C-STORY-144: Gold Tap & Item Target)
    if (this.boardGridEl) {
      this.boardGridEl.addEventListener('click', (e) => {
        if (this.state !== 'COMBAT' || !this.stageManager.isInBattle) return;
        const cell = e.target.closest('.grid-cell');
        if (!cell) return;
        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        if (!isNaN(r) && !isNaN(c)) {
          this.handleCellTap(r, c);
        }
      });
    }

    // PC Mouse Drag & Tap Controls (C-STORY-142 & C-STORY-144)
    const combatArea = this.combatOverlay;
    if (combatArea) {
      let isMouseDown = false;
      let mouseStartX = 0, mouseStartY = 0;

      combatArea.addEventListener('mousedown', (e) => {
        if (this.state !== 'COMBAT' || !this.stageManager.isInBattle) return;
        if (e.target.closest('button') || e.target.closest('.combat-top-bar') || e.target.closest('.cr-modal-box') || e.target.closest('.tutorial-popup-card') || e.target.closest('#btn-tutorial-skip')) {
          return;
        }
        isMouseDown = true;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
      });

      window.addEventListener('mouseup', (e) => {
        if (!isMouseDown || this.state !== 'COMBAT' || !this.stageManager.isInBattle) return;
        isMouseDown = false;
        const dx = e.clientX - mouseStartX;
        const dy = e.clientY - mouseStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) > 20) {
          if (absX > absY) {
            this.handleMove(dx > 0 ? Direction.RIGHT : Direction.LEFT);
          } else {
            this.handleMove(dy > 0 ? Direction.DOWN : Direction.UP);
          }
        } else {
          // Tap / Click fallback
          const targetEl = document.elementFromPoint(e.clientX, e.clientY);
          const cell = targetEl ? targetEl.closest('.grid-cell') : null;
          if (cell) {
            const r = parseInt(cell.dataset.r, 10);
            const c = parseInt(cell.dataset.c, 10);
            if (!isNaN(r) && !isNaN(c)) {
              this.handleCellTap(r, c);
            }
          }
        }
      });
    }

    // Touch Swipe & Tap Controls
    if (combatArea) {
      let isTracking = false;
      let startX = 0, startY = 0;

      combatArea.addEventListener('touchstart', (e) => {
        if (this.state !== 'COMBAT' || !this.stageManager.isInBattle) return;
        if (e.target.closest('button') || e.target.closest('.combat-top-bar') || e.target.closest('.modal-card')) {
          isTracking = false;
          return;
        }
        isTracking = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
      }, { passive: true });

      combatArea.addEventListener('touchend', (e) => {
        if (!isTracking || this.state !== 'COMBAT' || !this.stageManager.isInBattle) return;
        isTracking = false;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) > 25) {
          if (absX > absY) {
            this.handleMove(dx > 0 ? Direction.RIGHT : Direction.LEFT);
          } else {
            this.handleMove(dy > 0 ? Direction.DOWN : Direction.UP);
          }
        } else {
          const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
          const cell = targetEl ? targetEl.closest('.grid-cell') : null;
          if (cell) {
            const r = parseInt(cell.dataset.r, 10);
            const c = parseInt(cell.dataset.c, 10);
            if (!isNaN(r) && !isNaN(c)) {
              this.handleCellTap(r, c);
            }
          }
        }
      });
    }

    // Item Buttons (Undo, Hammer, Snipe)
    const btnUndo = document.getElementById('btn-item-undo');
    if (btnUndo) {
      btnUndo.addEventListener('click', () => {
        if (this.stageManager.useItem('undo')) {
          if (this.audio) this.audio.playUndo();
          this.updateItemCounts();
        }
      });
    }

    const btnHammer = document.getElementById('btn-item-hammer');
    if (btnHammer) {
      btnHammer.addEventListener('click', () => {
        if (this.currentAimingItem === 'hammer') {
          this.setAimingMode(null);
          return;
        }
        const count = (this.stageManager.items && this.stageManager.items.hammer) || 0;
        if (count <= 0) {
          alert('破壞戰槌數量不足，可至商店免費領取！');
          return;
        }
        if (this.audio) this.audio.playClick();
        this.setAimingMode('hammer');
      });
    }

    const btnSnipe = document.getElementById('btn-item-snipe');
    if (btnSnipe) {
      btnSnipe.addEventListener('click', () => {
        if (this.currentAimingItem === 'snipe') {
          this.setAimingMode(null);
          return;
        }
        const count = (this.stageManager.items && this.stageManager.items.snipe) || 0;
        if (count <= 0) {
          alert('精準重弩數量不足，可至商店免費領取！');
          return;
        }
        if (this.audio) this.audio.playClick();
        this.setAimingMode('snipe');
      });
    }

    const btnCancelTarget = document.getElementById('btn-cancel-target');
    if (btnCancelTarget) {
      btnCancelTarget.addEventListener('click', () => {
        if (this.audio) this.audio.playClick();
        this.setAimingMode(null);
      });
    }

    // Character Skill Button & Wrapper Click Trigger (C-STORY-152)
    const handleSkillClick = (e) => {
      e.stopPropagation();
      if (!this.stageManager || !this.stageManager.isInBattle) return;
      if (this.isSkillExecuting) return;
      if (!this.stageManager.isSkillReady) {
        const cur = this.stageManager.skillChargeTurns || 0;
        const max = this.stageManager.getCharacterSkillCooldown();
        this.showFloatingCombatText(`⏳ 技能充能中（${cur}/${max} 回合）`, '#94a3b8');
        return;
      }
      this.triggerSkillWithVfx(false);
    };

    const skillBtn = document.getElementById('skill-badge-btn');
    const skillWrapper = document.getElementById('combat-skill-wrapper');
    if (skillBtn) {
      skillBtn.addEventListener('click', handleSkillClick);
    }
    if (skillWrapper) {
      skillWrapper.style.cursor = 'pointer';
      skillWrapper.addEventListener('click', (e) => {
        if (e.target && e.target.closest('#skill-badge-btn')) return;
        handleSkillClick(e);
      });
    }
  }

  // C-STORY-152: Real Next Tile Preview Renderer synced with StageManager.nextTilePreview
  updateNextPreview(previewOverride) {
    const cardEl = document.getElementById('next-preview-card');
    const badgeEl = document.getElementById('next-card-badge');
    const valEl = document.getElementById('next-card-val');
    if (!cardEl || !badgeEl || !valEl || !this.stageManager) return;

    const preview = (previewOverride !== undefined && previewOverride !== null)
      ? previewOverride
      : this.stageManager.nextTilePreview;

    if (!preview) {
      cardEl.style.display = 'none';
      return;
    }
    cardEl.style.display = 'flex';

    if (preview.type === TileType.GOLD) {
      valEl.textContent = preview.value;
      cardEl.classList.add('preview-gold');
      cardEl.style.backgroundColor = '';
      cardEl.style.borderColor = '';
      badgeEl.innerHTML = '';
      badgeEl.style.display = 'none';
    } else {
      let theme = null;
      let previewImgPath = null;
      const chId = (this.stageManager && this.stageManager.currentStageConfig)
        ? this.stageManager.currentStageConfig.chapter
        : 1;

      if (preview.type === TileType.MONSTER) {
        theme = getMonsterThemeByChapter(chId, preview.value);
        previewImgPath = getMonsterImagePath(chId, preview.value, this.activeIconStyle);
      } else if (preview.type === TileType.HERO) {
        theme = HERO_THEMES[preview.value];
        previewImgPath = getHeroImagePath(preview.value, this.activeIconStyle, 'knight');
      } else {
        theme = EQUIPMENT_THEMES[preview.value] || { bg: '#334155', border: '#475569', text: '#ffffff', badge: '⚔️' };
        previewImgPath = getEquipmentImagePath(preview.value, this.activeIconStyle);
      }

      valEl.textContent = preview.value;
      cardEl.classList.remove('preview-gold');
      cardEl.style.backgroundColor = (theme && theme.bg) || '#334155';
      cardEl.style.borderColor = (theme && theme.border) || '#475569';

      if (previewImgPath) {
        badgeEl.style.display = 'flex';
        badgeEl.innerHTML = `<img src="${previewImgPath}" class="next-preview-img" alt="next-tile" onerror="this.parentElement.textContent='⚔️'">`;
      } else if (theme && theme.badge) {
        badgeEl.style.display = 'flex';
        badgeEl.textContent = theme.badge;
      } else {
        badgeEl.style.display = 'flex';
        badgeEl.textContent = '⚔️';
      }
    }

    cardEl.classList.remove('pop-effect');
    void cardEl.offsetWidth;
    cardEl.classList.add('pop-effect');
  }

  // C-STORY-152: Real Character Skill Charge & Readiness UI Sync
  updateSkillUI(payload) {
    const progressEl = document.getElementById('skill-ring-progress');
    const turnLabelEl = document.getElementById('skill-turn-label');
    const skillBtn = document.getElementById('skill-badge-btn');
    const iconEl = document.getElementById('skill-badge-icon');
    const nameLabelEl = document.getElementById('skill-name-label');
    if (!progressEl || !turnLabelEl || !skillBtn || !this.stageManager) return;

    const character = (payload && payload.character) ? payload.character : this.stageManager.getSelectedCharacter();
    const chargeTurns = (payload && payload.chargeTurns !== undefined) ? payload.chargeTurns : (this.stageManager.skillChargeTurns || 0);
    const maxTurns = (payload && payload.maxTurns !== undefined) ? payload.maxTurns : this.stageManager.getCharacterSkillCooldown();
    const isReady = (payload && payload.isReady !== undefined) ? payload.isReady : !!this.stageManager.isSkillReady;

    const cfg = CHARACTER_SKILL_CONFIGS[character] || CHARACTER_SKILL_CONFIGS.warrior;
    if (iconEl) iconEl.textContent = cfg.avatar;
    if (nameLabelEl) nameLabelEl.textContent = cfg.skillName;
    turnLabelEl.textContent = isReady ? '就緒！點擊施放' : `${chargeTurns}/${maxTurns}`;

    const circumference = 113.1;
    const percent = maxTurns > 0 ? Math.min(1, chargeTurns / maxTurns) : 1;
    progressEl.style.strokeDashoffset = (circumference * (1 - percent)).toString();

    if (isReady) {
      skillBtn.disabled = false;
      skillBtn.classList.add('ready');
    } else {
      skillBtn.disabled = true;
      skillBtn.classList.remove('ready');
    }
  }

  // C-STORY-152: Active Skill Cut-in & Canvas 2D VFX Execution
  async triggerSkillWithVfx(isAutoRescue = false) {
    if (this.isSkillExecuting) return;
    if (!this.stageManager || !this.stageManager.isSkillReady) return;

    this.isSkillExecuting = true;
    try {
      const classId = this.stageManager.getSelectedCharacter();

      // Pre-check for Merchant when no gold exists on board
      if (classId === CharacterClass.MERCHANT) {
        let hasGold = false;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const t = this.stageManager.board.getTile(r, c);
            if (t && t.isGold()) {
              hasGold = true;
              break;
            }
          }
          if (hasGold) break;
        }
        if (!hasGold) {
          this.showFloatingCombatText('⚠️ 盤面無金幣可供回收！', '#f59e0b');
          this.isSkillExecuting = false;
          return;
        }
      }

      // Pre-check for Archer when no monsters exist on board
      if (classId === CharacterClass.ARCHER) {
        const monsters = this.stageManager.board.getMonsters();
        if (!monsters || monsters.length === 0) {
          this.showFloatingCombatText('⚠️ 場上無魔物目標！', '#f59e0b');
          this.isSkillExecuting = false;
          return;
        }
      }

      // Step 1: Cut-in Presentation
      const cutinLayer = document.getElementById('skill-cutin-layer');
      const cutinAvatar = document.getElementById('skill-cutin-avatar');
      if (cutinLayer && cutinAvatar) {
        cutinAvatar.className = 'skill-cutin-avatar';
        if (classId === CharacterClass.WARRIOR) cutinAvatar.classList.add('aura-warrior');
        else if (classId === CharacterClass.ARCHER) cutinAvatar.classList.add('aura-archer');
        else if (classId === CharacterClass.MERCHANT) cutinAvatar.classList.add('aura-merchant');
        cutinLayer.style.display = 'flex';
        if (this.audio && this.audio.playVictory) this.audio.playVictory();
        await new Promise(resolve => setTimeout(resolve, 450));
        cutinLayer.style.display = 'none';
      }

      // Step 2: Canvas 2D Physics VFX & Skill State Mutation
      if (this.vfxEngine) {
        if (classId === CharacterClass.WARRIOR) {
          const hero = this.stageManager.board.getHero();
          if (hero) {
            const hr = (hero.r !== undefined) ? hero.r : hero.row;
            const hc = (hero.c !== undefined) ? hero.c : hero.col;
            const crossOffsets = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
            const targetCoords = [];
            crossOffsets.forEach(off => {
              const nr = hr + off.r;
              const nc = hc + off.c;
              if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
                const t = this.stageManager.board.getTile(nr, nc);
                if (t && (t.isEquipment() || t.isGold())) {
                  targetCoords.push({ r: nr, c: nc });
                }
              }
            });

            await this.vfxEngine.playCrossBreaker(hr, hc, targetCoords, () => {
              const res = this.stageManager.triggerCharacterSkill(isAutoRescue);
              if (this.audio && this.audio.playSkillCrossCleave) this.audio.playSkillCrossCleave();
              else if (this.audio && this.audio.playMerge) this.audio.playMerge();
              if (res.success) {
                this.showFloatingCombatText(`💥 十字碎裂！大地岩崩粉碎周邊 ${res.destroyedTiles.length} 個方塊！`);
              }
            });
          } else {
            this.stageManager.triggerCharacterSkill(isAutoRescue);
          }
        } else if (classId === CharacterClass.ARCHER) {
          const hero = this.stageManager.board.getHero();
          const monsters = this.stageManager.board.getMonsters();
          let maxVal = -1;
          monsters.forEach(m => { if (m.value > maxVal) maxVal = m.value; });
          const candidates = monsters.filter(m => m.value === maxVal);
          const targetMonster = candidates[0];

          if (hero && targetMonster) {
            const hr = (hero.r !== undefined) ? hero.r : hero.row;
            const hc = (hero.c !== undefined) ? hero.c : hero.col;
            const mr = (targetMonster.r !== undefined) ? targetMonster.r : targetMonster.row;
            const mc = (targetMonster.c !== undefined) ? targetMonster.c : targetMonster.col;

            await this.vfxEngine.playArmorPiercingArrow(hr, hc, mr, mc, () => {
              const res = this.stageManager.triggerCharacterSkill(isAutoRescue);
              if (this.audio && this.audio.playSkillArmorPiercingArrow) this.audio.playSkillArmorPiercingArrow();
              else if (this.audio && this.audio.playMerge) this.audio.playMerge();
              if (res.success) {
                if (res.action === 'slain') {
                  this.showFloatingCombatText(`🏹 破甲重矢！極光流星一擊秒殺魔物！`);
                } else {
                  this.showFloatingCombatText(`🏹 破甲重矢！流星重擊破甲折半（${res.originalVal} ➔ ${res.newVal}）！`);
                }
              }
            });
          } else {
            this.stageManager.triggerCharacterSkill(isAutoRescue);
          }
        } else if (classId === CharacterClass.MERCHANT) {
          const goldCoords = [];
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
              const t = this.stageManager.board.getTile(r, c);
              if (t && t.isGold()) {
                goldCoords.push({ r, c });
              }
            }
          }

          await this.vfxEngine.playGoldenEmergency(goldCoords, () => {
            const res = this.stageManager.triggerCharacterSkill(isAutoRescue);
            if (this.audio && this.audio.playSkillGoldenEmergency) this.audio.playSkillGoldenEmergency();
            else if (this.audio && this.audio.playMerge) this.audio.playMerge();
            if (res.success) {
              this.showFloatingCombatText(`🪙 黃金急召！純金金幣狂潮瞬間回收 ${res.totalCashed} 金幣！`);
            }
          });
        }
      } else {
        this.stageManager.triggerCharacterSkill(isAutoRescue);
      }
    } catch (err) {
      console.error('Error during triggerSkillWithVfx:', err);
    } finally {
      const vfxLayer = document.getElementById('skill-board-vfx-layer');
      if (vfxLayer) vfxLayer.innerHTML = '';
      if (this.viewRenderer && this.stageManager && this.stageManager.board) {
        this.viewRenderer.renderBoard(this.stageManager.board);
      }
      this.updateSkillUI();
      this.isSkillExecuting = false;
    }
  }

  // C-STORY-152: Passive Auto-Rescue Cut-in & Board VFX when Full Board Deadlock is Rescued
  async playAutoRescueCutin(payload) {
    if (this.isSkillExecuting) return;
    this.isSkillExecuting = true;

    try {
      const cutinLayer = document.getElementById('skill-cutin-layer');
      const cutinAvatar = document.getElementById('skill-cutin-avatar');
      if (cutinLayer && cutinAvatar) {
        cutinAvatar.className = 'skill-cutin-avatar';
        if (payload.classId === CharacterClass.WARRIOR) cutinAvatar.classList.add('aura-warrior');
        if (payload.classId === CharacterClass.ARCHER) cutinAvatar.classList.add('aura-archer');
        if (payload.classId === CharacterClass.MERCHANT) cutinAvatar.classList.add('aura-merchant');
        cutinLayer.style.display = 'flex';
        this.showFloatingCombatText('🛡️ 絕處逢生！瀕死自動觸發技能自救！', '#38bdf8');
        if (this.audio && this.audio.playVictory) this.audio.playVictory();
        await new Promise(r => setTimeout(r, 450));
        cutinLayer.style.display = 'none';
      }

      if (this.vfxEngine && this.stageManager) {
        const hero = this.stageManager.board.getHero();
        const hr = hero ? ((hero.r !== undefined) ? hero.r : hero.row) : 2;
        const hc = hero ? ((hero.c !== undefined) ? hero.c : hero.col) : 2;

        if (payload.classId === CharacterClass.WARRIOR) {
          const targets = payload.destroyedTiles || [];
          await this.vfxEngine.playCrossBreaker(hr, hc, targets);
          if (this.audio && this.audio.playSkillCrossCleave) this.audio.playSkillCrossCleave();
          this.showFloatingCombatText(`💥 絕處逢生·十字碎裂！大地岩崩粉碎 ${targets.length} 個方塊脫困！`);
        } else if (payload.classId === CharacterClass.ARCHER) {
          const tm = payload.targetMonster;
          if (tm) {
            const mr = (tm.r !== undefined) ? tm.r : tm.row;
            const mc = (tm.c !== undefined) ? tm.c : tm.col;
            await this.vfxEngine.playArmorPiercingArrow(hr, hc, mr, mc);
            if (this.audio && this.audio.playSkillArmorPiercingArrow) this.audio.playSkillArmorPiercingArrow();
            this.showFloatingCombatText(`🏹 絕處逢生·破甲重矢！極光流星一擊秒殺魔物脫困！`);
          }
        } else if (payload.classId === CharacterClass.MERCHANT) {
          const goldCoords = payload.cashedCoords || [];
          await this.vfxEngine.playGoldenEmergency(goldCoords);
          if (this.audio && this.audio.playSkillGoldenEmergency) this.audio.playSkillGoldenEmergency();
          this.showFloatingCombatText(`🪙 絕處逢生·黃金急召！純金金幣狂潮回收 ${payload.totalCashed} 金幣脫困！`);
        }
      }
    } catch (err) {
      console.error('Error during playAutoRescueCutin:', err);
    } finally {
      const vfxLayer = document.getElementById('skill-board-vfx-layer');
      if (vfxLayer) vfxLayer.innerHTML = '';
      if (this.viewRenderer && this.stageManager && this.stageManager.board) {
        this.viewRenderer.renderBoard(this.stageManager.board);
      }
      this.updateSkillUI();
      this.isSkillExecuting = false;
    }
  }

  showFloatingCombatText(text, color = '#facc15') {
    const floatEl = document.createElement('div');
    floatEl.style.position = 'fixed';
    floatEl.style.top = '120px';
    floatEl.style.left = '50%';
    floatEl.style.transform = 'translateX(-50%)';
    floatEl.style.background = 'rgba(15, 23, 42, 0.95)';
    floatEl.style.border = `1px solid ${color}`;
    floatEl.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6)';
    floatEl.style.color = color;
    floatEl.style.fontWeight = '900';
    floatEl.style.fontSize = '0.9rem';
    floatEl.style.padding = '8px 16px';
    floatEl.style.borderRadius = '20px';
    floatEl.style.zIndex = '9999';
    floatEl.style.pointerEvents = 'none';
    floatEl.textContent = text;
    document.body.appendChild(floatEl);
    setTimeout(() => {
      if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
    }, 1800);
  }

  handleCellTap(r, c) {
    if (!this.stageManager.isInBattle || this.isSliding || this.isSkillExecuting) return;

    if (this.currentAimingItem === 'hammer') {
      const res = this.stageManager.useHammerItem(r, c);
      if (!res.success) {
        alert(res.reason);
      } else {
        this.setAimingMode(null);
        if (res.action === 'cash_out') {
          if (this.audio) this.audio.playCoin();
        }
      }
      return;
    }

    if (this.currentAimingItem === 'snipe') {
      const res = this.stageManager.useSnipeItem(r, c);
      if (!res.success) {
        alert(res.reason);
      } else {
        this.setAimingMode(null);
      }
      return;
    }

    const tile = this.stageManager.board.getTile(r, c);
    if (tile && tile.isGold()) {
      const res = this.stageManager.cashOutGoldTile(r, c);
      if (res && res.success) {
        if (this.viewRenderer && this.viewRenderer.playVfx) {
          this.viewRenderer.playVfx([{ type: 'gold_merge', r, c, value: res.amount }]);
        }
        if (this.audio) this.audio.playCoin();
      } else if (res && !res.success && res.reason) {
        alert(res.reason);
      }
    }
  }

  setAimingMode(mode) {
    this.currentAimingItem = mode;
    const btnHammer = document.getElementById('btn-item-hammer');
    const btnSnipe = document.getElementById('btn-item-snipe');
    const banner = document.getElementById('targeting-banner');
    const text = document.getElementById('targeting-text');

    if (btnHammer) btnHammer.classList.toggle('active', mode === 'hammer');
    if (btnSnipe) btnSnipe.classList.toggle('active', mode === 'snipe');

    if (banner) {
      if (mode === 'hammer') {
        banner.style.display = 'flex';
        if (text) text.textContent = '🔨 瞄準模式：點選裝備粉碎，點選金幣直接領取（不耗戰槌）';
      } else if (mode === 'snipe') {
        banner.style.display = 'flex';
        if (text) text.textContent = '🏹 瞄準模式：點選任意 1 隻魔物無損狙殺！';
      } else {
        banner.style.display = 'none';
      }
    }
  }

  updateItemCounts() {
    const items = (this.stageManager && this.stageManager.items) ? this.stageManager.items : { undo: 0, hammer: 0, snipe: 0 };
    const undoCount = document.getElementById('item-count-undo');
    const hammerCount = document.getElementById('item-count-hammer');
    const snipeCount = document.getElementById('item-count-snipe');
    if (undoCount) {
      undoCount.textContent = items.undo !== undefined ? items.undo : 0;
      undoCount.classList.toggle('empty', (items.undo || 0) <= 0);
    }
    if (hammerCount) {
      hammerCount.textContent = items.hammer !== undefined ? items.hammer : 0;
      hammerCount.classList.toggle('empty', (items.hammer || 0) <= 0);
    }
    if (snipeCount) {
      snipeCount.textContent = items.snipe !== undefined ? items.snipe : 0;
      snipeCount.classList.toggle('empty', (items.snipe || 0) <= 0);
    }
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.appRouter = new AppRouter();
  window.app = window.appRouter;
});
