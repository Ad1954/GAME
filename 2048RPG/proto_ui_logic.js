// ========================================================
  // I18N MULTI-LANGUAGE SYSTEM (C-STORY-129)
  // ========================================================
  let currentLanguage = 'zh-TW';

  const I18N_DICT = {
    'zh-TW': {
      // Bottom Navigation
      nav_shop: '商店',
      nav_camp: '軍備',
      nav_adventure: '冒險',
      nav_gear: '裝備',
      nav_compendium: '圖鑑',
      
      // Top HUD
      hud_gold: '金幣',
      hud_stamina: '體力',

      // Shop Tab
      shop_pass_title: '終身免廣告 PASS',
      shop_pass_tag: '🛡️ 尊爵終身特權 · 永久免廣告',
      shop_pass_desc: '永久免除每 3 關插頁廣告！所有廣告獎勵直接「一鍵秒領」無需等待！',
      shop_btn_pass_price: 'NT$ 150 永久移除廣告',
      shop_header_daily: '✨ 每日皇家福利',
      shop_daily_free_title: '每日免費軍資箱 (+200🪙)',
      shop_daily_free_desc: '王國軍資每日免費補給 (+200🪙)',
      shop_btn_free: '免費領取',
      shop_ad_title: '福利廣告金幣 (+500🪙)',
      shop_ad_desc: '觀看宣傳短片領取 500 金幣！（免廣告 PASS 玩家點擊秒領）',
      shop_ad_btn: '觀看廣告',
      shop_ad_left: '今日剩餘：3 / 3 次',
      shop_header_passes: '👑 皇家特許通行證與禮包',
      shop_stamina_title: '無限體力通行證',
      shop_stamina_desc: '遠征失利零負擔，敗戰 0 體力消耗，暢遊 350 大關！',
      shop_btn_stamina_price: 'NT$ 90 立即開通',
      shop_gold_title: '50,000 皇家金幣袋',
      shop_gold_desc: '王國軍械庫鉅款！直購大量高級裝備，工坊科技狂飆！',
      shop_btn_gold_price: 'NT$ 60 儲值金幣',

      // Camp Tab (軍備)
      camp_title: '王國軍備前哨營地',
      camp_desc: '升級防衛工事與鍛造設施，大幅強化出擊隊伍基礎戰力！',
      camp_section_title: '🏰 前哨營地基礎設施',
      camp_forge_title: '皇家鐵匠鋪 LV.3',
      camp_forge_desc: '初始棋盤生成裝備基礎階級提升至 T02',
      camp_btn_forge: '升級 🪙800',
      camp_gacha_title: '裝備轉蛋機',
      camp_gacha_desc: '隨機獲得泥雕神兵；十連抽必得應急道具',
      camp_btn_single: '單抽 🪙100',
      camp_btn_ten: '十連抽 🪙1000',
      camp_bag_title: '軍需行囊 (24 ➔ 28格)',
      camp_bag_desc: '擴充 4 格裝備庫容量，通關金幣結算額外+20%',
      camp_btn_expand: '擴充 🪙2000',

      // Adventure Screen
      chapter_1: '第一章：微風之境',
      chapter_2: '第二章：灼熱熔岩',
      chapter_3: '第三章：孤峰岩地',
      chapter_4: '第四章：蛛魔荒漠',
      chapter_5: '第五章：遠古地宮',
      chapter_6: '第六章：滅世黑曜',
      chapter_7: '第七章：神魔深淵',
      chapter_8: '第八章：終焉神域',
      adv_rec_power: '推薦戰力',
      adv_first_clear: '首通金幣獎勵',
      adv_stage_info: '關卡詳細情報',
      adv_details: '詳情 ℹ️',
      btn_deploy: '⚔️ 出擊！',
      btn_stage_deploy: '⚔️ 出擊',
      boss_prefix: '首領',
      gear_power_suffix: '裝備',
      gold_suffix: '金幣',

      // Quick Stage Drawer
      drawer_quick_jump: '快速跳轉關卡',
      drawer_quick_tip: '點選已通關關卡進行切換',
      drawer_progress: '🚩進度',
      drawer_selecting: '選擇中',
      drawer_close: '完成關閉',

      // Stage Detail Modal
      stage_info_title: '關卡詳細情報',
      stage_objective_label: '作戰目標',
      stage_objective_default: '作戰目標：消滅盤面所有魔物',
      stage_minions_title: '其他魔物 (4隻)：',
      stage_gears_title: '場景資源 (裝備品 3 格)：',
      stage_first_gold_title: '🪙 初次通關獎勵：',
      first_clear_reward_label: '初次通關獎勵',
      strategy_tip_label: '攻略提示',
      strategy_tip_text: '使用戰士十字碎裂清除四周卡位金幣！',
      stage_tactical_tip: '💡 攻略提示：使用戰士十字碎裂清除四周卡位金幣！',

      // Gear & Heroes Tab (裝備)
      gear_tab_inventory: '裝備庫',
      gear_tab_heroes: '英雄名單',
      gear_deploy_title: '⚔️ 出擊設置',
      gear_slot_gear: '配戴裝備',
      gear_slot_hero: '上陣英雄',
      gear_btn_unequip: '解除',
      gear_btn_switch_hero: '更換',
      gear_inventory_title: '持有裝備庫',
      gear_capacity_label: '容量：8 / 24',
      gear_btn_gacha: '🎁 裝備轉蛋',
      gear_btn_expand: '📦 擴充容量',
      gear_btn_merge: '✨ 一鍵合成',
      hero_list_title: '王國英雄名單',
      btn_hero_assigned: '上陣中',
      btn_hero_assign: '指派上陣',
      btn_assign_deploy: '🛡️ 指派上陣',
      btn_upgrade: '🔨 升級',
      btn_max_lv: '已滿級',
      hero_modal_weapon_header: '目前神兵形態',
      comp_val_prefix: '數值',

      // Compendium Tab (圖鑑)
      comp_tab_monsters: '魔物圖鑑',
      comp_tab_heroes: '英雄圖鑑',
      comp_tab_gears: '裝備圖鑑',
      comp_progress_lbl: '解鎖進度：',
      comp_unlocked_fmt: '已解鎖',

      // Settings Modal
      settings_title: '⚙️ 遊戲設定',
      stab_general: '⚙️ 基本設定',
      stab_changelog: '📜 更新履歷',
      stab_developer: '🛠️ 開發測試',
      settings_lang: '🌐 語言 (Language)',
      settings_theme: '🎨 盤面底板配色',
      settings_bgm: '🎵 背景音樂 (BGM)',
      settings_sfx: '🔊 音效 (SFX)',
      settings_reset_save: '🗑️ 清除本地存檔 (重置紀錄)',
      settings_reset_btn: '🗑️ 清除本地存檔 (重置紀錄)',
      settings_log_title: '📜 版本更新記錄 (Changelog)',
      settings_changelog_desc: '商業製品測試版 (Phase 1)：<br>獨立純前端運行環境，本地自動存檔。',
      settings_btn_check_update: '🔄 手動檢查版本更新 (無損熱更新)',
      settings_style: '🖼️ 方塊美術造型',
      settings_art_style: '🎨 方塊美術風格 (Art Style)',
      settings_instant_skill: '🛠️ [測試] 技能開場即就緒',
      settings_instant_skill_desc: '進入戰鬥技能充能即為 100% 滿額',
      settings_instant_skills: '⚡ 英雄技能無冷卻 (測試用)',
      settings_clear_tut: '🔄 清除新手教學紀錄 (重置引導狀態)',
      settings_clear_tutorial: '🧹 清除新手教學紀錄 (重播教學)',
      settings_close: '確定關閉'
    },
    'en-US': {
      // Bottom Navigation
      nav_shop: 'Shop',
      nav_camp: 'Camp',
      nav_adventure: 'Battle',
      nav_gear: 'Gear',
      nav_compendium: 'Archive',
      
      // Top HUD
      hud_gold: 'Gold',
      hud_stamina: 'Stamina',

      // Shop Tab
      shop_pass_title: 'Lifetime Ad-Free PASS',
      shop_pass_tag: '🛡️ Royal Lifetime Privilege · No Ads Forever',
      shop_pass_desc: 'Permanently removes all interstitial ads every 3 stages! Instant claim for all ad rewards!',
      shop_btn_pass_price: '$4.99 Remove Ads Forever',
      shop_header_daily: '✨ Daily Royal Benefits',
      shop_daily_free_title: 'Daily Supply Chest (+200🪙)',
      shop_daily_free_desc: 'Free daily kingdom supply pack (+200🪙)',
      shop_btn_free: 'Claim Free',
      shop_ad_title: 'Bonus Video Gold (+500🪙)',
      shop_ad_desc: 'Watch promo video to receive 500 gold! (Ad-free PASS claims instantly)',
      shop_ad_btn: 'Watch Video',
      shop_ad_left: 'Today: 3 / 3 remaining',
      shop_header_passes: '👑 Royal Season Pass & Bundles',
      shop_stamina_title: 'Infinite Stamina Pass',
      shop_stamina_desc: 'Zero stamina cost on defeats! Freely challenge all 350 adventure stages!',
      shop_btn_stamina_price: '$2.99 Unlock Now',
      shop_gold_title: '50,000 Royal Gold Pouch',
      shop_gold_desc: 'Massive treasury pack! Instantly buy high-tier equipment and rush forge tech!',
      shop_btn_gold_price: '$1.99 Refill Gold',

      // Camp Tab (軍備)
      camp_title: '⚔️ Royal Arsenal Outpost',
      camp_desc: 'Upgrade forge and defense works to massively boost army deployment stats!',
      camp_section_title: '🏰 Outpost Facilities',
      camp_forge_title: 'Royal Blacksmith Lv.3',
      camp_forge_desc: 'Initial equipment tile tier upgraded to T02 on board spawn',
      camp_btn_forge: 'Upgrade 🪙800',
      camp_gacha_title: 'Equipment Gacha',
      camp_gacha_desc: 'Random clay divine arms; 10x pull guarantees emergency item',
      camp_btn_single: 'Single 🪙100',
      camp_btn_ten: '10x Pull 🪙1000',
      camp_bag_title: 'Supply Haversack (24 ➔ 28 slots)',
      camp_bag_desc: 'Expands gear vault by 4 slots, stage clear gold +20%',
      camp_btn_expand: 'Expand 🪙2000',

      // Adventure Screen
      chapter_1: 'Chapter 1: Breeze Realm',
      chapter_2: 'Chapter 2: Scorching Magma',
      chapter_3: 'Chapter 3: Crag Peak',
      chapter_4: 'Chapter 4: Spider Desolation',
      chapter_5: 'Chapter 5: Ancient Crypt',
      chapter_6: 'Chapter 6: Obsidian Abyss',
      chapter_7: 'Chapter 7: Astral Rift',
      chapter_8: 'Chapter 8: Genesis Throne',
      adv_rec_power: 'Recommended',
      adv_first_clear: 'First Clear Bonus',
      adv_stage_info: 'Stage Info',
      adv_details: 'Details ℹ️',
      btn_deploy: '⚔️ BATTLE !',
      btn_stage_deploy: '⚔️ BATTLE',
      boss_prefix: 'Boss',
      gear_power_suffix: 'Gear',
      gold_suffix: 'Gold',

      // Quick Stage Drawer
      drawer_quick_jump: 'Quick Stage Jump',
      drawer_quick_tip: 'Select unlocked stage to jump',
      drawer_progress: '🚩Focus',
      drawer_selecting: 'Selected',
      drawer_close: 'Done & Close',

      // Stage Detail Modal
      stage_info_title: 'Stage Info',
      stage_objective_label: 'Objective',
      stage_objective_default: 'Objective: Eliminate all monsters on board',
      stage_minions_title: 'Other Monsters (4):',
      stage_gears_title: 'Stage Resources (3 Gears):',
      stage_first_gold_title: '🪙 First Clear Reward:',
      first_clear_reward_label: 'First Clear Reward',
      strategy_tip_label: 'Strategy Tip',
      strategy_tip_text: 'Use Warrior skill to break surrounding blocker coins!',
      stage_tactical_tip: '💡 Strategy Tip: Use Warrior skill to break surrounding blocker coins!',

      // Gear & Heroes Tab (裝備)
      gear_tab_inventory: 'Inventory',
      gear_tab_heroes: 'Hero Roster',
      gear_deploy_title: '⚔️ Battle Deployment',
      gear_slot_gear: 'Equipped Gear',
      gear_slot_hero: 'Assigned Hero',
      gear_btn_unequip: 'Unequip',
      gear_btn_switch_hero: 'Switch',
      gear_inventory_title: 'Gear Inventory',
      gear_capacity_label: 'Capacity: 8 / 24',
      gear_btn_gacha: '🎁 Gear Gacha',
      gear_btn_expand: '📦 Expand Space',
      gear_btn_merge: '✨ Auto Merge',
      hero_list_title: 'Kingdom Hero Roster',
      btn_hero_assigned: 'ASSIGNED',
      btn_hero_assign: 'DEPLOY',
      btn_assign_deploy: '🛡️ ASSIGN HERO',
      btn_upgrade: '🔨 Upgrade',
      btn_max_lv: 'MAX LV',
      hero_modal_weapon_header: 'Current Divine Weapon',
      comp_val_prefix: 'Value',

      // Compendium Tab (圖鑑)
      comp_tab_monsters: 'Monsters',
      comp_tab_heroes: 'Heroes',
      comp_tab_gears: 'Equipments',
      comp_progress_lbl: 'Progress: ',
      comp_unlocked_fmt: 'Unlocked',

      // Settings Modal
      settings_title: '⚙️ Settings',
      stab_general: '⚙️ General',
      stab_changelog: '📜 Changelog',
      stab_developer: '🛠️ Developer',
      settings_lang: '🌐 Language',
      settings_theme: '🎨 Board Palette Skin',
      settings_bgm: '🎵 Music (BGM)',
      settings_sfx: '🔊 Sound Effects (SFX)',
      settings_reset_save: '🗑️ Clear Save Data (Reset Progress)',
      settings_reset_btn: '🗑️ Clear Save Data (Reset Progress)',
      settings_log_title: '📜 Version Changelog',
      settings_changelog_desc: 'Commercial Showcase Edition (Phase 1):<br>Standalone client environment, auto-saved locally.',
      settings_btn_check_update: '🔄 Check for Updates (Hot-Reload)',
      settings_style: '🖼️ Block Art Style',
      settings_art_style: '🎨 Tile Art Style',
      settings_instant_skill: '🛠️ [Test] Instant Skill Ready',
      settings_instant_skill_desc: 'Skills are 100% fully charged upon entering battle',
      settings_instant_skills: '⚡ Zero Cooldown Skills (Test Mode)',
      settings_clear_tut: '🔄 Reset Tutorial Record',
      settings_clear_tutorial: '🧹 Reset Tutorial Flags',
      settings_close: 'Confirm & Close'
    }
  };
function t(key, fallback = '') {
    const dict = I18N_DICT[currentLanguage] || I18N_DICT['zh-TW'];
    return dict[key] || fallback || key;
  }
function setLanguage(lang) {
    currentLanguage = lang;
    const dict = I18N_DICT[lang] || I18N_DICT['zh-TW'];
    
    // Toggle layout style class on phone mockup
    const phone = document.querySelector('.phone-mockup');
    if (phone) {
      if (lang === 'en-US') phone.classList.add('lang-en');
      else phone.classList.remove('lang-en');
    }

    // Refresh all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (dict[key].includes('<')) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Update Settings Modal Dropdown Options dynamically
    const themeSelect = document.getElementById('setting-theme-select');
    if (themeSelect) {
      const curVal = themeSelect.value;
      const themeOpts = (lang === 'en-US') ? [
        { val: 'kingdom', text: '🏰 Kingdom Expedition (Deep Blue)' },
        { val: 'cyber', text: '🌌 Cyber Neon' },
        { val: 'retro', text: '🕹️ Retro Pixel' },
        { val: 'minimal', text: '⬛ Minimalist Dark' }
      ] : [
        { val: 'kingdom', text: '🏰 王國遠征 (深藍)' },
        { val: 'cyber', text: '🌌 賽博霓虹 (Cyber)' },
        { val: 'retro', text: '🕹️ 復古點陣 (Retro)' },
        { val: 'minimal', text: '⬛ 極簡深邃 (Minimal)' }
      ];
      themeSelect.innerHTML = themeOpts.map(o => `<option value="${o.val}" ${o.val === curVal ? 'selected' : ''}>${o.text}</option>`).join('');
    }

    const styleSelect = document.getElementById('setting-style-select');
    if (styleSelect) {
      const curVal = styleSelect.value;
      const styleOpts = (lang === 'en-US') ? [
        { val: 'clay', text: '🗿 Miniature Model (3D Clay)' },
        { val: 'emoji', text: '🎭 3D Emoji (Chibi)' },
        { val: 'comic', text: '🎨 Cel-Shaded (Comic)' },
        { val: 'pixel', text: '👾 Retro Pixel (16-Bit)' },
        { val: 'voxel', text: '🧱 Voxel Block (3D)' }
      ] : [
        { val: 'clay', text: '🗿 微縮模型 (3D黏土)' },
        { val: 'emoji', text: '🎭 立體 Emoji (Q版)' },
        { val: 'comic', text: '🎨 賽璐璐 (美漫風)' },
        { val: 'pixel', text: '👾 復古點陣 (16-Bit)' },
        { val: 'voxel', text: '🧱 體素方塊 (3D立體)' }
      ];
      styleSelect.innerHTML = styleOpts.map(o => `<option value="${o.val}" ${o.val === curVal ? 'selected' : ''}>${o.text}</option>`).join('');
    }

    // Update bottom deploy buttons if open
    updateModalDeployButtons();

    // Re-render adventure hub, compendium and gear capacity
    renderAdventureStage();
    renderHeroRoster();
    renderCompendiumView();
    const capEl = document.getElementById('gear-txt-capacity');
    if (capEl) capEl.textContent = `${t('gear_capacity_label')}`;
  }

  function changeLanguageFromSelect(lang) {
    setLanguage(lang);
  }

  // Settings Modal Open/Close
  
  // Settings Tabs Switching (C-STORY-131)
  function switchSettingTab(tabKey) {
    const tabs = ['general', 'changelog', 'developer'];
    tabs.forEach(t => {
      const btn = document.getElementById(`btn-stab-${t}`);
      const pane = document.getElementById(`pane-setting-${t}`);
      if (btn) {
        if (t === tabKey) btn.classList.add('active');
        else btn.classList.remove('active');
      }
      if (pane) {
        if (t === tabKey) pane.classList.add('active');
        else pane.classList.remove('active');
      }
    });
  }

  function openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.add('active');
  }

  function closeSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.remove('active');
  }

  // ========================================================
  // STATE MANAGEMENT FOR SHOWCASE V2.0
  // ========================================================
  var MAX_UNLOCKED_STAGE = parseInt(localStorage.getItem("rpg_2048_max_stage") || "1", 10); // Player current progress gate
  let currentSelectedStage = 12;
  let activeDeployedHero = 'warrior';
  let activeDeployedGear = { name: '聖殿光刃 (512)', val: 512, img: 'assets/images/equipment_clay/equip_09.png' };
  let currentCompTab = 'monsters';

  const CHAPTER_CONFIGS = [
    { id: 0, nameZh: '序章：新手訓練所', nameEn: 'Prologue: Training Camp', range: [0, 0] },
    { id: 1, nameZh: '第一章：微風之境', nameEn: 'Chapter 1: Breeze Realm', range: [1, 5] },
    { id: 2, nameZh: '第二章：灼熱熔岩', nameEn: 'Chapter 2: Scorching Magma', range: [6, 20] },
    { id: 3, nameZh: '第三章：孤峰岩地', nameEn: 'Chapter 3: Crag Peak', range: [21, 50] },
    { id: 4, nameZh: '第四章：蛛魔荒漠', nameEn: 'Chapter 4: Spider Desolation', range: [51, 90] },
    { id: 5, nameZh: '第五章：遠古地宮', nameEn: 'Chapter 5: Ancient Crypt', range: [91, 150] },
    { id: 6, nameZh: '第六章：滅世黑曜', nameEn: 'Chapter 6: Obsidian Abyss', range: [151, 220] },
    { id: 7, nameZh: '第七章：神魔深淵', nameEn: 'Chapter 7: Astral Rift', range: [221, 280] },
    { id: 8, nameZh: '第八章：終焉神域', nameEn: 'Chapter 8: Genesis Throne', range: [281, 350] }
  ];

  // Chapter Monster Artwork mapping table (100% aligned with CHAPTER_MONSTER_POOLS)
  const CHAPTER_MONSTER_DATABASE = {
    1: {
      nameZh: '第一章：微風之境', nameEn: 'Chapter 1: Breeze Realm',
      monsters: {
        2:  { nameZh: '洞穴蝙蝠', nameEn: 'Cave Bat', img: 'assets/images/monsters_clay/monster_ch01_02.png' },
        4:  { nameZh: '森林幼狼', nameEn: 'Young Wolf', img: 'assets/images/monsters_clay/monster_ch01_04.png' },
        8:  { nameZh: '哥布林斥候', nameEn: 'Goblin Scout', img: 'assets/images/monsters_clay/monster_ch01_08.png' },
        16: { nameZh: '野生史萊姆', nameEn: 'Wild Slime', img: 'assets/images/monsters_clay/monster_ch01_16.png' },
        32: { nameZh: '獸人督軍', nameEn: 'Orc Warlord', img: 'assets/images/monsters_clay/monster_ch01_32.png' }
      }
    },
    2: {
      nameZh: '第二章：灼熱熔岩', nameEn: 'Chapter 2: Scorching Magma',
      monsters: {
        16:  { nameZh: '火苗蜥蜴', nameEn: 'Flame Lizard', img: 'assets/images/monsters_clay/monster_ch02_16.png' },
        32:  { nameZh: '熔岩火靈', nameEn: 'Magma Spirit', img: 'assets/images/monsters_clay/monster_ch02_32.png' },
        64:  { nameZh: '熔岩史萊姆', nameEn: 'Lava Slime', img: 'assets/images/monsters_clay/monster_ch02_64.png' },
        128: { nameZh: '炎魔督軍', nameEn: 'Infernal Warlord', img: 'assets/images/monsters_clay/monster_ch02_128.png' },
        256: { nameZh: '赤炎巨魔', nameEn: 'Blazing Troll', img: 'assets/images/monsters_clay/monster_ch02_256.png' },
        512: { nameZh: '黑曜熔岩龍', nameEn: 'Obsidian Magma Dragon', img: 'assets/images/monsters_clay/monster_ch02_512.png' }
      }
    },
    3: {
      nameZh: '第三章：孤峰岩地', nameEn: 'Chapter 3: Crag Peak',
      monsters: {
        64:   { nameZh: '懸崖強盜', nameEn: 'Cliff Bandit', img: 'assets/images/monsters_clay/monster_ch03_64.png' },
        128:  { nameZh: '落石石像鬼', nameEn: 'Falling Stone Gargoyle', img: 'assets/images/monsters_clay/monster_ch03_128.png' },
        256:  { nameZh: '岩穴巨蜥', nameEn: 'Crag Giant Lizard', img: 'assets/images/monsters_clay/monster_ch03_256.png' },
        512:  { nameZh: '石魔守衛', nameEn: 'Stone Golem Guard', img: 'assets/images/monsters_clay/monster_ch03_512.png' },
        1024: { nameZh: '山嶺巨人', nameEn: 'Mountain Colossus', img: 'assets/images/monsters_clay/monster_ch03_1024.png' },
        2048: { nameZh: '岩地霸主', nameEn: 'Crag Overlord', img: 'assets/images/monsters_clay/monster_ch03_2048.png' }
      }
    },
    4: {
      nameZh: '第四章：蛛魔荒漠', nameEn: 'Chapter 4: Spider Desolation',
      monsters: {
        256:  { nameZh: '沙丘毒蠍', nameEn: 'Dune Scorpion', img: 'assets/images/monsters_clay/monster_ch04_256.png' },
        512:  { nameZh: '刺針母蛛', nameEn: 'Needle Broodmother', img: 'assets/images/monsters_clay/monster_ch04_512.png' },
        1024: { nameZh: '荒漠毒蛛', nameEn: 'Desert Venom Spider', img: 'assets/images/monsters_clay/monster_ch04_1024.png' },
        2048: { nameZh: '蛛魔祭司', nameEn: 'Arachnid Priest', img: 'assets/images/monsters_clay/monster_ch04_2048.png' },
        4096: { nameZh: '遠古蛛皇', nameEn: 'Ancient Brood Sovereign', img: 'assets/images/monsters_clay/monster_ch04_4096.png' }
      }
    },
    5: {
      nameZh: '第五章：遠古地宮', nameEn: 'Chapter 5: Ancient Crypt',
      monsters: {
        1024:  { nameZh: '不死骷髏', nameEn: 'Undead Skeleton', img: 'assets/images/monsters_clay/monster_ch05_1024.png' },
        2048:  { nameZh: '幽魂術士', nameEn: 'Wraith Sorcerer', img: 'assets/images/monsters_clay/monster_ch05_2048.png' },
        4096:  { nameZh: '皇陵守衛', nameEn: 'Crypt Guardian', img: 'assets/images/monsters_clay/monster_ch05_4096.png' },
        8192:  { nameZh: '木乃伊王', nameEn: 'Mummy King', img: 'assets/images/monsters_clay/monster_ch05_8192.png' },
        16384: { nameZh: '冥界巫妖', nameEn: 'Nether Lich', img: 'assets/images/monsters_clay/monster_ch05_16384.png' }
      }
    },
    6: {
      nameZh: '第六章：滅世黑曜', nameEn: 'Chapter 6: Obsidian Abyss',
      monsters: {
        4096:  { nameZh: '黑曜石魔', nameEn: 'Obsidian Golem', img: 'assets/images/monsters_clay/monster_ch06_4096.png' },
        8192:  { nameZh: '黑曜熔火怪', nameEn: 'Obsidian Molten Beast', img: 'assets/images/monsters_clay/monster_ch06_8192.png' },
        16384: { nameZh: '黑曜幼龍', nameEn: 'Obsidian Drake', img: 'assets/images/monsters_clay/monster_ch06_16384.png' },
        32768: { nameZh: '黑曜侍僧', nameEn: 'Obsidian Acolyte', img: 'assets/images/monsters_clay/monster_ch06_32768.png' },
        65536: { nameZh: '遠古黑曜巨龍', nameEn: 'Ancient Obsidian Dragon', img: 'assets/images/monsters_clay/monster_ch06_65536.png' }
      }
    },
    7: {
      nameZh: '第七章：神魔深淵', nameEn: 'Chapter 7: Astral Rift',
      monsters: {
        16384:  { nameZh: '虛空行者', nameEn: 'Void Walker', img: 'assets/images/monsters_clay/monster_ch07_16384.png' },
        32768:  { nameZh: '深淵眼魔', nameEn: 'Nether Beholder', img: 'assets/images/monsters_clay/monster_ch07_32768.png' },
        65536:  { nameZh: '裂隙巨妖', nameEn: 'Rift Kraken', img: 'assets/images/monsters_clay/monster_ch07_65536.png' },
        131072: { nameZh: '混沌魔皇', nameEn: 'Chaos Demon Emperor', img: 'assets/images/monsters_clay/monster_ch07_131072.png' }
      }
    },
    8: {
      nameZh: '第八章：終焉神域', nameEn: 'Chapter 8: Genesis Throne',
      monsters: {
        65536:  { nameZh: '天界裁決者', nameEn: 'Celestial Arbiter', img: 'assets/images/monsters_clay/monster_ch08_65536.png' },
        131072: { nameZh: '終焉智腦', nameEn: 'Genesis Brain', img: 'assets/images/monsters_clay/monster_ch08_131072.png' },
        262144: { nameZh: '萬古始祖神', nameEn: 'Ancient Primordial God', img: 'assets/images/monsters_clay/monster_ch08_262144.png' }
      }
    }
  };
  const BOSS_ART_MAP = CHAPTER_MONSTER_DATABASE;

  const GEAR_TIER_NAMES = {
    2: { nameZh: '泥木劍', nameEn: 'Wood Sword' },
    4: { nameZh: '青銅刃', nameEn: 'Bronze Blade' },
    8: { nameZh: '泥盾靴', nameEn: 'Leather Boots' },
    16: { nameZh: '鐵甲胸鎧', nameEn: 'Chainmail' },
    32: { nameZh: '秘銀闊劍', nameEn: 'Mithril Sword' },
    64: { nameZh: '皇家重甲', nameEn: 'Royal Armor' },
    128: { nameZh: '榮耀法靴', nameEn: 'Honor Boots' },
    256: { nameZh: '輝煌神盾', nameEn: 'Glory Shield' },
    512: { nameZh: '聖殿光刃', nameEn: 'Paladin Blade' },
    1024: { nameZh: '永恆聖劍', nameEn: 'Eternal Blade' },
    2048: { nameZh: '滅神狂斬', nameEn: 'Godslayer' },
    4096: { nameZh: '混沌天斧', nameEn: 'Chaos Axe' },
    8192: { nameZh: '龍皇破滅', nameEn: 'Dragon Buster' }
  };

  function getStageChapter(s) {
    for (const ch of CHAPTER_CONFIGS) {
      if (s >= ch.range[0] && s <= ch.range[1]) return ch.id;
    }
    return 1;
  }

  function getStageDef(s) {
    const ch = getStageChapter(s);
    const chData = CHAPTER_MONSTER_DATABASE[ch] || CHAPTER_MONSTER_DATABASE[1];
    
    // Calculate stage boss power value matching 350-stage design curve
    let val = 64;
    if (ch === 1) {
      if (s === 1) val = 8;
      else if (s <= 3) val = 16;
      else val = 32;
    } else if (ch === 2) {
      if (s === 6) val = 32;
      else if (s <= 14) val = 64;
      else if (s <= 17) val = 128;
      else if (s <= 19) val = 256;
      else val = 512;
    } else if (ch === 3) {
      if (s <= 27) val = 512;
      else if (s <= 41) val = 1024;
      else val = 2048;
    } else if (ch === 4) {
      if (s <= 65) val = 2048;
      else val = 4096;
    } else if (ch === 5) {
      if (s <= 120) val = 8192;
      else val = 16384;
    } else if (ch === 6) {
      if (s <= 180) val = 32768;
      else val = 65536;
    } else if (ch === 7) {
      if (s <= 250) val = 65536;
      else val = 131072;
    } else {
      if (s <= 310) val = 131072;
      else val = 262144;
    }

    // Retrieve chapter-specific boss data
    const mData = chData.monsters[val] || Object.values(chData.monsters)[Object.values(chData.monsters).length - 1];
    const bossNameZh = mData.nameZh;
    const bossNameEn = mData.nameEn;
    const bossName = (currentLanguage === 'en-US') ? bossNameEn : bossNameZh;
    const bossImg = mData.img;

    // Pick 4 minions from current chapter's monster pool
    const chMonsterList = Object.entries(chData.monsters).map(([v, m]) => ({ val: parseInt(v), ...m }));
    const validMinions = chMonsterList.filter(m => m.val <= val);
    const pool = (validMinions.length > 0) ? validMinions : chMonsterList;
    const minions = [];
    for (let i = 0; i < 4; i++) {
      const pick = pool[Math.min(i % pool.length, pool.length - 1)];
      minions.push(pick);
    }

    // 3 Gear resources matching stage tier
    const gVals = [8, 4, 2];
    const gears = gVals.map(gv => {
      const gObj = GEAR_TIER_NAMES[gv] || { nameZh: '裝備', nameEn: 'Gear' };
      return { val: gv, nameZh: gObj.nameZh, nameEn: gObj.nameEn };
    });

    return {
      chapterId: ch,
      chapterNameZh: chData.nameZh,
      chapterNameEn: chData.nameEn,
      chapterName: (currentLanguage === 'en-US') ? chData.nameEn : chData.nameZh,
      val: val,
      bossImg: bossImg,
      bossNameZh: bossNameZh,
      bossNameEn: bossNameEn,
      bossName: bossName,
      minions: minions,
      gears: gears,
      gold: 1000 + s * 45
    };
  }

  // 1. Bottom Main Navigation Tab Switching
  function switchMainTab(tabKey) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));

    const tabIndices = { 'shop': 0, 'camp': 1, 'adventure': 2, 'gear': 3, 'compendium': 4 };
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems[tabIndices[tabKey]]) {
      navItems[tabIndices[tabKey]].classList.add('active');
    }

    const viewEl = document.getElementById(`view-${tabKey}`);
    if (viewEl) viewEl.classList.add('active');
  }

  // 2. Gear & Hero Sub-tab Switching
  function switchGearSubTab(subKey) {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));

    document.getElementById(`btn-sub-${subKey}`).classList.add('active');
    document.getElementById(`subview-${subKey}`).classList.add('active');
  }

  // 3. Stage Switching Logic (Enforced Unlocked Range Gate)
  function renderAdventureStage() {
    const data = getStageDef(currentSelectedStage);
    document.getElementById('hub-stage-num').textContent = `Stage ${currentSelectedStage}`;
    
    // Chapter Title Localization
    const chapTag = document.getElementById('hub-chap-tag');
    if (chapTag) {
      chapTag.textContent = data.chapterName;
    }

    // Boss Artwork and Localized Name
    const bossImgEl = document.getElementById('arena-boss-img');
    if (bossImgEl) bossImgEl.src = data.bossImg;
    const bName = (currentLanguage === 'en-US') ? (data.bossNameEn || data.bossName) : (data.bossNameZh || data.bossName);
    document.getElementById('arena-boss-name').textContent = `${t('boss_prefix')}：${bName} (${data.val})`;
    
    // Brief stats
    document.getElementById('brief-rec-power').textContent = `${data.val * 2} ${t('gear_power_suffix')}`;
    document.getElementById('brief-first-gold').textContent = `🪙 ${data.gold.toLocaleString()}`;

    // Update Nav Arrows Disabled States
    const prevBtn = document.getElementById('btn-stage-prev');
    const nextBtn = document.getElementById('btn-stage-next');
    if (currentSelectedStage <= 1) {
      prevBtn.classList.add('disabled');
    } else {
      prevBtn.classList.remove('disabled');
    }

    if (currentSelectedStage >= MAX_UNLOCKED_STAGE) {
      nextBtn.classList.add('disabled');
    } else {
      nextBtn.classList.remove('disabled');
    }
  }

  function changeStageByStep(step) {
    const target = currentSelectedStage + step;
    if (target < 1 || target > MAX_UNLOCKED_STAGE) {
      return; // Gatekept!
    }
    currentSelectedStage = target;
    renderAdventureStage();
  }

  // 4. Quick Stage Drawer (1~50 Stages with Cleared Mark, Furthest Progress, and Selected Mark - C-STORY-125)
  function openQuickStageDrawer() {
    const drawer = document.getElementById('drawer-quick-stage');
    const grid = document.getElementById('quick-stage-grid');
    grid.innerHTML = '';

    for (let s = 1; s <= 50; s++) {
      const cell = document.createElement('div');
      cell.className = 'drawer-cell';

      const progTxt = t('drawer_progress', '🚩進度');
      const selTxt = t('drawer_selecting', '選擇中');

      if (s < MAX_UNLOCKED_STAGE) {
        cell.classList.add('cleared');
        cell.innerHTML = `<span>${s}</span><span style="font-size:0.55rem; color:#34d399;">✔️</span>`;
      } else if (s === MAX_UNLOCKED_STAGE) {
        cell.classList.add('progress');
        cell.innerHTML = `<span>${s}</span><span style="font-size:0.52rem; color:#fbbf24;">${progTxt}</span>`;
      } else {
        cell.classList.add('locked');
        cell.innerHTML = `<span>🔒</span>`;
      }

      if (s === currentSelectedStage) {
        cell.classList.add('selected');
        cell.innerHTML = `<span>${s}</span><span style="font-size:0.52rem; color:#ffffff;">${selTxt}</span>`;
      }

      cell.onclick = () => {
        if (s > MAX_UNLOCKED_STAGE) {
          alert('🔒 該關卡尚未解鎖！');
          return;
        }
        currentSelectedStage = s;
        renderAdventureStage();
        closeQuickStageDrawer();
      };

      grid.appendChild(cell);
    }

    drawer.classList.add('active');
  }

  function closeQuickStageDrawer() {
    document.getElementById('drawer-quick-stage').classList.remove('active');
  }

  // 4.5. Daily Sign-In & Daily Quests Retention Modals (C-STORY-125 1:1 Game Spec)
  let signInClaimedToday = false;

  const SIGNIN_REWARDS_DATA = [
    { day: 1, gold: 1000, icon: '🪙', desc: '1,000' },
    { day: 2, gold: 1200, icon: '🪙', desc: '1,200' },
    { day: 3, gold: 1500, icon: '🪙', desc: '1,500' },
    { day: 4, gold: 1800, icon: '🪙', desc: '1,800' },
    { day: 5, gold: 2200, icon: '🪙', desc: '2,200 (今日)' },
    { day: 6, gold: 3000, icon: '🪙', desc: '3,000' },
    { day: 7, gold: 5000, icon: '🎁', desc: '5000 + 🔨x2 + ⏳x2' }
  ];

  function renderSignInCards() {
    const container = document.getElementById('signin-cards-container');
    if (!container) return;
    container.innerHTML = '';

    SIGNIN_REWARDS_DATA.forEach((r, idx) => {
      const card = document.createElement('div');
      card.className = 'signin-reward-card';
      if (r.day === 7) card.classList.add('day-7');

      if (r.day < 5) {
        card.classList.add('claimed');
        card.innerHTML = `
          <div style="color:#94a3b8; font-weight:700;">第${r.day}天</div>
          <div style="font-size:1.3rem;">${r.icon}</div>
          <div style="color:#34d399; font-weight:800;">${r.desc}</div>
          <div style="color:#34d399; font-size:0.6rem;">✔️ 已領</div>
        `;
      } else if (r.day === 5) {
        card.classList.add('today');
        if (signInClaimedToday) card.classList.add('claimed');
        card.innerHTML = `
          <div style="color:#38bdf8; font-weight:800;">第${r.day}天</div>
          <div style="font-size:1.3rem;">${r.icon}</div>
          <div style="color:#fbbf24; font-weight:900;">${r.desc}</div>
          <div style="color:${signInClaimedToday ? '#34d399' : '#38bdf8'}; font-size:0.6rem;">${signInClaimedToday ? '✔️ 已領' : '✨ 可領'}</div>
        `;
      } else {
        card.innerHTML = `
          <div style="color:#64748b; font-weight:700;">第${r.day}天</div>
          <div style="font-size:1.3rem; opacity:0.5;">${r.icon}</div>
          <div style="color:#94a3b8; font-weight:700;">${r.desc}</div>
          <div style="color:#64748b; font-size:0.6rem;">🔒 未到</div>
        `;
      }

      container.appendChild(card);
    });
  }

  function openDailySignInModal() {
    renderSignInCards();
    const btn = document.getElementById('btn-claim-signin');
    const hint = document.getElementById('signin-hint-text');
    if (signInClaimedToday) {
      btn.className = 'cr-btn cr-btn-amber btn-large';
      btn.innerHTML = '<span>今日已簽到，明日再來</span>';
      hint.textContent = '✅ 今日已完成簽到，明天再來吧！點擊畫面任何一處皆可關閉。';
    } else {
      btn.className = 'cr-btn cr-btn-green btn-large';
      btn.innerHTML = '<span>立即簽到領取獎勵</span>';
      hint.textContent = '每天登入簽到領取豐厚軍資，連續簽到解鎖神級大禮！';
    }
    document.getElementById('modal-daily-signin').classList.add('active');
  }

  function closeDailySignInModal() {
    document.getElementById('modal-daily-signin').classList.remove('active');
  }

  function handleSignInButtonClick() {
    if (!signInClaimedToday) {
      signInClaimedToday = true;
      alert('🎉 簽到成功！獲得 第5天獎勵：金幣 x2,200！');
      openDailySignInModal(); // re-render state
    } else {
      // User rule: When already signed in, clicking this button closes the modal!
      closeDailySignInModal();
    }
  }

  function handleSignInOverlayClick(e) {
    // If today is already signed in, clicking anywhere closes the modal!
    if (signInClaimedToday) {
      closeDailySignInModal();
    } else if (e.target.id === 'modal-daily-signin') {
      closeDailySignInModal();
    }
  }

  function openDailyQuestsModal() {
    document.getElementById('modal-daily-quests').classList.add('active');
  }

  function closeDailyQuestsModal() {
    document.getElementById('modal-daily-quests').classList.remove('active');
  }

  // 5. Stage Detail POPUP (Clean Battle Objective, No Stamina Mention)
  function openStageDetailModal() {
    const data = getStageDef(currentSelectedStage);
    const isEn = (currentLanguage === 'en-US');
    const modalTitle = document.getElementById('modal-stage-title');
    if (modalTitle) {
      modalTitle.textContent = isEn 
        ? `Stage ${currentSelectedStage} · Stage Info`
        : `第 ${currentSelectedStage} 關 · 關卡詳細情報`;
    }
    
    const modalBossImg = document.getElementById('modal-boss-img');
    if (modalBossImg) modalBossImg.src = data.bossImg;
    
    const bName = isEn ? (data.bossNameEn || data.bossName) : (data.bossNameZh || data.bossName);
    const bossNameEl = document.getElementById('modal-boss-name');
    if (bossNameEl) bossNameEl.textContent = `${t('boss_prefix')} : ${bName} (${data.val})`;
    
    const objEl = document.getElementById('modal-stage-objective');
    if (objEl) {
      objEl.textContent = isEn 
        ? 'Objective: Eliminate all monsters on board' 
        : '作戰目標：消滅盤面所有魔物';
    }

    const goldRewardEl = document.getElementById('modal-gold-reward');
    if (goldRewardEl) {
      goldRewardEl.innerHTML = isEn
        ? `First Clear Reward: <span style="color:#fbbf24; font-weight:800;">${data.gold.toLocaleString()} Gold</span>`
        : `初次通關獎勵：<span style="color:#fbbf24; font-weight:800;">${data.gold.toLocaleString()} 金幣</span>`;
    }
    
    // Minions (4 monsters from chapter pool)
    const minionsContainer = document.getElementById('modal-minions-list');
    if (minionsContainer) {
      minionsContainer.innerHTML = data.minions.map(m => {
        const mName = isEn ? m.nameEn : m.nameZh;
        return `<span class="arena-badge" style="background:#334155; color:#cbd5e1; padding:3px 8px; border-radius:6px; font-weight:700;">${mName} (${m.val})</span>`;
      }).join(' ');
    }

    // Stage Gears (3 items)
    const gContainer = document.getElementById('modal-stage-gears');
    if (gContainer) {
      gContainer.innerHTML = data.gears.map(g => {
        const gName = isEn ? g.nameEn : g.nameZh;
        return `<span class="arena-badge" style="background:#1e293b; border:1px solid #3b82f6; color:#93c5fd; padding:3px 8px; border-radius:6px; font-weight:700;">${gName} (${g.val})</span>`;
      }).join(' ');
    }

    const tipEl = document.getElementById('modal-tactical-tip');
    if (tipEl) {
      tipEl.textContent = isEn
        ? '💡 Strategy Tip: Use Warrior skill to break surrounding blocker coins!'
        : '💡 攻略提示：使用戰士十字碎裂清除四周卡位金幣！';
    }

    document.getElementById('modal-stage-detail').classList.add('active');
  }

function closeStageDetailModal() {
    document.getElementById('modal-stage-detail').classList.remove('active');
  }

  function launchStageBattle() {
    const heroNameMap = { 'warrior': '戰士', 'merchant': '戰地商人', 'archer': '精靈弓箭手' };
    alert(`⚔️ 正式進入關卡戰鬥！\n關卡：Stage ${currentSelectedStage}\n上陣英雄：${heroNameMap[activeDeployedHero] || activeDeployedHero}\n佩戴裝備：${activeDeployedGear.name}`);
  }

  // 6. Hero Detail Modal with Appearance Switcher, Roomy Video / Conceptual Demo, Upgrade & Deploy
  let modalHeroSelected = 'warrior';
  let modalHeroPreviewTierIdx = 2; // Default to Tier 9 (512 power)

  const HERO_CONFIGS = {
    warrior: {
      nameZh: '戰士',
      nameEn: 'Warrior',
      titleZh: '戰士 (Warrior)',
      titleEn: 'Warrior',
      levelZh: '等級：LV.5 (已達最高階)',
      levelEn: 'Level: Lv.5 (Max Tier reached)',
      skillTitleZh: '⚔️ 專屬技能：十字碎裂',
      skillTitleEn: '⚔️ Exclusive Skill: Cross Smash',
      skillDescZh: '以英雄為中心粉碎上下左右4格內的裝備與金幣（不傷魔物），滿盤瀕危時自動觸發保命。<br><span style="color:#94a3b8;">⚠️ 碎裂的金幣直接粉碎消除，無法折現入袋。</span>',
      skillDescEn: 'Smashes equipment & gold tiles in 4 adjacent tiles around hero (harmless to monsters). Auto-triggers when board is locked!<br><span style="color:#94a3b8;">⚠️ Smashed gold tiles are pulverized and not cashed out.</span>',
      cdZh: '冷卻回合：100 回合 (滿級極速)',
      cdEn: 'Cooldown: 100 turns (Max speed)',
      isMaxLevel: true,
      upgradeCost: 0,
      postureZh: '✦ 聖殿光刃戰鬥姿態',
      postureEn: '✦ Paladin Blade Stance',
      skillShortZh: '技能：十字碎裂',
      skillShortEn: 'Skill: Cross Smash',
      tiers: [
        { labelZh: 'Tier 1 (戰力 2)', labelEn: 'Tier 1 (Power 2)', img: 'assets/images/hero_knight/hero_01.png' },
        { labelZh: 'Tier 5 (戰力 32)', labelEn: 'Tier 5 (Power 32)', img: 'assets/images/hero_knight/hero_05.png' },
        { labelZh: 'Tier 9 (戰力 512)', labelEn: 'Tier 9 (Power 512)', img: 'assets/images/hero_knight/hero_09.png' }
      ]
    },
    merchant: {
      nameZh: '戰地商人',
      nameEn: 'Merchant',
      titleZh: '戰地商人 (Royal Merchant)',
      titleEn: 'Royal Merchant',
      levelZh: '等級：LV.1',
      levelEn: 'Level: Lv.1',
      skillTitleZh: '🪙 專屬技能：黃金急召',
      skillTitleEn: '🪙 Exclusive Skill: Gold Rush',
      skillDescZh: '瞬間強制回收盤面上所有的金幣方塊並直接折現入袋，騰出空格；滿盤瀕危時自動觸發保命。',
      skillDescEn: 'Instantly cashes out all gold tiles on board into inventory, freeing empty tiles. Auto-triggers when board is locked!',
      cdZh: '冷卻回合：500 回合 (LV.1)',
      cdEn: 'Cooldown: 500 turns (Lv.1)',
      isMaxLevel: false,
      upgradeCost: 5000,
      postureZh: '✦ 皇家金庫守護姿態',
      postureEn: '✦ Royal Vault Guard Stance',
      skillShortZh: '技能：黃金急召',
      skillShortEn: 'Skill: Gold Rush',
      tiers: [
        { labelZh: 'Tier 1 (戰力 2)', labelEn: 'Tier 1 (Power 2)', img: 'assets/images/hero_knight/hero_01.png' },
        { labelZh: 'Tier 5 (戰力 32)', labelEn: 'Tier 5 (Power 32)', img: 'assets/images/hero_knight/hero_05.png' },
        { labelZh: 'Tier 9 (戰力 512)', labelEn: 'Tier 9 (Power 512)', img: 'assets/images/hero_knight/hero_09.png' }
      ]
    },
    archer: {
      nameZh: '精靈弓手',
      nameEn: 'Archer',
      titleZh: '精靈弓箭手 (Elf Archer)',
      titleEn: 'Elf Archer',
      levelZh: '等級：LV.1',
      levelEn: 'Level: Lv.1',
      skillTitleZh: '🏹 專屬技能：破甲重矢',
      skillTitleEn: '🏹 Exclusive Skill: Armor Piercer',
      skillDescZh: '鎖定全場數值最大的魔物：若大於等於4則數值折半；若為2則直接射殺。純主動進攻，無被動保命。',
      skillDescEn: 'Locks onto the strongest monster on board: cuts value in half if >= 4; instantly snipes if value is 2. Pure offensive skill, no auto-protection.',
      cdZh: '冷卻回合：500 回合 (LV.1)',
      cdEn: 'Cooldown: 500 turns (Lv.1)',
      isMaxLevel: false,
      upgradeCost: 5000,
      postureZh: '✦ 幻影神射手姿態',
      postureEn: '✦ Phantom Archer Stance',
      skillShortZh: '技能：破甲重矢',
      skillShortEn: 'Skill: Armor Piercer',
      tiers: [
        { labelZh: 'Tier 1 (戰力 2)', labelEn: 'Tier 1 (Power 2)', img: 'assets/images/hero_knight/hero_01.png' },
        { labelZh: 'Tier 5 (戰力 32)', labelEn: 'Tier 5 (Power 32)', img: 'assets/images/hero_knight/hero_03.png' },
        { labelZh: 'Tier 9 (戰力 512)', labelEn: 'Tier 9 (Power 512)', img: 'assets/images/hero_knight/hero_09.png' }
      ]
    }
  };

  function updateHeroAppearancePreview() {
    const isEn = (currentLanguage === 'en-US');
    const conf = HERO_CONFIGS[modalHeroSelected] || HERO_CONFIGS.warrior;
    const tierData = conf.tiers[modalHeroPreviewTierIdx] || conf.tiers[0];
    const portrait = document.getElementById('modal-hero-portrait');
    const tierLabel = document.getElementById('modal-hero-tier-label');
    const postureLabel = document.getElementById('modal-hero-posture-label');
    if (portrait) portrait.src = tierData.img;
    if (tierLabel) tierLabel.textContent = isEn ? tierData.labelEn : tierData.labelZh;
    if (postureLabel) postureLabel.textContent = isEn ? conf.postureEn : conf.postureZh;

    const weaponHdr = document.getElementById('modal-weapon-header');
    if (weaponHdr) weaponHdr.textContent = isEn ? 'Current Divine Weapon' : '目前神兵形態';
  }

  function stepHeroTierPreview(delta) {
    const conf = HERO_CONFIGS[modalHeroSelected] || HERO_CONFIGS.warrior;
    modalHeroPreviewTierIdx += delta;
    if (modalHeroPreviewTierIdx < 0) modalHeroPreviewTierIdx = conf.tiers.length - 1;
    if (modalHeroPreviewTierIdx >= conf.tiers.length) modalHeroPreviewTierIdx = 0;
    updateHeroAppearancePreview();
  }

  function openHeroDetailModal(heroKey) {
    modalHeroSelected = heroKey;
    modalHeroPreviewTierIdx = 2; // Default to Tier 9 (512)
    const modal = document.getElementById('modal-hero-detail');
    const video = document.getElementById('hero-demo-video');
    const conceptCard = document.getElementById('hero-demo-concept');
    const conf = HERO_CONFIGS[heroKey] || HERO_CONFIGS.warrior;
    const isEn = (currentLanguage === 'en-US');

    document.getElementById('modal-hero-title').textContent = isEn ? conf.titleEn : conf.titleZh;
    document.getElementById('modal-hero-level').textContent = isEn ? conf.levelEn : conf.levelZh;
    document.getElementById('modal-skill-title').textContent = isEn ? conf.skillTitleEn : conf.skillTitleZh;
    document.getElementById('modal-skill-desc').innerHTML = isEn ? conf.skillDescEn : conf.skillDescZh;
    document.getElementById('modal-skill-cd').textContent = isEn ? conf.cdEn : conf.cdZh;

    updateHeroAppearancePreview();

    // Video Demo for Warrior; Conceptual Skill Cards for Merchant & Archer
    if (heroKey === 'warrior') {
      video.style.display = 'block';
      conceptCard.style.display = 'none';
      video.play().catch(() => {});
    } else if (heroKey === 'merchant') {
      video.style.display = 'none';
      video.pause();
      conceptCard.style.display = 'flex';
      document.getElementById('concept-icon-badge').textContent = '🪙✨';
      document.getElementById('concept-title').textContent = isEn ? '【Gold Rush Combat Demo】' : '【黃金急召 實戰示意】';
      document.getElementById('concept-flow').innerHTML = isEn 
        ? 'Instantly cashes out all gold on board ➔ Gain riches ➔ Quickly free up board space'
        : '全場金幣瞬間強制折現入袋 ➔ 獲得大量財富 ➔ 極速騰出盤面空格';
    } else if (heroKey === 'archer') {
      video.style.display = 'none';
      video.pause();
      conceptCard.style.display = 'flex';
      document.getElementById('concept-icon-badge').textContent = '🏹🎯';
      document.getElementById('concept-title').textContent = isEn ? '【Armor Piercer Combat Demo】' : '【破甲重矢 實戰示意】';
      document.getElementById('concept-flow').innerHTML = isEn
        ? 'Pierces obstacles to target largest monster ➔ Value halved / Tier 2 sniped'
        : '貫穿障礙鎖定全場最大魔物 ➔ 數值直接減半 / 數值2魔物秒殺';
    }

    // Update Bottom Action Buttons
    const upgradeBtn = document.getElementById('modal-upgrade-btn');
    if (conf.isMaxLevel) {
      upgradeBtn.className = 'cr-btn cr-btn-disabled btn-medium';
      upgradeBtn.innerHTML = `<span>${isEn ? 'MAX LV' : '已滿級'}</span>`;
      upgradeBtn.onclick = null;
    } else {
      upgradeBtn.className = 'cr-btn cr-btn-green btn-medium';
      upgradeBtn.innerHTML = `<span>🔨 ${isEn ? 'Upgrade' : '升級'} 🪙${conf.upgradeCost}</span>`;
      upgradeBtn.onclick = upgradeHeroFromModal;
    }

    updateModalDeployButtons();
    modal.classList.add('active');
  }

  function upgradeHeroFromModal() {
    const conf = HERO_CONFIGS[modalHeroSelected];
    if (conf && !conf.isMaxLevel) {
      alert(`🔨 成功花費 🪙${conf.upgradeCost} 升級 ${conf.titleZh}！`);
    }
  }

  function updateModalDeployButtons() {
    const isDeployed = (activeDeployedHero === modalHeroSelected);
    const isEn = (currentLanguage === 'en-US');
    const bottomBtn = document.getElementById('modal-bottom-deploy-btn');
    const statusTag = document.getElementById('modal-hero-status-tag');

    if (statusTag) {
      statusTag.textContent = isDeployed ? (isEn ? 'ASSIGNED' : '上陣中') : (isEn ? 'STANDBY' : '未上陣');
      statusTag.style.color = isDeployed ? '#fbbf24' : '#94a3b8';
    }

    if (bottomBtn) {
      if (isDeployed) {
        bottomBtn.className = 'cr-btn cr-btn-amber btn-medium';
        bottomBtn.innerHTML = '<span>🛡️ ' + (isEn ? 'ASSIGNED' : '上陣中') + '</span>';
      } else {
        bottomBtn.className = 'cr-btn cr-btn-blue btn-medium';
        bottomBtn.innerHTML = '<span>🛡️ ' + (isEn ? 'ASSIGN HERO' : '指派上陣') + '</span>';
      }
    }
  }

  function closeHeroDetailModal() {
    const video = document.getElementById('hero-demo-video');
    if (video) video.pause();
    document.getElementById('modal-hero-detail').classList.remove('active');
  }

  function renderHeroRoster() {
    const isEn = (currentLanguage === 'en-US');
    
    // Top deployment slot
    const gNameEl = document.getElementById('deploy-gear-name');
    if (gNameEl) gNameEl.textContent = isEn ? 'Paladin Blade (512)' : '聖殿光刃 (512)';
    
    const hNameEl = document.getElementById('deploy-hero-name');
    if (hNameEl) {
      const activeConf = HERO_CONFIGS[activeDeployedHero] || HERO_CONFIGS.warrior;
      const lvStr = (activeDeployedHero === 'warrior') ? 'LV.5' : 'LV.1';
      hNameEl.textContent = isEn ? `${activeConf.nameEn} (${lvStr})` : `${activeConf.nameZh} (${lvStr})`;
    }

    // Hero cards
    ['warrior', 'merchant', 'archer'].forEach(k => {
      const conf = HERO_CONFIGS[k];
      const card = document.getElementById(`card-hero-${k}`);
      if (!card) return;

      const titleEl = card.querySelector('.hero-card-title');
      const lvStr = (k === 'warrior') ? 'LV.5' : 'LV.1';
      if (titleEl) titleEl.textContent = isEn ? `${conf.nameEn} ${lvStr}` : `${conf.nameZh} ${lvStr}`;

      const skillEl = card.querySelector('.hero-skill-label');
      if (skillEl) skillEl.textContent = isEn ? conf.skillShortEn : conf.skillShortZh;

      const deployBtn = document.getElementById(`btn-deploy-${k}`);
      if (k === activeDeployedHero) {
        card.classList.add('active-deployed');
        if (deployBtn) {
          deployBtn.className = 'cr-btn cr-btn-amber';
          deployBtn.textContent = isEn ? 'ASSIGNED' : '上陣中';
        }
      } else {
        card.classList.remove('active-deployed');
        if (deployBtn) {
          deployBtn.className = 'cr-btn cr-btn-blue';
          deployBtn.textContent = isEn ? 'DEPLOY' : '指派上陣';
        }
      }

      const lowerActions = card.querySelector('.hero-actions-lower');
      if (lowerActions) {
        const btns = lowerActions.querySelectorAll('button');
        if (btns.length >= 2) {
          const secondBtn = btns[1];
          if (conf.isMaxLevel) {
            secondBtn.textContent = isEn ? 'MAX LV' : '已滿級';
          } else {
            secondBtn.textContent = isEn ? `Upgrade 🪙${conf.upgradeCost}` : `升級 🪙${conf.upgradeCost}`;
          }
        }
      }
    });
  }

  // Deploy Hero
  function deployHero(heroKey) {
    activeDeployedHero = heroKey;
    renderHeroRoster();
    updateModalDeployButtons();
    const heroName = (currentLanguage === 'en-US') ? (HERO_CONFIGS[heroKey].nameEn) : (HERO_CONFIGS[heroKey].nameZh);
    alert(`⚔️ 已成功指派 ${heroName} 上陣出擊！`);
  }

  function deployFromModal() {
    deployHero(modalHeroSelected);
    closeHeroDetailModal();
  }

  function switchCompTab(tabKey) {
    currentCompTab = tabKey;
    document.querySelectorAll('.comp-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-comp-${tabKey}`).classList.add('active');
    renderCompendiumView();
  }

  function getCompendiumMonsterData() {
    const isEn = (currentLanguage === 'en-US');
    const groups = [];
    let total = 0;
    let unlocked = 0;

    const playerMaxStage = (typeof MAX_UNLOCKED_STAGE !== 'undefined') ? MAX_UNLOCKED_STAGE : 25;

    // Collect all monsters encountered in stages up to playerMaxStage
    const encounteredKeys = new Set();
    for (let s = 1; s <= playerMaxStage; s++) {
      const def = getStageDef(s);
      if (def) {
        encounteredKeys.add(def.chapterId + '_' + def.val);
        if (def.minions && Array.isArray(def.minions)) {
          def.minions.forEach(m => encounteredKeys.add(def.chapterId + '_' + m.val));
        }
      }
    }

    for (let c = 1; c <= 8; c++) {
      const chData = CHAPTER_MONSTER_DATABASE[c];
      if (!chData) continue;
      const chName = isEn ? chData.nameEn : chData.nameZh;
      let chUnlockedCount = 0;

      const mList = Object.entries(chData.monsters).map(([val, m]) => {
        total++;
        const intVal = parseInt(val);
        const isUnlocked = encounteredKeys.has(c + '_' + intVal);
        if (isUnlocked) {
          unlocked++;
          chUnlockedCount++;
        }
        return {
          nameZh: m.nameZh,
          nameEn: m.nameEn,
          name: isEn ? m.nameEn : m.nameZh,
          val: intVal,
          img: m.img,
          unlocked: isUnlocked
        };
      });

      const ratioText = isEn ? 'Unlocked' : '已解鎖';
      groups.push({
        groupName: chName,
        unlockedRatio: chUnlockedCount + '/' + mList.length + ' ' + ratioText,
        items: mList
      });
    }

    return {
      title: isEn ? 'Monster Compendium Overview' : '魔物收集總覽',
      tip: isEn
        ? '💡 Tip: Encounter monsters in Adventure stages to register them in Compendium.'
        : '💡 提示：於冒險關卡中「遭遇現身」即算解鎖；未滿 3 格列直接透明留空，不繪製底板。',
      total: total,
      unlocked: unlocked,
      groups: groups
    };
  }

  // Historical Static Compendium Blueprint (C-STORY-126 ~ 130 Baseline)
  const COMPENDIUM_DATA = {
    heroes: {
      titleZh: '英雄圖鑑總覽',
      titleEn: 'Hero Compendium Overview',
      tipZh: '💡 提示：在關卡中「成功合成出」或於酒館解鎖之英雄外觀；若已開啟至 512，則 2~512 全階級皆已點亮解鎖！點擊英雄標題可收合/展開。',
      tipEn: '💡 Tip: Merge heroes in stages or unlock them in tavern. Tiers 2~512 unlocked! Click header to toggle accordion.',
      total: 27,
      unlocked: 27,
      groups: [
        {
          groupNameZh: '⚔️ 鐵甲狂戰士 (Warrior)',
          groupNameEn: '⚔️ Ironclad Berserker (Warrior)',
          unlockedRatioZh: '9/9 解鎖',
          unlockedRatioEn: '9/9 Unlocked',
          items: [
            { nameZh: '泥木戰士', nameEn: 'Wood Warrior', img: 'assets/images/hero_knight/hero_01.png', val: 2, unlocked: true },
            { nameZh: '青銅衛兵', nameEn: 'Bronze Guard', img: 'assets/images/hero_knight/hero_02.png', val: 4, unlocked: true },
            { nameZh: '重裝前鋒', nameEn: 'Heavy Vanguard', img: 'assets/images/hero_knight/hero_03.png', val: 8, unlocked: true },
            { nameZh: '鐵衛騎士', nameEn: 'Iron Knight', img: 'assets/images/hero_knight/hero_04.png', val: 16, unlocked: true },
            { nameZh: '鋼刃領主', nameEn: 'Steel Lord', img: 'assets/images/hero_knight/hero_05.png', val: 32, unlocked: true },
            { nameZh: '皇家禁衛', nameEn: 'Royal Guard', img: 'assets/images/hero_knight/hero_06.png', val: 64, unlocked: true },
            { nameZh: '榮耀聖騎', nameEn: 'Paladin Knight', img: 'assets/images/hero_knight/hero_07.png', val: 128, unlocked: true },
            { nameZh: '無畏豪傑', nameEn: 'Fearless Hero', img: 'assets/images/hero_knight/hero_08.png', val: 256, unlocked: true },
            { nameZh: '聖殿戰神', nameEn: 'Temple Warlord', img: 'assets/images/hero_knight/hero_09.png', val: 512, unlocked: true }
          ]
        },
        {
          groupNameZh: '🪙 戰地商人 (Royal Merchant)',
          groupNameEn: '🪙 Royal Merchant',
          unlockedRatioZh: '9/9 解鎖',
          unlockedRatioEn: '9/9 Unlocked',
          items: [
            { nameZh: '商隊學徒', nameEn: 'Caravan Apprentice', img: 'assets/images/hero_knight/hero_01.png', val: 2, unlocked: true },
            { nameZh: '行商行者', nameEn: 'Peddler', img: 'assets/images/hero_knight/hero_02.png', val: 4, unlocked: true },
            { nameZh: '金庫巡守', nameEn: 'Vault Patrol', img: 'assets/images/hero_knight/hero_03.png', val: 8, unlocked: true },
            { nameZh: '財富護衛', nameEn: 'Wealth Guard', img: 'assets/images/hero_knight/hero_04.png', val: 16, unlocked: true },
            { nameZh: '精算管事', nameEn: 'Accountant', img: 'assets/images/hero_knight/hero_05.png', val: 32, unlocked: true },
            { nameZh: '王國大商', nameEn: 'Kingdom Tycoon', img: 'assets/images/hero_knight/hero_06.png', val: 64, unlocked: true },
            { nameZh: '財閥巨賈', nameEn: 'Oligarch', img: 'assets/images/hero_knight/hero_07.png', val: 128, unlocked: true },
            { nameZh: '金泉使者', nameEn: 'Golden Envoy', img: 'assets/images/hero_knight/hero_08.png', val: 256, unlocked: true },
            { nameZh: '黃金支配者', nameEn: 'Gold Sovereign', img: 'assets/images/hero_knight/hero_09.png', val: 512, unlocked: true }
          ]
        },
        {
          groupNameZh: '🏹 精靈弓箭手 (Elf Archer)',
          groupNameEn: '🏹 Elf Archer',
          unlockedRatioZh: '9/9 解鎖',
          unlockedRatioEn: '9/9 Unlocked',
          items: [
            { nameZh: '巡林新兵', nameEn: 'Ranger Recruit', img: 'assets/images/hero_knight/hero_01.png', val: 2, unlocked: true },
            { nameZh: '綠蔭射手', nameEn: 'Greenwood Archer', img: 'assets/images/hero_knight/hero_02.png', val: 4, unlocked: true },
            { nameZh: '風行斥候', nameEn: 'Wind Scout', img: 'assets/images/hero_knight/hero_03.png', val: 8, unlocked: true },
            { nameZh: '密林獵手', nameEn: 'Forest Hunter', img: 'assets/images/hero_knight/hero_04.png', val: 16, unlocked: true },
            { nameZh: '精靈狙擊者', nameEn: 'Elven Sniper', img: 'assets/images/hero_knight/hero_05.png', val: 32, unlocked: true },
            { nameZh: '穿雲破甲者', nameEn: 'Cloud Piercer', img: 'assets/images/hero_knight/hero_06.png', val: 64, unlocked: true },
            { nameZh: '星芒射手', nameEn: 'Starlight Archer', img: 'assets/images/hero_knight/hero_07.png', val: 128, unlocked: true },
            { nameZh: '月影箭神', nameEn: 'Moonshadow Marksman', img: 'assets/images/hero_knight/hero_08.png', val: 256, unlocked: true },
            { nameZh: '幻影神射手', nameEn: 'Phantom Archer', img: 'assets/images/hero_knight/hero_09.png', val: 512, unlocked: true }
          ]
        }
      ]
    },
    gears: {
      titleZh: '英雄專屬神兵總覽',
      titleEn: 'Divine Equipment Overview',
      tipZh: '💡 提示：未來各英雄將擁有獨立專屬裝備體系；點擊標題可摺疊/展開。',
      tipEn: '💡 Tip: Each hero class features dedicated gear progressions. Click header to toggle accordion.',
      total: 39,
      unlocked: 39,
      groups: [
        {
          groupNameZh: '⚔️ 鐵甲狂戰士專屬裝備 (Swords & Armor)',
          groupNameEn: '⚔️ Berserker Gear (Swords & Armor)',
          unlockedRatioZh: '13/13 解鎖',
          unlockedRatioEn: '13/13 Unlocked',
          items: [
            { nameZh: '泥木劍', nameEn: 'Wood Sword', img: 'assets/images/equipment_clay/equip_01.png', val: 2, unlocked: true },
            { nameZh: '青銅刃', nameEn: 'Bronze Blade', img: 'assets/images/equipment_clay/equip_02.png', val: 4, unlocked: true },
            { nameZh: '泥盾靴', nameEn: 'Leather Boots', img: 'assets/images/equipment_clay/equip_03.png', val: 8, unlocked: true },
            { nameZh: '鐵甲胸鎧', nameEn: 'Chainmail', img: 'assets/images/equipment_clay/equip_04.png', val: 16, unlocked: true },
            { nameZh: '秘銀闊劍', nameEn: 'Mithril Sword', img: 'assets/images/equipment_clay/equip_05.png', val: 32, unlocked: true },
            { nameZh: '皇家重甲', nameEn: 'Royal Armor', img: 'assets/images/equipment_clay/equip_06.png', val: 64, unlocked: true },
            { nameZh: '榮耀法靴', nameEn: 'Honor Boots', img: 'assets/images/equipment_clay/equip_07.png', val: 128, unlocked: true },
            { nameZh: '輝煌神盾', nameEn: 'Glory Shield', img: 'assets/images/equipment_clay/equip_08.png', val: 256, unlocked: true },
            { nameZh: '聖殿光刃', nameEn: 'Paladin Blade', img: 'assets/images/equipment_clay/equip_09.png', val: 512, unlocked: true },
            { nameZh: '永恆聖劍', nameEn: 'Eternal Blade', img: 'assets/images/equipment_clay/equip_10.png', val: 1024, unlocked: true },
            { nameZh: '滅神狂斬', nameEn: 'Godslayer', img: 'assets/images/equipment_clay/equip_11.png', val: 2048, unlocked: true },
            { nameZh: '混沌天斧', nameEn: 'Chaos Axe', img: 'assets/images/equipment_clay/equip_12.png', val: 4096, unlocked: true },
            { nameZh: '龍皇破滅', nameEn: 'Dragon Buster', img: 'assets/images/equipment_clay/equip_13.png', val: 8192, unlocked: true }
          ]
        },
        {
          groupNameZh: '🏹 精靈弓箭手專屬裝備 (暫借戰士裝備示意開放範圍)',
          groupNameEn: '🏹 Archer Gear (Preview Set)',
          unlockedRatioZh: '13/13 暫代示意',
          unlockedRatioEn: '13/13 Preview',
          items: [
            { nameZh: '巡林泥木弓 (暫)', nameEn: 'Wood Bow (Preview)', img: 'assets/images/equipment_clay/equip_01.png', val: 2, unlocked: true },
            { nameZh: '獵戶青銅弓 (暫)', nameEn: 'Bronze Bow (Preview)', img: 'assets/images/equipment_clay/equip_02.png', val: 4, unlocked: true },
            { nameZh: '輕靈疾行靴 (暫)', nameEn: 'Swift Boots (Preview)', img: 'assets/images/equipment_clay/equip_03.png', val: 8, unlocked: true }
          ]
        },
        {
          groupNameZh: '🪙 戰地商人專屬裝備 (暫借戰士裝備示意開放範圍)',
          groupNameEn: '🪙 Merchant Gear (Preview Set)',
          unlockedRatioZh: '13/13 暫代示意',
          unlockedRatioEn: '13/13 Preview',
          items: [
            { nameZh: '商隊算籌棒 (暫)', nameEn: 'Caravan Baton (Preview)', img: 'assets/images/equipment_clay/equip_01.png', val: 2, unlocked: true },
            { nameZh: '天平量秤刃 (暫)', nameEn: 'Scale Blade (Preview)', img: 'assets/images/equipment_clay/equip_02.png', val: 4, unlocked: true },
            { nameZh: '重型載金靴 (暫)', nameEn: 'Goldload Boots (Preview)', img: 'assets/images/equipment_clay/equip_03.png', val: 8, unlocked: true }
          ]
        }
      ]
    }
  };

  function getCompendiumHeroData() {
    const isEn = (currentLanguage === 'en-US');
    const TIER_VALS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];
    
    // Independent hero progression tiers
    // Warrior: reached 512 (9/18)
    // Merchant: reached 32 (5/18)
    // Archer: reached 64 (6/18)
    const HERO_PROGRESS = {
      warrior: 512,
      merchant: 32,
      archer: 64
    };

    const HERO_CONFIG = [
      {
        key: 'warrior',
        nameZh: '⚔️ 鐵甲狂戰士 (Warrior)',
        nameEn: '⚔️ Ironclad Berserker (Warrior)',
        titlesZh: {
          2: '泥木戰士', 4: '青銅衛兵', 8: '重裝前鋒', 16: '鐵衛騎士', 32: '鋼刃領主',
          64: '皇家禁衛', 128: '榮耀聖騎', 256: '無畏豪傑', 512: '聖殿戰神', 1024: '永恆劍聖',
          2048: '滅神戰尊', 4096: '混沌狂皇', 8192: '龍皇戰帝', 16384: '神話先驅者', 32768: '星雲主宰神',
          65536: '超維斬界皇', 131072: '天理審判神王', 262144: '萬古創世戰神'
        },
        titlesEn: {
          2: 'Wood Warrior', 4: 'Bronze Guard', 8: 'Heavy Vanguard', 16: 'Iron Knight', 32: 'Steel Lord',
          64: 'Royal Guard', 128: 'Paladin Knight', 256: 'Fearless Hero', 512: 'Temple Warlord', 1024: 'Eternal Blademaster',
          2048: 'Godslayer Sovereign', 4096: 'Chaos Conqueror', 8192: 'Dragon Emperor', 16384: 'Mythic Vanguard', 32768: 'Nebula Overlord',
          65536: 'Hyperion Emperor', 131072: 'King of Order', 262144: 'Genesis Warlord'
        }
      },
      {
        key: 'merchant',
        nameZh: '🪙 戰地商人 (Royal Merchant)',
        nameEn: '🪙 Royal Merchant',
        titlesZh: {
          2: '商隊學徒', 4: '行商行者', 8: '金庫巡守', 16: '財富護衛', 32: '精算管事',
          64: '王國大商', 128: '財閥巨賈', 256: '金泉使者', 512: '黃金支配者', 1024: '萬商同盟會長',
          2048: '財富大主宰', 4096: '萬界行商皇', 8192: '金泉聚寶聖賢', 16384: '資本神權大公', 32768: '天平制衡者',
          65536: '太古財神至尊', 131072: '命運等價神尊', 262144: '創世萬物交易者'
        },
        titlesEn: {
          2: 'Caravan Apprentice', 4: 'Peddler', 8: 'Vault Patrol', 16: 'Wealth Guard', 32: 'Accountant',
          64: 'Kingdom Tycoon', 128: 'Oligarch', 256: 'Golden Envoy', 512: 'Gold Sovereign', 1024: 'Guildmaster',
          2048: 'Wealth Sovereign', 4096: 'Void Merchant King', 8192: 'Golden Sage', 16384: 'Archduke of Commerce', 32768: 'Balance Arbiter',
          65536: 'Primordial Gold Sovereign', 131072: 'God of Equal Exchange', 262144: 'Genesis World Trader'
        }
      },
      {
        key: 'archer',
        nameZh: '🏹 精靈弓箭手 (Elf Archer)',
        nameEn: '🏹 Elf Archer',
        titlesZh: {
          2: '巡林新兵', 4: '綠蔭射手', 8: '風行斥候', 16: '密林獵手', 32: '精靈狙擊者',
          64: '穿雲破甲者', 128: '星芒射手', 256: '月影箭神', 512: '幻影神射手', 1024: '貫日逐風長老',
          2048: '流星神射至尊', 4096: '蒼穹裂雲天弓', 8192: '嘯天狼魂箭尊', 16384: '自然意志化身', 32768: '暴風破滅星神',
          65536: '森羅萬象神射', 131072: '巡天時空箭皇', 262144: '終焉神罰神弓使'
        },
        titlesEn: {
          2: 'Ranger Recruit', 4: 'Greenwood Archer', 8: 'Wind Scout', 16: 'Forest Hunter', 32: 'Elven Sniper',
          64: 'Cloud Piercer', 128: 'Starlight Archer', 256: 'Moonshadow Marksman', 512: 'Phantom Archer', 1024: 'Sun Chaser Elder',
          2048: 'Meteor Marksman', 4096: 'Sky Cleaver', 8192: 'Howling Wolf Bowmaster', 16384: 'Avatar of Nature', 32768: 'Storm Cataclysm God',
          65536: 'Omnipresent Bow God', 131072: 'Chrono Horizon Emperor', 262144: 'Genesis Celestial Archer'
        }
      }
    ];

    let total = 0;
    let unlocked = 0;
    const groups = HERO_CONFIG.map(h => {
      const maxVal = HERO_PROGRESS[h.key] || 32;
      let grpUnlocked = 0;
      const items = TIER_VALS.map((val, idx) => {
        total++;
        const isUnlocked = val <= maxVal;
        if (isUnlocked) {
          unlocked++;
          grpUnlocked++;
        }
        const imgIdx = String(Math.min(idx + 1, 17)).padStart(2, '0');
        const nameZh = h.titlesZh[val] || ('英雄 ' + val);
        const nameEn = h.titlesEn[val] || ('Hero ' + val);
        return {
          nameZh: nameZh,
          nameEn: nameEn,
          name: isEn ? nameEn : nameZh,
          val: val,
          img: 'assets/images/hero_knight/hero_' + imgIdx + '.png',
          unlocked: isUnlocked
        };
      });

      const ratioText = isEn ? 'Unlocked' : '已解鎖';
      return {
        groupName: isEn ? h.nameEn : h.nameZh,
        unlockedRatio: grpUnlocked + '/18 ' + ratioText,
        items: items
      };
    });

    return {
      title: isEn ? 'Hero Compendium Overview' : '英雄圖鑑總覽',
      tip: isEn
        ? '💡 Tip: Each hero class features independent progressions. Merge or upgrade heroes in stages to unlock tiers! Click header to toggle accordion.'
        : '💡 提示：各職業英雄擁有獨立收集進度；在關卡中合成或升級該英雄外觀即可解鎖對應階級！點擊標題可收合/展開。',
      total: total,
      unlocked: unlocked,
      groups: groups
    };
  }

  function getCompendiumGearData() {
    const isEn = (currentLanguage === 'en-US');
    const TIER_VALS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144];

    // Cascading unlock: get equipped gear value
    let equippedVal = 512;
    if (typeof activeDeployedGear === 'object' && activeDeployedGear) {
      if (typeof activeDeployedGear.val === 'number') {
        equippedVal = activeDeployedGear.val;
      } else if (typeof activeDeployedGear.name === 'string') {
        const match = activeDeployedGear.name.match(/\((\d+)\)/);
        if (match) equippedVal = parseInt(match[1]);
      }
    }

    const GEAR_PROGRESS = {
      warrior: equippedVal, // Cascading: All tiers <= equippedVal unlocked!
      archer: 64,
      merchant: 32
    };

    const GEAR_CONFIG = [
      {
        key: 'warrior',
        nameZh: '⚔️ 鐵甲狂戰士專屬裝備 (Swords & Armor)',
        nameEn: '⚔️ Berserker Gear (Swords & Armor)',
        titlesZh: {
          2: '泥木劍', 4: '青銅刃', 8: '泥盾靴', 16: '鐵甲胸鎧', 32: '秘銀闊劍',
          64: '皇家重甲', 128: '榮耀法靴', 256: '輝煌神盾', 512: '聖殿光刃', 1024: '永恆聖劍',
          2048: '滅神狂斬', 4096: '混沌天斧', 8192: '龍皇破滅', 16384: '神話創世刃', 32768: '星雲裂滅鎧',
          65536: '超維斷空戟', 131072: '天理秩序冠', 262144: '創世萬界神兵'
        },
        titlesEn: {
          2: 'Wood Sword', 4: 'Bronze Blade', 8: 'Leather Boots', 16: 'Chainmail', 32: 'Mithril Sword',
          64: 'Royal Armor', 128: 'Honor Boots', 256: 'Glory Shield', 512: 'Paladin Blade', 1024: 'Eternal Blade',
          2048: 'Godslayer', 4096: 'Chaos Axe', 8192: 'Dragon Buster', 16384: 'Genesis Edge', 32768: 'Nebula Aegis',
          65536: 'Hyperion Halberd', 131072: 'Order Diadem', 262144: 'World Core Divine Weapon'
        }
      },
      {
        key: 'archer',
        nameZh: '🏹 精靈弓箭手專屬裝備 (暫借戰士裝備示意開放範圍)',
        nameEn: '🏹 Archer Gear (Preview Set)',
        titlesZh: {
          2: '巡林泥木弓', 4: '獵戶青銅弓', 8: '輕靈疾行靴', 16: '密林鎖子甲', 32: '疾風複合弓',
          64: '蒼穹羽翼甲', 128: '追風幻影靴', 256: '靈雀追魂弩', 512: '精靈長風神弓', 1024: '貫日貫雲弓',
          2048: '流星追月弦', 4096: '穿空破魔弩', 8192: '蒼狼嘯天矢', 16384: '自然秩序之弓', 32768: '幻滅風暴神弩',
          65536: '太古森羅神弓', 131072: '萬界巡天靈弦', 262144: '終焉神罰天弓'
        },
        titlesEn: {
          2: 'Wood Shortbow', 4: 'Bronze Bow', 8: 'Swift Boots', 16: 'Forest Chainmail', 32: 'Composite Bow',
          64: 'Sky Wing Armor', 128: 'Phantom Boots', 256: 'Soul Crossbow', 512: 'Elven Longbow', 1024: 'Sun Piercer',
          2048: 'Moon Bowstring', 4096: 'Voidbreaker Bow', 8192: 'Wolf Quiver', 16384: 'Nature Bow', 32768: 'Storm Arbalest',
          65536: 'Astral Silvan Bow', 131072: 'Cosmic Horizon Bow', 262144: 'Genesis Judgment Bow'
        }
      },
      {
        key: 'merchant',
        nameZh: '🪙 戰地商人專屬裝備 (暫借戰士裝備示意開放範圍)',
        nameEn: '🪙 Merchant Gear (Preview Set)',
        titlesZh: {
          2: '算籌木棒', 4: '黃銅量秤', 8: '厚重貨行靴', 16: '鑲金軟皮甲', 32: '秘銀算盤',
          64: '皇家財閥斗篷', 128: '點金符文靴', 256: '金庫巨靈之鎖', 512: '赫爾墨斯神杖', 1024: '招財永恆金鼎',
          2048: '財富主宰之戒', 4096: '萬界流通行囊', 8192: '金泉聚寶聖盤', 16384: '資本神權法典', 32768: '國庫鎮界天平',
          65536: '太古財閥神冠', 131072: '命運等價天秤', 262144: '創世萬靈金鑰'
        },
        titlesEn: {
          2: 'Abacus Baton', 4: 'Brass Scales', 8: 'Caravan Boots', 16: 'Gilded Coat', 32: 'Mithril Abacus',
          64: 'Tycoon Cloak', 128: 'Alchemist Boots', 256: 'Titan Lock', 512: 'Hermes Caduceus', 1024: 'Gold Crucible',
          2048: 'Sovereign Ring', 4096: 'Merchant Pack', 8192: 'Golden Basin', 16384: 'Capital Codex', 32768: 'Treasury Balance',
          65536: 'Ancient Crown', 131072: 'Equivalence Scale', 262144: 'Genesis Universal Key'
        }
      }
    ];

    let total = 0;
    let unlocked = 0;
    const groups = GEAR_CONFIG.map(g => {
      const maxVal = GEAR_PROGRESS[g.key] || 32;
      let grpUnlocked = 0;
      const items = TIER_VALS.map((val, idx) => {
        total++;
        const isUnlocked = val <= maxVal;
        if (isUnlocked) {
          unlocked++;
          grpUnlocked++;
        }
        const imgIdx = String(Math.min(idx + 1, 16)).padStart(2, '0');
        const nameZh = g.titlesZh[val] || ('神兵 ' + val);
        const nameEn = g.titlesEn[val] || ('Divine Gear ' + val);
        return {
          nameZh: nameZh,
          nameEn: nameEn,
          name: isEn ? nameEn : nameZh,
          val: val,
          img: 'assets/images/equipment_clay/equip_' + imgIdx + '.png',
          unlocked: isUnlocked
        };
      });

      const ratioText = isEn ? 'Unlocked' : '已解鎖';
      return {
        groupName: isEn ? g.nameEn : g.nameZh,
        unlockedRatio: grpUnlocked + '/18 ' + ratioText,
        items: items
      };
    });

    return {
      title: isEn ? 'Divine Equipment Overview' : '英雄專屬神兵總覽',
      tip: isEn
        ? '💡 Tip: Deploying with higher tier divine gears automatically cascades and unlocks all lower tiers! Click header to toggle accordion.'
        : '💡 提示：穿戴高階神兵出擊將自動「向下溯及解鎖」該數值以下所有低階神兵！點擊標題可收合/展開。',
      total: total,
      unlocked: unlocked,
      groups: groups
    };
  }


  function renderCompendiumView() {
    const isEn = (currentLanguage === 'en-US');
    let data;
    if (currentCompTab === 'monsters') {
      data = getCompendiumMonsterData();
    } else if (currentCompTab === 'heroes') {
      data = getCompendiumHeroData();
    } else if (currentCompTab === 'gears') {
      data = getCompendiumGearData();
    } else {
      data = getCompendiumMonsterData();
    }

    document.getElementById('comp-view-title').textContent = data.title;
    document.getElementById('comp-tip-text').textContent = data.tip;

    const pct = Math.round((data.unlocked / data.total) * 100);
    document.getElementById('comp-progress-fill').style.width = `${pct}%`;
    document.getElementById('comp-progress-text').textContent = isEn 
      ? `Unlocked ${data.unlocked} / ${data.total} (${pct}%)`
      : `已解鎖 ${data.unlocked} / ${data.total} (${pct}%)`;

    const area = document.getElementById('compendium-content-area');
    area.innerHTML = '';

    data.groups.forEach(grp => {
      const sec = document.createElement('div');
      sec.className = 'comp-group-section';

      const title = document.createElement('div');
      title.className = 'comp-group-title';
      title.innerHTML = `
        <span>${grp.groupName} ${grp.unlockedRatio ? `<span style="font-size:var(--font-caption); color:#38bdf8; font-weight:700;">(${grp.unlockedRatio})</span>` : ''}</span>
        <span class="collapse-arrow">▼</span>
      `;
      sec.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'compendium-grid';

      // Click title to toggle collapse / expand accordion
      title.onclick = () => {
        const isCollapsed = grid.classList.toggle('collapsed');
        const arrow = title.querySelector('.collapse-arrow');
        if (arrow) arrow.textContent = isCollapsed ? '▲' : '▼';
      };

      grp.items.forEach(item => {
        const card = document.createElement('div');
        const tierClass = (typeof item.val === 'number' && item.unlocked) ? ` tier-${item.val}` : '';
        card.className = 'compendium-card' + tierClass + (item.unlocked ? '' : ' locked');

        let visualHtml = '';
        if (!item.unlocked) {
          visualHtml = `<span style="font-size:2.2rem; filter:grayscale(1); opacity:0.6;">🔒</span>`;
        } else if (item.img) {
          visualHtml = `<img src="${item.img}" style="width:52px; height:52px; object-fit:contain;" alt="${item.name}" />`;
        } else if (item.avatar) {
          visualHtml = `<img src="${item.avatar}" style="width:52px; height:52px; object-fit:contain;" alt="${item.name}" />`;
        } else {
          visualHtml = `<span style="font-size:2.2rem;">${item.icon || '❓'}</span>`;
        }

        const valPrefix = isEn ? 'Value: ' : '數值: ';
        const unlStr = isEn ? 'Locked' : '未解鎖';
        card.innerHTML = `
          ${visualHtml}
          <span style="font-size:var(--font-caption); font-weight:800; color:#f8fafc; text-align:center;">${item.unlocked ? item.name : unlStr}</span>
          <span style="font-size:var(--font-mini); color:#fbbf24; font-weight:700;">${item.unlocked ? valPrefix + item.val : '???'}</span>
        `;

        card.onclick = () => {
          if (!item.unlocked) {
            alert(isEn ? '🔒 Item locked! Advance stages to discover.' : '🔒 該項目尚未解鎖！請推進冒險或合成出對應項目。');
          } else {
            alert(isEn 
              ? `📖 【Compendium Info】\nName: ${item.name}\nTier: ${item.val}\nStatus: Registered!`
              : `📖 【圖鑑情報】\n名稱：${item.name}\n數值階級：${item.val}\n解鎖狀態：已收錄進王國圖鑑！`);
          }
        };

        grid.appendChild(card);
      });

      // Remainder empty cells
      const remainder = grp.items.length % 3;
      if (remainder !== 0) {
        const emptyNeeded = 3 - remainder;
        for (let i = 0; i < emptyNeeded; i++) {
          const emptyCell = document.createElement('div');
          emptyCell.className = 'comp-empty-cell';
          grid.appendChild(emptyCell);
        }
      }

      sec.appendChild(grid);
      area.appendChild(sec);
    });
  }

  function initGearGrid() {
    const gearGrid = document.getElementById('gear-grid-container');
    gearGrid.innerHTML = '';
    const gears = [2, 4, 8, 16, 32, 64, 128, 256];
    gears.forEach((val, idx) => {
      const cell = document.createElement('div');
      cell.className = `gear-cell tier-${val}`;
      const imgIdx = String(idx + 1).padStart(2, '0');
      cell.innerHTML = `
        <img src="assets/images/equipment_clay/equip_${imgIdx}.png" alt="Gear ${val}" />
        <span class="gear-val">${val}</span>
      `;
      cell.onclick = () => alert(`🛡️ 點選裝備：${val} 階裝備 (已著色為戰鬥底板色)`);
      gearGrid.appendChild(cell);
    });
  }

  // Initialization
  window.addEventListener('DOMContentLoaded', () => {
    renderAdventureStage();
    renderHeroRoster();
    initGearGrid();
    renderCompendiumView();
  });

// Expose key UI helpers to window for AppRouter integration
window.MAX_UNLOCKED_STAGE = typeof MAX_UNLOCKED_STAGE !== 'undefined' ? MAX_UNLOCKED_STAGE : 1;
window.currentSelectedStage = typeof currentSelectedStage !== 'undefined' ? currentSelectedStage : 1;
if (typeof switchMainTab === 'function') window.switchMainTab = switchMainTab;
if (typeof openStageDetailModal === 'function') window.openStageDetailModal = openStageDetailModal;
if (typeof closeStageDetailModal === 'function') window.closeStageDetailModal = closeStageDetailModal;
if (typeof renderAdventureStage === 'function') window.renderAdventureStage = renderAdventureStage;
if (typeof renderCompendiumView === 'function') window.renderCompendiumView = renderCompendiumView;
if (typeof switchCompTab === 'function') window.switchCompTab = switchCompTab;
if (typeof openSettingsModal === 'function') window.openSettingsModal = openSettingsModal;
if (typeof closeSettingsModal === 'function') window.closeSettingsModal = closeSettingsModal;
if (typeof setLanguage === 'function') window.setLanguage = setLanguage;
if (typeof changeLanguageFromSelect === 'function') window.changeLanguageFromSelect = changeLanguageFromSelect;
if (typeof switchSettingTab === 'function') window.switchSettingTab = switchSettingTab;
if (typeof openDailySignInModal === 'function') window.openDailySignInModal = openDailySignInModal;
if (typeof closeDailySignInModal === 'function') window.closeDailySignInModal = closeDailySignInModal;
if (typeof handleSignInButtonClick === 'function') window.handleSignInButtonClick = handleSignInButtonClick;
if (typeof openDailyQuestsModal === 'function') window.openDailyQuestsModal = openDailyQuestsModal;
if (typeof closeDailyQuestsModal === 'function') window.closeDailyQuestsModal = closeDailyQuestsModal;
if (typeof switchGearSubTab === 'function') window.switchGearSubTab = switchGearSubTab;
if (typeof deployHero === 'function') window.deployHero = deployHero;
if (typeof upgradeHeroFromModal === 'function') window.upgradeHeroFromModal = upgradeHeroFromModal;
if (typeof openHeroDetailModal === 'function') window.openHeroDetailModal = openHeroDetailModal;
if (typeof closeHeroDetailModal === 'function') window.closeHeroDetailModal = closeHeroDetailModal;
