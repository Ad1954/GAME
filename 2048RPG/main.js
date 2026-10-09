// main.js: Main Controller and UI Event Bindings for Commercial Edition

import { GameEventBus } from './src/core/GameEventBus.js';
import { StageManager } from './src/core/StageManager.js';
import { ViewRenderer } from './src/presentation/ViewRenderer.js';
import { AudioEffects } from './src/presentation/AudioEffects.js';
import { TutorialOverlay } from './src/presentation/TutorialOverlay.js';
import { Direction, STAGE_CONFIGS, STAGE_0_CONFIG, Events, MONSTER_THEMES, HERO_THEMES, EQUIPMENT_THEMES, CHAPTER_CONFIGS, DEFEAT_TACTICAL_TIPS } from './src/core/Constants.js';
import { GwtRunner } from './src/tests/GwtRunner.js';

class AppController {
  constructor() {
    this.eventBus = new GameEventBus();
    this.stageManager = new StageManager(this.eventBus);
    this.audio = new AudioEffects();
    this.selectedChapter = 1;
    this.currentDefeatTipIndex = 0;

    // DOM Elements
    this.boardGridEl = document.getElementById('battle-board');
    this.activeThemeSkin = localStorage.getItem('rpg_2048_theme_skin') || 'kingdom';
    this.viewRenderer = new ViewRenderer(this.boardGridEl);
    this.viewRenderer.setThemeSkin(this.activeThemeSkin);
    this.isSliding = false;

    // Tutorial Presentation (C-STORY-030)
    this.tutorialOverlay = new TutorialOverlay(
      document.querySelector('.app-container'),
      this.boardGridEl,
      this.eventBus
    );

    // Title Splash Screen (C-STORY-008)
    this.viewTitleScreen = document.getElementById('view-title-screen');
    this.btnStartGame = document.getElementById('btn-start-game');

    this.topGoldValEl = document.getElementById('top-gold-val');
    this.stagesListEl = document.getElementById('stages-list');
    this.combatOverlayEl = document.getElementById('combat-overlay');
    this.combatStageNameEl = document.getElementById('combat-stage-name');
    this.combatTurnValEl = document.getElementById('combat-turn-val');
    this.combatMonstersValEl = document.getElementById('combat-monsters-val');

    // Shop Elements
    this.btnClaimTestGold = document.getElementById('btn-claim-test-gold');
    this.btnClaimTestItems = document.getElementById('btn-claim-test-items');
    this.gachaLevelBadge = document.getElementById('gacha-level-badge');
    this.gachaExpText = document.getElementById('gacha-exp-text');
    this.gachaProgressBar = document.getElementById('gacha-progress-bar');
    this.gachaRatesChips = document.getElementById('gacha-rates-chips');
    this.btnGachaSingle = document.getElementById('btn-gacha-single');
    this.btnGachaTen = document.getElementById('btn-gacha-ten');
    this.selectFastForward = document.getElementById('select-fast-forward-stage');
    this.btnFastForward = document.getElementById('btn-fast-forward');

    // Combat Emergency Items (C-STORY-007)
    this.btnItemUndo = document.getElementById('btn-item-undo');
    this.btnItemHammer = document.getElementById('btn-item-hammer');
    this.btnItemSnipe = document.getElementById('btn-item-snipe');
    this.targetingBanner = document.getElementById('targeting-banner');
    this.targetingText = document.getElementById('targeting-text');
    this.btnCancelTarget = document.getElementById('btn-cancel-target');
    this.itemCountUndo = document.getElementById('item-count-undo');
    this.itemCountHammer = document.getElementById('item-count-hammer');
    this.itemCountSnipe = document.getElementById('item-count-snipe');
    this.currentAimingItem = null; // 'hammer' | 'snipe' | null

    // Armory Elements
    this.loadoutHeroAvatar = document.getElementById('loadout-hero-avatar');
    this.loadoutPowerVal = document.getElementById('loadout-power-val');
    this.equipSlotBox = document.getElementById('equip-slot-box');
    this.btnUnequipItem = document.getElementById('btn-unequip-item');
    this.inventoryCapacityVal = document.getElementById('inventory-capacity-val');
    this.btnBatchMerge = document.getElementById('btn-batch-merge');
    this.inventoryGridEl = document.getElementById('inventory-grid');
    this.selectedInventoryItemId = null;
    this.btnUpgradeTech = document.getElementById('btn-upgrade-tech');
    this.btnUpgradeWarehouse = document.getElementById('btn-upgrade-warehouse');

    // Modals
    this.modalBriefing = document.getElementById('modal-stage-briefing');
    this.modalSettings = document.getElementById('modal-settings');
    this.settingThemeSelect = document.getElementById('setting-theme-select');
    this.modalResetConfirm = document.getElementById('modal-reset-confirm');
    this.btnResetExecute = document.getElementById('btn-reset-execute');
    this.btnResetCancel = document.getElementById('btn-reset-cancel');
    this.modalVictory = document.getElementById('modal-victory');
    this.modalDefeat = document.getElementById('modal-defeat');
    this.modalGwt = document.getElementById('modal-gwt-results');
    this.modalGachaResult = document.getElementById('modal-gacha-result');
    this.gachaResultsGrid = document.getElementById('gacha-results-grid');
    this.btnGachaConfirm = document.getElementById('btn-gacha-confirm');

    // Royal Privilege Shop & Monetization (C-STORY-023, C-STORY-026)
    this.topStaminaValEl = document.getElementById('top-stamina-val');
    this.topStaminaPill = document.getElementById('top-stamina-pill');
    this.btnBuyNoAds = document.getElementById('btn-buy-no-ads');
    this.btnBuyStamina = document.getElementById('btn-buy-stamina');
    this.btnBuyGoldPack = document.getElementById('btn-buy-gold-pack');
    this.btnClaimDailyAd = document.getElementById('btn-claim-daily-ad');
    this.dailyAdCountText = document.getElementById('daily-ad-count-text');
    this.btnBuyChapterPass = document.getElementById('btn-buy-chapter-pass');

    // Modals: Stamina Empty & Ad Simulator (C-STORY-026)
    this.modalStaminaEmpty = document.getElementById('modal-stamina-empty');
    this.btnStaminaAdRefill = document.getElementById('btn-stamina-ad-refill');
    this.btnStaminaGoShop = document.getElementById('btn-stamina-go-shop');
    this.btnStaminaClose = document.getElementById('btn-stamina-close');

    this.modalAdSimulator = document.getElementById('modal-ad-simulator');
    this.btnAdClose = document.getElementById('btn-ad-close');
    this.adTimerBadge = document.getElementById('ad-timer-badge');
    this.adProgressFill = document.getElementById('ad-progress-fill');
    this.adCountdownTimer = null;

    this.selectedStageId = 1;
    this.touchStartX = 0;
    this.touchStartY = 0;

    this.init();
  }

  init() {
    this.bindEvents();
    this.bindNavigation();
    this.bindSettings();
    this.bindControls();
    this.bindShopEvents();
    this.bindArmoryEvents();
    this.bindCombatItemEvents();
    this.bindStaminaAndAdEvents();
    this.bindTitleScreen();
    this.bindDefeatTipEvents();
    this.renderFastForwardOptions();
    this.renderStagesList();
    this.renderGachaMachine();
    this.renderArmory();
    this.renderTechTierCard();
    this.renderWarehouseCard();
    this.renderShopPrivileges();
    this.updateGoldDisplay(this.stageManager.gold);
    this.updateStaminaDisplay();
    this.updateItemCounts();

    // Stamina heartbeat recovery check
    setInterval(() => {
      this.stageManager.checkStaminaRecovery(true);
    }, 10000);
  }

  bindTitleScreen() {
    if (this.btnStartGame && this.viewTitleScreen) {
      this.btnStartGame.addEventListener('click', () => {
        this.audio.playClick();
        this.viewTitleScreen.classList.add('fade-out');

        // Check Tutorial: If first time player, automatically trigger Stage 0 Tutorial (C-STORY-030)
        if (this.stageManager && this.stageManager.tutorialManager && !this.stageManager.tutorialManager.isCompleted) {
          setTimeout(() => {
            this.startTutorialCombat();
          }, 400);
        }
      });
    }
  }

  updateGoldDisplay(gold) {
    if (this.topGoldValEl) {
      this.topGoldValEl.textContent = gold;
    }
  }

  updateStaminaDisplay() {
    if (!this.topStaminaValEl) return;
    if (this.stageManager.hasUnlimitedStamina) {
      this.topStaminaValEl.textContent = '∞';
    } else {
      this.topStaminaValEl.textContent = `${this.stageManager.stamina}/${this.stageManager.maxStamina}`;
    }
  }

  bindEvents() {
    this.eventBus.on(Events.STAMINA_CHANGED, () => {
      this.updateStaminaDisplay();
    });

    this.eventBus.on(Events.PRIVILEGE_CHANGED, () => {
      this.updateStaminaDisplay();
      this.renderShopPrivileges();
    });

    this.eventBus.on(Events.GOLD_CHANGED, ({ gold }) => {
      this.updateGoldDisplay(gold);
      this.renderTechTierCard();
      this.renderWarehouseCard();
    });

    this.eventBus.on(Events.INVENTORY_CHANGED, () => {
      this.renderArmory();
    });

    this.eventBus.on(Events.WAREHOUSE_EXPANDED, () => {
      this.renderWarehouseCard();
      this.renderArmory();
    });

    this.eventBus.on(Events.EQUIPMENT_CHANGED, () => {
      this.renderArmory();
      this.renderTechTierCard();
    });

    this.eventBus.on(Events.BASE_TIER_UPGRADED, () => {
      this.renderArmory();
    });

    this.eventBus.on(Events.GACHA_PULLED, () => {
      this.renderGachaMachine();
    });

    this.eventBus.on(Events.GACHA_LEVEL_UP, () => {
      this.renderGachaMachine();
    });

    this.eventBus.on(Events.BOARD_CHANGED, state => {
      if (this.combatTurnValEl) this.combatTurnValEl.textContent = state.turnCount;
      if (this.combatMonstersValEl) this.combatMonstersValEl.textContent = state.monstersRemaining;

      if (state.moves && state.moves.length > 0) {
        this.isSliding = true;

        // C-STORY-013: Slash cut appears instantly on the monster before hero slides into place!
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
          this.updateTargetingHighlights();
          this.isSliding = false;
        });
      } else {
        this.viewRenderer.renderBoard(state.board);
        this.updateTargetingHighlights();
        this.isSliding = false;
      }
    });

    this.eventBus.on(Events.ITEMS_CHANGED, () => {
      this.updateItemCounts();
    });

    this.eventBus.on(Events.ITEM_USED, ({ itemType }) => {
      if (itemType === 'undo') this.audio.playUndo();
      else if (itemType === 'hammer') this.audio.playHammer();
      else if (itemType === 'snipe') this.audio.playSnipe();
    });

    this.eventBus.on(Events.MONSTER_KILLED, () => {
      this.audio.playKill();
    });

    this.eventBus.on(Events.GOLD_MERGED, () => {
      // Audio is triggered in sync with Mario Coin Pop
    });

    this.eventBus.on(Events.GOLD_CASHED_OUT, () => {
      this.audio.playCoin();
    });

    this.eventBus.on(Events.STAGE_VICTORY, ({ stage, turns, rewardGold, inBattleGold, sweepGold, totalEarned, isFirstClear }) => {
      this.audio.playVictory();
      document.getElementById('victory-stage-name').textContent = stage.name;
      const bGold = inBattleGold || 0;
      const sGold = sweepGold || 0;
      const rGold = rewardGold || 0;
      const total = totalEarned !== undefined ? totalEarned : (rGold + bGold + sGold);

      const items = [];
      if (isFirstClear) {
        items.push(`★【初次通關賞金】+${rGold} 🪙`);
      }
      items.push(`⚔️【戰鬥合成領取】+${bGold} 🪙`);
      items.push(`⚔️【盤面剩餘金幣】+${sGold} 🪙`);

      const rewardDetailEl = document.getElementById('victory-reward-detail');
      if (rewardDetailEl) {
        rewardDetailEl.textContent = items.join('\n');
      }
      document.getElementById('victory-reward-val').textContent = `🪙 +${total}`;
      document.getElementById('victory-turns-val').textContent = turns;
      this.modalVictory.style.display = 'flex';
      this.renderStagesList();
    });

    this.eventBus.on(Events.BASE_TIER_UPGRADED, () => {
      this.renderTechTierCard();
    });

    this.eventBus.on(Events.STAGE_FAST_FORWARD, () => {
      this.renderStagesList();
    });

    this.eventBus.on(Events.STAGE_DEFEAT, ({ inBattleGold }) => {
      this.audio.playDefeat();
      const defeatRewardDetailEl = document.getElementById('defeat-reward-detail');
      if (defeatRewardDetailEl) {
        defeatRewardDetailEl.textContent = `⚔️【戰鬥合成領取】+${inBattleGold || 0} 🪙`;
      }

      // Update Defeat Stamina Loss Badge & Animation (C-STORY-027, C-STORY-028)
      const staminaBadgeEl = document.getElementById('defeat-stamina-badge');
      if (staminaBadgeEl) {
        if (this.stageManager.hasUnlimitedStamina) {
          staminaBadgeEl.className = 'defeat-stamina-badge unlimited';
          staminaBadgeEl.textContent = '❤️ 無限體力特權生效：0 消耗 (∞)';
        } else {
          staminaBadgeEl.className = 'defeat-stamina-badge';
          staminaBadgeEl.textContent = `❤️ 遠征消耗：-1 體力（當前 ${this.stageManager.stamina}/${this.stageManager.maxStamina}）`;
        }
      }

      // Render Tactical Defeat Tip (C-STORY-034)
      this.renderRandomDefeatTip();

      this.triggerStaminaLossAnimation();
      this.modalDefeat.style.display = 'flex';
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
  }

  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        this.audio.playClick();
        const tabId = item.dataset.tab;

        // Update active tab button
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Update active view
        document.querySelectorAll('.tab-view').forEach(view => {
          view.classList.remove('active');
        });
        const targetView = document.getElementById(tabId);
        if (targetView) targetView.classList.add('active');
      });
    });

    this.renderChapterTabs();
  }

  renderChapterTabs() {
    const tabsContainer = document.getElementById('chapter-tabs');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    const chapterIcons = ['🌾', '🔥', '🌲', '🏰', '⛰️', '💀', '⚡', '👑'];
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

    CHAPTER_CONFIGS.forEach(ch => {
      const isUnlocked = this.stageManager.isChapterUnlocked(ch.id);
      const icon = ch.icon || '⚔️';
      let titleText = '';
      if (ch.id === 0) {
        titleText = `${icon} 序章訓練所`;
      } else {
        const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][ch.id - 1] || ch.id;
        titleText = `${icon} 第 ${roman} 章`;
      }

      const btn = document.createElement('button');
      btn.className = `chapter-tab-btn ${this.selectedChapter === ch.id ? 'active' : ''} ${isUnlocked ? '' : 'locked'}`;
      btn.dataset.chapter = ch.id;
      btn.id = `tab-chapter-${ch.id}`;
      btn.textContent = isUnlocked ? titleText : `${titleText} 🔒`;

      btn.addEventListener('click', () => {
        if (!this.stageManager.isChapterUnlocked(ch.id)) {
          const prevCh = CHAPTER_CONFIGS.find(c => c.id === ch.id - 1);
          const reqStage = prevCh ? prevCh.range[1] : (ch.id - 1) * 5;
          alert(`🔒 請先通關第 ${ch.id - 1} 章最後一關（第 ${reqStage} 關）以解鎖本章節！`);
          return;
        }
        this.audio.playClick();
        this.selectedChapter = ch.id;
        this.renderStagesList();
      });

      tabsContainer.appendChild(btn);
    });
  }

  bindSettings() {
    const btnOpen = document.getElementById('btn-open-settings');
    const btnClose = document.getElementById('btn-settings-close');
    const soundToggle = document.getElementById('setting-sound-toggle');
    const btnReset = document.getElementById('btn-reset-save');

    if (soundToggle) {
      soundToggle.checked = this.audio.enabled;
      soundToggle.addEventListener('change', (e) => {
        this.audio.toggleSound(e.target.checked);
      });
    }

    if (this.settingThemeSelect) {
      this.settingThemeSelect.value = this.activeThemeSkin;
      this.settingThemeSelect.addEventListener('change', (e) => {
        this.audio.playClick();
        this.activeThemeSkin = e.target.value;
        localStorage.setItem('rpg_2048_theme_skin', this.activeThemeSkin);
        this.viewRenderer.setThemeSkin(this.activeThemeSkin);
        if (this.stageManager.isInBattle) {
          this.viewRenderer.renderBoard(this.stageManager.board);
        }
        this.renderArmory();
      });
    }

    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        this.audio.playClick();
        this.modalSettings.style.display = 'flex';
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.audio.playClick();
        this.modalSettings.style.display = 'none';
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.audio.playClick();
        if (this.modalResetConfirm) {
          this.modalResetConfirm.style.display = 'flex';
        }
      });
    }

    if (this.btnResetCancel) {
      this.btnResetCancel.addEventListener('click', () => {
        this.audio.playClick();
        if (this.modalResetConfirm) {
          this.modalResetConfirm.style.display = 'none';
        }
      });
    }

    if (this.btnResetExecute) {
      this.btnResetExecute.addEventListener('click', () => {
        this.audio.playDefeat();
        this.stageManager.resetSaveData();
        if (this.modalResetConfirm) this.modalResetConfirm.style.display = 'none';
        if (this.modalSettings) this.modalSettings.style.display = 'none';
        this.selectedChapter = 1;
        this.renderStagesList();
        this.renderArmory();
        this.renderTechTierCard();
        this.renderGachaMachine();
        this.updateItemCounts();
        this.updateGoldDisplay(this.stageManager.gold);
        alert('🎉 遊戲紀錄已全數重置為初始狀態！');
      });
    }

    const btnForceReload = document.getElementById('btn-force-reload-version');
    if (btnForceReload) {
      btnForceReload.addEventListener('click', () => {
        this.audio.playClick();
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('t', Date.now().toString());
          window.location.href = url.toString();
        } catch (e) {
          window.location.reload(true);
        }
      });
    }

    const btnReplayTutorial = document.getElementById('btn-replay-tutorial');
    if (btnReplayTutorial) {
      btnReplayTutorial.addEventListener('click', () => {
        this.audio.playClick();
        if (this.modalSettings) this.modalSettings.style.display = 'none';
        this.startTutorialCombat();
      });
    }

    const btnClearTutorialRecord = document.getElementById('btn-clear-tutorial-record');
    if (btnClearTutorialRecord) {
      btnClearTutorialRecord.addEventListener('click', () => {
        this.audio.playClick();
        if (this.stageManager.tutorialManager) {
          this.stageManager.tutorialManager.setCompleted(false);
        }
        this.renderStagesList();
        alert('🔄 新手教學引導紀錄已清除！\n您可隨時至大廳「序章：新手訓練所」或重新觸發新手教學！');
      });
    }
  }

  renderStagesList() {
    if (!this.stagesListEl) return;
    this.stagesListEl.innerHTML = '';

    // Update chapter tabs locked state & text
    this.renderChapterTabs();

    // Update chapter banner text
    const chConfig = CHAPTER_CONFIGS.find(c => c.id === this.selectedChapter) || CHAPTER_CONFIGS[0];
    const bannerTitle = document.getElementById('chapter-title');
    const bannerDesc = document.getElementById('chapter-desc');
    if (bannerTitle) bannerTitle.textContent = chConfig.name;
    if (bannerDesc) bannerDesc.textContent = chConfig.desc;

    const unlockedId = this.stageManager.unlockedStageId;
    const currentStages = (this.selectedChapter === 0)
      ? [STAGE_0_CONFIG]
      : STAGE_CONFIGS.filter(s => s.chapter === this.selectedChapter);

    currentStages.forEach(stage => {
      const isTutorialStage = (stage.id === 0);
      const isCleared = isTutorialStage 
        ? (this.stageManager.tutorialManager && this.stageManager.tutorialManager.isCompleted)
        : !!this.stageManager.clearedStages[stage.id];
      const isUnlocked = isTutorialStage ? true : (stage.id <= unlockedId);

      const card = document.createElement('div');
      card.className = `stage-card ${isUnlocked ? '' : 'locked'}`;

      let statusHtml = '';
      if (isCleared) {
        statusHtml = '<span class="stage-status-pill status-cleared">★ 已通關</span>';
      } else if (isUnlocked) {
        statusHtml = '<span class="stage-status-pill status-ready">⚔️ 可出擊</span>';
      } else {
        statusHtml = '<span class="stage-status-pill status-locked">🔒 未解鎖</span>';
      }

      let rewardBadgeHtml = '';
      if (isCleared) {
        rewardBadgeHtml = '<div class="stage-reward-badge cleared">✔ 已領取</div>';
      } else {
        rewardBadgeHtml = `<div class="stage-reward-badge">初次 +${stage.rewardGold} 🪙</div>`;
      }

      card.innerHTML = `
        <div class="stage-card-left">
          <div class="stage-icon-box">${stage.icon || '⚔️'}</div>
          <div class="stage-meta">
            <h4>${stage.name}</h4>
            <div class="stage-sub">${stage.subtitle}</div>
          </div>
        </div>
        <div class="stage-card-right">
          ${rewardBadgeHtml}
          ${statusHtml}
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this.audio.playClick();
          this.openBriefingModal(stage);
        });
      }

      this.stagesListEl.appendChild(card);
    });
  }

  openBriefingModal(stage) {
    this.selectedStageId = stage.id;
    const isCleared = !!this.stageManager.clearedStages[stage.id];
    document.getElementById('briefing-icon').textContent = stage.icon || '⚔️';
    document.getElementById('briefing-title').textContent = stage.name;
    document.getElementById('briefing-desc').textContent = stage.desc;
    document.getElementById('briefing-power').textContent = stage.recPower;

    const rewardEl = document.getElementById('briefing-reward');
    if (rewardEl) {
      if (isCleared) {
        rewardEl.textContent = '已領取 (0 🪙)';
        rewardEl.classList.add('cleared');
      } else {
        rewardEl.textContent = `+${stage.rewardGold} 🪙`;
        rewardEl.classList.remove('cleared');
      }
    }

    const listEl = document.getElementById('briefing-monsters-list');
    listEl.innerHTML = '';
    stage.monsters.forEach(mDef => {
      const isObj = typeof mDef === 'object' && mDef !== null;
      const val = isObj ? mDef.value : mDef;
      const theme = MONSTER_THEMES[val] || { name: '魔物', badge: '👾' };
      const splitTag = (isObj && mDef.splitOnDeath) ? ' <b style="color: #c084fc;">[🦠分裂母體]</b>' : '';

      const item = document.createElement('div');
      item.className = 'preview-item';
      item.innerHTML = `<span>${theme.badge}</span> <span>${theme.name} (${val})${splitTag}</span>`;
      listEl.appendChild(item);
    });

    this.modalBriefing.style.display = 'flex';
  }

  bindControls() {
    // Briefing actions
    document.getElementById('btn-briefing-cancel').addEventListener('click', () => {
      this.audio.playClick();
      this.modalBriefing.style.display = 'none';
    });

    document.getElementById('btn-briefing-start').addEventListener('click', () => {
      this.audio.playClick();
      this.modalBriefing.style.display = 'none';
      this.startCombat(this.selectedStageId);
    });

    // Combat back button
    document.getElementById('btn-combat-back').addEventListener('click', () => {
      this.audio.playClick();
      if (confirm('確定要返回大廳嗎？中途退出將放棄本局獲得的所有金幣收益！')) {
        this.exitCombat();
      }
    });

    // Victory confirm
    document.getElementById('btn-victory-confirm').addEventListener('click', () => {
      this.audio.playClick();
      this.modalVictory.style.display = 'none';
      this.exitCombat();
    });

    // Defeat actions
    document.getElementById('btn-defeat-lobby').addEventListener('click', () => {
      this.audio.playClick();
      this.modalDefeat.style.display = 'none';
      this.exitCombat();
    });

    document.getElementById('btn-defeat-retry').addEventListener('click', () => {
      this.audio.playClick();
      this.modalDefeat.style.display = 'none';
      this.startCombat(this.selectedStageId);
    });

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (!this.stageManager.isInBattle) return;
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

    // Touch Swipe Controls (Expanded to entire combat area below header) (C-STORY-027)
    const combatArea = this.combatOverlayEl;
    if (combatArea) {
      let isTouchTracking = false;
      let lastTouchTapTime = 0;

      combatArea.addEventListener('touchstart', (e) => {
        if (!this.stageManager.isInBattle) return;
        // Ignore header bar buttons, item buttons, or open modals
        if (e.target.closest('button') || e.target.closest('.combat-top-bar') || e.target.closest('.modal-card')) {
          isTouchTracking = false;
          return;
        }
        isTouchTracking = true;
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
      }, { passive: true });

      combatArea.addEventListener('touchend', (e) => {
        if (!this.stageManager.isInBattle || !isTouchTracking) return;
        isTouchTracking = false;

        const touch = e.changedTouches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) > 25) {
          if (absX > absY) {
            this.handleMove(dx > 0 ? Direction.RIGHT : Direction.LEFT);
          } else {
            this.handleMove(dy > 0 ? Direction.DOWN : Direction.UP);
          }
        } else {
          // Tap on cell detected on touch device (C-STORY-015)
          lastTouchTapTime = Date.now();
          const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
          const cell = targetEl ? targetEl.closest('.grid-cell') : null;
          if (cell) {
            const r = parseInt(cell.dataset.r, 10);
            const c = parseInt(cell.dataset.c, 10);
            this.handleCellTap(r, c);
          }
        }
      }, { passive: true });

      // Click for Desktop Mouse or Pointer
      if (this.boardGridEl) {
        this.boardGridEl.addEventListener('click', (e) => {
          if (!this.stageManager.isInBattle) return;
          if (Date.now() - lastTouchTapTime < 350) return;
          const cell = e.target.closest('.grid-cell');
          if (!cell) return;
          const r = parseInt(cell.dataset.r, 10);
          const c = parseInt(cell.dataset.c, 10);
          this.handleCellTap(r, c);
        });
      }
    }

    // Phase 1 GWT Test Runner Trigger
    const btnRunGwt = document.getElementById('btn-run-gwt');
    const btnGwtClose = document.getElementById('btn-gwt-close');
    if (btnRunGwt) {
      btnRunGwt.addEventListener('click', async () => {
        this.modalGwt.style.display = 'flex';
        const contentEl = document.getElementById('gwt-results-content');
        contentEl.textContent = '⏳ 正在執行 Phase 1 GWT 驗收測試...';

        try {
          const runner = new GwtRunner();
          await runner.runAllTests();
          const passed = runner.results.filter(r => r.status === 'PASS').length;
          const total = runner.results.length;

          let html = `<div style="font-weight: bold; color: ${passed === total ? '#34d399' : '#f87171'}; font-size: 1rem; margin-bottom: 8px;">
            測試結果: ${passed} / ${total} PASS (${Math.round(passed / total * 100)}%)
          </div>`;

          runner.results.forEach(res => {
            html += `<div style="margin-bottom: 6px; padding: 4px 6px; background: rgba(0,0,0,0.3); border-radius: 4px;">
              <span style="color: ${res.status === 'PASS' ? '#34d399' : '#f87171'}; font-weight: bold;">[${res.status}]</span>
              <span>${res.name}</span>
              ${res.error ? `<div style="color: #fca5a5; font-size: 0.75rem;">${res.error}</div>` : ''}
            </div>`;
          });

          contentEl.innerHTML = html;
        } catch (err) {
          contentEl.innerHTML = `<div style="color: #ef4444;">測試執行崩潰: ${err.message}</div>`;
        }
      });
    }

    if (btnGwtClose) {
      btnGwtClose.addEventListener('click', () => {
        this.modalGwt.style.display = 'none';
      });
    }
  }

  // ==========================================
  // C-STORY-015: UNIFIED CELL TAP / CLICK CONTROLLER
  // ==========================================
  handleCellTap(r, c) {
    if (!this.stageManager.isInBattle) return;
    if (this.isSliding) return;

    if (this.currentAimingItem === 'hammer') {
      const res = this.stageManager.useHammerItem(r, c);
      if (!res.success) {
        alert(res.reason);
      } else {
        this.setAimingMode(null);
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
        // Trigger Mario coin pop directly on the tapped cell (C-STORY-015)
        this.viewRenderer.playVfx([{ type: 'gold_merge', r, c, value: res.amount }]);
        this.audio.playCoin();
      } else if (res && !res.success && res.reason) {
        alert(res.reason);
      }
    }
  }

  handleMove(dir) {
    if (this.isSliding) return;
    if (this.currentAimingItem) {
      this.setAimingMode(null);
    }
    const res = this.stageManager.handleMove(dir);
    if (res.moved) {
      if (res.merges > 0) {
        this.audio.playMerge();
      } else {
        this.audio.playSlide();
      }
    } else if (res.reason === 'TUTORIAL_RESTRICTED') {
      if (this.tutorialOverlay) {
        this.tutorialOverlay.triggerShakingFeedback();
      }
    }
  }

  // ==========================================
  // C-STORY-005: SHOP & GACHA CONTROLLER
  // ==========================================
  bindShopEvents() {
    if (this.btnClaimTestGold) {
      this.btnClaimTestGold.addEventListener('click', () => {
        this.audio.playCoin();
        const newGold = this.stageManager.claimTestGold(10000);
        alert(`🎉 成功領取 10,000 測試金幣！當前總金幣: ${newGold}`);
      });
    }

    if (this.btnClaimTestItems) {
      this.btnClaimTestItems.addEventListener('click', () => {
        this.audio.playCoin();
        const counts = this.stageManager.claimTestItems(5);
        alert(`🎉 成功領取測試救急道具箱！\n當前道具存量：沙漏 x${counts.undo}、戰槌 x${counts.hammer}、重弩 x${counts.snipe}`);
      });
    }

    if (this.btnGachaSingle) {
      this.btnGachaSingle.addEventListener('click', () => {
        this.handleGachaPull(1);
      });
    }

    if (this.btnGachaTen) {
      this.btnGachaTen.addEventListener('click', () => {
        this.handleGachaPull(10);
      });
    }

    if (this.btnGachaConfirm) {
      this.btnGachaConfirm.addEventListener('click', () => {
        this.modalGachaResult.style.display = 'none';
      });
    }

    // Base Tech Tier Upgrade Button in Shop (C-STORY-009)
    if (this.btnUpgradeTech) {
      this.btnUpgradeTech.addEventListener('click', () => {
        const res = this.stageManager.upgradeBaseTier();
        if (!res.success) {
          alert(res.reason);
        } else {
          this.audio.playMerge();
          this.renderTechTierCard();
          const msg = res.tierConfig.isMajor
            ? `⭐【王國重大科技突破！】軍備升階至 Tier ${res.tier}（${res.tierConfig.name}）！\n✨ 徹底淘汰低階裝備，局內基礎掉落升級為：[${res.tierConfig.baseRange.join(', ')}]！`
            : `🎉 軍備科技研發成功！當前階級：Tier ${res.tier}（${res.tierConfig.name}）！\n掉落機率已提升！`;
          alert(msg);
        }
      });
    }

    // Warehouse Capacity Expansion Button (C-STORY-022)
    if (this.btnUpgradeWarehouse) {
      this.btnUpgradeWarehouse.addEventListener('click', () => {
        const res = this.stageManager.upgradeWarehouse();
        if (!res.success) {
          alert(res.reason);
        } else {
          this.audio.playUpgrade();
          this.renderWarehouseCard();
          this.renderArmory();
          alert(`📦 倉庫空間擴充成功！\n當前容量已提升至：${res.newCapacity} 格（+4 格）！`);
        }
      });
    }

    // Fast-Forward Progression Button (C-STORY-009)
    if (this.btnFastForward) {
      this.btnFastForward.addEventListener('click', () => {
        const targetId = parseInt(this.selectFastForward ? this.selectFastForward.value : 1, 10);
        if (!targetId || targetId < 1 || targetId > 350) return;

        const res = this.stageManager.fastForwardToStage(targetId);
        this.audio.playCoin();
        this.renderStagesList();
        this.renderArmory();
        this.renderTechTierCard();
        alert(`⏩ 關卡進度已成功跳轉至第 ${targetId} 關！\n• 前置自動解鎖: ${res.preStagesCount} 關\n• 前置首通賞金總計: +${res.firstClearSum} 🪙\n• 盤面金幣補償 (${res.preStagesCount} 關 × 30): +${res.inCombatSum} 🪙\n• 本次注入總金額: +${res.totalAwarded} 🪙\n當前持有金幣: ${res.totalGold} 🪙`);
      });
    }

    // Royal Privilege Shop Bindings (C-STORY-023, C-STORY-026)
    if (this.btnBuyNoAds) {
      this.btnBuyNoAds.addEventListener('click', () => {
        this.stageManager.buyNoAdsPass();
        this.audio.playVictory();
        this.renderShopPrivileges();
        alert('👑 尊榮授權成功！\n【終身免廣告 PASS】已開通！\n• 永久免除關卡插頁廣告\n• 每日福利與廣告獎勵直接「一鍵秒領」無需等待！');
      });
    }

    if (this.btnBuyStamina) {
      this.btnBuyStamina.addEventListener('click', () => {
        this.stageManager.buyUnlimitedStaminaPass();
        this.audio.playVictory();
        this.renderShopPrivileges();
        alert('❤️ 暢玩通行證開通成功！\n【無限體力通行證】已生效！\n• 遠征戰敗不扣體力，體力顯示為 ∞，暢遊 350 道冒險大關！');
      });
    }

    if (this.btnBuyGoldPack) {
      this.btnBuyGoldPack.addEventListener('click', () => {
        this.audio.playCoin();
        const total = this.stageManager.claimTestGold(55000);
        alert(`💰 皇家金幣儲值成功！\n已獲得 50,000 🪙 + 首購贈送 5,000 🪙！\n當前持有金幣: ${total} 🪙`);
      });
    }

    if (this.btnClaimDailyAd) {
      this.btnClaimDailyAd.addEventListener('click', () => {
        if (this.stageManager.dailyAdRemain <= 0) {
          alert('今日福利廣告獎勵已全數領取完畢，請明日再戰！');
          return;
        }
        this.showAdSimulator(() => {
          const res = this.stageManager.claimDailyAdGold();
          if (res && res.success) {
            this.audio.playCoin();
            this.renderShopPrivileges();
            alert(`🎁 福利金幣領取成功！+500 🪙！\n今日剩餘次數: ${res.remain} / 3 次\n當前持有金幣: ${res.totalGold} 🪙`);
          } else if (res && !res.success) {
            alert(res.reason);
          }
        });
      });
    }

    if (this.btnBuyChapterPass) {
      this.btnBuyChapterPass.addEventListener('click', () => {
        this.audio.playVictory();
        alert('🗺️ 遠征解鎖成功！\n【第 4~8 章大師擴展包】已開通！\n• 深入蛛魔荒漠、遠古地宮、滅世黑曜巨龍與終焉神域！');
      });
    }
  }

  handleGachaPull(times) {
    const res = this.stageManager.pullGacha(times);
    if (!res.success) {
      alert(res.reason);
      return;
    }

    this.audio.playMerge();
    this.showGachaResults(res.items, res.bonusItems);

    if (res.levelUp) {
      setTimeout(() => {
        alert(`⭐ 恭喜！軍備轉蛋機已升級為 Lv.${res.level}！解鎖更高上限裝備！`);
      }, 350);
    }
  }

  showGachaResults(items, bonusItems = []) {
    if (!this.gachaResultsGrid) return;
    this.gachaResultsGrid.innerHTML = '';

    items.forEach(it => {
      const theme = EQUIPMENT_THEMES[it.value] || { badge: '🛡️', bg: '#334155', text: '#fff', border: '#475569' };
      const el = document.createElement('div');
      el.className = 'gacha-result-item';
      el.style.backgroundColor = theme.bg;
      el.style.border = `2px solid ${theme.border}`;
      el.style.color = theme.text;
      el.innerHTML = `
        <span style="font-size: 1.3rem;">${theme.badge}</span>
        <b style="font-size: 1.15rem; font-weight: 900;">${it.value}</b>
      `;
      this.gachaResultsGrid.appendChild(el);
    });

    const bonusArea = document.getElementById('gacha-bonus-items-area');
    const bonusChips = document.getElementById('gacha-bonus-items-chips');
    if (bonusArea && bonusChips) {
      if (bonusItems && bonusItems.length > 0) {
        bonusArea.style.display = 'block';
        bonusChips.innerHTML = '';
        bonusItems.forEach(b => {
          const chip = document.createElement('div');
          chip.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(0, 0, 0, 0.4); border: 1px solid #38bdf8; border-radius: 20px; font-size: 0.85rem; color: #fff;';
          chip.innerHTML = `<span>${b.icon}</span> <b>${b.name} +1</b>`;
          bonusChips.appendChild(chip);
        });
      } else {
        bonusArea.style.display = 'none';
      }
    }

    if (this.modalGachaResult) {
      this.modalGachaResult.style.display = 'flex';
    }
  }

  renderGachaMachine() {
    if (!this.gachaLevelBadge) return;
    const level = this.stageManager.gachaLevel;
    const exp = this.stageManager.gachaExp;
    const config = this.stageManager.gachaEngine.getConfig(level);

    this.gachaLevelBadge.textContent = `Lv.${level} ${config.name}`;

    if (config.expThreshold === Infinity) {
      this.gachaExpText.textContent = `${exp} 抽 (已達頂級)`;
      this.gachaProgressBar.style.width = '100%';
    } else {
      this.gachaExpText.textContent = `${exp} / ${config.expThreshold} 抽`;
      const pct = Math.min(100, Math.round((exp / config.expThreshold) * 100));
      this.gachaProgressBar.style.width = `${pct}%`;
    }

    const rates = this.stageManager.gachaEngine.getRatesPreview(level);
    this.gachaRatesChips.innerHTML = rates.map(r => `
      <span class="rate-chip">${r.value}: <b>${r.percentage}</b></span>
    `).join('');
  }

  // ==========================================
  // C-STORY-005: ARMORY & INVENTORY CONTROLLER
  // ==========================================
  bindArmoryEvents() {
    if (this.btnBatchMerge) {
      this.btnBatchMerge.addEventListener('click', () => {
        const res = this.stageManager.batchAutoMerge();
        if (res.mergedCount > 0) {
          this.audio.playMerge();
          this.renderArmory();
          alert(`✨ 一鍵合成完成！共執行 ${res.mergedCount} 次合體，清出 ${res.freedSlots} 個格子！最高生成: ${res.highestCreated}`);
        } else {
          alert('目前背包中無可合成之相同數值裝備！');
        }
      });
    }

    if (this.btnUnequipItem) {
      this.btnUnequipItem.addEventListener('click', () => {
        const res = this.stageManager.unequipItem();
        if (!res.success) {
          alert(res.reason);
        } else {
          this.audio.playClick();
          this.renderArmory();
        }
      });
    }

    if (this.equipSlotBox) {
      this.equipSlotBox.addEventListener('click', () => {
        if (this.stageManager.inventory.equippedItem) {
          if (confirm('確定要卸下當前出戰裝備嗎？')) {
            this.stageManager.unequipItem();
          }
        }
      });
    }
  }

  handleInventoryItemClick(item) {
    if (!this.selectedInventoryItemId) {
      // Step 1: Select item
      this.selectedInventoryItemId = item.id;
      this.renderArmory();
      return;
    }

    if (this.selectedInventoryItemId === item.id) {
      // Clicked selected item again -> Equip it to Hero
      this.stageManager.equipItem(item.id);
      this.selectedInventoryItemId = null;
      this.audio.playSlide();
      this.renderArmory();
      return;
    }

    // Clicked another item -> Check for manual merge
    const firstItem = this.stageManager.inventory.getItem(this.selectedInventoryItemId);
    if (firstItem && firstItem.value === item.value) {
      this.stageManager.manualMergeItems(firstItem.id, item.id);
      this.selectedInventoryItemId = null;
      this.audio.playMerge();
      this.renderArmory();
    } else {
      // Switch selection
      this.selectedInventoryItemId = item.id;
      this.renderArmory();
    }
  }

  renderArmory() {
    // 1. Hero Loadout Banner
    const equipped = this.stageManager.inventory.equippedItem;
    const power = this.stageManager.inventory.getEquippedPower();

    if (this.loadoutPowerVal) {
      this.loadoutPowerVal.textContent = power;
    }

    const heroTheme = HERO_THEMES[power] || { badge: '🗡️' };
    if (this.loadoutHeroAvatar) {
      this.loadoutHeroAvatar.textContent = heroTheme.badge;
    }

    // 2. Equip Slot Box
    if (this.equipSlotBox) {
      if (equipped) {
        const eqTheme = EQUIPMENT_THEMES[equipped.value] || { badge: '🛡️', bg: '#475569', text: '#fff', border: '#cbd5e1' };
        this.equipSlotBox.className = 'equip-slot-box equipped';
        this.equipSlotBox.style.backgroundColor = eqTheme.bg;
        this.equipSlotBox.style.border = `2px solid ${eqTheme.border}`;
        this.equipSlotBox.style.color = eqTheme.text;
        this.equipSlotBox.innerHTML = `
          <span style="font-size: 1.5rem;">${eqTheme.badge}</span>
          <b style="font-size: 1.15rem; font-weight: 900;">${equipped.value}</b>
        `;
        if (this.btnUnequipItem) this.btnUnequipItem.style.display = 'block';
      } else {
        this.equipSlotBox.className = 'equip-slot-box';
        this.equipSlotBox.style.backgroundColor = '';
        this.equipSlotBox.style.border = '';
        this.equipSlotBox.style.color = '';
        this.equipSlotBox.innerHTML = `<span class="empty-slot-text">未佩戴裝備<br>(預設戰力: 2)</span>`;
        if (this.btnUnequipItem) this.btnUnequipItem.style.display = 'none';
      }
    }

    // 3. Capacity & Grid (C-STORY-022 dynamic warehouse capacity)
    const items = this.stageManager.inventory.items;
    const maxCap = this.stageManager.inventory.maxCapacity;
    if (this.inventoryCapacityVal) {
      this.inventoryCapacityVal.textContent = `${items.length} / ${maxCap}`;
    }

    if (this.inventoryGridEl) {
      this.inventoryGridEl.innerHTML = '';
      for (let i = 0; i < maxCap; i++) {
        const item = items[i];
        const cell = document.createElement('div');
        cell.className = `inventory-cell ${item ? 'occupied' : 'empty'}`;

        if (item) {
          const theme = EQUIPMENT_THEMES[item.value] || { name: '神兵', badge: '🛡️', bg: '#334155', text: '#fff', border: '#475569' };
          const isSelected = (this.selectedInventoryItemId === item.id);
          if (isSelected) cell.classList.add('selected');

          cell.innerHTML = `
            <div class="inv-tile" style="background-color: ${theme.bg}; border: 2px solid ${theme.border}; color: ${theme.text};">
              <span class="inv-tile-icon">${theme.badge}</span>
              <span class="inv-tile-val">${item.value}</span>
            </div>
          `;

          cell.addEventListener('click', () => {
            this.handleInventoryItemClick(item);
          });
        }
        this.inventoryGridEl.appendChild(cell);
      }
    }

    this.renderTechTierCard();
    this.renderWarehouseCard();
  }

  renderTechTierCard() {
    // Kingdom Base Tech Tier Upgrade Card (Now in Camp) (C-STORY-008 & C-STORY-024)
    const tierConfig = this.stageManager.getBaseTierConfig();
    const nextTier = this.stageManager.getNextBaseTierConfig();
    const badgeEl = document.getElementById('tech-tier-badge');
    const cycleTagEl = document.getElementById('tech-cycle-tag');
    const rangeEl = document.getElementById('tech-drop-range');
    const descEl = document.getElementById('tech-tier-desc');
    const costEl = document.getElementById('tech-upgrade-cost');
    const btnUpgrade = document.getElementById('btn-upgrade-tech');
    const gateMsgEl = document.getElementById('tech-tier-gate-msg');

    if (badgeEl) badgeEl.textContent = `Tier ${tierConfig.tier} · ${tierConfig.name}`;
    if (cycleTagEl) {
      cycleTagEl.textContent = tierConfig.isMajor ? '★ 重大升階' : `小升階 ${((tierConfig.tier - 1) % 6) + 1}/6`;
      cycleTagEl.className = `tech-cycle-tag ${tierConfig.isMajor ? 'major-cycle' : ''}`;
    }
    if (rangeEl) rangeEl.textContent = `[${tierConfig.baseRange.join(', ')}]`;
    if (descEl) descEl.textContent = tierConfig.desc;

    const equippedVal = this.stageManager.inventory && this.stageManager.inventory.equippedItem ? this.stageManager.inventory.equippedItem.value : 0;
    const isGearGated = nextTier && nextTier.minEquippedWeapon && equippedVal < nextTier.minEquippedWeapon;

    if (gateMsgEl) {
      if (isGearGated) {
        gateMsgEl.textContent = `🔒 需先穿戴 Tier ${nextTier.minEquippedWeapon} 以上裝備方可研發！`;
        gateMsgEl.style.display = 'block';
      } else {
        gateMsgEl.style.display = 'none';
      }
    }

    if (nextTier) {
      if (costEl) {
        costEl.textContent = isGearGated ? `🔒 需裝備 Tier ${nextTier.minEquippedWeapon}+` : `🪙 ${nextTier.cost.toLocaleString()}`;
      }
      if (btnUpgrade) {
        btnUpgrade.classList.remove('maxed');
        const nameEl = btnUpgrade.querySelector('.upgrade-name');
        if (nameEl) nameEl.textContent = isGearGated ? '科技突破受阻' : '科技研發升階';
        if (isGearGated) {
          btnUpgrade.classList.add('gear-gated');
        } else {
          btnUpgrade.classList.remove('gear-gated');
        }
        btnUpgrade.disabled = false;
      }
    } else {
      if (costEl) costEl.textContent = 'MAX';
      if (btnUpgrade) {
        btnUpgrade.classList.add('maxed');
        btnUpgrade.classList.remove('gear-gated');
        const nameEl = btnUpgrade.querySelector('.upgrade-name');
        if (nameEl) nameEl.textContent = '科技已達最高階';
        btnUpgrade.disabled = true;
      }
    }
  }

  renderWarehouseCard() {
    // Warehouse Capacity Expansion Card (C-STORY-022 & C-STORY-025)
    const config = this.stageManager.getWarehouseConfig();
    const badgeEl = document.getElementById('warehouse-level-badge');
    const descEl = document.getElementById('warehouse-desc');
    const currentCapEl = document.getElementById('warehouse-current-cap-text');
    const nextCapEl = document.getElementById('warehouse-next-cap-text');
    const costEl = document.getElementById('warehouse-cost-text');
    const btnUpgrade = document.getElementById('btn-upgrade-warehouse');

    if (badgeEl) badgeEl.textContent = `擴充 Lv.${config.level}`;
    if (descEl) descEl.textContent = `擴充裝備背包上限，由 ${config.currentCapacity} 格擴增至 ${config.nextCapacity} 格！`;
    if (currentCapEl) currentCapEl.textContent = `${config.currentCapacity} 格`;
    if (nextCapEl) nextCapEl.textContent = `${config.nextCapacity} 格`;
    if (costEl) costEl.textContent = `🪙 ${config.cost.toLocaleString()}`;

    if (btnUpgrade) {
      const nameEl = btnUpgrade.querySelector('.buy-action');
      if (nameEl) nameEl.textContent = '購買擴充 (+4格)';
      btnUpgrade.disabled = this.stageManager.gold < config.cost;
    }
  }

  renderFastForwardOptions() {
    if (!this.selectFastForward) return;
    this.selectFastForward.innerHTML = '';

    CHAPTER_CONFIGS.forEach(ch => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = `第 ${ch.id} 章：${ch.name} (第 ${ch.range[0]} ~ ${ch.range[1]} 關)`;

      for (let sId = ch.range[0]; sId <= ch.range[1]; sId++) {
        const stage = STAGE_CONFIGS.find(s => s.id === sId);
        if (stage) {
          const opt = document.createElement('option');
          opt.value = sId;
          const isMilestone = (sId === ch.range[0] || sId === ch.range[1] || sId % 5 === 0);
          opt.textContent = `${isMilestone ? '⭐ ' : ''}第 ${sId} 關 · ${stage.name}`;
          optGroup.appendChild(opt);
        }
      }
      this.selectFastForward.appendChild(optGroup);
    });
  }

  // ==========================================
  // C-STORY-007: COMBAT EMERGENCY ITEMS
  // ==========================================
  bindCombatItemEvents() {
    if (this.btnItemUndo) {
      this.btnItemUndo.addEventListener('click', () => {
        if (this.currentAimingItem) this.setAimingMode(null);
        const res = this.stageManager.useUndoItem();
        if (!res.success) {
          alert(res.reason);
        }
      });
    }

    if (this.btnItemHammer) {
      this.btnItemHammer.addEventListener('click', () => {
        if (this.currentAimingItem === 'hammer') {
          this.setAimingMode(null);
          return;
        }
        if (this.stageManager.getItemCount('hammer') <= 0) {
          alert('破壞戰槌數量不足，可至商店免費領取！');
          return;
        }
        this.audio.playClick();
        this.setAimingMode('hammer');
      });
    }

    if (this.btnItemSnipe) {
      this.btnItemSnipe.addEventListener('click', () => {
        if (this.currentAimingItem === 'snipe') {
          this.setAimingMode(null);
          return;
        }
        if (this.stageManager.getItemCount('snipe') <= 0) {
          alert('精準重弩數量不足，可至商店免費領取！');
          return;
        }
        this.audio.playClick();
        this.setAimingMode('snipe');
      });
    }

    if (this.btnCancelTarget) {
      this.btnCancelTarget.addEventListener('click', () => {
        this.audio.playClick();
        this.setAimingMode(null);
      });
    }
  }

  setAimingMode(mode) {
    this.currentAimingItem = mode;

    if (this.btnItemHammer) this.btnItemHammer.classList.toggle('active', mode === 'hammer');
    if (this.btnItemSnipe) this.btnItemSnipe.classList.toggle('active', mode === 'snipe');

    if (this.targetingBanner) {
      if (mode === 'hammer') {
        this.targetingBanner.style.display = 'flex';
        if (this.targetingText) this.targetingText.textContent = '🔨 瞄準模式：點選任意 1 格非勇者方塊粉碎！';
      } else if (mode === 'snipe') {
        this.targetingBanner.style.display = 'flex';
        if (this.targetingText) this.targetingText.textContent = '🏹 瞄準模式：點選戰力小於勇者的魔物無損狙殺！';
      } else {
        this.targetingBanner.style.display = 'none';
      }
    }

    this.updateTargetingHighlights();
  }

  updateTargetingHighlights() {
    if (!this.boardGridEl) return;
    const cells = this.boardGridEl.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
      cell.classList.remove('target-valid', 'target-invalid');
      if (!this.currentAimingItem) return;

      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);
      const tile = this.stageManager.board.getTile(r, c);

      if (this.currentAimingItem === 'hammer') {
        if (tile && !tile.isHero()) {
          cell.classList.add('target-valid');
        } else {
          cell.classList.add('target-invalid');
        }
      } else if (this.currentAimingItem === 'snipe') {
        const hero = this.stageManager.board.getHero();
        if (tile && tile.isMonster() && hero && tile.value < hero.value) {
          cell.classList.add('target-valid');
        } else {
          cell.classList.add('target-invalid');
        }
      }
    });
  }

  updateItemCounts() {
    const items = this.stageManager.items || { undo: 0, hammer: 0, snipe: 0 };
    if (this.itemCountUndo) {
      this.itemCountUndo.textContent = items.undo;
      this.itemCountUndo.classList.toggle('empty', items.undo <= 0);
    }
    if (this.itemCountHammer) {
      this.itemCountHammer.textContent = items.hammer;
      this.itemCountHammer.classList.toggle('empty', items.hammer <= 0);
    }
    if (this.itemCountSnipe) {
      this.itemCountSnipe.textContent = items.snipe;
      this.itemCountSnipe.classList.toggle('empty', items.snipe <= 0);
    }

    if (this.btnItemUndo) this.btnItemUndo.classList.toggle('disabled', items.undo <= 0);
    if (this.btnItemHammer) this.btnItemHammer.classList.toggle('disabled', items.hammer <= 0);
    if (this.btnItemSnipe) this.btnItemSnipe.classList.toggle('disabled', items.snipe <= 0);
  }

  // ==========================================
  // C-STORY-026: STAMINA & AD MONETIZATION CONTROLLER
  // ==========================================
  bindStaminaAndAdEvents() {
    if (this.topStaminaPill) {
      this.topStaminaPill.addEventListener('click', () => {
        this.audio.playClick();
        if (this.stageManager.hasUnlimitedStamina) {
          alert('❤️ 您已持有【無限體力通行證】，戰敗不扣體力，暢享無限制推關！');
        } else if (this.stageManager.stamina < this.stageManager.maxStamina) {
          if (this.modalStaminaEmpty) this.modalStaminaEmpty.style.display = 'flex';
        } else {
          alert(`❤️ 體力全滿（${this.stageManager.stamina}/${this.stageManager.maxStamina}）！\n• 勝利闖關不扣體力\n• 戰敗時扣除 1 點\n• 每 20 分鐘自然恢復 1 點`);
        }
      });
    }

    if (this.btnStaminaAdRefill) {
      this.btnStaminaAdRefill.addEventListener('click', () => {
        this.audio.playClick();
        this.showAdSimulator(() => {
          this.stageManager.refillStamina();
          if (this.modalStaminaEmpty) this.modalStaminaEmpty.style.display = 'none';
          this.audio.playVictory();
          alert('❤️ 補給成功！體力已完全補滿（5/5）！');
        });
      });
    }

    if (this.btnStaminaGoShop) {
      this.btnStaminaGoShop.addEventListener('click', () => {
        this.audio.playClick();
        if (this.modalStaminaEmpty) this.modalStaminaEmpty.style.display = 'none';
        this.switchToTab('view-shop');
      });
    }

    if (this.btnStaminaClose) {
      this.btnStaminaClose.addEventListener('click', () => {
        this.audio.playClick();
        if (this.modalStaminaEmpty) this.modalStaminaEmpty.style.display = 'none';
      });
    }
  }

  triggerStaminaLossAnimation() {
    if (this.stageManager.hasUnlimitedStamina) return;

    if (this.topStaminaPill) {
      this.topStaminaPill.classList.remove('deduct-pulse');
      void this.topStaminaPill.offsetWidth; // trigger reflow
      this.topStaminaPill.classList.add('deduct-pulse');

      const rect = this.topStaminaPill.getBoundingClientRect();
      const floatEl = document.createElement('div');
      floatEl.className = 'floating-stamina-loss';
      floatEl.textContent = '-1 ❤️';
      floatEl.style.left = `${Math.max(10, rect.left + rect.width / 2 - 20)}px`;
      floatEl.style.top = `${rect.bottom + 4}px`;
      document.body.appendChild(floatEl);

      setTimeout(() => {
        if (floatEl && floatEl.parentNode) {
          floatEl.parentNode.removeChild(floatEl);
        }
      }, 1300);
    }
  }

  switchToTab(tabId) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => {
      if (n.dataset.tab === tabId) n.classList.add('active');
      else n.classList.remove('active');
    });
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.remove('active');
    });
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
  }

  showAdSimulator(onComplete) {
    if (this.stageManager.hasNoAdsPass) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    if (!this.modalAdSimulator) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    if (this.adCountdownTimer) {
      clearInterval(this.adCountdownTimer);
      this.adCountdownTimer = null;
    }

    let remainingSeconds = 5;
    this.modalAdSimulator.style.display = 'flex';
    this.btnAdClose.disabled = true;
    this.btnAdClose.style.opacity = '0.5';
    this.btnAdClose.style.cursor = 'not-allowed';
    this.btnAdClose.textContent = `⏳ 請等待廣告結束 (${remainingSeconds})`;
    if (this.adTimerBadge) this.adTimerBadge.textContent = `⏳ 廣告倒數 ${remainingSeconds} 秒`;
    if (this.adProgressFill) this.adProgressFill.style.width = '100%';

    const startTime = Date.now();
    const totalDuration = 5000;

    this.adCountdownTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
      const percent = Math.max(0, 100 - (elapsed / totalDuration) * 100);

      if (this.adProgressFill) this.adProgressFill.style.width = `${percent}%`;

      if (left > 0) {
        if (this.adTimerBadge) this.adTimerBadge.textContent = `⏳ 廣告倒數 ${left} 秒`;
        this.btnAdClose.textContent = `⏳ 請等待廣告結束 (${left})`;
      } else {
        clearInterval(this.adCountdownTimer);
        this.adCountdownTimer = null;
        if (this.adTimerBadge) this.adTimerBadge.textContent = `✅ 播放完畢`;
        if (this.adProgressFill) this.adProgressFill.style.width = '0%';
        this.btnAdClose.disabled = false;
        this.btnAdClose.style.opacity = '1';
        this.btnAdClose.style.cursor = 'pointer';
        this.btnAdClose.textContent = '✅ 領取獎勵 / 關閉廣告';

        const handleClose = () => {
          this.btnAdClose.removeEventListener('click', handleClose);
          this.modalAdSimulator.style.display = 'none';
          if (typeof onComplete === 'function') onComplete();
        };
        this.btnAdClose.addEventListener('click', handleClose);
      }
    }, 100);
  }

  renderShopPrivileges() {
    if (this.btnBuyNoAds) {
      const card = document.getElementById('card-no-ads');
      const actionSpan = this.btnBuyNoAds.querySelector('.privilege-action');
      if (this.stageManager.hasNoAdsPass) {
        this.btnBuyNoAds.disabled = true;
        this.btnBuyNoAds.style.opacity = '0.6';
        this.btnBuyNoAds.style.cursor = 'default';
        if (actionSpan) actionSpan.textContent = '已開通 ✔';
        if (card) {
          card.style.borderColor = '#10b981';
          card.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.3)';
        }
      } else {
        this.btnBuyNoAds.disabled = false;
        this.btnBuyNoAds.style.opacity = '1';
        this.btnBuyNoAds.style.cursor = 'pointer';
        if (actionSpan) actionSpan.textContent = '特許授權';
      }
    }

    if (this.btnBuyStamina) {
      const card = document.getElementById('card-stamina');
      const actionSpan = this.btnBuyStamina.querySelector('.privilege-action');
      if (this.stageManager.hasUnlimitedStamina) {
        this.btnBuyStamina.disabled = true;
        this.btnBuyStamina.style.opacity = '0.6';
        this.btnBuyStamina.style.cursor = 'default';
        if (actionSpan) actionSpan.textContent = '已開通 ✔';
        if (card) {
          card.style.borderColor = '#38bdf8';
          card.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.3)';
        }
      } else {
        this.btnBuyStamina.disabled = false;
        this.btnBuyStamina.style.opacity = '1';
        this.btnBuyStamina.style.cursor = 'pointer';
        if (actionSpan) actionSpan.textContent = '立即開通';
      }
    }

    if (this.dailyAdCountText) {
      this.dailyAdCountText.textContent = `${this.stageManager.dailyAdRemain} / 3 次`;
    }
    if (this.btnClaimDailyAd) {
      const actionSpan = this.btnClaimDailyAd.querySelector('.privilege-action');
      if (this.stageManager.dailyAdRemain <= 0) {
        this.btnClaimDailyAd.disabled = true;
        if (actionSpan) actionSpan.textContent = '今日已領完';
        this.btnClaimDailyAd.style.opacity = '0.5';
        this.btnClaimDailyAd.style.cursor = 'not-allowed';
      } else {
        this.btnClaimDailyAd.disabled = false;
        if (actionSpan) {
          actionSpan.textContent = this.stageManager.hasNoAdsPass ? '秒領金幣 (免廣告)' : '觀看廣告';
        }
        this.btnClaimDailyAd.style.opacity = '1';
        this.btnClaimDailyAd.style.cursor = 'pointer';
      }
    }
  }

  startCombat(stageId) {
    if (stageId === 0) {
      this.startTutorialCombat();
      return;
    }
    if (!this.stageManager.canStartStage()) {
      if (this.modalStaminaEmpty) {
        this.modalStaminaEmpty.style.display = 'flex';
      }
      return;
    }
    this.setAimingMode(null);
    this.updateItemCounts();
    const config = this.stageManager.startStage(stageId);
    if (!config) return;

    this.combatStageNameEl.textContent = config.name;
    this.combatOverlayEl.style.display = 'flex';
  }

  // Start Stage 0 Tutorial Combat (C-STORY-030)
  startTutorialCombat() {
    this.setAimingMode(null);
    this.updateItemCounts();
    const config = this.stageManager.startTutorialStage();
    if (!config) return;

    this.combatStageNameEl.textContent = config.name;
    this.combatOverlayEl.style.display = 'flex';
  }

  exitCombat() {
    this.setAimingMode(null);
    if (this.tutorialOverlay) {
      this.tutorialOverlay.hide();
    }
    if (this.stageManager.tutorialManager) {
      this.stageManager.tutorialManager.isActive = false;
    }
    // Forfeit all in-battle rewards if leaving mid-combat (C-STORY-033)
    if (this.stageManager.isInBattle && !this.stageManager.isVictory && !this.stageManager.isGameOver) {
      this.stageManager.abandonBattleRewards();
    }
    this.stageManager.isInBattle = false;
    this.combatOverlayEl.style.display = 'none';
    this.renderStagesList();

    // Check interstitial ad trigger (every 3 battles)
    const adCheck = this.stageManager.recordBattleEnd();
    if (adCheck.triggerAd) {
      this.showAdSimulator(() => {
        this.renderStagesList();
      });
    }
  }

  // Defeat Tactical Tip Helpers (C-STORY-034)
  bindDefeatTipEvents() {
    const tipCard = document.getElementById('defeat-tactical-tip');
    const btnNext = document.getElementById('btn-defeat-tip-next');

    if (btnNext) {
      btnNext.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextDefeatTip();
      });
    }

    if (tipCard) {
      tipCard.addEventListener('click', () => {
        this.nextDefeatTip();
      });
    }
  }

  renderDefeatTip(index) {
    if (!DEFEAT_TACTICAL_TIPS || DEFEAT_TACTICAL_TIPS.length === 0) return;
    this.currentDefeatTipIndex = (index + DEFEAT_TACTICAL_TIPS.length) % DEFEAT_TACTICAL_TIPS.length;
    const tip = DEFEAT_TACTICAL_TIPS[this.currentDefeatTipIndex];

    const badgeEl = document.getElementById('defeat-tip-badge');
    const titleEl = document.getElementById('defeat-tip-title');
    const contentEl = document.getElementById('defeat-tip-content');

    if (badgeEl) badgeEl.textContent = tip.badge;
    if (titleEl) titleEl.textContent = tip.title;
    if (contentEl) contentEl.textContent = tip.content;
  }

  nextDefeatTip() {
    if (this.audio && this.audio.playClick) this.audio.playClick();
    this.renderDefeatTip(this.currentDefeatTipIndex + 1);
  }

  renderRandomDefeatTip() {
    if (!DEFEAT_TACTICAL_TIPS || DEFEAT_TACTICAL_TIPS.length === 0) return;
    const randIdx = Math.floor(Math.random() * DEFEAT_TACTICAL_TIPS.length);
    this.renderDefeatTip(randIdx);
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
