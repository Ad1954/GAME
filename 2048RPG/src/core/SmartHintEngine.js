// SmartHintEngine.js: 10-Second Idle Smart Hint & Anti-Suicide Lookahead Engine
// Evaluates all 4 slide directions, gold tap-to-cash-out, character skills, and emergency items.
// Strictly avoids recommending any move that leads to an immediate deadlock defeat.

import { Board } from './Board.js';
import { MoveEngine } from './MoveEngine.js';
import { Tile } from './Tile.js';
import { Direction, TileType } from './Constants.js';

const DIR_META = {
  [Direction.UP]: { arrow: '⬆️', name: '向上滑動' },
  [Direction.DOWN]: { arrow: '⬇️', name: '向下滑動' },
  [Direction.LEFT]: { arrow: '⬅️', name: '向左滑動' },
  [Direction.RIGHT]: { arrow: '➡️', name: '向右滑動' }
};

export class SmartHintEngine {
  static cloneBoard(board) {
    const copy = new Board(board.size);
    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        const t = board.getTile(r, c);
        if (t) {
          copy.setTile(r, c, new Tile(t.value, t.type, r, c, {
            splitOnDeath: t.splitOnDeath,
            splitValue: t.splitValue,
            splitCount: t.splitCount
          }));
        }
      }
    }
    return copy;
  }

  static evaluateSlide(stageManager, dir) {
    const simBoard = SmartHintEngine.cloneBoard(stageManager.board);
    const engine = new MoveEngine(simBoard);
    const res = engine.move(dir);

    if (!res || !res.moved) {
      return { dir, valid: false, isSafe: false, isWin: false, score: -99999 };
    }

    // Handle splitter children simulation conservatively (if a splitter dies, it consumes up to 2 empty cells)
    let splitChildrenNeeded = 0;
    if (res.slainMonsters && res.slainMonsters.length > 0) {
      for (const m of res.slainMonsters) {
        if (m.splitOnDeath && m.splitValue > 0) {
          splitChildrenNeeded += (m.splitCount || 2);
        }
      }
    }

    const remainingMonsters = simBoard.getMonsters();
    const hasPendingWaves = stageManager.pendingWaves && stageManager.pendingWaves.length > 0;
    if (remainingMonsters.length === 0 && splitChildrenNeeded === 0 && !hasPendingWaves) {
      return {
        dir,
        valid: true,
        isSafe: true,
        isWin: true,
        kills: res.kills || 0,
        merges: res.merges || 0,
        goldEarned: res.goldEarned || 0,
        emptyCount: simBoard.getEmptyCells().length,
        score: 100000
      };
    }

    // Spawn splitter children into worst-case slots if any
    if (splitChildrenNeeded > 0) {
      for (const m of res.slainMonsters) {
        if (m.splitOnDeath && m.splitValue > 0) {
          const count = m.splitCount || 2;
          for (let i = 0; i < count; i++) {
            const empties = simBoard.getEmptyCells();
            if (empties.length > 0) {
              const cell = empties[0];
              simBoard.setTile(cell.r, cell.c, new Tile(m.splitValue, TileType.MONSTER, cell.r, cell.c));
            }
          }
        }
      }
    }

    const emptyAfter = simBoard.getEmptyCells();
    let isSafe = false;

    if (emptyAfter.length >= 2) {
      // Spawning 1 tile still leaves >= 1 empty cell -> guaranteed not immediately deadlocked
      isSafe = true;
    } else if (emptyAfter.length === 1) {
      // Simulate placing the upcoming preview tile (or fallback equip) in the sole remaining cell
      const lastCell = emptyAfter[0];
      const preview = stageManager.nextTilePreview || { type: TileType.EQUIPMENT, value: 2 };
      const simSpawn = new Tile(preview.value || 2, preview.type || TileType.EQUIPMENT, lastCell.r, lastCell.c);
      simBoard.setTile(lastCell.r, lastCell.c, simSpawn);
      const nextEngine = new MoveEngine(simBoard);
      isSafe = nextEngine.canMove();
    } else {
      // 0 empty cells left -> check if canMove without spawn (deadlock risk)
      isSafe = false;
    }

    // Heuristic quality score for safe moves
    const kills = res.kills || 0;
    const merges = res.merges || 0;
    const goldEarned = res.goldEarned || 0;
    const heroMergedBonus = res.heroMerged ? 180 : 0;
    const score = (isSafe ? 1000 : -5000)
      + (kills * 400)
      + heroMergedBonus
      + (merges * 90)
      + (goldEarned * 2)
      + (emptyAfter.length * 18);

    return {
      dir,
      valid: true,
      isSafe,
      isWin: false,
      kills,
      merges,
      goldEarned,
      heroMerged: !!res.heroMerged,
      emptyCount: emptyAfter.length,
      score
    };
  }

  static computeHint(stageManager) {
    if (!stageManager || !stageManager.board || !stageManager.isInBattle || stageManager.isVictory || stageManager.isGameOver) {
      return null;
    }

    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const evals = dirs.map(d => SmartHintEngine.evaluateSlide(stageManager, d));
    const safeMoves = evals.filter(e => e.valid && e.isSafe).sort((a, b) => b.score - a.score);

    const allTiles = stageManager.board.getAllTiles();
    const emptyCells = stageManager.board.getEmptyCells();
    const goldTiles = allTiles.filter(t => t.isGold()).sort((a, b) => b.value - a.value);
    const monsters = allTiles.filter(t => t.isMonster()).sort((a, b) => b.value - a.value);
    const equips = allTiles.filter(t => t.isEquipment()).sort((a, b) => a.value - b.value);

    // 1. Instant Win Slide
    const winMove = safeMoves.find(m => m.isWin);
    if (winMove) {
      const dm = DIR_META[winMove.dir];
      return {
        type: 'SLIDE',
        direction: winMove.dir,
        label: `💡 建議：${dm.arrow} ${dm.name}`,
        reason: '一擊必殺通關！',
        isSafe: true
      };
    }

    // 2. Safe Monster Kill Slide
    const killMove = safeMoves.find(m => m.kills > 0);
    if (killMove) {
      const dm = DIR_META[killMove.dir];
      return {
        type: 'SLIDE',
        direction: killMove.dir,
        label: `💡 建議：${dm.arrow} ${dm.name}`,
        reason: `可安全斬殺 ${killMove.kills} 隻魔物！`,
        isSafe: true
      };
    }

    // 3. Crowded Board (<= 3 empty cells) -> Tap Gold Tile to free space!
    if (emptyCells.length <= 3 && goldTiles.length > 0) {
      const gt = goldTiles[0];
      return {
        type: 'GOLD_CASHOUT',
        target: { r: gt.r, c: gt.c },
        value: gt.value,
        label: `💡 建議：點擊金幣 (${gt.r},${gt.c})`,
        reason: `領取 🪙${gt.value} 並騰出盤面空位！`,
        isSafe: true
      };
    }

    // 4. Skill Ready when board is getting tight (<= 5 empty cells)
    if (stageManager.isSkillReady && emptyCells.length <= 5) {
      return {
        type: 'SKILL',
        label: `💡 建議：點擊啟動職業技能`,
        reason: '技能已充能完畢，可立即破局！',
        isSafe: true
      };
    }

    // 5. Best Safe Slide (Hero upgrade / Equip merge / Space opening)
    if (safeMoves.length > 0) {
      const best = safeMoves[0];
      const dm = DIR_META[best.dir];
      let reason = '安全走位佈局';
      if (best.heroMerged) reason = '勇者吸收裝備升級！';
      else if (best.merges > 0) reason = `達成 ${best.merges} 次裝備/金幣合成！`;
      return {
        type: 'SLIDE',
        direction: best.dir,
        label: `💡 建議：${dm.arrow} ${dm.name}`,
        reason,
        isSafe: true
      };
    }

    // === NO SAFE SLIDES EXIST: Check Non-Slide Rescue Options ===

    // 6. Tap any Gold Tile to create an empty slot
    if (goldTiles.length > 0) {
      const gt = goldTiles[0];
      return {
        type: 'GOLD_CASHOUT',
        target: { r: gt.r, c: gt.c },
        value: gt.value,
        label: `💡 救援：點擊金幣 (${gt.r},${gt.c})`,
        reason: `所有滑動皆危險，先點金幣騰出空位！`,
        isSafe: true
      };
    }

    // 7. Activate Character Skill if ready
    if (stageManager.isSkillReady) {
      return {
        type: 'SKILL',
        label: `💡 救援：點擊啟動職業技能`,
        reason: '盤面瀕危，立即發動技能解圍！',
        isSafe: true
      };
    }

    // 8. Emergency Items (Snipe > Hammer > Undo)
    const snipeCount = stageManager.getItemCount ? stageManager.getItemCount('snipe') : 0;
    if (snipeCount > 0 && monsters.length > 0) {
      const m = monsters[0];
      return {
        type: 'ITEM_SNIPE',
        itemType: 'snipe',
        target: { r: m.r, c: m.c },
        label: `💡 救援：使用 🏹 精準重弩`,
        reason: `點選射殺 (${m.r},${m.c}) 的 ${m.value} 階魔物！`,
        isSafe: true
      };
    }

    const hammerCount = stageManager.getItemCount ? stageManager.getItemCount('hammer') : 0;
    if (hammerCount > 0 && equips.length > 0) {
      const eq = equips[0];
      return {
        type: 'ITEM_HAMMER',
        itemType: 'hammer',
        target: { r: eq.r, c: eq.c },
        label: `💡 救援：使用 🔨 破壞戰槌`,
        reason: `敲碎 (${eq.r},${eq.c}) 的低階裝備騰出空位！`,
        isSafe: true
      };
    }

    const undoCount = stageManager.getItemCount ? stageManager.getItemCount('undo') : 0;
    if (undoCount > 0 && stageManager.history && stageManager.history.length > 0) {
      return {
        type: 'ITEM_UNDO',
        itemType: 'undo',
        label: `💡 救援：使用 ⏳ 時光沙漏`,
        reason: '回溯上一步重新佈局！',
        isSafe: true
      };
    }

    // 9. True Checkmate: No safe slide, no gold, no ready skill, no usable items!
    return {
      type: 'CHECKMATE',
      label: '💀 絕殺・無路可走',
      reason: '所有方向皆將死鎖且無可用救援手段',
      isSafe: false
    };
  }
}
