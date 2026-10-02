// Tile.js: Entity representation of a game block on the 5x5 board

import { TileType } from './Constants.js';

let nextTileId = 1;

export class Tile {
  constructor(value, type, r = 0, c = 0, extra = {}) {
    this.id = nextTileId++;
    this.value = Number(value);
    this.type = type;
    this.r = r;
    this.c = c;
    this.mergedFrom = null; // References for merge animations
    this.splitOnDeath = !!extra.splitOnDeath;
    this.splitValue = extra.splitValue || (this.value >= 32 ? Math.floor(this.value / 4) : 16);
    this.splitCount = extra.splitCount || 2;
  }

  isHero() {
    return this.type === TileType.HERO;
  }

  isMonster() {
    return this.type === TileType.MONSTER;
  }

  isEquipment() {
    return this.type === TileType.EQUIPMENT;
  }

  isGold() {
    return this.type === TileType.GOLD;
  }

  clone() {
    const copy = new Tile(this.value, this.type, this.r, this.c, {
      splitOnDeath: this.splitOnDeath,
      splitValue: this.splitValue,
      splitCount: this.splitCount
    });
    copy.id = this.id;
    return copy;
  }
}
