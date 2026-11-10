// proto_ui_logic.js: Real Metagame UI Logic & Event Handlers (C-STORY-139 / C-STORY-140)

(function(window) {
  'use strict';

  // ----------------------------------------------------
  // I18N DICTIONARY
  // ----------------------------------------------------
  const I18N_DICT = {
    'zh-TW': {
      nav_shop: '商店', nav_camp: '軍備', nav_adventure: '冒險', nav_gear: '裝備', nav_compendium: '圖鑑',
      btn_deploy: '⚔️ 出擊！', btn_stage_deploy: '⚔️ 出擊',
      stage_minions_title: '登場魔物', stage_gears_title: '物資', stage_first_gold_title: '初次通關獎勵：'
    },
    'zh-CN': {
      nav_shop: '商店', nav_camp: '军备', nav_adventure: '冒险', nav_gear: '装备', nav_compendium: '图鉴',
      btn_deploy: '⚔️ 出击！', btn_stage_deploy: '⚔️ 出击',
      stage_minions_title: '其他魔物：', stage_gears_title: '场景资源：', stage_first_gold_title: '🪙 初次通关奖励：'
    },
    'en': {
      nav_shop: 'Shop', nav_camp: 'Camp', nav_adventure: 'Adventure', nav_gear: 'Gear', nav_compendium: 'Index',
      btn_deploy: '⚔️ Battle!', btn_stage_deploy: '⚔️ Battle',
      stage_minions_title: 'Other Monsters:', stage_gears_title: 'Resources:', stage_first_gold_title: '🪙 First Clear Gold:'
    },
    'ja': {
      nav_shop: 'ショップ', nav_camp: '軍備', nav_adventure: '冒険', nav_gear: '装備', nav_compendium: '図鑑',
      btn_deploy: '⚔️ 出撃！', btn_stage_deploy: '⚔️ 出撃',
      stage_minions_title: '他の魔物：', stage_gears_title: 'マップ資源：', stage_first_gold_title: '🪙 初クリア報酬：'
    }
  };

  let currentLang = localStorage.getItem('rpg_2048_lang') || 'zh-TW';

  function t(key, fallback = '') {
    const dict = I18N_DICT[currentLang] || I18N_DICT['zh-TW'];
    return dict[key] || fallback || key;
  }

  function setLanguage(lang) {
    if (!I18N_DICT[lang]) return;
    currentLang = lang;
    localStorage.setItem('rpg_2048_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (k && t(k)) el.textContent = t(k);
    });
  }

  // ----------------------------------------------------
  // REAL APP STATE & CACHE
  // ----------------------------------------------------
  window.currentSelectedStage = undefined;
  window.currentHeroModalKey = 'warrior';
  window.currentCompTab = 'monsters';

  // Helper functions for Clay Art Assets
  function getEquipImg(val) {
    const v = Number(val) || 2;
    const tier = Math.max(1, Math.min(16, Math.round(Math.log2(v))));
    const pad = String(tier).padStart(2, '0');
    return `assets/images/equipment_clay/equip_${pad}.png`;
  }

  function getMonsterImg(val, ch = 1) {
    const v = Number(val) || 2;
    const c = Math.max(1, Math.min(3, Number(ch) || 1));
    const padVal = String(v).padStart(2, '0');
    const padCh = String(c).padStart(2, '0');
    return `assets/images/monsters_clay/monster_ch${padCh}_${padVal}.png`;
  }


  // ----------------------------------------------------
  // NAVIGATION & TAB SWITCHING
  // ----------------------------------------------------
  function switchMainTab(tabId) {
    document.querySelectorAll('.coin-spend-vfx-container').forEach(el => el.remove());
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`view-${tabId}`);
    if (view) view.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    const tabMap = { 'shop': 0, 'camp': 1, 'adventure': 2, 'gear': 3, 'compendium': 4 };
    const idx = tabMap[tabId];
    if (idx !== undefined && navItems[idx]) {
      navItems[idx].classList.add('active');
    }

    if (window.appRouter && window.appRouter.audio) {
      window.appRouter.audio.playClick();
    }

    if (tabId === 'shop') syncShopDisplay();
    if (tabId === 'adventure') renderAdventureStage();
    if (tabId === 'gear') {
      renderGearInventory();
      renderHeroCards();
    }
    if (tabId === 'camp') renderCampUpgrades();
    if (tabId === 'compendium') renderCompendiumView();
  }

  function switchGearSubTab(tab) {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));

    const btn = document.getElementById(`btn-sub-${tab}`);
    const view = document.getElementById(`subview-${tab}`);
    if (btn) btn.classList.add('active');
    if (view) view.classList.add('active');

    if (tab === 'gear') renderGearInventory();
    if (tab === 'hero') renderHeroCards();
  }

  // ----------------------------------------------------
  // ADVENTURE & STAGE NAVIGATION
  // ----------------------------------------------------
  function getMaxUnlocked() {
    if (!window.appRouter || !window.appRouter.stageManager) return 1;
    return window.appRouter.stageManager.unlockedStageId || window.appRouter.stageManager.maxUnlockedStage || 1;
  }

  function isTutorialCompleted() {
    if (!window.appRouter || !window.appRouter.stageManager || !window.appRouter.stageManager.tutorialManager) return true;
    return window.appRouter.stageManager.tutorialManager.isCompleted;
  }

  function getStageConfigById(stageId) {
    if (stageId === 0) {
      return (window.appRouter && window.appRouter.STAGE_0_CONFIG) ? window.appRouter.STAGE_0_CONFIG : {
        id: 0, chapter: 0, name: '第 0 關：王國勇者試煉 (教學)', subtitle: '皇家訓練營',
        desc: '皇家騎士團教官親授！學習裝備合成、魔物討伐、金幣兌現與戰力法則！',
        recPower: 2, recTechTier: 1, rewardGold: 50, monsters: [4, 8], starterEquipment: [2, 2], icon: '🎓'
      };
    }
    const configs = (window.appRouter && window.appRouter.STAGE_CONFIGS) ? window.appRouter.STAGE_CONFIGS : [];
    return configs.find(s => s.id === stageId) || null;
  }

  function getMonsterThemeInfo(chapterId, val) {
    if (window.appRouter && typeof window.appRouter.getMonsterThemeByChapter === 'function') {
      return window.appRouter.getMonsterThemeByChapter(chapterId, val);
    }
    return { name: '魔物', badge: '👾', bg: '#4c0519', text: '#fecdd3', border: '#e11d48' };
  }

  function getEquipThemeInfo(val) {
    if (window.appRouter && window.appRouter.EQUIPMENT_THEMES && window.appRouter.EQUIPMENT_THEMES[val]) {
      return window.appRouter.EQUIPMENT_THEMES[val];
    }
    return { name: '裝備', badge: '⚔️', bg: '#78350f', text: '#fef3c7', border: '#b45309' };
  }

  function createCombatStyleTileCard(type, val, chapterId, isBoss = false) {
    const cell = document.createElement('div');
    cell.className = 'stage-detail-tile-cell mini-stage-card';

    const activeSkin = (window.appRouter && window.appRouter.activeThemeSkin) ? window.appRouter.activeThemeSkin : 'kingdom';
    const activeIconStyle = (window.appRouter && window.appRouter.activeIconStyle) ? window.appRouter.activeIconStyle : 'style_e_clay';

    const tileEl = document.createElement('div');
    const isMonster = (type === 'monster');
    tileEl.className = `tile tile-${isMonster ? 'monster' : 'equipment'} skin-${activeSkin} theme-${activeSkin} layout_modern_pure`;
    tileEl.dataset.value = val;

    let theme = null;
    if (window.appRouter && typeof window.appRouter.getTileTheme === 'function') {
      theme = window.appRouter.getTileTheme(isMonster ? 'MONSTER' : 'EQUIPMENT', val, activeSkin);
    }
    if (isMonster) {
      const chTheme = getMonsterThemeInfo(chapterId, val);
      theme = { ...(theme || {}), ...(chTheme || {}) };
    } else if (!theme) {
      theme = getEquipThemeInfo(val);
    }

    if (theme) {
      if (theme.bg) tileEl.style.backgroundColor = theme.bg;
      if (theme.text) tileEl.style.color = theme.text;
      if (!isMonster && theme.border) {
        tileEl.style.borderColor = theme.border;
      }
    }

    if (isBoss) {
      const bossRibbon = document.createElement('div');
      bossRibbon.className = 'tile-boss-ribbon';
      bossRibbon.textContent = 'Boss';
      cell.appendChild(bossRibbon);
    }

    const badgeSpan = document.createElement('div');
    badgeSpan.className = 'tile-badge';

    let imgPath = null;
    if (isMonster) {
      imgPath = (window.appRouter && typeof window.appRouter.getMonsterImagePath === 'function')
        ? window.appRouter.getMonsterImagePath(chapterId, val, activeIconStyle)
        : getMonsterImg(val, chapterId);
    } else {
      imgPath = (window.appRouter && typeof window.appRouter.getEquipmentImagePath === 'function')
        ? window.appRouter.getEquipmentImagePath(val, activeIconStyle)
        : getEquipImg(val);
    }

    if (imgPath) {
      badgeSpan.classList.add('has-tile-img');
      const img = document.createElement('img');
      img.className = 'tile-icon-img';
      img.src = imgPath;
      img.alt = String(val);
      img.onerror = () => {
        img.remove();
        badgeSpan.classList.remove('has-tile-img');
        badgeSpan.textContent = (theme && theme.badge) ? theme.badge : (isMonster ? '👾' : '⚔️');
      };
      badgeSpan.appendChild(img);
    } else {
      badgeSpan.textContent = (theme && theme.badge) ? theme.badge : (isMonster ? '👾' : '⚔️');
    }

    const valueSpan = document.createElement('div');
    valueSpan.className = 'tile-value mini-card-badge';
    if (val >= 10000) {
      valueSpan.classList.add('tile-value-compact');
    }
    valueSpan.textContent = val;

    tileEl.appendChild(badgeSpan);
    tileEl.appendChild(valueSpan);
    cell.appendChild(tileEl);
    return cell;
  }

  function changeStageByStep(step) {
    const maxU = getMaxUnlocked();
    const nextStage = (window.currentSelectedStage !== undefined ? window.currentSelectedStage : 1) + step;
    if (nextStage >= 0 && nextStage <= maxU) {
      window.currentSelectedStage = nextStage;
      renderAdventureStage(nextStage);
    } else if (nextStage > maxU) {
      alert(`🔒 第 ${nextStage} 關尚未解鎖，請先通關前面的關卡！`);
    }
  }

  function renderAdventureStage(stageId) {
    const maxU = getMaxUnlocked();
    const tutDone = isTutorialCompleted();

    if (stageId !== undefined) {
      window.currentSelectedStage = stageId;
    } else if (!tutDone) {
      window.currentSelectedStage = 0; // Default to Tutorial if not completed
    } else if (window.currentSelectedStage === undefined) {
      window.currentSelectedStage = maxU || 1;
    }

    const cur = window.currentSelectedStage;
    const hubStageNum = document.getElementById('hub-stage-num');
    const hubChapTag = document.getElementById('hub-chap-tag');
    const arenaBossImg = document.getElementById('arena-boss-img');
    const arenaBossName = document.getElementById('arena-boss-name');
    const briefRecPower = document.getElementById('brief-rec-power');
    const briefFirstGold = document.getElementById('brief-first-gold');
    const btnPrev = document.getElementById('btn-stage-prev');
    const btnNext = document.getElementById('btn-stage-next');

    const cfg = getStageConfigById(cur);
    const isCleared = (cur === 0)
      ? tutDone
      : !!(window.appRouter && window.appRouter.stageManager && window.appRouter.stageManager.clearedStages && window.appRouter.stageManager.clearedStages[cur]);

    if (cur === 0) {
      if (hubStageNum) hubStageNum.textContent = '序章 (教學)';
      if (hubChapTag) hubChapTag.textContent = '序章 · 新手訓練所';
      if (arenaBossImg) {
        arenaBossImg.src = 'assets/images/monsters_clay/monster_ch01_08.png';
        arenaBossImg.onerror = () => { arenaBossImg.src = 'assets/images/monsters_clay/monster_ch01_04.png'; };
      }
      if (arenaBossName) arenaBossName.textContent = '首領：哥布林首領 (8)';
      if (briefRecPower) briefRecPower.textContent = '2 裝備';
      if (briefFirstGold) {
        briefFirstGold.textContent = isCleared ? '已領取' : '🪙 50';
        briefFirstGold.style.color = isCleared ? '#64748b' : '#fbbf24';
      }
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = (maxU < 1 && !tutDone);

      document.querySelectorAll('.stage-node-item').forEach(node => {
        node.classList.remove('current');
      });
      return;
    }

    if (hubStageNum) hubStageNum.textContent = `Stage ${cur}`;
    if (hubChapTag) {
      const ch = cfg ? (cfg.chapter || 1) : 1;
      const chConfigs = (window.appRouter && window.appRouter.CHAPTER_CONFIGS) ? window.appRouter.CHAPTER_CONFIGS : [];
      const chObj = chConfigs.find(c => c.id === ch);
      const chTitle = chObj ? chObj.name.replace('：', ' · ') : `第 ${ch} 章`;
      hubChapTag.textContent = chTitle;
    }

    if (cfg) {
      const ch = cfg.chapter || 1;
      const rawMonsters = Array.isArray(cfg.monsters) ? cfg.monsters : [8];
      const bossEntry = rawMonsters[0];
      const bossVal = (typeof bossEntry === 'object' && bossEntry !== null) ? bossEntry.value : (bossEntry || 8);
      const bossTheme = getMonsterThemeInfo(ch, bossVal);
      const activeIconStyle = (window.appRouter && window.appRouter.activeIconStyle) ? window.appRouter.activeIconStyle : 'style_e_clay';

      if (arenaBossImg) {
        const imgPath = (window.appRouter && typeof window.appRouter.getMonsterImagePath === 'function')
          ? window.appRouter.getMonsterImagePath(ch, bossVal, activeIconStyle)
          : getMonsterImg(bossVal, ch);
        arenaBossImg.src = imgPath || getMonsterImg(bossVal, ch);
        arenaBossImg.onerror = () => { arenaBossImg.src = 'assets/images/monsters_clay/monster_ch01_08.png'; };
      }
      if (arenaBossName) {
        arenaBossName.textContent = `首領：${bossTheme.name || '魔物'} (${bossVal})`;
      }
      if (briefRecPower) {
        briefRecPower.textContent = `${cfg.recPower || 2} 裝備`;
      }
      if (briefFirstGold) {
        const rGold = Number(cfg.rewardGold || 100).toLocaleString();
        briefFirstGold.textContent = isCleared ? '已領取' : `🪙 ${rGold}`;
        briefFirstGold.style.color = isCleared ? '#64748b' : '#fbbf24';
      }
    }

    if (btnPrev) btnPrev.disabled = (cur <= 0);
    if (btnNext) btnNext.disabled = (cur >= maxU);
    syncDailyRedDots();

    // Update active node styling in any visible stage nodes
    document.querySelectorAll('.stage-node-item').forEach(node => {
      const s = parseInt(node.querySelector('.stage-node-num')?.textContent, 10);
      node.classList.remove('current');
      if (s === cur) node.classList.add('current');
    });
  }

  function openStageDetailModal(stageId) {
    const tutDone = isTutorialCompleted();
    const sId = stageId !== undefined ? stageId : (window.currentSelectedStage !== undefined ? window.currentSelectedStage : (tutDone ? 1 : 0));
    window.currentSelectedStage = sId;

    const modal = document.getElementById('modal-stage-detail');
    if (!modal) return;

    const cfg = getStageConfigById(sId);
    if (!cfg) return;

    const isCleared = (sId === 0)
      ? tutDone
      : !!(window.appRouter && window.appRouter.stageManager && window.appRouter.stageManager.clearedStages && window.appRouter.stageManager.clearedStages[sId]);

    const titleEl = document.getElementById('modal-stage-title');
    const objectiveEl = document.getElementById('modal-stage-objective');
    const goldRewardEl = document.getElementById('modal-gold-reward');
    const forgeLevelEl = document.getElementById('modal-forge-level');
    const recEquipEl = document.getElementById('modal-rec-equip');
    const gearsList = document.getElementById('modal-stage-gears');
    const minionsList = document.getElementById('modal-minions-list');

    if (titleEl) titleEl.textContent = cfg.name || `第 ${sId} 關`;
    if (objectiveEl) objectiveEl.textContent = cfg.desc || '作戰目標：消滅盤面所有魔物';

    // (第一區) 初次通關獎勵 / 建議鐵匠鋪等級 / 建議裝備
    const rGold = Number(cfg.rewardGold || (sId === 0 ? 50 : 100)).toLocaleString();
    if (goldRewardEl) {
      goldRewardEl.textContent = isCleared ? '已領取' : `${rGold} 金幣`;
      goldRewardEl.style.color = isCleared ? '#64748b' : '#fbbf24';
    }
    const techTier = cfg.recTechTier || 1;
    if (forgeLevelEl) {
      forgeLevelEl.textContent = `LV.${techTier}`;
    }
    const recPower = cfg.recPower || 2;
    if (recEquipEl) {
      recEquipEl.textContent = `${recPower}`;
    }

    const ch = cfg.chapter || (sId === 0 ? 1 : 1);

    // (第二區) 物資 (starterEquipment - 4 per row, 1:1 combat board tile size & baseplate)
    if (gearsList) {
      gearsList.innerHTML = '';
      const gears = Array.isArray(cfg.starterEquipment) ? cfg.starterEquipment : [2, 2];
      gears.forEach(g => {
        const gVal = (typeof g === 'object' && g !== null) ? g.value : g;
        const card = createCombatStyleTileCard('equipment', gVal, ch, false);
        gearsList.appendChild(card);
      });
    }

    // (第三區) 登場魔物 (ALL monsters in cfg.monsters - 4 per row, 1:1 combat board tile size & baseplate, Boss badged)
    if (minionsList) {
      minionsList.innerHTML = '';
      const rawMonsters = Array.isArray(cfg.monsters) ? cfg.monsters : [8];
      const monsters = [...rawMonsters].sort((a, b) => {
        const va = (typeof a === 'object' && a !== null) ? a.value : a;
        const vb = (typeof b === 'object' && b !== null) ? b.value : b;
        return vb - va;
      });
      let maxVal = -1;
      monsters.forEach(m => {
        const v = (typeof m === 'object' && m !== null) ? m.value : m;
        if (v > maxVal) maxVal = v;
      });
      let bossMarked = false;
      monsters.forEach((m, idx) => {
        const mVal = (typeof m === 'object' && m !== null) ? m.value : m;
        const isBoss = (!bossMarked && (mVal === maxVal || idx === 0));
        if (isBoss) bossMarked = true;
        const card = createCombatStyleTileCard('monster', mVal, ch, isBoss);
        minionsList.appendChild(card);
      });
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
  }

  function closeStageDetailModal() {
    const modal = document.getElementById('modal-stage-detail');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function launchStageBattle() {
    closeStageDetailModal();
    if (window.appRouter) {
      const tutDone = isTutorialCompleted();
      const targetStage = window.currentSelectedStage !== undefined ? window.currentSelectedStage : (tutDone ? 1 : 0);
      window.appRouter.startCombat(targetStage);
    }
  }

  // ----------------------------------------------------
  // QUICK STAGE DRAWER (ALL 350 STAGES + PROLOGUE)
  // ----------------------------------------------------
  function openQuickStageDrawer() {
    const drawer = document.getElementById('drawer-quick-stage');
    const grid = document.getElementById('quick-stage-grid');
    if (!drawer || !grid) return;

    const maxU = getMaxUnlocked();
    const tutDone = isTutorialCompleted();
    grid.innerHTML = '';

    const chConfigs = (window.appRouter && window.appRouter.CHAPTER_CONFIGS) ? window.appRouter.CHAPTER_CONFIGS : [
      { id: 0, name: '序章：新手訓練所', range: [0, 0], icon: '🎓' },
      { id: 1, name: '第 I 章：微風之境', range: [1, 5], icon: '🌾' },
      { id: 2, name: '第 II 章：灼熱熔岩', range: [6, 20], icon: '🔥' },
      { id: 3, name: '第 III 章：孤峰岩地', range: [21, 50], icon: '⛰️' },
      { id: 4, name: '第 IV 章：蛛魔荒漠', range: [51, 90], icon: '🏜️' },
      { id: 5, name: '第 V 章：遠古地宮', range: [91, 150], icon: '🏛️' },
      { id: 6, name: '第 VI 章：滅世黑曜', range: [151, 220], icon: '🌋' },
      { id: 7, name: '第 VII 章：神魔深淵', range: [221, 280], icon: '🌌' },
      { id: 8, name: '第 VIII 章：終焉神域', range: [281, 350], icon: '👑' }
    ];

    let activeNodeEl = null;

    chConfigs.forEach(ch => {
      const header = document.createElement('div');
      header.className = 'quick-chapter-header';
      const rangeStr = ch.id === 0 ? 'Stage 0' : `Stage ${ch.range[0]} ~ ${ch.range[1]}`;
      header.textContent = `${ch.icon || '⚔️'} ${ch.name} (${rangeStr})`;
      grid.appendChild(header);

      if (ch.id === 0) {
        const tutNode = document.createElement('div');
        const isTutCur = (window.currentSelectedStage === 0);
        tutNode.className = `quick-stage-node ${isTutCur ? 'active' : ''}`;
        tutNode.dataset.stageId = '0';
        tutNode.style.cssText = `grid-column: span 2; padding: 10px; border-radius: 8px; text-align: center; cursor: pointer; font-weight: 700; ${
          isTutCur ? 'background: #3b82f6; color: #fff; border: 2px solid #60a5fa;' :
          'background: #1e293b; color: #fbbf24; border: 1px solid #f59e0b;'
        }`;
        tutNode.innerHTML = '🎓 序章 (教學)';
        tutNode.onclick = () => {
          window.currentSelectedStage = 0;
          renderAdventureStage(0);
          closeQuickStageDrawer();
        };
        grid.appendChild(tutNode);
        if (isTutCur) activeNodeEl = tutNode;
        return;
      }

      for (let s = ch.range[0]; s <= ch.range[1]; s++) {
        const isUnlocked = (s <= maxU) && tutDone;
        const isCurrent = (s === window.currentSelectedStage);
        const isCleared = !!(window.appRouter && window.appRouter.stageManager && window.appRouter.stageManager.clearedStages && window.appRouter.stageManager.clearedStages[s]);
        const btn = document.createElement('div');
        btn.className = `quick-stage-node ${isCurrent ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
        btn.dataset.stageId = String(s);
        btn.style.cssText = `padding: 8px 4px; border-radius: 8px; text-align: center; cursor: ${isUnlocked ? 'pointer' : 'not-allowed'}; font-weight: 700; font-size: 0.78rem; ${
          isCurrent ? 'background: #3b82f6; color: #fff; border: 2px solid #60a5fa;' :
          isCleared ? 'background: #064e3b; color: #6ee7b7; border: 1px solid #10b981;' :
          isUnlocked ? 'background: #1e293b; color: #f8fafc; border: 1px solid #334155;' :
          'background: #0f172a; color: #475569; border: 1px solid #1e293b;'
        }`;
        btn.innerHTML = `${isUnlocked ? `${isCleared ? '★ ' : ''}${s}` : `🔒 ${s}`}`;
        if (isUnlocked) {
          btn.onclick = () => {
            window.currentSelectedStage = s;
            renderAdventureStage(s);
            closeQuickStageDrawer();
          };
        }
        grid.appendChild(btn);
        if (isCurrent) activeNodeEl = btn;
      }
    });

    drawer.classList.add('active');
    drawer.style.display = 'flex';

    if (activeNodeEl && typeof activeNodeEl.scrollIntoView === 'function') {
      setTimeout(() => {
        activeNodeEl.scrollIntoView({ behavior: 'instant', block: 'center' });
      }, 50);
    }
  }

  function closeQuickStageDrawer() {
    const drawer = document.getElementById('drawer-quick-stage');
    if (drawer) {
      drawer.classList.remove('active');
      drawer.style.display = 'none';
    }
  }

  // ----------------------------------------------------
  // DAILY SIGN-IN & QUESTS
  // ----------------------------------------------------
  function openDailySignInModal() {
    const modal = document.getElementById('modal-daily-signin');
    if (modal) {
      renderSignInStatus();
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
  }

  function closeDailySignInModal() {
    const modal = document.getElementById('modal-daily-signin');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function handleSignInOverlayClick(e) {
    if (e && e.target && e.target.id === 'modal-daily-signin') {
      closeDailySignInModal();
    }
  }

  function syncDailyRedDots() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    const signInDot = document.querySelector('[onclick="openDailySignInModal()"] .hud-badge-dot');
    if (signInDot) {
      signInDot.style.display = dlm.hasSignInPending() ? 'block' : 'none';
    }
    const questsDot = document.querySelector('[onclick="openDailyQuestsModal()"] .hud-badge-dot');
    if (questsDot) {
      questsDot.style.display = (typeof dlm.hasQuestPending === 'function' && dlm.hasQuestPending()) ? 'block' : 'none';
    }
  }

  function renderSignInStatus() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    const btn = document.getElementById('btn-claim-signin');
    const container = document.getElementById('signin-cards-container');

    const curDay = dlm.state.signInDay || 1;
    const isClaimedToday = !!dlm.state.signInClaimedToday;

    if (container) {
      const SIGNIN_ICONS = ['🪙', '⚔️', '🪙', '🛡️', '🪙', '👑', '💎'];
      const rawConfigs = (window.appRouter && window.appRouter.DAILY_SIGNIN_REWARDS) || [
        { day: 1, gold: 1000, desc: '金幣 x1,000' },
        { day: 2, gold: 1200, desc: '金幣 x1,200' },
        { day: 3, gold: 1500, desc: '金幣 x1,500' },
        { day: 4, gold: 1800, desc: '金幣 x1,800' },
        { day: 5, gold: 2200, desc: '金幣 x2,200' },
        { day: 6, gold: 3000, desc: '金幣 x3,000' },
        { day: 7, gold: 5000, desc: '第7天大禮包：金幣 x5,000 + 破壞戰槌 x2 + 時間沙漏 x2' }
      ];
      container.innerHTML = '';

      rawConfigs.forEach((d, idx) => {
        const isPast = (d.day < curDay) || (d.day === curDay && isClaimedToday);
        const isToday = (d.day === curDay && !isClaimedToday);
        const icon = SIGNIN_ICONS[idx] || '🪙';

        const card = document.createElement('div');
        card.className = `signin-day-card ${isToday ? 'today' : ''} ${isPast ? 'claimed' : ''}`;
        const borderCss = isToday ? '2px solid #38bdf8' : (isPast ? '1.5px solid #10b981' : '1px solid #334155');
        const bgCss = isPast ? 'rgba(16, 185, 129, 0.14)' : (isToday ? 'rgba(56, 189, 248, 0.16)' : '#1e293b');
        card.style.cssText = `background:${bgCss}; border:${borderCss}; border-radius:8px; padding:8px 6px; text-align:center; position:relative;`;
        card.innerHTML = `
          <div style="font-size:0.75rem; color:${isPast ? '#4ade80' : '#94a3b8'}; font-weight:700;">第 ${d.day} 天</div>
          <div style="font-size:1.35rem; margin:2px 0;">${icon}</div>
          <div style="font-size:0.75rem; color:${isPast ? '#64748b' : '#fbbf24'}; font-weight:bold;">+${Number(d.gold).toLocaleString()}</div>
          ${isPast
            ? '<div style="font-size:0.7rem; color:#4ade80; font-weight:800; margin-top:2px;">✓ 已領取</div>'
            : (isToday
              ? '<div style="font-size:0.7rem; color:#38bdf8; font-weight:800; margin-top:2px;">今日可領</div>'
              : '<div style="font-size:0.7rem; color:#64748b; margin-top:2px;">未解鎖</div>')}
        `;
        container.appendChild(card);
      });
    }

    if (btn) {
      if (dlm.hasSignInPending()) {
        btn.disabled = false;
        btn.className = 'cr-btn cr-btn-green btn-large glow-pulse';
        btn.textContent = `立即簽到 · 領取第 ${curDay} 天獎勵`;
      } else {
        btn.disabled = true;
        btn.className = 'cr-btn cr-btn-disabled btn-large';
        btn.textContent = `今日已簽到 (第 ${curDay} 天已領取)`;
      }
    }
    syncDailyRedDots();
  }

  function handleSignInButtonClick() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    if (dlm.hasSignInPending()) {
      const res = dlm.claimSignInReward();
      if (res.success) {
        if (window.appRouter.audio) window.appRouter.audio.playCoin();
        window.appRouter.syncHud();
        if (window.appRouter.updateItemCounts) window.appRouter.updateItemCounts();
        renderSignInStatus();
        const rDesc = (res.reward && res.reward.desc) ? res.reward.desc : `+${res.reward ? res.reward.gold : 1000} 🪙 金幣`;
        alert(`🎉 第 ${res.day} 天簽到成功！獲得：${rDesc}！`);
      }
    }
  }

  function openDailyQuestsModal() {
    const modal = document.getElementById('modal-daily-quests');
    if (modal) {
      renderDailyQuests();
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
  }

  function closeDailyQuestsModal() {
    const modal = document.getElementById('modal-daily-quests');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function renderDailyQuests() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    const container = document.getElementById('daily-quests-container') || document.getElementById('daily-quests-list');
    const ptsEl = document.getElementById('activity-points-val');
    const chestBtn = document.getElementById('btn-claim-quest-chest');

    const pts = dlm.state.activityPoints || 0;
    if (ptsEl) ptsEl.textContent = `${pts} / 100`;

    // Progress Bar
    const bar = document.querySelector('#modal-daily-quests div[style*="width:100%"][style*="height:10px"] div');
    if (bar) bar.style.width = `${Math.min(100, pts)}%`;

    if (chestBtn) {
      if (dlm.state.activityChestClaimed) {
        chestBtn.disabled = true;
        chestBtn.className = 'cr-btn cr-btn-disabled btn-small';
        chestBtn.textContent = '已開啟大寶箱';
      } else if (pts >= 100) {
        chestBtn.disabled = false;
        chestBtn.className = 'cr-btn cr-btn-green btn-small glow-pulse';
        chestBtn.textContent = '🎁 開啟大寶箱 (領取)';
      } else {
        chestBtn.disabled = true;
        chestBtn.className = 'cr-btn cr-btn-disabled btn-small';
        chestBtn.textContent = '🔒 開啟大寶箱 (需100點)';
      }
    }

    if (container) {
      const QUEST_DEFS = [
        { id: 'quest_kill_monsters', name: '魔物清剿', desc: '在冒險關卡中累計擊倒魔物', target: 15, unit: '隻', pts: 25, gold: 300, icon: '⚔️' },
        { id: 'quest_high_merge', name: '精良合成', desc: '任意合成 10 次', target: 10, unit: '次', pts: 25, gold: 300, icon: '🛡️' },
        { id: 'quest_collect_gold', name: '開採財富', desc: '在冒險關卡中累計收集 50 金幣', target: 50, unit: '金幣', pts: 25, gold: 300, icon: '🪙' },
        { id: 'quest_combat_count', name: '勤勉遠征', desc: '進行任意冒險關卡戰鬥', target: 3, unit: '場', pts: 25, gold: 300, icon: '🚩' }
      ];

      container.innerHTML = '';
      QUEST_DEFS.forEach(q => {
        const qData = (dlm.state.quests && dlm.state.quests[q.id]) || { progress: 0, claimed: false };
        const curProg = Math.min(q.target, qData.progress || 0);
        const isDone = curProg >= q.target;
        const isClaimed = !!qData.claimed;

        const card = document.createElement('div');
        card.className = 'quest-item-card';
        card.style.cssText = 'background:#1e293b; border:1px solid #334155; border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;';

        card.innerHTML = `
          <div>
            <div style="font-weight:800; font-size:var(--font-body); color:#f8fafc;">${q.icon} ${q.name} (${curProg}/${q.target}${q.unit})</div>
            <div style="font-size:var(--font-caption); color:#94a3b8;">${q.desc} (活躍+${q.pts})</div>
          </div>
          <button class="cr-btn ${isClaimed ? 'cr-btn-disabled' : (isDone ? 'cr-btn-green' : 'cr-btn-disabled')} btn-small"
            ${(!isDone || isClaimed) ? 'disabled' : ''} style="min-width:85px;">
            ${isClaimed ? '✓ 已領取' : (isDone ? `領取 🪙${q.gold}` : '進行中')}
          </button>
        `;

        const qId = q.id;
        const btn = card.querySelector('button');
        if (btn && isDone && !isClaimed) {
          btn.onclick = () => {
            const res = dlm.claimQuestReward(qId);
            if (res.success) {
              if (window.appRouter.audio) window.appRouter.audio.playCoin();
              window.appRouter.syncHud();
              renderDailyQuests();
              syncDailyRedDots();
              alert(`🎉 領取【${q.name}】任務獎勵成功！獲得 +${res.rewardGold} 🪙 金幣（活躍度 +${q.pts}）！`);
            }
          };
        }

        container.appendChild(card);
      });
    }
    syncDailyRedDots();
  }

  function claimDailyActivityChest() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    const res = dlm.claimActivityChest();
    if (res.success) {
      if (window.appRouter.audio) window.appRouter.audio.playVictory();
      window.appRouter.syncHud();
      if (window.appRouter.updateItemCounts) window.appRouter.updateItemCounts();
      renderDailyQuests();
      syncDailyRedDots();
      const cDesc = (res.reward && res.reward.desc) ? res.reward.desc : '金幣 x600 + 精準重弩 x2 + 破壞戰槌 x1';
      alert(`🎉 恭喜開啟 100 活躍度全勤大寶箱！獲得：${cDesc}！`);
    } else {
      alert(`⚠️ 領取失敗：${res.reason === 'ALREADY_CLAIMED' ? '今日大寶箱已領取過！' : '活躍度不足 100 點！'}`);
    }
  }

  // ----------------------------------------------------
  // BUTTON COIN FLY-AWAY VFX & CAMP UPGRADES (C-STORY-150)
  // ----------------------------------------------------
  function playButtonCoinSpendVfx(btnEl, costAmount) {
    if (!btnEl) return;
    const rect = btnEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const container = document.createElement('div');
    container.className = 'coin-spend-vfx-container';
    container.style.left = `${cx}px`;
    container.style.top = `${cy}px`;
    container.style.width = '1px';
    container.style.height = '1px';

    const offsets = [
      { tx: -36, ty: -68, rot: -35, delay: 0 },
      { tx: -18, ty: -82, rot: -20, delay: 35 },
      { tx: 0,   ty: -88, rot: 8,   delay: 15 },
      { tx: 18,  ty: -80, rot: 24,  delay: 50 },
      { tx: 36,  ty: -66, rot: 40,  delay: 25 },
      { tx: -26, ty: -58, rot: -28, delay: 75 },
      { tx: 26,  ty: -60, rot: 30,  delay: 65 }
    ];

    offsets.forEach(off => {
      const p = document.createElement('span');
      p.className = 'coin-fly-particle';
      p.textContent = '🪙';
      p.style.left = '-10px';
      p.style.top = '-10px';
      p.style.setProperty('--tx', `${off.tx}px`);
      p.style.setProperty('--ty', `${off.ty}px`);
      p.style.setProperty('--rot', `${off.rot}deg`);
      p.style.animationDelay = `${off.delay}ms`;
      container.appendChild(p);
    });

    if (costAmount !== undefined && costAmount > 0) {
      const amt = document.createElement('div');
      amt.className = 'coin-fly-amount';
      amt.textContent = `-🪙 ${Number(costAmount).toLocaleString()}`;
      container.appendChild(amt);
    }

    document.body.appendChild(container);
    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 950);
  }

  function getCampUpgrades() {
    const raw = localStorage.getItem('rpg_2048_camp_upgrades');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return { forge: 1, capacity: 1, afk: 1 };
  }

  function saveCampUpgrades(upg) {
    localStorage.setItem('rpg_2048_camp_upgrades', JSON.stringify(upg));
  }

  function getForgeTierConfigByLevel(lv) {
    const clamped = Math.max(1, Math.min(48, Number(lv) || 1));
    if (window.appRouter && Array.isArray(window.appRouter.BASE_STAT_TIERS)) {
      const found = window.appRouter.BASE_STAT_TIERS.find(t => t.tier === clamped);
      if (found) return found;
    }
    // Deterministic fallback matching BASE_STAT_TIERS (1~48)
    let cycleIdx = 0;
    let stepWeights = [0.80, 0.18, 0.02];
    if (clamped <= 5) {
      cycleIdx = 0;
      const wTable = [
        [0.80, 0.18, 0.02],
        [0.75, 0.22, 0.03],
        [0.70, 0.25, 0.05],
        [0.65, 0.28, 0.07],
        [0.60, 0.30, 0.10]
      ];
      stepWeights = wTable[clamped - 1];
    } else {
      cycleIdx = Math.min(7, Math.floor(clamped / 6));
      const subIdx = clamped % 6;
      const wTable = [
        [0.75, 0.22, 0.03],
        [0.70, 0.25, 0.05],
        [0.65, 0.28, 0.07],
        [0.60, 0.30, 0.10],
        [0.55, 0.32, 0.13],
        [0.50, 0.34, 0.16]
      ];
      stepWeights = wTable[subIdx];
    }
    const r0 = Math.pow(2, cycleIdx + 1);
    return {
      tier: clamped,
      baseRange: [r0, r0 * 2, r0 * 4],
      weights: stepWeights
    };
  }

  function getForgePlainDescription(lv) {
    const curLv = Math.max(1, Math.min(48, Number(lv) || 1));
    const curCfg = getForgeTierConfigByLevel(curLv);
    const [r0, r1, r2] = curCfg.baseRange;
    const [w0, w1, w2] = curCfg.weights.map(w => Math.round(w * 100));

    if (curLv >= 48) {
      return `已達最高等級！棋盤固定產出頂級裝備 ${r0}、${r1}、${r2}（出現率 ${w0}% / ${w1}% / ${w2}%）`;
    }

    const nextCfg = getForgeTierConfigByLevel(curLv + 1);
    const [nr0, nr1, nr2] = nextCfg.baseRange;
    const [nw0, nw1, nw2] = nextCfg.weights.map(w => Math.round(w * 100));

    if (nr0 > r0) {
      return `目前棋盤產出裝備 ${r0}、${r1}、${r2}（機率 ${w0}% / ${w1}% / ${w2}%）➔ 下一級：淘汰裝備 ${r0}，全面改產出 ${nr0}、${nr1}、${nr2}！`;
    }
    return `目前棋盤產出裝備 ${r0}、${r1}、${r2}（機率 ${w0}% / ${w1}% / ${w2}%）➔ 下一級：裝備 ${r1}、${r2} 出現率提升至 ${nw1}% / ${nw2}%`;
  }

  function renderCampUpgrades() {
    const upg = getCampUpgrades();

    // 1. 鐵匠鋪 (動態更新標題與直白說明，不含 T02/T03 術語)
    const forgeTitleEl = document.getElementById('camp-txt-forge-title');
    const forgeDescEl = document.getElementById('camp-txt-forge-desc');
    const forgeBtnEl = document.getElementById('camp-btn-forge-upgrade');
    const forgeCost = Math.floor(100 * Math.pow(1.5, upg.forge - 1));
    if (forgeTitleEl) forgeTitleEl.textContent = `皇家鐵匠鋪 LV.${upg.forge}`;
    if (forgeDescEl) forgeDescEl.textContent = getForgePlainDescription(upg.forge);
    if (forgeBtnEl) {
      if (upg.forge >= 48) {
        forgeBtnEl.disabled = true;
        forgeBtnEl.className = 'cr-btn cr-btn-disabled btn-small';
        forgeBtnEl.textContent = '已滿級';
      } else {
        forgeBtnEl.disabled = false;
        forgeBtnEl.className = 'cr-btn cr-btn-green btn-small';
        forgeBtnEl.textContent = `升級 🪙${forgeCost.toLocaleString()}`;
      }
    }

    // 2. 軍需背包行囊
    const bagTitleEl = document.getElementById('camp-txt-bag-title');
    const bagDescEl = document.getElementById('camp-txt-bag-desc');
    const bagBtnEl = document.getElementById('camp-btn-bag-expand');
    const curCap = 16 + (upg.capacity - 1) * 4;
    const nextCap = curCap + 4;
    const capCost = 200 * upg.capacity;
    if (bagTitleEl) bagTitleEl.textContent = `軍需行囊 (${curCap} ➔ ${nextCap}格)`;
    if (bagDescEl) bagDescEl.textContent = `目前可存放 ${curCap} 件裝備 ➔ 擴充後容量提升至 ${nextCap} 格，可儲備更多合成神裝`;
    if (bagBtnEl) bagBtnEl.textContent = `擴充 🪙${capCost.toLocaleString()}`;
  }

  function upgradeCampBuilding(type) {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    const upg = getCampUpgrades();

    if (type === 'forge' && upg.forge >= 48) {
      return;
    }

    let cost = 100;
    if (type === 'forge') cost = Math.floor(100 * Math.pow(1.5, upg.forge - 1));
    else if (type === 'capacity') cost = 200 * upg.capacity;
    else if (type === 'afk') cost = 150 * upg.afk;

    if (sm.gold < cost) {
      alert(`⚠️ 金幣不足！升級需要 ${cost.toLocaleString()} 🪙，目前僅有 ${sm.gold.toLocaleString()} 🪙！`);
      return;
    }

    const btnEl = type === 'forge'
      ? document.getElementById('camp-btn-forge-upgrade')
      : document.getElementById('camp-btn-bag-expand');
    playButtonCoinSpendVfx(btnEl, cost);

    sm.gold -= cost;
    upg[type] = (upg[type] || 1) + 1;
    if (type === 'forge') {
      sm.baseTier = Math.min(48, upg.forge);
    }
    sm.saveData();
    saveCampUpgrades(upg);

    if (type === 'capacity' && window.appRouter.inventoryManager) {
      window.appRouter.inventoryManager.maxCapacity = 16 + (upg.capacity - 1) * 4;
    }

    if (window.appRouter.audio) window.appRouter.audio.playCoin();
    window.appRouter.syncHud();
    renderCampUpgrades();
    if (type === 'capacity') renderGearInventory();
  }

  // ----------------------------------------------------
  // GACHA & EQUIPMENT BACKPACK
  // ----------------------------------------------------
  function openQuickGachaModal() {
    switchMainTab('camp');
  }

  function closeQuickGachaModal() {
    const modal = document.getElementById('modal-quick-gacha');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function handleQuickGachaPull(count) {
    if (!window.appRouter) return;
    const cost = count === 1 ? 100 : 900;
    const btnEl = count === 1
      ? document.getElementById('camp-btn-gacha-single')
      : document.getElementById('camp-btn-gacha-ten');
    const res = window.appRouter.performGacha(count);
    if (res.success && res.items) {
      playButtonCoinSpendVfx(btnEl, cost);
      closeQuickGachaModal();
      showGachaResults(res.items);
      renderGearInventory();
    }
  }

  function showGachaResults(items) {
    const modal = document.getElementById('modal-gacha-result');
    const grid = document.getElementById('gacha-result-cards');
    if (!modal || !grid) return;

    grid.innerHTML = '';
    items.forEach(it => {
      const v = it.value || it.val || 2;
      const card = document.createElement('div');
      card.className = `gear-cell tier-${v}`;
      card.style.cssText = 'aspect-ratio: 5 / 6; cursor: default;';
      card.innerHTML = `
        <img src="${getEquipImg(v)}" alt="裝備 ${v}">
        <span class="gear-val">${v}</span>
      `;
      grid.appendChild(card);
    });

    modal.classList.add('active');
    modal.style.display = 'flex';
  }

  function closeGachaResultModal() {
    const modal = document.getElementById('modal-gacha-result');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function openUpgradeCapacityModal() {
    switchMainTab('camp');
  }

  function closeUpgradeCapacityModal() {
    const modal = document.getElementById('modal-upgrade-capacity');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function handleConfirmCapacityUpgrade() {
    upgradeCampBuilding('capacity');
    closeUpgradeCapacityModal();
    renderGearInventory();
  }

  function unequipActiveGear() {
    if (!window.appRouter) return;
    window.appRouter.unequipGear();
  }

  function handleOneKeyMerge() {
    if (!window.appRouter || !window.appRouter.inventoryManager) return;
    const im = window.appRouter.inventoryManager;
    const res = im.batchAutoMerge();
    window.appRouter.saveInventory();
    renderGearInventory();
    if (res.mergedCount > 0) {
      if (window.appRouter.audio) window.appRouter.audio.playMerge();
      alert(`⚡ 一鍵合成完成！共合成 ${res.mergedCount} 組裝備，釋出 ${res.freedSlots} 格背包空間，最高合成等級 (${res.highestCreated})！`);
    } else {
      alert('⚠️ 目前背包內沒有可供合成的成對裝備（需有 2 件同階裝備）。');
    }
  }

  function renderGearInventory() {
    if (!window.appRouter) return;
    const im = window.appRouter.inventoryManager;
    const grid = document.getElementById('gear-grid-container');
    const capEl = document.getElementById('gear-txt-capacity');
    if (!grid) return;

    // Sort owned equipment in descending order (largest numbers at top!)
    if (Array.isArray(im.items)) {
      im.items.sort((a, b) => ((b.value || b.val || 0) - (a.value || a.val || 0)));
    }
    const items = im.items || [];
    const maxCap = im.maxCapacity || 16;
    if (capEl) capEl.textContent = `容量：${items.length} / ${maxCap}`;

    grid.innerHTML = '';
    const equipped = window.appRouter.getEquippedGear();

    // Render Equipped Gear preview in hero loadout
    const weaponCardImg = document.getElementById('deploy-gear-img');
    const weaponCardName = document.getElementById('deploy-gear-name');

    if (equipped) {
      const v = equipped.value || equipped.val || 2;
      const themes = window.appRouter.EQUIPMENT_THEMES || {};
      const realName = (themes[v] && themes[v].name) ? themes[v].name : (equipped.name && equipped.name !== '神兵' && equipped.name !== '神裝' ? equipped.name : '泥木劍');
      if (weaponCardImg) weaponCardImg.src = getEquipImg(v);
      if (weaponCardName) weaponCardName.textContent = `${realName} (${v})`;
    } else {
      if (weaponCardImg) weaponCardImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
      if (weaponCardName) weaponCardName.textContent = '未裝備神兵';
    }

    // Render backpack slots matching Prototype (.gear-cell.tier-X, 88% image scale, enlarged bottom-right value)
    for (let i = 0; i < maxCap; i++) {
      const slot = document.createElement('div');
      const it = items[i];
      if (it) {
        const v = it.value || it.val || 2;
        const isEq = equipped && (it.id === equipped.id);
        slot.className = `gear-cell gear-slot-item tier-${v}${isEq ? ' equipped-slot' : ''}`;
        if (isEq) {
          slot.style.borderColor = '#fbbf24';
        }
        slot.innerHTML = `
          <img src="${getEquipImg(v)}" alt="裝備 ${v}">
          <span class="gear-val">${v}</span>
          ${isEq ? '<span style="position:absolute; top:4px; left:4px; font-size:0.65rem; background:#fbbf24; color:#000; border-radius:4px; padding:1px 4px; font-weight:900; box-shadow:0 1px 3px rgba(0,0,0,0.8); z-index:4;">E</span>' : ''}
        `;
        slot.onclick = () => {
          window.appRouter.equipGearItem(it);
          renderGearInventory();
        };
      } else {
        slot.className = 'gear-cell gear-slot-item empty-slot';
        slot.innerHTML = '<span style="color:#475569; font-size:0.8rem; font-weight:700;">空</span>';
      }
      grid.appendChild(slot);
    }
  }

  // ----------------------------------------------------
  // HERO LOADOUT & DETAILS
  // ----------------------------------------------------
  function renderHeroCards() {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    const selected = sm.getSelectedCharacter() || 'warrior';

    const heroes = [
      { key: 'warrior', name: '戰士', cardId: 'card-hero-warrior', btnId: 'btn-deploy-warrior' },
      { key: 'merchant', name: '戰地商人', cardId: 'card-hero-merchant', btnId: 'btn-deploy-merchant' },
      { key: 'archer', name: '精靈弓手', cardId: 'card-hero-archer', btnId: 'btn-deploy-archer' }
    ];

    heroes.forEach(h => {
      const card = document.getElementById(h.cardId);
      if (!card) return;
      const isCur = (selected === h.key);
      const lvl = sm.getCharacterSkillLevel(h.key);

      if (isCur) card.classList.add('active-deployed');
      else card.classList.remove('active-deployed');

      const titleEl = card.querySelector('.hero-card-title');
      if (titleEl) titleEl.textContent = `${h.name} LV.${lvl + 1}`;

      const deployBtn = document.getElementById(h.btnId);
      if (deployBtn) {
        if (isCur) {
          deployBtn.className = 'cr-btn cr-btn-amber';
          deployBtn.textContent = '上陣中';
          deployBtn.disabled = true;
        } else {
          deployBtn.className = 'cr-btn cr-btn-blue';
          deployBtn.textContent = '委派上陣';
          deployBtn.disabled = false;
        }
      }
    });
  }

  function openHeroDetailModal(heroKey) {
    window.currentHeroModalKey = heroKey;
    const modal = document.getElementById('modal-hero-detail');
    if (!modal || !window.appRouter) return;

    const sm = window.appRouter.stageManager;
    const curLevel = sm.getCharacterSkillLevel(heroKey);
    const isSelected = sm.getSelectedCharacter() === heroKey;

    const HERO_NAMES = {
      warrior: '戰士 (Warrior)',
      merchant: '戰地商人 (Merchant)',
      archer: '精靈弓手 (Archer)'
    };
    const HERO_SKILLS = {
      warrior: '十字衝擊 (斬斷十字障礙物)',
      merchant: '點石成金 (將低階物資轉為金幣)',
      archer: '精準箭雨 (鎖定消除指定目標)'
    };

    const titleEl = document.getElementById('modal-hero-title');
    const levelEl = document.getElementById('modal-hero-level');
    const descEl = document.getElementById('modal-hero-desc');
    const deployBtn = document.getElementById('modal-bottom-deploy-btn');
    const upgBtn = document.getElementById('modal-upgrade-btn');

    if (titleEl) titleEl.textContent = HERO_NAMES[heroKey] || heroKey;
    if (levelEl) levelEl.textContent = `等級：LV.${curLevel + 1} ${curLevel >= 4 ? '(已達最高)' : ''}`;
    if (descEl) descEl.textContent = HERO_SKILLS[heroKey] || '';

    if (deployBtn) {
      if (isSelected) {
        deployBtn.disabled = true;
        deployBtn.className = 'cr-btn cr-btn-amber btn-medium';
        deployBtn.innerHTML = '<span>上陣中</span>';
      } else {
        deployBtn.disabled = false;
        deployBtn.className = 'cr-btn cr-btn-blue btn-medium';
        deployBtn.innerHTML = '<span>委派上陣</span>';
      }
    }

    if (upgBtn) {
      const cost = Math.floor(200 * Math.pow(1.5, curLevel));
      if (curLevel >= 4) {
        upgBtn.disabled = true;
        upgBtn.className = 'cr-btn cr-btn-disabled btn-medium';
        upgBtn.textContent = '技能已滿級';
      } else {
        upgBtn.disabled = false;
        upgBtn.className = 'cr-btn cr-btn-green btn-medium';
        upgBtn.textContent = `技能升級 🪙${cost.toLocaleString()}`;
      }
    }

    modal.classList.add('active');
    modal.style.display = 'flex';
  }

  function closeHeroDetailModal() {
    const modal = document.getElementById('modal-hero-detail');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function deployFromModal() {
    if (window.currentHeroModalKey) {
      deployHero(window.currentHeroModalKey);
      openHeroDetailModal(window.currentHeroModalKey);
    }
  }

  function upgradeHeroFromModal() {
    if (window.currentHeroModalKey) {
      upgradeHero(window.currentHeroModalKey);
      openHeroDetailModal(window.currentHeroModalKey);
    }
  }

  function deployHero(heroKey) {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    const res = sm.selectCharacter(heroKey);
    if (res.success) {
      if (window.appRouter.audio) window.appRouter.audio.playClick();
      renderHeroCards();
    }
  }

  function upgradeHero(heroKey) {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    const curLv = sm.getCharacterSkillLevel(heroKey);
    const upgCost = Math.floor(200 * Math.pow(1.5, curLv));
    const res = sm.upgradeCharacterSkill(heroKey);
    if (res.success) {
      playButtonCoinSpendVfx(document.getElementById('modal-upgrade-btn'), upgCost);
      if (window.appRouter.audio) window.appRouter.audio.playVictory();
      renderHeroCards();
      window.appRouter.syncHud();
      alert(`🎉 升級成功！英雄目前技能等級提升！`);
    } else {
      alert(`⚠️ 升級失敗：${res.reason || '金幣不足！'}`);
    }
  }

  // ----------------------------------------------------
  // SHOP MONETIZATION & PRIVILEGES
  // ----------------------------------------------------
  function syncShopDisplay() {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    const dlm = window.appRouter.dailyLoopManager;

    // 1. No ads pass
    const passBtn = document.getElementById('shop-btn-pass-price');
    if (passBtn) {
      if (sm.hasNoAdsPass) {
        passBtn.disabled = true;
        passBtn.className = 'cr-btn cr-btn-disabled btn-small';
        passBtn.textContent = '已擁有特權';
      } else {
        passBtn.disabled = false;
        passBtn.className = 'cr-btn cr-btn-green btn-small';
        passBtn.textContent = 'NT$ 150 終身免除廣告';
      }
    }

    // 2. Daily Free supplies
    const freeBtn = document.getElementById('shop-btn-free');
    if (freeBtn && dlm) {
      if (dlm.state.shopGiftClaimedToday) {
        freeBtn.disabled = true;
        freeBtn.className = 'cr-btn cr-btn-disabled btn-medium';
        freeBtn.textContent = '今日已領取';
      } else {
        freeBtn.disabled = false;
        freeBtn.className = 'cr-btn cr-btn-blue btn-medium';
        freeBtn.textContent = '免費領取';
      }
    }

    // 3. Daily Ad Reward
    const adBtn = document.getElementById('shop-btn-ad');
    const adLeftTxt = document.getElementById('shop-txt-ad-left');
    if (adBtn) {
      const remain = sm.dailyAdRemain !== undefined ? sm.dailyAdRemain : 3;
      if (adLeftTxt) adLeftTxt.textContent = `今日剩餘：${remain} / 3 次`;
      if (remain <= 0) {
        adBtn.disabled = true;
        adBtn.className = 'cr-btn cr-btn-disabled btn-medium';
        adBtn.textContent = '今日已領完';
      } else {
        adBtn.disabled = false;
        adBtn.className = 'cr-btn cr-btn-amber btn-medium';
        adBtn.textContent = sm.hasNoAdsPass ? '直接領取 (免廣告)' : '觀看廣告';
      }
    }

    // 4. Infinite stamina pass
    const staminaBtn = document.getElementById('shop-btn-stamina-price');
    if (staminaBtn) {
      if (sm.hasUnlimitedStamina) {
        staminaBtn.disabled = true;
        staminaBtn.className = 'cr-btn cr-btn-disabled btn-small';
        staminaBtn.textContent = '已擁有特權';
      } else {
        staminaBtn.disabled = false;
        staminaBtn.className = 'cr-btn cr-btn-purple btn-small';
        staminaBtn.textContent = 'NT$ 90 即刻開通';
      }
    }
  }

  function buyNoAdsPass() {
    if (!window.appRouter) return;
    window.appRouter.stageManager.buyNoAdsPass();
    syncShopDisplay();
    if (window.appRouter.audio) window.appRouter.audio.playVictory();
    alert('🎉 恭喜成功開通「終身免廣告 PASS」！\n所有廣告直接跳過，暢享零等待！');
  }

  function buyUnlimitedStamina() {
    if (!window.appRouter) return;
    window.appRouter.stageManager.buyUnlimitedStaminaPass();
    syncShopDisplay();
    window.appRouter.syncHud();
    if (window.appRouter.audio) window.appRouter.audio.playVictory();
    alert('⚡ 恭喜成功開通「無限體力特權」！\n戰敗不再扣除體力，盡情暢玩冒險關卡！');
  }

  function claimShopDailyGift() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const res = window.appRouter.dailyLoopManager.claimShopGift();
    if (res.success) {
      window.appRouter.syncHud();
      syncShopDisplay();
      if (window.appRouter.audio) window.appRouter.audio.playCoin();
      alert('🎁 每日免費物資已領取：獲得 +200 🪙 金幣！');
    } else {
      alert('⚠️ 今日免費物資已領取完畢，請明日再來！');
    }
  }

  function watchAdForGold() {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    const res = sm.claimDailyAdReward();
    if (res.success) {
      window.appRouter.syncHud();
      syncShopDisplay();
      if (window.appRouter.audio) window.appRouter.audio.playCoin();
      alert(`🎉 領取成功：獲得 +${res.reward} 🪙 金幣！`);
    } else {
      alert(`⚠️ ${res.reason || '今日廣告獎勵已全數領取完畢！'}`);
    }
  }

  function claimTestRecharge() {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    sm.claimTestGold(50000);
    sm.claimTestItems(5);
    window.appRouter.syncHud();
    if (window.appRouter.audio) window.appRouter.audio.playVictory();
    alert('👑 皇家金幣袋儲值成功！已獲得 +50,000 🪙 金幣與各道具 +5！');
  }

  function showStaminaInfo() {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    if (sm.hasUnlimitedStamina) {
      alert('⚡ 您已啟用「無限體力特權」，冒險不耗體力，暢享無限制通關！');
    } else if (sm.stamina < sm.maxStamina) {
      const emptyModal = document.getElementById('modal-stamina-empty');
      if (emptyModal) {
        emptyModal.classList.add('active');
        emptyModal.style.display = 'flex';
      } else {
        alert(`⚡ 當前體力：${sm.stamina}/${sm.maxStamina}\n每 20 分鐘自然恢復 1 點。`);
      }
    } else {
      alert(`⚡ 體力全滿（${sm.stamina}/${sm.maxStamina}）：\n• 挑戰通關不扣體力\n• 戰敗時消耗 1 點\n• 每 20 分鐘自然恢復 1 點`);
    }
  }

  // ----------------------------------------------------
  // REAL COMPENDIUM VIEW
  // ----------------------------------------------------
  function switchCompTab(tab) {
    window.currentCompTab = tab;
    document.querySelectorAll('.comp-tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`comp-tab-${tab}`);
    if (btn) btn.classList.add('active');
    renderCompendiumView();
  }

  function renderCompendiumView() {
    const tab = window.currentCompTab || 'monsters';
    const area = document.getElementById('compendium-content-area');
    if (!area || !window.appRouter) return;

    area.innerHTML = '';
    const maxU = getMaxUnlocked();
    const equipped = window.appRouter.getEquippedGear();
    const equippedVal = equipped ? (equipped.value || equipped.val || 2) : 2;

    if (tab === 'monsters') {
      const CHAPTER_GROUPS = [
        {
          chapter: 1,
          name: '第一章：微風之境 (Stage 1~5)',
          monsters: [
            { name: '洞穴蝙蝠', val: 2 },
            { name: '森林幼狼', val: 4 },
            { name: '哥布林斥候', val: 8 },
            { name: '野生史萊姆', val: 16 },
            { name: '獸人督軍', val: 32 }
          ]
        },
        {
          chapter: 2,
          name: '第二章：荒漠熔岩 (Stage 6~10)',
          monsters: [
            { name: '火苗蜥蜴', val: 16 },
            { name: '熔岩火靈', val: 32 },
            { name: '熔岩史萊姆', val: 64 },
            { name: '炎魔督軍', val: 128 },
            { name: '赤炎巨魔', val: 256 },
            { name: '黑曜熔岩龍', val: 512 }
          ]
        },
        {
          chapter: 3,
          name: '第三章：暗夜聖殿 (Stage 11~15)',
          monsters: [
            { name: '暗影魔狼', val: 64 },
            { name: '骷髏騎士', val: 128 },
            { name: '巫妖祭司', val: 256 },
            { name: '幽冥死神', val: 512 },
            { name: '深淵魔皇', val: 1024 },
            { name: '滅世黑龍', val: 2048 }
          ]
        }
      ];

      CHAPTER_GROUPS.forEach(grp => {
        const sec = document.createElement('div');
        sec.className = 'comp-group-section';

        let unlockedCount = 0;
        grp.monsters.forEach(m => {
          if (maxU >= grp.chapter * 2 - 1 || maxU >= 5) unlockedCount++;
        });

        const title = document.createElement('div');
        title.className = 'comp-group-title';
        title.innerHTML = `
          <span>${grp.name} <span style="font-size:var(--font-caption); color:#38bdf8; font-weight:700;">(${unlockedCount}/${grp.monsters.length} 已解鎖)</span></span>
          <span class="collapse-arrow">▼</span>
        `;
        sec.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'compendium-grid';

        title.onclick = () => {
          const isCollapsed = grid.classList.toggle('collapsed');
          const arrow = title.querySelector('.collapse-arrow');
          if (arrow) arrow.textContent = isCollapsed ? '▲' : '▼';
        };

        grp.monsters.forEach((m, idx) => {
          const isUnlocked = (maxU >= grp.chapter * 2 - 1) || (grp.chapter === 1 && idx < 3) || (maxU >= 5);
          const card = document.createElement('div');
          card.className = 'compendium-card' + (isUnlocked ? '' : ' locked');
          card.style.aspectRatio = '5 / 6';

          if (isUnlocked) {
            card.innerHTML = `
              <img src="${getMonsterImg(m.val, grp.chapter)}" onerror="this.src='assets/images/monsters_clay/monster_ch01_08.png'" style="width:48px; height:48px; object-fit:contain;" alt="${m.name}">
              <span style="font-size:0.75rem; color:#f8fafc; font-weight:bold; text-align:center; margin-top:2px;">${m.name}</span>
              <span style="font-size:0.65rem; color:#fbbf24; font-weight:800;">${m.val}</span>
            `;
          } else {
            card.innerHTML = `
              <span style="font-size:2rem; filter:grayscale(1); opacity:0.5;">🔒</span>
              <span style="font-size:0.7rem; color:#64748b; margin-top:2px;">??? (${m.val})</span>
            `;
          }
          grid.appendChild(card);
        });

        sec.appendChild(grid);
        area.appendChild(sec);
      });
    } else if (tab === 'gears') {
      const GEAR_TIERS = [
        { name: '泥木劍', val: 2 },
        { name: '青銅刃', val: 4 },
        { name: '泥盾靴', val: 8 },
        { name: '鐵甲胸鎧', val: 16 },
        { name: '秘銀闊劍', val: 32 },
        { name: '皇家重甲', val: 64 },
        { name: '榮耀法靴', val: 128 },
        { name: '輝煌神盾', val: 256 },
        { name: '聖殿光刃', val: 512 },
        { name: '永恆聖劍', val: 1024 },
        { name: '滅神狂斬', val: 2048 }
      ];

      const sec = document.createElement('div');
      sec.className = 'comp-group-section';

      const unlockedCount = GEAR_TIERS.filter(g => g.val <= equippedVal || g.val <= 4).length;

      const title = document.createElement('div');
      title.className = 'comp-group-title';
      title.innerHTML = `
        <span>⚔️ 王國神兵裝備庫 <span style="font-size:var(--font-caption); color:#38bdf8; font-weight:700;">(${unlockedCount}/${GEAR_TIERS.length} 已解鎖)</span></span>
        <span class="collapse-arrow">▼</span>
      `;
      sec.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'compendium-grid';

      title.onclick = () => {
        const isCollapsed = grid.classList.toggle('collapsed');
        const arrow = title.querySelector('.collapse-arrow');
        if (arrow) arrow.textContent = isCollapsed ? '▲' : '▼';
      };

      GEAR_TIERS.forEach(g => {
        const isUnlocked = g.val <= equippedVal || g.val <= 4;
        const card = document.createElement('div');
        card.className = 'compendium-card' + (isUnlocked ? '' : ' locked');
        card.style.aspectRatio = '5 / 6';

        if (isUnlocked) {
          card.innerHTML = `
            <img src="${getEquipImg(g.val)}" style="width:44px; height:44px; object-fit:contain;" alt="${g.name}">
            <span style="font-size:0.75rem; color:#38bdf8; font-weight:bold; text-align:center; margin-top:2px;">${g.name}</span>
            <span style="font-size:0.65rem; color:#fbbf24; font-weight:800;">${g.val}</span>
          `;
        } else {
          card.innerHTML = `
            <span style="font-size:2rem; filter:grayscale(1); opacity:0.5;">🔒</span>
            <span style="font-size:0.7rem; color:#64748b; margin-top:2px;">??? (${g.val})</span>
          `;
        }
        grid.appendChild(card);
      });

      sec.appendChild(grid);
      area.appendChild(sec);
    } else if (tab === 'heroes') {
      const HERO_SECTIONS = [
        {
          name: '⚔️ 鐵甲狂戰士 (Warrior)',
          tiers: [
            { name: '泥木戰士', val: 2, img: 'assets/images/hero_knight/hero_01.png' },
            { name: '青銅衛兵', val: 4, img: 'assets/images/hero_knight/hero_02.png' },
            { name: '重裝前鋒', val: 8, img: 'assets/images/hero_knight/hero_03.png' },
            { name: '鐵衛騎士', val: 16, img: 'assets/images/hero_knight/hero_04.png' },
            { name: '鋼刃領主', val: 32, img: 'assets/images/hero_knight/hero_05.png' },
            { name: '皇家禁衛', val: 64, img: 'assets/images/hero_knight/hero_06.png' }
          ]
        },
        {
          name: '💰 戰地商人 (Merchant)',
          tiers: [
            { name: '行腳學徒', val: 2, img: 'assets/images/hero_knight/hero_07.png' },
            { name: '商隊斥候', val: 4, img: 'assets/images/hero_knight/hero_08.png' },
            { name: '財富守衛', val: 8, img: 'assets/images/hero_knight/hero_09.png' }
          ]
        },
        {
          name: '🏹 精靈弓手 (Archer)',
          tiers: [
            { name: '巡林斥候', val: 2, img: 'assets/images/hero_knight/hero_10.png' },
            { name: '追風射手', val: 4, img: 'assets/images/hero_knight/hero_11.png' },
            { name: '穿雲幻箭', val: 8, img: 'assets/images/hero_knight/hero_12.png' }
          ]
        }
      ];

      HERO_SECTIONS.forEach(grp => {
        const sec = document.createElement('div');
        sec.className = 'comp-group-section';

        const title = document.createElement('div');
        title.className = 'comp-group-title';
        title.innerHTML = `
          <span>${grp.name} <span style="font-size:var(--font-caption); color:#38bdf8; font-weight:700;">(${grp.tiers.length}/${grp.tiers.length} 已解鎖)</span></span>
          <span class="collapse-arrow">▼</span>
        `;
        sec.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'compendium-grid';

        title.onclick = () => {
          const isCollapsed = grid.classList.toggle('collapsed');
          const arrow = title.querySelector('.collapse-arrow');
          if (arrow) arrow.textContent = isCollapsed ? '▲' : '▼';
        };

        grp.tiers.forEach(t => {
          const card = document.createElement('div');
          card.className = 'compendium-card';
          card.style.aspectRatio = '5 / 6';
          card.innerHTML = `
            <img src="${t.img}" onerror="this.src='assets/images/hero_knight/hero_09.png'" style="width:48px; height:48px; object-fit:contain;" alt="${t.name}">
            <span style="font-size:0.75rem; color:#f8fafc; font-weight:bold; text-align:center; margin-top:2px;">${t.name}</span>
            <span style="font-size:0.65rem; color:#38bdf8; font-weight:800;">${t.val}</span>
          `;
          grid.appendChild(card);
        });

        sec.appendChild(grid);
        area.appendChild(sec);
      });
    }
  }

  // ----------------------------------------------------
  // SETTINGS & SAVE RESET
  // ----------------------------------------------------
  function openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
  }

  function closeSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  }

  function changeLanguageFromSelect(lang) {
    if (lang) setLanguage(lang);
  }

  function switchSettingTab(tab) {
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));

    const btn = document.getElementById(`btn-stab-${tab}`) || document.getElementById(`btn-sett-tab-${tab}`);
    const pane = document.getElementById(`pane-setting-${tab}`) || document.getElementById(`sett-pane-${tab}`);

    if (btn) btn.classList.add('active');
    if (pane) pane.classList.add('active');
  }

  function changeThemeSkin(skin) {
    localStorage.setItem('rpg_2048_theme_skin', skin);
    if (window.appRouter && window.appRouter.viewRenderer) {
      window.appRouter.viewRenderer.setThemeSkin(skin);
    }
  }

  function changeTileStyle(style) {
    localStorage.setItem('rpg_2048_icon_style', style);
    if (window.appRouter && window.appRouter.viewRenderer) {
      window.appRouter.viewRenderer.setIconStyle(style);
    }
  }

  function toggleInstantSkill(enabled) {
    if (window.appRouter) {
      window.appRouter.instantSkillMode = enabled;
    }
  }

  function handleResetTutorial() {
    localStorage.removeItem('2048RPG_Tutorial_Completed');
    if (window.appRouter && window.appRouter.stageManager && window.appRouter.stageManager.tutorialManager) {
      window.appRouter.stageManager.tutorialManager.setCompleted(false);
    }
    window.currentSelectedStage = 0;
    renderAdventureStage(0);
    closeSettingsModal();
    alert('🔄 新手教學記錄已重置！即刻為您開啟新手教學。');
    if (window.appRouter && typeof window.appRouter.startTutorialCombat === 'function') {
      window.appRouter.startTutorialCombat();
    }
  }

  function replayTutorialCombat() {
    closeSettingsModal();
    localStorage.removeItem('2048RPG_Tutorial_Completed');
    if (window.appRouter && window.appRouter.stageManager && window.appRouter.stageManager.tutorialManager) {
      window.appRouter.stageManager.tutorialManager.setCompleted(false);
    }
    window.currentSelectedStage = 0;
    if (window.appRouter && typeof window.appRouter.startTutorialCombat === 'function') {
      window.appRouter.startTutorialCombat();
    }
  }

  function handleResetAllSaveData() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('rpg_2048') || k.startsWith('2048RPG') || k === 'rpg_2048_inventory_v2' || k === 'rpg_2048_equipped_gear')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    if (window.appRouter) {
      window.appRouter.stageManager.resetSaveData();
      if (window.appRouter.stageManager.tutorialManager) {
        window.appRouter.stageManager.tutorialManager.setCompleted(false);
      }
      if (window.appRouter.dailyLoopManager) {
        window.appRouter.dailyLoopManager.resetAll();
      }
      window.appRouter.initInventoryManager();
      window.appRouter.syncHud();
    }

    window.currentSelectedStage = 0;
    saveCampUpgrades({ forge: 1, capacity: 1, afk: 1 });

    renderAdventureStage(0);
    renderGearInventory();
    renderHeroCards();
    renderCampUpgrades();
    renderCompendiumView();
    syncShopDisplay();

    closeSettingsModal();
    alert('🗑️ 本地存檔已徹底重置！所有進度、金幣與裝備已恢復為初始狀態，冒險主頁已為您就緒序章新手教學。');
  }

  // Hook into Camp Facility Buttons
  window.addEventListener('DOMContentLoaded', () => {
    const forgeBtn = document.getElementById('camp-btn-forge-upgrade');
    if (forgeBtn) forgeBtn.onclick = () => upgradeCampBuilding('forge');

    const bagBtn = document.getElementById('camp-btn-bag-expand');
    if (bagBtn) bagBtn.onclick = () => upgradeCampBuilding('capacity');

    const singleGachaBtn = document.getElementById('camp-btn-gacha-single');
    if (singleGachaBtn) singleGachaBtn.onclick = () => handleQuickGachaPull(1);

    const tenGachaBtn = document.getElementById('camp-btn-gacha-ten');
    if (tenGachaBtn) tenGachaBtn.onclick = () => handleQuickGachaPull(10);

    const gearActGacha = document.getElementById('gear-btn-act-gacha');
    if (gearActGacha) gearActGacha.onclick = () => openQuickGachaModal();

    const gearActExpand = document.getElementById('gear-btn-act-expand');
    if (gearActExpand) gearActExpand.onclick = () => openUpgradeCapacityModal();

    const gearActMerge = document.getElementById('gear-btn-act-merge');
    if (gearActMerge) gearActMerge.onclick = () => handleOneKeyMerge();

    renderCampUpgrades();
    syncShopDisplay();
  });

  // Global Exports
  window.t = t;
  window.setLanguage = setLanguage;
  window.switchMainTab = switchMainTab;
  window.switchGearSubTab = switchGearSubTab;
  window.changeStageByStep = changeStageByStep;
  window.renderAdventureStage = renderAdventureStage;
  window.openStageDetailModal = openStageDetailModal;
  window.closeStageDetailModal = closeStageDetailModal;
  window.launchStageBattle = launchStageBattle;
  window.openQuickStageDrawer = openQuickStageDrawer;
  window.closeQuickStageDrawer = closeQuickStageDrawer;
  window.openDailySignInModal = openDailySignInModal;
  window.closeDailySignInModal = closeDailySignInModal;
  window.handleSignInButtonClick = handleSignInButtonClick;
  window.handleSignInOverlayClick = handleSignInOverlayClick;
  window.openDailyQuestsModal = openDailyQuestsModal;
  window.closeDailyQuestsModal = closeDailyQuestsModal;
  window.renderDailyQuests = renderDailyQuests;
  window.claimDailyActivityChest = claimDailyActivityChest;
  window.upgradeCampBuilding = upgradeCampBuilding;
  window.playButtonCoinSpendVfx = playButtonCoinSpendVfx;
  window.openQuickGachaModal = openQuickGachaModal;
  window.closeQuickGachaModal = closeQuickGachaModal;
  window.handleQuickGachaPull = handleQuickGachaPull;
  window.closeGachaResultModal = closeGachaResultModal;
  window.openUpgradeCapacityModal = openUpgradeCapacityModal;
  window.closeUpgradeCapacityModal = closeUpgradeCapacityModal;
  window.handleConfirmCapacityUpgrade = handleConfirmCapacityUpgrade;
  window.unequipActiveGear = unequipActiveGear;
  window.renderGearInventory = renderGearInventory;
  window.handleOneKeyMerge = handleOneKeyMerge;
  window.renderHeroCards = renderHeroCards;
  window.openHeroDetailModal = openHeroDetailModal;
  window.closeHeroDetailModal = closeHeroDetailModal;
  window.deployFromModal = deployFromModal;
  window.upgradeHeroFromModal = upgradeHeroFromModal;
  window.deployHero = deployHero;
  window.upgradeHero = upgradeHero;
  window.switchCompTab = switchCompTab;
  window.renderCompendiumView = renderCompendiumView;
  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.changeLanguageFromSelect = changeLanguageFromSelect;
  window.switchSettingTab = switchSettingTab;
  window.changeThemeSkin = changeThemeSkin;
  window.changeTileStyle = changeTileStyle;
  window.toggleInstantSkill = toggleInstantSkill;
  window.handleResetTutorial = handleResetTutorial;
  window.replayTutorialCombat = replayTutorialCombat;
  window.handleResetAllSaveData = handleResetAllSaveData;
  window.syncShopDisplay = syncShopDisplay;
  window.buyNoAdsPass = buyNoAdsPass;
  window.buyUnlimitedStamina = buyUnlimitedStamina;
  window.claimShopDailyGift = claimShopDailyGift;
  window.watchAdForGold = watchAdForGold;
  window.claimTestRecharge = claimTestRecharge;
  window.showStaminaInfo = showStaminaInfo;

})(window);
