import { getTileTheme, TileType, getEquipmentImagePath, getHeroImagePath, getMonsterImagePath, getMonsterThemeByChapter } from '../core/Constants.js';
 
export class ViewRenderer {
  constructor(boardElement) {
    this.boardElement = boardElement;
    this.activeSkin = 'kingdom';
    this.activeIconStyle = 'style_e_clay';
    this.activeLayout = 'layout_modern_pure';
    this.activeHeroClass = 'knight';
    this.activeChapterId = undefined;
  }

  setThemeSkin(skin) {
    this.activeSkin = skin || 'kingdom';
  }

  setIconStyle(style) {
    this.activeIconStyle = style || 'style_e_clay';
  }

  setTileLayout(layout) {
    this.activeLayout = layout || 'layout_modern_pure';
  }

  setHeroClass(heroClass) {
    this.activeHeroClass = heroClass || 'knight';
  }

  setChapterId(chapterId) {
    this.activeChapterId = chapterId;
  }

  renderBoard(board) {
    if (!this.boardElement) return;
    this.boardElement.innerHTML = '';
    this.boardElement.className = `board-grid theme-${this.activeSkin} ${this.activeLayout}`;

    // C-STORY-038: Danger Flash on Board when 1 cell or 0 cells remain
    if (board && typeof board.getEmptyCells === 'function') {
      const emptyCount = board.getEmptyCells().length;
      if (emptyCount <= 1) {
        this.boardElement.classList.add('board-danger-flash');
      } else {
        this.boardElement.classList.remove('board-danger-flash');
      }
    }

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
    el.className = `tile tile-${tile.type.toLowerCase()} skin-${this.activeSkin} theme-${this.activeSkin} ${this.activeLayout}`;
    el.dataset.id = tile.id;
    el.dataset.value = tile.value;

    let theme = getTileTheme(tile.type, tile.value, this.activeSkin);
    if (tile.isMonster()) {
      const chTheme = getMonsterThemeByChapter(this.activeChapterId, tile.value);
      if (chTheme) {
        theme = { ...theme, ...chTheme };
      }
    }

    if (theme) {
      el.style.backgroundColor = theme.bg;
      el.style.color = theme.text;
      // Let dedicated CSS handle hero and monster outlines (C-STORY-038)
      if (!tile.isHero() && !tile.isMonster()) {
        el.style.borderColor = theme.border;
      }
    }

    // Badge icon layer (C-STORY-042: Image vs Emoji Decoupling & C-STORY-047: Hero Sprite)
    const badgeSpan = document.createElement('div');
    badgeSpan.className = 'tile-badge';

    let tileImgPath = null;
    let imgAlt = 'tile';

    if (tile.isEquipment()) {
      tileImgPath = getEquipmentImagePath(tile.value, this.activeIconStyle);
      imgAlt = theme ? theme.name : 'equip';
    } else if (tile.isHero()) {
      tileImgPath = getHeroImagePath(tile.value, this.activeIconStyle, this.activeHeroClass || 'knight');
      imgAlt = theme ? theme.name : 'hero';
    } else if (tile.isMonster()) {
      tileImgPath = getMonsterImagePath(this.activeChapterId, tile.value, this.activeIconStyle);
      imgAlt = theme ? theme.name : 'monster';
    }

    if (tileImgPath) {
      badgeSpan.classList.add('has-tile-img');
      const img = document.createElement('img');
      img.className = 'tile-icon-img';
      img.src = tileImgPath;
      img.alt = imgAlt;
      // Fallback to text emoji if image fails to load
      img.onerror = () => {
        img.remove();
        badgeSpan.classList.remove('has-tile-img');
        badgeSpan.textContent = theme ? theme.badge : '';
      };
      badgeSpan.appendChild(img);
    } else {
      badgeSpan.textContent = theme ? theme.badge : '';
    }

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

  // C-STORY-038: Tactile Shake Feedback on Invalid Direction Move
  triggerInvalidMoveShake(direction) {
    if (!this.boardElement) return;
    const isVertical = direction === 'UP' || direction === 'DOWN';
    const shakeClass = isVertical ? 'tile-shake-v' : 'tile-shake-h';

    const tiles = this.boardElement.querySelectorAll('.tile');
    tiles.forEach(tile => {
      tile.classList.remove('tile-shake-h', 'tile-shake-v');
      // Force reflow so animation restarts cleanly on rapid inputs
      void tile.offsetWidth;
      tile.classList.add(shakeClass);
    });

    if (this._invalidShakeTimer) {
      clearTimeout(this._invalidShakeTimer);
    }
    this._invalidShakeTimer = setTimeout(() => {
      tiles.forEach(tile => {
        tile.classList.remove('tile-shake-h', 'tile-shake-v');
      });
      this._invalidShakeTimer = null;
    }, 250);
  }
}
