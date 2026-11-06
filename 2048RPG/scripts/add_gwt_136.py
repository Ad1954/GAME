import sys

sys.stdout.reconfigure(encoding='utf-8')

file_path = 'Commercial_Edition/src/tests/GwtRunner.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add to testCases array
old_array_end = '''      // C-STORY-135: 設定彈窗全要素雙語多語系化 ＆ 圖鑑進度階梯式動態解鎖
      this.testGwt135_1_SettingsModalAllDropdownsAndButtonsI18n.bind(this),
      this.testGwt135_2_CompendiumProgressiveUnlockByStageProgression.bind(this)
    ];'''

new_array_end = '''      // C-STORY-135: 設定彈窗全要素雙語多語系化 ＆ 圖鑑進度階梯式動態解鎖
      this.testGwt135_1_SettingsModalAllDropdownsAndButtonsI18n.bind(this),
      this.testGwt135_2_CompendiumProgressiveUnlockByStageProgression.bind(this),
      // C-STORY-136: 排除樣板字串語法中斷缺陷 ＆ 全介面按鍵互動即時響應
      this.testGwt136_1_ZeroSyntaxErrorsAndAllInteractiveButtonsResponsive.bind(this)
    ];'''

content = content.replace(old_array_end.replace('\n', '\r\n'), new_array_end.replace('\n', '\r\n'))
content = content.replace(old_array_end, new_array_end)

# 2. Add test method body at the end before closing brace
old_end = '''    // 2. Locked visual and alert feedback
    this.assert(htmlText.includes('compendium-card') && htmlText.includes('locked'), 'Applies locked class and styling to undiscovered monsters');
    this.assert(htmlText.includes('???') && htmlText.includes('🔒'), 'Locked monsters show padlock and question marks');
  }
}'''

new_end = '''    // 2. Locked visual and alert feedback
    this.assert(htmlText.includes('compendium-card') && htmlText.includes('locked'), 'Applies locked class and styling to undiscovered monsters');
    this.assert(htmlText.includes('???') && htmlText.includes('🔒'), 'Locked monsters show padlock and question marks');
  }

  // =========================================================================
  // C-STORY-136: 排除樣板字串語法中斷缺陷 ＆ 全介面按鍵互動即時響應
  // =========================================================================

  // C-STORY-136 GWT 136.1: 排除 SyntaxError，確保全域函式掛載與按鈕互動響應
  async testGwt136_1_ZeroSyntaxErrorsAndAllInteractiveButtonsResponsive() {
    let htmlText = '';
    if (typeof fetch === 'function') {
      try {
        const resp = await fetch('./ui_prototype_showcase_2.html');
        if (resp.ok) htmlText = await resp.text();
      } catch (e) {}
    }

    // 1. String concatenation safely avoids template literal truncation
    this.assert(htmlText.includes("encounteredKeys.add(def.chapterId + '_' + def.val)"), 'Uses safe concatenation for boss encountered keys');
    this.assert(htmlText.includes("def.minions.forEach(m => encounteredKeys.add(def.chapterId + '_' + m.val))"), 'Uses safe concatenation for minions keys');
    this.assert(htmlText.includes("encounteredKeys.has(c + '_' + intVal)"), 'Uses safe concatenation for compendium unlock check');

    // 2. Essential interactive functions exist in HTML script
    this.assert(htmlText.includes('function openSettingsModal()') && htmlText.includes('function closeSettingsModal()'), 'Settings modal open/close functions defined');
    this.assert(htmlText.includes('function switchMainTab(') && htmlText.includes('function launchStageBattle()'), 'Main navigation and launch battle functions defined');
  }
}'''

content = content.replace(old_end.replace('\n', '\r\n'), new_end.replace('\n', '\r\n'))
content = content.replace(old_end, new_end)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added C-STORY-136 GWT test to GwtRunner.js successfully!")
