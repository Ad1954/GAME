// proto_ui_logic.js: Real Metagame UI Logic & Event Handlers (C-STORY-139)

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
  window.activeDeployedHero = localStorage.getItem('rpg_2048_active_hero') || 'warrior';
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

    if (tabId === 'adventure') renderAdventureStage();
    if (tabId === 'gear') renderGearInventory();
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
  }

  // ----------------------------------------------------
  // ADVENTURE & STAGE NAVIGATION (ITEM 1 & 5)
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
    if (stageId !== undefined) {
      window.currentSelectedStage = stageId;
    } else if (!window.currentSelectedStage || window.currentSelectedStage > getMaxUnlocked()) {
      window.currentSelectedStage = getMaxUnlocked();
    }

    const cur = window.currentSelectedStage;
    const maxU = getMaxUnlocked();

    // Stage Config Lookup from window.appRouter.STAGE_CONFIGS
    const configs = (window.appRouter && window.appRouter.STAGE_CONFIGS) ? window.appRouter.STAGE_CONFIGS : null;
    const cfg = configs ? configs[cur] : null;

    // Update active node styling
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
      const ch = cfg ? cfg.chapter : 1;
      const bossVal = (cfg && cfg.monsters && cfg.monsters[0]) ? (typeof cfg.monsters[0] === 'object' ? cfg.monsters[0].value : cfg.monsters[0]) : 16;
      bossImgEl.src = `assets/images/monsters_clay/monster_ch0${Math.min(ch, 3)}_${bossVal >= 10 ? bossVal : '0' + bossVal}.png`;
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
  // DAILY SIGN-IN & QUESTS (ITEM 2)
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

  function renderSignInStatus() {
    if (!window.appRouter || !window.appRouter.dailyLoopManager) return;
    const dlm = window.appRouter.dailyLoopManager;
    const btn = document.getElementById('btn-claim-signin');
    if (!btn) return;

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
    const questsList = document.getElementById('daily-quests-list');
    if (!questsList) return;

    questsList.innerHTML = '';
    const state = dlm.state;

    Object.keys(state.quests).forEach(qId => {
      const q = state.quests[qId];
      const card = document.createElement('div');
      card.className = 'daily-quest-item';
      card.style.cssText = 'background:#1e293b; border-radius:10px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;';

      const isClaimed = q.claimed;
      const isComplete = q.progress >= q.target;

      card.innerHTML = `
        <div>
          <div style="font-weight:bold; color:#f8fafc; font-size:0.9rem;">${q.title}</div>
          <div style="font-size:0.75rem; color:#94a3b8;">進度：${q.progress}/${q.target} · 獎勵：+${q.gold} 🪙</div>
        </div>
        <button class="cr-btn ${isClaimed ? 'cr-btn-disabled' : (isComplete ? 'cr-btn-green' : 'cr-btn-blue')}" style="padding:6px 12px; font-size:0.8rem;" ${isClaimed || !isComplete ? 'disabled' : ''}>
          ${isClaimed ? '已領取' : (isComplete ? '領取' : '進行中')}
        </button>
      `;

      const btn = card.querySelector('button');
      if (btn && isComplete && !isClaimed) {
        btn.onclick = () => {
          dlm.claimQuestReward(qId);
          if (window.appRouter.audio) window.appRouter.audio.playCoin();
          window.appRouter.syncHud();
          renderDailyQuests();
        };
      }
      questsList.appendChild(card);
    });
  }

  // ----------------------------------------------------
  // CAMP / WORKSHOP REAL UPGRADES (ITEM 3)
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
    alert(`🎉 升級成功！目前等級提升至 Lv.${upg[type]}！`);
  }

  // ----------------------------------------------------
  // GACHA & EQUIPMENT BACKPACK (ITEM 4, 6, 7)
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
    if (res && res.success) {
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
  // REAL COMPENDIUM VIEW (ITEM 9)
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
      // 18 Tiers Monsters
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
      // 18 Tiers Gears (Cascading unlock based on highest tier owned)
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
    }
  }

  // Settings
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

  function changeLanguageFromSelect(sel) {
    if (sel && sel.value) setLanguage(sel.value);
  }

  function switchSettingTab(tab) {
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
    const btn = document.getElementById(`btn-sett-tab-${tab}`);
    const pane = document.getElementById(`sett-pane-${tab}`);
    if (btn) btn.classList.add('active');
    if (pane) pane.classList.add('active');
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

    renderCampUpgrades();
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
  window.openDailySignInModal = openDailySignInModal;
  window.closeDailySignInModal = closeDailySignInModal;
  window.handleSignInButtonClick = handleSignInButtonClick;
  window.openDailyQuestsModal = openDailyQuestsModal;
  window.closeDailyQuestsModal = closeDailyQuestsModal;
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
  window.switchCompTab = switchCompTab;
  window.renderCompendiumView = renderCompendiumView;
  window.openSettingsModal = openSettingsModal;
  window.closeSettingsModal = closeSettingsModal;
  window.changeLanguageFromSelect = changeLanguageFromSelect;
  window.switchSettingTab = switchSettingTab;

})(window);
