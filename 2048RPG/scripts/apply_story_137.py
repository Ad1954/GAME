import sys

sys.stdout.reconfigure(encoding='utf-8')

file_path = 'Commercial_Edition/ui_prototype_showcase_2.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ensure activeDeployedGear has val: 512
old_gear = "let activeDeployedGear = { name: '聖殿光刃 (512)', img: 'assets/images/equipment_clay/equip_09.png' };"
new_gear = "let activeDeployedGear = { name: '聖殿光刃 (512)', val: 512, img: 'assets/images/equipment_clay/equip_09.png' };"
content = content.replace(old_gear, new_gear)

# 2. Add getCompendiumHeroData() and getCompendiumGearData() right above renderCompendiumView()
hero_gear_functions = """  function getCompendiumHeroData() {
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
        const match = activeDeployedGear.name.match(/\\((\\d+)\\)/);
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
"""

# Replace COMPENDIUM_DATA with these dynamic functions
import re
comp_data_pattern = r'  const COMPENDIUM_DATA = \{[\s\S]*?\n  \};'
match = re.search(comp_data_pattern, content)
if match:
    content = content[:match.start()] + hero_gear_functions + content[match.end():]
    print("Replaced COMPENDIUM_DATA with getCompendiumHeroData and getCompendiumGearData!")
else:
    print("COMPENDIUM_DATA pattern not found!")

# 3. Update renderCompendiumView to call the dynamic functions
old_render_view = """    if (currentCompTab === 'monsters') {
      data = getCompendiumMonsterData();
    } else {
      const raw = COMPENDIUM_DATA[currentCompTab];
      data = {
        title: isEn ? (raw.titleEn || raw.title) : (raw.titleZh || raw.title),
        tip: isEn ? (raw.tipEn || raw.tip) : (raw.tipZh || raw.tip),
        total: raw.total,
        unlocked: raw.unlocked,
        groups: raw.groups.map(g => ({
          groupName: isEn ? (g.groupNameEn || g.groupName) : (g.groupNameZh || g.groupName),
          unlockedRatio: isEn ? (g.unlockedRatioEn || g.unlockedRatio) : (g.unlockedRatioZh || g.unlockedRatio),
          items: g.items.map(it => ({
            ...it,
            name: isEn ? (it.nameEn || it.name) : (it.nameZh || it.name)
          }))
        }))
      };
    }"""

new_render_view = """    if (currentCompTab === 'monsters') {
      data = getCompendiumMonsterData();
    } else if (currentCompTab === 'heroes') {
      data = getCompendiumHeroData();
    } else if (currentCompTab === 'gears') {
      data = getCompendiumGearData();
    } else {
      data = getCompendiumMonsterData();
    }"""

content = content.replace(old_render_view.replace('\n', '\r\n'), new_render_view.replace('\n', '\r\n'))
content = content.replace(old_render_view, new_render_view)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied C-STORY-137 successfully to ui_prototype_showcase_2.html!")
