// ViewRenderer.js: 5x5 Portrait Board DOM Renderer for Commercial Edition

import { getTileTheme, TileType } from '../core/Constants.js';

export class ViewRenderer {
  constructor(boardElement) {
    this.boardElement = boardElement;
    this.activeSkin = 'kingdom';
  }

  setThemeSkin(skin) {
    this.activeSkin = skin || 'kingdom';
  }

  renderBoard(board) {
    if (!this.boardElement) return;
    this.boardElement.innerHTML = '';

    const size = board.size;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;

        const tile = board.getTile(r, c);
        if (tile) {
          const tileEl = this.createTileElement(tile);
          cell.appendChild(tileEl);
        }

        this.boardElement.appendChild(cell);
      }
    }
  }

  createTileElement(tile) {
    const el = document.createElement('div');
    el.className = `tile tile-${tile.type.toLowerCase()} skin-${this.activeSkin}`;
    el.dataset.id = tile.id;
    el.dataset.value = tile.value;

    const theme = getTileTheme(tile.type, tile.value, this.activeSkin);

    if (theme) {
      el.style.backgroundColor = theme.bg;
      el.style.color = theme.text;
      el.style.borderColor = theme.border;
    }

    // Badge icon
    const badgeSpan = document.createElement('div');
    badgeSpan.className = 'tile-badge';
    badgeSpan.textContent = theme ? theme.badge : '';

    // Value text
    const valueSpan = document.createElement('div');
    valueSpan.className = 'tile-value';
    if (tile.value >= 10000) {
      valueSpan.classList.add('tile-value-compact');
    }
    valueSpan.textContent = tile.value;

    // Subtitle name (small, hidden in icon_focus)
    const nameSpan = document.createElement('div');
    nameSpan.className = 'tile-name';
    nameSpan.textContent = theme ? theme.name : '';

    el.appendChild(badgeSpan);
    el.appendChild(valueSpan);
    el.appendChild(nameSpan);

    if (tile.isMonster() && tile.splitOnDeath) {
      el.classList.add('tile-splitter');
      const splitIndicator = document.createElement('div');
      splitIndicator.className = 'tile-split-indicator';
      splitIndicator.textContent = '🦠分裂';
      el.appendChild(splitIndicator);
    }

    return el;
  }

  // ==========================================
  // C-STORY-012: 0.3s SMOOTH SLIDING DISPLACEMENT
  // ==========================================
  animateSlide(moves, onComplete) {
    if (!this.boardElement || !moves || moves.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    let hasAnyDisplacement = false;

    moves.forEach(m => {
      if (m.from.r === m.to.r && m.from.c === m.to.c) {
        return; // tile did not move
      }

      const fromCell = this.boardElement.querySelector(`.grid-cell[data-r="${m.from.r}"][data-c="${m.from.c}"]`);
      const toCell = this.boardElement.querySelector(`.grid-cell[data-r="${m.to.r}"][data-c="${m.to.c}"]`);

      if (!fromCell || !toCell) return;

      const tileEl = fromCell.querySelector('.tile');
      if (!tileEl) return;

      const fromRect = fromCell.getBoundingClientRect();
      const toRect = toCell.getBoundingClientRect();
      const dx = toRect.left - fromRect.left;
      const dy = toRect.top - fromRect.top;

      if (dx !== 0 || dy !== 0) {
        hasAnyDisplacement = true;
        tileEl.classList.add('tile-sliding');
        tileEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
    });

    if (!hasAnyDisplacement) {
      if (onComplete) onComplete();
      return;
    }

    // 0.12s (120ms) swift slide duration (C-STORY-013)
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 120);
  }

  // ==========================================
  // C-STORY-012: SPECIALIZED COMBAT & FUSION VFX
  // ==========================================
  playVfx(vfxEvents) {
    if (!this.boardElement || !vfxEvents || vfxEvents.length === 0) return;

    vfxEvents.forEach(evt => {
      const cell = this.boardElement.querySelector(`.grid-cell[data-r="${evt.r}"][data-c="${evt.c}"]`);
      if (!cell) return;

      let vfxEl = null;
      let duration = 400;

      if (evt.type === 'hero_slash_monster') {
        // Sharp silver-white slash cut
        vfxEl = document.createElement('div');
        vfxEl.className = 'vfx-slash-blade';
        duration = 380;
      } else if (evt.type === 'hero_eat_gear') {
        // 5-Tier dynamic scaled golden flare (C-STORY-014)
        vfxEl = document.createElement('div');
        const val = evt.value || 2;
        let tier = 1;
        if (val <= 8) tier = 1;
        else if (val <= 32) tier = 2;
        else if (val <= 128) tier = 3;
        else if (val <= 512) tier = 4;
        else tier = 5;

        vfxEl.className = `vfx-hero-upgrade tier-${tier}`;
        duration = 450;
      } else if (evt.type === 'monster_fusion') {
        // Red-black demonic flame burst
        vfxEl = document.createElement('div');
        vfxEl.className = 'vfx-monster-upgrade';
        duration = 460;
      } else if (evt.type === 'gold_merge') {
        // Super Mario Style Coin Pop VFX (C-STORY-014)
        vfxEl = document.createElement('div');
        vfxEl.className = 'vfx-mario-coin';

        const coinIcon = document.createElement('div');
        coinIcon.className = 'vfx-mario-coin-icon';
        coinIcon.textContent = '🪙';

        const coinText = document.createElement('div');
        coinText.className = 'vfx-mario-coin-text';
        coinText.textContent = `+${evt.value || ''} 🪙`;

        vfxEl.appendChild(coinIcon);
        vfxEl.appendChild(coinText);
        duration = 480;
      }

      if (vfxEl) {
        cell.appendChild(vfxEl);
        setTimeout(() => {
          if (vfxEl && vfxEl.parentNode) {
            vfxEl.parentNode.removeChild(vfxEl);
          }
        }, duration);
      }
    });
  }
}
