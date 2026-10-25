# -*- coding: utf-8 -*-
import csv
import math

def export_raw_5tables(output_paths):
    # =========================================================================
    # 3. Gacha Level Configs (Lv.1 ~ Lv.8)
    # =========================================================================
    gacha_levels = [
        {
            "level": 1, "name": "初階轉蛋機", "pull_range": "0 ~ 30 抽", "bracket_pulls": 30, "max_val": 32,
            "weights": {2: 770, 4: 210, 8: 15, 16: 4, 32: 1}
        },
        {
            "level": 2, "name": "進階轉蛋機", "pull_range": "31 ~ 100 抽", "bracket_pulls": 70, "max_val": 64,
            "weights": {2: 600, 4: 250, 8: 100, 16: 40, 32: 8, 64: 2}
        },
        {
            "level": 3, "name": "精銳轉蛋機", "pull_range": "101 ~ 200 抽", "bracket_pulls": 100, "max_val": 128,
            "weights": {2: 450, 4: 330, 8: 140, 16: 55, 32: 18, 64: 6, 128: 1}
        },
        {
            "level": 4, "name": "大師轉蛋機", "pull_range": "201 ~ 340 抽", "bracket_pulls": 140, "max_val": 256,
            "weights": {2: 250, 4: 260, 8: 350, 16: 90, 32: 33, 64: 12, 128: 4, 256: 1}
        },
        {
            "level": 5, "name": "宗師轉蛋機", "pull_range": "341 ~ 530 抽", "bracket_pulls": 190, "max_val": 512,
            "weights": {2: 120, 4: 180, 8: 220, 16: 350, 32: 80, 64: 33, 128: 12, 256: 4, 512: 1}
        },
        {
            "level": 6, "name": "史詩轉蛋機", "pull_range": "531 ~ 790 抽", "bracket_pulls": 260, "max_val": 1024,
            "weights": {2: 60, 4: 90, 8: 130, 16: 220, 32: 350, 64: 95, 128: 35, 256: 14, 512: 5, 1024: 1}
        },
        {
            "level": 7, "name": "傳奇轉蛋機", "pull_range": "791 ~ 1150 抽", "bracket_pulls": 360, "max_val": 2048,
            "weights": {2: 30, 4: 50, 8: 80, 16: 130, 32: 220, 64: 350, 128: 90, 256: 33, 512: 12, 1024: 4, 2048: 1}
        },
        {
            "level": 8, "name": "神話轉蛋機", "pull_range": "1151 抽以上", "bracket_pulls": 999999, "max_val": 4096,
            "weights": {2: 20, 4: 30, 8: 50, 16: 80, 32: 130, 64: 210, 128: 350, 256: 85, 512: 30, 1024: 10, 2048: 4, 4096: 1}
        }
    ]

    all_equip_vals = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096]
    for g in gacha_levels:
        ev = sum(val * (w / 1000.0) for val, w in g["weights"].items())
        g["expected_val"] = ev

    def calc_pulls_for_target(target_val):
        if target_val <= 0:
            return 0.0, 1
        rem_val = float(target_val)
        cum_pulls = 0.0
        reached_lv = 1
        for g in gacha_levels:
            reached_lv = g["level"]
            ev = g["expected_val"]
            max_val_in_bracket = g["bracket_pulls"] * ev
            if rem_val <= max_val_in_bracket:
                cum_pulls += rem_val / ev
                rem_val = 0
                break
            else:
                cum_pulls += g["bracket_pulls"]
                rem_val -= max_val_in_bracket
        return round(cum_pulls, 1), reached_lv

    equip_gold_map = {0: 0}
    for exp in range(2, 19):
        val = 2 ** exp
        p_cnt, _ = calc_pulls_for_target(val)
        equip_gold_map[val] = int(round(p_cnt * 100))

    # =========================================================================
    # 5. 48-Tier Tech Data (8 Cycles, Early Accessible -> Late Deep Gold Sink)
    # =========================================================================
    # Tuple format:
    # (tier, name, base_range, weights, min_wpn_req, old_loose, old_high, sink_24, new_48_cost, cycle_id)
    tech_tiers = [
        # Cycle 1: [2, 4, 8] -> Breakthrough to [4, 8, 16] (New 48-Tier Subtotal: 6,000 G)
        (1,  "新兵武裝",                 [2, 4, 8],      [0.80, 0.18, 0.02], 0,     0,     0,     0,      0,      1),
        (2,  "巡邏獵備",                 [2, 4, 8],      [0.75, 0.22, 0.03], 0,     600,   800,   800,    400,    1),
        (3,  "鐵衛防具",                 [2, 4, 8],      [0.70, 0.25, 0.05], 0,     700,   900,   1000,   600,    1),
        (4,  "先鋒戰備",                 [2, 4, 8],      [0.65, 0.28, 0.07], 0,     800,   1100,  1400,   800,    1),
        (5,  "精鋼鍛造",                 [2, 4, 8],      [0.60, 0.30, 0.10], 0,     900,   1400,  1800,   1200,   1),
        (6,  "【大突破】白銀軍備 (淘汰2)", [4, 8, 16],     [0.75, 0.22, 0.03], 16,    2700,  4500,  5000,   3000,   1),

        # Cycle 2: [4, 8, 16] -> Breakthrough to [8, 16, 32] (New 48-Tier Subtotal: 18,000 G | Cum: 24,000 G)
        (7,  "精銳配給",                 [4, 8, 16],     [0.70, 0.25, 0.05], 16,    1000,  1800,  2200,   1400,   2),
        (8,  "戰陣重裝",                 [4, 8, 16],     [0.65, 0.28, 0.07], 16,    1100,  2100,  2600,   1800,   2),
        (9,  "騎士鎧甲",                 [4, 8, 16],     [0.60, 0.30, 0.10], 32,    1200,  2400,  3000,   2200,   2),
        (10, "秘銀附魔",                 [4, 8, 16],     [0.55, 0.32, 0.13], 32,    1300,  2700,  3400,   2600,   2),
        (11, "皇家禮裝",                 [4, 8, 16],     [0.50, 0.34, 0.16], 64,    1400,  3000,  3800,   3000,   2),
        (12, "【大突破】黃金領主 (淘汰4)", [8, 16, 32],    [0.75, 0.22, 0.03], 128,   4200,  10000, 15000,  7000,   2),

        # Cycle 3: [8, 16, 32] -> Breakthrough to [16, 32, 64] (New 48-Tier Subtotal: 46,000 G | Cum: 70,000 G)
        (13, "聖殿武裝",                 [8, 16, 32],    [0.70, 0.25, 0.05], 128,   1600,  4000,  5000,   3600,   3),
        (14, "光輝重刃",                 [8, 16, 32],    [0.65, 0.28, 0.07], 128,   1800,  4500,  6000,   4400,   3),
        (15, "神聖制式",                 [8, 16, 32],    [0.60, 0.30, 0.10], 256,   2000,  5000,  7000,   5200,   3),
        (16, "大師神匠",                 [8, 16, 32],    [0.55, 0.32, 0.13], 256,   2300,  5500,  8000,   6000,   3),
        (17, "泰坦鍛爐",                 [8, 16, 32],    [0.50, 0.34, 0.16], 256,   2600,  6000,  9000,   6800,   3),
        (18, "【大突破】屠龍戰狂 (淘汰8)", [16, 32, 64],   [0.75, 0.22, 0.03], 512,   7800,  20000, 35000,  20000,  3),

        # Cycle 4: [16, 32, 64] -> Breakthrough to [32, 64, 128] (New 48-Tier Subtotal: 110,000 G | Cum: 180,000 G)
        (19, "炎息戰甲",                 [16, 32, 64],   [0.70, 0.25, 0.05], 512,   2900,  7000,  11000,  8000,   4),
        (20, "黑曜武具",                 [16, 32, 64],   [0.65, 0.28, 0.07], 512,   3300,  8000,  13000,  9500,   4),
        (21, "遠古龍骨",                 [16, 32, 64],   [0.60, 0.30, 0.10], 1024,  3700,  9000,  15000,  11000,  4),
        (22, "神域符文",                 [16, 32, 64],   [0.55, 0.32, 0.13], 1024,  4200,  10000, 17000,  12500,  4),
        (23, "終焉聖光",                 [16, 32, 64],   [0.50, 0.34, 0.16], 1024,  4800,  11000, 19000,  14000,  4),
        (24, "【大突破】創世星辰 (淘汰16)",[32, 64, 128],  [0.75, 0.22, 0.03], 2048,  14400, 40000, 80000,  55000,  4),

        # Cycle 5: [32, 64, 128] -> Breakthrough to [64, 128, 256] (New 48-Tier Subtotal: 220,000 G | Cum: 400,000 G)
        (25, "星輝武裝",                 [32, 64, 128],  [0.70, 0.25, 0.05], 2048,  0,     0,     0,      16000,  5),
        (26, "蒼穹重鎧",                 [32, 64, 128],  [0.65, 0.28, 0.07], 2048,  0,     0,     0,      19000,  5),
        (27, "破界神兵",                 [32, 64, 128],  [0.60, 0.30, 0.10], 2048,  0,     0,     0,      22000,  5),
        (28, "虛空戰備",                 [32, 64, 128],  [0.55, 0.32, 0.13], 4096,  0,     0,     0,      25000,  5),
        (29, "星界聖裁",                 [32, 64, 128],  [0.50, 0.34, 0.16], 4096,  0,     0,     0,      28000,  5),
        (30, "【大突破】蒼穹霸主 (淘汰32)",[64, 128, 256], [0.75, 0.22, 0.03], 4096,  0,     0,     0,      110000, 5),

        # Cycle 6: [64, 128, 256] -> Breakthrough to [128, 256, 512] (New 48-Tier Subtotal: 400,000 G | Cum: 800,000 G)
        (31, "龍神戰甲",                 [64, 128, 256], [0.70, 0.25, 0.05], 4096,  0,     0,     0,      30000,  6),
        (32, "天罰重刃",                 [64, 128, 256], [0.65, 0.28, 0.07], 4096,  0,     0,     0,      35000,  6),
        (33, "不朽聖盾",                 [64, 128, 256], [0.60, 0.30, 0.10], 8192,  0,     0,     0,      40000,  6),
        (34, "混沌神鍛",                 [64, 128, 256], [0.55, 0.32, 0.13], 8192,  0,     0,     0,      45000,  6),
        (35, "諸神黃昏",                 [64, 128, 256], [0.50, 0.34, 0.16], 8192,  0,     0,     0,      50000,  6),
        (36, "【大突破】不朽神王 (淘汰64)",[128, 256, 512],[0.75, 0.22, 0.03], 8192,  0,     0,     0,      200000, 6),

        # Cycle 7: [128, 256, 512] -> Breakthrough to [256, 512, 1024] (New 48-Tier Subtotal: 700,000 G | Cum: 1,500,000 G)
        (37, "深淵魔鎧",                 [128, 256, 512],[0.70, 0.25, 0.05], 8192,  0,     0,     0,      55000,  7),
        (38, "冥界死神",                 [128, 256, 512],[0.65, 0.28, 0.07], 8192,  0,     0,     0,      62000,  7),
        (39, "時空裂隙",                 [128, 256, 512],[0.60, 0.30, 0.10], 16384, 0,     0,     0,      70000,  7),
        (40, "永恆星核",                 [128, 256, 512],[0.55, 0.32, 0.13], 16384, 0,     0,     0,      78000,  7),
        (41, "次元主宰",                 [128, 256, 512],[0.50, 0.34, 0.16], 16384, 0,     0,     0,      85000,  7),
        (42, "【大突破】次元主宰 (淘汰128)",[256, 512, 1024],[0.75, 0.22, 0.03],16384, 0,     0,     0,      350000, 7),

        # Cycle 8: [256, 512, 1024] -> Breakthrough to [512, 1024, 2048] (New 48-Tier Subtotal: 1,200,000 G | Cum: 2,700,000 G)
        (43, "神域法則",                 [256, 512, 1024],[0.70, 0.25, 0.05],16384, 0,     0,     0,      95000,  8),
        (44, "萬象歸一",                 [256, 512, 1024],[0.65, 0.28, 0.07],32768, 0,     0,     0,      105000, 8),
        (45, "無上神威",                 [256, 512, 1024],[0.60, 0.30, 0.10],32768, 0,     0,     0,      120000, 8),
        (46, "鴻濛造化",                 [256, 512, 1024],[0.55, 0.32, 0.13],32768, 0,     0,     0,      135000, 8),
        (47, "終焉審判",                 [256, 512, 1024],[0.50, 0.34, 0.16],65536, 0,     0,     0,      145000, 8),
        (48, "【大突破】創世神話 (淘汰256)",[512, 1024, 2048],[0.75, 0.22, 0.03],65536,0,     0,     0,      600000, 8),
    ]

    tech_eff_map = {}
    for t in tech_tiers:
        tier_id = t[0]
        raw_ev = sum(v * w for v, w in zip(t[2], t[3]))
        eff_ev = raw_ev * (7.0 / 8.0) # 1 out of 8 turns spawns a Gold tile
        tech_eff_map[tier_id] = (round(raw_ev, 2), round(eff_ev, 2))

    # =========================================================================
    # 1 & 2. 350 Stages Complete Monster & Starter Equipment Data
    # =========================================================================
    chapters = [
        (1, "第 I 章：微風之境", 1, 5),
        (2, "第 II 章：灼熱熔岩", 6, 20),
        (3, "第 III 章：孤峰岩地", 21, 50),
        (4, "第 IV 章：蛛魔荒漠", 51, 90),
        (5, "第 V 章：遠古地宮", 91, 150),
        (6, "第 VI 章：滅世黑曜", 151, 220),
        (7, "第 VII 章：神魔深淵", 221, 280),
        (8, "第 VIII 章：終焉神域", 281, 350)
    ]

    # Exact stage definitions for 1..20 from Constants.js
    # (goldCap, goldBaseValue, monsters_list, is_splitter, split_extra_list, starter_equip_list)
    stages_1_20_exact = {
        1:  (40,  4, [8, 4, 2], False, [], [2, 2]),
        2:  (50,  4, [16, 4, 4], False, [], [2, 4]),
        3:  (60,  4, [16, 8, 4], False, [], [4, 4]),
        4:  (70,  4, [32, 8, 8], False, [], [4, 4, 8]),
        5:  (80,  4, [32, 16, 16, 8], False, [], [8, 8, 16]),
        6:  (90,  4, [64, 32, 16], False, [], [8, 16, 16]),
        7:  (100, 4, [64, 32, 16], True, [32, 32], [8, 16, 16]),
        8:  (110, 4, [128, 64, 32], False, [], [16, 16, 32]),
        9:  (120, 8, [128, 64, 32, 32], False, [], [16, 32, 32]),
        10: (130, 8, [256, 64, 64, 32], False, [], [32, 32, 64]),
        11: (140, 8, [128, 64, 64, 32], False, [], [16, 32, 32]),
        12: (150, 8, [128, 64, 64, 32], False, [], [16, 32, 32]),
        13: (160, 8, [256, 64, 64, 32], False, [], [32, 32, 64]),
        14: (170, 8, [256, 64, 64, 32], True, [128, 128], [32, 32, 64]),
        15: (180, 8, [256, 128, 64, 64], False, [], [32, 64, 64]),
        16: (190, 8, [256, 128, 64, 64], False, [], [32, 64, 64]),
        17: (200, 8, [256, 128, 64, 64], False, [], [32, 64, 64]),
        18: (210, 8, [256, 128, 64, 64], False, [], [32, 64, 64]),
        19: (220, 8, [256, 128, 64, 64], False, [], [32, 64, 64]),
        20: (240, 16, [512, 256, 128, 64], False, [], [64, 64, 128]),
    }

    # Recommended progression mapping by stage (Targeting <= 800 turns on Splitter Bosses, ~300-400 on Normal)
    def get_rec_weapon_and_tech(s):
        if s <= 5: return 8, 2           # Ch1 (1~5): Weapon 8, Tech T2
        elif s <= 12: return 16, 4       # Ch2 early (6~12): Weapon 16, Tech T4
        elif s <= 19: return 32, 5       # Ch2 mid (13~19): Weapon 32, Tech T5
        elif s == 20: return 64, 6       # Ch2 boss (20): Weapon 64, Tech T6
        elif s <= 27: return 64, 7       # Ch3 early (21~27, Boss 512): Weapon 64, Tech T7
        elif s <= 30: return 128, 8      # Ch3 mid-1 (28~30, Boss 1024): Weapon 128, Tech T8
        elif s <= 41: return 128, 9      # Ch3 mid-2 (31~41, Boss 1024): Weapon 128, Tech T9
        elif s <= 50: return 256, 11     # Ch3 late (42~50, Boss 2048): Weapon 256, Tech T11
        elif s <= 60: return 256, 12     # Ch4 early (51~60, Boss 2048): Weapon 256, Tech T12
        elif s <= 75: return 512, 13     # Ch4 mid (61~75, Boss 4096): Weapon 512, Tech T13
        elif s <= 90: return 512, 15     # Ch4 late (76~90, Boss 4096): Weapon 512, Tech T15
        elif s <= 100: return 1024, 18   # Ch5 early-1 (91~100, Boss 8192): Weapon 1024, Tech T18
        elif s <= 120: return 1024, 20   # Ch5 early-2 (101~120, Boss 8192): Weapon 1024, Tech T20
        elif s <= 135: return 2048, 22   # Ch5 late-1 (121~135, Boss 16384): Weapon 2048, Tech T22
        elif s <= 150: return 2048, 24   # Ch5 late-2 (136~150, Boss 16384): Weapon 2048, Tech T24
        elif s <= 165: return 4096, 28   # Ch6 early-1 (151~165, Boss 32768): Weapon 4096, Tech T28
        elif s <= 180: return 4096, 29   # Ch6 early-2 (166~180, Boss 32768): Weapon 4096, Tech T29
        elif s <= 200: return 8192, 34   # Ch6 late-1 (181~200, Boss 65536): Weapon 8192, Tech T34
        elif s <= 220: return 8192, 35   # Ch6 late-2 (201~220, Boss 65536): Weapon 8192, Tech T35
        elif s <= 250: return 16384, 40  # Ch7 early (221~250, Boss 131072): Weapon 16384, Tech T40
        elif s <= 280: return 16384, 41  # Ch7 late (251~280, Boss 131072): Weapon 16384, Tech T41
        elif s <= 315: return 32768, 46  # Ch8 early (281~315, Boss 262144): Weapon 32768, Tech T46
        else: return 65536, 47           # Ch8 late (316~350, Boss 262144): Weapon 65536, Tech T47 (T48为大后期满阶碾压)

    for out_path in output_paths:
        with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)

            # -----------------------------------------------------------------
            # TABLE 3: GACHA LEVEL RATES
            # -----------------------------------------------------------------
            writer.writerow(["【數據 3】裝備轉蛋機數據：各等級開放數字與比例 (權重總和=1000)"])
            writer.writerow([
                "轉蛋機等級", "轉蛋機名稱", "累積抽數區間", "最高開放數字", "單抽期望點數",
                "數字 2 比例(%)", "數字 4 比例(%)", "數字 8 比例(%)", "數字 16 比例(%)",
                "數字 32 比例(%)", "數字 64 比例(%)", "數字 128 比例(%)", "數字 256 比例(%)",
                "數字 512 比例(%)", "數字 1024 比例(%)", "數字 2048 比例(%)", "數字 4096 比例(%)"
            ])
            for g in gacha_levels:
                row = [
                    f"Lv.{g['level']}", g["name"], g["pull_range"], g["max_val"], round(g["expected_val"], 3)
                ]
                for val in all_equip_vals:
                    w = g["weights"].get(val, 0)
                    row.append(f"{w / 10.0:.1f}%" if w > 0 else "0%")
                writer.writerow(row)
            writer.writerow([])

            # -----------------------------------------------------------------
            # TABLE 4: GACHA PULLS & COST FOR TARGET EQUIPMENT
            # -----------------------------------------------------------------
            writer.writerow(["【數據 4】裝備轉蛋機：獲得各階裝備數字所需抽獎次數與耗費金額 (單抽=100G, 十連=1000G)"])
            writer.writerow([
                "目標裝備數字", "達成時所在轉蛋機等級", "所需累計總抽數(抽)",
                "折合十連抽次數(次)", "累計耗費金幣(G)", "與前一階差額抽數(抽)", "與前一階差額金幣(G)"
            ])
            target_equips = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144]
            prev_pulls = 0.0
            for t_val in target_equips:
                pulls, lv = calc_pulls_for_target(t_val)
                ten_pulls = round(pulls / 10.0, 2)
                gold_cost = int(round(pulls * 100))
                diff_pulls = round(pulls - prev_pulls, 1)
                diff_gold = int(round(diff_pulls * 100))
                prev_pulls = pulls
                writer.writerow([
                    t_val, f"Lv.{lv}", pulls, ten_pulls, gold_cost, diff_pulls, diff_gold
                ])
            writer.writerow([])

            # -----------------------------------------------------------------
            # TABLE 5: 48-TIER TECH UPGRADE COSTS, EV & SUMS
            # -----------------------------------------------------------------
            writer.writerow(["【數據 5】48階科技升階各階段價格、每回合產出期望點數、強制武器門檻與加總金額 (含新舊版本對照)"])
            writer.writerow([
                "科技階級", "所屬週期", "科技名稱", "局內掉落數字池", "掉落權重比例",
                "單次掉落期望點數", "每回合有效產出點數(扣除金幣回合x0.875)",
                "強制穿戴武器門檻(minWeaponReq)", "達標武器所需轉蛋累計金幣(G)",
                "新版48階單階價格(G)", "新版48階階段小計(5小+1大)", "新版48階科技累計總額(G)", "新版【科技+武器】雙軌累計總消耗(G)",
                "原24階深水庫單階價格", "原24階深水庫累計總額",
                "早期高消耗單階價格", "早期高消耗累計總額",
                "舊寬鬆版單階價格", "舊寬鬆版累計總額"
            ])
            cyc_new48 = {i: 0 for i in range(1, 9)}
            for t in tech_tiers:
                cyc_new48[t[9]] += t[8]

            cum_l, cum_o, cum_s24, cum_n48 = 0, 0, 0, 0
            for tier, name, b_range, weights, min_wpn, c_l, c_o, c_s24, c_n48, cyc_id in tech_tiers:
                cum_l += c_l
                cum_o += c_o
                cum_s24 += c_s24
                cum_n48 += c_n48
                raw_ev, eff_ev = tech_eff_map[tier]
                w_str = "/".join(f"{int(w*100)}%" for w in weights)
                is_end_of_cyc = (tier % 6 == 0)
                wpn_gold = equip_gold_map.get(min_wpn, 0)
                dual_total = cum_n48 + wpn_gold
                writer.writerow([
                    f"Tier {tier}", f"Cycle {cyc_id}", name, str(b_range), w_str,
                    raw_ev, eff_ev,
                    min_wpn, wpn_gold,
                    c_n48, cyc_new48[cyc_id] if is_end_of_cyc else "", cum_n48, dual_total,
                    c_s24 if tier <= 24 else "-", cum_s24 if tier <= 24 else "-",
                    c_o if tier <= 24 else "-", cum_o if tier <= 24 else "-",
                    c_l if tier <= 24 else "-", cum_l if tier <= 24 else "-"
                ])
            writer.writerow([
                "全 48 階總計", "8 大週期", "-", "-", "-", "-", "-",
                65536, equip_gold_map[65536],
                cum_n48, cum_n48, cum_n48, cum_n48 + equip_gold_map[65536],
                cum_s24, cum_s24,
                cum_o, cum_o,
                cum_l, cum_l
            ])
            writer.writerow([])

            # -----------------------------------------------------------------
            # TABLE 1 & 2 + MONSTER VALUES & THEORETICAL MIN TURNS (ALL 350 STAGES)
            # -----------------------------------------------------------------
            writer.writerow(["【數據 1 & 2 ＆ 怪物數值與理論最少過關回合試算表】全 350 關完整明細 (以350關800回合內過關為基準)"])
            writer.writerow([
                "關卡ID", "章節ID", "章節名稱",
                "1. 過關給予金額 (rewardGold)",
                "2-A. 金幣方塊起始數字 (goldBaseValue)",
                "2-B. 場內金幣提供上限 (goldCap)",
                "單關最大可得總金幣 (過關+上限)",
                "過關獎勵x2 試算值 (rewardGold*2)",
                "關卡怪物總數",
                "怪物陣容清單 (由大至小)",
                "怪物1 (Boss數值)",
                "怪物2 數值",
                "怪物3 數值",
                "怪物4 數值",
                "怪物5 數值",
                "怪物6 數值",
                "是否含分裂母體",
                "分裂衍生幼體數值總和",
                "怪物數值總和 (基礎)",
                "怪物數值總和 (含分裂後)",
                "全滅最小需求總戰力點數 (P_req)",
                "開局場上贈送裝備清單 (starterEquipment)",
                "開局贈送裝備點數總和 (E_starter)",
                "建議穿戴武器數值 (W_hero)",
                "建議科技階級 (48階制)",
                "建議科技每回合有效產出點數",
                "盤面需合成淨點數 (Delta_P)",
                "理論最少過關回合數 (完美零殘留)",
                "實戰預期過關回合數 (含20%餘料)"
            ])

            tech_cum_cost_map = {}
            running_t_cost = 0
            for t in tech_tiers:
                running_t_cost += t[8]
                tech_cum_cost_map[t[0]] = running_t_cost

            for s in range(1, 351):
                ch_id = 1
                ch_name = ""
                for cid, cname, r0, r1 in chapters:
                    if r0 <= s <= r1:
                        ch_id = cid
                        ch_name = cname
                        break

                if s <= 20:
                    reward_gold = 100 + (s - 1) * 5
                elif s <= 50:
                    reward_gold = 195 + (s - 20) * 10
                elif s <= 90:
                    reward_gold = 495 + (s - 50) * 20
                else:
                    reward_gold = 1295 + (s - 90) * 30

                if s <= 20:
                    gold_cap, gold_base, m_list, is_split, split_extra, starter_eq = stages_1_20_exact[s]
                else:
                    gold_cap = int(80 + s * 4)
                    gold_base = 8 if s <= 35 else (16 if s <= 90 else (32 if s <= 180 else 64))
                    if s <= 27: boss_exp = 9
                    elif s <= 41: boss_exp = 10
                    elif s <= 60: boss_exp = 11
                    elif s <= 90: boss_exp = 12
                    elif s <= 120: boss_exp = 13
                    elif s <= 150: boss_exp = 14
                    elif s <= 180: boss_exp = 15
                    elif s <= 220: boss_exp = 16
                    elif s <= 280: boss_exp = 17
                    else: boss_exp = 18

                    boss_val = 2 ** boss_exp
                    m1 = 2 ** max(1, boss_exp - 3)
                    m2 = 2 ** max(1, boss_exp - 2)
                    m3 = 2 ** max(1, boss_exp - 1)

                    if 22 <= s <= 50:
                        m_cnt = 5 if (s % 2 == 0) else 4
                    elif 50 < s <= 150:
                        m_cnt = 5
                    else:
                        m_cnt = 6

                    minion_pool = [m1, m2, m3]
                    m_list = [boss_val]
                    for i in range(m_cnt - 1):
                        m_list.append(minion_pool[i % 3])
                    m_list.sort(reverse=True)

                    is_split = (s % 7 == 0)
                    split_val = max(2, boss_val // 2)
                    split_extra = [split_val, split_val] if is_split else []

                    eq_exp = max(1, boss_exp - 3)
                    eq_val = 2 ** eq_exp
                    starter_eq = [eq_val, eq_val]
                    if s > 30:
                        starter_eq.append(eq_val)
                    if s > 100:
                        starter_eq.append(2 ** (eq_exp + 1))

                m_sorted = sorted(m_list, reverse=True)
                m_padded = m_sorted + [0] * (6 - len(m_sorted))

                base_m_sum = sum(m_sorted)
                split_sum = sum(split_extra)
                total_m_sum = base_m_sum + split_sum

                all_combat_monsters = m_sorted + split_extra
                min_m = min(all_combat_monsters)
                max_m = max(all_combat_monsters)
                # Minimum required total power points to decapitate all monsters (each kill halves hero value)
                p_req = max(max_m, int(total_m_sum // 2 + min_m // 2))

                starter_eq_sum = sum(starter_eq)
                rec_wpn, rec_tech = get_rec_weapon_and_tech(s)
                _, eff_ev_per_turn = tech_eff_map[rec_tech]

                delta_p = max(0, p_req - rec_wpn - starter_eq_sum)
                kill_steps = len(all_combat_monsters)
                min_turns = int(math.ceil(delta_p / eff_ev_per_turn)) + kill_steps
                exp_turns = int(math.ceil(min_turns * 1.20))

                writer.writerow([
                    s, ch_id, ch_name,
                    reward_gold,
                    gold_base,
                    gold_cap,
                    reward_gold + gold_cap,
                    reward_gold * 2,
                    len(m_sorted),
                    str(m_sorted),
                    m_padded[0],
                    m_padded[1],
                    m_padded[2],
                    m_padded[3],
                    m_padded[4],
                    m_padded[5],
                    f"是 (分裂2隻x{split_extra[0]})" if is_split else "否",
                    split_sum,
                    base_m_sum,
                    total_m_sum,
                    p_req,
                    str(starter_eq),
                    starter_eq_sum,
                    rec_wpn,
                    f"Tier {rec_tech}",
                    eff_ev_per_turn,
                    delta_p,
                    min_turns,
                    exp_turns
                ])

        print(f"[OK] Exported updated 48-tier tech & 350-stage CSV: {out_path}")

if __name__ == "__main__":
    export_raw_5tables([
        r"c:\Antigravity\2048RPG\raw_game_data_5tables.csv",
        r"c:\Antigravity\2048RPG\Commercial_Edition\raw_game_data_5tables.csv"
    ])
