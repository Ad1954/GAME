// TutorialOverlay.js: Presentation Controller for Tutorial POPUP Cards, Hand Guide, and Animations (C-STORY-031)

import { Events, TileType, HERO_THEMES, EQUIPMENT_THEMES, MONSTER_THEMES, GOLD_THEMES } from '../core/Constants.js';

export class TutorialOverlay {
  constructor(containerElement, boardGridElement, eventBus) {
    this.container = containerElement;
    this.boardGrid = boardGridElement;
    this.eventBus = eventBus;

    this.overlayElement = null;
    this.dialogueBox = null;
    this.dialogueTitle = null;
    this.dialogueText = null;
    this.skipButton = null;

    // Graphic POPUP Modal
    this.popupModal = null;
    this.popupBody = null;
    this.popupWarning = null;
    this.popupBtnConfirm = null;

    // Hand pointer (now anchored inside board-grid for 100% responsive percentage coordinates)
    this.handPointer = null;
    this.handLabel = null;
    this.currentStepConfig = null;

    this.initUI();
    this.bindEvents();
  }

  initUI() {
    // 1. Dialogue Banner & POPUP Modal inside app-container
    let el = document.getElementById('tutorial-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tutorial-overlay';
      el.className = 'tutorial-overlay';
      el.style.display = 'none';
      el.innerHTML = `
        <!-- Top Dialogue Banner -->
        <div class="tutorial-dialogue-banner" id="tutorial-dialogue-banner">
          <div class="tutorial-dialogue-header">
            <span class="tutorial-badge">👑 新手引導</span>
            <span class="tutorial-title" id="tutorial-dialogue-title">教學指示</span>
            <button class="tutorial-btn-skip" id="btn-tutorial-skip">跳過教學 ⏩</button>
          </div>
          <div class="tutorial-dialogue-body" id="tutorial-dialogue-text"></div>
        </div>

        <!-- POPUP Visual Graphic Modal (C-STORY-031) -->
        <div class="tutorial-popup-backdrop" id="tutorial-popup-backdrop" style="display: none;">
          <div class="tutorial-popup-card">
            <div class="tutorial-popup-header">
              <span class="popup-header-icon">📖</span>
              <span class="popup-header-title" id="tutorial-popup-title">核心規則說明</span>
            </div>
            <div class="tutorial-popup-body" id="tutorial-popup-body">
              <!-- Dynamically populated card formula -->
            </div>
            <div class="tutorial-popup-warning" id="tutorial-popup-warning" style="display: none;"></div>
            <button class="tutorial-popup-btn" id="btn-tutorial-popup-confirm">知道了，開始操作 ⚔️</button>
          </div>
        </div>
      `;
      this.container.appendChild(el);
    }

    this.overlayElement = el;
    this.dialogueBox = el.querySelector('#tutorial-dialogue-banner');
    this.dialogueTitle = el.querySelector('#tutorial-dialogue-title');
    this.dialogueText = el.querySelector('#tutorial-dialogue-text');
    this.skipButton = el.querySelector('#btn-tutorial-skip');

    this.popupModal = el.querySelector('#tutorial-popup-backdrop');
    this.popupTitle = el.querySelector('#tutorial-popup-title');
    this.popupBody = el.querySelector('#tutorial-popup-body');
    this.popupWarning = el.querySelector('#tutorial-popup-warning');
    this.popupBtnConfirm = el.querySelector('#btn-tutorial-popup-confirm');

    // 2. Hand Pointer: Anchor DIRECTLY inside .board-wrapper / .board-grid
    let boardWrapper = this.boardGrid ? this.boardGrid.parentElement : null;
    let hand = document.getElementById('tutorial-hand-pointer');
    if (!hand) {
      hand = document.createElement('div');
      hand.id = 'tutorial-hand-pointer';
      hand.className = 'tutorial-hand-pointer';
      hand.style.display = 'none';
      hand.innerHTML = `
        <div class="hand-icon">👆</div>
        <div class="hand-label" id="tutorial-hand-label">滑動</div>
      `;
      if (boardWrapper) {
        boardWrapper.style.position = 'relative';
        boardWrapper.appendChild(hand);
      } else {
        this.container.appendChild(hand);
      }
    }

    this.handPointer = hand;
    this.handLabel = hand.querySelector('#tutorial-hand-label');

    // Skip Button Handler
    if (this.skipButton) {
      this.skipButton.addEventListener('click', () => {
        if (confirm('確定要跳過新手教學嗎？隨後可在冒險大廳再次重溫。')) {
          this.eventBus.emit('TUTORIAL_SKIP_REQUESTED');
        }
      });
    }

    // Popup Confirm Button Handler
    if (this.popupBtnConfirm) {
      this.popupBtnConfirm.addEventListener('click', () => {
        if (this.popupModal) {
          this.popupModal.style.display = 'none';
        }
        // Show hand guide after confirming popup
        if (this.currentStepConfig) {
          this.renderHandGuide(this.currentStepConfig.handGuide);
        }
      });
    }
  }

  bindEvents() {
    this.eventBus.on(Events.TUTORIAL_STEP_CHANGED, ({ stepConfig, subStepPhase, goldTile }) => {
      this.currentStepConfig = stepConfig;
      this.showStep(stepConfig, subStepPhase, goldTile);
    });

    this.eventBus.on(Events.TUTORIAL_COMPLETED, () => {
      this.hide();
    });

    // Cross-screen auto-realign on viewport resize
    window.addEventListener('resize', () => {
      if (this.currentHandGuide && this.handPointer && this.handPointer.style.display !== 'none') {
        this.renderHandGuide(this.currentHandGuide);
      }
    });
  }

  showStep(stepConfig, subStepPhase = 1, extra = null) {
    if (!this.overlayElement) return;
    this.overlayElement.style.display = 'block';

    let title = stepConfig.title;
    let dialogue = stepConfig.dialogue;

    // Sub-step text override
    if (stepConfig.id === 'step_3_gold_merge_and_tap' && subStepPhase === 2) {
      if (stepConfig.subStep) {
        dialogue = stepConfig.subStep.dialogue;
      }
    } else if (stepConfig.id === 'step_4_power_check_boss' && subStepPhase === 2) {
      if (stepConfig.phase2Guide) {
        dialogue = stepConfig.phase2Guide.dialogue;
      }
    }

    if (this.dialogueTitle) this.dialogueTitle.textContent = title;
    if (this.dialogueText) {
      this.dialogueText.innerHTML = dialogue.replace(/\n/g, '<br>');
    }

    // If step has popupCard and we are in Phase 1 (Initial step entry), show Popup Modal first!
    if (stepConfig.popupCard && subStepPhase === 1) {
      this.showPopupCard(stepConfig.popupCard);
      // Hand guide will be rendered after player clicks "Confirm" in popup
      if (this.handPointer) this.handPointer.style.display = 'none';
    } else {
      if (this.popupModal) this.popupModal.style.display = 'none';
      if (stepConfig.id === 'step_3_gold_merge_and_tap' && subStepPhase === 2) {
        // Prioritize goldTile instance coordinate, then fallback to DOM search (C-STORY-033)
        let goldPos = null;
        if (extra && extra.r !== undefined && extra.c !== undefined) {
          goldPos = { r: extra.r, c: extra.c };
        } else {
          goldPos = this.findGoldTilePosition();
        }
        this.renderHandGuide({
          type: 'tap',
          cell: goldPos,
          label: '點擊兌現金幣'
        });
      } else if (stepConfig.id === 'step_4_power_check_boss' && subStepPhase === 2) {
        this.renderHandGuide(stepConfig.phase2Guide.handGuide);
      } else {
        this.renderHandGuide(stepConfig.handGuide);
      }
    }
  }

  // Render Visual Card Formula (Image Graphic Mockup Style)
  showPopupCard(popupDef) {
    if (!this.popupModal || !this.popupBody) return;
    this.popupModal.style.display = 'flex';
    this.popupTitle.textContent = popupDef.title || '核心規則說明';

    if (popupDef.confirmText && this.popupBtnConfirm) {
      this.popupBtnConfirm.textContent = popupDef.confirmText;
    }

    if (popupDef.warning && this.popupWarning) {
      this.popupWarning.textContent = popupDef.warning;
      this.popupWarning.style.display = 'block';
    } else if (this.popupWarning) {
      this.popupWarning.style.display = 'none';
    }

    // Build Card Formula HTML
    let html = '<div class="tutorial-formula-row">';
    popupDef.formula.forEach(item => {
      if (item.symbol) {
        html += `<div class="formula-symbol">${item.symbol}</div>`;
      } else {
        html += this.renderFormulaCard(item);
      }
    });
    html += '</div>';

    this.popupBody.innerHTML = html;
  }

  renderFormulaCard(item) {
    let badge = '❓';
    let val = item.val;
    let label = item.label || '';
    let themeClass = `card-${item.type}`;
    let slashed = item.slashed ? 'slashed' : '';

    if (item.type === 'hero') {
      const theme = HERO_THEMES[val] || { badge: '🧑‍🌾' };
      badge = theme.badge;
    } else if (item.type === 'equipment') {
      const theme = EQUIPMENT_THEMES[val] || { badge: '🪵' };
      badge = theme.badge;
    } else if (item.type === 'monster') {
      const theme = MONSTER_THEMES[val] || { badge: '🐺' };
      badge = theme.badge;
    } else if (item.type === 'gold') {
      const theme = GOLD_THEMES[val] || { badge: '🪙' };
      badge = theme.badge;
    } else if (item.type === 'defeat') {
      badge = '💀';
    } else if (item.type === 'block') {
      badge = '🛑';
    }

    return `
      <div class="formula-card-wrap">
        <div class="formula-mini-card ${themeClass} ${slashed}">
          <div class="mini-card-badge">${badge}</div>
          <div class="mini-card-val">${val}</div>
        </div>
        <div class="mini-card-label">${label}</div>
      </div>
    `;
  }

  findGoldTilePosition() {
    if (!this.boardGrid) return { r: 1, c: 0 };
    // Find gold tile DOM or default to (1,0)
    const goldCell = this.boardGrid.querySelector('.tile-gold');
    if (goldCell) {
      const parent = goldCell.closest('.grid-cell');
      if (parent && parent.dataset.r !== undefined && parent.dataset.c !== undefined) {
        return {
          r: parseInt(parent.dataset.r, 10),
          c: parseInt(parent.dataset.c, 10)
        };
      }
    }
    return { r: 1, c: 0 };
  }

  // Get exact pixel geometry of a specific cell relative to board wrapper (C-STORY-033)
  getCellRectInWrapper(r, c) {
    if (!this.boardGrid) return null;
    const boardWrapper = this.boardGrid.parentElement || this.container;
    const cell = this.boardGrid.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
    if (!cell || !boardWrapper) return null;
    const cellRect = cell.getBoundingClientRect();
    const wrapperRect = boardWrapper.getBoundingClientRect();
    if (cellRect.width === 0 && cellRect.height === 0) return null;
    return {
      centerX: cellRect.left - wrapperRect.left + cellRect.width / 2,
      centerY: cellRect.top - wrapperRect.top + cellRect.height / 2,
      bottomY: cellRect.top - wrapperRect.top + cellRect.height,
      topY: cellRect.top - wrapperRect.top,
      width: cellRect.width,
      height: cellRect.height
    };
  }

  // ============================================================
  // EXACT DOM CELL-ANCHORED HAND POINTER (C-STORY-033 & C-STORY-035)
  // ============================================================
  renderHandGuide(guide) {
    if (!this.handPointer) return;
    this.currentHandGuide = guide;
    if (!guide) {
      this.handPointer.style.display = 'none';
      return;
    }

    // Hide temporarily during repositioning to prevent unnatural cross-screen sliding (C-STORY-035)
    this.handPointer.style.display = 'none';
    this.handLabel.textContent = guide.label || '';
    this.handPointer.className = 'tutorial-hand-pointer';

    if (guide.type === 'swipe') {
      const fromRect = this.getCellRectInWrapper(guide.from.r, guide.from.c);
      const toRect = this.getCellRectInWrapper(guide.to.r, guide.to.c);

      if (fromRect && toRect) {
        let posX = (fromRect.centerX + toRect.centerX) / 2;
        let posY = (fromRect.centerY + toRect.centerY) / 2;

        if (guide.guideOffsetCol !== undefined) {
          posX += guide.guideOffsetCol * fromRect.width;
        }

        if (guide.placeBelow) {
          // Gesture placed directly below the tiles, finger tip slightly touching bottom edge
          posY = Math.max(fromRect.bottomY, toRect.bottomY) + 4;
        } else if (guide.guideOffsetRow !== undefined) {
          posY += guide.guideOffsetRow * fromRect.height;
        }

        this.handPointer.style.left = `${posX}px`;
        this.handPointer.style.top = `${posY}px`;
      } else {
        // Fallback to percentage if DOM cells not yet laid out
        const colOffset = guide.guideOffsetCol !== undefined ? guide.guideOffsetCol : 0;
        const rowOffset = guide.placeBelow ? 0.55 : (guide.guideOffsetRow !== undefined ? guide.guideOffsetRow : 0);
        const anchorC = ((guide.from.c + guide.to.c) / 2) + colOffset;
        const anchorR = ((guide.from.r + guide.to.r) / 2) + rowOffset;
        this.positionHandPercent((anchorC + 0.5) * 20, (anchorR + 0.5) * 20);
      }

      // Determine swipe direction animation
      if (guide.from.r > guide.to.r) {
        this.handPointer.classList.add('animate-swipe-up');
      } else if (guide.from.r < guide.to.r) {
        this.handPointer.classList.add('animate-swipe-down');
      } else if (guide.from.c < guide.to.c) {
        this.handPointer.classList.add('animate-swipe-right');
      } else if (guide.from.c > guide.to.c) {
        this.handPointer.classList.add('animate-swipe-left');
      }
    } else if (guide.type === 'tap') {
      const targetCell = guide.cell || this.findGoldTilePosition();
      const cellRect = this.getCellRectInWrapper(targetCell.r, targetCell.c);
      if (cellRect) {
        // C-STORY-035: Hand pointer (👆 + label badge) has center shifted.
        // Downward offset (+0.28 * height) ensures the 👆 fingertip points dead center at the gold tile!
        const tipOffsetY = Math.round(cellRect.height * 0.28);
        this.handPointer.style.left = `${cellRect.centerX}px`;
        this.handPointer.style.top = `${cellRect.centerY + tipOffsetY}px`;
      } else {
        const posXPercent = (targetCell.c + 0.5) * 20;
        const posYPercent = (targetCell.r + 0.5 + 0.28) * 20;
        this.positionHandPercent(posXPercent, posYPercent);
      }
      this.handPointer.classList.add('animate-tap-pulse');
    }

    // Reveal instantaneously at target coordinates without prior-position transition
    this.handPointer.style.display = 'flex';
  }

  positionHandPercent(xPercent, yPercent) {
    this.handPointer.style.left = `${xPercent}%`;
    this.handPointer.style.top = `${yPercent}%`;
  }

  triggerShakingFeedback() {
    if (this.dialogueBox) {
      this.dialogueBox.classList.remove('tutorial-shake');
      void this.dialogueBox.offsetWidth; // trigger reflow
      this.dialogueBox.classList.add('tutorial-shake');
    }
  }

  hide() {
    if (this.overlayElement) {
      this.overlayElement.style.display = 'none';
    }
    if (this.popupModal) {
      this.popupModal.style.display = 'none';
    }
    if (this.handPointer) {
      this.handPointer.style.display = 'none';
    }
  }
}
