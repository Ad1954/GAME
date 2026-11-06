import os
import re

file_path = 'Commercial_Edition/ui_prototype_showcase_2.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update HTML tags in Pane 2 & Pane 3
old_desc = '''          <div class="setting-desc" style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">
            商業製品測試版 (Phase 1)：<br>
            獨立純前端運行環境，本地自動存檔。
          </div>'''

new_desc = '''          <div class="setting-desc" id="settings-changelog-desc" data-i18n="settings_changelog_desc" style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">
            商業製品測試版 (Phase 1)：<br>
            獨立純前端運行環境，本地自動存檔。
          </div>'''

old_skill_desc = '''              <span style="font-weight: 700; color: #38bdf8;" id="settings-txt-instant-skill" data-i18n="settings_instant_skill">🛠️ [測試] 技能開場即就緒</span>
              <span style="font-size: 0.72rem; color: #94a3b8;">進入戰鬥技能充能即為 100% 滿額</span>'''

new_skill_desc = '''              <span style="font-weight: 700; color: #38bdf8;" id="settings-txt-instant-skill" data-i18n="settings_instant_skill">🛠️ [測試] 技能開場即就緒</span>
              <span style="font-size: 0.72rem; color: #94a3b8;" id="settings-txt-instant-skill-desc" data-i18n="settings_instant_skill_desc">進入戰鬥技能充能即為 100% 滿額</span>'''

content = content.replace(old_desc.replace('\n', '\r\n'), new_desc.replace('\n', '\r\n'))
content = content.replace(old_desc, new_desc)

content = content.replace(old_skill_desc.replace('\n', '\r\n'), new_skill_desc.replace('\n', '\r\n'))
content = content.replace(old_skill_desc, new_skill_desc)

# 2. Update I18N_DICT in zh-TW and en-US
old_zh_settings = '''      // Settings Modal
      settings_title: '⚙️ 遊戲設定',
      stab_general: '⚙️ 基本設定',
      stab_changelog: '📜 更新履歷',
      stab_developer: '🛠️ 開發測試',
      settings_lang: '🌐 語言 (Language)',
      settings_theme: '🎨 盤面底板配色',
      settings_bgm: '🎵 背景音樂 (BGM)',
      settings_sfx: '🔊 音效 (SFX)',
      settings_reset_btn: '🗑️ 清除所有紀錄 (重新開始)',
      settings_log_title: '📜 版本更新記錄 (Changelog)',
      settings_btn_check_update: '🔄 手動檢查版本更新',
      settings_art_style: '🎨 方塊美術風格 (Art Style)',
      settings_instant_skills: '⚡ 英雄技能無冷卻 (測試用)',
      settings_clear_tutorial: '🧹 清除新手教學紀錄 (重播教學)'
    },'''

new_zh_settings = '''      // Settings Modal
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
    },'''

content = content.replace(old_zh_settings.replace('\n', '\r\n'), new_zh_settings.replace('\n', '\r\n'))
content = content.replace(old_zh_settings, new_zh_settings)

old_en_settings = '''      // Settings Modal
      settings_title: '⚙️ Settings',
      stab_general: '⚙️ General',
      stab_changelog: '📜 Changelog',
      stab_developer: '🛠️ Developer',
      settings_lang: '🌐 Language',
      settings_theme: '🎨 Board Palette Skin',
      settings_bgm: '🎵 Music (BGM)',
      settings_sfx: '🔊 Sound Effects (SFX)',
      settings_reset_btn: '🗑️ Clear Save Data (Start Over)',
      settings_log_title: '📜 Version Changelog',
      settings_btn_check_update: '🔄 Check for Updates',
      settings_art_style: '🎨 Tile Art Style',
      settings_instant_skills: '⚡ Zero Cooldown Skills (Test Mode)',
      settings_clear_tutorial: '🧹 Reset Tutorial Flags'
    }'''

new_en_settings = '''      // Settings Modal
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
    }'''

content = content.replace(old_en_settings.replace('\n', '\r\n'), new_en_settings.replace('\n', '\r\n'))
content = content.replace(old_en_settings, new_en_settings)

# 3. Update setLanguage(lang) to update dropdown options
old_set_lang = '''    // Refresh all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    // Update bottom deploy buttons if open
    updateModalDeployButtons();'''

new_set_lang = '''    // Refresh all data-i18n elements
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
    updateModalDeployButtons();'''

content = content.replace(old_set_lang.replace('\n', '\r\n'), new_set_lang.replace('\n', '\r\n'))
content = content.replace(old_set_lang, new_set_lang)

# 4. Update getCompendiumMonsterData() for progressive stage unlocking
old_comp_fn = '''  function getCompendiumMonsterData() {
    const isEn = (currentLanguage === 'en-US');
    const groups = [];
    let total = 0;
    let unlocked = 0;

    for (let c = 1; c <= 8; c++) {
      const chData = CHAPTER_MONSTER_DATABASE[c];
      if (!chData) continue;
      const chName = isEn ? chData.nameEn : chData.nameZh;
      const mList = Object.entries(chData.monsters).map(([val, m]) => {
        total++;
        unlocked++;
        return {
          nameZh: m.nameZh,
          nameEn: m.nameEn,
          name: isEn ? m.nameEn : m.nameZh,
          val: parseInt(val),
          img: m.img,
          unlocked: true
        };
      });

      groups.push({
        groupName: chName,
        unlockedRatio: `${mList.length}/${mList.length} ${isEn ? 'Unlocked' : '已解鎖'}`,
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
  }'''

new_comp_fn = '''  function getCompendiumMonsterData() {
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
        encounteredKeys.add(`${def.chapterId}_${def.val}`);
        if (def.minions && Array.isArray(def.minions)) {
          def.minions.forEach(m => encounteredKeys.add(`${def.chapterId}_${m.val}`));
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
        const isUnlocked = encounteredKeys.has(`${c}_${intVal}`);
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

      groups.push({
        groupName: chName,
        unlockedRatio: `${chUnlockedCount}/${mList.length} ${isEn ? 'Unlocked' : '已解鎖'}`,
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
  }'''

content = content.replace(old_comp_fn.replace('\n', '\r\n'), new_comp_fn.replace('\n', '\r\n'))
content = content.replace(old_comp_fn, new_comp_fn)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('All C-STORY-135 changes successfully applied to ui_prototype_showcase_2.html!')
