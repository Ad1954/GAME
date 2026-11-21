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







  // C-STORY-164: Dynamically resolve hero artwork corresponding to equipped gear power



  function getHeroImg(val) {



    const v = Number(val) || 2;



    const tier = Math.max(1, Math.min(17, Math.round(Math.log2(v))));



    const pad = String(tier).padStart(2, '0');



    return `assets/images/hero_knight/hero_${pad}.png`;



  }







  // C-STORY-164: Dynamically sync hero portrait, tier badge and battle posture across all loadout UI



  function syncEquippedHeroVisuals(equipped) {



    if (!window.appRouter) return;



    if (equipped === undefined) {



      equipped = window.appRouter.getEquippedGear();



    }



    const v = (equipped && (equipped.value || equipped.val)) ? (equipped.value || equipped.val) : 2;



    const tier = Math.max(1, Math.min(17, Math.round(Math.log2(v))));



    const heroImgSrc = getHeroImg(v);



    const heroThemes = window.appRouter.HERO_THEMES || {};



    const postureName = (heroThemes[v] && heroThemes[v].name) ? heroThemes[v].name : '初階勇者';







    // 1. Update deploy-hero-img in active deployment box



    const deployHeroImg = document.getElementById('deploy-hero-img');



    if (deployHeroImg) {



      deployHeroImg.src = heroImgSrc;



      deployHeroImg.alt = `Hero Tier ${tier} (${v})`;



    }







        // 2. Update warrior, merchant, and archer avatars in hero roster grid (C-STORY-170)
    const avatarWarrior = document.getElementById('avatar-warrior');
    if (avatarWarrior) {
      avatarWarrior.src = heroImgSrc;
    }
    const avatarMerchant = document.getElementById('avatar-merchant');
    if (avatarMerchant) {
      avatarMerchant.src = heroImgSrc;
    }
    const avatarArcher = document.getElementById('avatar-archer');
    if (avatarArcher) {
      avatarArcher.src = heroImgSrc;
    }







    // 3. Update hero detail modal



    const modalHeroPortrait = document.getElementById('modal-hero-portrait');



    const modalHeroTier = document.getElementById('modal-hero-tier-label');



    const modalHeroPosture = document.getElementById('modal-hero-posture-label');



    if (modalHeroPortrait) modalHeroPortrait.src = heroImgSrc;



    if (modalHeroTier) modalHeroTier.textContent = `Tier ${tier} (戰力 ${v})`;



    if (modalHeroPosture) modalHeroPosture.textContent = `✦ ${postureName}戰鬥姿態`;



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







  // C-STORY-168: Monster Scale Tuning Configuration & Dual-Tier Resolver (Translate X & Per-Monster Overrides)
  const DEFAULT_MONSTER_SCALE_MAP = {
    2: { scale: 0.80, translateY: 6, translateX: 0 },
    4: { scale: 0.80, translateY: 6, translateX: 0 },
    8: { scale: 0.82, translateY: 6, translateX: 0 },
    16: { scale: 0.85, translateY: 5, translateX: 0 },
    32: { scale: 0.88, translateY: 4, translateX: 0 },
    64: { scale: 0.95, translateY: 2, translateX: 0 },
    128: { scale: 1.05, translateY: 0, translateX: 0 },
    256: { scale: 1.15, translateY: -2, translateX: 0 },
    512: { scale: 1.30, translateY: -4, translateX: 0 },
    1024: { scale: 1.40, translateY: -6, translateX: 0 },
    2048: { scale: 1.48, translateY: -8, translateX: 0 },
    4096: { scale: 1.55, translateY: -10, translateX: 0 }
  };
  window.DEFAULT_MONSTER_SCALE_MAP = DEFAULT_MONSTER_SCALE_MAP;

  // Specific overrides for particular monsters (e.g., Slimes that are chubby and need extra shrinkage)
  const DEFAULT_SPECIFIC_OVERRIDES = {
    'ch01_08': { scale: 0.72, translateY: 8, translateX: 0 }, // Ch 1 Green Slime
    'ch02_16': { scale: 0.76, translateY: 7, translateX: 0 }, // Ch 2 Flame Slime
    'ch03_512': { scale: 0.88, translateY: 4, translateX: 0 }  // Ch 3 Stone Golem (C-STORY-171: Native perfect fit)
  };
  window.DEFAULT_SPECIFIC_OVERRIDES = DEFAULT_SPECIFIC_OVERRIDES;

  function getMonsterScaleConfig(chapter, val) {
    if (val === undefined) {
      val = chapter;
      chapter = 1;
    }
    const numVal = Number(val) || 8;
    const ch = Number(chapter) || 1;
    const chPad = String(ch).padStart(2, '0');
    const valPad = String(numVal).padStart(2, '0');
    const specKey = `ch${chPad}_${valPad}`;
    const specKeyShort = `ch${ch}_${numVal}`;

    let cfg = null;
    try {
      const stored = localStorage.getItem('custom_monster_scale_map');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) {
          if (parsed[specKey]) cfg = parsed[specKey];
          else if (parsed[specKeyShort]) cfg = parsed[specKeyShort];
          else if (parsed[numVal]) cfg = parsed[numVal];
        }
      }
    } catch (e) {}

    if (!cfg) {
      if (DEFAULT_SPECIFIC_OVERRIDES[specKey]) {
        cfg = DEFAULT_SPECIFIC_OVERRIDES[specKey];
      } else if (DEFAULT_SPECIFIC_OVERRIDES[specKeyShort]) {
        cfg = DEFAULT_SPECIFIC_OVERRIDES[specKeyShort];
      } else if (DEFAULT_MONSTER_SCALE_MAP[numVal]) {
        cfg = DEFAULT_MONSTER_SCALE_MAP[numVal];
      } else if (numVal >= 4096) {
        // Ceiling clamp: >= 4096 inherits boss ceiling scale (4096)
        cfg = DEFAULT_MONSTER_SCALE_MAP[4096];
      } else {
        cfg = { scale: 1.0, translateY: 0, translateX: 0 };
      }
    }

    return {
      scale: (cfg && typeof cfg.scale === 'number') ? cfg.scale : 1.0,
      translateY: (cfg && typeof cfg.translateY === 'number') ? cfg.translateY : 0,
      translateX: (cfg && typeof cfg.translateX === 'number') ? cfg.translateX : 0
    };
  }
  window.getMonsterScaleConfig = getMonsterScaleConfig;

  function renderAdventureStage(stageId) {



    const maxU = getMaxUnlocked();



    const tutDone = isTutorialCompleted();







    if (stageId !== undefined) {
      window.currentSelectedStage = stageId;
    } else if (window.currentSelectedStage !== undefined) {
      // Preserve currently viewed stage upon re-render (C-STORY-171)
    } else if (!tutDone) {
      window.currentSelectedStage = 0; // Default to Tutorial if not completed
    } else {
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
        const sc = getMonsterScaleConfig(1, 8);
        arenaBossImg.style.transform = `scale(${sc.scale}) translate(${sc.translateX || 0}px, ${sc.translateY || 0}px)`;
        arenaBossImg.style.transformOrigin = 'center bottom';



      }



      if (arenaBossName) arenaBossName.textContent = '首領：哥布林首領 (8)';

      const affixBadgeTut = document.getElementById('stage-affix-badge');

      if (affixBadgeTut) affixBadgeTut.style.display = 'none';



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



      // C-STORY-166: Dynamic Chapter Arena Background Routing
      const arenaBgImg = document.querySelector('.stage-artwork-card .arena-bg-img');
      if (arenaBgImg) {
        const CHAPTER_BG_MAP = {
          0: 'assets/images/map_integrated_world_road.jpg',
          1: 'assets/images/chapters/ch01_breeze_plain.jpg',
          2: 'assets/images/chapters/ch02_molten_lava.jpg',
          3: 'assets/images/chapters/ch03_isolated_peaks.jpg',
          4: 'assets/images/chapters/ch04_spider_desert.jpg',
          5: 'assets/images/chapters/ch05_ancient_palace.jpg',
          6: 'assets/images/chapters/ch06_obsidian_dragon.jpg',
          7: 'assets/images/chapters/ch07_abyss_rift.jpg',
          8: 'assets/images/chapters/ch08_celestial_seat.jpg'
        };
        const targetBg = CHAPTER_BG_MAP[ch] || 'assets/images/map_integrated_world_road.jpg';
        arenaBgImg.src = targetBg;
        arenaBgImg.onerror = () => { arenaBgImg.src = 'assets/images/map_integrated_world_road.jpg'; };
      }



      const rawMonsters = Array.isArray(cfg.monsters) ? cfg.monsters : [8];



      // C-STORY-165: Correctly find highest monster value as Boss (instead of taking the first minion)

      let bossVal = 0;

      let bossEntry = null;

      for (const m of rawMonsters) {

        const v = (typeof m === 'object' && m !== null) ? m.value : Number(m);

        if (v >= bossVal) {

          bossVal = v;

          bossEntry = m;

        }

      }

      if (!bossVal) {

        bossVal = 8;

        bossEntry = 8;

      }

      const isSplitterBoss = (typeof bossEntry === 'object' && bossEntry !== null && !!(bossEntry.canSplit || bossEntry.splitOnDeath));



      const bossTheme = getMonsterThemeInfo(ch, bossVal);



      const activeIconStyle = (window.appRouter && window.appRouter.activeIconStyle) ? window.appRouter.activeIconStyle : 'style_e_clay';



      if (arenaBossImg) {



        const imgPath = (window.appRouter && typeof window.appRouter.getMonsterImagePath === 'function')



          ? window.appRouter.getMonsterImagePath(ch, bossVal, activeIconStyle)



          : getMonsterImg(bossVal, ch);



        arenaBossImg.src = imgPath || getMonsterImg(bossVal, ch);



        arenaBossImg.onerror = () => { arenaBossImg.src = 'assets/images/monsters_clay/monster_ch01_08.png'; };
        const sc = getMonsterScaleConfig(ch, bossVal);
        arenaBossImg.style.transform = `scale(${sc.scale}) translate(${sc.translateX || 0}px, ${sc.translateY || 0}px)`;
        arenaBossImg.style.transformOrigin = 'center bottom';



      }



      if (arenaBossName) {
        arenaBossName.textContent = `首領：${bossTheme.name || '魔物'} (${bossVal})`;
        arenaBossName.title = `首領：${bossTheme.name || '魔物'} (${bossVal})`;
      }
      const stageAffixBadge = document.getElementById('stage-affix-badge');
      if (stageAffixBadge) {
        if (isSplitterBoss) {
          stageAffixBadge.style.display = 'flex';
          stageAffixBadge.innerHTML = '⚔️ 分裂魔物';
          stageAffixBadge.title = '此首領擊敗後會分裂為 2 隻次階魔物！';
        } else {
          stageAffixBadge.style.display = 'none';
        }
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



        if (typeof m === 'object' && m !== null && (m.canSplit || m.splitOnDeath)) {

          const splitBadge = document.createElement('span');

          splitBadge.style.cssText = 'position:absolute; top:2px; right:2px; font-size:0.6rem; background:#ef4444; color:#fff; border-radius:4px; padding:1px 3px; font-weight:bold; z-index:20; box-shadow:0 1px 3px rgba(0,0,0,0.8); pointer-events:none; border:1px solid rgba(255,255,255,0.4);';

          splitBadge.textContent = '分裂';

          card.appendChild(splitBadge);

        }



        minionsList.appendChild(card);



      });



    }







    syncEquippedHeroVisuals();



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
      const sm = window.appRouter.stageManager;
      if (sm && sm.hasActiveBattleSnapshot()) {
        const snap = sm.getActiveBattleSnapshot();
        const targetStage = window.currentSelectedStage !== undefined ? window.currentSelectedStage : 1;
        if (snap && snap.stageId === targetStage) {
          window.appRouter.startCombat(targetStage);
          sm.resumeActiveBattle();
          return;
        } else if (snap) {
          const abandonConfirm = confirm(`檢測到第 ${snap.stageId} 關有未完成戰鬥，是否放棄並開始第 ${targetStage} 關？`);
          if (!abandonConfirm) return;
          sm.clearActiveBattleSnapshot();
        }
      }

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

    const tiers = (window.appRouter && window.appRouter.BASE_STAT_TIERS) || [];
    const maxTier = tiers.length > 0 ? tiers[tiers.length - 1].tier : 66;
    const curLv = Math.max(1, Math.min(maxTier, Number(lv) || 1));

    const curCfg = getForgeTierConfigByLevel(curLv);

    const [r0, r1, r2] = curCfg.baseRange;

    if (curLv >= maxTier) {

      return `已達王國最高軍備等級 (Tier ${maxTier}，固定產出終極神裝)`;

    }







    const nextCfg = getForgeTierConfigByLevel(curLv + 1);



    const [nr0, nr1, nr2] = nextCfg.baseRange;



    const [nw0, nw1, nw2] = nextCfg.weights.map(w => Math.round(w * 100));







    // C-STORY-159: Only display next tier state, no current state repetition!



    if (nr0 > r0) {



      // Major tier leap:淘汰舊裝備，標注前置武器門檻



      const reqWeapon = nextCfg.minEquippedWeapon || (r2 * 2);



      return `【重要提升】升級產出 ${nr0}、${nr1}、${nr2}（淘汰裝備 ${r0}）（需裝備數值 ${reqWeapon} 以上裝備）`;



    }



    // Normal level upgrade



    return `提升裝備 ${r1}、${r2} 生成機率至 ${nw1}% / ${nw2}%`;



  }







  function renderCampUpgrades() {

    const sm = window.appRouter ? window.appRouter.stageManager : null;
    const upg = getCampUpgrades();
    if (sm) {
      upg.forge = sm.baseTier || 1;
      upg.capacity = (sm.warehouseExpansionLevel || 0) + 1;
    }

    // 1. 鐵匠鋪 (單一事實來源：直接讀取 StageManager / BASE_STAT_TIERS 66 階表)
    const forgeTitleEl = document.getElementById('camp-txt-forge-title');
    const forgeDescEl = document.getElementById('camp-txt-forge-desc');
    const forgeBtnEl = document.getElementById('camp-btn-forge-upgrade');

    const nextTierCfg = sm ? sm.getNextBaseTierConfig() : null;
    const forgeCost = nextTierCfg ? nextTierCfg.cost : 0;

    if (forgeTitleEl) forgeTitleEl.textContent = `皇家鐵匠鋪 LV.${upg.forge}`;
    if (forgeDescEl) forgeDescEl.textContent = getForgePlainDescription(upg.forge);

    if (forgeBtnEl) {
      if (!nextTierCfg) {
        forgeBtnEl.disabled = true;
        forgeBtnEl.className = 'cr-btn cr-btn-disabled btn-small';
        forgeBtnEl.textContent = '已滿級';
      } else {
        forgeBtnEl.disabled = false;
        forgeBtnEl.className = 'cr-btn cr-btn-green btn-small';
        forgeBtnEl.textContent = `升級 🪙${forgeCost.toLocaleString()}`;
      }
    }

    // 2. 軍需背包行囊 (單一事實來源：直接讀取 StageManager.getWarehouseConfig)
    const bagTitleEl = document.getElementById('camp-txt-bag-title');
    const bagDescEl = document.getElementById('camp-txt-bag-desc');
    const bagBtnEl = document.getElementById('camp-btn-bag-expand');

    const whCfg = sm ? sm.getWarehouseConfig() : null;
    const curCap = (sm && sm.inventory) ? sm.inventory.maxCapacity : (16 + (upg.capacity - 1) * 4);
    const nextCap = curCap + 4;
    const capCost = whCfg ? whCfg.cost : (200 * upg.capacity);

    if (bagTitleEl) bagTitleEl.textContent = `軍需行囊 (${curCap} ➔ ${nextCap}格)`;
    if (bagDescEl) bagDescEl.textContent = `目前可存放 ${curCap} 件裝備 ➔ 擴充後容量提升至 ${nextCap} 格，可儲備更多合成神裝`;
    if (bagBtnEl) bagBtnEl.textContent = `擴充 🪙${capCost.toLocaleString()}`;

    // 3. 裝備轉蛋機等級與經驗條 (#7 精簡排版：LV 接標題尾端、EXP 靠左)
    const gachaTitleEl = document.getElementById('camp-txt-gacha-title');
    const gachaExpEl = document.getElementById('camp-gacha-exp-text');
    const gachaBarEl = document.getElementById('camp-gacha-exp-bar');
    if (sm && sm.gachaEngine && (gachaTitleEl || gachaExpEl || gachaBarEl)) {
      const gExp = sm.gachaExp || 0;
      const gLvl = sm.gachaEngine.calculateLevel(gExp);
      const gCfg = sm.gachaEngine.getConfig(gLvl);
      const prevThreshold = gLvl > 1 ? (sm.gachaEngine.getConfig(gLvl - 1).expThreshold || 0) : 0;
      const nextThreshold = gCfg.expThreshold;
      const isMax = !nextThreshold || !isFinite(nextThreshold) || gLvl >= 8;

      if (gachaTitleEl) {
        gachaTitleEl.textContent = `裝備轉蛋機 LV.${gLvl}`;
      }
      if (isMax) {
        if (gachaExpEl) gachaExpEl.textContent = `EXP ${gExp} (MAX)`;
        if (gachaBarEl) gachaBarEl.style.width = '100%';
      } else {
        const span = Math.max(1, nextThreshold - prevThreshold);
        const pct = Math.max(0, Math.min(100, Math.round(((gExp - prevThreshold) / span) * 100)));
        if (gachaExpEl) gachaExpEl.textContent = `EXP ${gExp} / ${nextThreshold}`;
        if (gachaBarEl) gachaBarEl.style.width = `${pct}%`;
      }
    }

    // 4. 黃金討伐活動關與全日常章節成長係數
    const evTitleEl = document.getElementById('camp-txt-event-title');
    const evSubEl = document.getElementById('camp-txt-event-sub');
    const evBtnEl = document.getElementById('camp-btn-event-claim');
    if (sm && window.appRouter && typeof window.appRouter.getDailyEconomyScaling === 'function' && (evTitleEl || evBtnEl)) {
      const sc = window.appRouter.getDailyEconomyScaling(sm.unlockedStageId || 1);
      const dlm = window.appRouter.dailyLoopManager;
      const claimed = !!(dlm && dlm.state && dlm.state.eventStageClaimedToday);

      if (!sc.eventUnlocked) {
        if (evTitleEl) evTitleEl.textContent = `黃金討伐活動關 🔒`;
        if (evSubEl) evSubEl.textContent = `通過第 20 關解鎖 · 日常獎勵 x${sc.dailyMult.toFixed(1)}`;
        if (evBtnEl) {
          evBtnEl.disabled = true;
          evBtnEl.className = 'cr-btn cr-btn-disabled btn-small';
          evBtnEl.textContent = '🔒 未解鎖';
        }
      } else {
        if (evTitleEl) evTitleEl.textContent = `黃金討伐 LV.${sc.eventLevel}`;
        if (evSubEl) {
          const nextHint = sc.nextUnlockStage ? ` · 第${sc.nextUnlockStage}關升級` : ' · 已滿級';
          evSubEl.textContent = `日常獎勵 x${sc.dailyMult.toFixed(1)}${nextHint}`;
        }
        if (evBtnEl) {
          if (claimed) {
            evBtnEl.disabled = true;
            evBtnEl.className = 'cr-btn cr-btn-disabled btn-small';
            evBtnEl.textContent = '✅ 今日已領';
          } else {
            evBtnEl.disabled = false;
            evBtnEl.className = 'cr-btn cr-btn-amber btn-small';
            evBtnEl.textContent = `領取 🪙${sc.eventRewardGold.toLocaleString()}`;
          }
        }
      }
    }

  }

  function handleClaimEventStage() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const res = window.appRouter.dailyLoopManager.claimEventStageReward();
    if (!res.success) {
      alert(`⚠️ ${res.reason}`);
      return;
    }
    if (window.appRouter.audio) window.appRouter.audio.playVictory();
    window.appRouter.syncHud();
    renderCampUpgrades();
  }
  window.handleClaimEventStage = handleClaimEventStage;

  function openCampInfoModal(type) {
    const modal = document.getElementById('modal-camp-info');
    const titleEl = document.getElementById('camp-info-modal-title');
    const bodyEl = document.getElementById('camp-info-modal-body');
    if (!modal || !titleEl || !bodyEl || !window.appRouter) return;

    const sm = window.appRouter.stageManager;
    if (window.appRouter.audio) window.appRouter.audio.playClick();

    if (type === 'forge') {
      const curLv = sm.baseTier || 1;
      const curCfg = sm.getBaseTierConfig();
      const nextCfg = sm.getNextBaseTierConfig();
      const [r0, r1, r2] = curCfg.baseRange;
      const [w0, w1, w2] = curCfg.weights.map(w => Math.round(w * 100));

      titleEl.textContent = `🔨 皇家鐵匠鋪 LV.${curLv} 詳情`;
      let nextHtml = `<div style="color:#4ade80; font-weight:700; margin-top:8px;">👑 已達王國最高軍備等級！</div>`;
      if (nextCfg) {
        const [nr0, nr1, nr2] = nextCfg.baseRange;
        const [nw0, nw1, nw2] = nextCfg.weights.map(w => Math.round(w * 100));
        const gateHtml = nextCfg.minEquippedWeapon
          ? `<div style="color:#fbbf24; margin-top:4px;">⚠️ 前置門檻：需持有或穿戴 <b>數值 ${nextCfg.minEquippedWeapon.toLocaleString()}</b> 以上裝備</div>`
          : '';
        const majorTag = nextCfg.isMajor ? `<span style="background:#ef4444; color:#fff; font-size:0.65rem; padding:1px 5px; border-radius:4px; margin-left:4px;">大突破</span>` : '';
        nextHtml = `
          <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:10px; margin-top:8px;">
            <div style="color:#38bdf8; font-weight:800; margin-bottom:4px;">下一階：LV.${nextCfg.tier} ${nextCfg.name || ''}${majorTag}</div>
            <div>升級費用：<b style="color:#fbbf24;">🪙 ${nextCfg.cost.toLocaleString()}</b></div>
            <div>盤面產出：<b>${nr0}</b> (${nw0}%) / <b>${nr1}</b> (${nw1}%) / <b>${nr2}</b> (${nw2}%)</div>
            ${nr0 > r0 ? `<div style="color:#4ade80; margin-top:3px;">✨ 徹底淘汰低階裝備 ${r0}！</div>` : ''}
            ${gateHtml}
          </div>
        `;
      }

      bodyEl.innerHTML = `
        <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(148,163,184,0.25); border-radius:8px; padding:10px;">
          <div style="color:#fbbf24; font-weight:800; margin-bottom:4px;">目前階級：LV.${curLv} ${curCfg.name || ''}</div>
          <div>盤面產出：<b>${r0}</b> (${w0}%) / <b>${r1}</b> (${w1}%) / <b>${r2}</b> (${w2}%)</div>
          <div style="font-size:0.72rem; color:#94a3b8; margin-top:4px;">提升鐵匠鋪可提高戰鬥盤面自然生成裝備的數值與高階機率，大幅加速 2048 合成節奏。</div>
        </div>
        ${nextHtml}
      `;
    } else if (type === 'gacha') {
      const gExp = sm.gachaExp || 0;
      const gLvl = sm.gachaEngine.calculateLevel(gExp);
      const gCfg = sm.gachaEngine.getConfig(gLvl);
      const rates = sm.gachaEngine.getRatesPreview(gLvl);
      const isMax = !gCfg.expThreshold || !isFinite(gCfg.expThreshold) || gLvl >= 8;

      titleEl.textContent = `🎰 裝備轉蛋機 LV.${gLvl} 詳情`;
      const ratesHtml = rates.map(r => `
        <div style="display:flex; justify-content:space-between; padding:3px 6px; border-bottom:1px solid rgba(148,163,184,0.12);">
          <span>裝備數值 <b style="color:#fbbf24;">${r.value}</b></span>
          <span style="color:#38bdf8; font-weight:700;">${r.percentage}</span>
        </div>
      `).join('');

      bodyEl.innerHTML = `
        <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(251,191,36,0.25); border-radius:8px; padding:10px; margin-bottom:8px;">
          <div style="color:#fbbf24; font-weight:800;">${gCfg.name || `LV.${gLvl}`} (最高產出 ${gCfg.maxDropValue})</div>
          <div style="font-size:0.74rem; color:#cbd5e1; margin-top:3px;">
            累積抽數：<b>${gExp}</b> ${isMax ? '(已達最高級)' : `（再抽 <b>${Math.max(0, gCfg.expThreshold - gExp)}</b> 次升級至 LV.${gLvl + 1}）`}
          </div>
          <div style="font-size:0.72rem; color:#4ade80; margin-top:4px;">🎁 十連抽必得 1 件應急道具（40% 沙漏 / 35% 戰槌 / 25% 重弩）</div>
        </div>
        <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(148,163,184,0.25); border-radius:8px; padding:8px;">
          <div style="font-size:0.74rem; color:#94a3b8; font-weight:700; margin-bottom:4px;">目前裝備掉落機率表：</div>
          ${ratesHtml}
        </div>
      `;
    } else if (type === 'bag') {
      const curCap = (sm && sm.inventory) ? sm.inventory.maxCapacity : 16;
      const whCfg = sm.getWarehouseConfig();
      const expLv = sm.warehouseExpansionLevel || 0;

      titleEl.textContent = `🎒 軍需行囊詳情`;
      bodyEl.innerHTML = `
        <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(52,211,153,0.25); border-radius:8px; padding:10px;">
          <div>目前容量：<b style="color:#34d399;">${curCap} 格</b>（已擴充 ${expLv} 次）</div>
          <div style="margin-top:4px;">下次擴充：<b>+4 格</b>（提升至 <b>${curCap + 4} 格</b>）</div>
          <div style="margin-top:4px;">擴充費用：<b style="color:#fbbf24;">🪙 ${(whCfg ? whCfg.cost : 200).toLocaleString()}</b></div>
          <div style="font-size:0.74rem; color:#94a3b8; margin-top:8px;">擴充裝備庫容量可同時儲備更多轉蛋神兵，方便進行一鍵連環合成與囤積突破門檻武器。</div>
        </div>
      `;
    } else if (type === 'event') {
      const sc = window.appRouter.getDailyEconomyScaling(sm.unlockedStageId || 1);
      const tiers = window.appRouter.EVENT_STAGE_TIERS || [];
      titleEl.textContent = `🏆 黃金討伐與日常成長係數`;
      const rowsHtml = tiers.map(t => {
        const isCur = t.level === sc.eventLevel;
        const bg = isCur ? 'background:rgba(56,189,248,0.18); border-radius:6px; font-weight:800;' : '';
        const stRange = t.maxStage >= 999 ? `第 ${t.minStage} 關+` : `第 ${t.minStage}~${t.maxStage} 關`;
        const evTxt = t.unlocked ? `${t.name} (🪙${t.rewardGold.toLocaleString()})` : '🔒 未解鎖';
        return `
          <div style="display:flex; justify-content:space-between; padding:4px 6px; border-bottom:1px solid rgba(148,163,184,0.12); font-size:0.73rem; ${bg}">
            <span>${isCur ? '👉 ' : ''}${stRange}</span>
            <span style="color:#38bdf8;">日常 x${t.dailyMult.toFixed(1)}</span>
            <span style="color:#fbbf24;">${evTxt}</span>
          </div>
        `;
      }).join('');

      bodyEl.innerHTML = `
        <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(251,191,36,0.25); border-radius:8px; padding:10px; margin-bottom:8px;">
          <div>目前主線進度：<b style="color:#38bdf8;">第 ${sm.unlockedStageId || 1} 關</b></div>
          <div style="margin-top:3px;">日常收益倍率：<b style="color:#4ade80;">x${sc.dailyMult.toFixed(1)}</b>（套用於簽到、每日任務、商店免費、廣告金幣）</div>
          <div style="margin-top:3px;">活動關卡等級：<b style="color:#fbbf24;">${sc.eventUnlocked ? `${sc.eventName} (每日 🪙${sc.eventRewardGold.toLocaleString()})` : '🔒 通過第 20 關解鎖'}</b></div>
        </div>
        <div style="background:rgba(15,23,42,0.8); border:1px solid rgba(148,163,184,0.25); border-radius:8px; padding:8px;">
          <div style="font-size:0.74rem; color:#94a3b8; font-weight:700; margin-bottom:4px;">章節成長係數與活動關卡階梯表：</div>
          ${rowsHtml}
        </div>
      `;
    }

    modal.style.display = 'flex';
  }

  function closeCampInfoModal() {
    const modal = document.getElementById('modal-camp-info');
    if (modal) modal.style.display = 'none';
  }

  window.openCampInfoModal = openCampInfoModal;
  window.closeCampInfoModal = closeCampInfoModal;

  function upgradeCampBuilding(type) {

    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    const upg = getCampUpgrades();

    if (type === 'forge') {
      const btnEl = document.getElementById('camp-btn-forge-upgrade');
      const res = sm.upgradeBaseTier();
      if (!res.success) {
        alert(`⚠️ ${res.reason}`);
        return;
      }
      const spentCost = (res.tierConfig && res.tierConfig.cost) ? res.tierConfig.cost : 0;
      playButtonCoinSpendVfx(btnEl, spentCost);
      upg.forge = sm.baseTier;
      saveCampUpgrades(upg);
      if (window.appRouter.audio) window.appRouter.audio.playCoin();
      window.appRouter.syncHud();
      renderCampUpgrades();
      return;
    }

    if (type === 'capacity') {
      const btnEl = document.getElementById('camp-btn-bag-expand');
      const res = sm.upgradeWarehouse();
      if (!res.success) {
        alert(`⚠️ ${res.reason}`);
        return;
      }
      playButtonCoinSpendVfx(btnEl, res.cost || 0);
      upg.capacity = (sm.warehouseExpansionLevel || 0) + 1;
      saveCampUpgrades(upg);
      if (window.appRouter.inventoryManager) {
        window.appRouter.inventoryManager.maxCapacity = sm.inventory.maxCapacity;
      }
      if (window.appRouter.audio) window.appRouter.audio.playCoin();
      window.appRouter.syncHud();
      renderCampUpgrades();
      renderGearInventory();
      return;
    }

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



    const btnEl = count === 1
      ? document.getElementById('camp-btn-gacha-single')
      : document.getElementById('camp-btn-gacha-ten');

    const res = window.appRouter.performGacha(count);

    if (res.success && res.items) {
      const spentCost = res.cost || (count === 1 ? 100 : 1000);
      playButtonCoinSpendVfx(btnEl, spentCost);
      closeQuickGachaModal();
      showGachaResults(res.items);
      renderGearInventory();
      renderCampUpgrades();
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







  function closeGearPopover() {



    const existingBackdrop = document.getElementById('gear-popover-backdrop');



    if (existingBackdrop) existingBackdrop.remove();



    const existingPopover = document.getElementById('gear-action-popover');



    if (existingPopover) existingPopover.remove();



  }







  function openGearPopover(slotEl, it, isEq) {



    closeGearPopover();







    const backdrop = document.createElement('div');



    backdrop.className = 'gear-popover-backdrop';



    backdrop.id = 'gear-popover-backdrop';



    backdrop.onclick = (e) => {



      e.stopPropagation();



      closeGearPopover();



    };







    const popover = document.createElement('div');



    popover.className = 'gear-action-popover';



    popover.id = 'gear-action-popover';







    const rect = slotEl.getBoundingClientRect();



    const popoverWidth = 140;



    const popoverHeight = 90;



    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);



    let top = rect.top - popoverHeight - 8;







    if (left < 10) left = 10;



    if (left + popoverWidth > window.innerWidth - 10) left = window.innerWidth - popoverWidth - 10;



    if (top < 10) {



      top = rect.bottom + 8;



    }







    popover.style.left = `${Math.round(left)}px`;



    popover.style.top = `${Math.round(top)}px`;







    // 1. Equip Button



    const equipBtn = document.createElement('button');



    equipBtn.type = 'button';



    equipBtn.className = 'popover-btn popover-btn-equip';



    if (isEq) {



      equipBtn.innerHTML = '🛡️ 已配戴中';



      equipBtn.style.opacity = '0.6';



      equipBtn.style.cursor = 'default';



    } else {



      equipBtn.innerHTML = '🗡️ 配戴出擊';



      equipBtn.onclick = (e) => {



        e.stopPropagation();



        closeGearPopover();



        window.appRouter.equipGearItem(it);



        renderGearInventory();



      };



    }



    popover.appendChild(equipBtn);







    // 2. Lock / Unlock Button



    const lockBtn = document.createElement('button');



    lockBtn.type = 'button';



    if (it.isLocked) {



      lockBtn.className = 'popover-btn popover-btn-unlock';



      lockBtn.innerHTML = '🔓 解除鎖定';



      lockBtn.onclick = (e) => {



        e.stopPropagation();



        it.isLocked = false;



        window.appRouter.saveInventory();



        closeGearPopover();



        renderGearInventory();



      };



    } else {



      lockBtn.className = 'popover-btn popover-btn-lock';



      lockBtn.innerHTML = '🔒 上鎖保存';



      lockBtn.onclick = (e) => {



        e.stopPropagation();



        it.isLocked = true;



        window.appRouter.saveInventory();



        closeGearPopover();



        renderGearInventory();



      };



    }



    popover.appendChild(lockBtn);







    document.body.appendChild(backdrop);



    document.body.appendChild(popover);



  }







  function handleOneKeyMerge() {



    if (!window.appRouter || !window.appRouter.inventoryManager) return;



    const im = window.appRouter.inventoryManager;



    const res = im.batchAutoMerge();

    // Telemetry LOG for batch auto merge
    const sm = window.appRouter.stageManager;
    if (sm && sm.telemetry && res && res.mergedCount > 0) {
      sm.telemetry.recordTownAction({
        action: 'BATCH_AUTO_MERGE',
        goldBefore: sm.gold,
        goldAfter: sm.gold,
        techTier: sm.baseTier,
        equippedPower: im.getEquippedPower(),
        detail: { mergedCount: res.mergedCount, remainingItems: im.items.map(it => it.value || it.val) }
      });
    }

    // #3: Always auto-equip the strongest item in inventory after merge
    if (typeof window.appRouter.autoEquipStrongest === 'function') {
      window.appRouter.autoEquipStrongest();
    }







    window.appRouter.saveInventory();



    renderGearInventory();







    if (res.mergedCount > 0) {



      if (window.appRouter.audio) window.appRouter.audio.playMerge();



      alert(`⚡ 一鍵合成完成！共合成 ${res.mergedCount} 組裝備，釋出 ${res.freedSlots} 格背包空間，最高合成等級 (${res.highestCreated})！`);



    } else {



      alert('⚠️ 目前背包內沒有可供合成的未上鎖成對裝備（需有 2 件同階未鎖定裝備）。');



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



      syncEquippedHeroVisuals(equipped);



    } else {



      if (weaponCardImg) weaponCardImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';



      if (weaponCardName) weaponCardName.textContent = '未裝備神兵';



      syncEquippedHeroVisuals(null);



    }







    // Render backpack slots matching Prototype (.gear-cell.tier-X, 88% image scale, enlarged bottom-right value)



    for (let i = 0; i < maxCap; i++) {



      const slot = document.createElement('div');



      const it = items[i];



      if (it) {



        const v = it.value || it.val || 2;



        const isEq = equipped && (it.id === equipped.id);



        const isLocked = !!it.isLocked;



        slot.className = `gear-cell gear-slot-item tier-${v}${isEq ? ' equipped-slot' : ''}${isLocked ? ' is-locked' : ''}`;



        if (isEq) {



          slot.style.borderColor = '#fbbf24';



        }



        slot.innerHTML = `



          <img src="${getEquipImg(v)}" alt="裝備 ${v}">



          <span class="gear-val">${v}</span>



          ${isEq ? '<span style="position:absolute; top:4px; left:4px; font-size:0.65rem; background:#fbbf24; color:#000; border-radius:4px; padding:1px 4px; font-weight:900; box-shadow:0 1px 3px rgba(0,0,0,0.8); z-index:4;">E</span>' : ''}



          ${isLocked ? '<span class="gear-lock-badge">🔒</span>' : ''}



        `;



        slot.onclick = (e) => {



          e.stopPropagation();



          openGearPopover(slot, it, isEq);



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
      // #5: Strictly compute encountered monsters from stages actually reached (<= maxU)
      const encounteredSet = new Set();
      const stageConfigs = window.appRouter.STAGE_CONFIGS || [];
      for (const st of stageConfigs) {
        if (!st || st.id > maxU) continue;
        const chId = st.chapter || 1;
        for (const mDef of (st.monsters || [])) {
          if (typeof mDef === 'object' && mDef !== null) {
            encounteredSet.add(`${chId}:${mDef.value}`);
            if (mDef.splitOnDeath && mDef.splitValue) {
              encounteredSet.add(`${chId}:${mDef.splitValue}`);
            }
          } else {
            encounteredSet.add(`${chId}:${mDef}`);
          }
        }
      }

      const rawChapters = window.appRouter.CHAPTER_CONFIGS || [];
      const chapterList = rawChapters.length > 0
        ? rawChapters.map(c => ({
            id: c.id,
            name: c.name,
            stageDesc: c.id === 0 ? 'Tutorial' : `Stage ${c.range[0]}~${c.range[1]}`,
            icon: c.icon || '⚔️'
          }))
        : [
            { id: 0, name: '序章：新手訓練所', stageDesc: 'Tutorial', icon: '🎯' },
            { id: 1, name: '第一章：微風之境', stageDesc: 'Stage 1~40', icon: '🌲' }
          ];

      const pools = window.appRouter.CHAPTER_MONSTER_POOLS || {};

      chapterList.forEach(ch => {
        const pool = pools[ch.id] || pools[String(ch.id)] || {};
        const monstersObj = pool.monsters || {};
        const monsters = Object.keys(monstersObj).map(v => ({
          val: Number(v),
          ...monstersObj[v]
        })).sort((a, b) => a.val - b.val);

        if (monsters.length === 0) return;

        const sec = document.createElement('div');
        sec.className = 'comp-group-section';

        let unlockedCount = 0;
        monsters.forEach(m => {
          const isUnlocked = (ch.id === 0) || encounteredSet.has(`${ch.id}:${m.val}`);
          if (isUnlocked) unlockedCount++;
        });

        const title = document.createElement('div');
        title.className = 'comp-group-title';
        title.innerHTML = `
          <span>${ch.icon} ${ch.name} <span style="font-size:0.75rem; color:#94a3b8; font-weight:normal;">(${ch.stageDesc})</span> <span style="font-size:0.75rem; color:#38bdf8; font-weight:700;">(${unlockedCount}/${monsters.length} 已解鎖)</span></span>
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

        monsters.forEach(m => {
          const isUnlocked = (ch.id === 0) || encounteredSet.has(`${ch.id}:${m.val}`);
          const card = document.createElement('div');
          card.style.aspectRatio = '5 / 6';

          const imgSrc = m.clayImg || getMonsterImg(m.val, ch.id);

          if (isUnlocked) {
            card.className = 'compendium-card';
            card.innerHTML = `
              <img src="${imgSrc}" onerror="this.src='assets/images/monsters_clay/monster_ch01_08.png'" style="width:48px; height:48px; object-fit:contain;" alt="${m.name}">
              <span style="font-size:0.75rem; color:#f8fafc; font-weight:bold; text-align:center; margin-top:2px;">${m.name}</span>
              <span style="font-size:0.65rem; color:#fbbf24; font-weight:800;">${m.val}</span>
            `;
          } else {
            card.className = 'compendium-card locked-silhouette';
            card.innerHTML = `
              <img class="comp-silhouette-img" src="${imgSrc}" onerror="this.src='assets/images/monsters_clay/monster_ch01_08.png'" style="width:48px; height:48px; object-fit:contain;" alt="???">
              <span class="locked-mystery-badge">？</span>
              <span style="font-size:0.75rem; color:#64748b; font-weight:bold; text-align:center; margin-top:2px;">??? (未解鎖)</span>
              <span style="font-size:0.65rem; color:#475569; font-weight:800;">${m.val}</span>
            `;
          }
          grid.appendChild(card);
        });

        sec.appendChild(grid);
        area.appendChild(sec);
      });

      // 終極超越：盤面合成魔物 (524,288)
      const specialSec = document.createElement('div');
      specialSec.className = 'comp-group-section';
      const mThemes = window.appRouter.MONSTER_THEMES || {};
      const m524 = mThemes[524288] || { name: '混沌吞天獸', badge: '🪐' };
      const isUnl524 = maxU >= 40;
      specialSec.innerHTML = `
        <div class="comp-group-title">
          <span>🌌 終極超越：盤面合成魔物 <span style="font-size:0.75rem; color:#a855f7; font-weight:700;">(Special Fusion)</span></span>
        </div>
        <div class="comp-group-grid">
          <div class="comp-card ${isUnl524 ? '' : 'locked-silhouette'}">
            <div class="comp-card-val">524288</div>
            <div class="comp-card-img-wrap">
              <img src="assets/images/monsters_clay/monster_ch08_262144.png" alt="${m524.name}" class="${isUnl524 ? '' : 'silhouette-img'}" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
              <span class="comp-card-icon ${isUnl524 ? '' : 'silhouette-icon'}" style="display:none;">${m524.badge || '🪐'}</span>
              ${isUnl524 ? '' : '<div class="silhouette-overlay">❓</div>'}
            </div>
            <div class="comp-card-name ${isUnl524 ? '' : 'locked-name'}">${isUnl524 ? m524.name : '??? (未解鎖)'}</div>
          </div>
        </div>
      `;
      area.appendChild(specialSec);

    } else if (tab === 'gears') {
      const equipThemes = window.appRouter.EQUIPMENT_THEMES || {};
      const GEAR_CYCLES = [
        { name: '⚔️ 新手冒險套裝 (Cycle 1)', tiers: [2, 4, 8, 16] },
        { name: '🛡️ 王國騎士套裝 (Cycle 2)', tiers: [32, 64, 128, 256] },
        { name: '✨ 聖殿神使套裝 (Cycle 3)', tiers: [512, 1024, 2048, 4096] },
        { name: '👑 創世神尊套裝 (Cycle 4)', tiers: [8192, 16384, 32768, 65536] },
        { name: '🌌 萬古極限套裝 (Cycle 5)', tiers: [131072, 262144, 524288] }
      ];

      GEAR_CYCLES.forEach(cycle => {
        const sec = document.createElement('div');
        sec.className = 'comp-group-section';

        let unlockedCount = 0;
        cycle.tiers.forEach(val => {
          if (val <= equippedVal || val <= 4 || maxU >= 5) unlockedCount++;
        });

        const title = document.createElement('div');
        title.className = 'comp-group-title';
        title.innerHTML = `
          <span>${cycle.name} <span style="font-size:0.75rem; color:#38bdf8; font-weight:700;">(${unlockedCount}/${cycle.tiers.length} 已解鎖)</span></span>
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

        cycle.tiers.forEach(val => {
          const theme = equipThemes[val] || { name: '神裝', badge: '⚔️' };
          const isUnlocked = val <= equippedVal || val <= 4 || maxU >= 5;
          const card = document.createElement('div');
          card.style.aspectRatio = '5 / 6';

          const imgSrc = getEquipImg(val);

          if (isUnlocked) {
            card.className = 'compendium-card';
            card.innerHTML = `
              <img src="${imgSrc}" onerror="this.src='assets/images/equipment_clay/equip_01.png'" style="width:44px; height:44px; object-fit:contain;" alt="${theme.name}">
              <span style="font-size:0.75rem; color:#38bdf8; font-weight:bold; text-align:center; margin-top:2px;">${theme.name}</span>
              <span style="font-size:0.65rem; color:#fbbf24; font-weight:800;">${val}</span>
            `;
          } else {
            card.className = 'compendium-card locked-silhouette';
            card.innerHTML = `
              <img class="comp-silhouette-img" src="${imgSrc}" onerror="this.src='assets/images/equipment_clay/equip_01.png'" style="width:44px; height:44px; object-fit:contain;" alt="???">
              <span class="locked-mystery-badge">？</span>
              <span style="font-size:0.75rem; color:#64748b; font-weight:bold; text-align:center; margin-top:2px;">??? (未解鎖)</span>
              <span style="font-size:0.65rem; color:#475569; font-weight:800;">${val}</span>
            `;
          }
          grid.appendChild(card);
        });

        sec.appendChild(grid);
        area.appendChild(sec);
      });

    } else if (tab === 'heroes') {
      const heroThemes = window.appRouter.HERO_THEMES || {};
      const allVals = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288];

      const sec = document.createElement('div');
      sec.className = 'comp-group-section';

      let unlockedCount = 0;
      allVals.forEach(v => {
        if (v <= 16 || maxU >= 5) unlockedCount++;
      });

      const title = document.createElement('div');
      title.className = 'comp-group-title';
      title.innerHTML = `
        <span>👑 王國勇者神話階梯 (Hero Evolution) <span style="font-size:0.75rem; color:#38bdf8; font-weight:700;">(${unlockedCount}/${allVals.length} 已解鎖)</span></span>
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

      allVals.forEach(v => {
        const theme = heroThemes[v] || { name: '勇者', badge: '👑' };
        const isUnlocked = v <= 16 || maxU >= 5;
        const card = document.createElement('div');
        card.style.aspectRatio = '5 / 6';

        const tier = Math.round(Math.log2(v));
        const padded = String(Math.min(19, tier)).padStart(2, '0');
        const imgSrc = `assets/images/hero_knight/hero_${padded}.png`;

        if (isUnlocked) {
          card.className = 'compendium-card';
          card.innerHTML = `
            <img src="${imgSrc}" onerror="this.src='assets/images/hero_knight/hero_01.png'" style="width:48px; height:48px; object-fit:contain;" alt="${theme.name}">
            <span style="font-size:0.75rem; color:#f8fafc; font-weight:bold; text-align:center; margin-top:2px;">${theme.name}</span>
            <span style="font-size:0.65rem; color:#38bdf8; font-weight:800;">${v}</span>
          `;
        } else {
          card.className = 'compendium-card locked-silhouette';
          card.innerHTML = `
            <img class="comp-silhouette-img" src="${imgSrc}" onerror="this.src='assets/images/hero_knight/hero_01.png'" style="width:48px; height:48px; object-fit:contain;" alt="???">
            <span class="locked-mystery-badge">？</span>
            <span style="font-size:0.75rem; color:#64748b; font-weight:bold; text-align:center; margin-top:2px;">??? (未解鎖)</span>
            <span style="font-size:0.65rem; color:#475569; font-weight:800;">${v}</span>
          `;
        }
        grid.appendChild(card);
      });

      sec.appendChild(grid);
      area.appendChild(sec);
    }
  }

  // ----------------------------------------------------




  // SETTINGS & SAVE RESET



  // ----------------------------------------------------



  function openSettingsModal() {



    const chkInstant = document.getElementById('setting-instant-skill');



    if (chkInstant) {



      chkInstant.checked = (localStorage.getItem('rpg_2048_instant_skill_ready') === 'true');



    }



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



    localStorage.setItem('rpg_2048_instant_skill_ready', enabled ? 'true' : 'false');



    if (window.appRouter) {



      window.appRouter.instantSkillMode = enabled;



      if (window.appRouter.stageManager && enabled) {



        const maxCd = window.appRouter.stageManager.getCharacterSkillCooldown();



        window.appRouter.stageManager.skillChargeTurns = maxCd;



        window.appRouter.stageManager.isSkillReady = true;



        window.appRouter.updateSkillUI();



      }



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

  // C-STORY-172: Sync disk monster_scales.json to localStorage & re-render
  if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
    fetch('/api/get_monster_scales?t=' + Date.now()).then(r => r.json()).then(data => {
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        let current = {};
        try {
          const s = localStorage.getItem('custom_monster_scale_map');
          if (s) current = JSON.parse(s);
        } catch(e) {}
        const merged = { ...current, ...data };
        localStorage.setItem('custom_monster_scale_map', JSON.stringify(merged));
        if (typeof renderAdventureStage === 'function') renderAdventureStage();
      }
    }).catch(() => {});
  }


  // C-STORY-171: Direct Import & Forced Sync for Monster Scales
  function importCustomMonsterScalesFromClipboard() {
    const doImport = (text) => {
      if (!text || !text.trim()) {
        alert('請先在魔物工作室複製代碼，或在此貼上有效的 JSON 設定！');
        return;
      }
      try {
        let clean = text.trim();
        if (clean.includes('{')) {
          clean = clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1);
        }
        const parsed = JSON.parse(clean);
        if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid format');
        localStorage.setItem('custom_monster_scale_map', JSON.stringify(parsed));
        if (typeof renderAdventureStage === 'function') renderAdventureStage();
        alert('✅ 成功匯入並套用魔物比例設定！關卡立繪已即時更新。');
      } catch (err) {
        alert('❌ 匯入失敗：格式不正確。請確保貼上有效的 JSON 物件！');
      }
    };

    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(text => {
        if (text && text.includes('{')) {
          doImport(text);
        } else {
          const input = prompt('請貼上從工作室複製的設定代碼 (JSON)：', text || '');
          if (input) doImport(input);
        }
      }).catch(() => {
        const input = prompt('請貼上從工作室複製的設定代碼 (JSON)：');
        if (input) doImport(input);
      });
    } else {
      const input = prompt('請貼上從工作室複製的設定代碼 (JSON)：');
      if (input) doImport(input);
    }
  }
  window.importCustomMonsterScalesFromClipboard = importCustomMonsterScalesFromClipboard;

  function forceSyncMonsterScales() {
    if (typeof renderAdventureStage === 'function') {
      renderAdventureStage();
    }
    alert('🔄 已重新讀取魔物比例設定並即時重繪關卡！');
  }
  window.forceSyncMonsterScales = forceSyncMonsterScales;


  // C-STORY-170: Cross-tab realtime dynamic hot-sync from monster_scale_studio.html
  window.addEventListener('storage', (e) => {
    if (e.key === 'custom_monster_scale_map') {
      if (typeof renderAdventureStage === 'function') {
        renderAdventureStage();
      }
    }
  });
  window.addEventListener('focus', () => {
    if (typeof renderAdventureStage === 'function') {
      renderAdventureStage();
    }
  });




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



// ----------------------------------------------------



// C-STORY-156: TITLE SPLASH & CUSTOM UI THEME SYSTEM



// ----------------------------------------------------



const SPLASH_SKIN_MAP = {



  'concept_b': 'assets/images/title_splash_concept_B.png',



  'concept_a': 'assets/images/title_splash_concept_A.png',



  'concept_c': 'assets/images/title_splash_concept_C.png'



};







function changeSplashSkin(skinKey) {



  if (!SPLASH_SKIN_MAP[skinKey]) skinKey = 'concept_b';



  localStorage.setItem('rpg_2048_splash_skin', skinKey);



  



  // Sync dropdowns



  const selGeneral = document.getElementById('setting-splash-select');



  const selDev = document.getElementById('setting-dev-splash-select');



  if (selGeneral) selGeneral.value = skinKey;



  if (selDev) selDev.value = skinKey;







  // Apply to background



  const bg = document.getElementById('title-splash-bg');



  if (bg) {



    bg.style.backgroundImage = 'url("' + SPLASH_SKIN_MAP[skinKey] + '")';



  }



}







// UI Theme Preset Matrix



const UI_THEME_PRESETS = {
  'dark_night': {
    bg: '#090d16',
    pattern: 'dots',
    patColor: '#38bdf8',
    opacity: 20,
    cardBg: '#1e293b',
    cardBorder: '#334155',
    textStroke: 'contrast',
    haloWidth: 6,
    haloOpacity: 85,
    bgSaturate: 130,
    bgBrightness: 110,
    bgContrast: 115
  },
  'runic_purple': {



    bg: '#171026',



    pattern: 'runic',



    patColor: '#c084fc',



    opacity: 25



  },



  'forest_green': {



    bg: '#0d1a14',



    pattern: 'dots',



    patColor: '#4ade80',



    opacity: 22



  },



  'warm_workshop': {



    bg: '#1c1611',



    pattern: 'diagonal',



    patColor: '#f59e0b',



    opacity: 24



  }



};







let currentUiTheme = {
  bg: '#090d16',
  pattern: 'chessboard',
  patColor: '#38bdf8',
  opacity: 20,
  scale: 100,
  cardBg: '#1e293b',
  cardBorder: '#334155',
  textStroke: 'contrast',
  haloWidth: 6,
  haloOpacity: 85,
  bgSaturate: 130,
  bgBrightness: 110,
  bgContrast: 115
};







function hexToRgba(hex, alpha) {



  let cleanHex = hex.replace('#', '');



  if (cleanHex.length === 3) {



    cleanHex = cleanHex.split('').map(function(c) { return c + c; }).join('');



  }



  const num = parseInt(cleanHex, 16);



  if (isNaN(num)) return 'rgba(56, 189, 248, ' + alpha + ')';



  const r = (num >> 16) & 255;



  const g = (num >> 8) & 255;



  const b = num & 255;



  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';



}







function getPatternCss(patternType, rgbaColor, scale) {



  const scaleRatio = Math.max(0.5, Math.min(3.0, (Number(scale) || 100) / 100));







  switch (patternType) {



    case 'none':



      return { image: 'none', size: 'auto' };







    // ==========================================



    // C-STORY-157 & C-STORY-161: 大圖案版 (特大圖形)



    // ==========================================



    case 'chessboard': {



      // 西洋棋盤：以畫面垂直中線 (center top) 為軸心分配，採用單層圓錐棋盤漸層，達成左右 100% 鏡像對稱



      const box = Math.round(144 * scaleRatio);



      return {



        image: 'repeating-conic-gradient(' + rgbaColor + ' 0% 25%, transparent 0% 50%)',



        size: box + 'px ' + box + 'px',



        position: 'center top'



      };



    }







    case 'diamond': {



      // 菱形方格：旋轉 45 度交錯真菱形，基礎尺寸 144px，依 scaleRatio 自由微調



      const box = Math.round(144 * scaleRatio);



      return {



        image: 'repeating-conic-gradient(from 45deg at 50% 50%, ' + rgbaColor + ' 0% 25%, transparent 0% 50%)',



        size: box + 'px ' + box + 'px',



        position: 'center top'



      };



    }







    case 'runic_lg': {



      // 神秘符文大圖版：清晰遠古盧恩符文 (ᚠ ᚱ ᛏ ᛟ ᛋ)，字級 16px 起跳，依 scaleRatio 自由微調



      const tileSize = Math.round(80 * scaleRatio);



      const fontSize = Math.max(12, Math.round(16 * scaleRatio));



      const p1 = Math.round(tileSize * 0.25);



      const p2 = Math.round(tileSize * 0.75);



      const pMid = Math.round(tileSize * 0.50);



      const y1 = Math.round(tileSize * 0.32);



      const y2 = Math.round(tileSize * 0.60);



      const y3 = Math.round(tileSize * 0.88);







      const svgRunic = '<svg xmlns="http://www.w3.org/2000/svg" width="' + tileSize + '" height="' + tileSize + '" viewBox="0 0 ' + tileSize + ' ' + tileSize + '">' +



        '<text x="' + p1 + '" y="' + y1 + '" font-size="' + fontSize + '" fill="' + rgbaColor + '" font-family="serif, monospace" text-anchor="middle" font-weight="bold">&#x16A0;</text>' +



        '<text x="' + p2 + '" y="' + y1 + '" font-size="' + fontSize + '" fill="' + rgbaColor + '" font-family="serif, monospace" text-anchor="middle" font-weight="bold">&#x16B1;</text>' +



        '<text x="' + pMid + '" y="' + y2 + '" font-size="' + fontSize + '" fill="' + rgbaColor + '" font-family="serif, monospace" text-anchor="middle" font-weight="bold">&#x16CF;</text>' +



        '<text x="' + p1 + '" y="' + y3 + '" font-size="' + fontSize + '" fill="' + rgbaColor + '" font-family="serif, monospace" text-anchor="middle" font-weight="bold">&#x16DF;</text>' +



        '<text x="' + p2 + '" y="' + y3 + '" font-size="' + fontSize + '" fill="' + rgbaColor + '" font-family="serif, monospace" text-anchor="middle" font-weight="bold">&#x16CB;</text>' +



        '</svg>';







      return {



        image: 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svgRunic) + '")',



        size: tileSize + 'px ' + tileSize + 'px',



        position: 'center top'



      };



    }







    case 'grid_lg': {



      // 戰棋網格大圖版：線條寬度 3px 起跳，網格邊長 72px 起跳



      const lineWidth = Math.max(2, Math.round(3 * scaleRatio));



      const gridSize = Math.round(72 * scaleRatio);



      return {



        image: 'linear-gradient(' + rgbaColor + ' ' + lineWidth + 'px, transparent ' + lineWidth + 'px), linear-gradient(90deg, ' + rgbaColor + ' ' + lineWidth + 'px, transparent ' + lineWidth + 'px)',



        size: gridSize + 'px ' + gridSize + 'px',



        position: 'center top'



      };



    }







    case 'dots_lg': {



      // 圓點大圖版：點半徑 5px 起跳，間隔 56px



      const dotRadius = Math.max(3, Math.round(5 * scaleRatio));



      const dotSize = Math.round(56 * scaleRatio);



      return {



        image: 'radial-gradient(circle at center, ' + rgbaColor + ' ' + dotRadius + 'px, transparent ' + (dotRadius + 1) + 'px)',



        size: dotSize + 'px ' + dotSize + 'px',



        position: 'center top'



      };



    }







    // ==========================================



    // 經典原版花紋（也支援 scaleRatio 動態微調）



    // ==========================================



    case 'dots': {



      const r = Math.max(1, 1.5 * scaleRatio);



      const s = Math.round(24 * scaleRatio);



      return {



        image: 'radial-gradient(' + rgbaColor + ' ' + r + 'px, transparent ' + (r + 0.5) + 'px)',



        size: s + 'px ' + s + 'px',



        position: '0 0'



      };



    }



    case 'grid': {



      const s = Math.round(28 * scaleRatio);



      return {



        image: 'linear-gradient(' + rgbaColor + ' 1px, transparent 1px), linear-gradient(90deg, ' + rgbaColor + ' 1px, transparent 1px)',



        size: s + 'px ' + s + 'px',



        position: '0 0'



      };



    }



    case 'runic': {



      const s = Math.round(32 * scaleRatio);



      return {



        image: 'radial-gradient(circle at 50% 50%, ' + rgbaColor + ' 10%, transparent 11%), linear-gradient(45deg, ' + rgbaColor + ' 1px, transparent 1px), linear-gradient(-45deg, ' + rgbaColor + ' 1px, transparent 1px)',



        size: s + 'px ' + s + 'px',



        position: '0 0'



      };



    }



    case 'diagonal': {



      const gap = Math.round(14 * scaleRatio);



      return {



        image: 'repeating-linear-gradient(45deg, ' + rgbaColor + ', ' + rgbaColor + ' 1px, transparent 1px, transparent ' + gap + 'px)',



        size: 'auto',



        position: '0 0'



      };



    }



    case 'radial':



      return {



        image: 'radial-gradient(circle at 50% 35%, ' + rgbaColor + ' 0%, transparent 75%)',



        size: '100% 100%',



        position: 'center top'



      };



    default:



      return {



        image: 'radial-gradient(' + rgbaColor + ' 1.5px, transparent 1.5px)',



        size: '24px 24px',



        position: '0 0'



      };



  }



}







function applyCustomUiTheme(theme, save) {



  if (save === undefined) save = true;



  if (!theme) return;



  currentUiTheme = Object.assign({}, currentUiTheme, theme);



  if (save) {



    localStorage.setItem('rpg_2048_custom_ui_theme', JSON.stringify(currentUiTheme));



  }







  const alpha = (currentUiTheme.opacity || 20) / 100;



  const rgba = hexToRgba(currentUiTheme.patColor || '#38bdf8', alpha);



  const scale = currentUiTheme.scale || 100;



  const patObj = getPatternCss(currentUiTheme.pattern || 'chessboard', rgba, scale);







  const root = document.documentElement;



  root.style.setProperty('--custom-ui-bg', currentUiTheme.bg);



  root.style.setProperty('--custom-ui-pattern-image', patObj.image);



  root.style.setProperty('--custom-ui-pattern-size', patObj.size);



  root.style.setProperty('--custom-ui-pattern-position', patObj.position || 'center top');



  root.style.setProperty('--custom-ui-pattern-opacity', alpha);







  // C-STORY-164: Connect Card Styles & High-Contrast Stroke



  const cardBg = currentUiTheme.cardBg || '#1e293b';



  const cardBorder = currentUiTheme.cardBorder || '#334155';



  root.style.setProperty('--custom-card-bg', cardBg);



  root.style.setProperty('--custom-card-border', cardBorder);







  const strokeMode = currentUiTheme.textStroke || 'contrast';



  if (strokeMode === 'none') {



    root.style.setProperty('--custom-text-stroke', '0px transparent');



    root.style.setProperty('--custom-title-shadow', 'none');



  } else if (strokeMode === 'shadow') {



    root.style.setProperty('--custom-text-stroke', '0px transparent');



    root.style.setProperty('--custom-title-shadow', '0 2px 4px rgba(0,0,0,0.8)');



  } else {



    // contrast (default)



    root.style.setProperty('--custom-text-stroke', '0px transparent');
    root.style.setProperty('--custom-title-shadow', '0 0 4px rgba(0, 0, 0, 0.85), 0 0 8px rgba(0, 0, 0, 0.65), 0 2px 4px rgba(0, 0, 0, 0.5)');



  }







  
  // C-STORY-169: Character Halo & Stage Background Color Tuning
  const haloWidth = (typeof currentUiTheme.haloWidth === 'number') ? currentUiTheme.haloWidth : 6;
  const haloOpacity = (typeof currentUiTheme.haloOpacity === 'number') ? currentUiTheme.haloOpacity : 85;
  const bgSaturate = (typeof currentUiTheme.bgSaturate === 'number') ? currentUiTheme.bgSaturate : 130;
  const bgBrightness = (typeof currentUiTheme.bgBrightness === 'number') ? currentUiTheme.bgBrightness : 110;
  const bgContrast = (typeof currentUiTheme.bgContrast === 'number') ? currentUiTheme.bgContrast : 115;

  root.style.setProperty('--char-halo-width', haloWidth + 'px');
  root.style.setProperty('--char-halo-opacity', (haloOpacity / 100));
  root.style.setProperty('--stage-bg-saturate', (bgSaturate / 100));
  root.style.setProperty('--stage-bg-brightness', (bgBrightness / 100));
  root.style.setProperty('--stage-bg-contrast', (bgContrast / 100));

  syncCustomUiThemeInputs();



}







function syncCustomUiThemeInputs() {



  const elColorBg = document.getElementById('theme-color-bg');



  const elHexBg = document.getElementById('theme-hex-bg');



  const elSelectPat = document.getElementById('theme-select-pattern');



  const elColorPat = document.getElementById('theme-color-pattern');



  const elHexPat = document.getElementById('theme-hex-pattern');



  const elRangeOp = document.getElementById('theme-range-opacity');



  const elTxtOp = document.getElementById('theme-txt-opacity');



  const elRangeScale = document.getElementById('theme-range-scale');



  const elTxtScale = document.getElementById('theme-txt-scale');







  const elColorCardBg = document.getElementById('theme-color-card-bg');



  const elHexCardBg = document.getElementById('theme-hex-card-bg');



  const elColorCardBorder = document.getElementById('theme-color-card-border');



  const elHexCardBorder = document.getElementById('theme-hex-card-border');



  const elSelectStroke = document.getElementById('theme-select-stroke');







  if (elColorBg) elColorBg.value = currentUiTheme.bg;



  if (elHexBg) elHexBg.value = currentUiTheme.bg;



  if (elSelectPat) elSelectPat.value = currentUiTheme.pattern;



  if (elColorPat) elColorPat.value = currentUiTheme.patColor;



  if (elHexPat) elHexPat.value = currentUiTheme.patColor;



  if (elRangeOp) elRangeOp.value = currentUiTheme.opacity;



  if (elTxtOp) elTxtOp.innerText = currentUiTheme.opacity + '%';



  const curScale = currentUiTheme.scale || 100;



  if (elRangeScale) elRangeScale.value = curScale;



  if (elTxtScale) elTxtScale.innerText = curScale + '%';







  if (elColorCardBg) elColorCardBg.value = currentUiTheme.cardBg || '#1e293b';



  if (elHexCardBg) elHexCardBg.value = currentUiTheme.cardBg || '#1e293b';



  if (elColorCardBorder) elColorCardBorder.value = currentUiTheme.cardBorder || '#334155';



  if (elHexCardBorder) elHexCardBorder.value = currentUiTheme.cardBorder || '#334155';



  if (elSelectStroke) elSelectStroke.value = currentUiTheme.textStroke || 'contrast';
  const elRangeHaloW = document.getElementById('theme-range-halo-width');
  const elTxtHaloW = document.getElementById('theme-txt-halo-width');
  const elRangeHaloOp = document.getElementById('theme-range-halo-opacity');
  const elTxtHaloOp = document.getElementById('theme-txt-halo-opacity');

  const elRangeBgSat = document.getElementById('theme-range-bg-saturate');
  const elTxtBgSat = document.getElementById('theme-txt-bg-saturate');
  const elRangeBgBri = document.getElementById('theme-range-bg-brightness');
  const elTxtBgBri = document.getElementById('theme-txt-bg-brightness');
  const elRangeBgCon = document.getElementById('theme-range-bg-contrast');
  const elTxtBgCon = document.getElementById('theme-txt-bg-contrast');

  const hw = (typeof currentUiTheme.haloWidth === 'number') ? currentUiTheme.haloWidth : 6;
  const ho = (typeof currentUiTheme.haloOpacity === 'number') ? currentUiTheme.haloOpacity : 85;
  const bs = (typeof currentUiTheme.bgSaturate === 'number') ? currentUiTheme.bgSaturate : 130;
  const bb = (typeof currentUiTheme.bgBrightness === 'number') ? currentUiTheme.bgBrightness : 110;
  const bc = (typeof currentUiTheme.bgContrast === 'number') ? currentUiTheme.bgContrast : 115;

  if (elRangeHaloW) elRangeHaloW.value = hw;
  if (elTxtHaloW) elTxtHaloW.textContent = hw + 'px';
  if (elRangeHaloOp) elRangeHaloOp.value = ho;
  if (elTxtHaloOp) elTxtHaloOp.textContent = ho + '%';

  if (elRangeBgSat) elRangeBgSat.value = bs;
  if (elTxtBgSat) elTxtBgSat.textContent = bs + '%';
  if (elRangeBgBri) elRangeBgBri.value = bb;
  if (elTxtBgBri) elTxtBgBri.textContent = bb + '%';
  if (elRangeBgCon) elRangeBgCon.value = bc;
  if (elTxtBgCon) elTxtBgCon.textContent = bc + '%';




}







function onCustomThemeInput(key, val) {



  if (key === 'bg_color' || key === 'bg_hex') {



    if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {



      currentUiTheme.bg = val;



    }



  } else if (key === 'pattern') {



    currentUiTheme.pattern = val;



  } else if (key === 'pat_color' || key === 'pat_hex') {



    if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {



      currentUiTheme.patColor = val;



    }



  } else if (key === 'opacity') {



    currentUiTheme.opacity = parseInt(val, 10) || 0;



  } else if (key === 'scale') {



    currentUiTheme.scale = parseInt(val, 10) || 100;



  } else if (key === 'card_bg') {



    if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {



      currentUiTheme.cardBg = val;



    }



  } else if (key === 'card_border') {



    if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {



      currentUiTheme.cardBorder = val;



    }



  } else if (key === 'text_stroke') {



    currentUiTheme.textStroke = val;
  } else if (key === 'halo_width') {
    currentUiTheme.haloWidth = parseInt(val, 10) || 0;
  } else if (key === 'halo_opacity') {
    currentUiTheme.haloOpacity = parseInt(val, 10) || 0;
  } else if (key === 'bg_saturate') {
    currentUiTheme.bgSaturate = parseInt(val, 10) || 100;
  } else if (key === 'bg_brightness') {
    currentUiTheme.bgBrightness = parseInt(val, 10) || 100;
  } else if (key === 'bg_contrast') {
    currentUiTheme.bgContrast = parseInt(val, 10) || 100;
  }



  applyCustomUiTheme(currentUiTheme, true);



}







// ========================================================



// C-STORY-164: 3 CUSTOM THEME PRESET SLOTS SYSTEM



// ========================================================



let customThemeSlots = [null, null, null];







function loadThemeSlotsFromStorage() {



  try {



    const raw = localStorage.getItem('rpg_2048_custom_theme_slots');



    if (raw) {



      const parsed = JSON.parse(raw);



      if (Array.isArray(parsed)) {



        customThemeSlots = parsed;



        while (customThemeSlots.length < 3) customThemeSlots.push(null);



        return;



      }



    }



  } catch (e) {}



  customThemeSlots = [null, null, null];



}







function saveThemeSlot(slotIndex) {



  if (slotIndex < 0 || slotIndex >= 3) return;



  loadThemeSlotsFromStorage();



  const now = new Date();



  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;



  const snapshot = Object.assign({}, currentUiTheme, {



    savedAt: timeStr



  });



  customThemeSlots[slotIndex] = snapshot;



  localStorage.setItem('rpg_2048_custom_theme_slots', JSON.stringify(customThemeSlots));



  renderThemeSlotsUI();



}







function loadThemeSlot(slotIndex) {



  if (slotIndex < 0 || slotIndex >= 3) return;



  loadThemeSlotsFromStorage();



  const slot = customThemeSlots[slotIndex];



  if (slot) {



    applyCustomUiTheme(slot, true);



  } else {



    alert('⚠️ 此槽位尚未儲存任何配置！');



  }



}







function clearThemeSlot(slotIndex) {



  if (slotIndex < 0 || slotIndex >= 3) return;



  loadThemeSlotsFromStorage();



  customThemeSlots[slotIndex] = null;



  localStorage.setItem('rpg_2048_custom_theme_slots', JSON.stringify(customThemeSlots));



  renderThemeSlotsUI();



}







function renderThemeSlotsUI() {



  loadThemeSlotsFromStorage();



  for (let i = 0; i < 3; i++) {



    const slot = customThemeSlots[i];



    const previewEl = document.getElementById(`slot-preview-${i + 1}`);



    const timeEl = document.getElementById(`slot-time-${i + 1}`);



    const btnLoad = document.getElementById(`btn-slot-load-${i + 1}`);



    const btnClear = document.getElementById(`btn-slot-clear-${i + 1}`);







    if (slot) {



      if (previewEl) {



        previewEl.innerHTML = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:${slot.bg}; border:1px solid #94a3b8; vertical-align:middle; margin-right:3px;"></span><span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:${slot.patColor}; border:1px solid #94a3b8; vertical-align:middle;"></span>`;



      }



      if (timeEl) {



        timeEl.textContent = `${slot.savedAt || '已保存'} (${slot.pattern})`;



        timeEl.style.color = '#38bdf8';



      }



      if (btnLoad) {



        btnLoad.disabled = false;



        btnLoad.className = 'cr-btn cr-btn-blue';



      }



      if (btnClear) {



        btnClear.disabled = false;



        btnClear.style.opacity = '1';



        btnClear.style.pointerEvents = 'auto';



      }



    } else {



      if (previewEl) {



        previewEl.innerHTML = `<span style="color:#64748b; font-size:0.75rem;">(空)</span>`;



      }



      if (timeEl) {



        timeEl.textContent = '未儲存';



        timeEl.style.color = '#64748b';



      }



      if (btnLoad) {



        btnLoad.disabled = true;



        btnLoad.className = 'cr-btn cr-btn-disabled';



      }



      if (btnClear) {



        btnClear.disabled = true;



        btnClear.style.opacity = '0.4';



        btnClear.style.pointerEvents = 'none';



      }



    }



  }



}







function applyQuickUiPreset(presetKey) {



  if (UI_THEME_PRESETS[presetKey]) {



    applyCustomUiTheme(UI_THEME_PRESETS[presetKey], true);



  }



}







function resetCustomUiTheme() {



  applyCustomUiTheme(UI_THEME_PRESETS['dark_night'], true);



}







function initCustomThemeFromStorage() {



  // 1. Splash Skin



  const savedSplash = localStorage.getItem('rpg_2048_splash_skin') || 'concept_b';



  changeSplashSkin(savedSplash);







  // 2. Custom UI Theme



  const savedThemeStr = localStorage.getItem('rpg_2048_custom_ui_theme');



  if (savedThemeStr) {



    try {



      const parsed = JSON.parse(savedThemeStr);



      applyCustomUiTheme(parsed, false);



    } catch (e) {



      applyCustomUiTheme(UI_THEME_PRESETS['dark_night'], false);



    }



  } else {



    applyCustomUiTheme(UI_THEME_PRESETS['dark_night'], false);



  }



  renderThemeSlotsUI();



}







  window.renderCampUpgrades = renderCampUpgrades;



  window.getForgePlainDescription = getForgePlainDescription;



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











  window.changeSplashSkin = changeSplashSkin;



  window.applyCustomUiTheme = applyCustomUiTheme;



  window.onCustomThemeInput = onCustomThemeInput;



  window.applyQuickUiPreset = applyQuickUiPreset;



  window.resetCustomUiTheme = resetCustomUiTheme;



  window.syncEquippedHeroVisuals = syncEquippedHeroVisuals;



  window.saveThemeSlot = saveThemeSlot;



  window.loadThemeSlot = loadThemeSlot;



  window.clearThemeSlot = clearThemeSlot;



  window.renderThemeSlotsUI = renderThemeSlotsUI;



  window.initCustomThemeFromStorage = initCustomThemeFromStorage;







})(window);



