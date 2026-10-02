// Spawner.js: Equipment and Monster Spawner for Commercial Edition

import { TileType } from './Constants.js';
import { Tile } from './Tile.js';

export class Spawner {
  constructor(board) {
    this.board = board;
  }

  spawnHero(value, pos = { r: 4, c: 0 }) {
    const tile = new Tile(value, TileType.HERO, pos.r, pos.c);
    this.board.setTile(pos.r, pos.c, tile);
    return tile;
  }

  spawnMonster(value, pos, extra = {}) {
    const tile = new Tile(value, TileType.MONSTER, pos.r, pos.c, extra);
    this.board.setTile(pos.r, pos.c, tile);
    return tile;
  }

  spawnEquipment(value, pos = null) {
    let target = pos;
    if (!target) {
      const empty = this.board.getEmptyCells();
      if (empty.length === 0) return null;
      target = empty[Math.floor(Math.random() * empty.length)];
    }
    const tile = new Tile(value, TileType.EQUIPMENT, target.r, target.c);
    this.board.setTile(target.r, target.c, tile);
    return tile;
  }

  // Spawns natural equipment after each valid move, respecting base stat tier
  spawnTurnEquipment(tierConfigOrBase = null) {
    const empty = this.board.getEmptyCells();
    if (empty.length === 0) return null;
    const cell = empty[Math.floor(Math.random() * empty.length)];

    let val = 2;
    if (tierConfigOrBase && typeof tierConfigOrBase === 'object' && tierConfigOrBase.baseRange && tierConfigOrBase.weights) {
      const rand = Math.random();
      let acc = 0;
      for (let i = 0; i < tierConfigOrBase.weights.length; i++) {
        acc += tierConfigOrBase.weights[i];
        if (rand < acc) {
          val = tierConfigOrBase.baseRange[i];
          break;
        }
      }
      if (!val) val = tierConfigOrBase.baseRange[0];
    } else if (typeof tierConfigOrBase === 'number') {
      val = Math.random() < 0.85 ? tierConfigOrBase : tierConfigOrBase * 2;
    } else {
      val = Math.random() < 0.85 ? 2 : 4;
    }

    return this.spawnEquipment(val, cell);
  }

  // Spawns a dedicated Gold Tile at empty space or target
  spawnGold(value = 2, pos = null) {
    let target = pos;
    if (!target) {
      const empty = this.board.getEmptyCells();
      if (empty.length === 0) return null;
      target = empty[Math.floor(Math.random() * empty.length)];
    }
    const tile = new Tile(value, TileType.GOLD, target.r, target.c);
    this.board.setTile(target.r, target.c, tile);
    return tile;
  }
}
