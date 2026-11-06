import sys

file_path = 'Commercial_Edition/src/tests/GwtRunner.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add to testCases array
old_array_end = '''      // C-STORY-134: 章節魔物池生態對齊、關卡詳細資訊全語系動態連動 ＆ 英雄圖鑑零死角多語系
      this.testGwt134_1_ChapterRangeAlignmentAndAccurateMonsterPoolMatching.bind(this),
      this.testGwt134_2_HeroRosterCompendiumMonsterAndDetailModalI18n.bind(this)
    ];'''

new_array_end = '''      // C-STORY-134: 章節魔物池生態對齊、關卡詳細資訊全語系動態連動 ＆ 英雄圖鑑零死角多語系
      this.testGwt134_1_ChapterRangeAlignmentAndAccurateMonsterPoolMatching.bind(this),
      this.testGwt134_2_HeroRosterCompendiumMonsterAndDetailModalI18n.bind(this),
      // C-STORY-135: 設定彈窗全要素雙語多語系化 ＆ 圖鑑進度階梯式動態解鎖
      this.testGwt135_1_SettingsModalAllDropdownsAndButtonsI18n.bind(this),
      this.testGwt135_2_CompendiumProgressiveUnlockByStageProgression.bind(this)
    ];'''

content = content.replace(old_array_end.replace('\n', '\r\n'), new_array_end.replace('\n', '\r\n'))
content = content.replace(old_array_end, new_array_end)

# 2. Add test method bodies before the closing brace of the class
old_class_end = '''    this.assert(htmlText.includes('Monster Compendium Overview'), 'Compendium contains localized English titles');
  }
}'''

new_methods = '''    this.assert(htmlText.includes('Monster Compendium Overview'), 'Compendium contains localized English titles');
  }

  // =========================================================================
  // C-STORY-135: 設定彈窗全要素雙語多語系化 ＆ 圖鑑進度階梯式動態解鎖
  // =========================================================================

  // C-STORY-135 GWT 135.1: 設定彈窗全要素（主題、美術選單、清除存檔與確認關閉等）100% 雙語多語系化
  async testGwt135_1_SettingsModalAllDropdownsAndButtonsI18n() {
    let htmlText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./ui_prototype_showcase_2.html');
        if (resp.ok) htmlText = await resp.text();
      } catch (e) {}
    }

    // 1. Settings keys in I18N_DICT
    this.assert(htmlText.includes('settings_reset_save'), 'Contains settings_reset_save i18n key');
    this.assert(htmlText.includes('settings_close'), 'Contains settings_close i18n key');
    this.assert(htmlText.includes('Clear Save Data (Reset Progress)'), 'Contains English translation for clear save');
    this.assert(htmlText.includes('Confirm & Close'), 'Contains English translation for confirm close button');

    // 2. Dropdown options dynamically localized in setLanguage()
    this.assert(htmlText.includes('Kingdom Expedition (Deep Blue)'), 'Theme dropdown has English localization');
    this.assert(htmlText.includes('Miniature Model (3D Clay)'), 'Style dropdown has English localization');
    this.assert(htmlText.includes('id="settings-txt-instant-skill-desc"'), 'Developer pane skill desc has id for translation');
  }

  // C-STORY-135 GWT 135.2: 圖鑑系統依玩家冒險進度逐步開放，未抵達章節與高階魔物正確鎖定
  async testGwt135_2_CompendiumProgressiveUnlockByStageProgression() {
    let htmlText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./ui_prototype_showcase_2.html');
        if (resp.ok) htmlText = await resp.text();
      } catch (e) {}
    }

    // 1. Progressive unlock logic checks stage progression
    this.assert(htmlText.includes('encounteredKeys = new Set()'), 'Uses encounteredKeys set to dynamically track unlocked monsters');
    this.assert(htmlText.includes('for (let s = 1; s <= playerMaxStage; s++)'), 'Iterates through cleared stages to collect encountered monsters');
    this.assert(htmlText.includes('encounteredKeys.has('), 'Checks whether monster has been encountered before unlocking');

    // 2. Locked visual and alert feedback
    this.assert(htmlText.includes('compendium-card') && htmlText.includes('locked'), 'Applies locked class and styling to undiscovered monsters');
    this.assert(htmlText.includes('???') && htmlText.includes('🔒'), 'Locked monsters show padlock and question marks');
  }
}'''

content = content.replace(old_class_end.replace('\n', '\r\n'), new_methods.replace('\n', '\r\n'))
content = content.replace(old_class_end, new_methods)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully added C-STORY-135 tests to GwtRunner.js!')
