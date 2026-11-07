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
  getHeroImagePath, getMonsterThemeByChapter, CharacterClass, CHARACTER_SKILL_CONFIGS
} from './src/core/Constants.js';

class AppRouter {
  constructor() {
    this.state = 'LOBBY'; // 'LOBBY' | 'COMBAT'
    this.STAGE_CONFIGS = STAGE_CONFIGS;
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
    const appContainer = document.getElementById('app-container') || document.body;
    if (this.boardGridEl) {
      this.tutorialOverlay = new TutorialOverlay(appContainer, this.boardGridEl, this.eventBus);
    }

    this.bindCombatEvents();
    this.bindCombatControls();
    this.syncHud();
    window.launchStageBattle = (stageId) => this.startCombat(stageId || window.currentSelectedStage || 1);

    // Initial render
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
  }

  saveInventory() {
    localStorage.setItem('rpg_2048_inventory_v2', JSON.stringify(this.inventoryManager.items));
  }

  getEquippedGear() {
    const raw = localStorage.getItem('rpg_2048_equipped_gear');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return { id: 'starter_sword', name: '泥木劍', val: 2, img: 'assets/images/equipment_clay/equip_01.png' };
  }

  equipGearItem(item) {
    if (!item) return;
    const gear = {
      id: item.id,
      name: `神兵裝備`,
      val: item.value,
      img: item.img || 'assets/images/equipment_clay/equip_01.png'
    };
    localStorage.setItem('rpg_2048_equipped_gear', JSON.stringify(gear));
    this.inventoryManager.equippedItem = gear;
    if (this.audio) this.audio.playCoin();
    this.syncHud();
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
        it.name = `神裝`;
        it.img = `assets/images/equipment_clay/equip_01.png`;
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
    if (stageId === 0 || (this.stageManager && this.stageManager.tutorialManager && !this.stageManager.tutorialManager.isCompleted)) {
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

    const config = this.stageManager.startStage(stageId);
    if (!config) return;

    this.currentCombatStageId = stageId;
    this.switchAppState('COMBAT');

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
    this.updateNextPreview();
    this.updateSkillUI();
    this.updateItemCounts();
  }

  startTutorialCombat() {
    this.isSkillExecuting = false;
    this.isSliding = false;
    if (this.vfxEngine) {
      this.vfxEngine.clear();
      this.vfxEngine.resize();
    }
    const config = this.stageManager.startTutorialStage();
    if (!config) return;

    this.currentCombatStageId = 0;
    this.switchAppState('COMBAT');

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
  }

  bindCombatEvents() {
    this.eventBus.on(Events.MOVE_COMPLETED, (state) => {
      const turnValEl = document.getElementById('combat-turn-val');
      const monsterValEl = document.getElementById('combat-monsters-val');
      if (turnValEl) turnValEl.textContent = this.stageManager.turnCount;
      if (monsterValEl) monsterValEl.textContent = this.stageManager.board.getMonstersCount();

      this.updateNextPreview();
      this.updateSkillUI();

      if (state.moves && state.moves.length > 0) {
        this.isSliding = true;
        this.viewRenderer.animateSlide(state.moves, () => {
          this.viewRenderer.renderBoard(state.board);
          if (state.vfxEvents && state.vfxEvents.length > 0) {
            this.viewRenderer.playVfx(state.vfxEvents);
          }
          this.isSliding = false;
        });
      } else {
        this.viewRenderer.renderBoard(state.board);
        this.isSliding = false;
      }
    });

    this.eventBus.on(Events.STAGE_VICTORY, (data) => {
      this.audio.playVictory();
      const vModal = document.getElementById('modal-victory');
      if (vModal) {
        const titleEl = document.getElementById('victory-stage-name');
        const turnsEl = document.getElementById('victory-turns-val');
        const rewardEl = document.getElementById('victory-reward-val');
        const detailEl = document.getElementById('victory-reward-detail');

        if (titleEl) titleEl.textContent = data.stage.name;
        if (turnsEl) turnsEl.textContent = data.turns;
        const total = data.totalEarned !== undefined ? data.totalEarned : (data.rewardGold + (data.inBattleGold || 0));
        if (rewardEl) rewardEl.textContent = `🪙 +${total}`;
        if (detailEl) detailEl.textContent = `★【關卡獎勵】+${data.rewardGold} 🪙\n⚔️【戰鬥收穫】+${data.inBattleGold || 0} 🪙`;

        vModal.style.display = 'flex';
      }
    });

    this.eventBus.on(Events.STAGE_DEFEAT, (data) => {
      this.audio.playDefeat();
      const dModal = document.getElementById('modal-defeat');
      if (dModal) {
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
      if (this.tutorialOverlay) {
        this.tutorialOverlay.hide();
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
    const btnVictoryConfirm = document.getElementById('btn-victory-confirm');
    if (btnVictoryConfirm) {
      btnVictoryConfirm.addEventListener('click', () => {
        this.audio.playClick();
        this.exitCombat();
      });
    }

    // Defeat options
    const btnDefeatLobby = document.getElementById('btn-defeat-lobby');
    if (btnDefeatLobby) {
      btnDefeatLobby.addEventListener('click', () => {
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
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    // Touch Swipe Controls
    const combatArea = this.combatOverlay;
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
        }
      });
    }

    // Item Buttons
    const btnUndo = document.getElementById('btn-item-undo');
    if (btnUndo) {
      btnUndo.addEventListener('click', () => {
        if (this.stageManager.useItem('undo')) this.audio.playUndo();
      });
    }
  }

  updateNextPreview() {
    const cardEl = document.getElementById('next-preview-card');
    const badgeEl = document.getElementById('next-card-badge');
    const valEl = document.getElementById('next-card-val');
    if (!cardEl || !this.stageManager.spawner) return;

    const nextTile = this.stageManager.spawner.nextTile;
    if (nextTile) {
      valEl.textContent = nextTile.value;
      if (nextTile.type === TileType.MONSTER) {
        badgeEl.textContent = '👾';
      } else if (nextTile.type === TileType.HERO) {
        badgeEl.textContent = '🛡️';
      } else {
        badgeEl.textContent = '⚔️';
      }
    }
  }

  updateSkillUI() {
    const progressEl = document.getElementById('skill-ring-progress');
    const turnLabelEl = document.getElementById('skill-turn-label');
    const skillBtn = document.getElementById('skill-badge-btn');
    if (!progressEl || !turnLabelEl || !skillBtn) return;

    const maxCharge = 500;
    const currentCharge = Math.min(maxCharge, (this.stageManager.turnCount || 0) * 100);
    turnLabelEl.textContent = `${currentCharge}/${maxCharge}`;
    const percent = currentCharge / maxCharge;
    const circumference = 2 * Math.PI * 18;
    progressEl.style.strokeDashoffset = (circumference * (1 - percent)).toString();

    if (currentCharge >= maxCharge) {
      skillBtn.disabled = false;
      skillBtn.classList.add('ready');
    } else {
      skillBtn.disabled = true;
      skillBtn.classList.remove('ready');
    }
  }

  updateItemCounts() {
    const inv = this.stageManager.inventory;
    const undoCount = document.getElementById('item-count-undo');
    const hammerCount = document.getElementById('item-count-hammer');
    const snipeCount = document.getElementById('item-count-snipe');
    if (undoCount) undoCount.textContent = inv ? inv.undo : 0;
    if (hammerCount) hammerCount.textContent = inv ? inv.hammer : 0;
    if (snipeCount) snipeCount.textContent = inv ? inv.snipe : 0;
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.appRouter = new AppRouter();
  window.app = window.appRouter;
});
