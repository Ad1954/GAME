// MoveEngine.js: 2048 RPG Core Movement, Fusion, and Combat Decapitation Engine

import { Direction, TileType } from './Constants.js';
import { Tile } from './Tile.js';

export class MoveEngine {
  constructor(board) {
    this.board = board;
  }

  // Executes a move in the given direction
  // Returns: { moved: boolean, kills: number, merges: number, heroMerged: boolean }
  move(direction) {
    const vectors = {
      [Direction.UP]:    { r: -1, c: 0 },
      [Direction.DOWN]:  { r: 1, c: 0 },
      [Direction.LEFT]:  { r: 0, c: -1 },
      [Direction.RIGHT]: { r: 0, c: 1 }
    };

    const vector = vectors[direction];
    if (!vector) return { moved: false, kills: 0, merges: 0, heroMerged: false };

    const size = this.board.size;
    let moved = false;
    let kills = 0;
    let merges = 0;
    let heroMerged = false;
    let goldEarned = 0;

    // Traversal order
    const rIndices = [];
    const cIndices = [];
    for (let i = 0; i < size; i++) {
      rIndices.push(i);
      cIndices.push(i);
    }
    if (vector.r > 0) rIndices.reverse();
    if (vector.c > 0) cIndices.reverse();

    // Track merged positions to prevent chain merges in single turn
    const mergedPositions = new Set();
    const slainMonsters = [];
    const moves = [];
    const vfxEvents = [];

    rIndices.forEach(r => {
      cIndices.forEach(c => {
        const tile = this.board.getTile(r, c);
        if (!tile) return;

        const fromR = r;
        const fromC = c;
        let currR = r;
        let currC = c;
        let nextR = currR + vector.r;
        let nextC = currC + vector.c;
        let merged = false;
        let eventType = null;

        while (this.board.inBounds(nextR, nextC)) {
          const nextTile = this.board.getTile(nextR, nextC);

          if (!nextTile) {
            // Free slot: move forward
            this.board.setTile(nextR, nextC, tile);
            this.board.removeTile(currR, currC);
            currR = nextR;
            currC = nextC;
            nextR = currR + vector.r;
            nextC = currC + vector.c;
            moved = true;
          } else {
            // Collision: Check interaction rules
            const posKey = `${nextR},${nextC}`;
            const alreadyMerged = mergedPositions.has(posKey);

            if (alreadyMerged) {
              // Target cell already merged this turn, stop
              break;
            }

            // Rule 1A: Hero meets Monster (Hero active decapitation)
            if (tile.isHero() && nextTile.isMonster()) {
              if (tile.value >= nextTile.value) {
                // Hero executes monster!
                kills++;
                slainMonsters.push(nextTile);
                const newHeroVal = Math.max(2, Math.floor(tile.value / 2));
                const heroTile = new Tile(newHeroVal, TileType.HERO, nextR, nextC);

                this.board.setTile(nextR, nextC, heroTile);
                this.board.removeTile(currR, currC);
                mergedPositions.add(posKey);
                moved = true;
                merged = true;
                eventType = 'hero_slash_monster';
                vfxEvents.push({ type: 'hero_slash_monster', r: nextR, c: nextC, value: newHeroVal });
              }
              // If Hero < Monster: blocked, stop
              break;
            }

            // Rule 1B: Monster meets Hero (Monster slides into Hero)
            if (tile.isMonster() && nextTile.isHero()) {
              if (nextTile.value >= tile.value) {
                // Hero slays incoming monster!
                kills++;
                slainMonsters.push(tile);
                const newHeroVal = Math.max(2, Math.floor(nextTile.value / 2));
                const heroTile = new Tile(newHeroVal, TileType.HERO, nextR, nextC);

                this.board.setTile(nextR, nextC, heroTile);
                this.board.removeTile(currR, currC);
                mergedPositions.add(posKey);
                moved = true;
                merged = true;
                eventType = 'hero_slash_monster';
                vfxEvents.push({ type: 'hero_slash_monster', r: nextR, c: nextC, value: newHeroVal });
              }
              // If Monster > Hero: blocked, stop
              break;
            }

            // Rule 2: Hero meets Equipment (STRICT 2048: Equal Value ONLY!)
            if (tile.isHero() && nextTile.isEquipment()) {
              if (tile.value === nextTile.value) {
                // Same value: Hero absorbs equipment and doubles
                merges++;
                heroMerged = true;
                const newHeroVal = tile.value * 2;
                const heroTile = new Tile(newHeroVal, TileType.HERO, nextR, nextC);

                this.board.setTile(nextR, nextC, heroTile);
                this.board.removeTile(currR, currC);
                mergedPositions.add(posKey);
                moved = true;
                merged = true;
                eventType = 'hero_eat_gear';
                vfxEvents.push({ type: 'hero_eat_gear', r: nextR, c: nextC, value: newHeroVal });
              }
              // Different value: strictly blocked!
              break;
            }

            // Rule 3: Equipment meets Hero (STRICT 2048: Equal Value ONLY!)
            if (tile.isEquipment() && nextTile.isHero()) {
              if (tile.value === nextTile.value) {
                // Same value: Hero absorbs incoming equipment and doubles
                merges++;
                heroMerged = true;
                const newHeroVal = nextTile.value * 2;
                const heroTile = new Tile(newHeroVal, TileType.HERO, nextR, nextC);

                this.board.setTile(nextR, nextC, heroTile);
                this.board.removeTile(currR, currC);
                mergedPositions.add(posKey);
                moved = true;
                merged = true;
                eventType = 'hero_eat_gear';
                vfxEvents.push({ type: 'hero_eat_gear', r: nextR, c: nextC, value: newHeroVal });
              }
              // Different value: strictly blocked!
              break;
            }

            // Rule 4: Equipment meets Equipment (Double fusion)
            if (tile.isEquipment() && nextTile.isEquipment() && tile.value === nextTile.value) {
              merges++;
              const newEqVal = tile.value * 2;
              const eqTile = new Tile(newEqVal, TileType.EQUIPMENT, nextR, nextC);

              this.board.setTile(nextR, nextC, eqTile);
              this.board.removeTile(currR, currC);
              mergedPositions.add(posKey);
              moved = true;
              merged = true;
              eventType = 'gear_fusion';
              break;
            }

            // Rule 5: Monster meets Monster (Same value fusion)
            if (tile.isMonster() && nextTile.isMonster() && tile.value === nextTile.value) {
              merges++;
              const newMonsterVal = tile.value * 2;
              const monsterTile = new Tile(newMonsterVal, TileType.MONSTER, nextR, nextC);

              this.board.setTile(nextR, nextC, monsterTile);
              this.board.removeTile(currR, currC);
              mergedPositions.add(posKey);
              moved = true;
              merged = true;
              eventType = 'monster_fusion';
              vfxEvents.push({ type: 'monster_fusion', r: nextR, c: nextC, value: newMonsterVal });
              break;
            }

            // Rule 5B: Gold meets Gold (Double fusion + instant cash reward!)
            if (tile.isGold() && nextTile.isGold() && tile.value === nextTile.value) {
              merges++;
              const newGoldVal = tile.value * 2;
              goldEarned += newGoldVal;
              const goldTile = new Tile(newGoldVal, TileType.GOLD, nextR, nextC);

              this.board.setTile(nextR, nextC, goldTile);
              this.board.removeTile(currR, currC);
              mergedPositions.add(posKey);
              moved = true;
              merged = true;
              eventType = 'gold_merge';
              vfxEvents.push({ type: 'gold_merge', r: nextR, c: nextC, value: newGoldVal });
              break;
            }

            // Rule 6: Equipment meets Monster or Gold with others -> Non-lethal blocking!
            // Stop immediately without injury
            break;
          }
        }

        const finalR = merged ? nextR : currR;
        const finalC = merged ? nextC : currC;
        if (finalR !== fromR || finalC !== fromC || merged) {
          moves.push({
            from: { r: fromR, c: fromC },
            to: { r: finalR, c: finalC },
            tile: tile,
            merged: merged,
            eventType: eventType
          });
        }
      });
    });

    return { moved, kills, merges, heroMerged, goldEarned, slainMonsters, moves, vfxEvents };
  }

  // Deadlock detection: checks if any valid move exists
  canMove() {
    // If there is any empty cell, player can move
    if (!this.board.isFull()) return true;

    // Check all adjacent pairs for possible merge/kill
    const size = this.board.size;
    const directions = [
      { r: 0, c: 1 },
      { r: 1, c: 0 }
    ];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const t1 = this.board.getTile(r, c);
        if (!t1) continue;

        for (const d of directions) {
          const nr = r + d.r;
          const nc = c + d.c;
          if (this.board.inBounds(nr, nc)) {
            const t2 = this.board.getTile(nr, nc);
            if (!t2) return true;

            // Hero kill monster?
            if ((t1.isHero() && t2.isMonster() && t1.value >= t2.value) ||
                (t2.isHero() && t1.isMonster() && t2.value >= t1.value)) {
              return true;
            }

            // Hero absorb equipment (STRICT Equal value)?
            if ((t1.isHero() && t2.isEquipment() && t1.value === t2.value) ||
                (t2.isHero() && t1.isEquipment() && t2.value === t1.value)) {
              return true;
            }

            // Equipment merge with equipment?
            if (t1.isEquipment() && t2.isEquipment() && t1.value === t2.value) {
              return true;
            }

            // Monster merge with monster?
            if (t1.isMonster() && t2.isMonster() && t1.value === t2.value) {
              return true;
            }

            // Gold merge with gold?
            if (t1.isGold() && t2.isGold() && t1.value === t2.value) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }
}
