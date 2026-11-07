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
      stage_minions_title: '其他魔物：', stage_gears_title: '場景資源：', stage_first_gold_title: '🪙 初次通關獎勵：'
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
  window.currentSelectedStage = 1;
  window.currentHeroModalKey = 'warrior';
  window.currentCompTab = 'monsters';

  // ----------------------------------------------------
  // NAVIGATION & TAB SWITCHING
  // ----------------------------------------------------
  function switchMainTab(tabId) {
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
    return window.appRouter ? (window.appRouter.stageManager.maxUnlockedStage || 1) : 1;
  }

  function changeStageByStep(step) {
    const maxU = getMaxUnlocked();
    const nextStage = window.currentSelectedStage + step;
    if (nextStage >= 1 && nextStage <= maxU) {
      window.currentSelectedStage = nextStage;
      renderAdventureStage();
    } else if (nextStage > maxU) {
      alert(`🔒 第 ${nextStage} 關尚未解鎖，請先通關第 ${maxU} 關！`);
    }
  }

  function renderAdventureStage(stageId) {
    const maxU = getMaxUnlocked();
    if (stageId !== undefined) {
      window.currentSelectedStage = Math.max(1, Math.min(stageId, maxU));
    } else if (!window.currentSelectedStage || window.currentSelectedStage > maxU) {
      window.currentSelectedStage = maxU;
    }

    const cur = window.currentSelectedStage;
    const configs = (window.appRouter && window.appRouter.STAGE_CONFIGS) ? window.appRouter.STAGE_CONFIGS : null;
    const cfg = configs ? configs[cur] : null;

    // Update Header Stage & Chapter Tag
    const hubStageNum = document.getElementById('hub-stage-num');
    const hubChapTag = document.getElementById('hub-chap-tag');
    const arenaBossImg = document.getElementById('arena-boss-img');
    const arenaBossName = document.getElementById('arena-boss-name');
    const btnPrev = document.getElementById('btn-stage-prev');
    const btnNext = document.getElementById('btn-stage-next');

    if (hubStageNum) hubStageNum.textContent = `Stage ${cur}`;
    if (hubChapTag) {
      const ch = cfg ? (cfg.chapter || 1) : 1;
      const chNames = { 1: '大地平原', 2: '荒漠熔岩', 3: '星空祭壇' };
      hubChapTag.textContent = `第 ${ch} 章 · ${chNames[ch] || '冒險征途'}`;
    }

    if (arenaBossImg && cfg) {
      const ch = cfg.chapter || 1;
      const bossVal = (cfg.monsters && cfg.monsters[0]) ? (typeof cfg.monsters[0] === 'object' ? cfg.monsters[0].value : cfg.monsters[0]) : 16;
      const formattedVal = bossVal >= 10 ? bossVal : '0' + bossVal;
      arenaBossImg.src = `assets/images/monsters_clay/monster_ch0${Math.min(ch, 3)}_${formattedVal}.png`;
      arenaBossImg.onerror = () => { arenaBossImg.src = 'assets/images/monsters_clay/monster_ch01_16.png'; };
    }
    if (arenaBossName && cfg) {
      arenaBossName.textContent = `首領：${cfg.name} (${cfg.bossMonsterValue || 64})`;
    }

    if (btnPrev) btnPrev.disabled = (cur <= 1);
    if (btnNext) btnNext.disabled = (cur >= maxU);

    // Update active node styling in any visible stage nodes
    document.querySelectorAll('.stage-node-item').forEach(node => {
      const s = parseInt(node.querySelector('.stage-node-num')?.textContent, 10);
      node.classList.remove('current');
      if (s === cur) node.classList.add('current');
    });
  }

  function openStageDetailModal(stageId) {
    const sId = stageId !== undefined ? stageId : window.currentSelectedStage;
    window.currentSelectedStage = sId;

    const modal = document.getElementById('modal-stage-detail');
    if (!modal) return;

    const configs = (window.appRouter && window.appRouter.STAGE_CONFIGS) ? window.appRouter.STAGE_CONFIGS : null;
    const cfg = configs ? configs[sId] : null;

    const titleEl = document.getElementById('modal-stage-title');
    const bossNameEl = document.getElementById('modal-boss-name');
    const bossImgEl = document.getElementById('modal-boss-img');
    const goldRewardEl = document.getElementById('modal-gold-reward');

    if (titleEl) titleEl.textContent = `Stage ${sId} · ${cfg ? cfg.name : '關卡情報'}`;
    if (bossNameEl) bossNameEl.textContent = `作戰目標：消滅所有盤面魔物`;
    if (goldRewardEl) goldRewardEl.textContent = `${cfg ? Number(cfg.rewardGold).toLocaleString() : 500} 金幣`;

    if (bossImgEl) {
      const ch = cfg ? (cfg.chapter || 1) : 1;
      const bossVal = (cfg && cfg.monsters && cfg.monsters[0]) ? (typeof cfg.monsters[0] === 'object' ? cfg.monsters[0].value : cfg.monsters[0]) : 16;
      const formattedVal = bossVal >= 10 ? bossVal : '0' + bossVal;
      bossImgEl.src = `assets/images/monsters_clay/monster_ch0${Math.min(ch, 3)}_${formattedVal}.png`;
      bossImgEl.onerror = () => { bossImgEl.src = 'assets/images/monsters_clay/monster_ch01_16.png'; };
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
      window.appRouter.startCombat(window.currentSelectedStage || 1);
    }
  }

  // ----------------------------------------------------
  // QUICK STAGE DRAWER
  // ----------------------------------------------------
  function openQuickStageDrawer() {
    const drawer = document.getElementById('drawer-quick-stage');
    const grid = document.getElementById('quick-stage-grid');
    if (!drawer || !grid) return;

    const maxU = getMaxUnlocked();
    grid.innerHTML = '';
    for (let s = 1; s <= 25; s++) {
      const isUnlocked = s <= maxU;
      const isCurrent = s === window.currentSelectedStage;
      const btn = document.createElement('div');
      btn.className = `quick-stage-node ${isCurrent ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
      btn.style.cssText = `padding: 10px; border-radius: 8px; text-align: center; cursor: ${isUnlocked ? 'pointer' : 'not-allowed'}; font-weight: 700; ${
        isCurrent ? 'background: #3b82f6; color: #fff; border: 2px solid #60a5fa;' :
        isUnlocked ? 'background: #1e293b; color: #f8fafc; border: 1px solid #334155;' :
        'background: #0f172a; color: #475569; border: 1px solid #1e293b;'
      }`;
      btn.innerHTML = `${isUnlocked ? `Stage ${s}` : `🔒 ${s}`}`;
      if (isUnlocked) {
        btn.onclick = () => {
          window.currentSelectedStage = s;
          renderAdventureStage();
          closeQuickStageDrawer();
        };
      }
      grid.appendChild(btn);
    }

    drawer.classList.add('active');
    drawer.style.display = 'flex';
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

  function renderSignInStatus() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    const btn = document.getElementById('btn-claim-signin');
    const container = document.getElementById('signin-cards-container');

    if (container) {
      const SIGNIN_DAYS = [
        { day: 1, gold: 300, icon: '🪙' },
        { day: 2, gold: 500, icon: '⚔️' },
        { day: 3, gold: 800, icon: '🪙' },
        { day: 4, gold: 1200, icon: '🛡️' },
        { day: 5, gold: 1500, icon: '🪙' },
        { day: 6, gold: 2000, icon: '👑' },
        { day: 7, gold: 3000, icon: '💎' }
      ];
      container.innerHTML = '';
      const curStreak = dlm.state.signInStreak || 0;
      const isClaimedToday = !dlm.hasSignInPending();

      SIGNIN_DAYS.forEach(d => {
        const isPast = d.day < curStreak || (d.day === curStreak && isClaimedToday);
        const isToday = (d.day === curStreak + 1 && !isClaimedToday) || (d.day === curStreak && !isClaimedToday);

        const card = document.createElement('div');
        card.className = `signin-day-card ${isToday ? 'today' : ''} ${isPast ? 'claimed' : ''}`;
        card.style.cssText = `background:#1e293b; border:${isToday ? '2px solid #38bdf8' : '1px solid #334155'}; border-radius:8px; padding:8px; text-align:center; position:relative;`;
        card.innerHTML = `
          <div style="font-size:0.75rem; color:#94a3b8;">第 ${d.day} 天</div>
          <div style="font-size:1.4rem; margin:2px 0;">${d.icon}</div>
          <div style="font-size:0.75rem; color:#fbbf24; font-weight:bold;">+${d.gold}</div>
          ${isPast ? '<div style="position:absolute; top:2px; right:2px; font-size:0.7rem; color:#4ade80;">✓</div>' : ''}
        `;
        container.appendChild(card);
      });
    }

    if (btn) {
      if (dlm.hasSignInPending()) {
        btn.disabled = false;
        btn.textContent = '立即簽到領取獎勵';
        btn.classList.add('glow-pulse');
      } else {
        btn.disabled = true;
        btn.textContent = '今日已簽到 (明日重置)';
        btn.classList.remove('glow-pulse');
      }
    }
  }

  function handleSignInButtonClick() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    if (dlm.hasSignInPending()) {
      const res = dlm.claimSignInReward();
      if (res.success) {
        if (window.appRouter.audio) window.appRouter.audio.playCoin();
        window.appRouter.syncHud();
        renderSignInStatus();
        alert(`🎉 簽到成功！獲得 ${res.reward.amount} 🪙 金幣！`);
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
        { id: 'quest_defeat_monsters', name: '魔物清剿', desc: '在冒險戰鬥中擊倒魔物', target: 15, unit: '隻', pts: 25, gold: 300, icon: '⚔️' },
        { id: 'quest_merge_tiles', name: '煉金融合', desc: '在戰鬥中合成方塊', target: 20, unit: '次', pts: 25, gold: 300, icon: '⚡' },
        { id: 'quest_complete_stages', name: '深入險境', desc: '完成任意冒險關卡', target: 2, unit: '關', pts: 25, gold: 400, icon: '🏰' },
        { id: 'quest_use_items', name: '道具運用', desc: '在戰鬥中使用任意輔助道具', target: 1, unit: '次', pts: 25, gold: 200, icon: '🧪' }
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
            <div style="font-weight:800; font-size:var(--font-body); color:#f8fafc;">${q.icon} ${q.name} (${curProg}/${q.target})</div>
            <div style="font-size:var(--font-caption); color:#94a3b8;">${q.desc} (活躍+${q.pts})</div>
          </div>
          <button class="cr-btn ${isClaimed ? 'cr-btn-disabled' : (isDone ? 'cr-btn-green' : 'cr-btn-disabled')} btn-small"
            ${(!isDone || isClaimed) ? 'disabled' : ''} style="min-width:85px;">
            ${isClaimed ? '已領取' : (isDone ? `領取 🪙${q.gold}` : '進行中')}
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
            }
          };
        }

        container.appendChild(card);
      });
    }
  }

  function claimDailyActivityChest() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    const res = dlm.claimActivityChest();
    if (res.success) {
      if (window.appRouter.audio) window.appRouter.audio.playVictory();
      window.appRouter.syncHud();
      renderDailyQuests();
      alert('🎉 恭喜開啟 100 活躍度冒險大寶箱！獲得 +1,000 🪙 金幣與豐富道具獎勵！');
    } else {
      alert(`⚠️ 領取失敗：${res.reason === 'ALREADY_CLAIMED' ? '今日大寶箱已領取過！' : '活躍度不足 100 點！'}`);
    }
  }

  // ----------------------------------------------------
  // CAMP / WORKSHOP REAL UPGRADES
  // ----------------------------------------------------
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

  function renderCampUpgrades() {
    const upg = getCampUpgrades();

    // 1. 鐵匠鋪
    const forgeTitleEl = document.getElementById('camp-txt-forge-title');
    const forgeBtnEl = document.getElementById('camp-btn-forge-upgrade');
    const forgeCost = Math.floor(100 * Math.pow(1.5, upg.forge - 1));
    if (forgeTitleEl) forgeTitleEl.textContent = `皇家鐵匠鋪 LV.${upg.forge}`;
    if (forgeBtnEl) forgeBtnEl.textContent = `升級 🪙${forgeCost.toLocaleString()}`;

    // 2. 軍需背包行囊
    const bagTitleEl = document.getElementById('camp-txt-bag-title');
    const bagBtnEl = document.getElementById('camp-btn-bag-expand');
    const curCap = 16 + (upg.capacity - 1) * 4;
    const nextCap = curCap + 4;
    const capCost = 200 * upg.capacity;
    if (bagTitleEl) bagTitleEl.textContent = `軍需行囊 (${curCap} ➔ ${nextCap}格)`;
    if (bagBtnEl) bagBtnEl.textContent = `擴充 🪙${capCost.toLocaleString()}`;
  }

  function upgradeCampBuilding(type) {
    if (!window.appRouter) return;
    const sm = window.appRouter.stageManager;
    const upg = getCampUpgrades();

    let cost = 100;
    if (type === 'forge') cost = Math.floor(100 * Math.pow(1.5, upg.forge - 1));
    else if (type === 'capacity') cost = 200 * upg.capacity;
    else if (type === 'afk') cost = 150 * upg.afk;

    if (sm.gold < cost) {
      alert(`⚠️ 金幣不足！升級需要 ${cost.toLocaleString()} 🪙，目前僅有 ${sm.gold.toLocaleString()} 🪙！`);
      return;
    }

    sm.gold -= cost;
    sm.saveData();
    upg[type] = (upg[type] || 1) + 1;
    saveCampUpgrades(upg);

    if (type === 'capacity' && window.appRouter.inventoryManager) {
      window.appRouter.inventoryManager.maxCapacity = 16 + (upg.capacity - 1) * 4;
    }

    if (window.appRouter.audio) window.appRouter.audio.playCoin();
    window.appRouter.syncHud();
    renderCampUpgrades();
    if (type === 'capacity') renderGearInventory();
    alert(`🎉 升級成功！目前等級提升至 Lv.${upg[type]}！`);
  }

  // ----------------------------------------------------
  // GACHA & EQUIPMENT BACKPACK
  // ----------------------------------------------------
  function openQuickGachaModal() {
    const modal = document.getElementById('modal-quick-gacha');
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
    }
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
    const res = window.appRouter.performGacha(count);
    if (res.success && res.items) {
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
      const card = document.createElement('div');
      card.className = `gacha-item-card ${it.value >= 64 ? 'epic' : (it.value >= 16 ? 'rare' : '')}`;
      card.innerHTML = `
        <img src="${it.img}" alt="gear">
        <span class="tier-val">${it.name} (${it.value})</span>
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
    const modal = document.getElementById('modal-upgrade-capacity');
    const body = document.getElementById('upgrade-capacity-body');
    if (!modal || !body) return;

    const upg = getCampUpgrades();
    const curCap = 16 + (upg.capacity - 1) * 4;
    const nextCap = curCap + 4;
    const cost = 200 * upg.capacity;

    body.innerHTML = `
      <div>當前背包容量：<strong style="color:#f8fafc;">${curCap} 格</strong> (Lv.${upg.capacity})</div>
      <div>下一級容量：<strong style="color:#4ade80;">${nextCap} 格</strong> (Lv.${upg.capacity + 1})</div>
      <div style="margin-top:6px; color:#fbbf24;">升級費用：<strong>${cost.toLocaleString()} 🪙 金幣</strong></div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';
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
    const starter = { id: 'starter_sword', name: '泥木劍', val: 2, img: 'assets/images/equipment_clay/equip_01.png' };
    window.appRouter.equipGearItem(starter);
    renderGearInventory();
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

    const items = im.items || [];
    const maxCap = im.maxCapacity || 16;
    if (capEl) capEl.textContent = `容量：${items.length} / ${maxCap}`;

    grid.innerHTML = '';
    const equipped = window.appRouter.getEquippedGear();

    // Render Equipped Gear preview in hero loadout
    const weaponCardImg = document.getElementById('deploy-gear-img');
    const weaponCardName = document.getElementById('deploy-gear-name');

    if (weaponCardImg) weaponCardImg.src = equipped.img;
    if (weaponCardName) weaponCardName.textContent = `${equipped.name} (${equipped.val})`;

    // Render backpack slots
    for (let i = 0; i < maxCap; i++) {
      const slot = document.createElement('div');
      slot.className = 'gear-slot-item';
      slot.style.cssText = 'background:#1e293b; border:1px solid #334155; border-radius:10px; aspect-ratio:1/1; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; cursor:pointer;';

      const it = items[i];
      if (it) {
        const isEq = it.id === equipped.id;
        if (isEq) slot.style.borderColor = '#fbbf24';
        slot.innerHTML = `
          <img src="${it.img || 'assets/images/equipment_clay/equip_01.png'}" style="width:36px; height:36px; object-fit:contain;">
          <span style="font-size:0.7rem; color:#38bdf8; font-weight:bold;">${it.value}</span>
          ${isEq ? '<span style="position:absolute; top:2px; right:2px; font-size:0.6rem; background:#fbbf24; color:#000; border-radius:3px; padding:1px 3px; font-weight:bold;">E</span>' : ''}
        `;
        slot.onclick = () => {
          window.appRouter.equipGearItem(it);
          renderGearInventory();
        };
      } else {
        slot.style.opacity = '0.3';
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
      { key: 'warrior', name: '騎士', cardId: 'card-hero-warrior', btnId: 'btn-deploy-warrior' },
      { key: 'merchant', name: '見習商人', cardId: 'card-hero-merchant', btnId: 'btn-deploy-merchant' },
      { key: 'archer', name: '精準遊俠', cardId: 'card-hero-archer', btnId: 'btn-deploy-archer' }
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
      warrior: '騎士 (Warrior)',
      merchant: '見習商人 (Merchant)',
      archer: '精準遊俠 (Archer)'
    };
    const HERO_SKILLS = {
      warrior: '十字斬 (清除橫豎十字魔物)',
      merchant: '點石成金 (將低階魔物化為金幣)',
      archer: '精準狙擊 (升級或狙殺指定目標)'
    };

    const titleEl = document.getElementById('modal-hero-title');
    const levelEl = document.getElementById('modal-hero-level');
    const descEl = document.getElementById('modal-hero-desc');
    const deployBtn = document.getElementById('modal-bottom-deploy-btn');
    const upgBtn = document.getElementById('modal-upgrade-btn');

    if (titleEl) titleEl.textContent = HERO_NAMES[heroKey] || heroKey;
    if (levelEl) levelEl.textContent = `等級：LV.${curLevel + 1} ${curLevel >= 4 ? '(已達最高階)' : ''}`;
    if (descEl) descEl.textContent = HERO_SKILLS[heroKey] || '';

    if (deployBtn) {
      if (isSelected) {
        deployBtn.disabled = true;
        deployBtn.className = 'cr-btn cr-btn-disabled btn-medium';
        deployBtn.innerHTML = '<span>已在陣中</span>';
      } else {
        deployBtn.disabled = false;
        deployBtn.className = 'cr-btn cr-btn-amber btn-medium';
        deployBtn.innerHTML = '<span>⚔️ 委派上陣</span>';
      }
    }

    if (upgBtn) {
      if (curLevel >= 4) {
        upgBtn.disabled = true;
        upgBtn.className = 'cr-btn cr-btn-disabled btn-medium';
        upgBtn.innerHTML = '<span>已滿級</span>';
      } else {
        const cost = [500, 1500, 3000, 5000][curLevel] || 5000;
        upgBtn.disabled = false;
        upgBtn.className = 'cr-btn cr-btn-green btn-medium';
        upgBtn.innerHTML = `<span>升級 🪙 ${cost.toLocaleString()}</span>`;
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
    const res = sm.upgradeCharacterSkill(heroKey);
    if (res.success) {
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
    const grid = document.getElementById('compendium-content-area');
    if (!grid || !window.appRouter) return;

    grid.innerHTML = '';
    const maxU = getMaxUnlocked();
    const equipped = window.appRouter.getEquippedGear();

    if (tab === 'monsters') {
      const TIER_VALS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
      TIER_VALS.forEach((val, idx) => {
        const isUnlocked = idx < Math.min(18, Math.floor(maxU / 2) + 2);
        const card = document.createElement('div');
        card.className = 'comp-card';
        card.style.cssText = 'background:#1e293b; border-radius:10px; padding:10px; display:flex; flex-direction:column; align-items:center; gap:6px;';
        if (isUnlocked) {
          card.innerHTML = `
            <img src="assets/images/monsters_clay/monster_ch01_16.png" style="width:48px; height:48px;">
            <span style="font-size:0.75rem; color:#f8fafc; font-weight:bold;">魔物 (${val})</span>
          `;
        } else {
          card.style.opacity = '0.5';
          card.innerHTML = `
            <div style="font-size:1.8rem; line-height:48px;">🔒</div>
            <span style="font-size:0.75rem; color:#64748b;">??? (${val})</span>
          `;
        }
        grid.appendChild(card);
      });
    } else if (tab === 'gears') {
      const TIER_VALS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
      TIER_VALS.forEach((val) => {
        const isUnlocked = val <= equipped.val;
        const card = document.createElement('div');
        card.className = 'comp-card';
        card.style.cssText = 'background:#1e293b; border-radius:10px; padding:10px; display:flex; flex-direction:column; align-items:center; gap:6px;';
        if (isUnlocked) {
          card.innerHTML = `
            <img src="assets/images/equipment_clay/equip_01.png" style="width:48px; height:48px;">
            <span style="font-size:0.75rem; color:#38bdf8; font-weight:bold;">裝備品 (${val})</span>
          `;
        } else {
          card.style.opacity = '0.5';
          card.innerHTML = `
            <div style="font-size:1.8rem; line-height:48px;">🔒</div>
            <span style="font-size:0.75rem; color:#64748b;">??? (${val})</span>
          `;
        }
        grid.appendChild(card);
      });
    } else if (tab === 'heroes') {
      const HERO_DEFS = [
        { key: 'warrior', name: '騎士', icon: 'assets/images/hero_knight/hero_09.png' },
        { key: 'merchant', name: '見習商人', icon: 'assets/images/hero_knight/hero_09.png' },
        { key: 'archer', name: '精準遊俠', icon: 'assets/images/hero_knight/hero_09.png' }
      ];
      HERO_DEFS.forEach(h => {
        const card = document.createElement('div');
        card.className = 'comp-card';
        card.style.cssText = 'background:#1e293b; border-radius:10px; padding:10px; display:flex; flex-direction:column; align-items:center; gap:6px;';
        card.innerHTML = `
          <img src="${h.icon}" style="width:48px; height:48px;">
          <span style="font-size:0.75rem; color:#f8fafc; font-weight:bold;">${h.name}</span>
        `;
        grid.appendChild(card);
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
    closeSettingsModal();
    alert('🔄 新手教學記錄已重置！即刻為您開啟新手教學。');
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
      if (window.appRouter.dailyLoopManager) {
        window.appRouter.dailyLoopManager.resetAll();
      }
      window.appRouter.initInventoryManager();
      window.appRouter.syncHud();
    }

    window.currentSelectedStage = 1;
    saveCampUpgrades({ forge: 1, capacity: 1, afk: 1 });

    renderAdventureStage(1);
    renderGearInventory();
    renderHeroCards();
    renderCampUpgrades();
    renderCompendiumView();
    syncShopDisplay();

    closeSettingsModal();
    alert('🗑️ 本地存檔已徹底重置！所有進度、金幣與裝備已恢復為初始狀態。');
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
  window.handleResetAllSaveData = handleResetAllSaveData;
  window.syncShopDisplay = syncShopDisplay;
  window.buyNoAdsPass = buyNoAdsPass;
  window.buyUnlimitedStamina = buyUnlimitedStamina;
  window.claimShopDailyGift = claimShopDailyGift;
  window.watchAdForGold = watchAdForGold;
  window.claimTestRecharge = claimTestRecharge;
  window.showStaminaInfo = showStaminaInfo;

})(window);
