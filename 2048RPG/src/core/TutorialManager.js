// TutorialManager.js: State Machine and Validation Logic for Stage 0 Tutorial (C-STORY-030)

import { TUTORIAL_STEPS } from './TutorialConfig.js';
import { Events, Direction, TileType } from './Constants.js';
import { Tile } from './Tile.js';

export const TUTORIAL_STORAGE_KEY = '2048RPG_Tutorial_Completed';

export class TutorialManager {
  constructor(stageManager) {
    this.stageManager = stageManager;
    this.currentStepIndex = 1;
    this.isActive = false;
    this.isCompleted = this.checkCompleted();
    this.subStepPhase = 1; // Used for multi-phase steps (e.g. step 3 gold tap, step 4 down then up)
  }

  checkCompleted() {
    try {
      return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
    } catch (e) {
      return false;
    }
  }

  setCompleted(completed = true) {
    this.isCompleted = completed;
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, completed ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save tutorial status', e);
    }
  }

  getCurrentStepConfig() {
    return TUTORIAL_STEPS.find(s => s.stepIndex === this.currentStepIndex) || null;
  }

  startTutorial() {
    this.isActive = true;
    this.currentStepIndex = 1;
    this.subStepPhase = 1;
    this.applyStep(this.currentStepIndex);
  }

  endTutorial(markAsCompleted = true) {
    this.isActive = false;
    if (markAsCompleted) {
      this.setCompleted(true);
    }
    if (this.stageManager && this.stageManager.eventBus) {
      this.stageManager.eventBus.emit(Events.TUTORIAL_COMPLETED, {
        completed: this.isCompleted
      });
    }
  }

  skipTutorial() {
    this.endTutorial(true);
  }

  applyStep(stepIndex) {
    this.currentStepIndex = stepIndex;
    this.subStepPhase = 1;
    const stepConfig = this.getCurrentStepConfig();
    if (!stepConfig) {
      this.endTutorial(true);
      return;
    }

    if (this.stageManager && this.stageManager.board) {
      this.stageManager.board.clear();
      stepConfig.initialBoard.forEach(tileDef => {
        const tile = new Tile(tileDef.value, tileDef.type, tileDef.r, tileDef.c);
        this.stageManager.board.setTile(tileDef.r, tileDef.c, tile);
      });
      this.stageManager.emitState();
    }

    if (this.stageManager && this.stageManager.eventBus) {
      this.stageManager.eventBus.emit(Events.TUTORIAL_STEP_CHANGED, {
        stepConfig,
        subStepPhase: this.subStepPhase
      });
    }
  }

  // Direction validation gate: Prevents incorrect moves from scrambling the tutorial board
  isDirectionAllowed(direction) {
    if (!this.isActive) return true;
    const stepConfig = this.getCurrentStepConfig();
    if (!stepConfig) return true;

    // Step 3 handling: if subStepPhase is 2, player must TAP gold, no swipes allowed!
    if (stepConfig.id === 'step_3_gold_merge_and_tap' && this.subStepPhase === 2) {
      return false;
    }

    // Step 4 handling: Open combat, any valid direction allowed!
    if (stepConfig.id === 'step_4_power_check_boss') {
      return true;
    }

    if (stepConfig.allowedDirections && Array.isArray(stepConfig.allowedDirections)) {
      return stepConfig.allowedDirections.includes(direction);
    }
    return true;
  }

  // Handle post-move trigger evaluation (C-STORY-033: 1.0s waiting pause)
  onMoveExecuted(direction, moveResult, delayMs = 1000) {
    if (!this.isActive) return;
    const stepConfig = this.getCurrentStepConfig();
    if (!stepConfig) return;

    const scheduleAdvance = (fn) => {
      if (delayMs <= 0) {
        fn();
      } else {
        setTimeout(fn, delayMs);
      }
    };

    if (stepConfig.id === 'step_1_equip_fusion') {
      const hero = this.stageManager.board.getHero();
      if (hero && hero.value >= 4) {
        // Allow 1.5s visual pause for player to appreciate fusion result!
        scheduleAdvance(() => {
          if (this.isActive) this.applyStep(2);
        });
      }
    } else if (stepConfig.id === 'step_2_combat_defeat_monster') {
      const monsters = this.stageManager.board.getMonsters();
      if (monsters.length === 0) {
        // Allow 1.5s visual pause for monster elimination feedback!
        scheduleAdvance(() => {
          if (this.isActive) this.applyStep(3);
        });
      }
    } else if (stepConfig.id === 'step_3_gold_merge_and_tap') {
      if (this.subStepPhase === 1) {
        // Check if gold tiles merged into 8
        const goldTiles = this.stageManager.board.getAllTiles().filter(t => t.isGold());
        if (goldTiles.length === 1 && goldTiles[0].value === 8) {
          // 1.5s visual pause to see the gold tile merged before tap guide
          scheduleAdvance(() => {
            if (!this.isActive) return;
            this.subStepPhase = 2;
            if (this.stageManager && this.stageManager.eventBus) {
              this.stageManager.eventBus.emit(Events.TUTORIAL_STEP_CHANGED, {
                stepConfig,
                subStepPhase: this.subStepPhase,
                goldTile: goldTiles[0]
              });
            }
          });
        }
      }
    } else if (stepConfig.id === 'step_4_power_check_boss') {
      const monsters = this.stageManager.board.getMonsters();
      if (monsters.length === 0) {
        // Tutorial Boss Cleared in open practice! 1.5s victory transition
        scheduleAdvance(() => {
          if (this.isActive) this.endTutorial(true);
        });
      }
    }
  }

  // Handle cell tap evaluation (Specifically for Step 3 tap-to-cash-out)
  onCellTapped(r, c, tile = null) {
    if (!this.isActive) return false;
    const stepConfig = this.getCurrentStepConfig();
    if (!stepConfig) return false;

    if (stepConfig.id === 'step_3_gold_merge_and_tap') {
      const targetTile = tile || this.stageManager.board.getTile(r, c);
      if (targetTile && targetTile.isGold() && targetTile.value >= 8) {
        // Step 3 completed: advance to step 4
        setTimeout(() => {
          this.applyStep(4);
        }, 350);
        return true;
      }
    }
    return false;
  }
}
