// main_v2.js: Integrated Controller & App Router for 2048 RPG Commercial Edition (v2.0)
import { GameEventBus } from './src/core/GameEventBus.js';
import { StageManager } from './src/core/StageManager.js';
import { ViewRenderer } from './src/presentation/ViewRenderer.js';
import { AudioEffects } from './src/presentation/AudioEffects.js';
import { CombatVfxEngine } from './src/presentation/CombatVfxEngine.js';
import {
  Direction, TileType, STAGE_CONFIGS, STAGE_0_CONFIG, Events,
  MONSTER_THEMES, HERO_THEMES, EQUIPMENT_THEMES, CHAPTER_CONFIGS,
  DEFEAT_TACTICAL_TIPS, getEquipmentImagePath, getMonsterImagePath,
  getHeroImagePath, getMonsterThemeByChapter, CharacterClass, CHARACTER_SKILL_CONFIGS
} from './src/core/Constants.js';

class AppRouter {
  constructor() {
    this.state = 'LOBBY'; // 'LOBBY' | 'COMBAT'
    this.eventBus = new GameEventBus();
    this.stageManager = new StageManager(this.eventBus);
    this.audio = new AudioEffects();
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

    this.bindCombatEvents();
    this.bindCombatControls();
    this.hookLobbyBridge();
    this.syncHud();
  }

  hookLobbyBridge() {
    // Override the prototype launchStageBattle function to trigger real combat!
    window.launchStageBattle = (stageId) => {
      const targetStage = stageId !== undefined ? stageId : (window.currentSelectedStage || 1);
      this.startCombat(targetStage);
    };

    // Sync HUD with stageManager
    this.syncHud();
  }

  switchAppState(newState) {
    this.state = newState;
    if (newState === 'COMBAT') {
      if (this.lobbyWrapper) this.lobbyWrapper.style.display = 'none';
      if (this.combatOverlay) this.combatOverlay.style.display = 'flex';
      requestAnimationFrame(() => {
        if (this.vfxEngine) this.vfxEngine.resize();
      });
    } else {
      if (this.combatOverlay) this.combatOverlay.style.display = 'none';
      if (this.lobbyWrapper) this.lobbyWrapper.style.display = 'flex';
      this.syncHud();

      // Refresh Lobby Adventure Map and Compendium with latest progress
      window.MAX_UNLOCKED_STAGE = this.stageManager.maxUnlockedStage || 1;
      if (typeof window.renderAdventureStage === 'function') {
        window.renderAdventureStage(window.currentSelectedStage || window.MAX_UNLOCKED_STAGE);
      }
      if (typeof window.renderCompendiumView === 'function') {
        window.renderCompendiumView();
      }
    }
  }

  syncHud() {
    const staminaEl = document.getElementById('top-stamina-val');
    const goldEl = document.getElementById('top-gold-val');
    const gemsEl = document.getElementById('top-gems-val');

    if (staminaEl) staminaEl.textContent = `${this.stageManager.stamina}/${this.stageManager.maxStamina}`;
    if (goldEl) goldEl.textContent = Number(this.stageManager.gold || 0).toLocaleString();
    if (gemsEl) {
      const gems = localStorage.getItem('rpg_2048_gems') || '150';
      gemsEl.textContent = Number(gems).toLocaleString();
    }
  }

  startCombat(stageId) {
    if (!this.stageManager.canStartStage()) {
      const staminaModal = document.getElementById('modal-stamina-empty');
      if (staminaModal) staminaModal.style.display = 'flex';
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

  handleMove(dir) {
    if (!this.stageManager.isInBattle || this.isSliding || this.isSkillExecuting) return;
    const res = this.stageManager.handleMove(dir);
    if (res.moved) {
      if (res.merges > 0) this.audio.playMerge();
      else this.audio.playSlide();
    } else {
      if (this.viewRenderer && this.viewRenderer.triggerInvalidMoveShake) {
        this.viewRenderer.triggerInvalidMoveShake(dir);
      }
    }
  }

  exitCombat() {
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

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'COMBAT' || !this.stageManager.isInBattle) return;
      let dir = null;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = Direction.UP;
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = Direction.DOWN;
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = Direction.LEFT;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = Direction.RIGHT;

      if (dir) {
        e.preventDefault();
        this.handleMove(dir);
      }
    });

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
    const btnHammer = document.getElementById('btn-item-hammer');
    if (btnHammer) {
      btnHammer.addEventListener('click', () => {
        alert('請點擊盤面上的任意非勇者方塊進行破壞！');
      });
    }
    const btnSnipe = document.getElementById('btn-item-snipe');
    if (btnSnipe) {
      btnSnipe.addEventListener('click', () => {
        alert('請點擊盤面上的目標魔物進行狙殺！');
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
