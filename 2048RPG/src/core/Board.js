// Board.js: 5x5 Grid Data Structure for Commercial Edition

import { BOARD_SIZE, TileType } from './Constants.js';

export class Board {
  constructor(size = BOARD_SIZE) {
    this.size = size;
    this.grid = this.createEmptyGrid();
  }

  createEmptyGrid() {
    const grid = [];
    for (let r = 0; r < this.size; r++) {
      grid[r] = [];
      for (let c = 0; c < this.size; c++) {
        grid[r][c] = null;
      }
    }
    return grid;
  }

  clear() {
    this.grid = this.createEmptyGrid();
  }

  inBounds(r, c) {
    return r >= 0 && r < this.size && c >= 0 && c < this.size;
  }

  getTile(r, c) {
    if (!this.inBounds(r, c)) return null;
    return this.grid[r][c];
  }

  setTile(r, c, tile) {
    if (!this.inBounds(r, c)) return;
    this.grid[r][c] = tile;
    if (tile) {
      tile.r = r;
      tile.c = c;
    }
  }

  removeTile(r, c) {
    if (!this.inBounds(r, c)) return null;
    const removed = this.grid[r][c];
    this.grid[r][c] = null;
    return removed;
  }

  getEmptyCells() {
    const empty = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === null) {
          empty.push({ r, c });
        }
      }
    }
    return empty;
  }

  isFull() {
    return this.getEmptyCells().length === 0;
  }

  getAllTiles() {
    const tiles = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] !== null) {
          tiles.push(this.grid[r][c]);
        }
      }
    }
    return tiles;
  }

  getHero() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const tile = this.grid[r][c];
        if (tile && tile.isHero()) {
          return tile;
        }
      }
    }
    return null;
  }

  getMonsters() {
    return this.getAllTiles().filter(t => t.isMonster());
  }

  getEquipments() {
    return this.getAllTiles().filter(t => t.isEquipment());
  }

  clone() {
    const newBoard = new Board(this.size);
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const t = this.grid[r][c];
        if (t) {
          newBoard.setTile(r, c, t.clone());
        }
      }
    }
    return newBoard;
  }
}
