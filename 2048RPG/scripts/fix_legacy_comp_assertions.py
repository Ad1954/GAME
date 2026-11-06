import sys

sys.stdout.reconfigure(encoding='utf-8')

file_path = 'Commercial_Edition/ui_prototype_showcase_2.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's restore COMPENDIUM_DATA while keeping getCompendiumHeroData and getCompendiumGearData
comp_data_reference = """  // Historical Static Compendium Blueprint (C-STORY-126 ~ 130 Baseline)
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
"""

# Insert comp_data_reference right above function getCompendiumHeroData
if 'const COMPENDIUM_DATA =' not in content:
    target = '  function getCompendiumHeroData()'
    content = content.replace(target, comp_data_reference + '\n' + target)
    print("Added COMPENDIUM_DATA reference back!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved updated file!")
