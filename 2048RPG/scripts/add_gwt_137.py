import sys

sys.stdout.reconfigure(encoding='utf-8')

file_path = 'Commercial_Edition/src/tests/GwtRunner.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add to testCases array
old_array_end = '''      // C-STORY-136: 排除樣板字串語法中斷缺陷 ＆ 全介面按鍵互動即時響應
      this.testGwt136_1_ZeroSyntaxErrorsAndAllInteractiveButtonsResponsive.bind(this)
    ];'''

new_array_end = '''      // C-STORY-136: 排除樣板字串語法中斷缺陷 ＆ 全介面按鍵互動即時響應
      this.testGwt136_1_ZeroSyntaxErrorsAndAllInteractiveButtonsResponsive.bind(this),
      // C-STORY-137: 英雄與裝備 18 階天花板預留格展示 ＆ 職業獨立收集 ＆ 高階裝備向下自動點亮解鎖
      this.testGwt137_1_HeroAndGear18TierFullCapPlaceholders.bind(this),
      this.testGwt137_2_CascadingGearUnlockAndIndependentHeroProgression.bind(this)
    ];'''

content = content.replace(old_array_end.replace('\n', '\r\n'), new_array_end.replace('\n', '\r\n'))
content = content.replace(old_array_end, new_array_end)

# 2. Add test method bodies
old_end = '''    // 2. Essential interactive functions exist in HTML script
    this.assert(htmlText.includes('function openSettingsModal()') && htmlText.includes('function closeSettingsModal()'), 'Settings modal open/close functions defined');
    this.assert(htmlText.includes('function switchMainTab(') && htmlText.includes('function launchStageBattle()'), 'Main navigation and launch battle functions defined');
  }
}'''

new_methods = '''    // 2. Essential interactive functions exist in HTML script
    this.assert(htmlText.includes('function openSettingsModal()') && htmlText.includes('function closeSettingsModal()'), 'Settings modal open/close functions defined');
    this.assert(htmlText.includes('function switchMainTab(') && htmlText.includes('function launchStageBattle()'), 'Main navigation and launch battle functions defined');
  }

  // =========================================================================
  // C-STORY-137: 英雄與裝備 18 階天花板預留格展示 ＆ 職業獨立收集 ＆ 高階裝備向下自動點亮解鎖
  // =========================================================================

  // C-STORY-137 GWT 137.1: 英雄與裝備圖鑑 18 階全天花板（2~262,144）預留格與未解鎖占位
  async testGwt137_1_HeroAndGear18TierFullCapPlaceholders() {
    let htmlText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./ui_prototype_showcase_2.html');
        if (resp.ok) htmlText = await resp.text();
      } catch (e) {}
    }

    // 1. Check dynamic function definitions
    this.assert(htmlText.includes('function getCompendiumHeroData()'), 'Defines dedicated getCompendiumHeroData function');
    this.assert(htmlText.includes('function getCompendiumGearData()'), 'Defines dedicated getCompendiumGearData function');

    // 2. Contains 18-tier values including cap 262144
    this.assert(htmlText.includes('262144') && htmlText.includes('131072') && htmlText.includes('65536'), 'Covers top tier values up to 262144 cap');
    this.assert(htmlText.includes('創世萬界神兵') && htmlText.includes('萬古創世戰神'), 'Contains top tier localized names');
  }

  // C-STORY-137 GWT 137.2: 高階裝備向下自動點亮解鎖 ＆ 三大職業獨立解鎖進度
  async testGwt137_2_CascadingGearUnlockAndIndependentHeroProgression() {
    let htmlText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./ui_prototype_showcase_2.html');
        if (resp.ok) htmlText = await resp.text();
      } catch (e) {}
    }

    // 1. Cascading unlock logic: val <= equippedVal automatically unlocks
    this.assert(htmlText.includes('val <= equippedVal') || htmlText.includes('val <= maxVal'), 'Applies cascading tier comparison to unlock all lower tiers');

    // 2. Independent hero progression
    this.assert(htmlText.includes('warrior: 512') && htmlText.includes('merchant: 32') && htmlText.includes('archer: 64'), 'Maintains independent hero progressions per class');
  }
}'''

content = content.replace(old_end.replace('\n', '\r\n'), new_methods.replace('\n', '\r\n'))
content = content.replace(old_end, new_methods)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added C-STORY-137 GWT tests successfully!")
